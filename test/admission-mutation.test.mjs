import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {SessionStore} from '@deepseek-ai/dsh-session';
import {collectOrigins} from '../src/collector.js';

// Producers own the message objects they pass into middleware and the host
// does not deep-freeze plugin-supplied messages while they travel. Admission
// fingerprints must therefore be recomputed at every observation: caching a
// fingerprint by object identity reuses stale hashes when a producer mutates
// content/source in place between observations, silently dropping or
// mis-assigning provenance. These regressions pin that behavior.
const mutable=(id,text)=>({id,role:'user',source:{kind:'mutable-producer'},content:[{type:'text',text}]});

async function setup(){
  const ctx=new Context();new SessionStore(ctx);let collector;
  await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
  const s=ctx.sessions.create('mutation-fixture'),agent={session:s};
  const plugin=(name,apply)=>ctx.plugin({name,apply(c){c.fiber.entry={id:name,options:{name:`synthetic-${name}`}};return apply(c);}});
  const preStep=(base=[])=>ctx.waterfall('agent/pre-step',{agent,messages:base},()=>Promise.resolve({kind:'enter',messages:base}));
  const admit=decision=>decision.messages.map(m=>s.append('user/message',m,{surfaceOp:'append'}));
  return {ctx,s,plugin,preStep,admit,get collector(){return collector;},close:()=>ctx.fiber.dispose()};
}

test('a middleware mutating a baseline message in place is attributed as its changing owner',async t=>{
  const h=await setup();t.after(()=>h.close());
  const message=mutable('in-place','original body');
  await h.plugin('mutator',c=>c.on('agent/pre-step',async(_p,next)=>{
    const decision=await next();
    message.content[0].text='rewritten body';   // same object, nested change
    return {...decision,messages:[...decision.messages,message]};
  }));
  const decision=await h.preStep([message]);
  const [event]=h.admit(decision);
  assert.equal(event.data.content[0].text,'rewritten body');
  const captured=h.collector.originFor(h.s.id,event);
  assert.equal(captured.producer.name,'mutator','the in-place change must not look unchanged against the baseline fingerprint');
  assert.equal(captured.method,'agent.pre-step');
});

test('one object reused and mutated across rounds keeps a fresh fingerprint per admission',async t=>{
  const h=await setup();t.after(()=>h.close());
  const shared=mutable('reused','turn one body');
  await h.plugin('producer',c=>c.on('agent/pre-step',async(_p,next)=>({...await next(),messages:[shared]})));
  const first=h.admit(await h.preStep());
  assert.equal(h.collector.originFor(h.s.id,first[0]).producer.name,'producer');
  h.s.append('turn/end',{turn:1,reason:{kind:'completed'}});
  shared.content[0].text='turn two body';
  shared.source.kind='mutable-producer-v2';
  const second=h.admit(await h.preStep());
  assert.equal(h.collector.originFor(h.s.id,second[0]).producer.name,'producer','round two must match its own fingerprint, not round one');
});

test('mutating a message between the decision and admission breaks identity instead of mis-attributing it',async t=>{
  const h=await setup();t.after(()=>h.close());
  // The host snapshots messages at admission, so the admitted event never
  // reuses the producer object; a late mutation must therefore surface as an
  // unattributed admission, never as the earlier producer's fingerprint.
  const message=mutable('late','original body');
  await h.plugin('producer',c=>c.on('agent/pre-step',async(_p,next)=>({...await next(),messages:[message]})));
  const decision=await h.preStep();
  message.content[0].text='rewritten after decision';
  const [event]=h.admit(decision);
  assert.equal(event.data.content[0].text,'rewritten after decision');
  assert.equal(h.collector.originFor(h.s.id,event),undefined);
  assert.equal(h.collector.status().failures,0);
});
