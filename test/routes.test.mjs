import test from 'node:test';
import assert from 'node:assert/strict';
import {apply} from '../src/index.js';
function host(config={}){let route,projection,disposed=0;const releases=[],events=[],routes=new Map();const ctx={sessions:{messageProjections:[]},sessionProjections:{register:p=>{projection=p;}},effect:fn=>{releases.push(fn());},connection:{fetch:{register:r=>{route=r;routes.set(r.path,r);return()=>disposed++;}}},sessionQuery:{observeSession:async id=>{if(id==='missing')throw Object.assign(Error('missing'),{code:'SESSION_QUERY_SESSION_NOT_FOUND'});return {cursor:events.length-1,header:{id,createdAt:1},events,[Symbol.dispose]:()=>{disposed++;}};}}};apply(ctx,config);return {events,routes,route:()=>route,projection:()=>projection,disposed:()=>disposed,close:()=>releases.reverse().forEach(f=>f?.())};}
test('audit route registers only a read method, publishes a body-free revision and releases leases',async()=>{const h=host();assert.deepEqual(h.route().methods,['GET']);assert.equal(h.projection().init(),-1);assert.equal(h.projection().apply(-1,{seq:4}),4);const r=await h.route().fetch(new Request('http://local/api/dsh-context-lite/audit?sessionId=a'));assert.equal(r.status,200);assert.deepEqual((await r.json()).value.rounds,[]);assert.equal(h.disposed(),1);assert.ok(r.headers.get('cache-control').includes('no-store'));h.close();assert.equal(h.disposed(),5);});
test('API rejects invalid coordinates, isolates missing sessions and does not expose internals',async()=>{const h=host();for(const params of ['sessionId=a&seq=-1','sessionId=a&kind=write','sessionId=','sessionId=a&offset=-1','sessionId=a&unexpected=true']){assert.equal((await h.route().fetch(new Request('http://local/api/dsh-context-lite/audit?'+params))).status,400);}const r=await h.route().fetch(new Request('http://local/api/dsh-context-lite/audit?sessionId=missing'));assert.equal(r.status,404);assert.ok(!(await r.text()).includes('stack'));h.close();});
test('unloading aborts outstanding audit work; invalid retention configuration fails at load',async()=>{const h=host();h.close();const r=await h.route().fetch(new Request('http://local/api/dsh-context-lite/audit?sessionId=a'));assert.equal(r.status,499);assert.throws(()=>apply({}, {maxCachedSessions:0}));});

test('API errors expose a stable localization key alongside the legacy Chinese message',async()=>{const h=host();const r=await h.route().fetch(new Request('http://local/api/dsh-context-lite/audit?sessionId=a&seq=-1'));assert.equal(r.status,400);const body=await r.json();assert.equal(body.errorKey,'errorInvalidQuery');assert.equal(body.error,'查询参数不正确');h.close();});

test('developer routes validate cuts, observation pins, pagination and content export independently of sidebar API',async()=>{
 const h=host();const get=(operation,query)=>h.routes.get('/api/dsh-context-lite/v1/'+operation).fetch(new Request('http://local/api/dsh-context-lite/v1/'+operation+'?'+query));
 for(const route of h.routes.values())assert.deepEqual(route.methods,['GET']);
 let response=await get('snapshot','sessionId=a');assert.equal(response.status,200);const snapshot=(await response.json()).value;assert.equal(snapshot.contract,'dsh-context-audit');assert.equal(snapshot.boundary.seq,-1);
 assert.equal((await get('snapshot','sessionId=a&expectedCursor=10')).status,409);
 assert.equal((await get('snapshot','sessionId=a&expectedCaptureRunId=previous-process')).status,409);
 assert.equal((await get('snapshot','sessionId=a&expectedSourceRevision=old-log')).status,409);
 assert.equal((await get('snapshot','sessionId=a&limit=0')).status,400);
 assert.equal((await get('snapshot','sessionId=a&atSeq=0&roundId=1')).status,400);
 assert.equal((await get('snapshot','sessionId=a&includeContent=true')).status,400);
 assert.equal((await get('snapshot','sessionId=missing')).status,404);
 response=await get('diff','sessionId=a&fromSeq=-1&toSeq=-1');assert.equal(response.status,200);assert.deepEqual((await response.json()).value.counts,{added:0,removed:0,modified:0});
 assert.equal((await get('diff','sessionId=a&fromSeq=2&toSeq=1')).status,400);
 response=await get('export','sessionId=a&format=json');assert.equal(response.status,200);assert.equal((await response.json()).at(-1).recordType,'complete');
 assert.equal((await get('export','sessionId=a&includeContent=1')).status,400);h.close();
});

test('oversized developer export returns 413 before streaming; unload cancels developer reads',async()=>{
 const h=host({maxExportBytes:1024}),route=h.routes.get('/api/dsh-context-lite/v1/export');
 const request=()=>route.fetch(new Request('http://local/api/dsh-context-lite/v1/export?sessionId=a'));
 let response=await request();assert.equal(response.status,413);assert.equal((await response.json()).error.code,'EXPORT_TOO_LARGE');
 h.close();response=await request();assert.equal(response.status,499);assert.equal((await response.json()).error.code,'CANCELLED');
});
