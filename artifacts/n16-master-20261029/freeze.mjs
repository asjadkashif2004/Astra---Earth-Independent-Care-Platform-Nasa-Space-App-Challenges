// Preflight metadata freeze only; no SQLite/model/native worker.
import { readdir,readFile,mkdir,lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { allocated,atomicRecord } from '../../services/agent/master-storage.mjs';
import { WORKER_FILES } from '../../services/agent/master-supervisor.mjs';
import { sha } from '../../services/agent/read-contract.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url)),out=join(project,'artifacts/n16-master-20261029');
await mkdir(join(out,'native'),{recursive:true});
const files=[...new Set([...WORKER_FILES,'services/agent/master-coordinator.mjs','services/agent/master-supervisor.mjs','services/agent/master-storage.mjs',
  'services/agent/resource-journal.mjs','services/agent/execution-trace.mjs','services/agent/read-context.mjs','services/agent/qualification-batch.mjs',
  'services/agent/dependency-pins.mjs','scripts/n16-master-demo.mjs','scripts/check.mjs','tests/n16-master.test.mjs','tests/n16-checker.test.mjs'])];
const code_pins=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(join(project,p)))])));
const mandatory_qa=[];
for(const [file,expected] of [['qa-deterministic-diagnostics.txt',245],['qa-regressions-01.txt',272]]){
  const path='artifacts/n16-master-20261029/'+file,b=await readFile(join(project,path)),s=b.toString();
  if(!s.includes('ℹ pass '+expected+'\n')||!s.includes('ℹ fail 0\n')||!s.includes('ℹ skipped 0\n'))throw Error('MANDATORY_QA_FAILED');
  mandatory_qa.push({path,sha256:sha(b),passed:expected,failed:0});
}
const syntax=await readFile(join(out,'qa-syntax-final.txt'));if(!syntax.toString().includes('0 errors.'))throw Error('SYNTAX_FAILED');
const fixed_storage={};
const charge=async p=>{fixed_storage[p]=await allocated(p.startsWith('/')?p:join(project,p));};
for(const d of await readdir(join(project,'artifacts')))if(d.startsWith('n16-')&&d!=='n16-master-20261029')await charge('artifacts/'+d);
await charge('/var/tmp/astra-n16-designated-2v0ytq');
await charge('/var/tmp/astra-n16-04-gJ6VxS/originals/elevated');
for(const file of files)await charge(file);
for(const d of await readdir(out))if(!['native','code-plan.json'].includes(d))await charge('artifacts/n16-master-20261029/'+d);
// Charge the containing directory too, without counting its children a second time.
const rootStat=await lstat(out),overhead=Math.max(rootStat.size,rootStat.blocks*512);
const plan={schema_version:'astra.n16.master-plan.v1',task:'N16_MASTER',maximum_startups:12,stage_admissions:4,
  code_pins,mandatory_qa,syntax_sha256:sha(syntax),fixed_storage,fixed_directory_overhead:overhead,
  fixed_counted_bytes:Object.values(fixed_storage).reduce((n,x)=>n+x,0)+overhead,
  accounting_roots:['artifacts/n16-master-20261029/native','/tmp/astra-n16-master-20261029'],
  accounting_dynamic_files:['artifacts/n16-master-20261029/code-plan.json'],
  intended_native_calls:['get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events'],
  crew_id:'CREW-03',metric:'heart_rate',risk_limit:5,SQL_statements_per_worker:1};
await atomicRecord(out,'code-plan.json',plan);
console.log(JSON.stringify({status:'FROZEN',code_files:files.length,fixed_counted_bytes:plan.fixed_counted_bytes,tests:517,native_startups:'See durable mission-wide budget'}));
