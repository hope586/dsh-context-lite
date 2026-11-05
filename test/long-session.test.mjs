import test from 'node:test';
import assert from 'node:assert/strict';
import {SurfaceManager} from '@deepseek-ai/dsh-session/surface';
import {estimateMessage,estimateToolsTokens} from '@deepseek-ai/dsh-token-meter/estimate';
import {buildAudit,overview,readDetail,maxWireRefs} from '../src/audit.js';
import {apply} from '../src/index.js';
import {OriginStore} from '../src/origin-store.js';

// Synthetic long session: user prompt, plugin injection, tool round, two
// assistant messages per round, periodic compaction and aborts.
function longSession(rounds){
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1000+seq,type,data,...extra});return seq;};
  let id=0;
  const userMessage=(text,source={kind:'user'})=>({id:`u-${++id}`,role:'user',content:[{type:'text',text}],source});
  const assistantMessage=text=>({id:`a-${++id}`,role:'assistant',content:[{type:'text',text}],source:{kind:'model',provider:'deepseek',model:'deepseek-flash'}});
  for(let r=1;r<=rounds;r++){
    add('turn/start',{turn:r});
    if(r===1){
      add('system/message',{turn:r,step:1,message:{id:`s-${++id}`,role:'system',content:[{type:'text',text:'system prompt '.repeat(40)}],source:{kind:'system-prompt'}}},{surfaceOp:'append'});
      add('request/context',{provider:'deepseek',model:'deepseek-flash',contextWindow:128000});
    }
    add('request/header',{header:{config:{provider:'deepseek',model:'deepseek-flash'},tools:[{name:'read',description:'Read files',parameters:{type:'object',properties:{path:{type:'string'}}}}]}});
    add('user/message',userMessage(`question number ${r} about the project `.repeat(8)),{surfaceOp:'append'});
    add('user/message',userMessage(`memory context for round ${r} `.repeat(6),{kind:'memory-provider',plugin:'Memory'}),{surfaceOp:'append'});
    if(r%7===0){
      const a=add('user/message',userMessage(`old fact ${r}`),{surfaceOp:'append'});
      const b=add('assistant/message',{turn:r,step:1,message:assistantMessage(`old answer ${r}`),stream:[]},{surfaceOp:'append'});
      const summary=add('compaction/summary',{compactionId:`c${r}`,summary:[{type:'text',text:`summary ${r}`}],shadowedRange:{start:a,end:b},shadowedSeqs:[a,b],shadowedTokenCount:10,provider:'deepseek',model:'deepseek-flash'});
      add('user/message',userMessage(`summary ${r}`,{kind:'compact-checkpoint'}),{surfaceOp:{op:'replace',startSeq:a,endSeq:b},sourceEventSeqs:[summary,a,b]});
    }
    add('tool/call',{turn:r,step:1,callId:`c-${r}`,name:'read',arguments:'{"path":"/tmp/x"}'});
    add('tool/result',{turn:r,step:1,message:{id:`t-${++id}`,role:'tool',source:{kind:'tool',callId:`c-${r}`},content:[{type:'text',text:'tool output '.repeat(120)}]}},{surfaceOp:'append'});
    add('assistant/message',{turn:r,step:1,message:assistantMessage(`answer ${r} `.repeat(200)),stream:[]},{surfaceOp:'append'});
    add('assistant/message',{turn:r,step:2,message:assistantMessage(`final answer ${r} `.repeat(60)),stream:[]},{surfaceOp:'append'});
    add('turn/end',{turn:r,reason:r%5===0?{kind:'aborted',reason:{kind:'user'}}:{kind:'completed'}});
  }
  return events;
}

test('long sessions keep the overview payload bounded and references minimal on the wire',()=>{
  const events=longSession(30),audit=buildAudit({id:'long',createdAt:1,version:4},events,{originFor:()=>undefined});
  const payload=JSON.stringify(overview(audit));
  // The pre-fix payload repeated every retained node object once per visible
  // round (~1 MB for this fixture); only bounded references belong on the wire.
  assert.ok(payload.length<250*1024,`overview payload ${payload.length} exceeds the bounded wire budget`);
  const dto=JSON.parse(payload);
  for(const round of [...dto.rounds,...(dto.current?[dto.current]:[])])for(const segment of round.segments){
    if(segment.refs)for(const ref of segment.refs)assert.deepEqual(Object.keys(ref).sort(),['seq']);
    else assert.ok(segment.refCount>maxWireRefs,'a segment without refs must carry an explicit refCount');
  }
});

test('replayed rounds share node views instead of retaining per-snapshot copies',()=>{
  const events=longSession(25),audit=buildAudit({id:'shared',createdAt:1,version:4},events,{originFor:()=>undefined});
  const last=audit.rounds.at(-1),first=audit.rounds[0];
  const shared=new Set();
  for(const round of audit.rounds)for(const segment of round.segments)for(const node of segment.refs)shared.add(node);
  // 25 rounds retain thousands of references; before the fix each snapshot
  // allocated a fresh copy of every node it touched.
  assert.ok(shared.size<events.length,`retained ${shared.size} distinct node objects for ${events.length} events`);
  const node=first.segments.flatMap(s=>s.refs).find(n=>n.type==='user/message');
  assert.ok(last.segments.flatMap(s=>s.refs).includes(node),'history nodes are shared across round snapshots');
  const request=audit.requests.at(-1);
  assert.ok(request.inputSegments.some(s=>s.refs.includes(node)),'logical requests reference the same shared views');
});

test('the request route sends bounded input segments instead of full node copies',async()=>{
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1,type,data,...extra});return seq;};
  add('turn/start',{turn:1});
  add('request/header',{header:{config:{model:'deepseek-flash'},tools:[{name:'read',description:'Read',input_schema:{type:'object'}}]}});
  for(let i=0;i<60;i++)add('user/message',{id:`u${i}`,role:'user',content:[{type:'text',text:`part ${i} `}],source:{kind:'user'}},{surfaceOp:'append'});
  add('assistant/message',{turn:1,step:1,message:{id:'a1',role:'assistant',content:[{type:'text',text:'reply'}],source:{kind:'model'}},stream:[]},{surfaceOp:'append'});
  add('turn/end',{turn:1,reason:{kind:'completed'}});
  let route;
  const ctx={sessions:{messageProjections:[]},sessionProjections:{register(){}},effect:fn=>fn(),connection:{fetch:{register:r=>{route=r;return()=>{};}}},sessionQuery:{observeSession:async id=>({cursor:events.length-1,header:{id,createdAt:1},events,[Symbol.dispose](){}})}};
  apply(ctx,{});
  const response=await route.fetch(new Request(`http://local/api/dsh-context-lite/audit?sessionId=s&kind=request&requestId=request-${events.length-2}`));
  assert.equal(response.status,200);
  const {value}=await response.json();
  assert.ok(value.inputSegments.length>0);
  const merged=value.inputSegments.find(s=>s.refCount!==undefined);
  assert.ok(merged,'the 60-message segment must be bounded to a refCount');
  assert.ok(merged.refCount>=60);
  assert.equal(merged.refs,undefined);
  for(const segment of value.inputSegments)if(segment.refs)for(const ref of segment.refs)assert.deepEqual(Object.keys(ref).sort(),['seq']);
});

test('totals still match an independent canonical replay after memoization',()=>{
  const events=longSession(12),audit=buildAudit({id:'replay',createdAt:1,version:4},events,{originFor:()=>undefined});
  for(const round of audit.rounds){
    assert.equal(round.segments.reduce((n,s)=>n+s.tokens,0),round.total,`round ${round.id} composition must sum to its total`);
    const surface=new SurfaceManager(events.slice(0,round.cutSeq+1),0,[]);
    const header=events.slice(0,round.cutSeq+1).findLast(e=>e.type==='request/header')?.data.header;
    const expected=[...surface.nodes].map(seq=>surface.deriveEventMessage(events[seq])).filter(Boolean).reduce((n,m)=>n+estimateMessage(m),0)+estimateToolsTokens(header);
    assert.equal(round.total,expected,`round ${round.id} must equal a fresh SurfaceManager replay`);
  }
  const detail=audit.rounds.at(-1).segments.at(-1);
  const items=readDetail(audit,events,{roundId:audit.rounds.at(-1).id,segmentId:detail.id,limit:3,previewCharacters:200});
  assert.equal(items.total,detail.refs.length);
  assert.ok(items.items.every((item,i)=>item.seq===detail.refs[i].seq));
});

test('reading unknown sessions never creates rows or evicts real evidence',()=>{
  const store=new OriginStore({maxSessions:2});
  store.record('s-real',4,{producer:{type:'plugin',id:'p',name:'producer'},method:'agent.inject'});
  for(let i=0;i<5;i++){
    assert.deepEqual(store.inspect(`unknown-${i}`).events,{});
    assert.equal(store.originFor(`unknown-${i}`,0),undefined);
  }
  assert.equal(store.sessions.size,1,'read-only inspection must not occupy the bounded session window');
  assert.equal(store.originFor('s-real',4).producer.id,'p','real evidence must survive reads of unknown sessions');
});

// Same-round replacements make the replaced plugin contribution transient:
// the round added it and it no longer survives at the round boundary.
function roundFixture(build){
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1,type,data,...extra});return seq;};
  const plugin=(id,extra={})=>add('user/message',{id,role:'user',content:[{type:'text',text:`body ${id}`}],source:{kind:`plugin-${id}`}},extra);
  const assistant=()=>add('assistant/message',{turn:1,step:1,message:{id:`a${events.length}`,role:'assistant',content:[{type:'text',text:'reply'}],source:{kind:'model'}},stream:[]},{surfaceOp:'append'});
  add('turn/start',{turn:1});
  build({add,plugin,assistant,replaced:(seq,...source)=>({surfaceOp:{op:'replace',startSeq:seq,endSeq:seq},sourceEventSeqs:[seq,...source]})});
  assistant();
  add('turn/end',{turn:1,reason:{kind:'completed'}});
  return buildAudit({id:'transient',createdAt:1,version:4},events,{originFor:()=>undefined}).rounds[0].changes;
}
const changesOf=(changes,key)=>changes.find(c=>c.provenance.key===key);

test('a plugin contribution replaced within its own round stays visible as transient',()=>{
  // Minimal coordinator reproduction: append plugin-a, replace it with plugin-b.
  const changes=roundFixture(({plugin,assistant})=>{
    plugin('a',{surfaceOp:'append'});
    plugin('b',{surfaceOp:{op:'replace',startSeq:1,endSeq:1},sourceEventSeqs:[1]});
  });
  const a=changesOf(changes,'unknown:["plugin-a"]'),b=changesOf(changes,'unknown:["plugin-b"]');
  assert.ok(a,'the replaced contribution must remain listed');
  assert.deepEqual(a.transient,[1]);
  assert.deepEqual(a.added,[]);
  assert.ok(b);
  assert.deepEqual(b.added,[2]);
  assert.deepEqual(b.transient,[]);
});

test('chained same-round replacements keep every earlier author as transient',()=>{
  const changes=roundFixture(({plugin})=>{
    plugin('a',{surfaceOp:'append'});
    plugin('b',{surfaceOp:{op:'replace',startSeq:1,endSeq:1},sourceEventSeqs:[1]});
    plugin('c',{surfaceOp:{op:'replace',startSeq:2,endSeq:2},sourceEventSeqs:[2]});
  });
  assert.deepEqual(changesOf(changes,'unknown:["plugin-a"]').transient,[1]);
  assert.deepEqual(changesOf(changes,'unknown:["plugin-b"]').transient,[2]);
  assert.deepEqual(changesOf(changes,'unknown:["plugin-c"]').added,[3]);
});

test('re-entering the same source after an in-round replacement lists both entries',()=>{
  const changes=roundFixture(({plugin})=>{
    plugin('a',{surfaceOp:'append'});
    plugin('b',{surfaceOp:{op:'replace',startSeq:1,endSeq:1},sourceEventSeqs:[1]});
    plugin('a',{surfaceOp:'append'});
  });
  const a=changesOf(changes,'unknown:["plugin-a"]');
  assert.deepEqual(a.added,[3]);
  assert.deepEqual(a.transient,[1]);
  assert.deepEqual(changesOf(changes,'unknown:["plugin-b"]').added,[2]);
});

test('a plugin contribution retained at the round boundary is removed when the next round replaces it',()=>{
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1,type,data,...extra});return seq;};
  const plugin=(id,extra={})=>add('user/message',{id,role:'user',content:[{type:'text',text:`body ${id}`}],source:{kind:`plugin-${id}`}},extra);
  const assistant=turn=>add('assistant/message',{turn,step:1,message:{id:`a${events.length}`,role:'assistant',content:[{type:'text',text:'reply'}],source:{kind:'model'}},stream:[]},{surfaceOp:'append'});
  add('turn/start',{turn:1});
  const first=plugin('a',{surfaceOp:'append'});
  assistant(1);
  add('turn/end',{turn:1,reason:{kind:'completed'}});
  add('turn/start',{turn:2});
  plugin('b',{surfaceOp:{op:'replace',startSeq:first,endSeq:first},sourceEventSeqs:[first]});
  assistant(2);
  add('turn/end',{turn:2,reason:{kind:'completed'}});
  const audit=buildAudit({id:'cross-round',createdAt:1,version:4},events,{originFor:()=>undefined});
  const r1=changesOf(audit.rounds[0].changes,'unknown:["plugin-a"]'),r2=changesOf(audit.rounds[1].changes,'unknown:["plugin-a"]');
  assert.deepEqual(r1.added,[first]);
  assert.deepEqual(r2.removed,[first],'the later replacement must mark the earlier contribution removed for its round baseline');
});
