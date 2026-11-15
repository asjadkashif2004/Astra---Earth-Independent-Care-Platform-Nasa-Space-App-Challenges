// N16-06G deterministic mock execution/projection and saved-code checks only.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { constants as OS } from 'node:os';
import { QUALITY_MODE,authorizeQuality,assessQuality,executeQuality } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/single-quality-contract.mjs';
import { executeSingle,authorizeSingle } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/single-select-contract.mjs';
import { AS_OF,SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/designated-contract.mjs';
import { SCHEMA,QUERIES,rowsFor,projectRows } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/sqlite-fixture-contract.mjs';
import { probeContainment } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/containment-diagnostics.mjs';
import { QualificationBatch } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/qualification-batch.mjs';
import { ExecutionTrace,recoverTrace } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/execution-trace.mjs';
import { sha,stable } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/read-contract.mjs';

const I={directory:{dev:'1',ino:'2'},file:{dev:'1',ino:'3',birth_ns:'4',change_ns:'5'}};
const B={source_id:SOURCE_ID,source_sha256:SOURCE_SHA,source_bytes:SOURCE_BYTES,spec_sha256:SPEC_SHA,schema_sha256:sha(SCHEMA),
  source_identity:I,inventory:['source.sqlite'],file_mode:'0400',directory_mode:'0500',journal_mode:'closed_rollback'};
const CALL={schema_version:'astra.n16.read-tools.v1',tool:'get_data_quality',args:{crew_id:'CREW-03',metrics:['heart_rate']}};
const CONTEXT={principal:{id:'mock-quality',role:'astronaut',crew_id:'CREW-03'},crew_ids:['CREW-03'],read_as_of:AS_OF};
const REQUEST={schema_version:QUALITY_MODE,call:CALL,trusted_caller:CONTEXT,expected_instance:I};
const RO='1 9 0:1 / / ro - tmpfs synthetic-root rw\n2 1 8:1 /sealed /fixture ro,nosuid,nodev - ext4 synthetic-device rw\n';
const C={SQLITE_OK:0,SQLITE_DENY:1,SQLITE_READ:20,SQLITE_SELECT:21};
const err=code=>Object.assign(Error(code),{code});
const row=()=>structuredClone(rowsFor('elevated',0).observations.find(r=>r.crew_id==='CREW-03'&&r.metric==='heart_rate'));
const projected=()=>projectRows('elevated',0,CALL,[row()]);
function proof(mounts=RO){const deny=code=>()=>{throw Object.assign(err(code),{errno:-OS.errno[code],syscall:'open'});};
  return probeContainment({readMountInfo:()=>mounts,mountNamespace:()=> 'mnt:[42]',createRootFile:deny('EROFS'),createSourceFile:deny('EROFS'),openSourceReadwrite:deny('EACCES')},{source_id:SOURCE_ID,sha256:SOURCE_SHA});}
function fixture(){
  const s={opens:0,prepares:0,gets:0,closed:0,inspects:0,guard:null};
  const io={constants:C,inspect:()=>{s.inspects++;return structuredClone(B);},guard:()=>proof(),reportGuard:d=>s.guard=d,
    acknowledge:async()=>({command:'containment_verified',hash:s.guard.hash,source_binding_sha256:sha(stable(B)),call_sha256:sha(stable(CALL))}),
    confirmMount:d=>assert.equal(stable(d.proof),stable(proof().proof)),open:o=>{s.opens++;assert.equal(o.readOnly,true);assert.equal(o.allowExtension,false);assert.equal(o.defensive,true);let auth;
      return {exec:()=>assert.fail('no SQL setup or cleanup'),setAuthorizer:f=>auth=f,prepare:sql=>{s.prepares++;assert.equal(s.prepares,1);assert.equal(sql,QUERIES.observation);
        assert.equal(auth(C.SQLITE_SELECT,null,null,null),C.SQLITE_OK);
        for(const column of ['crew_id','metric','json','sha256'])assert.equal(auth(C.SQLITE_READ,'observations',column,'main'),C.SQLITE_OK);
        return {get:(...args)=>{s.gets++;assert.deepEqual(args,['CREW-03','heart_rate']);return row();}};},close:()=>s.closed++};}};
  return {s,io,run:(r=structuredClone(REQUEST))=>executeQuality(r,io)};
}
const summary={scope:'MOCK SQL/IO AND FILE-ONLY TRACE QA',native_worker_starts:0,SQLite_connections:0,SQL_statements:0,source_database_reads:0};
after(()=>writeFile(new URL('../artifacts/n16-final-20261030/compat/quality-mock-results.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),JSON.stringify(summary,null,2)+'\n'));

test('quality-only positive dispatches exact frozen SELECT once and retains canonical metadata with no reading value',async()=>{
  const f=fixture(),v=await f.run();assert.equal(v.result.tool,'get_data_quality');assert.equal(v.result.data_status,'KNOWN');
  const item=v.result.data.items[0];assert.equal(item.value,null);assert.deepEqual(item.quality,{status:'good',confidence:0.99,artifact:false});
  assert.equal(item.provenance.observed_at,AS_OF);assert.equal(item.provenance.source.kind,'simulator');assert.equal(item.provenance.age_ms,0);
  assert.deepEqual([f.s.opens,f.s.prepares,f.s.gets,f.s.closed,f.s.inspects],[1,1,1,1,3]);assert.equal(v.receipt.mode,QUALITY_MODE);
  assert.equal(v.receipt.query_sha256,sha(QUERIES.observation));assert.deepEqual(v.receipt.query_ids,['observation']);
  assert.deepEqual(v.receipt.quality_audit.canonical_projection,projected());assert.equal(v.result.clinical_support,false);
});
test('vitals default still rejects quality and quality policy cannot execute vitals or other tools',async()=>{
  assert.throws(()=>authorizeSingle(CALL,CONTEXT));const f=fixture();await assert.rejects(executeSingle(REQUEST,f.io));assert.equal(f.s.opens,0);
  for(const tool of ['get_current_vitals','get_personal_baseline','get_open_risk_events']){const g=fixture(),r=structuredClone(REQUEST);r.call.tool=tool;await assert.rejects(g.run(r));assert.equal(g.s.opens,0);}
});
for(const name of ['cross_crew','wrong_role','role_injection','SQL','source_path','two_metrics','wrong_version'])test('reject '+name+' before SQL',async()=>{
  const f=fixture(),r=structuredClone(REQUEST);
  if(name==='cross_crew')r.call.args.crew_id='CREW-04';else if(name==='wrong_role')r.trusted_caller.principal.role='system_admin';
  else if(name==='role_injection')r.call.args.role='demo_admin';else if(name==='two_metrics')r.call.args.metrics.push('spo2');
  else if(name==='wrong_version')r.schema_version='n16-06f-single-select-v1';else r.call.args[name]='untrusted';
  await assert.rejects(f.run(r));assert.equal(f.s.opens,0);
});
test('source/schema/missing provenance reject before any query',async()=>{
  for(const key of ['source_id','source_sha256','schema_sha256','spec_sha256']){const f=fixture();f.io.inspect=()=>({...structuredClone(B),[key]:'wrong'});await assert.rejects(f.run());assert.equal(f.s.opens,0);}
});
test('missing or writable mount and acknowledgement failure block execution',async()=>{
  for(const mounts of ['',RO.replace('/fixture ro,','/fixture rw,')]){const f=fixture();f.io.guard=()=>proof(mounts);await assert.rejects(f.run());assert.equal(f.s.opens,0);}
  const f=fixture();f.io.acknowledge=async()=>{throw err('TRACE_PERSISTENCE_FAILED');};await assert.rejects(f.run());assert.equal(f.s.opens,0);
});
for(const kind of ['missing_quality','missing_confidence','invalid_confidence','invalid_status','nonboolean_artifact','suspect','missing_flag','artifact','missing_provenance','stale','future','unknown_status','wrong_source','missing_time'])test('successful SQL is insufficient for quality: '+kind,()=>{
  const input=projected(),item=input.data.items[0];
  if(kind==='missing_quality')delete item.quality;
  if(kind==='missing_confidence')delete item.quality.confidence;
  if(kind==='invalid_confidence')item.quality.confidence=2;
  if(kind==='invalid_status')item.quality.status='unrecognized';
  if(kind==='nonboolean_artifact')item.quality.artifact='false';
  if(kind==='suspect')item.quality.status='suspect';
  if(kind==='missing_flag')item.quality.status='missing';
  if(kind==='artifact')item.quality.artifact=true;
  if(kind==='missing_provenance')item.provenance=null;
  if(kind==='stale')item.provenance.observed_at='2026-11-14T10:59:40.000Z';
  if(kind==='future')item.provenance.observed_at='2026-11-14T11:00:01.000Z';
  if(kind==='unknown_status')item.data_status='UNKNOWN';
  if(kind==='wrong_source')item.provenance.source.kind='unknown';
  if(kind==='missing_time')delete item.provenance.observed_at;
  const output=assessQuality(input);assert.equal(output.data_status,'UNKNOWN');assert.equal(output.data.items[0].data_status,'UNKNOWN');assert.equal(output.data.items[0].value,null);
  if(['suspect','missing_flag','artifact'].includes(kind))assert.deepEqual(output.data.items[0].quality,item.quality);
  if(kind==='stale'){assert.equal(output.data.items[0].provenance.freshness,'stale');assert.equal(output.data.items[0].provenance.age_ms,20000);}
  if(kind==='missing_quality')assert.equal(output.data.items[0].quality,null);
  assert.equal(input.data_status,'KNOWN'); // Assessment never mutates the canonical audit input.
});
test('existing deterministic missing/stale projection fixtures remain UNKNOWN without changing the corpus',()=>{
  for(const profile of ['missing','stale','malformed','untrusted']){
    const selected=rowsFor(profile,0).observations.find(r=>r.crew_id==='CREW-03'&&r.metric==='heart_rate')??null;
    const value=assessQuality(projectRows(profile,0,CALL,[selected]));assert.equal(value.data_status,'UNKNOWN');assert.equal(value.data.items[0].value,null);
  }
});
test('tampered canonical SQL row is rejected rather than repaired into a quality result',async()=>{
  const f=fixture(),open=f.io.open;f.io.open=o=>{const db=open(o),prepare=db.prepare;db.prepare=s=>{const stmt=prepare(s);stmt.get=()=>({...row(),sha256:'0'.repeat(64)});return stmt;};return db;};
  await assert.rejects(f.run());assert.equal(f.s.closed,1);
});
test('shared first-failure latch stops later mock admissions',async()=>{
  const b=new QualificationBatch({persist:async r=>({durable:true,hash:r.hash})});let starts=0;
  await assert.rejects(b.run('quality',async p=>{p.markStarted();starts++;const f=fixture();f.io.guard=()=>proof('');return f.run();}));
  await assert.rejects(b.run('late',async p=>{p.markStarted();starts++;}));assert.equal(starts,1);assert.equal((await b.drain()).blocked,true);
});
async function executionOracle(fn){const f=fixture(),v=await fn(REQUEST,f.io);assert.equal(f.s.opens,1);assert.equal(v.result.data_status,'KNOWN');
  const bad=fixture();bad.io.guard=()=>proof('');await assert.rejects(()=>fn(REQUEST,bad.io));assert.equal(bad.s.opens,0);}
function assessmentOracle(fn){assert.equal(fn(projected()).data_status,'KNOWN');const bad=projected();delete bad.data.items[0].quality;assert.equal(fn(bad).data_status,'UNKNOWN');}
test('accept-all/reject-all execution and always-good/always-UNKNOWN quality mutants fail controls',async()=>{
  await executionOracle(executeQuality);await assert.rejects(()=>executionOracle(async()=>({result:{data_status:'KNOWN'}})));
  await assert.rejects(()=>executionOracle(async()=>{throw err('REJECT_ALL');}));assessmentOracle(assessQuality);
  assert.throws(()=>assessmentOracle(v=>v));assert.throws(()=>assessmentOracle(v=>({...v,data_status:'UNKNOWN'})));
  summary.execution_mutants_detected=true;summary.quality_mutants_detected=true;
});
test('F default implementation changes are limited to explicit trusted internal policy selection',async()=>{
  const old=await readFile(new URL('../artifacts/n16-06g-20261029/single-select-contract.mjs.original.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  const now=await readFile(new URL('../services/agent/single-select-contract.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  const restored=now.replace('executeSingle(request,io,{mode=SINGLE_MODE,authorize=authorizeSingle}={})','executeSingle(request,io)')
    .replace("request.schema_version===mode,'SINGLE_REQUEST_INVALID'","request.schema_version===SINGLE_MODE,'SINGLE_REQUEST_INVALID'")
    .replace('const call=authorize(request.call,request.trusted_caller);','const call=authorizeSingle(request.call,request.trusted_caller);')
    .replace('receipt:{mode,readOnly:true','receipt:{mode:SINGLE_MODE,readOnly:true');assert.equal(restored,old);
  const runtime=await readFile(new URL('../services/agent/single-select-runtime.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  const original=await readFile(new URL('../artifacts/n16-06g-20261029/single-select-runtime.mjs.original.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  const selector="  const execute=request.schema_version==='n16-06g-single-quality-v1'\n    ?(await import('./single-quality-contract.mjs')).executeQuality:executeSingle;\n";
  assert.equal(runtime.replace(selector,'').replace('const value=await execute(request,{','const value=await executeSingle(request,{'),original);
  const fixture=await readFile(new URL('./n16-single-select.test.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  const oldFixture=await readFile(new URL('../artifacts/n16-06g-20261029/n16-single-select.test.mjs.original.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');
  assert.equal(fixture.replace('artifacts/n16-06g-20261029/vitals-mock-results.json','artifacts/n16-06f-20261029/mock-results.json')
    .replace('artifacts/n16-06g-20261029/vitals-qa-traces/','artifacts/n16-06f-20261029/qa-traces/'),oldFixture);
});
test('frozen query and readonly worker remain pinned; G controller is single-use and quality-only',async()=>{
  const plan=JSON.parse(await readFile(new URL('../artifacts/n16-06f-20261029/code-plan.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs")));
  for(const name of ['services/agent/designated-worker.mjs','services/agent/designated-source.mjs','services/agent/single-select-source.mjs','services/agent/sqlite-fixture-contract.mjs'])
    assert.equal(sha(await readFile(new URL('../'+name,"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"))),plan.code_pins[name]);
  const code=executeSingle.toString();assert.doesNotMatch(code,/\.exec\(|PRAGMA|BEGIN|ROLLBACK|QUERIES\.metadata/);assert.equal((code.match(/db\.prepare\(/g)??[]).length,1);
  const runner=await readFile(new URL('../scripts/n16-quality-qualification.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs"),'utf8');assert.equal((runner.match(/child=spawn\(/g)??[]).length,1);
  assert.match(runner,/tool:'get_data_quality'/);assert.doesNotMatch(runner,/get_current_vitals/);assert.match(runner,/O_CREAT\|F\.O_EXCL/);
});
test('COMPLETED execution with UNKNOWN quality remains distinct in durable mock trace recovery',async()=>{
  const root=new URL('../artifacts/n16-final-20261030/compat/quality-qa-traces/',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-quality.test.mjs").pathname;await mkdir(root,{recursive:true});
  const input=projected();delete input.data.items[0].quality;const result={execution_status:'COMPLETED',...assessQuality(input)};
  const t=await ExecutionTrace.create({mock_quality:true},{root});await t.append('CALL_REQUESTED',{call_id:'call-01'});
  await t.append('CALL_VALIDATED',{call_id:'call-01',tool:CALL.tool});await t.append('CALL_STARTED',{call_id:'call-01',tool:CALL.tool});
  const ref=await t.result('call-01',result);await t.append('CALL_COMPLETED',{call_id:'call-01',tool:CALL.tool,result:ref,data_status:'UNKNOWN'});
  await t.append('RUN_ENDED',{status:'COMPLETED'});await t.close();const r=await recoverTrace(t.id,{root});
  assert.equal(r.status,'COMPLETE');assert.equal(r.executed_calls[0].status,'COMPLETED');assert.equal(r.executed_calls[0].result.data_status,'UNKNOWN');assert.equal(r.replayed_calls,0);
});
