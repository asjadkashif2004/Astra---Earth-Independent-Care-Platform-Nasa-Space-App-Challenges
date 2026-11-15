import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Buffer} from 'node:buffer';
import {performance} from 'node:perf_hooks';
import {join} from 'node:path';
import {fixture} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/tests/fixtures/n14-claim-fixtures.mjs';
import {ANSWER_POLICY,answerResearch,abstain} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {EXPERIMENT_PROMPT_POLICY,prepareExperimentalSelection,promptPolicyDigest} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/prompt-experiment.mjs';
import {stableJSON,sha256} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/contract.mjs';

const driver=process.env.ASTRA_N15_QA_DRIVER??new URL('../artifacts/n15-08-20261027/control/driver.mjs',import.meta.url);
const source=await readFile(driver,'utf8');
const start=source.indexOf('async function experimentQuestion('),end=source.indexOf('async function run(){');
assert.ok(start>=0&&end>start);
const body=source.slice(start,end);

// Exhaustive external-name audit for the pinned trusted controller function.
// VM language intrinsics stay native to the VM; no host-global blanket copy.
const CONTROLLER_EXTERNALS=Object.freeze(["ANSWER_POLICY","AbortController","Buffer","EXPERIMENT_PROMPT_POLICY","Error","JSON","Math","Promise","abstain","answerResearch","appendFile","assert","clearInterval","executeLocal","join","mkdtemp","network","performance","prepareExperimentalSelection","process","promptPolicyDigest","setInterval","sha256","stableJSON","writeFile"]);
const CONTROLLER_AUDIT_SHA='ee24230a7b4d7bd660eb9667a2e2d6b59863aa31021f0ef8e8b00e3b1666c213';
const normalizedController=body.replaceAll('N15-08B','N15-08').replaceAll('N15-08A','N15-08');
assert.equal(sha256(Buffer.from(normalizedController)),CONTROLLER_AUDIT_SHA,'Controller changed: dependency audit required');
function auditVM(context){
  const realm=vm.createContext(context);
  const expression='JSON.stringify({'+CONTROLLER_EXTERNALS.map(name=>name+':typeof '+name).join(',')+'})';
  const types=JSON.parse(vm.runInContext(expression,realm));
  const missing=CONTROLLER_EXTERNALS.filter(name=>types[name]==='undefined');
  assert.deepEqual(missing,[],'Missing required VM dependencies: '+missing.join(', '));
  return {realm,types,required:CONTROLLER_EXTERNALS};
}

const question='What observations apply to the controlled laboratory bench study?';
function harness({abstention=false,error=null,RSS=1000000,persistenceFailure=false,network=[],memoryBreachDuringExecute=false}={}){
  const data=fixture();data.index=structuredClone(data.index);data.vectors=null;
  const records=new Map();let calls=0,cleared=false,execution;
  const timer={unrefCalls:0,cancelled:false,callback:null,interval_ms:null,
    unref(){this.unrefCalls++;return this;},fire(){if(!this.cancelled)this.callback();}};
  const context={join,ANSWER_POLICY,EXPERIMENT_PROMPT_POLICY,prepareExperimentalSelection,promptPolicyDigest,
    answerResearch,abstain,assert,stableJSON,sha256,AbortController,network,Buffer,
    performance,mkdtemp:async()=>'/fixture-only',
    writeFile:async(path,value)=>{records.set(path,value);},
    appendFile:async(path,value)=>{if(persistenceFailure)throw Error('fixture resource write failed');records.set(path,(records.get(path)||'')+value);},
    process:{memoryUsage:()=>({rss:RSS}),resourceUsage:()=>({maxRSS:RSS/1024})},
    setInterval:(callback,ms)=>{assert.equal(timer.callback,null);timer.callback=callback;timer.interval_ms=ms;return timer;},
    clearInterval:handle=>{assert.equal(handle,timer);timer.cancelled=true;cleared=true;},
    executeLocal:async(prepared,path,options)=>{
      calls++;execution={prepared,path,options};
      if(memoryBreachDuringExecute){RSS=1800000000;timer.fire();assert.equal(options.signal.aborted,true);}
      if(error)throw Object.assign(Error(error),{code:error});
      const id=prepared.retrieval.candidates[0].window.id;
      return {exit_code:0,timeout_hit:false,native_commands:1,verified_isolation:true,decode_runs:1,
        stdout:abstention?'{"decision":"ABSTAIN","evidence_ids":[]}':JSON.stringify({decision:'SELECT',evidence_ids:[id]})};
    }};
  // Compile only our own staged controller function, never document/model text.
  const audit=auditVM(context);
  const run=vm.runInContext('('+body+')',audit.realm);
  return {run:()=>run(question,data),records,timer,audit,context,get calls(){return calls;},get cleared(){return cleared;},get execution(){return execution;}};
}
test('mock positive executes experimental prompt once and preserves canonical quotation binding',async()=>{
  const h=harness(),r=await h.run();assert.equal(r.status,'VERIFIED_QUOTATION');
  assert.equal(r.quotations[0].assessment.decision,'ACCEPT');assert.equal(h.calls,1);assert.ok(h.cleared);
  assert.equal(h.execution.options.task,'N15-06');assert.ok(h.execution.options.signal instanceof AbortSignal);
  assert.ok(h.execution.prepared.prompt.includes(EXPERIMENT_PROMPT_POLICY.system));
  assert.ok(h.records.has('/fixture-only/experimental-prompt.json'));assert.ok(h.records.has('/fixture-only/answer.json'));
});
test('mock abstention remains an empty answer without fabricated quote',async()=>{
  const h=harness({abstention:true}),r=await h.run();assert.equal(r.status,'ABSTAIN');
  assert.equal(r.quotations.length,0);assert.equal(h.calls,1);assert.ok(h.cleared);
});
test('mock timeout and missing-model failures are not retried',async()=>{
  for(const error of ['MODEL_TIMEOUT','MISSING_MODEL']){
    const h=harness({error}),r=await h.run();assert.equal(r.status,'ABSTAIN');assert.equal(r.generated_by_llm,false);
    assert.equal(h.calls,1);assert.ok(h.cleared);
  }
});
test('initial memory precaution closes the gate before execution',async()=>{
  const h=harness({RSS:1800000000}),r=await h.run();assert.equal(r.status,'ABSTAIN');
  assert.equal(r.reason,'controller_memory_precaution');assert.equal(h.calls,0);assert.ok(h.cleared);
});
test('resource persistence failure cannot produce a successful result',async()=>{
  const h=harness({persistenceFailure:true}),r=await h.run();assert.equal(r.status,'ABSTAIN');
  assert.equal(r.reason,'controller_resource_persistence_failed');assert.equal(r.generated_by_llm,false);assert.ok(h.cleared);
  if(h.execution)assert.equal(h.execution.options.signal.aborted,true);
});
test('an offline violation with an otherwise valid mock selection fails closed',async()=>{
  const h=harness({network:[{api:'fixture-only'}]}),r=await h.run();assert.equal(r.status,'ABSTAIN');
  assert.equal(r.reason,'offline_network_attempt');assert.equal(r.generated_by_llm,false);assert.ok(h.cleared);
});

test('Node-like timer is unrefed, cancelled by the original handle, and cannot fire after cleanup',async()=>{
  for(const options of [{},{abstention:true},{error:'MODEL_TIMEOUT'}]){
    const h=harness(options);await h.run();assert.equal(h.timer.unrefCalls,1);
    assert.equal(h.timer.interval_ms,1000);assert.equal(h.timer.cancelled,true);
    const previous=h.records.get('/fixture-only/controller-resources.jsonl');h.timer.fire();
    assert.equal(h.records.get('/fixture-only/controller-resources.jsonl'),previous);
  }
});
test('periodic memory failure aborts the active mocked execution and leaves no successful output',async()=>{
  const h=harness({memoryBreachDuringExecute:true}),r=await h.run();
  assert.equal(h.calls,1);assert.equal(h.execution.options.signal.aborted,true);
  assert.equal(r.status,'ABSTAIN');assert.equal(r.reason,'controller_memory_precaution');
  assert.equal(r.generated_by_llm,false);assert.equal(h.timer.cancelled,true);
});

test('audited controller globals are complete and use authentic Node Buffer, performance and abort primitives',()=>{
  const h=harness();assert.equal(h.context.Buffer,Buffer);assert.equal(h.context.performance,performance);
  assert.equal(h.context.AbortController,AbortController);assert.equal(h.audit.required.length,25);
  assert.equal(h.audit.types.Buffer,'function');assert.equal(h.audit.types.performance,'object');
  assert.equal(h.context.Buffer.from('fixture').toString(),'fixture');
  assert.deepEqual(Object.keys(h.context).sort(),CONTROLLER_EXTERNALS.filter(n=>!['Error','JSON','Math','Promise'].includes(n)).sort());
});
test('dependency audit rejects missing bindings by name before controller execution',()=>{
  const h=harness(),missing={...h.context};delete missing.Buffer;
  assert.throws(()=>auditVM(missing),/Buffer/);assert.equal(h.calls,0);
});
test('VM exposes only limited mocked process metrics and no host module, file or network entry points',()=>{
  const h=harness();assert.deepEqual(Object.keys(h.context.process).sort(),['memoryUsage','resourceUsage']);
  const capabilities=JSON.parse(vm.runInContext('JSON.stringify([typeof require,typeof module,typeof fetch,typeof WebSocket,typeof Worker,typeof process.env,typeof process.exit,typeof process.kill,typeof process.cwd,typeof process.getBuiltinModule,typeof __dirname,typeof __filename])',h.audit.realm));
  assert.deepEqual(capabilities,Array(12).fill('undefined'));assert.equal(h.calls,0);
});
