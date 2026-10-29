import { SurfaceManager } from '@deepseek-ai/dsh-session/surface';
import { estimateMessage, estimateToolsTokens } from '@deepseek-ai/dsh-token-meter/estimate';
import {describeSource} from './provenance.js';

/** Model-facing text only; unknown blocks remain inspectable as structured content. */
export function textOf(content) {
  return (Array.isArray(content) ? content : []).map(b => typeof b.text === 'string' ? b.text : `[${b.type || 'unknown'}]`).join('\n');
}
const messageOf = e => e.type === 'user/message' ? e.data : e.data?.message;
const slimSource = source => Object.fromEntries(Object.entries(source || {}).filter(([k,v]) => ['kind','plugin','form','path','file','url','windowId','windowTitle','sessionId','senderSessionId','batchId'].includes(k) && ['string','number'].includes(typeof v)));
const roundStatus = reason => reason?.kind === 'aborted' && reason.reason?.kind === 'user' ? 'interrupted' : reason?.kind === 'completed' ? 'completed' : reason?.kind==='aborted'?'cancelled':reason?.kind==='interrupted'?'recovered':reason?.kind || 'unknown';

/** Replay the canonical surface once. Results contain references and estimates, never a second body store. */
export function buildAudit(header, events, { maxVisibleRounds = 120, projections = [], inheritedEventCount = 0, sourceProviders = [], originFor = () => undefined } = {}) {
  const log = [], surface = new SurfaceManager(log, 0, projections);
  const records = new Map(), summaries = new Map(), calls = new Map(), rounds = [], requests = [];
  let epoch, epochSeq = null, context = {}, active = null, previousTotal = 0, phase = null;
  const summaryFor = event => event.type==='user/message' && event.data.source?.kind==='compact-checkpoint' && typeof event.surfaceOp==='object' ? (event.sourceEventSeqs||[]).map(seq=>summaries.get(seq)).find(Boolean) : undefined;
  const metaFor = event => {
    const msg = messageOf(event), summary = summaryFor(event);
    let observed=originFor(event);
    if(event.type==='tool/result'){const call=calls.get(msg?.source?.callId),registered=call&&originFor(call);if(registered?.contributors?.length===1)observed={...registered,...(registered.contributors[0].producer?{producer:registered.contributors[0].producer}:{}),method:'tool.result',evidence:registered.contributors[0].evidence||'runtime-registration'};}
    const originals = (event.sourceEventSeqs || []).map(seq => records.get(seq)).filter(Boolean);
    const originRounds = summary ? [...new Set(summary.shadowedSeqs.flatMap(seq => records.get(seq)?.originRounds || []))] : originals.length ? [...new Set(originals.flatMap(r => r.originRounds))] : active ? [active.id] : [];
    return { seq:event.seq, time:event.time, type:event.type, round:active?.id ?? null, originRounds,
      source:slimSource(msg?.source),provenance:describeSource(msg?.source,{eventType:event.type,sessionId:header.id,providers:sourceProviders,observed,toolName:calls.get(msg?.source?.callId)?.data.name}),sessionId:header.id,inherited:event.seq<inheritedEventCount,...(event.seq<inheritedEventCount&&header.parentSession?{parentSession:header.parentSession}:{}), ...(summary ? {summarySeq:summary.seq,summaryId:summary.compactionId} : {}),
      phase:msg?.source?.batchId || phase, replacement:typeof event.surfaceOp === 'object',...(typeof event.surfaceOp==='object'&&log[event.seq-1]?.type==='compaction/prune'?{prunedBySeq:event.seq-1}:{}),
      ...(event.type === 'tool/result' ? {callId:msg?.source?.callId} : {}) };
  };
  const snapshot = (round, cutSeq) => {
    const nodes = surface.nodes.map(seq => {
      const event = log[seq], message = surface.deriveEventMessage(event);
      if (!message) return null;
      return { ...records.get(seq), tokens:estimateMessage(message) };
    }).filter(Boolean).filter(n => n.tokens > 0);
    const lastAssistant = [...nodes].reverse().find(n => n.type === 'assistant/message' && n.round === round?.id);
    const lastMessage = lastAssistant && surface.deriveEventMessage(log[lastAssistant.seq]);
    const finalSeq = round?.status === 'completed' && lastMessage && !(lastMessage.content || []).some(b => b.type === 'tool_use' || b.type === 'tool_call') && !log[lastAssistant.seq].data.interrupted ? lastAssistant.seq : null;
    const segments = [];
    const tools = estimateToolsTokens(epoch);
    if (tools) segments.push({id:`tools-${epochSeq}`,type:'base',sourceKey:'host-tools',title:'DSH · 工具定义',provenance:describeSource({kind:'host-tools'},{observed:log[epochSeq]&&originFor(log[epochSeq])}),tokens:tools,refs:[],headerSeq:epochSeq});
    for (const node of nodes) {
      let type, title, key;
      if (node.type === 'system/message' || node.type === 'developer/message') { type='base';title='宿主基础上下文';key='host'; }
      else if (node.summarySeq !== undefined) {type='summary';title='历史压缩信息';key=`summary:${node.summaryId}`;}
      else if (!node.originRounds.includes(round?.id)) {type='history';title='历史未压缩信息';key='history';}
      else if (node.type === 'user/message' && node.source.kind === 'user') {type='prompt';title=node.seq === round?.promptSeq ? '用户 · 本轮输入' : '用户 · 中途引导';key='user';}
      else if (node.type === 'assistant/message' && node.seq === finalSeq) {type='final';title='汇报';key='final';}
      else if (node.type === 'assistant/message' || node.type === 'tool/result') {type='work';title='模型工作上下文';key='work';}
      else {type='plugin';title=node.provenance.title;key=node.provenance.key;}
      const provenance=type==='work'?{key:'work',title:'模型工作上下文',method:'模型输出与工具结果',identifiers:[]}:type==='history'?{key:'history',title,method:'历史原文沿用',identifiers:[]}:node.provenance;
      const isNew = !['base','summary','history'].includes(type) && node.originRounds.includes(round?.id);
      const last = segments.at(-1);
      // Only adjacent equal producers in one admitted phase merge. Work is a continuous run until another source intervenes.
      const merge = last && last.sourceKey === key && last.type === type && (type === 'work' || type === 'history' || (last.phase === node.phase && type !== 'summary'));
      if (merge) {last.provenance={...last.provenance,identifiers:[...new Set([...(last.provenance?.identifiers||[]),...(provenance?.identifiers||[])])]};last.refs.push(node);last.tokens+=node.tokens;last.added+=(isNew?node.tokens:0);}
      else segments.push({id:`node-${node.seq}`,type,title,provenance,sourceKey:key,phase:node.phase,tokens:node.tokens,added:isNew?node.tokens:0,refs:[node]});
    }
    const pluginNode=n=>n.type==='user/message' && n.source.kind!=='user' && n.summarySeq===undefined;
    const identities=new Map();
    for(const n of [...(round?.baseline||[]).map(seq=>records.get(seq)).filter(Boolean),...nodes,...[...records.values()].filter(n=>n.round===round?.id)]){if(!pluginNode(n))continue;const key=n.provenance.key;if(!identities.has(key))identities.set(key,{provenance:n.provenance,seqs:[]});const item=identities.get(key);item.seqs.push(n.seq);item.provenance={...item.provenance,identifiers:[...new Set([...item.provenance.identifiers,...n.provenance.identifiers])]};}
    const retainedSet=new Set(nodes.map(n=>n.seq)),baseline=new Set(round?.baseline||[]);
    const changes=[...identities].map(([source,{provenance,seqs}])=>{const ids=[...new Set(seqs)];return {source,title:provenance.title,provenance,added:ids.filter(seq=>retainedSet.has(seq)&&!baseline.has(seq)),removed:ids.filter(seq=>baseline.has(seq)&&!retainedSet.has(seq)),retained:ids.filter(seq=>baseline.has(seq)&&retainedSet.has(seq)),transient:ids.filter(seq=>!baseline.has(seq)&&!retainedSet.has(seq))};});
    const total=segments.reduce((n,s)=>n+s.tokens,0),added=segments.reduce((n,s)=>n+(s.added||0),0);
    return { cutSeq,total,added,changes,capacity:context.contextWindow ?? null,provider:context.provider || epoch?.config?.provider || null,model:context.model || epoch?.config?.model || null,headerSeq:epochSeq,segments };
  };
  for (const event of events) {
    if (event.seq !== log.length) throw new Error('日志序号不连续，无法重建上下文');
    if (event.type === 'turn/start') {
      if (active) {active.status='unknown';Object.assign(active,snapshot(active,event.seq-1));previousTotal=active.total;}
      active={id:rounds.length+1,hostTurn:event.data.turn,startSeq:event.seq,endSeq:null,time:event.time,title:'本轮工作',promptSeq:null,status:'running',requests:[],baseline:[...surface.nodes]};
      rounds.push(active);
    }
    if (event.type === 'step/start') phase=`${event.data.turn}:${event.data.step}`;
    if (event.type === 'request/header') {epoch=event.data.header;epochSeq=event.seq;}
    if (event.type === 'request/context') context=event.data;
    if (event.type === 'tool/call') calls.set(event.data.callId,event);
    if (event.type === 'compaction/summary') summaries.set(event.seq,{seq:event.seq,...event.data});
    if (event.type === 'user/message' && event.data.source?.kind === 'user' && active?.promptSeq === null && event.surfaceOp === 'append') {
      active.promptSeq=event.seq;active.title=textOf(event.data.content).replace(/\s+/g,' ').slice(0,70) || '图片或附件输入';
    }
    if (event.type === 'assistant/message' || event.type === 'assistant/attempt') {
      const input=snapshot(active,event.seq-1);
      const req={id:`request-${event.seq}`,settlementSeq:event.seq,turn:event.data.turn,step:event.data.step,status:event.type==='assistant/attempt'?'attempt':event.data.interrupted?'interrupted':'response',inputTotal:input.total,inputSegments:input.segments,inputSeqs:input.segments.flatMap(s=>s.refs.map(n=>n.seq)),headerSeq:epochSeq,usage:event.data.usage || null,basis:'settlement-prefix'};
      requests.push(req);active?.requests.push(req);
    }
    log.push(event);
    if (['system/message','developer/message','user/message','assistant/message','tool/result'].includes(event.type)) records.set(event.seq,metaFor(event));
    // Canonical helper applies positional replacements and registered message projections, including image offload.
    void surface.nodes;
    if (event.type === 'turn/end' && active) {
      active.status=roundStatus(event.data.reason);active.reason=event.data.reason;active.endSeq=event.seq;
      Object.assign(active,snapshot(active,event.seq));active.delta=active.total-previousTotal;previousTotal=active.total;active=null;
    }
  }
  if (active) {Object.assign(active,snapshot(active,events.at(-1)?.seq ?? -1));active.delta=active.total-previousTotal;}
  const visible=rounds.slice(-maxVisibleRounds);
  const last=rounds.at(-1);
  const between=last && last.endSeq!==null && events.some(e=>e.seq>last.endSeq&&(e.surfaceOp!==undefined||e.type==='request/header'));
  const current=last&&between?{...last,...snapshot(last,events.at(-1).seq),isCurrent:true,title:'轮间上下文更新',delta:0}:null;
  if(current){current.delta=current.total-last.total;current.added=0;}
  return {sessionId:header.id,cursor:events.at(-1)?.seq ?? -1,rounds,current,projections,inheritedEventCount,maxVisibleRounds,hiddenRounds:rounds.length-visible.length,records,summaries,calls,requests,header,
    limits:['分项与窗口大小采用 DSH 固定估算，不是提供方账单。','请求详情按响应/尝试结算前日志重建；宿主未持久记录每次适配后的线缆请求及所有内部重试。','摘要来源覆盖不证明其中每个细节仍被保留；外部窗口身份仅在来源有记录时显示。']};
}

/** The small client payload has no raw messages or provider replay data. */
export function overview(audit, beforeRound) {
  const candidates=beforeRound?audit.rounds.filter(r=>r.id<beforeRound):audit.rounds;
  const page=candidates.slice(-(audit.maxVisibleRounds||120));
  return {schemaVersion:1,current:audit.current?{...audit.current,baseline:undefined,requests:[]}:null,sessionId:audit.sessionId,cursor:audit.cursor,hiddenRounds:candidates.length-page.length,limits:audit.limits,rounds:page.map(({baseline,...r})=>({...r,requests:r.requests.map(q=>({id:q.id,settlementSeq:q.settlementSeq,turn:q.turn,step:q.step,status:q.status,inputTotal:q.inputTotal,usage:q.usage,basis:q.basis})),segments:r.segments.map(s=>({...s,refs:s.refs.map(n=>({...n,source:n.source}))}))}))};
}

/** Page an exact round's retained nodes; referenced earlier source events can be read separately. */
export function readDetail(audit, events, {roundId,segmentId,offset=0,limit=40,previewCharacters=12000,seq,view='round',projected,atSeq}) {
  if (seq !== undefined) {
    const event=events[seq];
    if(!event) return null;
    if(atSeq!==undefined&&seq>atSeq)return null;
    const effective=atSeq===undefined?null:new SurfaceManager(events.slice(0,atSeq+1),0,audit.projections||[]).deriveEventMessage(event);
    const msg=projected||effective||messageOf(event);
    const text=msg?textOf(msg.content):event.type==='compaction/summary'?textOf(event.data.summary):event.type==='request/header'?JSON.stringify(event.data.header.tools||[],null,2):JSON.stringify(event.data,null,2);
    return {seq:event.seq,time:event.time,type:event.type,sessionId:audit.sessionId,parentSession:seq<audit.inheritedEventCount?audit.header.parentSession??null:null,bodyBasis:projected||effective?'projected-at-cut':'original-event',prunedBySeq:audit.records.get(seq)?.prunedBySeq??null,attachmentRefs:(msg?.content||[]).filter(b=>b.type!=='text').map(b=>({type:b.type,reference:JSON.stringify(b,(_k,v)=>typeof v==='string'&&v.length>2000?v.slice(0,2000)+'…（引用预览截断）':v)})),source:msg?.source || null,provenance:audit.records.get(seq)?.provenance||describeSource(msg?.source,{eventType:event.type,toolName:audit.calls.get(msg?.source?.callId)?.data.name}),sourceEventSeqs:event.sourceEventSeqs || [],surfaceOp:event.surfaceOp || null,text:text.slice(offset,offset+previewCharacters),textOffset:offset,textLength:text.length,moreText:offset+previewCharacters<text.length,
      ...(event.type==='compaction/summary'?{compaction:{...event.data,summary:undefined,rawOutput:undefined},auxiliaryInput:{systemSeqs:new SurfaceManager(events.slice(0,seq),0,audit.projections||[]).nodes.filter(n=>events[n].type==='system/message').slice(0,1),toolsHeaderSeq:events.slice(0,seq).findLast(e=>e.type==='request/header')?.seq??null,sourceSeqs:event.data.shadowedSeqs,exactTemplateRecorded:false,note:'源消息集合可核对；摘要指令模板未完整持久记录，不能声称这是完整的摘要调用输入。'}}:{}),
      ...(event.type==='tool/result'?{toolCall:audit.calls.get(msg?.source?.callId)?.data || null}:{}),
      ...(event.type==='assistant/attempt'?{note:'该尝试没有生成保留消息，不计入上下文组成。'}:{})};
  }
  const round=view==='current'?audit.current:audit.rounds.find(r=>r.id===roundId),segment=round?.segments.find(s=>s.id===segmentId);
  if(!segment)return null;
  if(segment.headerSeq!==undefined) {
    const tools=events[segment.headerSeq]?.data.header.tools || [];
    const text=JSON.stringify(tools,null,2);
    return {segment,items:[{seq:segment.headerSeq,type:'request/header',text:text.slice(offset,offset+previewCharacters),textLength:text.length,textOffset:offset,moreText:offset+previewCharacters<text.length,source:{kind:'host-tools'},provenance:describeSource({kind:'host-tools'}),sourceEventSeqs:[]}],more:false,total:tools.length};
  }
  const prefix=events.slice(0,round.cutSeq+1),canonical=new SurfaceManager(prefix,0,audit.projections||[]);
  return {segment,items:segment.refs.slice(offset,offset+limit).map(ref=>({...readDetail(audit,events,{seq:ref.seq,previewCharacters,projected:canonical.deriveEventMessage(events[ref.seq])}),originRounds:ref.originRounds,summarySeq:ref.summarySeq ?? null})),offset,total:segment.refs.length,more:offset+limit<segment.refs.length};
}
