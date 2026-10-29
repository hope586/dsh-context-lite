import {label,labelText} from './i18n.js';
/** Presentation labels are additive metadata; stable identities remain locale independent. */
const leaf=path=>path?.split(/[\\/]/).filter(Boolean).at(-1);
const unique=values=>[...new Set(values.filter(Boolean))];
const methods={'agent.inject':'methodInject','agent.steer':'methodSteer','agent.followup':'methodFollowup','agent.send':'methodEnqueue','inbox.append':'methodInbox','inbox.prepend':'methodInbox','inbox.splice':'methodInbox','inbox.replace':'methodReplace','tool.result':'methodToolResult','section':'methodSection','context':'methodContext','tools.register':'methodTools'};
const clean=value=>typeof value==='string'?value.slice(0,2048):undefined;
const actorLabel=actor=>actor?.native?'sourceDsh':actor?.type==='script'?'sourceScript':'sourcePlugin';
export function describeSource(source={}, {eventType,sessionId,providers=[],toolName,observed}={}){
 source=source||{};
 const identifiers=unique([clean(source.kind),clean(source.plugin)]);
 const contributors=observed?.contributors?.map(c=>{
  const key=c.producer?actorLabel(c.producer):'sourceUnconfirmed',params=c.producer?{name:c.producer.name||c.producer.id}:undefined;
  return {title:labelText(key,params),titleLabel:label(key,params),...(c.producer?{id:c.producer.id,version:c.producer.version}:{}),name:c.name,api:c.method,evidence:c.evidence};
 });
 const result=(key,titleKey,methodKey,extra={},params)=>({key,title:labelText(titleKey,params),titleLabel:label(titleKey,params),method:labelText(methodKey),methodLabel:label(methodKey),identifiers,...(contributors?.length?{contributors}:{}),...extra});
 if(source.kind==='user')return result('user','sourceUser','methodInput',{evidence:'native'});
 if(eventType==='assistant/message'||source.kind==='model')return result('model','sourceModel','methodOutput',{evidence:'native'});
 if(observed?.producer&&source.kind!=='agent-instructions'&&!['system-prompt','runtime-context','skill-catalog','time-context','compact-checkpoint','host-tools'].includes(source.kind)){
  const c=observed.producer;
  return result(`${c.type}:${c.id}`,actorLabel(c),methods[observed.method]||'methodRecorded',{callerType:c.type,callerId:c.id,file:c.path,module:c.module,version:c.version,entryId:c.entryId,api:observed.method,evidence:observed.evidence||'runtime',queuedSeq:observed.queuedSeq},{name:c.name||c.id});
 }
 if(eventType==='tool/result')return result(`tool:${toolName||source.callId||'unknown'}`,toolName?'sourceTool':'sourceToolUnknown','methodToolResult',{evidence:'native'},{name:toolName});
 if(source.kind==='agent-instructions'&&source.form==='instructions'){
  const files=unique((Array.isArray(source.changes)?source.changes:[]).map(c=>clean(c.path))),names=unique(files.map(leaf));
  return result(`instructions:${JSON.stringify([...files].sort())}`,!files.length?'sourceInstructions':names.length>2?'sourceInstructionFilesMore':'sourceInstructionFiles','methodInstructions',{files,loader:'DSH · agent-instructions',evidence:'native'},{names:names.slice(0,2).join(' / ')});
 }
 const native={
  'system-prompt':['sourceSystem','methodSystem'],'runtime-context':['sourceRuntime','methodSnapshot'],
  'skill-catalog':['sourceSkills','methodSkills'],'time-context':['sourceTime','methodTime'],
  'compact-checkpoint':['sourceCompaction','methodCompaction'],'host-tools':['sourceTools','methodRequestTools'],
 }[source.kind];
 if(native)return result(`native:${source.kind}`,...native,{evidence:'native'});
 // Optional legacy extension. It is neither required nor an upstream DSH protocol.
 const declared=source.contextLite,mapped=providers.find(p=>p.sessionId===sessionId&&p.kinds.includes(source.kind)),caller=declared?.producer||mapped?.producer;
 if(caller&&['script','plugin'].includes(caller.type)&&clean(caller.id)){
  const name=clean(caller.name)||leaf(clean(caller.path))||clean(caller.id),api=clean(declared?.method||mapped?.method);
  return result(`${caller.type}:${caller.id}`,actorLabel(caller),methods[api]||'methodUnknown',{api,callerType:caller.type,callerId:clean(caller.id),file:clean(caller.path),evidence:declared?.producer?'producer-declared':'verified-session-mapping'},{name});
 }
 return result(`unknown:${JSON.stringify(identifiers)}`,'sourceUnknown','methodUnknown',{evidence:'missing'});
}
export function sourceSubtitle(value){return value?unique([value.method,...(value.identifiers||[])]).join(' · '):'';}
