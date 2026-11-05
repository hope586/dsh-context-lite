import {AsyncLocalStorage} from 'node:async_hooks';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {OriginStore} from './origin-store.js';

const ORIGINAL=Symbol.for('cordis.original');
const untrace=value=>value?.[ORIGINAL]||value;
const text=value=>typeof value==='string'?value.slice(0,2048):undefined;
const packageName=value=>value?.startsWith('@')?value.split('/').slice(0,2).join('/'):value?.split('/')[0];
const display=value=>typeof value==='string'?value:value?.zh||value?.['zh-CN']||value?.en;
const own=(object,key)=>Object.getOwnPropertyDescriptor(object,key);
const surfaceTypes=new Set(['system/message','developer/message','user/message','assistant/message','tool/result']);
// Observe plain JSON without invoking producer getters. The host snapshots
// messages at admission, so object identity alone cannot link that boundary.
function messageStamp(message) {
  let size=0,nodes=0;const seen=new Set();
  const copy=(value,depth=0)=>{
    if(++nodes>20000||depth>64)throw Error('message observation limit');
    if(value===null||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string'){if((size+=value.length)>1024*1024)throw Error('message observation limit');return value;}
    if(typeof value!=='object'||seen.has(value))throw Error('non-JSON message');
    const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null&&!Array.isArray(value))throw Error('non-plain message');
    seen.add(value);const result=Array.isArray(value)?[]:Object.create(null);
    for(const key of Object.keys(value).sort()){
      const descriptor=own(value,key);if(!descriptor||!('value'in descriptor))throw Error('message accessor');
      if(descriptor.value!==undefined)result[key]=copy(descriptor.value,depth+1);
    }
    seen.delete(value);return result;
  };
  const value=copy(message);if(typeof value?.id!=='string'||!value.id)return;
  return {id:value.id,kind:text(value.source?.kind),hash:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}

/** Narrow version-tested adapters; all observation failures are contained. */
export function collectOrigins(ctx,{enabled=true,maxSessions=64,maxRecords=2000}={}) {
  const store=new OriginStore({maxSessions,maxRecords}),execution=new AsyncLocalStorage();
  const patches=[],listeners=new Set(),wrappedCallbacks=new WeakMap(),agentSet=new WeakSet(),sessionSet=new WeakSet();
  const registrations=new Set(),pending=new Map(),agents=new Map(),assemblies=new Map(),catalog=new Map();
  const services=new Map(),scanned=new WeakSet(),scannedSessionStores=new WeakSet();
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
  const caller=()=>currentActor()?.native?stackActor()||currentActor():currentActor()||stackActor();
  const watch=(value,observe)=>safe(()=>{
    if(value&&typeof value.then==='function')void value.then(v=>safe(()=>observe(v)),()=>{});
    else observe(value);
  });
  const stamp=message=>safe(()=>messageStamp(message));
  function rememberPending(sessionId,message,record) {
    const identity=stamp(message);if(!identity)return;
    const key=`${sessionId}:${identity.id}:${identity.hash}`,previous=pending.get(key);
    // ToolRuntime ferries additional context through the loop-owned inbox.
    // The transfer does not make the loop the author of that content.
    const transfer=previous?.toolHandoff&&record.queuedSeq!==undefined;
    pending.set(key,{...record,...(transfer?previous:{}),...(transfer?{queuedSeq:record.queuedSeq}:{}),sourceKind:identity.kind,messageHash:identity.hash});
    while(pending.size>4000)pending.delete(pending.keys().next().value);
  }
  function clearStepPending(sessionId) {
    for(const [key,value]of pending)if(value.method==='agent.pre-step'&&key.startsWith(`${sessionId}:`))pending.delete(key);
  }
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
    let byEvent=byContext.get(c);if(!byEvent){byEvent=new Map();byContext.set(c,byEvent);}
    if(byEvent.has(event))return byEvent.get(event);
    const wrapper=new Proxy(callback,{apply(target,thisArg,args){
      if(!active)return Reflect.apply(target,thisArg,args);
      safe(()=>{const agent=args[0]?.agent;if(agent)attachAgent(agent);});
      const state=execution.getStore(),owner=safe(()=>actorOf(c.fiber));
      return execution.run({...state,owner,event},()=>{
        const nextIndex=event==='tools/post-execute'?2:1;
        if(!['agent/pre-step','tools/post-execute','tools/execute'].includes(event)||typeof args[nextIndex]!=='function')return Reflect.apply(target,thisArg,args);
        const sessionId=args[0]?.agent?.session?.id,baseline=new Set();
        const messages=value=>event==='agent/pre-step'?value?.messages:value?.additionalContexts;
        const remember=value=>{for(const message of value||[]){const s=stamp(message);if(s)baseline.add(`${s.id}:${s.hash}`);}};
        safe(()=>remember(event==='agent/pre-step'?args[0]?.messages:event==='tools/post-execute'?args[1]?.additionalContexts:[]));
        const next=new Proxy(args[nextIndex],{apply(fn,self,values){const result=Reflect.apply(fn,self,values);watch(result,v=>remember(messages(v)));return result;}});
        const forwarded=[...args];forwarded[nextIndex]=next;
        const result=Reflect.apply(target,thisArg,forwarded);
        watch(result,decision=>{
          if(!active||!sessionId||!owner||event==='agent/pre-step'&&decision?.kind!=='enter')return;
          for(const message of messages(decision)||[]){const s=stamp(message);if(s&&!baseline.has(`${s.id}:${s.hash}`))rememberPending(sessionId,message,{producer:owner,method:event.replace('/','.'),evidence:'runtime',...(event==='agent/pre-step'?{}:{callId:text(args[0]?.callId),toolName:text(args[0]?.name)})});}
        });
        return result;
      });
    }});
    byEvent.set(event,wrapper);return wrapper;
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
    if(name==='sessions'&&!scannedSessionStores.has(raw))safe(()=>{scannedSessionStores.add(raw);for(const session of value.list().slice(0,4096))attachSession(session);});
  }
  function attachSession(session) {
    if(!session?.id||sessionSet.has(session))return;
    sessionSet.add(session);
    patch(session,'append',(fn,self,args)=>{
      if(!surfaceTypes.has(args[0]))return Reflect.apply(fn,self,args);
      const state=execution.getStore(),operation={active:true,sessionId:session.id,type:args[0],...origin(safe(()=>stackActor()||currentActor()),'session.append')};
      return execution.run({...state,appendOperation:operation},()=>{try{return Reflect.apply(fn,self,args);}finally{operation.active=false;}});
    });
  }
  function attachAgent(agent) {
    if(!agent?.session||agentSet.has(agent))return;
    agentSet.add(agent);agents.set(agent.session.id,agent);
    attachSession(agent.session);
    for(const method of ['inject','steer','followup','send'])patch(agent,method,(fn,self,args)=>{
      const prior=execution.getStore(),message=args[0];
      if(prior?.operation?.active&&prior.operation.message===message)return Reflect.apply(fn,self,args);
      const producer=safe(caller),operation={active:true,message,sessionId:agent.session.id,...origin(producer,`agent.${method}`)};
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
        rememberPending(id,msg,{producer:op.producer,method:op.method,evidence:op.evidence,queuedSeq:event.seq});
      }
      return;
    }
    const message=event.type==='user/message'?event.data:event.data?.message;
    let admitted;
    if(event.type==='user/message'&&message){
      const identity=stamp(message),key=identity&&`${id}:${identity.id}:${identity.hash}`,queued=key&&pending.get(key);
      if(queued){admitted=queued;store.record(id,event.seq,{...queued,messageId:identity.id});pending.delete(key);}
    }
    const appended=state?.appendOperation;
    if(!admitted&&surfaceTypes.has(event.type)&&appended?.active&&appended.sessionId===id&&appended.type===event.type&&appended.producer)
      store.record(id,event.seq,{producer:appended.producer,method:appended.method,evidence:appended.evidence,...(message?.id?{messageId:message.id}:{})});
    const scope=agents.get(id);
    if(event.type==='system/message'&&message?.source?.kind==='system-prompt'){
      const items=assemblies.get(id)||[];if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='user/message'&&message?.source?.kind==='runtime-context') {
      const items=contributors('contexts',(message.source.sections||[]).map(s=>s.name),scope);if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='request/header') {
      const items=contributors('tools',(event.data.header?.tools||[]).map(t=>t.name),scope);if(items.length)store.record(id,event.seq,{contributors:items});
    } else if(event.type==='tool/call') {
      const items=contributors('tools',[event.data.name],scope);if(items.length)store.record(id,event.seq,{contributors:items});
    }
    if(event.type==='turn/end')clearStepPending(id);
  }
  function toolContextResult(exec,result) {
    const sessionId=exec?.agent?.session?.id;if(!sessionId)return;
    const finalIdentities=new Set((result?.additionalContexts||[]).map(stamp).filter(Boolean).map(s=>`${sessionId}:${s.id}:${s.hash}`));
    for(const [key,value]of pending)if(key.startsWith(`${sessionId}:`)&&['tools.execute','tools.post-execute'].includes(value.method)&&value.callId===exec.callId&&!finalIdentities.has(key))pending.delete(key);
    for(const message of result?.additionalContexts||[]){
      const identity=stamp(message);if(!identity)continue;
      const previous=pending.get(`${sessionId}:${identity.id}:${identity.hash}`);
      // The final result proves the native transfer and call, not an unseen
      // body/deferContext author. Preserve exact observed middleware evidence.
      rememberPending(sessionId,message,{...(previous||{method:'tool.additional-context',evidence:'missing'}),toolHandoff:true,toolName:text(exec.name),callId:text(exec.callId)});
    }
  }
  if(enabled&&typeof ctx.on==='function'){
    // Observe after native registration. Do not call private register(), whose
    // key changed from a hook array to an event name in newer Cordis. Calling
    // the original on() exactly once also preserves other registration hooks.
    patch(ctx.events,'on',(fn,self,args)=>{
      const event=args[0];
      if(typeof event!=='string'||event.startsWith('internal/')||event.startsWith('loader/'))return Reflect.apply(fn,self,args);
      const previous=safe(()=>new Set(self._hooks?.[event]||[]));
      const result=Reflect.apply(fn,self,args);
      if(previous)safe(()=>{
        const hooks=self._hooks?.[event]||[];
        for(const record of hooks){
          if(previous.has(record))continue;
          const original=record.callback,wrapped=wrapListener(original,record.ctx,event);
          if(wrapped!==original){record.callback=wrapped;listeners.add({record,hooks,wrapped,callback:original});}
        }
      });
      return result;
    });
    // Existing callbacks retain their original disposer key. Replace only the
    // invoked callback field; the original disposer is translated on removal.
    for(const [event,hooks] of Object.entries(ctx.events._hooks||{}))for(const record of hooks){
      const before=record.callback,wrapped=wrapListener(before,record.ctx,event);if(wrapped===before)continue;
      record.callback=wrapped;listeners.add({record,hooks,wrapped,callback:before});lateListeners++;
    }
    ctx.on('internal/plugin',fiber=>{if(active)safe(()=>actorOf(fiber));},{global:true});
    ctx.on('internal/get',(c,name,error,next)=>{const value=next();if(active)safe(()=>instrument(name,value));return value;},{global:true});
    ctx.on('internal/dispatch',(mode,name,args)=>{if(active)safe(()=>{const agent=args[0]?.agent;if(agent)attachAgent(agent);if(name==='agent/pre-step'&&agent)clearStepPending(agent.session.id);if(name==='session/created')attachSession(args[0]);});},{global:true});
    ctx.on('session/created',session=>{if(active)safe(()=>attachSession(session));},{global:true,prepend:true});
    ctx.on('session/disposed',session=>{safe(()=>{restorePatches(p=>p.object===untrace(session));sessionSet.delete(session);for(const key of pending.keys())if(key.startsWith(`${session.id}:`))pending.delete(key);});},{global:true});
    ctx.on('session/event',(session,event)=>{if(active)safe(()=>eventReceived(session,event));},{global:true,prepend:true});
    ctx.on('tools/result',(exec,result)=>{if(active)safe(()=>toolContextResult(exec,result));},{global:true});
    ctx.on('agent/disposed',({agent})=>{safe(()=>{agents.delete(agent.session.id);assemblies.delete(agent.session.id);restorePatches(p=>p.object===untrace(agent)||p.object===untrace(agent.inbox));agentSet.delete(agent);for(const key of pending.keys())if(key.startsWith(`${agent.session.id}:`))pending.delete(key);});},{global:true});
    ctx.on('internal/status',fiber=>{if(fiber===ctx.fiber&&fiber.state===5)active=false;},{global:true});
    safe(()=>{for(const runtime of ctx.registry.values())for(const fiber of runtime.fibers)actorOf(fiber);});
    for(const name of ['systemPrompt','tools','agents','sessions'])safe(()=>instrument(name,get(name)));
    // Keep direct callback disposal compatible with wrappers registered above:
    // Cordis unregister deletes by callback identity, which must remain original.
    patch(untrace(ctx.events),'unregister',(fn,self,args)=>{
      const [key,callback]=args,hooks=Array.isArray(key)?key:self._hooks?.[key];
      const entry=[...listeners].find(r=>r.hooks===hooks&&r.callback===callback);
      if(entry){const result=Reflect.apply(fn,self,[key,entry.wrapped]);listeners.delete(entry);return result;}
      return Reflect.apply(fn,self,args);
    },true);
  }
  async function refreshCatalog() {
    const manager=get('pluginManager');if(!manager)return;
    try {const bundles=await manager.listBundles();for(const b of bundles)for(const row of b.rows||[])catalog.set(row.moduleName,{package:b.name,title:display(row.meta?.title)||display(b.meta?.title),version:b.version});}catch{failures++;}
  }
  const api={store,refreshCatalog,
    status:()=>({enabled:active,captureRunId:store.captureRunId,startedAt:store.startedAt,failures,scopeAdapter,lateListeners,registrations:registrationCount,liveRegistrations:registrations.size,snapshotScans,snapshotEntries,unresolvedRegistrations:[...registrations].filter(r=>!r.producer).length,observedCalls,revision:store.revision,persistence:store.table?'host-storage':'memory',storageError:store.storageError,retention:{maxSessions,maxEventRecordsPerSession:maxRecords,maxEvidenceRecordsPerSession:maxRecords,writeDebounceMs:100},coverage:'existing registry entries are inventoried; unobserved owners, removed history and bypassed calls may remain unknown'}),
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
