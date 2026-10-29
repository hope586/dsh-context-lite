/** Display identity is separate from the producer's source tag and admission mechanism.
 * Native kinds below are owned by DSH. Other callers use observed runtime ownership,
 * then optional metadata or verified history mappings. Arbitrary tags are never guessed.
 */
const leaf = path => path?.split(/[\\/]/).filter(Boolean).at(-1);
const unique = values => [...new Set(values.filter(Boolean))];
const methods = {'agent.inject':'上下文注入','agent.steer':'中途引导','agent.followup':'会话输入','agent.send':'消息入队','inbox.append':'上下文入队','inbox.prepend':'上下文入队','inbox.splice':'上下文入队','inbox.replace':'队列内容替换','tool.result':'工具结果','section':'系统提示词注册','context':'运行环境上下文注册','tools.register':'工具注册'};
const clean = value => typeof value === 'string' ? value.slice(0,2048) : undefined;

export function describeSource(source = {}, {eventType, sessionId, providers = [], toolName, observed} = {}) {
  source=source||{};
  const identifiers = unique([clean(source.kind), clean(source.plugin)]);
  const contributors=observed?.contributors?.map(c=>({title:c.producer?`${c.producer.native?'DSH':c.producer.type==='script'?'脚本':'插件'} · ${c.producer.name||c.producer.id}`:'来源方未确认',...(c.producer?{id:c.producer.id,version:c.producer.version}:{}),name:c.name,api:c.method,evidence:c.evidence}));
  const result = (key,title,method,extra={}) => ({key,title,method,identifiers,...(contributors?.length?{contributors}:{}),...extra});
  if(source.kind==='user') return result('user','用户','会话输入 / 中途引导',{evidence:'native'});
  if(eventType==='assistant/message'||source.kind==='model') return result('model','模型','模型输出',{evidence:'native'});
  if(observed?.producer && source.kind!=='agent-instructions' && !['system-prompt','runtime-context','skill-catalog','time-context','compact-checkpoint','host-tools'].includes(source.kind)){
    const caller=observed.producer;
    return result(`${caller.type}:${caller.id}`,`${caller.native?'DSH':caller.type==='script'?'脚本':'插件'} · ${caller.name||caller.id}`,methods[observed.method]||'进入方式已记录',{callerType:caller.type,callerId:caller.id,file:caller.path,module:caller.module,version:caller.version,entryId:caller.entryId,api:observed.method,evidence:observed.evidence||'runtime',queuedSeq:observed.queuedSeq});
  }
  if(eventType==='tool/result') return result(`tool:${toolName||source.callId||'unknown'}`,toolName?`工具 · ${toolName}`:'工具','工具结果',{evidence:'native'});
  if(source.kind==='agent-instructions' && source.form==='instructions') {
    const files=unique((Array.isArray(source.changes)?source.changes:[]).map(c=>clean(c.path)));
    return result(`instructions:${JSON.stringify([...files].sort())}`,files.length?`指令文件 · ${unique(files.map(leaf)).slice(0,2).join(' / ')}${unique(files.map(leaf)).length>2?' 等':''}`:'指令文件','项目指令加载',{files,loader:'DSH · agent-instructions',evidence:'native'});
  }
  const native={
    'system-prompt':['DSH · 系统提示词','系统提示词组装'],
    'runtime-context':['DSH · 运行环境','运行环境快照'],
    'skill-catalog':['DSH · 技能目录','技能目录加载'],
    'time-context':['DSH · 时间上下文','时间快照'],
    'compact-checkpoint':['DSH · 上下文压缩','压缩替换'],
    'host-tools':['DSH · 工具定义','请求工具定义'],
  }[source.kind];
  if(native) return result(`native:${source.kind}`,...native,{evidence:'native'});
  // contextLite is an optional producer-owned extension, not an upstream DSH field.
  const declared=source.contextLite;
  const mapped=providers.find(p=>p.sessionId===sessionId&&p.kinds.includes(source.kind));
  const caller=declared?.producer || mapped?.producer;
  if(caller && ['script','plugin'].includes(caller.type) && clean(caller.id)) {
    const name=clean(caller.name)||leaf(clean(caller.path))||clean(caller.id);
    const api=clean(declared?.method || mapped?.method);
    return result(`${caller.type}:${caller.id}`,`${caller.type==='script'?'脚本':'插件'} · ${name}`,methods[api]||'进入方式未记录',{
      api,callerType:caller.type,callerId:clean(caller.id),file:clean(caller.path),
      evidence:declared?.producer?'producer-declared':'verified-session-mapping',
    });
  }
  return result(`unknown:${JSON.stringify(identifiers)}`,'来源方未记录','进入方式未记录',{evidence:'missing'});
}

export function sourceSubtitle(value) {
  if(!value)return '';
  return unique([value.method,...(value.identifiers||[])]).join(' · ');
}
