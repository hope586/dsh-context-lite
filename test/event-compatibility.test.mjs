import test from 'node:test';
import assert from 'node:assert/strict';
import {collectOrigins} from '../src/collector.js';

// Set this to an installed Host's module URL to run against its actual Cordis.
const {Context}=await import(process.env.DSH_TEST_CORDIS_URL||'@deepseek-ai/cordis');
async function fixture(){
  const ctx=new Context();let collector;
  const observer=await ctx.plugin({name:'dsh-context-lite',apply(c){collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
  return {ctx,observer,get collector(){return collector;}};
}

test('native boot injections keep their event name, order, arguments and disposers',async t=>{
  const h=await fixture();t.after(()=>h.ctx.fiber.dispose());let normal,first;
  await h.ctx.plugin({name:'boot-producer',apply(c){
    normal=c.on('webserver/index-inject',rows=>rows.push('loader'));
    first=c.on('webserver/index-inject',rows=>rows.push('theme'),{prepend:true});
  }});
  const rows=[];h.ctx.emit('webserver/index-inject',rows);assert.deepEqual(rows,['theme','loader']);
  first();const next=[];h.ctx.emit('webserver/index-inject',next);assert.deepEqual(next,['loader']);
  normal();const empty=[];h.ctx.emit('webserver/index-inject',empty);assert.deepEqual(empty,[]);
  assert.equal(h.collector.status().failures,0);
});

test('observer unload preserves producer removal and reused event names',async t=>{
  const h=await fixture();t.after(()=>h.ctx.fiber.dispose());let off,calls=0;
  const producer=await h.ctx.plugin({name:'producer',apply(c){off=c.on('event',()=>++calls);}});
  await h.observer.dispose();h.ctx.emit('event');assert.equal(calls,1);
  off();h.ctx.emit('event');assert.equal(calls,1);await producer.dispose();
  const second=await h.ctx.plugin({name:'second',apply(c){c.on('event',()=>++calls);}});
  h.ctx.emit('event');assert.equal(calls,2);await second.dispose();h.ctx.emit('event');assert.equal(calls,2);
  assert.equal((h.ctx.events._hooks.event||[]).length,0);
});

test('late listeners and producer-first teardown retain exact native lifecycle',async t=>{
  const ctx=new Context();t.after(()=>ctx.fiber.dispose());let off,calls=0;
  const producer=await ctx.plugin({name:'early',apply(c){off=c.on('event',()=>++calls);}});
  const observer=await ctx.plugin({name:'dsh-context-lite',apply(c){const collector=collectOrigins(c);c.effect(()=>()=>collector.close());}});
  ctx.emit('event');assert.equal(calls,1);off();ctx.emit('event');assert.equal(calls,1);
  const later=await ctx.plugin({name:'later',apply(c){c.on('event',()=>++calls);}});
  await later.dispose();ctx.emit('event');assert.equal(calls,1);
  await observer.dispose();await producer.dispose();assert.equal((ctx.events._hooks.event||[]).length,0);
});

test('middleware keeps promise and error identity with native admission attribution',async t=>{
  const h=await fixture();t.after(()=>h.ctx.fiber.dispose());const events=[];
  const session={id:'compat-session',append(type,data){const event={seq:events.length,type,data};events.push(event);h.ctx.emit('session/event',this,event);return event;}};
  const agent={session};const message={id:'message',role:'user',source:{kind:'fixture'},content:[{type:'text',text:'fixture'}]};
  let promise;const failure=Error('original error');
  await h.ctx.plugin({name:'producer',apply(c){
    c.fiber.entry={id:'producer',options:{name:'compat-producer'}};
    c.on('agent/pre-step',(_input,next)=>promise=next().then(d=>({...d,messages:[...d.messages,message]})));
    c.on('failing-event',()=>{throw failure;});
  }});
  const result=h.ctx.waterfall('agent/pre-step',{agent,messages:[]},()=>Promise.resolve({kind:'enter',messages:[]}));
  assert.equal(result,promise);const decision=await result;assert.equal(decision.messages[0],message);
  const event=session.append('user/message',message);
  assert.equal(h.collector.originFor(session.id,event).producer.name,'producer');
  await assert.rejects(h.ctx.serial('failing-event'),error=>error===failure);
});

test('other registration hooks run once and keep their rejection behavior',async t=>{
  const h=await fixture();t.after(()=>h.ctx.fiber.dispose());let registrations=0,producer;
  const failure=Error('registration refused');
  h.ctx.on('internal/listener',name=>{
    if(name==='allowed')registrations++;
    if(name==='refused')throw failure;
  },{global:true});
  await h.ctx.plugin({name:'producer',apply(c){producer=c;}});
  const off=producer.on('allowed',()=>{});assert.equal(registrations,1);
  assert.throws(()=>producer.on('refused',()=>{}),error=>error===failure);
  assert.equal((h.ctx.events._hooks.refused||[]).length,0);off();
});
