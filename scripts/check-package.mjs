import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'context-lite-pack-'));
const env={...process.env,npm_config_cache:join(dir,'cache'),npm_config_loglevel:'error'};
try{
 const files=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8',env}))[0].files.map(x=>x.path);
 assert.ok(files.includes('lib/index.js'));assert.ok(files.includes('LICENSE'));assert.ok(files.includes('licenses/DeepSeek-MIT.txt'));
 assert.ok(!files.some(p=>/^(acceptance|artifacts|node_modules|test|src|scripts)\//.test(p)));
 execFileSync('npm',['pack','--ignore-scripts','--pack-destination',dir],{stdio:'pipe',env});
 const archive=(await readdir(dir)).find(p=>p.endsWith('.tgz'));
 execFileSync('tar',['-xzf',join(dir,archive),'-C',dir]);
 const suspicious=/(?:\/Users\/|\/home\/[^/\s]+\/|session-[a-f0-9]{8}-[a-f0-9-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{20,}|DSH_AUTH_TOKEN=)/;
 for(const file of files){const content=await readFile(join(dir,'package',file),'utf8');assert.ok(!suspicious.test(content),`private data pattern in ${file}`);}
 const pkg=JSON.parse(await readFile(join(dir,'package','package.json'),'utf8'));
 assert.equal(pkg.license,'MIT');assert.equal(pkg.version,JSON.parse(await readFile('lib/build.json','utf8')).version);
 const backend=await import(pathToFileURL(join(dir,'package/lib/index.js')).href);assert.equal(typeof backend.apply,'function');
 console.log(`Package verified: ${files.length} files, ${pkg.version}; no private-data patterns in archive.`);
}finally{await rm(dir,{recursive:true,force:true});}
