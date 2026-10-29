import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {zh,en,translator,localized,errorText} from '../src/i18n.js';
import {describeSource} from '../src/provenance.js';
import {buildAudit,overview,readDetail} from '../src/audit.js';
const english=translator('en'),chinese=translator('zh-CN');
const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();

test('English and Chinese dictionaries have matching keys/placeholders and English UI copy has no Chinese',()=>{
 assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
 for(const key of Object.keys(zh)){assert.deepEqual(placeholders(en[key]),placeholders(zh[key]),key);assert.ok(!/[\u3400-\u9fff]/u.test(en[key]),key);}
});

test('source labels localize while plugin names, paths and identifiers stay verbatim',()=>{
 const p=describeSource({kind:'opaque-tag'},{observed:{producer:{type:'plugin',id:'example-plugin',name:'中文插件 {name}'},method:'agent.inject',evidence:'runtime'}});
 assert.equal(localized(p,english),'Plugin · 中文插件 {name}');assert.equal(localized(p,chinese),'插件 · 中文插件 {name}');
 assert.equal(localized(p,english,'method'),'Context injection');assert.deepEqual(p.identifiers,['opaque-tag']);assert.equal(p.key,'plugin:example-plugin');
 const instructions=describeSource({kind:'agent-instructions',form:'instructions',changes:[{path:'/project/中文/CLAUDE.md'}]});
 assert.equal(localized(instructions,english),'Instruction files · CLAUDE.md');assert.deepEqual(instructions.files,['/project/中文/CLAUDE.md']);
 const inventory=describeSource({kind:'runtime-context'},{observed:{contributors:[{name:'early-context',method:'context',evidence:'registry-snapshot'}]}});
 assert.equal(localized(inventory.contributors[0],english),'Source owner unconfirmed');assert.equal(inventory.contributors[0].name,'early-context');
});

test('cached audit presentation switches language without changing message content, identity or measurement',()=>{
 const events=[],add=(type,data,extra={})=>events.push({seq:events.length,time:1,type,data,...extra});
 add('turn/start',{turn:1});
 add('system/message',{message:{role:'system',content:[{type:'text',text:'system body'}],source:{kind:'system-prompt'}}},{surfaceOp:'append'});
 add('user/message',{id:'user-1',role:'user',content:[{type:'text',text:'宿主基础上下文'}],source:{kind:'user'}},{surfaceOp:'append'});
 add('user/message',{id:'extra-1',role:'user',content:[{type:'text',text:'原始正文不翻译'}],source:{kind:'custom'}},{surfaceOp:'append'});
 add('assistant/message',{turn:1,step:1,message:{role:'assistant',content:[{type:'text',text:'原始回复'}],source:{kind:'model'}}},{surfaceOp:'append'});
 add('turn/end',{turn:1,reason:{kind:'completed'}});
 const audit=buildAudit({id:'synthetic-session'},events),dto=overview(audit),before=JSON.stringify(dto),r=dto.rounds[0];
 assert.equal(localized(r,english),'宿主基础上下文','a prompt matching our Chinese UI copy must not be translated');
 const base=r.segments.find(s=>s.sourceKey==='host');assert.equal(localized(base,english),'Host base context');assert.equal(localized(base,chinese),'宿主基础上下文');
 assert.equal(localized(r.segments.find(s=>s.type==='final'),english),'Final response');
 const detail=readDetail(audit,events,{seq:3});assert.equal(detail.text,'原始正文不翻译');assert.equal(localized(detail.provenance,english),'Source owner not recorded');
 for(const spec of dto.limitLabels)assert.ok(en[spec.key]);
 assert.equal(JSON.stringify(dto),before);assert.deepEqual(events[3].data.content,[{type:'text',text:'原始正文不翻译'}]);
});

test('visible error objects can switch language without another failed request',()=>{
 const error={code:'errorInvalidQuery'};assert.equal(errorText(error,english),'Invalid query parameters.');assert.equal(errorText(error,chinese),'查询参数不正确');
 assert.equal(errorText({code:'errorHttp',params:{status:503}},english),'Request failed (HTTP 503).');
 assert.equal(errorText(new TypeError('localized browser network message'),english),'Could not connect to the context service. Please retry.');
});

test('client UI contains no hardcoded Chinese outside the registered dictionaries',async()=>{
 const client=await readFile(new URL('../src/client.js',import.meta.url),'utf8');assert.ok(!/[\u3400-\u9fff]/u.test(client));
 for(const match of client.matchAll(/\bt\('([^']+)'/g))assert.ok(Object.hasOwn(en,match[1]),match[1]);
});

test('attachment preview truncation is explicit and language-neutral without rewriting the reference',()=>{
 const block={type:'image',url:'x'.repeat(3000)},event={seq:0,time:1,type:'user/message',data:{role:'user',content:[block],source:{kind:'user'}}};
 const before=JSON.stringify(event),detail=readDetail({sessionId:'synthetic',records:new Map(),calls:new Map()},[event],{seq:0});
 assert.equal(detail.attachmentRefs[0].truncated,true);assert.equal(JSON.parse(detail.attachmentRefs[0].reference).url.length,2001);assert.equal(JSON.stringify(event),before);
 assert.equal(english('referenceTruncated'),'Reference preview truncated.');assert.equal(chinese('referenceTruncated'),'引用预览已截断。');
});
