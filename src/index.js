import { z } from 'zod';
import { buildAudit, overview, readDetail } from './audit.js';
import {collectOrigins} from './collector.js';

export const name='dsh-context-lite';
export const inject=[];
const apiServices=['connection','sessions','sessionQuery','sessionProjections'];
const provider=z.object({sessionId:z.string().min(1),kinds:z.array(z.string().min(1)).min(1),producer:z.object({type:z.enum(['script','plugin']),id:z.string().min(1),name:z.string().optional(),path:z.string().optional()}).strict(),method:z.enum(['agent.inject','agent.steer','agent.followup']).optional()}).strict();
const settings=z.object({collectOrigins:z.boolean().default(true),persistOrigins:z.boolean().default(true),maxOriginSessions:z.number().int().min(1).max(256).default(64),maxOriginRecords:z.number().int().min(10).max(10000).default(2000),sourceProviders:z.array(provider).default([]),maxCachedSessions:z.number().int().min(1).max(32).default(4),maxVisibleRounds:z.number().int().min(1).max(1000).default(120),detailPageSize:z.number().int().min(1).max(100).default(40),previewCharacters:z.number().int().min(1000).max(100000).default(12000)}).strict();
const querySchema=z.object({sessionId:z.string().min(1).max(512),beforeRound:z.coerce.number().int().positive().optional(),atSeq:z.coerce.number().int().nonnegative().optional(),kind:z.enum(['overview','detail','event','request','origins']).default('overview'),roundId:z.coerce.number().int().positive().optional(),segmentId:z.string().max(512).optional(),view:z.enum(['round','current']).default('round'),seq:z.coerce.number().int().nonnegative().optional(),offset:z.coerce.number().int().nonnegative().default(0),requestId:z.string().max(80).optional()}).strict();
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});

/** Source capture is independent of the sidebar and never writes model messages. */
export function apply(ctx,input={}) {
  const config=settings.parse(input);
  const collector=collectOrigins(ctx,{enabled:config.collectOrigins,maxSessions:config.maxOriginSessions,maxRecords:config.maxOriginRecords});
  ctx.effect(()=>()=>collector.close());
  if(typeof ctx.inject==='function'){
    ctx.inject(apiServices,c=>mountApi(c,config,collector));
    if(config.persistOrigins)ctx.inject(['storageDomain'],async c=>{
      let domain;
      try {
        const actor=z.object({type:z.string(),id:z.string(),name:z.string().optional()}).passthrough();
        const row=z.object({actors:z.record(z.string(),actor),events:z.record(z.string(),z.object({}).passthrough()),dropped:z.number(),updatedAt:z.number().optional()});
        domain=await c.storageDomain.open({name:'context_lite_origins',version:1,layout:'per-record',invalidRecords:'backup-and-skip',tables:{sessions:{valueSchema:row}}});
        collector.store.attach(domain.table('sessions'));
      }catch{collector.store.storageError=true;}
      return async()=>{await collector.store.flush();collector.store.table=null;await domain?.close();};
    });
    ctx.inject(['pluginManager'],async()=>{await collector.refreshCatalog();});
  }else mountApi(ctx,config,collector);
}
function mountApi(ctx,config,collector) {
  const cache=new Map(),pending=new Map(),lifetime=new AbortController();
  ctx.sessionProjections.register({key:'contextLite',stateVersion:1,stateSchema:z.number().int(),wire:{viewSchema:z.number().int(),view:s=>s},init:()=>-1,apply:(_state,event)=>event.seq});
  ctx.effect(()=>()=>{lifetime.abort();cache.clear();pending.clear();});
  const getAudit=async(sessionId,signal)=>{
    const observed=await ctx.sessionQuery.observeSession(sessionId,{projectionMode:'none',signal});
    try {
      signal.throwIfAborted();
      const cached=cache.get(sessionId);
      if(cached?.cursor===observed.cursor&&cached.originRevision===collector.store.revision) {cache.delete(sessionId);cache.set(sessionId,cached);return cached;}
      const audit=buildAudit(observed.header,observed.events,{...config,originFor:event=>collector.originFor(sessionId,event),projections:ctx.sessions.messageProjections,inheritedEventCount:observed.inheritedEventCount});
      const value={cursor:observed.cursor,originRevision:collector.store.revision,audit,events:observed.events};
      cache.delete(sessionId);cache.set(sessionId,value);
      while(cache.size>config.maxCachedSessions)cache.delete(cache.keys().next().value);
      return value;
    } finally {observed[Symbol.dispose]();}
  };
  ctx.effect(()=>ctx.connection.fetch.register({path:'/api/dsh-context-lite/audit',methods:['GET'],requestBody:'buffered',fetch:async request=>{
    const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if(!parsed.success)return json({ok:false,error:'查询参数不正确',errorKey:'errorInvalidQuery'},400);
    const query=parsed.data,signal=AbortSignal.any([request.signal,lifetime.signal]);
    // Share only same-session simultaneous reads. The originating request never owns another reader's cancellation.
    let task=pending.get(query.sessionId);
    if(!task){task=getAudit(query.sessionId,lifetime.signal);pending.set(query.sessionId,task);void task.finally(()=>{if(pending.get(query.sessionId)===task)pending.delete(query.sessionId);}).catch(()=>{});}
    try {
      const {audit,events}=await task;signal.throwIfAborted();
      if(query.kind==='origins')return json({ok:true,value:{sessionId:query.sessionId,...collector.inspect(query.sessionId)}});
      if(query.kind==='overview')return json({ok:true,value:{...overview(audit,query.beforeRound),version:typeof __DCL_VERSION__==='string'?__DCL_VERSION__:'0.2.2',collection:collector.status(),build:typeof __DCL_BUILD__==='string'?__DCL_BUILD__:'source'}});
      if(query.kind==='request') {
        const req=audit.requests.find(r=>r.id===query.requestId);
        if(!req)return json({ok:false,error:'请求记录不存在',errorKey:'errorRequestMissing'},404);
        return json({ok:true,value:req});
      }
      const value=readDetail(audit,events,{...query,seq:query.kind==='event'?query.seq:undefined,limit:config.detailPageSize,previewCharacters:config.previewCharacters});
      return value?json({ok:true,value}):json({ok:false,error:'来源记录不存在',errorKey:'errorSourceMissing'},404);
    } catch(error) {
      if(signal.aborted)return json({ok:false,error:'查询已取消',errorKey:'errorCancelled'},499);
      const missing=['SESSION_QUERY_SESSION_NOT_FOUND','SESSION_QUERY_EVENT_NOT_FOUND'].includes(error?.code);
      return json({ok:false,error:missing?'会话不存在或已移除':'日志无法完整重建；此会话的记录格式或来源解释器可能不受支持。',errorKey:missing?'errorSessionMissing':'errorReconstruction'},missing?404:422);
    }
  }}),'context-lite: authenticated audit read');
}
