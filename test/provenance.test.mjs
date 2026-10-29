import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSource} from '../src/provenance.js';
import {buildAudit,readDetail} from '../src/audit.js';

test('native instruction identity uses recorded paths; reading a similarly named file stays a tool result',()=>{
  const source={kind:'agent-instructions',form:'instructions',changes:[{path:'/project/CLAUDE.md',scope:'.',action:'set'}]};
  const p=describeSource(source);
  assert.equal(p.title,'指令文件 · CLAUDE.md');
  assert.equal(p.method,'项目指令加载');
  assert.deepEqual(p.files,['/project/CLAUDE.md']);
  assert.equal(describeSource({kind:'tool',path:'/project/CLAUDE.md'},{eventType:'tool/result',toolName:'fs_read'}).title,'工具 · fs_read');
  assert.equal(describeSource({kind:'arbitrary-tag',file:'CLAUDE.md'}).title,'来源方未记录');
});

test('caller, method and tag are independent; display renaming keeps stable identity',()=>{
  const source={kind:'acceptance-reader',plugin:'acceptance-reader',contextLite:{producer:{type:'script',id:'file:///test/source-plugin.mjs',path:'/test/source-plugin.mjs'},method:'agent.inject'}};
  const p=describeSource(source);
  assert.equal(p.title,'脚本 · source-plugin.mjs');
  assert.equal(p.method,'上下文注入');
  assert.deepEqual(p.identifiers,['acceptance-reader']);
  const renamed=structuredClone(source);renamed.contextLite.producer.name='另一个显示名称';
  assert.equal(describeSource(renamed).key,p.key);
  assert.equal(describeSource({...source,contextLite:{...source.contextLite,method:undefined}}).method,'进入方式未记录');
  assert.equal(describeSource({kind:'acceptance-reader',plugin:'acceptance-reader'}).title,'来源方未记录');
});

test('verified historical mapping is strictly scoped to its session and marks its evidence',()=>{
  const providers=[{sessionId:'test',kinds:['acceptance-reader'],producer:{type:'script',id:'file:///test/source-plugin.mjs',path:'/test/source-plugin.mjs'},method:'agent.inject'}];
  const p=describeSource({kind:'acceptance-reader'},{sessionId:'test',providers});
  assert.equal(p.title,'脚本 · source-plugin.mjs');
  assert.equal(p.evidence,'verified-session-mapping');
  assert.equal(describeSource({kind:'acceptance-reader'},{sessionId:'other',providers}).evidence,'missing');
});

test('caller metadata survives overview and source changes; adjacent callers never merge by display name',()=>{
  const events=[];const add=(type,data,extra={})=>events.push({seq:events.length,time:1,type,data,...extra});
  add('turn/start',{turn:1});
  for(const [id,tag] of [['p1','a'],['p1','b'],['p2','b']])add('user/message',{id:`${id}-${tag}`,role:'user',content:[{type:'text',text:tag}],source:{kind:tag,contextLite:{producer:{type:'plugin',id,name:'同名插件'},method:'agent.inject'}}},{surfaceOp:'append'});
  add('turn/end',{turn:1,reason:{kind:'completed'}});
  const audit=buildAudit({id:'test'},events),r=audit.rounds[0];
  assert.equal(r.segments.length,2);
  assert.deepEqual(r.segments[0].provenance.identifiers,['a','b']);
  assert.notEqual(r.segments[0].sourceKey,r.segments[1].sourceKey);
  assert.equal(r.changes.length,2);
  assert.equal(r.changes[0].title,'插件 · 同名插件');
  assert.equal(readDetail(audit,events,{seq:1}).provenance.callerId,'p1');
});

test('registry inventory remains visibly unresolved and survives normalized persistence',()=>{
 const p=describeSource({kind:'runtime-context'},{observed:{contributors:[{name:'early-context',method:'context',evidence:'registry-snapshot'}]}});
 assert.equal(p.contributors[0].title,'来源方未确认');assert.equal(p.contributors[0].id,undefined);assert.equal(p.contributors[0].evidence,'registry-snapshot');
});
