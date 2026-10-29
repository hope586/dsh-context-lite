import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {Context,Service} from '@deepseek-ai/cordis';
import {ScopedLayers,NamedEntries} from '@deepseek-ai/dsh-scope';
import {collectOrigins} from '../src/collector.js';
async function trial(enabled,count=1000){
 const c=new Context();let observer;
 await c.plugin({name:'dsh-context-lite',apply(ctx){observer=collectOrigins(ctx,{enabled});ctx.effect(()=>()=>observer.close());}});
 let seq=0;const session={id:'bench'},emit=(type,data)=>c.emit('session/event',session,{seq:seq++,type,data});
 const agent={session,inbox:{append(target,m){emit('agent/inbox/spliced',{inserted:[m]});emit('user/message',m);}},inject(m){this.inbox.append('next-step',m);}};
 await c.plugin({name:'bench-producer',apply(ctx){ctx.fiber.entry={id:'bench',options:{name:'benchmark-plugin'}};ctx.on('produce',m=>agent.inject(m));}});
 await c.serial('agent/created',{agent});
 const start=performance.now();for(let i=0;i<count;i++)await c.serial('produce',{id:`m${i}`,role:'user',content:[{type:'text',text:'benchmark'}],source:{kind:'opaque'}});
 const ms=performance.now()-start,status=observer.status();await c.fiber.dispose();return {ms,failures:status.failures,records:status.revision};
}
await trial(false,100);await trial(true,100);
const off=[],on=[];for(let i=0;i<5;i++){off.push(await trial(false));on.push(await trial(true));}
const median=a=>a.map(r=>r.ms).sort((a,b)=>a-b)[2],report={timestamp:new Date().toISOString(),scope:'local synthetic Cordis callbacks + inbox admission + bounded metadata; excludes network/model/disk; not an end-to-end latency estimate',eventsPerTrial:1000,trials:5,off,on,medianOffMs:median(off),medianOnMs:median(on),addedMicrosecondsPerAdmission:(median(on)-median(off))*1000/1000};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

class Inventory extends Service {
 constructor(c){super(c,'systemPrompt');this.layers=new ScopedLayers(()=>({contexts:new NamedEntries(n=>Error(n)),sections:new NamedEntries(n=>Error(n))}),()=>{});for(let i=0;i<1000;i++)this.layers.global.contexts.insert(`entry-${i}`,{name:`entry-${i}`,text:()=>{throw Error('must not execute');}});}
}
const startup=[];for(let i=0;i<5;i++){const c=new Context();await c.plugin(Inventory);let o;const start=performance.now();await c.plugin({name:'dsh-context-lite',apply(ctx){o=collectOrigins(ctx);ctx.effect(()=>()=>o.close());}});startup.push({ms:performance.now()-start,entries:o.status().snapshotEntries,scans:o.status().snapshotScans});await c.fiber.dispose();}
const startupReport={...report,startupInventory:{entries:1000,trials:startup,medianMs:startup.map(t=>t.ms).sort((a,b)=>a-b)[2]}};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(startupReport,null,2)+'\n');
console.log('Startup inventory (1000 entries) median ms:',startupReport.startupInventory.medianMs);
