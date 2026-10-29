import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAudit} from '../src/audit.js';
import {contextSnapshot,contextDiff,pageSnapshot,exportRecords,exportResponse} from '../src/developer-audit.js';
import {OriginStore} from '../src/origin-store.js';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';

function fixture(){
  const events=[];
  const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1000+seq,type,data,...extra});return seq;};
  const user=(text,source={kind:'user'},extra={})=>add('user/message',{id:`u${events.length}`,role:'user',source,content:[{type:'text',text}]},{surfaceOp:'append',...extra});
  const answer=text=>add('assistant/message',{turn:1,step:1,message:{id:`a${events.length}`,role:'assistant',source:{kind:'model'},content:[{type:'text',text}]}},{surfaceOp:'append'});
  add('turn/start',{turn:1});
  add('request/header',{header:{config:{model:'deepseek-flash'},tools:[{name:'read',description:'Read a file',input_schema:{type:'object'}}]}});
  add('request/context',{contextWindow:10000,model:'deepseek-flash'});
  const prompt=user('SECRET_PROMPT');
  const injection=user('SECRET_PLUGIN_BODY',{kind:'opaque'});
  const reply=answer('SECRET_REPLY');add('turn/end',{turn:1,reason:{kind:'completed'}});
  const summary=add('compaction/summary',{compactionId:'c1',shadowedSeqs:[prompt,injection,reply]});
  const carrier=user('SECRET_SUMMARY',{kind:'compact-checkpoint'},{surfaceOp:{op:'replace',startSeq:prompt,endSeq:reply},sourceEventSeqs:[summary,prompt,injection,reply]});
  const store=new OriginStore();store.record('test',injection,{producer:{type:'plugin',id:'reader',name:'Reader',version:'1'},method:'agent.inject',evidence:'runtime'});
  const audit=buildAudit({id:'test',version:4},events,{originFor:e=>store.originFor('test',e.seq)});
  return {audit,events,origins:store.inspect('test'),originRevision:store.revision,observedAt:5000,collection:{enabled:true,persistence:'memory',captureRunId:store.captureRunId,startedAt:store.startedAt,retention:{maxSessions:64,maxEventRecordsPerSession:2000,maxEvidenceRecordsPerSession:2000}},prompt,injection,reply,summary,carrier};
}

test('developer snapshots preserve individual source evidence and distinguish request / round / current cuts',()=>{
  const f=fixture(),before=JSON.stringify(f.events),request=contextSnapshot(f,{requestId:`request-${f.reply}`}),round=contextSnapshot(f,{roundId:1}),current=contextSnapshot(f);
  assert.ok(!request.items.some(i=>i.ref.seq===f.reply));assert.ok(round.items.some(i=>i.ref.seq===f.reply));
  assert.ok(!current.items.some(i=>i.ref.seq===f.prompt));assert.equal(current.items.at(-1).representation.kind,'summary');
  assert.deepEqual(current.items.at(-1).representation.originRounds,[1]);
  const item=round.items.find(i=>i.ref.seq===f.injection);assert.equal(item.source.actor.id,'reader');assert.equal(item.source.entryMethod,'agent.inject');assert.equal(item.source.evidence,'runtime');
  assert.equal(round.measurement.estimatedTokens,f.audit.rounds[0].total);assert.equal(current.measurement.estimatedTokens,f.audit.current.total);
  assert.equal(current.measurement.newlyRetainedThisRoundTokens,0);assert.equal(current.measurement.roundId,null);
  assert.ok(current.relationships.some(r=>r.kind==='summary-covers'&&r.sources.some(s=>s.seq===f.injection)));
  assert.equal(JSON.stringify(f.events),before);assert.ok(!JSON.stringify(round).includes('SECRET_'));assert.ok(!Object.hasOwn(item.source,'title'));
  assert.throws(()=>contextSnapshot(f,{roundId:1,atSeq:3}),e=>e.code==='INVALID_SELECTOR');assert.throws(()=>contextSnapshot(f,{atSeq:999}),e=>e.code==='INVALID_CUT');
});

test('diff reports compression removals and additions rather than treating summary coverage as raw retention',()=>{
  const f=fixture(),change=contextDiff(f,f.reply+1,f.carrier);
  assert.equal(change.counts.removed,3);assert.equal(change.counts.added,1);assert.equal(change.counts.modified,0);
  assert.equal(change.changes.find(c=>c.kind==='added').after.representation.kind,'summary');
  assert.ok(change.relationships.some(r=>r.kind==='replaces-range'));assert.throws(()=>contextDiff(f,4,2),e=>e.code==='INVALID_RANGE');
  const all=contextDiff(f,-1,f.carrier);assert.ok(all.surfaceUpdates.some(e=>e.ref.seq===f.injection&&!e.retainedAtEnd&&e.source.actor.id==='reader'));
  const page=pageSnapshot(contextSnapshot(f,{roundId:1}),0,1);assert.equal(page.items.length,1);assert.equal(page.pagination.more,true);
});

test('coverage explicitly distinguishes legacy / unknown / partial ownership, disabled capture and dropped evidence',()=>{
  const f=fixture();f.origins={events:{[f.injection]:{method:'agent.inject'}},actors:{},dropped:7,droppedEvidence:8};f.collection={enabled:false,persistence:'memory',storageError:true,failures:1};
  const s=contextSnapshot(f,{roundId:1});
  for(const code of ['ORIGIN_RECORDS_TRIMMED','EVIDENCE_HISTORY_TRIMMED','COLLECTOR_DISABLED','ORIGIN_STORAGE_ERROR','COLLECTOR_FAILURES','LEGACY_CAPTURE_TIME_UNKNOWN'])assert.ok(s.coverage.findings.includes(code));
  assert.equal(s.coverage.retention.legacyCaptureTimeUnknown,1);assert.equal(s.coverage.retention.eventRecordsDropped,7);
  const empty={...f,events:[],audit:buildAudit({id:'empty',version:4},[])};
  assert.equal(contextSnapshot(empty).boundary.seq,-1);assert.deepEqual(contextSnapshot(empty).items,[]);
});

test('JSON and JSONL exports have a verifiable completion record; bodies are explicit and overflow rejects before success',async()=>{
  const f=fixture(),s=contextSnapshot(f);
  for(const format of ['json','jsonl']){
    const response=exportResponse(exportRecords(f,s),{format});
    const text=await response.text(),rows=format==='json'?JSON.parse(text):text.trim().split('\n').map(JSON.parse);
    assert.ok(!text.includes('SECRET_'));assert.equal(rows[0].recordType,'manifest');assert.equal(rows.at(-1).recordType,'complete');
    const hash=createHash('sha256');for(const row of rows.slice(0,-1))hash.update(JSON.stringify(row)+'\n');
    assert.equal(rows.at(-1).value.sha256,hash.digest('hex'));assert.equal(rows.at(-1).value.records,rows.length-1);
    assert.ok(rows.some(r=>r.recordType==='origin-evidence'));assert.ok(rows.some(r=>r.recordType==='event'));
  }
  const withContent={...f,includeContent:true};
  const text=await exportResponse(exportRecords(withContent,contextSnapshot(withContent,{}, {includeContent:true}))).text();
  assert.ok(text.includes('SECRET_PROMPT'));assert.ok(text.includes('SECRET_SUMMARY'));
  assert.throws(()=>exportResponse(exportRecords(withContent,contextSnapshot(withContent)),{maxBytes:1024}),e=>e.status===413);
});

test('evidence revisions retain original actor versions across updates, late storage attachment and restart',async()=>{
  const rows=new Map(),table={get:id=>rows.get(id),put:async(id,value)=>rows.set(id,value)};
  const first=new OriginStore({maxRecords:2});first.record('s',1,{producer:{type:'plugin',id:'reader',version:'1'},method:'agent.inject'});first.attach(table);await first.close();
  const second=new OriginStore({maxRecords:2});second.record('s',1,{producer:{type:'plugin',id:'reader',version:'2'},method:'agent.inject'});second.attach(table);
  const row=second.inspect('s');assert.equal(row.evidence.length,2);
  assert.equal(row.actors[row.evidence[0].record.actor].version,'1');assert.equal(row.actors[row.evidence[1].record.actor].version,'2');
  assert.notEqual(row.evidence[0].captureRunId,row.evidence[1].captureRunId);
  second.record('s',2,{producer:{type:'plugin',id:'reader',version:'3'},method:'agent.inject'});assert.equal(second.inspect('s').droppedEvidence,1);await second.close();
  const third=new OriginStore({maxRecords:2});third.attach(table);assert.equal(third.inspect('s').evidence.length,2);await third.close();
});

test('shipped JSON Schema validates snapshot/diff/export consumers and rejects invalid references and measurements',async()=>{
 const schema=JSON.parse(await readFile(new URL('../schemas/developer-audit.schema.json',import.meta.url),'utf8'));
 const validate=z.fromJSONSchema(schema),f=fixture(),snapshot=contextSnapshot(f);
 assert.equal(validate.safeParse(snapshot).success,true);assert.equal(validate.safeParse(contextDiff(f,-1,f.carrier)).success,true);
 for(const record of exportRecords(f,snapshot)())assert.equal(validate.safeParse(record).success,true);
 const invalid=structuredClone(snapshot);invalid.items[0].ref.seq=-1;assert.equal(validate.safeParse(invalid).success,false);
 invalid.items[0].ref.seq=1;invalid.items[0].estimatedTokens=-1;assert.equal(validate.safeParse(invalid).success,false);
});

test('evidence storage failures are observable and never reject the source-admission path',async()=>{
 const store=new OriginStore();store.attach({get:()=>undefined,put:async()=>{throw Error('disk unavailable');}});
 assert.doesNotThrow(()=>store.record('s',0,{producer:{type:'plugin',id:'p'},method:'agent.inject'}));
 await store.flush();assert.equal(store.storageError,true);assert.equal(store.originFor('s',0).producer.id,'p');await store.close();
});
