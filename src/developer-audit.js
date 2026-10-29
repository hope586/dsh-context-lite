import {createHash} from 'node:crypto';
import {SurfaceManager} from '@deepseek-ai/dsh-session/surface';
import {estimateMessage, estimateToolsTokens} from '@deepseek-ai/dsh-token-meter/estimate';
import {describeSource} from './provenance.js';

export const CONTRACT='dsh-context-audit';
export const SCHEMA_VERSION=1;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const messageOf=e=>e.type==='user/message'?e.data:e.data?.message;
const error=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
const ref=(audit,seq)=>({sessionId:audit.sessionId,formatVersion:audit.header.version??null,seq});

/** Only stable semantic fields cross the developer boundary; UI labels never do. */
function sourceOf(provenance,source,observed) {
  const p=provenance||describeSource(source,{observed});
  const fields=['key','callerType','callerId','api','evidence','files','loader','module','version','entryId','identifiers'];
  const value=Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
  if(source?.kind)value.kind=source.kind;
  if(observed?.producer)value.actor=observed.producer;
  else if(p.callerType&&p.callerId)value.actor=Object.fromEntries(Object.entries({type:p.callerType,id:p.callerId,version:p.version,module:p.module,path:p.file}).filter(([,v])=>v!==undefined));
  if(observed?.method||p.api)value.entryMethod=observed?.method||p.api;
  if(observed?.contributors)value.contributors=observed.contributors;
  else if(p.contributors)value.contributors=p.contributors.map(({title,titleLabel,...c})=>c);
  return value;
}

export function selectCut(audit,selector={}) {
  if(Object.keys(selector).filter(k=>selector[k]!==undefined).length>1)throw error('INVALID_SELECTOR','Use exactly one boundary selector.');
  if(selector.requestId!==undefined){
    const request=audit.requests.find(r=>r.id===selector.requestId);
    if(!request)throw error('REQUEST_NOT_FOUND','Logical request not found.',404);
    return {kind:'request-input',seq:request.settlementSeq-1,requestId:request.id,basis:request.basis,settlementRef:ref(audit,request.settlementSeq)};
  }
  if(selector.roundId!==undefined){
    const round=audit.rounds.find(r=>r.id===selector.roundId);
    if(!round)throw error('ROUND_NOT_FOUND','Round not found.',404);
    return {kind:round.endSeq===null?'round-progress':'round-end',seq:round.cutSeq,roundId:round.id,status:round.status,basis:'canonical-log-replay'};
  }
  const seq=selector.atSeq??audit.cursor;
  if(!Number.isSafeInteger(seq)||seq< -1||seq>audit.cursor)throw error('INVALID_CUT','Cut must be within the observed log.');
  return {kind:selector.atSeq===undefined?'current':'log-cut',seq,basis:'canonical-log-replay'};
}

function* relations(audit,events,cut) {
  for(const event of events){
    if(event.seq>cut)break;
    for(const seq of event.sourceEventSeqs||[])yield {kind:'derived-from',event:ref(audit,event.seq),source:ref(audit,seq)};
    if(typeof event.surfaceOp==='object')yield {kind:'replaces-range',event:ref(audit,event.seq),range:{start:ref(audit,event.surfaceOp.startSeq),end:ref(audit,event.surfaceOp.endSeq)}};
    if(event.type==='compaction/summary'||event.type==='compaction/prune')yield {kind:event.type==='compaction/summary'?'summary-covers':'prune-covers',event:ref(audit,event.seq),sources:(event.data.shadowedSeqs||[]).map(seq=>ref(audit,seq)),semanticRetentionVerified:false};
  }
}

function coverageFor(items,origins,collection,cut) {
  const unknown=items.filter(i=>i.source.evidence==='missing').map(i=>i.ref);
  const unconfirmed=items.filter(i=>i.source.contributors?.some(c=>!c.producer&&!c.id)).map(i=>i.ref);
  const retainedSeqs=Object.keys(origins.events||{}).map(Number).filter(seq=>seq<=cut);
  const evidence=origins.evidence||[];
  const evidenced=new Set(evidence.map(e=>e.seq));
  const legacy=retainedSeqs.filter(seq=>!evidenced.has(seq));
  const findings=['WIRE_REQUESTS_NOT_CAPTURED','REPLAY_USES_CURRENT_PROJECTIONS','SUMMARY_COVERAGE_IS_NOT_SEMANTIC_RETENTION','UNOBSERVED_CALLERS_NOT_RECOVERABLE'];
  if(!collection.enabled)findings.push('COLLECTOR_DISABLED');
  if(collection.failures)findings.push('COLLECTOR_FAILURES');
  if(collection.storageError)findings.push('ORIGIN_STORAGE_ERROR');
  if(collection.persistence!=='host-storage')findings.push('ORIGINS_MEMORY_ONLY');
  if(origins.dropped)findings.push('ORIGIN_RECORDS_TRIMMED');
  if(origins.droppedEvidence)findings.push('EVIDENCE_HISTORY_TRIMMED');
  if(legacy.length)findings.push('LEGACY_CAPTURE_TIME_UNKNOWN');
  if(unknown.length)findings.push('SOURCE_OWNER_UNKNOWN');
  if(unconfirmed.length)findings.push('REGISTERED_OWNER_UNCONFIRMED');
  return {
    contextBasis:'canonical-log-replay',wireRequestCapture:false,sourceOwnership:{unknown,unconfirmed},findings,
    collectorObservation:{...collection,appliesTo:'current collector process; not historical per-cut health'},
    retention:{policy:'bounded-metadata',hostLog:'host-managed',...collection.retention,eventRecordsDropped:origins.dropped||0,evidenceRecordsDropped:origins.droppedEvidence||0,retainedEventRecords:retainedSeqs.length,earliestRetainedSeq:retainedSeqs.length?Math.min(...retainedSeqs):null,legacyCaptureTimeUnknown:legacy.length,absenceMeaning:'not observed, not persisted, or evicted; absence does not prove no injection',sessionEvictionDetectable:false},
  };
}

/** One canonical replay at an explicit cut, separate from sidebar grouping. */
export function contextSnapshot(bundle,selector={}, {includeContent=false}={}) {
  const {audit,events,origins={events:{},actors:{}},collection={}}=bundle;
  const boundary=selectCut(audit,selector),prefix=events.slice(0,boundary.seq+1);
  const surface=new SurfaceManager(prefix,0,audit.projections||[]);
  const headerEvent=prefix.findLast(e=>e.type==='request/header');
  const requestContext=prefix.findLast(e=>e.type==='request/context')?.data||{};
  const round=audit.rounds.findLast(r=>r.startSeq<=boundary.seq);
  const measuringRound=round?.endSeq!==null&&round?.endSeq!==undefined&&prefix.some(e=>e.seq>round.endSeq&&(e.surfaceOp!==undefined||e.type==='request/header'))?null:round;
  const items=[];
  const tools=headerEvent?.data.header;
  if(estimateToolsTokens(tools)){
    const observed=origins.events?.[headerEvent.seq];
    items.push({id:`tools:${headerEvent.seq}`,ref:ref(audit,headerEvent.seq),eventType:'request/header',role:'tool-definitions',source:sourceOf(null,{kind:'host-tools'},expandOrigin(origins,observed)),representation:{kind:'tool-definitions',originRounds:[]},estimatedTokens:estimateToolsTokens(tools),contentHash:digest(tools.tools||[]),...(includeContent?{content:tools.tools||[]}:{} )});
  }
  for(const seq of surface.nodes){
    const event=prefix[seq],message=surface.deriveEventMessage(event);if(!message)continue;
    const record=audit.records.get(seq)||{},original=messageOf(event);
    const projected=digest({role:message.role,content:message.content})!==digest({role:original?.role,content:original?.content});
    const representation={kind:record.summarySeq!==undefined?'summary':typeof event.surfaceOp==='object'?'replacement':'original',projected,originRounds:record.originRounds||[],sources:(event.sourceEventSeqs||[]).map(n=>ref(audit,n)),...(record.summarySeq!==undefined?{summary:ref(audit,record.summarySeq),semanticRetentionVerified:false}:{})};
    items.push({id:`message:${seq}`,ref:ref(audit,seq),eventType:event.type,role:message.role,source:sourceOf(record.provenance,message.source,expandOrigin(origins,origins.events?.[seq])),representation,introducedInRound:record.round??null,inherited:seq<audit.inheritedEventCount,...(seq<audit.inheritedEventCount?{parentSessionId:audit.header.parentSession??null}:{}),estimatedTokens:estimateMessage(message),contentHash:digest({role:message.role,content:message.content}),...(includeContent?{content:message}:{})});
  }
  const estimatedTokens=items.reduce((n,i)=>n+i.estimatedTokens,0),window=requestContext.contextWindow??null;
  const bySource=new Map();
  for(const item of items){const key=item.source.key;bySource.set(key,(bySource.get(key)||0)+item.estimatedTokens);}
  const newlyRetained=items.filter(i=>i.role!=='tool-definitions'&&!['system','developer'].includes(i.role)&&i.representation.kind!=='summary'&&i.representation.originRounds.includes(measuringRound?.id)).reduce((n,i)=>n+i.estimatedTokens,0);
  return {
    contract:CONTRACT,schemaVersion:SCHEMA_VERSION,algorithmVersion:1,
    implementation:{pluginVersion:bundle.version??null,build:bundle.build??null,estimator:'bundled dsh-token-meter fixed estimator',projections:'current host callbacks at read time'},
    session:{id:audit.sessionId,formatVersion:audit.header.version??null,parentSessionId:audit.header.parentSession??null,inheritedEventCount:audit.inheritedEventCount},
    observation:{capturedThroughSeq:audit.cursor,originRevision:bundle.originRevision??null,captureRunId:collection.captureRunId??null,source:bundle.source??null,sourceRevision:bundle.sourceRevision??null,observedAt:bundle.observedAt??null},
    boundary,headerRef:headerEvent?ref(audit,headerEvent.seq):null,
    model:{provider:requestContext.provider||tools?.config?.provider||null,name:requestContext.model||tools?.config?.model||null},
    measurement:{basis:'dsh-fixed-estimate',estimatedTokens,contextWindowTokens:window,utilization:window>0?estimatedTokens/window:null,newlyRetainedThisRoundTokens:newlyRetained,roundId:measuringRound?.id??null,bySource:[...bySource].map(([key,tokens])=>({key,estimatedTokens:tokens})),attribution:'aggregate messages are not apportioned among contributors'},
    contentHash:digest(items.map(i=>({id:i.id,hash:i.contentHash}))),
    coverage:coverageFor(items,origins,collection,boundary.seq),
    items,relationships:[...relations(audit,events,boundary.seq)],
  };
}

function expandOrigin(origins,value) {
  if(!value)return undefined;
  const {actor,contributors,...rest}=value;
  return {...rest,...(actor?{producer:origins.actors?.[actor]}:{}),...(contributors?{contributors:contributors.map(({actor,...c})=>({...c,...(actor?{producer:origins.actors?.[actor]}:{})}))}:{})};
}

export function pageSnapshot(snapshot,offset=0,limit=200) {
  const {items,relationships,...manifest}=snapshot;
  return {...manifest,items:items.slice(offset,offset+limit),relationships:relationships.slice(offset,offset+limit),pagination:{offset,limit,itemCount:items.length,relationshipCount:relationships.length,more:offset+limit<Math.max(items.length,relationships.length)}};
}

export function contextDiff(bundle,fromSeq,toSeq) {
  if(fromSeq>toSeq)throw error('INVALID_RANGE','fromSeq must not exceed toSeq.');
  const from=contextSnapshot(bundle,{atSeq:fromSeq}),to=contextSnapshot(bundle,{atSeq:toSeq});
  const before=new Map(from.items.map(i=>[i.id,i])),after=new Map(to.items.map(i=>[i.id,i])),changes=[];
  for(const item of from.items)if(!after.has(item.id))changes.push({kind:'removed',before:item});
  for(const item of to.items){const old=before.get(item.id);if(!old)changes.push({kind:'added',after:item});else if(old.contentHash!==item.contentHash||digest(old.source)!==digest(item.source))changes.push({kind:'modified',before:old,after:item});}
  // Endpoint diffs alone miss injections subsequently replaced in this interval.
  const surfaceUpdates=bundle.events.filter(e=>e.seq>fromSeq&&e.seq<=toSeq&&(e.type==='request/header'||e.surfaceOp!==undefined&&bundle.audit.records.has(e.seq))).map(e=>({ref:ref(bundle.audit,e.seq),eventType:e.type,surfaceOp:e.surfaceOp??null,source:sourceOf(bundle.audit.records.get(e.seq)?.provenance,e.type==='request/header'?{kind:'host-tools'}:messageOf(e)?.source,expandOrigin(bundle.origins||{},bundle.origins?.events?.[e.seq])),retainedAtEnd:after.has(`${e.type==='request/header'?'tools':'message'}:${e.seq}`)}));
  return {contract:CONTRACT,schemaVersion:SCHEMA_VERSION,from:{boundary:from.boundary,contentHash:from.contentHash,measurement:from.measurement},to:{boundary:to.boundary,contentHash:to.contentHash,measurement:to.measurement},observation:to.observation,coverage:to.coverage,estimatedTokenDelta:to.measurement.estimatedTokens-from.measurement.estimatedTokens,counts:{added:changes.filter(c=>c.kind==='added').length,removed:changes.filter(c=>c.kind==='removed').length,modified:changes.filter(c=>c.kind==='modified').length},changes,surfaceUpdates,relationships:to.relationships.filter(r=>r.event.seq>fromSeq)};
}

/** Streaming export keeps a single observed log/evidence generation throughout. */
export function exportRecords(bundle,snapshot) {
  return function*(){
    const {items,relationships,...manifest}=snapshot;
    yield {recordType:'manifest',value:{...manifest,contentIncluded:items.some(i=>Object.hasOwn(i,'content')),eventContentIncluded:!!bundle.includeContent,evidenceHistory:'bounded observations; legacy rows have no invented capture time'}};
    for(const item of items)yield {recordType:'item',value:item};
    for(const relationship of relationships)yield {recordType:'relationship',value:relationship};
    const origins=bundle.origins||{};
    for(const entry of origins.evidence||[])if(entry.seq<=snapshot.boundary.seq)yield {recordType:'origin-evidence',value:{...entry,ref:ref(bundle.audit,entry.seq),record:expandOrigin(origins,entry.record)}};
    const evidenced=new Set((origins.evidence||[]).map(e=>e.seq));
    for(const [seq,record] of Object.entries(origins.events||{}))if(Number(seq)<=snapshot.boundary.seq&&!evidenced.has(Number(seq)))yield {recordType:'origin-evidence',value:{ref:ref(bundle.audit,Number(seq)),captureTimeKnown:false,record:expandOrigin(origins,record)}};
    for(const event of bundle.events){if(event.seq>snapshot.boundary.seq)break;const {data,...envelope}=event;yield {recordType:'event',value:{...envelope,ref:ref(bundle.audit,event.seq),...(bundle.includeContent?{data}:{})}};}
  };
}

export function exportResponse(records,{format='jsonl',maxBytes=32*1024*1024}={}) {
  // Preflight prevents a successful HTTP status with a silently truncated file.
  let bytes=2,count=0;
  for(const record of records()){bytes+=Buffer.byteLength(JSON.stringify(record))+2;count++;if(bytes+512>maxBytes)throw error('EXPORT_TOO_LARGE','Export exceeds maxExportBytes; choose an earlier cut or omit content.',413);}
  const encoder=new TextEncoder(),hash=createHash('sha256');let index=0;
  function* encode(){
    if(format==='json')yield '[';
    for(const record of records()){const line=JSON.stringify(record);hash.update(line+'\n');yield (format==='json'&&index++?',':'')+line+(format==='jsonl'?'\n':'');}
    const footer=JSON.stringify({recordType:'complete',value:{records:count,sha256:hash.digest('hex'),hashBasis:'preceding records serialized as JSON plus LF, UTF-8'}});
    yield (format==='json'&&count?',':'')+footer+(format==='jsonl'?'\n':']');
  }
  const iterator=encode();
  return new Response(new ReadableStream({pull(controller){const value=iterator.next();if(value.done)controller.close();else controller.enqueue(encoder.encode(value.value));},cancel(){iterator.return?.();}}),{headers:{'content-type':format==='json'?'application/json; charset=utf-8':'application/x-ndjson; charset=utf-8','content-disposition':`attachment; filename="context-audit.${format==='json'?'json':'jsonl'}"`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
}
