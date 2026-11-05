import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {zh,en} from '../src/i18n.js';
import {buildAudit,readDetail,maxWireRefs,slimSegment} from '../src/audit.js';

// The sidebar wire now uses {seq}-only refs and refCount beyond maxWireRefs.
// These checks exercise the shipped client bundle's helpers, the long-refs
// detail pagination and both locales, using only synthetic fixtures.
async function clientExports(){
  const bundle=await build({entryPoints:['src/client.js'],bundle:true,platform:'browser',format:'iife',globalName:'Client',write:false});
  const sandbox={React:{},Client:undefined};
  vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
  const Client=sandbox.Client;
  return {refCount:Client.refCount,refLog:Client.refLog,mergeOverview:Client.mergeOverview};
}

test('wire helpers handle bounded refs, refCount-only segments and tools segments',async()=>{
  const {refCount,refLog}=await clientExports();
  const seqRefs=n=>({refs:Array.from({length:n},(_,i)=>({seq:i+1}))});
  assert.equal(refCount(seqRefs(3)),3);
  assert.equal(refLog(seqRefs(3)).refs,'#1, #2, #3');
  const many=seqRefs(30);
  assert.equal(refLog(many).refs.split(', ').length,12);
  assert.ok(refLog(many).refs.endsWith('…'));
  const truncated={refCount:60};
  assert.equal(refCount(truncated),60);
  assert.equal(refLog(truncated),null,'a refCount-only segment must not render a log list');
  assert.equal(refCount({}),0,'tools segments carry no refs');
  assert.equal(refLog({}),null);
});

test('long merged segments page through every item in the detail view',()=>{
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1,type,data,...extra});return seq;};
  add('turn/start',{turn:1});
  add('request/header',{header:{config:{model:'m'},tools:[{name:'read',description:'Read',input_schema:{type:'object'}}]}});
  for(let i=0;i<60;i++)add('user/message',{id:`u${i}`,role:'user',content:[{type:'text',text:`part ${i}`}],source:{kind:'user'}},{surfaceOp:'append'});
  add('assistant/message',{turn:1,step:1,message:{id:'a1',role:'assistant',content:[{type:'text',text:'reply'}],source:{kind:'model'}},stream:[]},{surfaceOp:'append'});
  add('turn/end',{turn:1,reason:{kind:'completed'}});
  const audit=buildAudit({id:'wire',createdAt:1,version:4},events,{originFor:()=>undefined});
  const round=audit.rounds[0],segment=round.segments.find(s=>s.refs.length>maxWireRefs);
  const wire=slimSegment(segment);
  assert.equal(wire.refs,undefined);
  assert.equal(wire.refCount,segment.refs.length);
  const seen=[];
  for(let offset=0;;offset+=10){
    const page=readDetail(audit,events,{roundId:round.id,segmentId:segment.id,offset,limit:10,previewCharacters:400});
    seen.push(...page.items.map(item=>item.seq));
    if(!page.more)break;
    assert.ok(page.items.length>0,'pagination must always progress');
  }
  assert.deepEqual(seen,segment.refs.map(n=>n.seq),'every retained item stays reachable across pages');
});

test('mergeOverview keeps loaded earlier rounds and a valid hidden count across refreshes',async()=>{
  const {mergeOverview}=await clientExports();
  const round=(id,...extra)=>({id,segments:[],requests:[],...extra});
  const value={sessionId:'s',hiddenRounds:2,rounds:[round(5),round(6)]};
  assert.equal(mergeOverview(null,value),value);
  assert.equal(mergeOverview({sessionId:'other',rounds:[]},value),value);
  const earlier={sessionId:'s',hiddenRounds:0,rounds:[round(1),round(2),round(3),round(4)]};
  const merged=mergeOverview(earlier,value);
  assert.deepEqual([...merged.rounds.map(r=>r.id)],[1,2,3,4,5,6]);
  assert.equal(merged.hiddenRounds,0,'the first displayed round did not move, so the count stays valid');
  // A refresh that drops middle rounds into a gap keeps older rounds visible;
  // the gap itself is only reachable through an explicit earlier-rounds fetch.
  const refresh={sessionId:'s',hiddenRounds:6,rounds:[round(9),round(10)]};
  const gapped=mergeOverview({...merged},refresh);
  assert.deepEqual([...gapped.rounds.map(r=>r.id)],[1,2,3,4,5,6,9,10]);
  assert.equal(gapped.hiddenRounds,0);
});

test('both locales carry the truncated-references copy with a count placeholder',()=>{
  assert.equal(zh.refsTruncated.includes('{count}'),true);
  assert.equal(en.refsTruncated.includes('{count}'),true);
  assert.equal(zh.continuousItems.includes('{count}'),true);
  assert.equal(en.continuousItems.includes('{count}'),true);
  assert.ok(!/[\u3400-\u9fff]/u.test(en.refsTruncated));
});
