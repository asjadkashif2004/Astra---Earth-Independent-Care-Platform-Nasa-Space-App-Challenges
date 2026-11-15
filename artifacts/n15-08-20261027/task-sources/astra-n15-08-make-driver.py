from pathlib import Path
import hashlib,json
pointer=json.loads(Path('/tmp/astra-n15-08-root.json').read_text());root=Path(pointer['control'])
baseline=Path('/var/tmp/astra-n15-06-n15-07b-control-eswbro55/driver.mjs').read_text()
source=baseline.replace('N15-07B','N15-08').replace('readFile,writeFile,appendFile,chmod','readFile,writeFile,appendFile,chmod,mkdtemp')
source=source.replace("import {main as researchMain}","import {executeLocal}")
source=source.replace("const project=", "import {ANSWER_POLICY,answerResearch,abstain} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';\nimport {EXPERIMENT_PROMPT_POLICY,prepareExperimentalSelection,promptPolicyDigest} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/prompt-experiment.mjs';\n\nconst project=")
freeze=r'''async function freeze(){
  const before=await read('preservation-before.json'),original=await read('baseline-plan.json');
  const hashes={...before.pins,...await read('experimental-source-pins.json')};await pins(hashes);
  const qa=await read('qa-results.json');assert.equal(qa.status,'PASS');assert.equal(qa.focused_tests,78);
  const data=await inputs();assert.deepEqual(original.order,['supported','unsupported']);const cases=[];
  for(const c of original.cases){
    const baselinePrepared=prepareSelection(c.question,data.index,data.vectors,data.evidence);
    assert.deepEqual(baselinePrepared,c.prepared,'Historical baseline input changed');
    const prepared=prepareExperimentalSelection(c.question,data.index,data.vectors,data.evidence);
    assert.equal(prepared.status,'READY');
    assert.deepEqual({...prepared,prompt:null},{...baselinePrepared,prompt:null},'Non-prompt input changed');
    assert.equal(prepared.prompt.slice(prepared.prompt.indexOf('<|im_start|>user')),
      baselinePrepared.prompt.slice(baselinePrepared.prompt.indexOf('<|im_start|>user')),'Question/evidence/frame changed');
    assert.deepEqual(constrainSelection(prepared),original.grammar);
    assert.deepEqual(c.grammar,original.grammar);
    const experimentCase={...c,prepared};
    const raw=JSON.stringify({decision:'SELECT',evidence_ids:c.grammar.allowed_ids});
    assert.equal(validateConstrainedOutput(raw,c.grammar).status,'PASS');
    assert.equal(score(experimentCase,raw,prepared,data.index,data.evidence).outcome,c.supported?'supported_selection':'false_positive');
    assert.equal(score(experimentCase,'{"decision":"ABSTAIN","evidence_ids":[]}',prepared,data.index,data.evidence).outcome,c.supported?'conservative_miss':'correct_abstention');
    cases.push(experimentCase);
  }
  const template=JSON.parse(await readFile(join(project,'artifacts/n15-07b-20261027/supported/runtime/generation/frozen-execution.json'),'utf8')).argv;
  assert.equal(argumentValue(template,'--grammar'),original.grammar.text);
  const overlay={task:'N15-08',frozen_before_inference_utc:new Date().toISOString(),
    baseline_plan_sha256:sha256(await readFile(join(root,'baseline-plan.json'))),
    baseline_record:'artifacts/n15-07b-20261027/control/replay-overlay.json',
    cases,grammar:original.grammar,policy:original.policy,order:original.order,native_request_limit:2,
    experimental_prompt_policy:EXPERIMENT_PROMPT_POLICY,system_instruction_sha256:promptPolicyDigest(),
    prompt_hashes:cases.map(c=>({case_id:c.id,bytes:Buffer.byteLength(c.prepared.prompt),sha256:sha256(Buffer.from(c.prepared.prompt))})),
    scoring:original.scoring,protected_hashes:hashes,driver_sha256:sha256(await readFile(fileURLToPath(import.meta.url))),
    command_template:template,resource_policy:await read('authorization.json'),focused_QA:qa.focused_tests,
    interpretation:'One pre-frozen prompt policy; two seen diagnostic cases; independent review pending'};
  await write('experiment-overlay.json',overlay);await chmod(join(root,'experiment-overlay.json'),0o400);
  await write('experiment-overlay-sha.json',{sha256:sha256(Buffer.from(stableJSON(overlay)+'\n'))});
  console.log(JSON.stringify({task:'N15-08',phase:'FROZEN',policy:EXPERIMENT_PROMPT_POLICY.version,
    system_sha256:promptPolicyDigest(),prompts:overlay.prompt_hashes,grammar_sha256:overlay.grammar.sha256,root}));
}

async function experimentQuestion(question,data){
  const caseRoot=await mkdtemp('/var/tmp/astra-n15-06-');
  const save=(name,value)=>writeFile(join(caseRoot,name),stableJSON(value)+'\n',{flag:'wx',flush:true});
  const started=performance.now(),abort=new AbortController();let resourceFailure=null,pending=Promise.resolve();
  await save('invocation.json',{task:'N15-08',protocol_mode:'N15-06',question,policy:ANSWER_POLICY,
    experimental_prompt_policy:EXPERIMENT_PROMPT_POLICY,system_sha256:promptPolicyDigest(),
    resource_authority:'N15-08 only; monitored1.5GB/1.35GB stop,RSS2GB,native120s,CPU,network/downloads0'});
  const resourcePath=join(caseRoot,'controller-resources.jsonl');await writeFile(resourcePath,'',{flag:'wx'});
  const fail=reason=>{resourceFailure=reason;abort.abort();};
  const resourceTick=()=>{
    const row={elapsed_ms:performance.now()-started,RSS_bytes:process.memoryUsage().rss,
      lifetime_peak_RSS_bytes:process.resourceUsage().maxRSS*1024};
    if(Math.max(row.RSS_bytes,row.lifetime_peak_RSS_bytes)>=1800000000)fail('controller_memory_precaution');
    pending=pending.then(()=>appendFile(resourcePath,JSON.stringify(row)+'\n',{flush:true}))
      .catch(()=>{fail('controller_resource_persistence_failed');});
  };
  resourceTick();const monitor=setInterval(resourceTick,1000);monitor.unref();let result;
  try{
    result=await answerResearch(question,data,async original=>{
      if(resourceFailure)throw Error(resourceFailure);
      const prepared=prepareExperimentalSelection(question,data.index,data.vectors,data.evidence);
      assert.equal(prepared.status,'READY');assert.deepEqual({...prepared,prompt:null},{...original,prompt:null});
      await save('experimental-prompt.json',{version:EXPERIMENT_PROMPT_POLICY.version,system_sha256:promptPolicyDigest(),
        actual_prompt:prepared.prompt,prompt_sha256:sha256(Buffer.from(prepared.prompt)),snapshot_sha256:prepared.snapshot_sha256});
      return executeLocal(prepared,caseRoot,{signal:abort.signal,task:'N15-06'});
    });
    if(network.length||resourceFailure)result=abstain(resourceFailure??'offline_network_attempt',{generated_by_llm:false});
  }catch(error){result=abstain('research_workflow_unavailable',{generated_by_llm:false,error:error.code??error.name});}
  finally{clearInterval(monitor);resourceTick();await pending;}
  if(resourceFailure)result=abstain(resourceFailure,{generated_by_llm:false});
  result={...result,task:'N15-06',owning_task:'N15-08',evidence_directory:caseRoot,elapsed_ms:performance.now()-started,
    controller_peak_RSS_bytes:process.resourceUsage().maxRSS*1024,network_attempts:[...network],
    experimental_prompt_policy:EXPERIMENT_PROMPT_POLICY.version,evaluation_scope:'seen prompt experiment only'};
  await save('answer.json',result);return result;
}
'''
start=source.index('async function freeze(){');end=source.index('async function run(){')
source=source[:start]+freeze+source[end:]
source=source.replace("read('replay-overlay.json')","read('experiment-overlay.json')").replace("read('replay-overlay-sha.json')","read('experiment-overlay-sha.json')")
source=source.replace("join(root,'replay-overlay.json')","join(root,'experiment-overlay.json')")
source=source.replace("const original=await read('original-plan.json');assert.deepEqual(overlay.cases,original.cases);",
    "const original=await read('baseline-plan.json');assert.deepEqual(overlay.cases.map(({prepared,...c})=>c),original.cases.map(({prepared,...c})=>c));assert.deepEqual(overlay.experimental_prompt_policy,EXPERIMENT_PROMPT_POLICY);assert.equal(overlay.system_instruction_sha256,promptPolicyDigest());")
source=source.replace("assert.deepEqual(prepareSelection(c.question,data.index,data.vectors,data.evidence),c.prepared);",
    "assert.deepEqual(prepareExperimentalSelection(c.question,data.index,data.vectors,data.evidence),c.prepared);")
source=source.replace("execute:async()=>researchMain(['--execute-n15-06','--question='+c.question]),","execute:async()=>experimentQuestion(c.question,data),")
assert 'researchMain' not in source and "read('replay-overlay" not in source
assert source.count("execute:async()=>experimentQuestion(c.question,data),")==1
with (root/'driver.mjs').open('x') as f:f.write(source)
print(json.dumps({'driver':str(root/'driver.mjs'),'sha256':hashlib.sha256(source.encode()).hexdigest(),'native_requests':0}))
