import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,rm,symlink,link,cp } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createQualification,cloneFixture,deriveFixture,sourceInfo,qualificationInfo,readTool,writer,executeFour,closeQualification,inspectFiles,EVIDENCE } from '../services/agent/sqlite-fixture-runner.mjs';
import { CAPS,PROFILES,QUERIES,WRITER_PLAN,rowsFor,projectRows } from '../services/agent/sqlite-fixture-contract.mjs';
import { recoverTrace } from '../services/agent/execution-trace.mjs';
import { VERSION,TOOLS,sha,stable } from '../services/agent/read-contract.mjs';
import { parseArgs } from '../scripts/n16-sqlite-demo.mjs';

const principal=Object.freeze({id:'n16-qa-demo',role:'demo_admin',crew_id:null,demo:true});
const call=(tool='get_current_vitals',crew='CREW-03',metrics=['heart_rate'])=>({schema_version:VERSION,tool,args:tool==='get_open_risk_events'?{crew_id:crew,limit:20}:{crew_id:crew,metrics}});
let q;const evidence={synthetic:true,cases:[],N02_executed:false};
const count=()=>qualificationInfo(q).measurements.length;
const record=(name,value)=>evidence.cases.push({name,...value});
before(async()=>{
  await writeFile(join(EVIDENCE,'frozen-qa-policy.json'),JSON.stringify({schema_version:'astra.n16-04.qa.v1',tests_sha256:sha(await readFile(new URL('./n16-sqlite.test.mjs',import.meta.url))),
    profiles:PROFILES,queries:QUERIES,writer_plan:WRITER_PLAN,caps:CAPS,expected:'g0 HR103 -> commit g1 HR104; snapshot remains103; UNKNOWN negative sources; no operational paths'},null,2)+'\n');
  q=await createQualification();const info=qualificationInfo(q);await writeFile(join(EVIDENCE,'fixtures-manifest.json'),JSON.stringify(info.manifest,null,2)+'\n');
  record('frozen-fixtures',{root:info.root,profiles:PROFILES});
});
after(async()=>{if(q){const info=await closeQualification(q);await writeFile(join(EVIDENCE,'qualification-results.json'),JSON.stringify({...evidence,...info},null,2)+'\n');}});

test('contract is exactly four tools and deterministic authored fixture data',()=>{
  assert.deepEqual(TOOLS,['get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events']);
  for(const p of PROFILES)assert.equal(stable(rowsFor(p)),stable(rowsFor(p)));
  assert.ok(Object.values(QUERIES).every(sql=>sql.startsWith('SELECT ')&&sql.includes('?')));
});
for(const crew of ['CREW-01','CREW-02','CREW-03','CREW-04','CREW-05','CREW-06'])test(`actual authorized SQL reads for ${crew}`,async()=>{
  const s=await cloneFixture(q,'nominal'),before=await inspectFiles(sourceInfo(s).path),v=await readTool(q,s,principal,call('get_current_vitals',crew));
  assert.equal(v.result.data_status,'KNOWN');assert.ok(v.receipt.actual_sql_queries>=2);assert.equal(v.receipt.readOnly,true);
  assert.deepEqual(await inspectFiles(sourceInfo(s).path),before);assert.deepEqual(v.receipt.before,v.receipt.after);
  assert.equal(v.receipt.isolation.database_write_denied,true);assert.equal(v.receipt.isolation.routes,0);assert.equal(v.process.owned_remaining,0);
  record('nominal-'+crew,{receipt:v.receipt,process:v.process});
});
test('four actual SQL tools produce18 durable events and cold recovery without replay',async()=>{
  const s=await cloneFixture(q,'elevated'),run=await executeFour(q,s,principal,'CREW-03');
  assert.equal(run.results.length,4);assert.ok(run.results.every(r=>r.execution_status==='COMPLETED'));
  assert.equal(run.results[0].data.items[0].value,103);assert.equal(run.results[2].data.items[0].value.center,68);
  assert.equal(run.results[3].data.records[0].actual_N02_event,false);assert.equal(run.results[3].data.N02_provenance,'UNKNOWN');
  assert.equal(run.recovery.status,'COMPLETE');assert.equal(run.recovery.committed_events,18);assert.equal(run.recovery.replayed_calls,0);
  record('four-tool-demo',{run});
});
for(const [profile,reason]of [['missing','missing_observation'],['stale','stale_observation'],['malformed','invalid_observation'],['untrusted','source_not_authorized']])test(`${profile} data remains UNKNOWN`,async()=>{
  const s=await cloneFixture(q,profile),v=await readTool(q,s,principal,call());
  assert.equal(v.result.data_status,'UNKNOWN');assert.equal(v.result.data.items[0].value,null);assert.equal(v.result.data.items[0].reason,reason);
  record(profile,{result:v.result,process:v.process});
});
test('quality provenance and empty fixture risk scope never become new health conclusions',async()=>{
  const s=await cloneFixture(q,'nominal'),quality=await readTool(q,s,principal,call('get_data_quality'));
  assert.equal(quality.result.data.items[0].quality.status,'good');assert.equal(quality.result.data.items[0].provenance.freshness,'fresh');
  const risk=await readTool(q,s,principal,call('get_open_risk_events','CREW-01'));assert.equal(risk.result.data_status,'UNKNOWN');assert.deepEqual(risk.result.data.records,[]);
  assert.equal(risk.result.data.actual_N02_event,false);assert.equal(risk.result.inference_performed,false);
});
for(const identity of [null,{role:'system_admin'},{role:'astronaut',crew_id:'CREW-01'},{role:'invented'}])test(`unauthorized ${identity?.role??'anonymous'} never spawns reader`,async()=>{
  const s=await cloneFixture(q,'nominal'),n=count();await assert.rejects(readTool(q,s,identity,call()));assert.equal(count(),n);
});
test('authorized self-read succeeds without caller role overrides',async()=>{
  const s=await cloneFixture(q,'nominal'),v=await readTool(q,s,{id:'self-fixture',role:'astronaut',crew_id:'CREW-03'},call());assert.equal(v.result.data_status,'KNOWN');
  const request=call();request.args.role='demo_admin';const n=count();await assert.rejects(readTool(q,s,principal,request));assert.equal(count(),n);
});
test('invalid names, arguments, crew and paths reject before SQL',async()=>{
  const s=await cloneFixture(q,'nominal'),inputs=[{...call(),tool:'write_alert'},call('get_current_vitals','CREW-99'),call('get_current_vitals','CREW-03',['heart_rate','heart_rate']),
    {...call(),args:{crew_id:'CREW-03',metrics:['heart_rate'],path:'/data/runtime/astra.sqlite'}},{...call(),schema_version:'invented'}];
  const n=count();for(const v of inputs)await assert.rejects(readTool(q,s,principal,v));
  for(const path of ['../../data/runtime/astra.sqlite','file:/forbidden.sqlite','nominal/../elevated'])await assert.rejects(cloneFixture(q,path));
  await assert.rejects(readTool(q,{},principal,call()));assert.equal(count(),n);
});
test('tampering, symlinks, extra files and hardlinks fail before a reader starts',async()=>{
  for(const kind of ['bytes','symlink','extra','hardlink']){
    const s=await cloneFixture(q,'nominal'),path=sourceInfo(s).path,db=join(path,'source.sqlite');
    if(kind==='bytes'){const b=await readFile(db);b[100]^=1;await writeFile(db,b);}
    if(kind==='symlink'){await rm(db);await symlink('/not-authorized/operational.sqlite',db);}
    if(kind==='extra')await writeFile(join(path,'unauthorized.sqlite'),'synthetic negative-control file');
    if(kind==='hardlink')await link(db,join(qualificationInfo(q).root,randomUUID()));
    const n=count();await assert.rejects(readTool(q,s,principal,call()));assert.equal(count(),n,kind);
  }
});
test('SQL authorizer and read-only filesystem reject writes/schema/attach/unapproved reads with unchanged files',async()=>{
  const s=await cloneFixture(q,'nominal'),before=await inspectFiles(sourceInfo(s).path),v=await readTool(q,s,principal,call(),{control:'negative'});
  assert.equal(v.failures.length,4);assert.ok(v.denied>=4);assert.deepEqual(v.before,v.after);assert.deepEqual(await inspectFiles(sourceInfo(s).path),before);
  assert.equal(v.isolation.database_write_denied,true);assert.equal(v.isolation.root_write_denied,true);record('denied-SQL-controls',{result:v});
});
test('byte-identical unauthorized database replacement is rejected by source-instance identity',async()=>{
  const s=await cloneFixture(q,'nominal'),path=sourceInfo(s).path,db=join(path,'source.sqlite'),copy=join(qualificationInfo(q).root,'replacement-'+randomUUID());
  await cp(db,copy);await rm(db);await cp(copy,db);const n=count();
  await assert.rejects(readTool(q,s,principal,call()),e=>e.code==='SOURCE_INSTANCE_CHANGED');assert.equal(count(),n);
});
test('WAL concurrent writer: stable old snapshot, committed new value, checkpoint busy and reader-only noninterference',async()=>{
  const s=await cloneFixture(q,'elevated'),w=await writer(q,s);let committed,checkpoint;
  try{
    const quiet=await readTool(q,s,principal,call());assert.equal(quiet.result.data.items[0].value,103);assert.deepEqual(quiet.receipt.before,quiet.receipt.after);
    const snapshot=await readTool(q,s,principal,call(),{control:'barrier',onSnapshot:async()=>{committed=await w.step('commit');checkpoint=await w.step('truncate');}});
    assert.equal(snapshot.result.data.items[0].value,103);assert.equal(checkpoint.checkpoint.busy,1);
    const newer=await readTool(q,s,principal,call());assert.equal(newer.result.data.items[0].value,104);assert.deepEqual(newer.receipt.before,newer.receipt.after);
    const finished=await w.step('truncate');assert.equal(finished.checkpoint.busy,0);
    record('WAL-concurrency',{quiet,snapshot,newer,writer_commit:committed,checkpoint_while_reader:checkpoint,checkpoint_after_reader:finished});
  }finally{await w.close();}
});
test('exclusive synthetic writer produces bounded BUSY without changing reader permissions',async()=>{
  const s=await cloneFixture(q,'nominal'),w=await writer(q,s,{busy:true});
  try{const begin=performance.now();await assert.rejects(readTool(q,s,principal,call()),e=>e.code==='SQLITE_BUSY');assert.ok(performance.now()-begin<1000);
    record('busy',{result:qualificationInfo(q).measurements.at(-1)});
  }finally{await w.close();}
});
test('missing WAL cannot silently return older generation; missing SHM behavior is recorded without sidecar writes',async()=>{
  const s=await cloneFixture(q,'elevated'),w=await writer(q,s);
  try{
    await w.step('commit');
    const noWal=await deriveFixture(q,s,['source.sqlite-wal']),b1=await inspectFiles(sourceInfo(noWal).path);
    await assert.rejects(readTool(q,noWal,principal,call()));assert.deepEqual(await inspectFiles(sourceInfo(noWal).path),b1);
    const noShm=await deriveFixture(q,s,['source.sqlite-shm']),b2=await inspectFiles(sourceInfo(noShm).path);let outcome;
    try{const v=await readTool(q,noShm,principal,call());assert.equal(v.result.data.items[0].value,104);outcome={status:'READ_SUCCEEDED_WITHOUT_WRITES',result:v};}
    catch(error){outcome={status:'UNAVAILABLE',reason:error.code};}
    assert.deepEqual(await inspectFiles(sourceInfo(noShm).path),b2);record('missing-sidecars',{no_WAL:'REJECTED',no_SHM:outcome});
  }finally{await w.close();}
});
test('missing database never creates a replacement source',async()=>{
  const s=await cloneFixture(q,'nominal'),empty=await deriveFixture(q,s,['source.sqlite']),before=await inspectFiles(sourceInfo(empty).path);
  await assert.rejects(readTool(q,empty,principal,call()));assert.deepEqual(await inspectFiles(sourceInfo(empty).path),before);
});
test('timeouts, cancellation and pre-aborted calls terminate only owned processes and withhold results',async()=>{
  const s=await cloneFixture(q,'nominal');
  await assert.rejects(readTool(q,s,principal,call(),{control:'timeout'}),e=>e.code==='TIMEOUT');
  assert.equal(qualificationInfo(q).measurements.at(-1).owned_remaining,0);
  const abort=new AbortController();await assert.rejects(readTool(q,s,principal,call(),{control:'barrier',signal:abort.signal,onSnapshot:()=>abort.abort()}),e=>e.code==='CANCELLED');
  assert.equal(qualificationInfo(q).measurements.at(-1).owned_remaining,0);
  const pre=new AbortController();pre.abort();const n=count();await assert.rejects(readTool(q,s,principal,call(),{signal:pre.signal}),e=>e.code==='CANCELLED');assert.equal(count(),n);
  record('termination',{measurements:qualificationInfo(q).measurements.slice(-2)});
});
test('held read snapshot enforces its own transaction deadline',async()=>{
  const s=await cloneFixture(q,'nominal');
  await assert.rejects(readTool(q,s,principal,call(),{control:'barrier',onSnapshot:()=>new Promise(()=>{})}),e=>e.code==='READ_TRANSACTION_LIMIT');
  assert.equal(qualificationInfo(q).measurements.at(-1).owned_remaining,0);
});
test('trace start and completion checkpoint failures fail closed with zero/unpublished SQL results',async()=>{
  const s=await cloneFixture(q,'nominal'),n=count();
  await assert.rejects(executeFour(q,s,principal,'CREW-03',{fault:(phase,type)=>{if(phase==='checkpoint'&&type==='CALL_STARTED')throw Error('injected');}}));assert.equal(count(),n);
  await assert.rejects(executeFour(q,s,principal,'CREW-03',{fault:(phase,type)=>{if(phase==='checkpoint'&&type==='CALL_COMPLETED')throw Error('injected');}}));assert.equal(count(),n+1);
});
test('cold trace recovery detects corrupt results and incomplete checkpoints without replay',async()=>{
  const run=evidence.cases.find(c=>c.name==='four-tool-demo').run,root=qualificationInfo(q).root,copy=join(root,'recovery-tests');await mkdir(copy);
  await cp(join(root,'traces',run.run_id),join(copy,run.run_id),{recursive:true});
  const n=count();assert.equal((await recoverTrace(run.run_id,{root:copy})).replayed_calls,0);
  await writeFile(join(copy,run.run_id,'call-01.json'),'{}');await assert.rejects(recoverTrace(run.run_id,{root:copy}));
  await rm(join(copy,run.run_id,'checkpoint.json'));assert.equal((await recoverTrace(run.run_id,{root:copy})).status,'INCOMPLETE');assert.equal(count(),n);
});
test('CLI has no arbitrary source, SQL, role or operational path option',()=>{
  assert.deepEqual(parseArgs(['--fixture=elevated','--crew=CREW-03']),{profile:'elevated',crew:'CREW-03'});
  for(const a of [['--db=/data/runtime/astra.sqlite','--crew=CREW-03'],['--fixture=../../bad','--crew=CREW-03'],['--fixture=nominal','--role=demo_admin']])assert.throws(()=>parseArgs(a));
});
test('single-call public execution binds actual SQL receipt, caller scope and durable result',async()=>{
  const s=await cloneFixture(q,'nominal'),v=await readTool(q,s,principal,call());
  const recovered=await recoverTrace(v.trace_id,{root:join(qualificationInfo(q).root,'traces')});
  assert.equal(recovered.status,'COMPLETE');assert.equal(recovered.committed_events,6);assert.equal(recovered.replayed_calls,0);
  assert.equal(recovered.executed_calls[0].result.receipt.actual_sql_queries,2);
  const rows=(await readFile(join(qualificationInfo(q).root,'traces',v.trace_id,'trace.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].payload.context.principal.id,principal.id);assert.equal(rows[0].payload.context.crew_id,'CREW-03');
});
test('reader concurrency denial cannot start a second SQL process',async()=>{
  const s=await cloneFixture(q,'nominal');let denied=false;
  await readTool(q,s,principal,call(),{control:'barrier',onSnapshot:async()=>{
    const n=count();await assert.rejects(readTool(q,s,principal,call()),e=>e.code==='READER_ALREADY_ACTIVE');assert.equal(count(),n);denied=true;
  }});assert.equal(denied,true);
});
test('result persistence failure never commits or publishes a completed result',async()=>{
  const s=await cloneFixture(q,'nominal'),n=count();
  await assert.rejects(readTool(q,s,principal,call(),{traceFault:(phase)=>{if(phase==='result')throw Error('result persistence injection');}}));
  assert.equal(count(),n+1);
});
test('all immutable original fixture hashes survive qualification unchanged',async()=>{
  const info=qualificationInfo(q);for(const p of PROFILES)assert.deepEqual(await inspectFiles(join(info.root,'originals',p)),info.manifest.fixtures[p].files);
  assert.ok(info.measurements.every(m=>m.max_counted_bytes<CAPS.storage&&m.peak_observed_RSS<CAPS.rss&&m.owned_remaining===0&&m.observer_pending===0));
  assert.ok(info.measurements.some(m=>m.events.some(e=>e.event==='RESULT')));
  const fixture=rowsFor('nominal'),altered=structuredClone(fixture.observations[0]);altered.json='{}';
  assert.throws(()=>projectRows('nominal',0,call('get_current_vitals','CREW-01'),[altered]));
});
