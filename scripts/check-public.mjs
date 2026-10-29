import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// Check the exact Git index that will be committed, including sources/tests.
// Package verification separately checks the extracted distribution archive.
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const privatePath=/(?:^|\/)(?:acceptance|sessions|storages|dsh-home|node_modules|artifacts)\/|(?:\.jsonl(?:\.zstd)?|\.tgz)$|(?:^|\/)(?:\.credentials\.ya?ml|\.env(?:\..*)?)$/;
const suspicious=/(?:\/Users\/|\/home\/[^/\s]+\/|session-[a-f0-9]{8}-[a-f0-9-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{20,}|DSH_AUTH_TOKEN=[A-Za-z0-9_-]{16,})/;
for(const file of files){
  assert.ok(!privatePath.test(file),`private artifact staged: ${file}`);
  const bytes=execFileSync('git',['show',`:${file}`],{maxBuffer:8*1024*1024});
  assert.ok(bytes.length<=5*1024*1024,`unexpectedly large public file: ${file}`);
  assert.ok(!bytes.includes(0),`unexpected binary public file: ${file}`);
  assert.ok(!suspicious.test(bytes.toString('utf8')),`private-data pattern staged in ${file}`);
}
console.log(`Public Git index verified: ${files.length} source, test and documentation files; no private artifact paths or known credential/session patterns.`);
