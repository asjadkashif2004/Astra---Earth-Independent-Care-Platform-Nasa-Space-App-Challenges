import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, appendFile, cp, rm, symlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { CREW } from '../packages/contracts.mjs';
import { createReadContext, closeReadContext, contextSummary, FIXTURE_ROOT, observationState, readContext } from '../services/agent/read-context.mjs';
import { ExecutionTrace, recoverTrace, TRACE_ROOT } from '../services/agent/execution-trace.mjs';
import { ReadDispatcher, projectFixture } from '../services/agent/read-tools.mjs';
import { VERSION, TOOLS, LIMITS, parseJSON, validateCall, stable } from '../services/agent/read-contract.mjs';
import { parseArgs, DEMO_PRINCIPAL } from '../scripts/n16-readonly-demo.mjs';

const call = (tool = TOOLS[0], crew = 'CREW-03') => ({schema_version:VERSION, tool,
  args:tool === TOOLS[3] ? {crew_id:crew, limit:20} : {crew_id:crew, metrics:['heart_rate','respiratory_rate','spo2']}});
async function setup(t, {profile = 'nominal', principal = DEMO_PRINCIPAL, fault, workerFactory, timeoutMs, copy = false} = {}) {
  const temp = await mkdtemp('/tmp/astra-n16-qa-');
  t.after(() => rm(temp, {recursive:true, force:true}));
  const traceRoot = join(temp, 'traces'); await mkdir(traceRoot);
  let fixtureRoot = FIXTURE_ROOT;
  if (copy) { fixtureRoot = join(temp, 'fixtures'); await cp(FIXTURE_ROOT, fixtureRoot, {recursive:true}); }
  const context = await createReadContext(profile, principal, {fixtureRoot});
  const trace = await ExecutionTrace.create(contextSummary(context), {root:traceRoot, fault});
  t.after(async () => { try { await trace.close(); } finally { await closeReadContext(context); } });
  return {temp, traceRoot, fixtureRoot, context, trace,
    dispatcher:new ReadDispatcher(context, trace, {workerFactory, timeoutMs})};
}
class IdleWorker extends EventEmitter {
  constructor() { super(); this.terminated = 0; }
  terminate() { this.terminated++; this.emit('exit', 1); return Promise.resolve(1); }
}
test('exactly four versioned tools; no action or arbitrary editor exposed', () => {
  assert.deepEqual(TOOLS, ['get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events']);
  assert.equal(LIMITS.calls, 4);
});
test('nominal four real workers read fixtures and recover durable results', async t => {
  const s = await setup(t), results = [];
  for (const tool of TOOLS) results.push(await s.dispatcher.dispatch(call(tool)));
  assert.ok(results.every(r => r.execution_status === 'COMPLETED' && r.read_receipt.actual_file_reads === 1));
  assert.ok(results.every(r => r.read_receipt.thread_id > 0 && r.read_receipt.bytes_read > 1000));
  assert.equal(results[0].data.items[0].value, 68); assert.equal(results[1].data.items[0].freshness, 'fresh');
  assert.equal(results[2].data.items[0].value.method, 'authored_fixture_reference');
  assert.equal(results[3].data_status, 'UNKNOWN'); assert.equal(results[3].data.record_origin, 'unavailable');
  await s.trace.append('RUN_ENDED', {status:'COMPLETED', calls:4});
  const recovered = await recoverTrace(s.trace.id, {root:s.traceRoot});
  assert.equal(recovered.status, 'COMPLETE'); assert.equal(recovered.executed_calls.length, 4);
  assert.equal(recovered.replayed_calls, 0); assert.equal(recovered.executed_calls[0].result.data.items[0].value, 68);
  const log = await readFile(join(s.traceRoot,s.trace.id,'trace.jsonl'), 'utf8');
  assert.equal(log.split('\n').filter(x => x.includes('CALL_STARTED')).length, 4);
  assert.equal(log.split('\n').filter(x => x.includes('CALL_COMPLETED')).length, 4);
  await assert.rejects(s.dispatcher.dispatch(call()), /WORKFLOW_CLOSED/);
});
for (const c of CREW) test('canonical crew scope and actual source record: ' + c.id, async t => {
  const s = await setup(t); const r = await s.dispatcher.dispatch(call(TOOLS[0], c.id));
  assert.equal(r.execution_status, 'COMPLETED'); assert.equal(r.crew_id, c.id);
  assert.ok(r.data.items.every(i => i.provenance.event_id.includes(c.id)));
  assert.equal(r.provenance.as_of, '2026-11-14T11:00:00.000Z');
});
for (const [profile, expected, status] of [['elevated',103,'KNOWN'],['missing',null,'PARTIAL'],['stale',null,'UNKNOWN']])
  test('real ' + profile + ' read, not a static nominal response', async t => {
    const s = await setup(t,{profile}), r = await s.dispatcher.dispatch(call());
    assert.equal(r.execution_status,'COMPLETED'); assert.equal(r.data.items[0].value,expected); assert.equal(r.data_status,status);
    assert.equal(r.provenance.fixture_id,profile); assert.equal(r.inference_performed,false); assert.equal(r.clinical_support,false);
    if (profile==='stale') { assert.equal(r.data.items[0].provenance.observed_at,'2026-11-14T10:59:40.000Z'); assert.equal(r.data.items[0].reason,'stale_observation'); }
  });
test('authoritative quality handling never turns suspect/artifact/future data into known vitals', () => {
  const base={schema_version:'astra.telemetry.v1', event_id:'test:1', mission_id:'MARS-DEMO-01',crew_id:'CREW-03',ts:'2026-11-14T11:00:00.000Z',received_ts:'2026-11-14T11:00:00.000Z',metric:{system:'http://loinc.org',code:'8867-4',name:'heart_rate',value:68,unit:'/min'},quality:{status:'good',confidence:0.99,artifact:false},source:{kind:'simulator',device_id:'fixture',sampling_hz:1,clock:'mission_simulation'},provenance:{synthetic:true,scenario_id:'fixture',seed:1,generator_version:'fixture-v1'}};
  for (const mutate of [e=>e.quality.status='suspect',e=>e.quality.artifact=true,e=>e.ts='2026-11-14T11:01:00.000Z',e=>e.metric.unit='invented']) {
    const e=structuredClone(base);mutate(e);assert.equal(observationState(e,base.ts).status,'UNKNOWN');
  }
  assert.equal(observationState(null,base.ts).status,'UNKNOWN');
});
test('missing baseline projection remains UNKNOWN, never filled from population defaults', async t => {
  const s=await setup(t), f=structuredClone(readContext(s.context).fixture); f.crew[2].baselines.heart_rate=null;
  const r=projectFixture(f,TOOLS[2],call(TOOLS[2]).args,'fixture'); assert.equal(r.data.items[0].data_status,'UNKNOWN');assert.equal(r.data.items[0].value,null);
});
test('astronaut self scope denies other crew before worker invocation', async t => {
  let workers=0; const s=await setup(t,{principal:{id:'test-astronaut',role:'astronaut',crew_id:'CREW-03',demo:true},workerFactory:()=>{workers++;return new IdleWorker();}});
  const r=await s.dispatcher.dispatch(call(TOOLS[0],'CREW-01'));
  assert.equal(r.execution_status,'DENIED');assert.equal(workers,0);
  const recovered=await recoverTrace(s.trace.id,{root:s.traceRoot});assert.equal(recovered.executed_calls.length,0);
});
test('astronaut self and viewer read policy work; system_admin has no implicit read privilege', async t => {
  for (const principal of [{id:'self',role:'astronaut',crew_id:'CREW-03',demo:true},{id:'viewer',role:'viewer',crew_id:null,demo:true}]) {
    const s=await setup(t,{principal}); assert.equal((await s.dispatcher.dispatch(call())).execution_status,'COMPLETED');
  }
  await assert.rejects(createReadContext('nominal',{id:'system',role:'system_admin',crew_id:null,demo:true}), /cannot perform/);
  await assert.rejects(createReadContext('nominal',{id:'bad',role:'unknown',crew_id:null,demo:true}));
});
for (const [name, mutate] of [
  ['unknown tool',r=>r.tool='get_environment'],['action',r=>r.tool='queue_ground_message'],['prototype tool',r=>r.tool='__proto__'],
  ['crew',r=>r.args.crew_id='CREW-99'],['role escalation',r=>r.args.role='demo_admin'],['caller identity',r=>r.principal={role:'demo_admin'}],
  ['extra argument',r=>r.args.path='/private'],['duplicate metric',r=>r.args.metrics=['heart_rate','heart_rate']],['wrong metric',r=>r.args.metrics=['prediction']],
  ['nonfinite',r=>r.args.metrics=NaN],['null arguments',r=>r.args=null]
]) test('reject ' + name + ' without any handler executing',async t=>{
  let workers=0;const s=await setup(t,{workerFactory:()=>{workers++;return new IdleWorker();}}),r=call();mutate(r);
  assert.equal((await s.dispatcher.dispatch(r)).execution_status,'DENIED');assert.equal(workers,0);
  assert.ok(!(await readFile(join(s.traceRoot,s.trace.id,'trace.jsonl'),'utf8')).includes('CALL_STARTED'));
});
test('risk limit is strict integer bounded; values are never coerced',()=>{
  for(const limit of [0,21,1.5,'2',NaN,Infinity])assert.throws(()=>validateCall({...call(TOOLS[3]),args:{crew_id:'CREW-03',limit}}));
});
test('strict JSON rejects duplicate/escaped keys, malformed grammar and unsafe names',()=>{
  for(const text of ['{"tool":"a","tool":"b"}','{"a":1,"\\u0061":2}','{"__proto__":{}}','[1,]','{"a":01}','1e999','{"a":true} trailing','\u00a0{}'])assert.throws(()=>parseJSON(text));
  assert.deepEqual(parseJSON('{"x":[true,false,null,1.25,"ok"]}'),{x:[true,false,null,1.25,'ok']});
});
test('accessors and forged opaque contexts are rejected without executing getters',async t=>{
  let invoked=false;const s=await setup(t);const input={get schema_version(){invoked=true;throw Error('unsafe');}};
  assert.equal((await s.dispatcher.dispatch(input)).execution_status,'DENIED');assert.equal(invoked,false);
  assert.throws(()=>readContext({}),/UNTRUSTED_CONTEXT/);
  assert.throws(()=>{readContext(s.context).principal.role='demo_admin';},TypeError);
});
test('hash tampering and unauthorized manifest substitutions stop at preflight',async t=>{
  const tmp=await mkdtemp('/tmp/astra-n16-tamper-');t.after(()=>rm(tmp,{recursive:true,force:true}));
  for(const name of ['nominal.json','manifest.json']){
    const dir=join(tmp,name);await cp(FIXTURE_ROOT,dir,{recursive:true});await appendFile(join(dir,name),' ');
    await assert.rejects(createReadContext('nominal',DEMO_PRINCIPAL,{fixtureRoot:dir}),/HASH_MISMATCH/);
  }
});
test('profile traversal, unexpected member and symlink fixtures are rejected',async t=>{
  for(const profile of ['../nominal','/tmp/nominal','nominal.json'])await assert.rejects(createReadContext(profile,DEMO_PRINCIPAL));
  await assert.rejects(createReadContext('nominal',DEMO_PRINCIPAL,{view:'earth'}));
  const tmp=await mkdtemp('/tmp/astra-n16-path-');t.after(()=>rm(tmp,{recursive:true,force:true}));
  const dir=join(tmp,'fixtures');await cp(FIXTURE_ROOT,dir,{recursive:true});await symlink(dir,join(tmp,'linked'));
  await assert.rejects(createReadContext('nominal',DEMO_PRINCIPAL,{fixtureRoot:join(tmp,'linked')}),/UNSAFE_DIRECTORY/);
  await rm(join(dir,'nominal.json'));await symlink(join(dir,'elevated.json'),join(dir,'nominal.json'));
  await assert.rejects(createReadContext('nominal',DEMO_PRINCIPAL,{fixtureRoot:dir}));
  await rm(join(dir,'nominal.json'));await cp(join(FIXTURE_ROOT,'nominal.json'),join(dir,'nominal.json'));
  await writeFile(join(dir,'unexpected.txt'),'fixture');await assert.rejects(createReadContext('nominal',DEMO_PRINCIPAL,{fixtureRoot:dir}),/UNEXPECTED_FIXTURE_MEMBER/);
});
test('fixture is re-read and rehashed by actual worker after preflight',async t=>{
  const s=await setup(t,{copy:true});await appendFile(join(s.fixtureRoot,'nominal.json'),' ');
  const r=await s.dispatcher.dispatch(call());assert.equal(r.execution_status,'FAILED');assert.equal(r.reason,'FIXTURE_HASH_MISMATCH');
});
test('opened directory capability prevents parent-path replacement from substituting fixture bytes',async t=>{
  const s=await setup(t,{copy:true});await rename(s.fixtureRoot,s.fixtureRoot+'-retained');await cp(FIXTURE_ROOT,s.fixtureRoot,{recursive:true});
  await appendFile(join(s.fixtureRoot,'nominal.json'),' substitute');
  const r=await s.dispatcher.dispatch(call());assert.equal(r.execution_status,'COMPLETED');assert.equal(r.data.items[0].value,68);
});
test('tool deadline terminates owned work and records timeout, never success',async t=>{
  const worker=new IdleWorker(),s=await setup(t,{workerFactory:()=>worker,timeoutMs:5});
  const r=await s.dispatcher.dispatch(call());assert.equal(r.execution_status,'TIMEOUT');assert.equal(worker.terminated,1);
  const recovery=await recoverTrace(s.trace.id,{root:s.traceRoot});assert.equal(recovery.executed_calls[0].status,'TIMEOUT');
});
test('cancellation during worker execution terminates owned work and rejects late result',async t=>{
  const control=new AbortController(),worker=new IdleWorker();
  const s=await setup(t,{workerFactory:()=>{queueMicrotask(()=>control.abort());return worker;}});
  const r=await s.dispatcher.dispatch(call(),{signal:control.signal});assert.equal(r.execution_status,'CANCELLED');assert.equal(worker.terminated,1);
  worker.emit('message',{result:'late'});await assert.rejects(s.dispatcher.dispatch(call()),/WORKFLOW_CLOSED/);
});
test('pre-cancelled request never starts worker or fake completed step',async t=>{
  let calls=0;const s=await setup(t,{workerFactory:()=>{calls++;return new IdleWorker();}}),a=new AbortController();a.abort();
  assert.equal((await s.dispatcher.dispatch(call(),{signal:a.signal})).execution_status,'CANCELLED');assert.equal(calls,0);
});
for(const stage of ['append','checkpoint','result'])test('trace '+stage+' failure is fatal, durable preceding records survive',async t=>{
  let workers=0;const fault=(where,what)=>{if(where===stage && (stage==='result'||what==='CALL_STARTED'))throw Error('simulated EIO');};
  const s=await setup(t,{fault,...(stage==='result'?{}:{workerFactory:()=>{workers++;return new IdleWorker();}})});
  await assert.rejects(s.dispatcher.dispatch(call()),/TRACE_PERSISTENCE_FAILED/);assert.equal(s.trace.failed,true);
  if(stage!=='result')assert.equal(workers,0);
  const r=await recoverTrace(s.trace.id,{root:s.traceRoot});assert.equal(r.status,'INCOMPLETE');assert.equal(r.replayed_calls,0);
});
test('checkpoint failure after result cannot publish a success from an uncommitted tail',async t=>{
  const s=await setup(t,{fault:(where,type)=>{if(where==='checkpoint'&&type==='CALL_COMPLETED')throw Error('simulated EIO');}});
  await assert.rejects(s.dispatcher.dispatch(call()),/TRACE_PERSISTENCE_FAILED/);
  const r=await recoverTrace(s.trace.id,{root:s.traceRoot});assert.equal(r.status,'INCOMPLETE');assert.equal(r.uncommitted_tail,true);
  assert.equal(r.executed_calls[0].status,'INCOMPLETE');
});
test('trace quota stops before a read, without relaxing the one-megabyte bound',async t=>{
  let workers=0;const s=await setup(t,{workerFactory:()=>{workers++;return new IdleWorker();}});s.trace.bytes=LIMITS.trace;
  await assert.rejects(s.dispatcher.dispatch(call()),/TRACE_SIZE_LIMIT/);assert.equal(workers,0);
});
test('interruption recovery is read-only and never re-executes unfinished calls',async t=>{
  const s=await setup(t);await s.trace.append('CALL_REQUESTED',{call_id:'call-01'});
  await s.trace.append('CALL_VALIDATED',{call_id:'call-01',tool:TOOLS[0]});await s.trace.append('CALL_STARTED',{call_id:'call-01',tool:TOOLS[0]});
  const file=join(s.traceRoot,s.trace.id,'trace.jsonl');await appendFile(file,'{"partial');const before=await readFile(file);
  const r=await recoverTrace(s.trace.id,{root:s.traceRoot});assert.equal(r.status,'INCOMPLETE');assert.equal(r.executed_calls[0].status,'INCOMPLETE');
  assert.equal(r.replayed_calls,0);assert.deepEqual(await readFile(file),before);
});
test('result corruption and invalid lifecycle cannot recover as complete',async t=>{
  const s=await setup(t);await s.dispatcher.dispatch(call());await appendFile(join(s.traceRoot,s.trace.id,'call-01.json'),' ');
  await assert.rejects(recoverTrace(s.trace.id,{root:s.traceRoot}),/RESULT_CORRUPT/);
  const b=await setup(t);await b.trace.append('CALL_COMPLETED',{call_id:'call-01',result:{file:'call-01.json'}});
  await assert.rejects(recoverTrace(b.trace.id,{root:b.traceRoot}),/TRACE_CORRUPT/);
});
test('recovery rejects traversal and symlink output roots',async t=>{
  await assert.rejects(recoverTrace('../private'),/UNSAFE_RUN_ID/);
  const s=await setup(t);await symlink(s.traceRoot,join(s.temp,'linked'));
  await assert.rejects(recoverTrace(s.trace.id,{root:join(s.temp,'linked')}),/UNSAFE_DIRECTORY/);
});
test('missing IO proof or fabricated worker result cannot count as tool success',async t=>{
  const factory=()=>{const w=new IdleWorker();queueMicrotask(()=>{w.emit('message',{result:{static_step:'complete'},receipt:{actual_file_reads:0}});w.emit('exit',0);});return w;};
  const s=await setup(t,{workerFactory:factory});assert.equal((await s.dispatcher.dispatch(call())).execution_status,'FAILED');
});
test('CLI permits only named fixtures/crew or read-only recovery; no role/path/write/model flags',()=>{
  assert.deepEqual(parseArgs(['--fixture=nominal','--crew=CREW-03']),{profile:'nominal',crew:'CREW-03'});
  for(const args of [[],['--fixture=../private','--crew=CREW-03'],['--role=demo_admin','--crew=CREW-03'],['--fixture=nominal','--out=/private'],['--recover=../private']])assert.throws(()=>parseArgs(args));
});
test('approved on-disk trace root supports atomic durable persistence before demo tools',async()=>{
  const trace=await ExecutionTrace.create({origin:'N16-01 QA trace-storage preflight; zero tool calls'});
  try {await trace.append('RUN_ENDED',{status:'PREFLIGHT_ONLY',calls:0});}
  finally {await trace.close();}
  const r=await recoverTrace(trace.id);assert.equal(r.status,'COMPLETE');assert.equal(r.executed_calls.length,0);
  assert.equal(TRACE_ROOT.includes('n16-01-executions'),true);
});
test('worker startup, crash and cleanup failures never report completion or continue',async t=>{
  const factories=[()=>{throw Error('fixture startup');},()=>{const w=new IdleWorker();queueMicrotask(()=>w.emit('error',Error('fixture crash')));return w;},
    ()=>{const w=new IdleWorker();w.terminate=()=>Promise.reject(Error('fixture cleanup'));return w;}];
  for(const workerFactory of factories){const s=await setup(t,{workerFactory,timeoutMs:5});const r=await s.dispatcher.dispatch(call());
    assert.equal(r.execution_status,'FAILED');assert.equal(r.data_status,'UNKNOWN');await assert.rejects(s.dispatcher.dispatch(call()),/WORKFLOW_CLOSED/);}
});
