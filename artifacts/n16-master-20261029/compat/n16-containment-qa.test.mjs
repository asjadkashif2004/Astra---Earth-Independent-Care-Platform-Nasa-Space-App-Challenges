// N16-06A: mocks and saved source text only. No SQL module, database or worker execution.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { constants } from 'node:os';
import { probeContainment,mountProof,validateContainmentRecord,commitContainment,bindContainmentReceipt } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/containment-diagnostics.mjs';
import { QualificationBatch,verifyBatchRecord,runQualificationTest } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/qualification-batch.mjs';
import { stable,sha } from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/agent/read-contract.mjs';

const SOURCE={source_id:'astra.n16.designated-synthetic.elevated.v1',sha256:'4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73'};
const RO='1 9 0:1 / / ro - tmpfs synthetic-root rw\n2 1 8:1 /sealed /fixture ro,nosuid,nodev - ext4 synthetic-device rw\n';
const deny=(code='EROFS')=>Object.assign(Error('DO NOT LOG: /home/private/credential?token=secret'),{code,errno:-constants.errno[code],syscall:'open',path:'/home/private/credential'});
const seal=v=>{const {hash,...body}=v;return {...body,hash:sha(stable(body))};};
const receipt=r=>({durable:true,hash:r.hash});
const error=code=>Object.assign(Error(code),{code});
const reports=[];
function mockedIO({code='EROFS',failure=null,at=1,mounts=RO,namespace='mnt:[42]'}={}){
  let actions=0;const probe=i=>()=>{actions++;throw i===at&&failure?failure:deny(code);};
  return {io:{readMountInfo:()=>mounts,mountNamespace:()=>namespace,createRootFile:probe(0),createSourceFile:probe(1),openSourceReadwrite:probe(2)},actions:()=>actions};
}
const valid=()=>probeContainment(mockedIO().io,SOURCE);
function batchFactory({sink=null}={}){const records=[];const batch=new QualificationBatch({persist:async r=>{records.push(r);return sink?sink(r):receipt(r);}});return {batch,records};}
async function noAck(record,{persist=async r=>receipt(r)}={}){
  const blocks=[],acks=[];await assert.rejects(commitContainment(record,SOURCE,{persist,acknowledge:async a=>acks.push(a),block:b=>blocks.push(b)}));
  assert.equal(acks.length,0);assert.equal(blocks.length,1);return blocks[0];
}
after(async()=>{await writeFile(new URL('../artifacts/n16-master-20261029/compat/containment-mock-results.json',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-containment-qa.test.mjs"),JSON.stringify({
  scope:'DETERMINISTIC_MOCKS_ONLY',actual_worker_starts:0,SQL_operations:0,database_files_opened:0,mount_changes:0,
  note:'Positive mount fixtures and errno cases are synthetic test inputs, not observations of the blocked runtime.',reports},null,2)+'\n');});

test('per-mount read-only options establish proof even when backing filesystem super-options say rw',()=>{
  const proof=mountProof(RO,'mnt:[42]');assert.equal(proof.targets.length,3);assert.ok(proof.targets.every(p=>p.read_only));
  assert.equal(proof.targets[1].mount_point,'/fixture');assert.equal(proof.targets[2].mount_id,2);
});
for(const code of ['EACCES','EROFS','EPERM'])test(code+' is accepted only with independent genuine mount proof and matching errno',()=>{
  const mocked=mockedIO({code}),r=probeContainment(mocked.io,SOURCE);assert.equal(r.qualified,true);assert.equal(mocked.actions(),3);
  assert.equal(r.probes[1].code,code);assert.equal(r.probes[1].errno,-constants.errno[code]);assert.equal(r.probes[1].syscall,'open');
  assert.equal(r.probes[1].denial_kind,code==='EROFS'?'mount_denial':'permission_denial');assert.equal(validateContainmentRecord(r,SOURCE),r);
  reports.push({case:code,qualified:r.qualified,diagnostic:r});
});
for(const code of ['EACCES','EROFS','EPERM'])test(code+' alone never qualifies a writable source mount',()=>{
  const m=mockedIO({code,mounts:RO.replace('/fixture ro,','/fixture rw,')}),r=probeContainment(m.io,SOURCE);
  assert.equal(r.qualified,false);assert.equal(r.failed_subcheck,'mount_assertion');assert.equal(m.actions(),0);
});
for(const [name,value] of [['unexpected errno',deny('EIO')],['missing errno',{code:'EROFS',syscall:'open'}],
  ['missing error code',{errno:-30,syscall:'open'}],['mismatched errno',{code:'EACCES',errno:-30,syscall:'open'}]])test(name+' rejects and identifies the exact failed sub-check',()=>{
  const r=probeContainment(mockedIO({failure:value}).io,SOURCE);assert.equal(r.qualified,false);assert.equal(r.failed_subcheck,'source_directory');
  assert.equal(r.probes[1].operation,'create_source_file');assert.equal(r.probes[1].expected,'write_denied_on_verified_read_only_mount');assert.equal(r.probes[1].observed,'denied');
  assert.equal(validateContainmentRecord(r,SOURCE),r);
});
test('missing/malformed mountinfo and self-asserted booleans cannot authorize write probes',()=>{
  for(const mounts of ['', 'not mountinfo', JSON.stringify({read_only:true})]){
    const m=mockedIO({mounts}),r=probeContainment(m.io,SOURCE);assert.equal(r.qualified,false);assert.equal(m.actions(),0);
  }
  const r=valid();r.proof={read_only:true};assert.throws(()=>validateContainmentRecord(seal(r),SOURCE));
});
test('closest nested writable file mount overrides read-only directory proof',()=>{
  const mounts=RO+'3 2 8:1 /file /fixture/source.sqlite rw - ext4 synthetic-device ro\n';
  const m=mockedIO({mounts}),r=probeContainment(m.io,SOURCE);assert.equal(r.qualified,false);assert.equal(m.actions(),0);
});
test('ambiguous overmounts cannot be selected as convenient read-only proof',()=>{
  const m=mockedIO({mounts:RO+'3 1 8:1 /other /fixture rw - ext4 synthetic-device ro\n'}),r=probeContainment(m.io,SOURCE);
  assert.equal(r.qualified,false);assert.equal(m.actions(),0);
});
test('a write that succeeds is a genuine rejection; later probes do not run',()=>{
  const m=mockedIO();let sourceAttempts=0;m.io.createRootFile=()=>{};m.io.createSourceFile=()=>sourceAttempts++;
  const r=probeContainment(m.io,SOURCE);assert.equal(r.qualified,false);assert.equal(r.failed_subcheck,'root');assert.equal(r.probes[0].observed,'write_succeeded');assert.equal(sourceAttempts,0);
});
test('namespace or mountinfo change invalidates otherwise successful denial probes',()=>{
  for(const field of ['namespace','mountinfo']){
    const m=mockedIO();let reads=0;
    if(field==='namespace')m.io.mountNamespace=()=>++reads===1?'mnt:[42]':'mnt:[43]';
    else m.io.readMountInfo=()=>++reads===1?RO:RO+'3 1 0:2 / /unrelated ro - tmpfs synthetic rw\n';
    const r=probeContainment(m.io,SOURCE);assert.equal(r.qualified,false);assert.equal(r.failed_subcheck,'mount_changed');
  }
});
test('diagnostics retain only code/errno/operation and sanitized source identity',()=>{
  const r=probeContainment(mockedIO({code:'EACCES'}).io,SOURCE),text=JSON.stringify(r);
  assert.ok(text.includes('EACCES'));for(const secret of ['/home/private','credential','token=secret','DO NOT LOG'])assert.equal(text.includes(secret),false);
  assert.equal(r.source.source_id,SOURCE.source_id);assert.deepEqual(Object.keys(r.probes[0]).sort(),['accepted','code','denial_kind','errno','expected','observed','operation','stage','syscall'].sort());
});
test('missing/corrupt diagnostic trace is rejected, including a forged qualified flag',async()=>{
  for(const bad of [null,undefined,{}, {...valid(),hash:'0'.repeat(64)},seal({...valid(),qualified:false})])await noAck(bad);
  const injected=valid();injected.probes[0].code='/home/private';await noAck(seal(injected));
});
test('valid diagnostics persist before acknowledgement; no SQLite or native callback is present',async()=>{
  const r=valid(),order=[];await commitContainment(r,SOURCE,{persist:async v=>{order.push('persist');return receipt(v);},acknowledge:async a=>{order.push('ack');assert.equal(a.hash,r.hash);},block:()=>assert.fail('valid positive must not block')});
  assert.deepEqual(order,['persist','ack']);
});
test('pending persistence cannot release the worker gate early',async()=>{
  let resolve,ack=0;const pending=new Promise(r=>resolve=r),record=valid();
  const promise=commitContainment(record,SOURCE,{persist:()=>pending,acknowledge:async()=>ack++,block:()=>assert.fail('positive')});
  await Promise.resolve();assert.equal(ack,0);resolve(receipt(record));await promise;assert.equal(ack,1);
});
for(const mode of ['throw','missing_receipt','not_durable','wrong_digest'])test('diagnostic persistence '+mode+' blocks acknowledgement',async()=>{
  const block=await noAck(valid(),{persist:async r=>{if(mode==='throw')throw Error('disk failure');return mode==='missing_receipt'?undefined:mode==='not_durable'?{durable:false,hash:r.hash}:{durable:true,hash:'0'.repeat(64)};}});
  assert.equal(block.code,'DIAGNOSTIC_PERSISTENCE_FAILED');
});
test('negative diagnostic is durably retained and never acknowledged',async()=>{
  const r=probeContainment(mockedIO({failure:deny('EIO')}).io,SOURCE);let persisted=0;
  const block=await noAck(r,{persist:async v=>{persisted++;return receipt(v);}});assert.equal(persisted,1);assert.equal(block.code,'SOURCE_NOT_READONLY');assert.equal(block.stage,'source_directory');
});
test('first blocking guard is latched before pending diagnostic persistence finishes',async()=>{
  let resolve,acks=0;const pending=new Promise(r=>resolve=r),record=probeContainment(mockedIO({failure:deny('EIO')}).io,SOURCE),blocks=[];
  const promise=commitContainment(record,SOURCE,{persist:()=>pending,acknowledge:async()=>acks++,block:b=>blocks.push(b)});
  assert.equal(blocks[0]?.code,'SOURCE_NOT_READONLY');assert.equal(acks,0);resolve(receipt(record));await assert.rejects(promise,e=>e.code==='SOURCE_NOT_READONLY');
});
test('a stopped batch cannot acknowledge a pending formerly-positive diagnostic',async()=>{
  const {batch}=batchFactory();let resolve,acks=0;const pending=new Promise(r=>resolve=r),record=valid();
  const promise=commitContainment(record,SOURCE,{persist:()=>pending,acknowledge:async()=>{batch.assertOpen();acks++;},block:b=>batch.trip(b)});
  batch.trip({code:'SOURCE_NOT_READONLY',stage:'other_guard'});resolve(receipt(record));await assert.rejects(promise,e=>e.code==='DIAGNOSTIC_ACK_FAILED');
  assert.equal(acks,0);assert.equal((await batch.drain()).first_failure.stage,'other_guard');
});
test('acknowledgement failure is visible and fail-closed',async()=>{
  const blocked=[];await assert.rejects(commitContainment(valid(),SOURCE,{persist:async r=>receipt(r),acknowledge:async()=>{throw Error('pipe closed');},block:r=>blocked.push(r)}),e=>e.code==='DIAGNOSTIC_ACK_FAILED');assert.equal(blocked.length,1);
});
test('positive receipt is bound to the exact acknowledged record and namespace',()=>{
  const r=valid(),receipt={isolation:{containment_diagnostic_sha256:r.hash,mount_namespace:r.proof.namespace}};
  assert.equal(bindContainmentReceipt(r,receipt,SOURCE),r);
});
test('missing, corrupted or wrong-record receipt cannot substitute a valid quotation of proof',()=>{
  const r=valid();for(const receipt of [null,{}, {isolation:{containment_diagnostic_sha256:'0'.repeat(64),mount_namespace:r.proof.namespace}},
    {isolation:{containment_diagnostic_sha256:r.hash,mount_namespace:'mnt:[999]'}}])assert.throws(()=>bindContainmentReceipt(r,receipt,SOURCE));
});
test('failed proof remains unusable even if a receipt repeats its digest',()=>{
  const r=probeContainment(mockedIO({failure:deny('EIO')}).io,SOURCE);
  assert.throws(()=>bindContainmentReceipt(r,{isolation:{containment_diagnostic_sha256:r.hash,mount_namespace:r.proof.namespace}},SOURCE));
});

test('positive mock launch completes; a reject-everything latch fails this control',async()=>{
  const {batch}=batchFactory();let launched=0;assert.equal(await batch.run('positive',async p=>{p.markStarted();launched++;return 17;}),17);
  const v=await batch.drain();assert.equal(launched,1);assert.equal(v.blocked,false);assert.equal(v.attempted_startups,1);
});
test('first worker failure blocks all queued and subsequent startup admissions',async()=>{
  const {batch,records}=batchFactory();let release,starts=0;const pending=new Promise(r=>release=r);
  const first=batch.run('first',async p=>{p.markStarted();starts++;await pending;throw error('SOURCE_NOT_READONLY');});
  const queued=batch.run('queued',async p=>{p.markStarted();starts++;});
  const settled=Promise.allSettled([first,queued]);release();const outcomes=await settled;assert.equal(outcomes[0].status,'rejected');assert.equal(outcomes[1].reason.code,'BATCH_NOT_RUN');
  await assert.rejects(batch.run('late',async p=>{p.markStarted();starts++;}),e=>e.code==='BATCH_NOT_RUN');const state=await batch.drain();
  assert.equal(starts,1);assert.equal(state.attempted_startups,1);assert.equal(state.not_run.length,2);assert.equal(state.first_failure.code,'SOURCE_NOT_READONLY');
  assert.equal(verifyBatchRecord(records[0]).attempts,1);reports.push({case:'first_failure_latch',mock_startups:starts,state});
});
test('already-running mock worker is cancelled, drained and cannot start work from cleanup',async()=>{
  const {batch}=batchFactory();let cleaned=0,cleanupStarts=0;
  const current=batch.run('running',async p=>{p.markStarted();try{await new Promise((_,reject)=>p.signal.addEventListener('abort',()=>reject(error('CANCELLED')),{once:true}));}
    finally{cleaned++;await assert.rejects(batch.run('cleanup_callback',async q=>{q.markStarted();cleanupStarts++;}),e=>e.code==='BATCH_NOT_RUN');}});
  const done=Promise.allSettled([current]);batch.trip({code:'SOURCE_NOT_READONLY',stage:'source_file'});await done;const state=await batch.drain();
  assert.equal(cleaned,1);assert.equal(cleanupStarts,0);assert.equal(state.running,0);assert.equal(state.queued,0);assert.equal(state.attempted_startups,1);
});
test('multiple pending starts are cancelled before they can invoke a launcher',async()=>{
  const {batch}=batchFactory();let calls=0,release;const p=new Promise(r=>release=r);
  const work=[batch.run('active',async token=>{token.markStarted();calls++;await p;throw error('SOURCE_NOT_READONLY');})];
  for(const name of ['pending_a','pending_b','pending_c'])work.push(batch.run(name,async token=>{token.markStarted();calls++;}));
  const done=Promise.allSettled(work);release();await done;const state=await batch.drain();assert.equal(calls,1);assert.equal(state.not_run.length,3);assert.equal(state.queued,0);
});
test('first failure is monotonic; a late positive completion cannot undo it',async()=>{
  const {batch}=batchFactory();let release;const p=new Promise(r=>release=r);
  const current=batch.run('late_success',async permit=>{permit.markStarted();await p;return 'should not pass';});const done=Promise.allSettled([current]);
  batch.trip({code:'SOURCE_NOT_READONLY',stage:'source_file'});batch.trip({code:'DIAGNOSTIC_PERSISTENCE_FAILED',stage:'later'});release();
  const result=await done;assert.equal(result[0].status,'rejected');assert.equal((await batch.drain()).first_failure.code,'SOURCE_NOT_READONLY');
});
test('failure to confirm cleanup is reported, then test-owned mock is explicitly released',async()=>{
  const {batch}=batchFactory();let release;const p=new Promise(r=>release=r);const work=batch.run('stuck',async token=>{token.markStarted();await p;});const done=Promise.allSettled([work]);
  batch.trip({code:'SOURCE_NOT_READONLY',stage:'source_file'});await assert.rejects(batch.drain({timeoutMs:1}),e=>e.code==='BATCH_CLEANUP_FAILED');release();await done;assert.equal((await batch.drain()).running,0);
});
test('failed batch trace persistence leaves latch closed and reports evidence failure',async()=>{
  const {batch}=batchFactory({sink:async()=>{throw Error('cannot persist');}});
  await assert.rejects(batch.run('guard',async p=>{p.markStarted();throw error('SOURCE_NOT_READONLY');}));
  await assert.rejects(batch.drain(),e=>e.code==='BATCH_TRACE_PERSISTENCE_FAILED');assert.equal(batch.state().blocked,true);
  await assert.rejects(batch.run('late',()=>assert.fail('must not launch')),e=>e.code==='BATCH_NOT_RUN');
});
test('hung batch persistence cannot turn drain into an unbounded successful wait',async()=>{
  let resolve;const p=new Promise(r=>resolve=r),{batch}=batchFactory({sink:()=>p});
  batch.trip({code:'SOURCE_NOT_READONLY',stage:'source_file'});await assert.rejects(batch.drain({timeoutMs:1}),e=>e.code==='BATCH_CLEANUP_FAILED');
  resolve({durable:true,hash:'bad'});await assert.rejects(batch.drain(),e=>e.code==='BATCH_TRACE_PERSISTENCE_FAILED');assert.equal(batch.state().blocked,true);
});
test('missing/corrupted batch evidence cannot be described as a valid recovered latch',async()=>{
  const {batch,records}=batchFactory();batch.trip({code:'SOURCE_NOT_READONLY',stage:'source_file'});await batch.drain();
  assert.throws(()=>verifyBatchRecord(null),e=>e.code==='BATCH_TRACE_MISSING');assert.throws(()=>verifyBatchRecord({...records[0],attempts:99}),e=>e.code==='BATCH_TRACE_CORRUPT');
});
test('a guard failure cannot be exempted as an expected timeout/negative test',async()=>{
  const {batch}=batchFactory();await assert.rejects(batch.run('guard',()=>assert.fail('not admitted'),{expectedErrors:['SOURCE_NOT_READONLY']}),e=>e.code==='INVALID_BATCH_POLICY');assert.equal(batch.state().attempted_startups,0);
});
test('expected cancellation still rejects its call without creating a passing result',async()=>{
  const {batch}=batchFactory();await assert.rejects(batch.run('expected_cancel',async p=>{p.markStarted();throw error('CANCELLED');},{expectedErrors:['CANCELLED']}),e=>e.code==='CANCELLED');assert.equal(batch.state().blocked,false);
});
test('wrapper keeps the executed first failure visible and marks later tests NOT RUN',async()=>{
  const {batch}=batchFactory();let skipped=0,bodies=0;const t={skip:reason=>{assert.match(reason,/NOT RUN/);skipped++;}};
  await assert.rejects(runQualificationTest(batch,t,()=>batch.run('first',async p=>{p.markStarted();throw error('SOURCE_NOT_READONLY');})),e=>e.code==='SOURCE_NOT_READONLY');
  runQualificationTest(batch,t,()=>bodies++);assert.equal(skipped,1);assert.equal(bodies,0);await batch.drain();
});

test('diagnostic worker preserves the complete frozen SQL/authorizer/result block byte-for-byte',async()=>{
  const old=await readFile(new URL('../services/agent/sqlite-fixture-process.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-containment-qa.test.mjs"),'utf8'),now=await readFile(new URL('../services/agent/designated-worker.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-containment-qa.test.mjs"),'utf8');
  const marker='    const call=validateCall(request.call),before=files();';
  const block=old.slice(old.indexOf(marker),old.indexOf('\n  }\n}catch(e)',old.indexOf(marker)));
  assert.ok(now.includes(block));assert.equal(sha(block),'c724b37a94955a91943bb2b71914d6e6a65c73697720737a23127bf4c165081e');
  assert.ok(now.indexOf('const acknowledgement=await next()')<now.indexOf('new DatabaseSync'));
  assert.ok(now.includes("acknowledgement.hash!==diagnostic.hash"));
});
test('real wiring uses one batch gate and records a startup immediately before spawn; old tests use skip wrapper',async()=>{
  const source=await readFile(new URL('../services/agent/designated-source.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-containment-qa.test.mjs"),'utf8');
  assert.match(source,/return qualificationBatch.run\(call.tool/);assert.match(source,/qualificationBatch.assertOpen\(\);permit.markStarted\(\);\s*nativeStart/);
  assert.match(source,/commitContainment\(event.diagnostic/);assert.match(source,/await diagnosticWork/);
  const harness=await readFile(new URL('./n16-designated.test.mjs',"file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/n16-containment-qa.test.mjs"),'utf8');assert.match(harness,/runQualificationTest\(\{state:qualificationBatchState\}/);
  assert.match(harness,/QA_OUTPUT/);assert.doesNotMatch(harness,/join\(EVIDENCE,'(?:frozen-qa|qualification|demo)\.json'\)/);
});
