// Non-native N16-06F controls. No worker, SQLite module, source DB or model loading.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { constants as OS } from 'node:os';
import { SINGLE_MODE,authorizeSingle,verifyBinding,verifySingleGuard,executeSingle } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/single-select-contract.mjs';
import { verifySchemaProvenance,inspectSealedSource } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/single-select-source.mjs';
import { probeContainment } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/containment-diagnostics.mjs';
import { QualificationBatch } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/qualification-batch.mjs';
import { ExecutionTrace,recoverTrace } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/execution-trace.mjs';
import { SCHEMA,QUERIES,rowsFor } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/sqlite-fixture-contract.mjs';
import { SOURCE_ID,SOURCE_SHA,SOURCE_BYTES,SPEC_SHA,AS_OF } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/designated-contract.mjs';
import { stable,sha } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/read-contract.mjs';

const INSTANCE={directory:{dev:'1',ino:'2'},file:{dev:'1',ino:'3',birth_ns:'4',change_ns:'5'}};
const BINDING={source_id:SOURCE_ID,source_sha256:SOURCE_SHA,source_bytes:SOURCE_BYTES,spec_sha256:SPEC_SHA,schema_sha256:sha(SCHEMA),
  source_identity:INSTANCE,inventory:['source.sqlite'],file_mode:'0400',directory_mode:'0500',journal_mode:'closed_rollback'};
const CALL={schema_version:'astra.n16.read-tools.v1',tool:'get_current_vitals',args:{crew_id:'CREW-03',metrics:['heart_rate']}};
const CONTEXT={principal:{id:'mock-only',role:'astronaut',crew_id:'CREW-03'},crew_ids:['CREW-03'],read_as_of:AS_OF};
const REQUEST={schema_version:SINGLE_MODE,call:CALL,trusted_caller:CONTEXT,expected_instance:INSTANCE};
const C={SQLITE_OK:0,SQLITE_DENY:1,SQLITE_READ:20,SQLITE_SELECT:21,SQLITE_TRANSACTION:22,SQLITE_PRAGMA:19,SQLITE_FUNCTION:31};
const RO='1 9 0:1 / / ro - tmpfs synthetic-root rw\n2 1 8:1 /sealed /fixture ro,nosuid,nodev - ext4 synthetic-device rw\n';
const error=code=>Object.assign(Error(code),{code});
function proof({fileCode='EACCES',mounts=RO}={}){
  const deny=code=>()=>{throw Object.assign(error(code),{errno:-OS.errno[code],syscall:'open'});};
  return probeContainment({readMountInfo:()=>mounts,mountNamespace:()=> 'mnt:[42]',createRootFile:deny('EROFS'),createSourceFile:deny('EROFS'),openSourceReadwrite:deny(fileCode)}, {source_id:SOURCE_ID,sha256:SOURCE_SHA});
}
const seal=value=>{const {hash,...body}=value;return {...body,hash:sha(stable(body))};};
function fixture(){
  const state={opens:0,prepares:0,gets:0,closes:0,reported:[],authorizer:null,options:null,committed:false};
  const io={constants:C,inspect:()=>structuredClone(BINDING),guard:()=>proof(),reportGuard:d=>state.reported.push(d),
    acknowledge:async()=>({command:'containment_verified',hash:state.reported.at(-1).hash,source_binding_sha256:sha(stable(BINDING)),call_sha256:sha(stable(CALL))}),
    confirmMount:d=>assert.equal(stable(d.proof),stable(proof().proof)),
    open:options=>{state.opens++;state.options=options;assert.equal(state.opens,1);return {
      exec:()=>assert.fail('No setup or cleanup SQL permitted'),
      setAuthorizer:fn=>{state.authorizer=fn;},
      prepare:sql=>{state.prepares++;assert.equal(state.prepares,1);assert.equal(sql,QUERIES.observation);
        assert.equal(state.authorizer(C.SQLITE_SELECT,null,null,null),C.SQLITE_OK);
        for(const column of ['crew_id','metric','json','sha256'])assert.equal(state.authorizer(C.SQLITE_READ,'observations',column,'main'),C.SQLITE_OK);
        return {get:(crew,metric)=>{state.gets++;assert.deepEqual([crew,metric],['CREW-03','heart_rate']);
          return structuredClone(rowsFor('elevated',0).observations.find(r=>r.crew_id===crew&&r.metric===metric));}};},close:()=>state.closes++};}};
  const run=async(request=structuredClone(REQUEST))=>{const result=await executeSingle(request,io);state.committed=true;return result;};
  return {state,io,run};
}
const summary={scope:'MOCKED DATABASE/FILESYSTEM + TEXT/TRACES ONLY',actual_SQLite_connections:0,actual_SQL_statements:0,worker_startups:0,source_database_reads:0};
after(()=>writeFile(new URL('../artifacts/n16-master-20261029/compat/vitals-mock-results.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),JSON.stringify(summary,null,2)+'\n'));

test('valid proof-bound positive performs exactly one mock parameterized SELECT and preserves canonical values',async()=>{
  const f=fixture(),value=await f.run();assert.equal(value.result.data.items[0].value,103);assert.equal(value.result.data_status,'KNOWN');
  assert.deepEqual([f.state.opens,f.state.prepares,f.state.gets,f.state.closes],[1,1,1,1]);assert.equal(f.state.options.readOnly,true);
  assert.equal(f.state.options.allowExtension,false);assert.equal(f.state.options.defensive,true);assert.equal(value.receipt.explicit_statement_count,1);
  assert.equal(value.result.data.items[0].provenance.observed_at,AS_OF);assert.equal(value.result.inference_performed,false);
});
for(const code of ['EACCES','EROFS'])test(code+' with valid independent source/root mounts can contribute',async()=>{
  const f=fixture();f.io.guard=()=>proof({fileCode:code});await f.run();assert.equal(f.state.opens,1);
});
test('EACCES without read-only mount proof never opens a database',async()=>{
  const f=fixture();f.io.guard=()=>proof({mounts:RO.replace('/fixture ro,','/fixture rw,')});await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
test('EROFS without valid mount evidence also fails closed',async()=>{
  const f=fixture();f.io.guard=()=>proof({fileCode:'EROFS',mounts:''});await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
test('task-specific guard rejects EPERM even if generic proof policy would qualify it',async()=>{
  const f=fixture();f.io.guard=()=>proof({fileCode:'EPERM'});assert.equal(f.io.guard().qualified,true);
  await assert.rejects(f.run(),{code:'SINGLE_CONTAINMENT_REJECTED'});assert.equal(f.state.opens,0);
});
test('forged namespace/digest is rejected and a recomputed foreign namespace still fails actual-context check',async()=>{
  for(const reseal of [false,true]){
    const f=fixture();f.io.guard=()=>{const d=proof();d.proof.namespace='mnt:[999]';return reseal?seal(d):d;};
    await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('nested writable alias cannot supply an acceptable mount proof',async()=>{
  const f=fixture();f.io.guard=()=>proof({mounts:RO+'3 2 8:1 /alias /fixture/source.sqlite rw - ext4 synthetic rw\n'});
  await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
for(const field of ['source_id','source_sha256','spec_sha256','schema_sha256'])test('wrong '+field+' rejects before SQL',async()=>{
  const f=fixture();f.io.inspect=()=>({...structuredClone(BINDING),[field]:'wrong'});await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
test('missing provenance fails closed and replacement instance cannot reuse the correct byte hash',async()=>{
  for(const mutation of [b=>delete b.spec_sha256,b=>b.source_identity.file.ino='99',b=>b.source_identity.file.change_ns='99']){
    const f=fixture();f.io.inspect=()=>{const b=structuredClone(BINDING);mutation(b);return b;};await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('sidecar, writable source and wrong journal mode bindings fail',async()=>{
  for(const [field,value] of [['inventory',['source.sqlite','source.sqlite-wal']],['file_mode','0600'],['directory_mode','0700'],['journal_mode','wal']]){
    const f=fixture();f.io.inspect=()=>({...structuredClone(BINDING),[field]:value});await assert.rejects(f.run());assert.equal(f.state.opens,0);
  }
});
test('source substitution during acknowledgement rejects before database open',async()=>{
  const f=fixture();let reads=0;f.io.inspect=()=>{const b=structuredClone(BINDING);if(++reads>1)b.source_identity.file.ino='77';return b;};
  await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
for(const kind of ['missing','wrong_hash','wrong_binding','wrong_call','persistence_error'])test('ack '+kind+' prevents SQL',async()=>{
  const f=fixture(),ack=f.io.acknowledge;f.io.acknowledge=async()=>{if(kind==='persistence_error')throw error('TRACE_PERSISTENCE_FAILED');if(kind==='missing')return null;
    const a=await ack();a[kind==='wrong_hash'?'hash':kind==='wrong_binding'?'source_binding_sha256':'call_sha256']='0'.repeat(64);return a;};
  await assert.rejects(f.run());assert.equal(f.state.opens,0);
});
test('wrong crew, role, unsupported tool, multiple metrics and injected SQL are rejected',async()=>{
  const mutations=[r=>r.call.args.crew_id='CREW-04',r=>r.trusted_caller.principal.role='system_admin',r=>r.call.tool='get_data_quality',
    r=>r.call.args.metrics.push('spo2'),r=>r.call.args.SQL='SELECT anything'];
  for(const change of mutations){const f=fixture(),r=structuredClone(REQUEST);change(r);await assert.rejects(f.run(r));assert.equal(f.state.opens,0);}
});
test('authorizer excludes PRAGMA, transactions, functions, schema/other-table reads and second SELECT',async()=>{
  const f=fixture();await f.run();for(const action of [C.SQLITE_PRAGMA,C.SQLITE_TRANSACTION,C.SQLITE_FUNCTION,18,23,24])assert.equal(f.state.authorizer(action,null,null,null),C.SQLITE_DENY);
  assert.equal(f.state.authorizer(C.SQLITE_READ,'fixture_meta','json','main'),C.SQLITE_DENY);
  assert.equal(f.state.authorizer(C.SQLITE_READ,'sqlite_schema','sql','main'),C.SQLITE_DENY);
  assert.equal(f.state.authorizer(C.SQLITE_READ,'observations','json','other'),C.SQLITE_DENY);
  assert.equal(f.state.authorizer(C.SQLITE_SELECT,null,null,null),C.SQLITE_DENY);
});
test('SQL error closes mock connection and cannot publish a completed result',async()=>{
  const f=fixture(),open=f.io.open;f.io.open=o=>{const db=open(o);db.prepare=()=>{throw error('SQLITE_UNAVAILABLE');};return db;};
  await assert.rejects(f.run(),{code:'SQLITE_UNAVAILABLE'});assert.equal(f.state.closes,1);assert.equal(f.state.committed,false);
});
test('missing/wrong row never turns into a fabricated healthy value',async()=>{
  const f=fixture(),open=f.io.open;f.io.open=o=>{const db=open(o),prepare=db.prepare;db.prepare=s=>{const stmt=prepare(s);stmt.get=()=>null;return stmt;};return db;};
  await assert.rejects(f.run());assert.equal(f.state.committed,false);assert.equal(f.state.closes,1);
});
test('source change after SQL rejects the result despite a successful SELECT',async()=>{
  const f=fixture();let reads=0;f.io.inspect=()=>{const b=structuredClone(BINDING);if(++reads===3)b.source_identity.file.change_ns='99';return b;};
  await assert.rejects(f.run());assert.equal(f.state.gets,1);assert.equal(f.state.committed,false);
});
test('first failure closes shared admission, including cleanup/late attempts',async()=>{
  const batch=new QualificationBatch({persist:async r=>({durable:true,hash:r.hash})});let starts=0;
  await assert.rejects(batch.run('first',async p=>{p.markStarted();starts++;throw error('SINGLE_CONTAINMENT_REJECTED');}));
  await assert.rejects(batch.run('late',async p=>{p.markStarted();starts++;}));assert.equal(starts,1);assert.equal((await batch.drain()).blocked,true);
});
async function oracle(subject){const good=fixture();assert.equal((await subject(REQUEST,good.io)).result.data.items[0].value,103);
  const bad=fixture();bad.io.guard=()=>proof({mounts:''});await assert.rejects(()=>subject(REQUEST,bad.io));}
test('control oracle detects accept-all and reject-all substitutes',async()=>{
  await oracle(executeSingle);await assert.rejects(()=>oracle(async()=>({result:{data:{items:[{value:103}]}}})));
  await assert.rejects(()=>oracle(async()=>{throw error('REJECT_ALL');}));summary.accept_all_detected=true;summary.reject_all_detected=true;
});
test('pinned schema provenance validates without SQL; changed or absent provenance rejects',async()=>{
  const bytes=await readFile(new URL('../docs/N16_05_SOURCE_SPEC.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"));assert.equal(verifySchemaProvenance(bytes),sha(SCHEMA));
  assert.throws(()=>verifySchemaProvenance(Buffer.from('{}')));assert.throws(()=>verifySchemaProvenance(Buffer.concat([bytes,Buffer.from(' ')])));
  for(const p of ['/tmp/arbitrary','/fixture/../other','/var/tmp/operational'])assert.throws(()=>inspectSealedSource(p,bytes,INSTANCE));
});
test('legacy worker workflow is byte-identical after removing the single explicitly selected mode branch',async()=>{
  const before=await readFile(new URL('../artifacts/n16-06f-20261029/designated-worker.mjs.original.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),'utf8');
  const now=await readFile(new URL('../services/agent/designated-worker.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),'utf8');
  const branch="  if(mode==='n16-06f-single-select-v1'){\n    const {runTaskSingleSelect}=await import('./single-select-runtime.mjs');\n    await runTaskSingleSelect(request,{DatabaseSync,constants,emit,next});\n  }else{\n";
  assert.equal(now.replace(branch,'').replace('  }\n}catch(e){if(db)','}catch(e){if(db)'),before);
  const p=await readFile(new URL('../services/agent/designated-source.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),'utf8'),old=await readFile(new URL('../artifacts/n16-06f-20261029/designated-source.mjs.original.txt',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),'utf8');
  assert.equal(p.replace(sha(now),'2fac3411b862751097cfce20a06752426dd1548cc68a85a1738dc7c303c449ad'),old);
});
test('single execution function contains no setup/cleanup SQL or metadata query',async()=>{
  const code=executeSingle.toString();assert.doesNotMatch(code,/\.exec\(|PRAGMA|ROLLBACK|BEGIN|QUERIES\.metadata/);
  assert.equal((code.match(/db\.prepare\(/g)??[]).length,1);assert.match(code,/QUERIES\.observation\)\.get\(/);
  const runner=await readFile(new URL('../scripts/n16-single-select-qualification.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs"),'utf8');
  assert.equal((runner.match(/child=spawn\(/g)??[]).length,1);assert.match(runner,/O_CREAT\|F\.O_EXCL/);assert.match(runner,/await commitContainment/);
  assert.ok(runner.indexOf("await trace.append('CALL_STARTED'")<runner.indexOf('permit.markStarted()'));
});
test('real durable trace infrastructure distinguishes mocked failure and committed result without SQL replay',async()=>{
  const root=new URL('../artifacts/n16-master-20261029/compat/vitals-qa-traces/',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-single-select.test.mjs").pathname;await mkdir(root,{recursive:true});
  for(const success of [true,false]){
    const t=await ExecutionTrace.create({mock:true},{root});await t.append('CALL_REQUESTED',{call_id:'call-01'});
    await t.append('CALL_VALIDATED',{call_id:'call-01',tool:CALL.tool});await t.append('CALL_STARTED',{call_id:'call-01',tool:CALL.tool});
    if(success){const f=fixture(),value=await f.run(),reference=await t.result('call-01',{execution_status:'COMPLETED',...value.result});
      await t.append('CALL_COMPLETED',{call_id:'call-01',tool:CALL.tool,result:reference});}
    else await t.append('CALL_FAILED',{call_id:'call-01',tool:CALL.tool,code:'MOCK_SQL_FAILURE'});
    await t.append('RUN_ENDED',{status:success?'COMPLETED':'FAILED'});await t.close();const r=await recoverTrace(t.id,{root});
    assert.equal(r.status,'COMPLETE');assert.equal(r.executed_calls[0].status,success?'COMPLETED':'FAILED');assert.equal(r.replayed_calls,0);
  }
});
