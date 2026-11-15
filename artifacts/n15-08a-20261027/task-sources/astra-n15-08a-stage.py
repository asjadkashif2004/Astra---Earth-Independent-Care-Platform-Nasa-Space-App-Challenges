from pathlib import Path
import hashlib,json,os
p=Path('/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai').resolve()
root=Path(json.loads(Path('/tmp/astra-n15-08a-root.json').read_text())['control'])
assert (root/'preservation-before.json').exists()
old=(p/'artifacts/n15-08-20261027/control/driver.mjs').read_text()
source=old.replace('N15-08','N15-08A')
freeze=r'''async function freeze(){
  const before=await read('preservation-before.json'),candidate=await read('candidate.json');
  const hashes={...before.pins,...await read('support-pins.json')};await pins(hashes);
  const qa=await read('qa-results.json');assert.equal(qa.status,'PASS');assert.equal(qa.failed,0);
  assert.equal(qa.focused_tests,116);assert.deepEqual(qa.groups,{controller:8,prompt_contract:78,observer:20,runtime:10});
  const data=await inputs();assert.deepEqual(candidate.policy,EXPERIMENT_PROMPT_POLICY);
  assert.equal(promptPolicyDigest(),candidate.system_sha256);
  assert.equal(candidate.system_sha256,'ce7dcbc0ca55c768e9f53de39fb9dbde9d737af33f4141b9fd483e43ba4a60d7');
  for(const c of candidate.cases){
    const prepared=prepareExperimentalSelection(c.question,data.index,data.vectors,data.evidence);
    assert.deepEqual(prepared,c.prepared,'Frozen candidate input changed');
    assert.equal(sha256(Buffer.from(prepared.prompt)),c.prompt_sha256);assert.equal(Buffer.byteLength(prepared.prompt),c.prompt_bytes);
    assert.deepEqual(constrainSelection(prepared),candidate.grammar);assert.deepEqual(c.grammar,candidate.grammar);
    const selected=JSON.stringify({decision:'SELECT',evidence_ids:c.grammar.allowed_ids});
    assert.equal(validateConstrainedOutput(selected,c.grammar).status,'PASS');
    assert.equal(score(c,selected,prepared,data.index,data.evidence).outcome,c.supported?'supported_selection':'false_positive');
    assert.equal(score(c,'{"decision":"ABSTAIN","evidence_ids":[]}',prepared,data.index,data.evidence).outcome,c.supported?'conservative_miss':'correct_abstention');
  }
  const template=JSON.parse(await readFile(join(project,'artifacts/n15-07b-20261027/supported/runtime/generation/frozen-execution.json'),'utf8')).argv;
  assert.equal(argumentValue(template,'--grammar'),candidate.grammar.text);
  const overlay={task:'N15-08A',frozen_before_inference_utc:new Date().toISOString(),
    frozen_candidate_original_sha256:'eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401',
    candidate_copy_sha256:sha256(await readFile(join(root,'candidate.json'))),
    cases:candidate.cases,grammar:candidate.grammar,policy:candidate.generation_policy,order:['supported','unsupported'],
    native_request_limit:2,experimental_prompt_policy:candidate.policy,system_instruction_sha256:candidate.system_sha256,
    scoring:candidate.scoring,protected_hashes:hashes,driver_sha256:sha256(await readFile(fileURLToPath(import.meta.url))),
    command_template:template,resource_policy:await read('authorization.json'),focused_QA:qa.focused_tests,
    interpretation:'Corrected QA fixture/admission only; exact N15-08 candidate; seen diagnostic data, reviews pending'};
  await write('experiment-overlay.json',overlay);await chmod(join(root,'experiment-overlay.json'),0o400);
  await write('experiment-overlay-sha.json',{sha256:sha256(Buffer.from(stableJSON(overlay)+'\n'))});
  console.log(JSON.stringify({task:'N15-08A',phase:'FROZEN',policy:candidate.policy.version,system_sha256:candidate.system_sha256,
    prompts:candidate.cases.map(c=>({case_id:c.id,bytes:c.prompt_bytes,sha256:c.prompt_sha256})),focused_QA:qa.focused_tests,root}));
}

'''
start=source.index('async function freeze(){');end=source.index('async function experimentQuestion(')
source=source[:start]+freeze+source[end:]
old_admission="const original=await read('baseline-plan.json');assert.deepEqual(overlay.cases.map(({prepared,...c})=>c),original.cases.map(({prepared,...c})=>c));assert.deepEqual(overlay.experimental_prompt_policy,EXPERIMENT_PROMPT_POLICY);assert.equal(overlay.system_instruction_sha256,promptPolicyDigest());"
new_admission="const candidate=await read('candidate.json');assert.deepEqual(overlay.cases,candidate.cases);assert.deepEqual(overlay.experimental_prompt_policy,EXPERIMENT_PROMPT_POLICY);assert.equal(overlay.system_instruction_sha256,promptPolicyDigest());"
assert old_admission in source
source=source.replace(old_admission,new_admission)
def controller(text):return text[text.index('async function experimentQuestion('):text.index('async function run(){')]
assert controller(source)==controller(old).replace('N15-08','N15-08A'),'Controller behavior changed'
with (root/'driver.mjs').open('x') as f:f.write(source);f.flush();os.fsync(f.fileno())
before_fixture=(p/'artifacts/n15-08-20261027/task-sources/astra-n15-08-controller.test.mjs').read_text()
fixed=before_fixture.replace("const root=JSON.parse(await readFile('/tmp/astra-n15-08-root.json','utf8')).control;\nconst source=await readFile(join(root,'driver.mjs'),'utf8');",
 "const driver=process.env.ASTRA_N15_QA_DRIVER??new URL('../artifacts/n15-08-20261027/control/driver.mjs',import.meta.url);\nconst source=await readFile(driver,'utf8');")
fixed=fixed.replace('persistenceFailure=false,network=[]','persistenceFailure=false,network=[],memoryBreachDuringExecute=false')
fixed=fixed.replace('  const context={join,ANSWER_POLICY', '''  const timer={unrefCalls:0,cancelled:false,callback:null,interval_ms:null,
    unref(){this.unrefCalls++;return this;},fire(){if(!this.cancelled)this.callback();}};
  const context={join,ANSWER_POLICY''')
fixed=fixed.replace('setInterval:()=>1,clearInterval:()=>{cleared=true;},',
 '''setInterval:(callback,ms)=>{assert.equal(timer.callback,null);timer.callback=callback;timer.interval_ms=ms;return timer;},
    clearInterval:handle=>{assert.equal(handle,timer);timer.cancelled=true;cleared=true;},''')
fixed=fixed.replace('      calls++;execution={prepared,path,options};',
 '''      calls++;execution={prepared,path,options};
      if(memoryBreachDuringExecute){RSS=1800000000;timer.fire();assert.equal(options.signal.aborted,true);}''')
fixed=fixed.replace('return {run:()=>run(question,data),records,get calls()', 'return {run:()=>run(question,data),records,timer,get calls()')
assert before_fixture[before_fixture.index("test('mock positive"):]==fixed[fixed.index("test('mock positive"):], 'Original assertions changed'
fixed+=r'''
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
'''
target=p/'tests/n15-prompt-controller.test.mjs'
with target.open('x') as f:f.write(fixed);f.flush();os.fsync(f.fileno())
record={'status':'PASS','original_six_assertion_bodies':'byte-identical','fixture_correction':'Node-like unref()/clearInterval handle plus cancellation tracking',
 'controller_behavior':'byte-identical except N15-08A metadata labels','native_deadlines_and_process_controls':'unchanged',
 'driver_sha256':hashlib.sha256(source.encode()).hexdigest(),'fixture_sha256':hashlib.sha256(fixed.encode()).hexdigest()}
with (root/'correction.json').open('x') as f:json.dump(record,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
print(json.dumps(record))
