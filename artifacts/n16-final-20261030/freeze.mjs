// Static qualification receipts and accounting; never opens SQLite or starts a worker.
import { readdir,readFile,mkdir,lstat,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { atomicRecord,allocated } from '../../services/agent/master-storage.mjs';
import { WORKER_FILES } from '../../services/agent/master-supervisor.mjs';
import { QUERIES,SCHEMA } from '../../services/agent/sqlite-fixture-contract.mjs';
import { sha } from '../../services/agent/read-contract.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url)),out=join(project,'artifacts/n16-final-20261030');
await mkdir(join(out,'native'),{recursive:true});
const failure=JSON.parse(await readFile(join(project,'artifacts/n16-master-20261029/native/attempt-02/call-04/outcome.json'))).events.at(-1);
await atomicRecord(out,'authorizer-diagnosis.json',{exact_sql:QUERIES.risks,parameters:['CREW-03','open',6],
  saved_sqlite_error:{code:failure.code,errcode:failure.sql_diagnostic.errcode,errstr:failure.sql_diagnostic.errstr,stage:failure.sql_diagnostic.stage},
  callbacks:failure.sql_diagnostic.authorizer_actions.map((a,i)=>({...a,action_name:a.action===21?'SQLITE_SELECT':a.action===20?'SQLITE_READ':'UNKNOWN',
    source_context:'NOT_RECORDED_BY_OLD_FOUR_PARAMETER_HANDLER',phase:i===9?'step':'NOT_RECORDED'})),
  denied_branch:'The second SQLITE_SELECT increments selects to2; old predicate permits only count1.',
  statement_identity:'One prepare call and one all call on the same statement in the preserved source. No second application statement is issued.',
  schema:SCHEMA,view_or_trigger_or_compound_query:false,implicit_reprepare_trigger:'Not independently established; repeated callback during the same statement step is recorded.',
  new_policy:'One prepare/step; at most one risk-only step-phase reauthorization after exact initial columns; strict context/action/database checks.'});
const files=[...new Set([...WORKER_FILES,'services/agent/master-coordinator.mjs','services/agent/master-supervisor.mjs','services/agent/master-storage.mjs',
  'services/agent/recorded-health-demo.mjs','services/agent/resource-journal.mjs','services/agent/execution-trace.mjs','services/agent/read-context.mjs',
  'services/agent/qualification-batch.mjs','services/agent/dependency-pins.mjs','scripts/n16-final-demo.mjs','scripts/check.mjs',
  'tests/n16-master.test.mjs','tests/n16-authorizer.test.mjs','tests/n16-recorded-demo.test.mjs','tests/n16-checker.test.mjs'])];
const code_pins=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(join(project,p)))])));
const mandatory_qa=[];
for(const [file,expected] of [['qa-deterministic-02.txt',298],['qa-regressions.txt',272]]){
  const path='artifacts/n16-final-20261030/'+file,b=await readFile(join(project,path)),s=b.toString();
  if(!s.includes('ℹ pass '+expected+'\n')||!s.includes('ℹ fail 0\n')||!s.includes('ℹ skipped 0\n'))throw Error('MANDATORY_QA_FAILED');
  mandatory_qa.push({path,sha256:sha(b),passed:expected,failed:0});
}
const syntax=await readFile(join(out,'qa-syntax.txt'));if(!syntax.toString().includes('0 errors.'))throw Error('SYNTAX_FAILED');
const fixed_storage={},charge=async p=>fixed_storage[p]=await allocated(p.startsWith('/')?p:join(project,p));
for(const d of await readdir(join(project,'artifacts')))if(d.startsWith('n16-')&&d!=='n16-final-20261030')await charge('artifacts/'+d);
await charge('/var/tmp/astra-n16-designated-2v0ytq');await charge('/var/tmp/astra-n16-04-gJ6VxS/originals/elevated');
for(const p of files)await charge(p);
for(const p of await readdir(out))if(!['native','code-plan.json'].includes(p))await charge('artifacts/n16-final-20261030/'+p);
const d=await lstat(out),overhead=Math.max(d.size,d.blocks*512);
const plan={schema_version:'astra.n16.final-plan.v1',task:'N16_FINAL',maximum_startups:6,stage_admissions:4,
  code_pins,mandatory_qa,syntax_sha256:sha(syntax),fixed_storage,fixed_directory_overhead:overhead,
  fixed_counted_bytes:Object.values(fixed_storage).reduce((n,v)=>n+v,0)+overhead,
  accounting_roots:['artifacts/n16-final-20261030/native','/tmp/astra-n16-final-20261030'],
  accounting_dynamic_files:['artifacts/n16-final-20261030/code-plan.json'],
  intended_native_calls:['get_open_risk_events','get_current_vitals','get_data_quality','get_personal_baseline'],
  crew_id:'CREW-03',metric:'heart_rate',risk_limit:5,SQL_statements_per_worker:1};
await atomicRecord(out,'code-plan.json',plan);
const snapshots=join(out,'executed-code');await mkdir(snapshots,{recursive:true});
for(const p of files)await writeFile(join(snapshots,p.replaceAll('/','__')),await readFile(join(project,p)));
// Snapshots are participating frozen inputs too. Include their actual charge before publication.
plan.fixed_storage['artifacts/n16-final-20261030/executed-code']=await allocated(snapshots);
plan.fixed_counted_bytes+=plan.fixed_storage['artifacts/n16-final-20261030/executed-code'];
await atomicRecord(out,'code-plan.json',plan);
console.log(JSON.stringify({status:'FROZEN',code_files:files.length,tests:570,fixed_counted_bytes:plan.fixed_counted_bytes,native_startups:0,maximum:6}));
