import {AsyncLocalStorage} from 'node:async_hooks';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {OriginStore} from './origin-store.js';

const ORIGINAL=Symbol.for('cordis.original');
const untrace=value=>value?.[ORIGINAL]||value;
const text=value=>typeof value==='string'?value.slice(0,2048):undefined;
const packageName=value=>value?.startsWith('@')?value.split('/').slice(0,2).join('/'):value?.split('/')[0];
const display=value=>typeof value==='string'?value:value?.zh||value?.['zh-CN']||value?.en;
const own=(object,key)=>Object.getOwnPropertyDescriptor(object,key);

/** Narrow version-tested adapters; all observation failures are contained. */
export function collectOrigins(ctx,{enabled=true,maxSessions=64,maxRecords=2000}={}) {
  const store=new OriginStore({maxSessions,maxRecords}),execution=new AsyncLocalStorage();
  const patches=[],listeners=new Set(),wrappedCallbacks=new WeakMap(),agentSet=new WeakSet();
  const registrations=new Set(),pending=new Map(),agents=new Map(),assemblies=new Map(),catalog=new Map();
  const services=new Map(),scanned=new WeakSet();
  let active=enabled,failures=0,lateListeners=0,registrationCount=0,observedCalls=0,snapshotScans=0,snapshotEntries=0;
  const entryActors=new Map();
  const safe=fn=>{try{return fn();}catch{failures++;return undefined;}};
  // Scope uses module-private Symbols and WeakMaps. Resolve the host's copy,
  // including when a local plugin checkout has its own development dependency.
  let scopeApi,scopeAdapter=ctx.baseUrl?'host':'local';
  try{const host=createRequire(ctx.baseUrl||import.meta.url);scopeApi=ctx.baseUrl?createRequire(host.resolve('@deepseek-ai/dsh-system-prompt'))('@deepseek-ai/dsh-scope'):host('@deepseek-ai/dsh-scope');}catch{scopeAdapter='unavailable';scopeApi={scopeOf:()=>undefined,scopeChainOf:()=>[]};failures++;}
  const scopeOf=c=>scopeApi.scopeOf(c),scopeChainOf=s=>scopeApi.scopeChainOf(s);
  const get=name=>safe(()=>ctx.get?.(name));
  const actorOf=fiber=>{
    if(!fiber)return undefined;
    let cursor=fiber,entry;
    for(let i=0;cursor&&i<40;i++){if(cursor.entry){entry=cursor.entry;break;}const next=cursor.parent?.fiber;if(next===cursor)break;cursor=next;}
    const moduleName=text(entry?.options?.name),name=text(fiber.name||fiber.runtime?.name);
    if(!moduleName||moduleName.startsWith('cordis:'))return undefined;
    if(moduleName=== 'dsh-context-lite'||name==='dsh-context-lite')return undefined;
    const script=moduleName&&(/^(?:file:|\/|[A-Za-z]:[\\/]|\.{1,2}\/)/.test(moduleName));
    if(script){const path=moduleName.startsWith('file:')?fileURLToPath(moduleName):moduleName;const actor={type:'script',id:moduleName,name:path.split(/[\\/]/).at(-1),path,entryId:entry?.id};entryActors.set(moduleName,{actor,file:path});return actor;}
    const meta=catalog.get(moduleName),id=meta?.package||packageName(moduleName)||name;
    const actor={type:'plugin',id,name:meta?.title||name||id,module:moduleName,version:meta?.version,entryId:entry?.id,native:!!moduleName?.startsWith('@deepseek-ai/')};
    if(moduleName&&!entryActors.has(moduleName)){let file;try{const base=entry.context?.baseUrl||ctx.baseUrl||import.meta.url;file=createRequire(base).resolve(moduleName);}catch{}entryActors.set(moduleName,{actor,file});}else if(moduleName)entryActors.get(moduleName).actor=actor;
    return actor;
  };
  const currentActor=()=>execution.getStore()?.owner;
  const stackActor=()=>{
    const stack=new Error().stack;if(typeof stack!=='string')return;
    for(const line of stack.split('\n').slice(1)){
      if(line.includes(fileURLToPath(import.meta.url))||line.includes('node:internal'))continue;
      const matches=[...entryActors.values()].filter(({file,actor})=>file?line.includes(file):actor.module&&line.includes(`/node_modules/${actor.module}/`));
      const unique=[...new Map(matches.map(x=>[`${x.actor.type}:${x.actor.id}`,x.actor])).values()];if(unique.length===1)return unique[0];
    }
  };
  const ownerFor=c=>{
    const fiber=c?.fiber,scope=scopeOf(c);
    // Agent/preset scopes are resource owners, not proof of who invoked them.
    return stackActor()||currentActor()||(!scope?actorOf(fiber):undefined);
  };
  const origin=(producer,method,evidence='runtime')=>producer?{producer,method,evidence}:undefined;
  function patch(object,key,around,duringTeardown=false) {
    object=untrace(object);if(!object)return;
    const before=own(object,key),original=object[key];
    if(typeof original!=='function'||patches.some(p=>p.object===object&&p.key===key))return;
    if(before&&(!('value' in before)||!before.configurable&&!before.writable))return;
    const wrapper=new Proxy(original,{apply(target,thisArg,args){if(!active&&!duringTeardown)return Reflect.apply(target,thisArg,args);return around(target,thisArg,args);}});
    Object.defineProperty(object,key,before?{...before,value:wrapper}:{value:wrapper,configurable:true,writable:true,enumerable:false});
    patches.push({object,key,before,wrapper});
  }
  function restorePatches(predicate) {
    for(let i=patches.length-1;i>=0;i--){const p=patches[i];if(!predicate(p))continue;
      const {object,key,before,wrapper}=p;
      if(own(object,key)?.value===wrapper){if(before)Object.defineProperty(object,key,before);else delete object[key];}
      patches.splice(i,1);
    }
  }
  function wrapListener(callback,c,event) {
    if(!c?.fiber||typeof event!=='string'||event.startsWith('internal/')||event.startsWith('loader/')||c.fiber===ctx.fiber)return callback;
    let byContext=wrappedCallbacks.get(callback);if(!byContext){byContext=new WeakMap();wrappedCallbacks.set(callback,byContext);}
    if(byContext.has(c))return byContext.get(c);
    const wrapper=new Proxy(callback,{apply(target,thisArg,args){
      if(!active)return Reflect.apply(target,thisArg,args);
      safe(()=>{const agent=args[0]?.agent;if(agent)attachAgent(agent);});
      const state=execution.getStore(),owner=safe(()=>actorOf(c.fiber));
      return execution.run({...state,owner,event},()=>Reflect.apply(target,thisArg,args));
    }});
    byContext.set(c,wrapper);return wrapper;
  }
  function inspectRegistrations(service,kind,method,target,thisArg,args,result) {
    if(scopeAdapter==='unavailable')return;
    if(typeof result!=='function'||!args[0]||typeof args[0]!=='object')return;
    const c=thisArg?.ctx,producer=ownerFor(c),definition=args[0];if(!c?.fiber||!definition.name)return;
    const record={service:untrace(thisArg),kind,name:text(definition.name),scope:scopeOf(c),definition:new WeakRef(definition),producer,method,evidence:'runtime-registration',fiber:new WeakRef(c.fiber)};
    remember(record);registrationCount++;
  }
  function remember(record,deduplicate=true) {
    if(deduplicate)for(const r of registrations)if(r.service===record.service&&r.kind===record.kind&&r.scope===record.scope&&r.definition.deref()===record.definition.deref())registrations.delete(r);
    registrations.add(record);
    if(registrations.size>4096)registrations.delete(registrations.values().next().value);
    return record;
  }
  function snapshotEntry(service,kind,scope,name,definition) {
    if(!definition||typeof definition!=='object')return;
    snapshotEntries++;
    return remember({service,kind,scope,name:text(name),definition:new WeakRef(definition),method:kind==='sections'?'section':kind==='contexts'?'context':'tools.register',evidence:'registry-snapshot'},false);
  }
  function scanExisting(service,kinds) {
    if(scanned.has(service)||!service.layers?.global)return;
    scanned.add(service);snapshotScans++;
    // One bounded, read-only inventory per service instance. Never call text,
    // execute, dispose, or any provider callback to discover its contents.
    const layers=function*(){yield [undefined,service.layers.global];if(service.layers.scoped instanceof Map)yield* service.layers.scoped.entries();};
    const known=new Map();
    for(const r of registrations)if(r.service===service){let names=known.get(r.scope);if(!names)known.set(r.scope,names=new Map());names.set(`${r.kind}:${r.name}`,r.definition.deref());}
    let count=0;
    for(const [scope,layer] of layers())for(const kind of kinds)for(const [name,definition] of layer[kind]?.entries?.()||[]){
      if(++count>4096)return;
      if(known.get(scope)?.get(`${kind}:${name}`)!==definition)snapshotEntry(service,kind,scope,name,definition);
    }
  }
  function matching(kind,name,scope) {
    if(scopeAdapter==='unavailable')return;
    const service=services.get(kind);if(!service?.layers)return;
    // Resolve the actual winning definition first. An unobserved scoped entry
    // must never inherit the known owner of a shadowed global entry.
    for(const key of [...scopeChainOf(scope),undefined]){
      const layer=key===undefined?service.layers.global:service.layers.peek?.(key),definition=layer?.[kind]?.get(name);
      if(!definition)continue;
      for(const r of registrations){if(r.service!==service||r.kind!==kind||r.name!==name||r.scope!==key)continue;
        const value=r.definition.deref(),fiber=r.fiber?.deref();
        if(!value||(r.fiber&&(!fiber||fiber.state>=3))||value!==definition){registrations.delete(r);continue;}
        return r;
      }
      return snapshotEntry(service,kind,key,name,definition);
    }
  }
  function contributors(kind,names,scope) {return names.flatMap(name=>{const r=matching(kind,name,scope);return r?[{...(r.producer?{producer:r.producer}:{}),method:r.method,name,evidence:r.evidence}]:[];});}
  function instrument(name,value) {
    const raw=untrace(value);if(!raw)return;
    if(name==='systemPrompt'){
      for(const kind of ['sections','contexts'])services.set(kind,raw);
      safe(()=>scanExisting(raw,['sections','contexts']));
      for(const [method,kind] of [['section','sections'],['context','contexts']])patch(raw,method,(fn,self,args)=>{const result=Reflect.apply(fn,self,args);safe(()=>inspectRegistrations(name,kind,method,fn,self,args,result));return result;});
      patch(raw,'assemble',(fn,self,args)=>{
        const result=Reflect.apply(fn,self,args),context=args[0];
        // Attach an observation branch; return the original Promise unchanged.
        safe(()=>{const observe=value=>safe(()=>{const agent=context?.agent;if(!agent?.session)return;attachAgent(agent);assemblies.set(agent.session.id,contributors('sections',(value.sections||[]).map(s=>s.name),context.scope));});if(result&&typeof result.then==='function')void result.then(observe,()=>{});else observe(result);});
        return result;
      });
    }
    if(name==='tools'){services.set('tools',raw);safe(()=>scanExisting(raw,['tools']));patch(raw,'register',(fn,self,args)=>{const result=Reflect.apply(fn,self,args);safe(()=>inspectRegistrations(name,'tools','tools.register',fn,self,args,result));return result;});}
    if(name==='agents')safe(()=>{for(const agent of value.list())attachAgent(agent);});
  }
  function attachAgent(agent) {
    if(!agent?.session||agentSet.has(agent))return;
    agentSet.add(agent);agents.set(agent.session.id,agent);
    for(const method of ['inject','steer','followup','send'])patch(agent,method,(fn,self,args)=>{
      const prior=execution.getStore(),message=args[0];
      if(prior?.operation?.active&&prior.operation.message===message)return Reflect.apply(fn,self,args);
      const producer=safe(()=>currentActor()?.native?stackActor()||currentActor():currentActor()||stackActor()),operation={active:true,message,sessionId:agent.session.id,...origin(producer,`agent.${method}`)};
      observedCalls++;
      return execution.run({...prior,operation},()=>{try{return Reflect.apply(fn,self,args);}finally{operation.active=false;}});
    });
    // Inbox calls can bypass Agent.send, so observe them separately.
    for(const method of ['append','prepend','splice','replace'])patch(agent.inbox,method,(fn,self,args)=>{
      const state=execution.getStore();if(state?.operation?.active)return Reflect.apply(fn,self,args);
      const operation={active:true,sessionId:agent.session.id,...origin(safe(()=>currentActor()||stackActor()),`inbox.${method}`)};return execution.run({...state,operation},()=>{try{return Reflect.apply(fn,self,args);}finally{operation.active=false;}});
    });
  }
  function eventReceived(session,event) {
    const id=session.id,state=execution.getStore(),op=state?.operation;
    if(event.type==='agent/inbox/spliced'){
      if(op?.active&&op.sessionId===id&&op.producer)for(const msg of event.data.inserted||[]){
        pending.set(`${id}:${msg.id}`,{producer:op.producer,method:op.method,evidence:op.evidence,queuedSeq:event.seq,sourceKind:text(msg.source?.kind)});
        while(pending.size>4000)pending.delete(pending.keys().next().value);
      }
      return;
    }
    const message=event.type==='user/message'?event.data:event.data?.message;
    if(event.type==='user/message'&&message){
      const key=`${id}:${message.id}`,queued=pending.get(key);
      if(queued&&queued.sourceKind===message.source?.kind){store.record(id,event.seq,{...queued,messageId:message.id});pending.delete(key);}
    }
    const scope=agents.get(id);
    if(event.type==='system/message'){
      const items=assemblies.get(id)||[];if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='user/message'&&message?.source?.kind==='runtime-context') {
      const items=contributors('contexts',(message.source.sections||[]).map(s=>s.name),scope);if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='request/header') {
      const items=contributors('tools',(event.data.header?.tools||[]).map(t=>t.name),scope);if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='tool/call') {
      const items=contributors('tools',[event.data.name],scope);if(items.length)store.record(id,event.seq,{contributors:items});
    }
  }
  if(enabled&&typeof ctx.on==='function'){
    const hook=ctx.on('internal/listener',function(event,callback,options){
      if(!active)return;
      let release;
      try {
        const wrapped=wrapListener(callback,this,event);if(wrapped===callback)return;
        const hooks=this.events._hooks[event]||=[];
        release=this.events.register(`context-lite ownership: ${event}`,hooks,callback,options);
        const record=[...hooks].reverse().find(r=>r.callback===callback);
        if(record){record.callback=wrapped;listeners.add({record,hooks,wrapped,callback});}
        return release;
      }catch{failures++;return release;}
    },{global:true});
    // Existing callbacks retain their original disposer key. Replace only the
    // invoked callback field; the original disposer is translated on removal.
    for(const [event,hooks] of Object.entries(ctx.events._hooks||{}))for(const record of hooks){
      const before=record.callback,wrapped=wrapListener(before,record.ctx,event);if(wrapped===before)continue;
      record.callback=wrapped;listeners.add({record,hooks,wrapped,callback:before});lateListeners++;
    }
    ctx.on('internal/plugin',fiber=>{if(active)safe(()=>actorOf(fiber));},{global:true});
    ctx.on('internal/get',(c,name,error,next)=>{const value=next();if(active)safe(()=>instrument(name,value));return value;},{global:true});
    ctx.on('internal/dispatch',(mode,name,args)=>{if(active)safe(()=>{const agent=args[0]?.agent;if(agent)attachAgent(agent);});},{global:true});
    ctx.on('session/event',(session,event)=>{if(active)safe(()=>eventReceived(session,event));},{global:true,prepend:true});
    ctx.on('agent/disposed',({agent})=>{safe(()=>{agents.delete(agent.session.id);assemblies.delete(agent.session.id);restorePatches(p=>p.object===untrace(agent)||p.object===untrace(agent.inbox));agentSet.delete(agent);for(const key of pending.keys())if(key.startsWith(`${agent.session.id}:`))pending.delete(key);});},{global:true});
    ctx.on('internal/status',fiber=>{if(fiber===ctx.fiber&&fiber.state===5)active=false;},{global:true});
    safe(()=>{for(const runtime of ctx.registry.values())for(const fiber of runtime.fibers)actorOf(fiber);});
    for(const name of ['systemPrompt','tools','agents'])safe(()=>instrument(name,get(name)));
    // Keep direct callback disposal compatible with wrappers registered above:
    // Cordis unregister deletes by callback identity, which must remain original.
    patch(untrace(ctx.events),'unregister',(fn,self,args)=>{
      const [hooks,callback]=args,entry=[...listeners].find(r=>r.hooks===hooks&&r.callback===callback);
      if(entry){const result=Reflect.apply(fn,self,[hooks,entry.wrapped]);listeners.delete(entry);return result;}
      return Reflect.apply(fn,self,args);
    },true);
    void hook;
  }
  async function refreshCatalog() {
    const manager=get('pluginManager');if(!manager)return;
    try {const bundles=await manager.listBundles();for(const b of bundles)for(const row of b.rows||[])catalog.set(row.moduleName,{package:b.name,title:display(row.meta?.title)||display(b.meta?.title),version:b.version});}catch{failures++;}
  }
  const api={store,refreshCatalog,
    status:()=>({enabled:active,failures,scopeAdapter,lateListeners,registrations:registrationCount,liveRegistrations:registrations.size,snapshotScans,snapshotEntries,unresolvedRegistrations:[...registrations].filter(r=>!r.producer).length,observedCalls,revision:store.revision,persistence:store.table?'host-storage':'memory',storageError:store.storageError,coverage:'existing registry entries are inventoried; unobserved owners, removed history and bypassed calls may remain unknown'}),
    inspect:sessionId=>({...store.inspect(sessionId),collection:api.status()}),
    originFor:(sessionId,event)=>{
      let value=store.originFor(sessionId,event.seq);
      
      return value;
    },
    close:async()=>{
      active=false;
      for(const row of listeners){if(row.record?.callback===row.wrapped)row.record.callback=row.callback;}
      restorePatches(()=>true);
      listeners.clear();registrations.clear();services.clear();pending.clear();agents.clear();assemblies.clear();catalog.clear();await store.close();
    },
  };
  return api;
}
