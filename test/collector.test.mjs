import test from 'node:test';
import assert from 'node:assert/strict';
import {Context,Service} from '@deepseek-ai/cordis';
import {createScope,ScopedLayers,NamedEntries} from '@deepseek-ai/dsh-scope';
import {collectOrigins} from '../src/collector.js';
import {OriginStore} from '../src/origin-store.js';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Prompt extends Service {
  constructor(c){super(c,'systemPrompt');this.layers=new ScopedLayers(()=>({contexts:new NamedEntries(n=>Error(n)),sections:new NamedEntries(n=>Error(n)),isEmpty(){return this.contexts.isEmpty()&&this.sections.isEmpty();}}),()=>{});}
  context(value){return this.layers.effect(this.ctx,l=>l.contexts.insert(value.name,value),{label:'test-context'});}
  section(value){return this.layers.effect(this.ctx,l=>l.sections.insert(value.name,value),{label:'test-section'});}
  assemble(context){const names=this.layers.merge(context.scope,l=>l.sections);return this.lastPromise=Promise.resolve({sections:[...names.values()],contexts:[]});}
}
function session(ctx,id='session-test'){
  const events=[];return {id,events,append(type,data){const event={seq:events.length,type,data};events.push(event);ctx.emit('session/event',this,event);return event;}};
}
function agentFor(ctx,id){
  const s=session(ctx,id),queue=[];
  const agent={session:s,inbox:{splice(target,start,count,items){s.append('agent/inbox/spliced',{target,start,inserted:items});queue.push(...items);return items;},append(target,msg){return this.splice(target,0,0,[msg]);}},
    send(msg,target,wakeup){this.inbox.append(target,msg);return wakeup;},inject(msg){return this.send(msg,'next-step',false);},steer(msg){return this.send(msg,'next-step',true);},followup(msg){return this.send(msg,'next-turn',true);},admit(){for(const m of queue.splice(0))s.append('user/message',m);}};
  return agent;
}
async function setup(){
  const ctx=new Context();await ctx.plugin(Prompt);
  let collector;const observer=await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
  const plugin=async(name,apply)=>ctx.plugin({name,apply(c){c.fiber.entry={id:name,options:{name:`test-${name}`}};return apply(c);}});
  return {ctx,collector,observer,plugin,close:()=>ctx.fiber.dispose()};
}
const message=(id,kind=id)=>Object.freeze({id,role:'user',content:Object.freeze([{type:'text',text:`body-${id}`}]),source:Object.freeze({kind})});

test('unmodified async producers: exact methods, message identity and accepted seqs survive parallel callbacks',async()=>{
  const h=await setup(),a=agentFor(h.ctx,'s-a'),b=agentFor(h.ctx,'s-b'),ma=message('a'),mb=message('b');
  await h.plugin('alpha',c=>c.on('produce',async()=>{await delay(8);assert.equal(a.inject(ma),false);}));
  await h.plugin('beta',c=>c.on('produce',async()=>{await delay(1);assert.equal(b.steer(mb),true);}));
  // Attach via the actual event dispatch, before a third-party listener runs.
  await h.ctx.serial('agent/created',{agent:a});await h.ctx.serial('agent/created',{agent:b});
  await h.ctx.parallel('produce');a.admit();b.admit();
  const ao=h.collector.originFor('s-a',a.session.events[1]),bo=h.collector.originFor('s-b',b.session.events[1]);
  assert.equal(ao.producer.name,'alpha');assert.equal(ao.method,'agent.inject');
  assert.equal(bo.producer.name,'beta');assert.equal(bo.method,'agent.steer');
  assert.equal(a.session.events[1].data,ma);assert.equal(b.session.events[1].data,mb);
  assert.ok(!JSON.stringify(h.collector.inspect('s-a')).includes('body-a'));
  assert.equal(h.collector.status().failures,0);await h.close();
});

test('registration tracks the executing plugin across agent.ctx and preserves Promise identity / manual disposer',async()=>{
  const h=await setup(),agent=agentFor(h.ctx,'scoped');
  let scope;await h.ctx.plugin({name:'loop',inject:['systemPrompt'],apply(c){scope=createScope(c,agent);}});agent.ctx=scope.ctx;
  let dispose;const fiber=await h.plugin('producer',c=>c.on('agent/created',({agent})=>{dispose=agent.ctx.systemPrompt.context({name:'my-context',order:1,text:'unchanged'});}));
  await h.ctx.serial('agent/created',{agent});
  const raw=h.ctx.get('systemPrompt');const promise=raw.assemble({agent,scope:agent});assert.equal(promise,raw.lastPromise);await promise;
  const event=agent.session.append('user/message',{...message('runtime'),source:{kind:'runtime-context',sections:[{name:'my-context',text:'unchanged'}]}});
  assert.equal(h.collector.originFor('scoped',event).contributors[0].producer.name,'producer');
  await dispose();const absent=agent.session.append('user/message',{...message('runtime-2'),source:{kind:'runtime-context',sections:[{name:'my-context',text:'unchanged'}]}});
  assert.equal(h.collector.originFor('scoped',absent),undefined);
  await fiber.dispose();await scope.dispose();await h.close();
});

test('late listeners keep their original unsubscribe working during capture and after observer unload',async()=>{
  const ctx=new Context();let calls=0,release;
  const producer=await ctx.plugin({name:'existing',apply(c){release=c.on('late',()=>{calls++;});}});
  let collector;const observer=await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
  ctx.emit('late');assert.equal(calls,1);release();ctx.emit('late');assert.equal(calls,1);
  let after;await ctx.plugin({name:'new',apply(c){after=c.on('late',()=>{calls++;});}});
  await observer.dispose();ctx.emit('late');assert.equal(calls,2);after();ctx.emit('late');assert.equal(calls,2);
  assert.equal((ctx.events._hooks.late||[]).length,0);await producer.dispose();await ctx.fiber.dispose();
});

test('a producer unloading while the observer is waiting for teardown does not leak listeners',async()=>{
  const ctx=new Context();let openGate,entered;
  const gate=new Promise(r=>{openGate=r;}),started=new Promise(r=>{entered=r;});
  const producer=await ctx.plugin({name:'existing',apply(c){c.on('event',()=>{});}});
  const observer=await ctx.plugin({name:'dsh-context-lite',apply(c){const o=collectOrigins(c);c.effect(()=>()=>o.close());c.effect(()=>async()=>{entered();await gate;});}});
  const disposal=observer.dispose();await started;await producer.dispose();
  assert.equal((ctx.events._hooks.event||[]).length,0);openGate();await disposal;await ctx.fiber.dispose();
});

test('capture does not change an injected error or count a rejected call as an accepted message',async()=>{
  const h=await setup(),failure=Error('same failure'),agent=agentFor(h.ctx,'throws');
  agent.send=()=>{throw failure;};await h.ctx.serial('agent/created',{agent});
  await h.plugin('producer',c=>c.on('produce',()=>agent.inject(message('fail'))));
  await assert.rejects(h.ctx.serial('produce'),e=>e===failure);
  assert.deepEqual(h.collector.inspect('throws').events,{});await h.close();
});

test('metadata storage survives re-opening and never stores message contents; trim is explicit',async()=>{
  const rows=new Map(),table={get:id=>rows.get(id),put:async(id,value)=>{rows.set(id,value);}};
  const first=new OriginStore({maxRecords:2});first.attach(table);
  for(let seq=0;seq<3;seq++)first.record('session',seq,{producer:{type:'plugin',id:'p',name:'plugin'},method:'agent.inject',messageId:`m-${seq}`});
  await first.close();const second=new OriginStore({maxRecords:2});second.attach(table);
  assert.equal(second.originFor('session',2).producer.name,'plugin');assert.equal(second.originFor('session',0),undefined);
  assert.equal(second.inspect('session').dropped,1);await second.close();
});

test('disposing an agent restores its methods and leaves other agents observed',async()=>{
  const h=await setup(),a=agentFor(h.ctx,'gone'),b=agentFor(h.ctx,'live'),original=a.inject;
  await h.ctx.serial('agent/created',{agent:a});await h.ctx.serial('agent/created',{agent:b});assert.notEqual(a.inject,original);
  await h.ctx.serial('agent/disposed',{agent:a});assert.equal(a.inject,original);
  await h.plugin('producer',c=>c.on('produce',()=>b.inject(message('still-live'))));await h.ctx.serial('produce');b.admit();
  assert.equal(h.collector.originFor('live',b.session.events[1]).producer.name,'producer');await h.close();
});

test('scoped registrations do not leak to another agent with the same section name',async()=>{
  const h=await setup(),a=agentFor(h.ctx,'a'),b=agentFor(h.ctx,'b');let scope;
  await h.ctx.plugin({name:'loop',inject:['systemPrompt'],apply(c){scope=createScope(c,a);}});a.ctx=scope.ctx;
  await h.plugin('producer',c=>c.on('agent/created',({agent})=>{if(agent===a)agent.ctx.systemPrompt.context({name:'scoped-only',order:1,text:'x'});}));
  await h.ctx.serial('agent/created',{agent:a});await h.ctx.serial('agent/created',{agent:b});
  const e=b.session.append('user/message',{...message('runtime-b'),source:{kind:'runtime-context',sections:[{name:'scoped-only'}]}});
  assert.equal(h.collector.originFor('b',e),undefined);await scope.dispose();await h.close();
});

test('discovery failure cannot replace the original agent call or its result',async()=>{
  const h=await setup(),a=agentFor(h.ctx,'no-stack');await h.ctx.serial('agent/created',{agent:a});
  const before=Error.prepareStackTrace;Error.prepareStackTrace=()=>{throw Error('observer failure');};
  try{assert.equal(a.inject(message('preserved')),false);}finally{Error.prepareStackTrace=before;}
  a.admit();assert.equal(a.session.events[1].data.id,'preserved');assert.ok(h.collector.status().failures>0);await h.close();
});

test('persistent metadata session count is bounded independently of host session logs',async()=>{
 const rows=new Map(),table={get:id=>rows.get(id),put:async(id,v)=>rows.set(id,v),entries:()=>rows.entries(),delete:async id=>rows.delete(id)};
 const s=new OriginStore({maxSessions:2});s.attach(table);
 for(let i=0;i<4;i++)s.record(`s-${i}`,0,{producer:{type:'plugin',id:'p'},method:'agent.inject'});
 await s.flush();assert.equal(rows.size,2);assert.ok(rows.has('s-3'));assert.ok(!rows.has('s-0'));await s.close();
});

test('late startup inventories existing registrations once without executing providers or guessing owners',async()=>{
 const ctx=new Context();await ctx.plugin(Prompt);let calls=0;
 await ctx.plugin({name:'early',inject:['systemPrompt'],apply(c){c.systemPrompt.context({name:'early-context',order:1,text:()=>{calls++;return 'body';}});c.systemPrompt.section({name:'early-section',order:1,text:'body'});}});
 let collector;await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
 const agent=agentFor(ctx,'late-start');await ctx.serial('agent/created',{agent});
 for(let i=0;i<20;i++)ctx.get('systemPrompt');
 const e=agent.session.append('user/message',{...message('snapshot'),source:{kind:'runtime-context',sections:[{name:'early-context',text:'body'}]}});
 const c=collector.originFor('late-start',e).contributors[0];assert.equal(c.name,'early-context');assert.equal(c.evidence,'registry-snapshot');assert.equal(c.producer,undefined);
 assert.equal(collector.status().snapshotScans,1);assert.equal(collector.status().snapshotEntries,2);assert.equal(calls,0);
 assert.ok(!JSON.stringify(collector.inspect('late-start')).includes('body'));await ctx.fiber.dispose();
});

test('an unobserved scoped shadow never inherits the observed global registration owner',async()=>{
 const h=await setup(),agent=agentFor(h.ctx,'shadow');let scope;
 await h.plugin('global-producer',c=>c.get('systemPrompt').context({name:'same-name',order:1,text:'global'}));
 await h.ctx.plugin({name:'loop',inject:['systemPrompt'],apply(c){scope=createScope(c,agent);}});agent.ctx=scope.ctx;
 // Simulate a registration before observation / an entry point bypass.
 Prompt.prototype.context.call(agent.ctx.systemPrompt,{name:'same-name',order:1,text:'scoped'});
 await h.ctx.serial('agent/created',{agent});
 const e=agent.session.append('user/message',{...message('shadowed'),source:{kind:'runtime-context',sections:[{name:'same-name',text:'scoped'}]}});
 const c=h.collector.originFor('shadow',e).contributors[0];assert.equal(c.producer,undefined);assert.equal(c.evidence,'registry-snapshot');
 await scope.dispose();await h.close();
});
