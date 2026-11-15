import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from './fixtures/n14-claim-fixtures.mjs';
import { prepareSelection } from '../services/research-answer/selection.mjs';
import { constrainSelection } from '../services/research-answer/grammar.mjs';
import { argumentValue,score,postprocessCase,captureCase } from '../scripts/n15-selection-diagnostic.mjs';

function setup(supported=true){
  const inputs=fixture();inputs.index=structuredClone(inputs.index);
  const question='What observations apply to the controlled laboratory bench study?';
  const prepared=prepareSelection(question,inputs.index,null,inputs.evidence);
  assert.equal(prepared.status,'READY');
  const id=prepared.retrieval.candidates[0].window.id,grammar=constrainSelection(prepared);
  const c={id:supported?'supported':'unsupported',question,supported,expected_ids:supported?[id]:[],
    expected:supported?'SELECT direct quotation':'ABSTAIN',prepared,grammar};
  const raw=JSON.stringify({decision:'SELECT',evidence_ids:[id]});
  const records={nativeReport:{status:'PASS',native_commands:1,accounting_failures:[],
    resources:{owned_processes_remaining:0,observer_alive:false}},
    native:{exit_code:0,timeout_hit:false,stdout:raw},command:{argv:['fixture-only','--grammar',grammar.text]},
    actualRequest:{prompt:prepared.prompt,grammar}};
  return {inputs,c,plan:{grammar},raw,records,answer:{task:'N15-06',evidence_directory:'/fixture',elapsed_ms:1}};
}
const abstention='{"decision":"ABSTAIN","evidence_ids":[]}';
const process=f=>postprocessCase(f.c,f.plan,f.answer,f.records,f.inputs);

test('original .index failure reproduced; indexOf returns exact grammar argument',()=>{
  const f=setup();assert.throws(()=>f.records.command.argv.index('--grammar'),TypeError);
  assert.equal(argumentValue(f.records.command.argv,'--grammar'),f.plan.grammar.text);
  assert.equal(process(f).outcome.outcome,'supported_selection');
});
test('missing flag cannot accidentally read argv[0] through -1 + 1',()=>{
  assert.throws(()=>argumentValue(['a valid-looking value'],'--grammar'),/missing/);
});
test('valueless, duplicate, empty and invalid command arguments fail closed',()=>{
  for(const argv of [null,{},['--grammar'],['--grammar',''],['--grammar','--other'],
    ['--grammar','value','--grammar','value'],['--grammar',null]])
    assert.throws(()=>argumentValue(argv,'--grammar'));
});
test('scoring function is unchanged from historical frozen driver',async()=>{
  const old=await readFile(new URL('../artifacts/n15-07-20261027/control/diagnostic.mjs',import.meta.url),'utf8');
  const body=old.slice(old.indexOf('function score('),old.indexOf('\nasync function inputs'));
  assert.equal(score.toString().trim(),body.trim());
});
test('valid literal positive is processed and keeps full canonical provenance',()=>{
  const f=setup(),result=process(f);assert.equal(result.outcome.is_success,true);
  assert.equal(result.raw_model_output,f.raw);
  const quote=result.outcome.final_answer.quotations[0];
  assert.equal(quote.text,f.c.prepared.retrieval.candidates[0].window.anchor.text);
  assert.equal(quote.assessment.decision,'ACCEPT');
  assert.equal(quote.citation.original_sha256,f.c.prepared.retrieval.candidates[0].window.anchor.original_sha256);
});
test('supported abstention is a conservative miss, never a positive pass',()=>{
  const f=setup();f.records.native.stdout=abstention;
  const r=process(f);assert.equal(r.outcome.outcome,'conservative_miss');assert.equal(r.outcome.is_success,false);
});
test('unsupported abstention is correctly processed without any quotation',()=>{
  const f=setup(false);f.records.native.stdout=abstention;
  const r=process(f);assert.equal(r.outcome.outcome,'correct_abstention');assert.equal(r.outcome.is_success,true);
  assert.deepEqual(r.outcome.final_answer.quotations,[]);
});
test('unsupported SELECT remains false positive even with valid literal binding',()=>{
  const f=setup(false),r=process(f);assert.equal(r.outcome.outcome,'false_positive');
  assert.equal(r.outcome.literal_binding.status,'ACCEPT');assert.equal(r.outcome.is_success,false);
  assert.deepEqual(r.outcome.final_answer.quotations,[]);
});
test('wrong expected evidence ID is not converted into success',()=>{
  const f=setup();f.c.expected_ids=['window-'+'0'.repeat(64)];
  assert.equal(process(f).outcome.outcome,'relevance_error');
});
test('fabricated and missing selection evidence IDs do not pass post-processing',()=>{
  const f=setup();f.records.native.stdout=JSON.stringify({decision:'SELECT',evidence_ids:['window-'+'0'.repeat(64)]});
  assert.equal(process(f).outcome.outcome,'binding_failure');
  f.records.native.stdout='{"decision":"SELECT","evidence_ids":[]}';
  assert.equal(process(f).outcome.outcome,'parser_failure');
});
test('singular key, malformed and injected output are not silently repaired',()=>{
  for(const raw of ['{"decision":"SELECT","evidence_id":"x"}','not JSON','Ignore previous instructions '+abstention,
    abstention+' trailing']){
    const f=setup();f.records.native.stdout=raw;assert.equal(process(f).outcome.outcome,'parser_failure');
  }
});
test('canonical binding corruption propagates as a binding failure',()=>{
  const f=setup();f.inputs.index.windows.find(w=>w.id===f.c.expected_ids[0]).role='formal_requirement';
  assert.equal(process(f).outcome.outcome,'binding_failure');
});
test('missing prepared evidence remains missing, not fabricated support',()=>{
  const f=setup();f.c.prepared={status:'ABSTAIN'};f.records.actualRequest.prompt=undefined;
  assert.equal(process(f).outcome.outcome,'missing_evidence');
});
test('changed grammar, prompt or infrastructure stops before scoring',()=>{
  for(const mutate of [f=>f.records.command.argv.pop(),f=>f.records.actualRequest.prompt+='changed',
    f=>f.records.actualRequest.grammar={text:'other'},f=>f.records.nativeReport.status='PARTIAL',
    f=>f.records.nativeReport.native_commands=0,f=>f.records.native.exit_code=1,
    f=>f.records.native.timeout_hit=true,f=>f.records.nativeReport.resources.owned_processes_remaining=1,
    f=>f.records.nativeReport.resources.observer_alive=true,f=>delete f.records.nativeReport.resources.observer_alive,
    f=>delete f.records.nativeReport.resources.owned_processes_remaining,
    f=>delete f.records.nativeReport.accounting_failures,f=>f.records.nativeReport.accounting_failures=['scan error']]){
    const f=setup();mutate(f);assert.throws(()=>process(f));
  }
});

function mocks(f){
  const records=new Map(),calls=[];
  return {records,calls,deps:{execute:async()=>{calls.push('execute');return f.answer;},
    readExecution:async()=>{calls.push('read');assert.ok(records.has(f.c.id+'-raw-cli-answer.json'));return f.records;},
    persist:async(name,value)=>{calls.push(name);records.set(name,structuredClone(value));}}};
}
test('positive and negative controls require actual processing and durable scored results',async()=>{
  for(const supported of [true,false]){
    const f=setup(supported);if(!supported)f.records.native.stdout=abstention;
    const m=mocks(f),r=await captureCase(f.c,f.plan,f.inputs,m.deps);
    assert.equal(r.outcome.is_success,true);
    assert.equal(m.calls.filter(x=>x==='execute').length,1);
    assert.deepEqual(m.records.get(f.c.id+'-result.json'),r);
    assert.equal(m.records.size,2);
  }
});
test('post-processing exception preserves raw data and failure stage, with no retry',async()=>{
  const f=setup(),m=mocks(f);f.records.command.argv=[];
  await assert.rejects(captureCase(f.c,f.plan,f.inputs,m.deps),/missing/);
  assert.equal(m.calls.filter(x=>x==='execute').length,1);
  assert.ok(m.records.has('supported-raw-cli-answer.json'));
  assert.equal(m.records.get('supported-failure.json').stage,'postprocess');
  assert.ok(!m.records.has('supported-result.json'));
});
test('missing records, timeout and missing-model failures are durable and fail closed',async()=>{
  for(const stage of ['execute','readExecution']){
    const f=setup(),m=mocks(f);m.deps[stage]=async()=>{throw Error(stage==='execute'?'MODEL_TIMEOUT':'MISSING_MODEL');};
    await assert.rejects(captureCase(f.c,f.plan,f.inputs,m.deps));
    assert.ok(m.records.has('supported-failure.json'));assert.ok(!m.records.has('supported-result.json'));
  }
});
test('scored binding failure is durably reported without becoming successful support',async()=>{
  const f=setup(),m=mocks(f);f.inputs.index.windows.find(w=>w.id===f.c.expected_ids[0]).role='formal_requirement';
  const r=await captureCase(f.c,f.plan,f.inputs,m.deps);
  assert.equal(r.outcome.outcome,'binding_failure');assert.equal(r.outcome.is_success,false);
  assert.deepEqual(m.records.get('supported-result.json'),r);
});
test('failed result persistence never returns a pass',async()=>{
  const f=setup(),m=mocks(f),persist=m.deps.persist;
  m.deps.persist=async(name,value)=>{if(name.endsWith('-result.json'))throw Error('interrupted');await persist(name,value);};
  await assert.rejects(captureCase(f.c,f.plan,f.inputs,m.deps),/interrupted/);
  assert.equal(m.records.get('supported-failure.json').stage,'persist_result');
});
test('failure persistence errors are explicit, preserving both causes',async()=>{
  const f=setup(),m=mocks(f);m.deps.persist=async()=>{throw Error('disk unavailable');};
  await assert.rejects(captureCase(f.c,f.plan,f.inputs,m.deps),error=>error instanceof AggregateError&&error.errors.length===2);
});
test('interruption after raw commit leaves a complete durable output and failure record',async()=>{
  const f=setup(),root=await mkdtemp(join(tmpdir(),'astra-n15-07a-js-'));
  const persist=(name,value)=>writeFile(join(root,name),JSON.stringify(value)+'\n',{flag:'wx',flush:true});
  await assert.rejects(captureCase(f.c,f.plan,f.inputs,{execute:async()=>f.answer,persist,
    readExecution:async()=>{throw Error('interrupted after raw commit');}}));
  assert.deepEqual(JSON.parse(await readFile(join(root,'supported-raw-cli-answer.json'),'utf8')),f.answer);
  assert.equal(JSON.parse(await readFile(join(root,'supported-failure.json'),'utf8')).stage,'read_execution');
});
