import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {translator} from '../src/i18n.js';

test('built client registers a live localized tab title and host-owned locale dictionaries',async()=>{
 const bundle=await build({entryPoints:['src/client.js'],bundle:true,platform:'browser',format:'iife',globalName:'Client',write:false});
 const source=bundle.outputFiles[0].text;const sandbox={React:{},STYLE:'',Client:undefined};vm.runInNewContext(source,sandbox);
 const slots=[],effects=[],dicts=[];const ctx={locale:{bind:()=>translator('en'),register:(ns,d)=>{dicts.push([ns,d]);return()=>{};}},effect:fn=>{const release=fn();effects.push(release);return release;},sidebarRightTabs:{register:()=>()=>{}},sidebarRight:{openTab:()=>{}},slots:{inject:(_name,fn)=>fn(),register:(definition,component)=>{slots.push({definition,component});return()=>{};}}};
 sandbox.Client.apply(ctx);
 const title=slots.find(s=>s.definition.name==='sidebar.right.pane.tab.title');assert.ok(title);assert.equal(title.definition.locale,'contextLite');assert.equal(title.component({t:translator('en')}),'Context');assert.equal(title.component({t:translator('zh')}),'上下文');
 assert.ok(slots.some(s=>s.definition.name==='sidebar.right.pane.tab'));assert.deepEqual(Object.keys(dicts[0][1]).sort(),['en','zh']);assert.equal(effects.length,5);
});
