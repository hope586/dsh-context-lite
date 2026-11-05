// Reproducible review benchmark for dsh-context-lite.
//
// Usage:
//   node scripts/benchmark-review.mjs [--rounds 50,200,800] [--baseline <dir>] [--trials 3]
//
// - <dir> is a checkout (or a directory containing src/) of the baseline to
//   compare against; measurements then run against both trees. The baseline
//   tree must resolve @deepseek-ai/* itself (e.g. a checkout of this repo
//   with its own node_modules or a symlink to one).
// - Fixtures and units are fixed below; every number is a median of repeated
//   trials on the same machine and process. No network, disk or model calls.
// - Run with --expose-gc for exact heap deltas (falls back to heapUsed diffs).
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const flag=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const roundsList=(flag('--rounds')||'50,200').split(',').map(Number).filter(n=>n>0);
const trials=Math.max(1,Number(flag('--trials')||3));
const baseline=flag('--baseline');

const load=async dir=>{
  const root=dir?resolve(dir):resolve(here,'..');
  const src=p=>import(pathToFileURL(resolve(root,'src',p)).href);
  return {audit:await src('audit.js'),developerAudit:await src('developer-audit.js'),collector:await src('collector.js'),originStore:await src('origin-store.js'),label:dir?'baseline':'current',root};
};

// ---- fixed fixtures --------------------------------------------------------
const longFixture=rounds=>{
  const events=[];const add=(type,data,extra={})=>{const seq=events.length;events.push({seq,time:1000+seq,type,data,...extra});return seq;};
  let id=0;
  const user=(text,kind='user')=>({id:`u-${++id}`,role:'user',content:[{type:'text',text}],source:{kind}});
  const assistant=text=>({id:`a-${++id}`,role:'assistant',content:[{type:'text',text}],source:{kind:'model',provider:'deepseek',model:'deepseek-flash'}});
  for(let r=1;r<=rounds;r++){
    add('turn/start',{turn:r});
    if(r===1){
      add('system/message',{turn:r,step:1,message:{id:`s-${++id}`,role:'system',content:[{type:'text',text:'system prompt '.repeat(40)}],source:{kind:'system-prompt'}}},{surfaceOp:'append'});
      add('request/context',{provider:'deepseek',model:'deepseek-flash',contextWindow:128000});
    }
    add('request/header',{header:{config:{provider:'deepseek',model:'deepseek-flash'},tools:[{name:'read',description:'Read files',parameters:{type:'object',properties:{path:{type:'string'}}}}]}});
    add('user/message',user(`question number ${r} about the project `.repeat(8)),{surfaceOp:'append'});
    add('user/message',user(`memory context for round ${r} `.repeat(6),'memory-provider'),{surfaceOp:'append'});
    if(r%7===0){
      const a=add('user/message',user(`old fact ${r}`),{surfaceOp:'append'});
      const b=add('assistant/message',{turn:r,step:1,message:assistant(`old answer ${r}`),stream:[]},{surfaceOp:'append'});
      const summary=add('compaction/summary',{compactionId:`c${r}`,summary:[{type:'text',text:`summary ${r}`}],shadowedRange:{start:a,end:b},shadowedSeqs:[a,b],shadowedTokenCount:10,provider:'deepseek',model:'deepseek-flash'});
      add('user/message',user(`summary ${r}`,'compact-checkpoint'),{surfaceOp:{op:'replace',startSeq:a,endSeq:b},sourceEventSeqs:[summary,a,b]});
    }
    add('tool/call',{turn:r,step:1,callId:`c-${r}`,name:'read',arguments:'{"path":"/tmp/x"}'});
    add('tool/result',{turn:r,step:1,message:{id:`t-${++id}`,role:'tool',source:{kind:'tool',callId:`c-${r}`},content:[{type:'text',text:'tool output '.repeat(120)}]}},{surfaceOp:'append'});
    add('assistant/message',{turn:r,step:1,message:assistant(`answer ${r} `.repeat(200)),stream:[]},{surfaceOp:'append'});
    add('assistant/message',{turn:r,step:2,message:assistant(`final answer ${r} `.repeat(60)),stream:[]},{surfaceOp:'append'});
    add('turn/end',{turn:r,reason:r%5===0?{kind:'aborted',reason:{kind:'user'}}:{kind:'completed'}});
  }
  return events;
};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const heap=()=>{global.gc?.();return process.memoryUsage().heapUsed;};

// ---- measurements (units fixed per measurement) ----------------------------
async function measureLongSession(mod,rounds){
  const header={id:'benchmark-session',createdAt:1,version:4},originFor=()=>undefined;
  const buildTimes=[],serializeTimes=[],payloadSizes=[],snapshotTimes=[],heapDeltas=[];
  let requests=0;
  for(let t=0;t<trials;t++){
    const events=longFixture(rounds);
    const before=heap();
    const start=performance.now();
    const audit=mod.audit.buildAudit(header,events,{originFor});
    const buildMs=performance.now()-start;
    const serializeStart=performance.now();
    const payload=JSON.stringify(mod.audit.overview(audit));
    const serializeMs=performance.now()-serializeStart;
    heapDeltas.push((heap()-before)/1048576);
    buildTimes.push(buildMs);serializeTimes.push(serializeMs);payloadSizes.push(payload.length);
    if(t===0){
      requests=audit.requests.length;
      const bundle={audit,events,origins:{events:{},actors:{}},collection:{enabled:true,retention:{}},version:'benchmark',build:'benchmark'};
      const snapshotStart=performance.now();
      mod.developerAudit.contextSnapshot(bundle,{});
      snapshotTimes.push(performance.now()-snapshotStart);
    }
  }
  return {rounds,eventsPerRound:9,buildAuditMs:+median(buildTimes).toFixed(1),overviewSerializeMs:+median(serializeTimes).toFixed(1),overviewPayloadKB:+(median(payloadSizes)/1024).toFixed(1),developerSnapshotMs:snapshotTimes.length?+median(snapshotTimes).toFixed(1):null,auditGraphMB:+median(heapDeltas).toFixed(1),logicalRequests:requests};
}
async function measureAdmission(mod){
  const {Context}=await import('@deepseek-ai/cordis');
  const perAdmission=[];
  for(let t=0;t<trials;t++){
    const ctx=new Context();let collector;
    await ctx.plugin({name:'dsh-context-lite',apply(c){collector=mod.collector.collectOrigins(c);c.effect(()=>()=>collector.close());}});
    let seq=0;const events=[];const session={id:'bench'};
    session.append=(type,data,extra)=>{const e={seq:seq++,type,data,...extra};events.push(e);ctx.emit('session/event',session,e);return e;};
    const agent={session,inbox:{append(target,m){session.append('agent/inbox/spliced',{inserted:[m]});}}};
    agent.inject=m=>agent.inbox.append('next-step',m);
    await ctx.plugin({name:'bench-producer',apply(c){c.fiber.entry={id:'bench',options:{name:'benchmark-plugin'}};c.on('produce',m=>agent.inject(m));}});
    await ctx.serial('agent/created',{agent});
    const messages=[];for(let i=0;i<600;i++)messages.push({id:`m${i}`,role:'user',content:[{type:'text',text:('tool result body ').repeat(512)}],source:{kind:'opaque-producer'}});
    const start=performance.now();
    for(const m of messages){await ctx.serial('produce',m);session.append('user/message',m,{surfaceOp:'append'});}
    perAdmission.push((performance.now()-start)/messages.length*1000);
    await ctx.fiber.dispose();
  }
  return {messageBytes:('tool result body '.repeat(512)).length,admissions:600,perAdmissionMicroseconds:+median(perAdmission).toFixed(1)};
}
async function measureStore(mod){
  const times=[];
  for(let t=0;t<trials;t++){
    const store=new mod.originStore.OriginStore({maxRecords:2000});
    const start=performance.now();
    for(let i=0;i<4000;i++)store.record(`sess-${i%3}`,i,{producer:{type:'plugin',id:`p${i%40}`,name:'producer'},method:'agent.inject',messageId:`m-${i}`});
    times.push(performance.now()-start);
    await store.close();
  }
  return {records:4000,sessions:3,evidenceWindow:2000,recordMilliseconds:+median(times).toFixed(1)};
}

// ---- run -------------------------------------------------------------------
const trees=[await load(null)];
if(baseline)trees.push(await load(baseline));
const report={timestamp:new Date().toISOString(),node:process.version,trials,units:{buildAuditMs:'milliseconds per full rebuild',overviewSerializeMs:'milliseconds to JSON.stringify one overview',overviewPayloadKB:'bytes of one overview wire payload / 1024',auditGraphMB:'garbage-collected heap delta in MiB',perAdmissionMicroseconds:'microseconds per observed admission (8.6 KiB message)',recordMilliseconds:'milliseconds per 4000 bounded-metadata records'},scope:'same machine and process, synthetic fixtures only; excludes network, disk persistence and model time',trees:[]};
for(const tree of trees){
  const entry={label:tree.label,root:tree.root,longSessions:[],admission:null,originStoreChurn:null};
  for(const rounds of roundsList)entry.longSessions.push(await measureLongSession(tree,rounds));
  entry.admission=await measureAdmission(tree);
  entry.originStoreChurn=await measureStore(tree);
  report.trees.push(entry);
}
for(const entry of report.trees){
  console.log(`[${entry.label}]`);
  for(const m of entry.longSessions)console.log(`  rounds=${String(m.rounds).padStart(4)} buildAudit=${m.buildAuditMs}ms overview=${m.overviewPayloadKB}KB/${m.overviewSerializeMs}ms snapshot=${m.developerSnapshotMs}ms auditGraph=${m.auditGraphMB}MB requests=${m.logicalRequests}`);
  console.log(`  admission=${entry.admission.perAdmissionMicroseconds}us/message storeChurn=${entry.originStoreChurn.recordMilliseconds}ms/4000`);
}
console.log(JSON.stringify(report,null,2));
