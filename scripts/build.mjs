import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const fingerprint=createHash('sha256').update(version);for(const p of ['src/index.js','src/audit.js','src/developer-audit.js','src/client.js','src/style.css','src/provenance.js','src/collector.js','src/origin-store.js','src/i18n.js'])fingerprint.update(await readFile(p));const buildId=fingerprint.digest('hex').slice(0,12);
await mkdir('lib',{recursive:true});
const result=await build({entryPoints:['src/index.js'],outfile:'lib/index.js',bundle:true,platform:'node',external:['@deepseek-ai/dsh-scope'],format:'esm',target:'node22',legalComments:'inline',metafile:true,define:{__DCL_BUILD__:JSON.stringify(buildId),__DCL_VERSION__:JSON.stringify(version)}});
const css=await readFile('src/style.css','utf8');
const client=await build({entryPoints:['src/client.js'],bundle:true,platform:'browser',format:'iife',globalName:'__ContextLiteClient',write:false,target:'es2022',legalComments:'inline'});
await writeFile('lib/client.js',`window.__ModuleLoader__.load({id:'dsh-context-lite',factory:require=>{const React=require('react');const STYLE=${JSON.stringify(css)};${client.outputFiles[0].text}\nreturn __ContextLiteClient;}});\n`);
const notices=await Promise.all(['licenses/DeepSeek-MIT.txt','licenses/Zod-MIT.txt'].map(p=>readFile(p,'utf8')));
await writeFile('lib/THIRD-PARTY-LICENSES.txt',notices.join('\n\n'));
const dependencies=[...new Set(Object.keys(result.metafile.inputs).filter(p=>p.includes('node_modules/')).map(p=>p.slice(p.lastIndexOf('node_modules/')+13)).map(p=>p.startsWith('@')?p.split('/').slice(0,2).join('/'):p.split('/')[0]))].sort();
await writeFile('lib/bundled-dependencies.json',JSON.stringify(dependencies,null,2)+'\n');

await writeFile('lib/build.json',JSON.stringify({version,build:buildId})+'\n');
