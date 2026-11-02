import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {SessionStore} from '@deepseek-ai/dsh-session';
import {collectOrigins} from '../src/collector.js';
import {buildAudit} from '../src/audit.js';
import {describeSource} from '../src/provenance.js';
import {contextSnapshot} from '../src/developer-audit.js';
import {OriginStore} from '../src/origin-store.js';

const message=(id,text=id)=>({id,role:'user',source:{kind:'synthetic-context'},content:[{type:'text',text}]});
async function setup({late=false}={}) {
  const ctx=new Context();new SessionStore(ctx);let collector,observer;
  const observe=async()=>{observer=await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});};
  const plugin=(name,apply)=>ctx.plugin({name,apply(c){c.fiber.entry={id:name,options:{name:`synthetic-${name}`}};return apply(c);}});
  if(!late)await observe();
  const s=ctx.sessions.create('native-fixture'),agent={session:s};
  const preStep=(base=[])=>ctx.waterfall('agent/pre-step',{agent,messages:base},()=>Promise.resolve({kind:'enter',messages:base}));
  const admit=decision=>decision.messages.map(m=>s.append('user/message',m,{surfaceOp:'append'}));
  return {ctx,s,agent,plugin,observe,preStep,admit,get collector(){return collector;},unload:()=>observer.dispose(),close:()=>ctx.fiber.dispose()};
}

test('pre-step composition preserves original promises and attributes only each middleware contribution',async t=>{
  const h=await setup();t.after(()=>h.close());let outerPromise,innerPromise;
  const base=message('base'),outer=message('outer'),inner=message('inner');
  await h.plugin('outer',c=>c.on('agent/pre-step',(_p,next)=>outerPromise=(async()=>{const d=await next();return {...d,messages:[...d.messages,outer]};})()));
  await h.plugin('inner',c=>c.on('agent/pre-step',(_p,next)=>innerPromise=(async()=>{const d=await next();return {...d,messages:[...d.messages,inner]};})()));
  const returned=h.preStep([base]);assert.equal(returned,outerPromise);const d=await returned;assert.ok(innerPromise instanceof Promise);
  assert.deepEqual(d.messages,[base,inner,outer]);assert.equal(d.messages[0],base);
  const events=h.admit(d);
  assert.equal(h.collector.originFor(h.s.id,events[0]),undefined);
  assert.equal(h.collector.originFor(h.s.id,events[1]).producer.name,'inner');
  assert.equal(h.collector.originFor(h.s.id,events[2]).producer.name,'outer');
  assert.equal(h.collector.originFor(h.s.id,events[2]).method,'agent.pre-step');
  assert.ok(!JSON.stringify(h.collector.inspect(h.s.id)).includes('"content"'));
  assert.equal(h.collector.status().failures,0);
});

test('changed pre-step messages take the changing owner while unchanged clones retain downstream ownership',async t=>{
  const h=await setup();t.after(()=>h.close());
  await h.plugin('outer',c=>c.on('agent/pre-step',async(_p,next)=>{const d=await next();return {...d,messages:d.messages.map(m=>m.id==='changed'?{...m,content:[{type:'text',text:'new'}]}:structuredClone(m))};}));
  await h.plugin('inner',c=>c.on('agent/pre-step',async(_p,next)=>({...await next(),messages:[message('same'),message('changed','old')]})));
  const [same,changed]=h.admit(await h.preStep());
  assert.equal(h.collector.originFor(h.s.id,same).producer.name,'inner');
  assert.equal(h.collector.originFor(h.s.id,changed).producer.name,'outer');
});

test('rejection, removal and failed middleware do not create successful admissions',async t=>{
  const h=await setup();t.after(()=>h.close());let mode='reject';const failure=Error('original failure');
  await h.plugin('outer',c=>c.on('agent/pre-step',async(_p,next)=>{await next();if(mode==='throw')throw failure;return mode==='reject'?{kind:'reject'}:{kind:'enter',messages:[]};}));
  await h.plugin('inner',c=>c.on('agent/pre-step',async(_p,next)=>({...await next(),messages:[message('discarded')]})));
  assert.deepEqual(await h.preStep(),{kind:'reject'});assert.deepEqual(h.collector.inspect(h.s.id).events,{});
  mode='throw';await assert.rejects(h.preStep(),e=>e===failure);assert.deepEqual(h.collector.inspect(h.s.id).events,{});
  mode='remove';assert.deepEqual((await h.preStep()).messages,[]);
  h.s.append('turn/end',{turn:1,reason:{kind:'completed'}});
  const unrelated=h.s.append('user/message',message('discarded'),{surfaceOp:'append'});
  assert.equal(h.collector.originFor(h.s.id,unrelated),undefined);
});

test('message accessors are not invoked by provenance capture and cannot override native admission behavior',async t=>{
  const h=await setup();t.after(()=>h.close());let reads=0;
  const value={...message('accessor'),get content(){reads++;return [{type:'text',text:'evaluated by host'}];}};
  await h.plugin('accessor',c=>c.on('agent/pre-step',()=>({kind:'enter',messages:[value]})));
  const d=await h.preStep();assert.equal(reads,0);const [event]=h.admit(d);assert.ok(reads>0);
  assert.equal(h.collector.originFor(h.s.id,event),undefined);assert.ok(h.collector.status().failures>0);
});

test('direct native surface writes retain exact append result, failures and author, including replacement',async t=>{
  const h=await setup();t.after(()=>h.close());let returned;
  await h.plugin('append',c=>c.on('direct',()=>returned=h.s.append('user/message',message('first'),{surfaceOp:'append'})));
  h.ctx.emit('direct');assert.equal(h.collector.originFor(h.s.id,returned).method,'session.append');
  assert.equal(h.collector.originFor(h.s.id,returned).producer.name,'append');
  const seq=returned.seq;
  await h.plugin('replace',c=>c.on('replace',()=>returned=h.s.append('user/message',message('replacement'),{surfaceOp:{op:'replace',startSeq:seq,endSeq:seq},sourceEventSeqs:[seq]})));
  h.ctx.emit('replace');assert.equal(h.collector.originFor(h.s.id,returned).producer.name,'replace');
  assert.deepEqual(returned.sourceEventSeqs,[seq]);
  const before=h.s.seq,origins=structuredClone(h.collector.inspect(h.s.id).events);
  assert.throws(()=>h.s.append('user/message',{...message('invalid'),content:[{type:'text',text:1n}]},{surfaceOp:'append'}));
  assert.equal(h.s.seq,before);assert.deepEqual(h.collector.inspect(h.s.id).events,origins);
});

test('late observation captures new pre-step and session writes without claiming inherited seed ownership',async t=>{
  const h=await setup({late:true});t.after(()=>h.close());
  const old=h.s.append('user/message',message('old'),{surfaceOp:'append'});
  await h.plugin('late',c=>{c.on('agent/pre-step',async(_p,next)=>({...await next(),messages:[message('new')]}));c.on('direct-late',()=>h.s.append('user/message',message('direct'),{surfaceOp:'append'}));});
  await h.observe();const [accepted]=h.admit(await h.preStep());h.ctx.emit('direct-late');
  assert.equal(h.collector.originFor(h.s.id,old),undefined);
  assert.equal(h.collector.originFor(h.s.id,accepted).method,'agent.pre-step');
  const fork=h.ctx.sessions.fork(h.s,h.s.seq-1,'fork-fixture');
  assert.deepEqual(h.collector.inspect(fork.id).events,{});
  const append=fork.append;await h.unload();assert.notEqual(fork.append,append);
  const after=h.s.append('user/message',message('after-unload'),{surfaceOp:'append'});assert.equal(after.data.id,'after-unload');
});

test('native developer tool changes are labeled and tool replacements keep their new author',()=>{
  const events=[];const add=(type,data,extra={})=>{const event={seq:events.length,type,time:events.length,data,...extra};events.push(event);return event;};
  add('turn/start',{turn:1});
  const call=add('tool/call',{turn:1,step:1,callId:'c',name:'read',arguments:'{}'});
  const source={kind:'tool',callId:'c'},tool={id:'result',role:'tool',source,content:[{type:'text',text:'original'}]};
  const original=add('tool/result',{turn:1,step:1,message:tool},{surfaceOp:'append'});
  const replaced=add('tool/result',{turn:1,step:1,message:{...tool,content:[{type:'text',text:'replaced'}]}},{surfaceOp:{op:'replace',startSeq:original.seq,endSeq:original.seq},sourceEventSeqs:[original.seq]});
  const native=describeSource({kind:'tool-registry'},{eventType:'developer/message'});assert.equal(native.evidence,'native');assert.equal(native.key,'native:tool-registry');
  const producer={type:'plugin',id:'new-author',name:'new author'};
  const store=new OriginStore();
  store.record('synthetic-audit',call.seq,{contributors:[{producer:{type:'plugin',id:'old-author'},evidence:'runtime-registration'}]});
  store.record('synthetic-audit',original.seq,{producer:{type:'plugin',id:'native-loop',native:true},method:'session.append',evidence:'runtime'});
  store.record('synthetic-audit',replaced.seq,{producer,method:'session.append',evidence:'runtime'});
  const audit=buildAudit({id:'synthetic-audit'},events,{originFor:e=>store.originFor('synthetic-audit',e.seq)});
  assert.equal(audit.records.get(original.seq).provenance.callerId,'old-author');
  assert.equal(audit.records.get(replaced.seq).provenance.callerId,'new-author');
  const beforeReplacement=contextSnapshot({audit,events,origins:store.inspect('synthetic-audit'),collection:{}},{atSeq:original.seq});
  const apiSource=beforeReplacement.items.find(i=>i.ref.seq===original.seq).source;
  assert.equal(apiSource.actor.id,'old-author');assert.equal(apiSource.entryMethod,'tool.result');
  const unknown=buildAudit({id:'synthetic-audit'},events,{originFor:e=>e===call?{contributors:[{producer:{type:'plugin',id:'old-author'}}]}:undefined});
  assert.equal(unknown.records.get(replaced.seq).provenance.callerId,undefined);
  assert.equal(unknown.records.get(replaced.seq).provenance.evidence,'missing');
});

test('additional tool contexts preserve the middleware author across the loop-owned inbox transfer',async t=>{
  const h=await setup();t.after(()=>h.close());const added=message('tool-context');
  h.agent.inbox={append(target,m){h.s.append('agent/inbox/spliced',{target,start:0,deleteCount:0,inserted:[m]});}};
  await h.ctx.serial('agent/created',{agent:h.agent});
  const exec={agent:h.agent,name:'fixture-tool',callId:'fixture-call'};
  await h.plugin('post-policy',c=>c.on('tools/post-execute',async(_exec,_result,next)=>({...await next(),additionalContexts:[added]})));
  const decision=await h.ctx.waterfall('tools/post-execute',exec,{content:[]},()=>Promise.resolve({kind:'accept'}));
  h.ctx.emit('tools/result',exec,{content:[],additionalContexts:decision.additionalContexts});
  await h.plugin('loop-transfer',c=>c.on('transfer',()=>h.agent.inbox.append('next-step',added)));
  h.ctx.emit('transfer');const accepted=h.s.append('user/message',added,{surfaceOp:'append'});
  const captured=h.collector.originFor(h.s.id,accepted);
  assert.equal(captured.producer.name,'post-policy');assert.equal(captured.method,'tools.post-execute');
  assert.equal(captured.callId,'fixture-call');assert.equal(captured.toolName,'fixture-tool');
  assert.equal(captured.queuedSeq,accepted.seq-1);
});

test('unobserved deferContext authors remain unknown while the native tool transfer is identified',async t=>{
  const h=await setup();t.after(()=>h.close());const added=message('unobserved-tool-context');
  h.ctx.emit('tools/result',{agent:h.agent,name:'fixture-tool',callId:'call'},{additionalContexts:[added]});
  const accepted=h.s.append('user/message',added,{surfaceOp:'append'}),captured=h.collector.originFor(h.s.id,accepted);
  assert.equal(captured.producer,undefined);assert.equal(captured.method,'tool.additional-context');
  const p=describeSource(accepted.data.source,{observed:captured});
  assert.equal(p.evidence,'missing');assert.equal(p.api,'tool.additional-context');
});

test('current native developer tool updates survive canonical replay and developer snapshots',()=>{
  const events=[
    {seq:0,time:1,type:'turn/start',data:{turn:1}},
    {seq:1,time:2,type:'request/header',data:{header:{config:{provider:'fixture',model:'fixture'},tools:[{name:'extra',description:'synthetic tool',parameters:{type:'object'}}]}}},
    {seq:2,time:3,type:'developer/message',surfaceOp:'append',data:{turn:1,step:1,headerSeq:1,message:{id:'tool-update',role:'developer',source:{kind:'tool-registry'},content:[{type:'tool-addition',toolName:'extra'}]}}},
  ];
  const audit=buildAudit({id:'developer-fixture',version:4},events);
  const snapshot=contextSnapshot({audit,events,origins:{},collection:{}},{},{includeContent:true});
  const update=snapshot.items.find(i=>i.ref.seq===2);
  assert.equal(update.source.key,'native:tool-registry');assert.equal(update.content.role,'developer');
  assert.ok(update.estimatedTokens>0);assert.equal(update.content.content[0].toolName,'extra');
});
