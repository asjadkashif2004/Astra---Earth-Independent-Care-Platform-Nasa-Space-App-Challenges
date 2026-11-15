// N15-08B only: additive execution/provenance wrapper, frozen case content.
import {readFile,writeFile,appendFile,chmod,mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {loadEvidence,stableJSON,sha256} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/contract.mjs';
import {loadIndex} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/retrieval.mjs';
import {prepareSelection} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {constrainSelection,validateConstrainedOutput} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/grammar.mjs';
import {captureCase,score,argumentValue} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/scripts/n15-selection-diagnostic.mjs';
import {executeLocal} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/scripts/n15-research-answer.mjs';
import {denyNetworking} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/offline.mjs';

import {ANSWER_POLICY,answerResearch,abstain} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {EXPERIMENT_PROMPT_POLICY,prepareExperimentalSelection,promptPolicyDigest} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/prompt-experiment.mjs';

const project='/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai';
const root=fileURLToPath(new URL('.',import.meta.url));
const network=denyNetworking();
const read=name=>readFile(join(root,name),'utf8').then(JSON.parse);
const write=(name,data)=>writeFile(join(root,name),stableJSON(data)+'\n',{flag:'wx',flush:true});
const record=data=>appendFile(join(root,'events.jsonl'),JSON.stringify({at_utc:new Date().toISOString(),...data})+'\n',{flush:true});
async function pins(hashes){
  for(const [name,digest] of Object.entries(hashes))assert.equal(sha256(await readFile(join(project,name))),digest,name);
}
async function inputs(){
  const source=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),source.evidence);
  return {...saved,evidence:source.evidence};
}
async function freeze(){
  const before=await read('preservation-before.json'),candidate=await read('candidate.json');
  const hashes={...before.pins,...await read('support-pins.json')};await pins(hashes);
  const qa=await read('qa-results.json');assert.equal(qa.status,'PASS');assert.equal(qa.failed,0);
  assert.equal(qa.focused_tests,119);assert.deepEqual(qa.groups,{controller:11,prompt_contract:78,observer:20,runtime:10});
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
  const overlay={task:'N15-08B',frozen_before_inference_utc:new Date().toISOString(),
    frozen_candidate_original_sha256:'eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401',
    candidate_copy_sha256:sha256(await readFile(join(root,'candidate.json'))),
    cases:candidate.cases,grammar:candidate.grammar,policy:candidate.generation_policy,order:['supported','unsupported'],
    native_request_limit:2,experimental_prompt_policy:candidate.policy,system_instruction_sha256:candidate.system_sha256,
    scoring:candidate.scoring,protected_hashes:hashes,driver_sha256:sha256(await readFile(fileURLToPath(import.meta.url))),
    command_template:template,resource_policy:await read('authorization.json'),focused_QA:qa.focused_tests,
    interpretation:'Corrected QA fixture/admission only; exact N15-08 candidate; seen diagnostic data, reviews pending'};
  await write('experiment-overlay.json',overlay);await chmod(join(root,'experiment-overlay.json'),0o400);
  await write('experiment-overlay-sha.json',{sha256:sha256(Buffer.from(stableJSON(overlay)+'\n'))});
  console.log(JSON.stringify({task:'N15-08B',phase:'FROZEN',policy:candidate.policy.version,system_sha256:candidate.system_sha256,
    prompts:candidate.cases.map(c=>({case_id:c.id,bytes:c.prompt_bytes,sha256:c.prompt_sha256})),focused_QA:qa.focused_tests,root}));
}

async function experimentQuestion(question,data){
  const caseRoot=await mkdtemp('/var/tmp/astra-n15-06-');
  const save=(name,value)=>writeFile(join(caseRoot,name),stableJSON(value)+'\n',{flag:'wx',flush:true});
  const started=performance.now(),abort=new AbortController();let resourceFailure=null,pending=Promise.resolve();
  await save('invocation.json',{task:'N15-08B',protocol_mode:'N15-06',question,policy:ANSWER_POLICY,
    experimental_prompt_policy:EXPERIMENT_PROMPT_POLICY,system_sha256:promptPolicyDigest(),
    resource_authority:'N15-08B only; monitored1.5GB/1.35GB stop,RSS2GB,native120s,CPU,network/downloads0'});
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
  result={...result,task:'N15-06',owning_task:'N15-08B',evidence_directory:caseRoot,elapsed_ms:performance.now()-started,
    controller_peak_RSS_bytes:process.resourceUsage().maxRSS*1024,network_attempts:[...network],
    experimental_prompt_policy:EXPERIMENT_PROMPT_POLICY.version,evaluation_scope:'seen prompt experiment only'};
  await save('answer.json',result);return result;
}
async function run(){
  const overlay=await read('experiment-overlay.json'),digest=await read('experiment-overlay-sha.json');
  assert.equal(sha256(await readFile(join(root,'experiment-overlay.json'))),digest.sha256);
  assert.equal(sha256(await readFile(fileURLToPath(import.meta.url))),overlay.driver_sha256);
  assert.equal((await read('storage-preflight.json')).status,'PASS');
  assert.equal(overlay.native_request_limit,2);await pins(overlay.protected_hashes);
  const candidate=await read('candidate.json');assert.deepEqual(overlay.cases,candidate.cases);assert.deepEqual(overlay.experimental_prompt_policy,EXPERIMENT_PROMPT_POLICY);assert.equal(overlay.system_instruction_sha256,promptPolicyDigest());
  const data=await inputs();
  for(const c of overlay.cases){
    assert.deepEqual(prepareExperimentalSelection(c.question,data.index,data.vectors,data.evidence),c.prepared);
    assert.deepEqual(constrainSelection(c.prepared),overlay.grammar);
  }
  await write('run-reservation.json',{task:'N15-08B',native_request_limit:2,order:overlay.order,
    at_utc:new Date().toISOString(),no_automatic_resume:true});
  await writeFile(join(root,'driver-resources.jsonl'),'',{flag:'wx',flush:true});
  let failure=null,pending=Promise.resolve();const started=performance.now();
  const resourceTick=()=>{
    const row={elapsed_ms:performance.now()-started,RSS_bytes:process.memoryUsage().rss,
      lifetime_peak_RSS_bytes:process.resourceUsage().maxRSS*1024};
    if(Math.max(row.RSS_bytes,row.lifetime_peak_RSS_bytes)>=1800000000)failure='driver_memory_precaution';
    pending=pending.then(()=>appendFile(join(root,'driver-resources.jsonl'),JSON.stringify(row)+'\n',{flush:true}))
      .catch(()=>{failure='driver_resource_persistence_failed';});
  };
  resourceTick();const monitor=setInterval(resourceTick,1000);monitor.unref();
  const results=[];
  try{
    for(const c of overlay.cases){
      if(failure)throw Error(failure);
      await pins(overlay.protected_hashes);
      await write(c.id+'-reservation.json',{task:'N15-08B',case_id:c.id,one_call_only:true,question:c.question});
      await record({event:'case-start',case_id:c.id});
      const result=await captureCase(c,overlay,data,{
        execute:async()=>experimentQuestion(c.question,data),
        persist:write,
        readExecution:async answer=>{
          const get=name=>readFile(join(answer.evidence_directory,name),'utf8').then(JSON.parse);
          const nativeReport=await get('runtime/report.json'),native=await get('runtime/generation/native-result.json');
          const command=await get('runtime/generation/frozen-execution.json'),actualRequest=await get('execution-request.json');
          const containment=await get('runtime/generation/containment-preflight.json'),cleanup=await get('runtime/generation/cleanup.json');
          const expected=structuredClone(overlay.command_template);
          const position=expected.indexOf('--prompt');assert.ok(position>=0&&position+1<expected.length);
          expected[position+1]=c.prepared.prompt;assert.deepEqual(command.argv,expected,'Frozen native command changed');
          assert.equal(nativeReport.observer_lifecycle.completed,true);assert.equal(nativeReport.resources.final_measurement_verified,true);
          assert.equal(containment.status,'PASS');assert.equal(containment.exact_native_files,17);
          assert.equal(containment.notice_files,14);assert.deepEqual(containment.forbidden_paths_visible,[]);
          assert.equal(containment.known_old_host_zlib_visible,false);assert.equal(containment.actual_prehashed_bound_files,true);
          assert.notEqual(containment.host_net,containment.child_net);assert.deepEqual(containment.IPv4_routes,[]);
          assert.equal(cleanup.owned_wrapper_reaped,true);assert.equal(cleanup.private_PID1_still_present,false);
          assert.equal(native.Haswell_backend_initialized,true);assert.ok(native.providers);
          for(const [name,digest] of Object.entries({'libz.so.1':'27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de',
            'libgomp.so.1':'645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3'})){
            assert.equal(native.providers[name].sha256,digest);
            assert.equal(native.providers[name].read_only_identity_bound_by_preflight,true);
            assert.ok(native.providers[name].init_lines.length>0);
          }
          assert.ok(Number.isFinite(native.native_post_release_sampled_VmHWM_peak_bytes));
          assert.ok(native.native_post_release_sampled_VmHWM_peak_bytes<2000000000);
          assert.ok(nativeReport.resources.final_allocated<1350000000);
          assert.equal(nativeReport.network_requests,0);assert.equal(nativeReport.network_bytes,0);
          assert.equal(answer.generated_by_llm,true);assert.deepEqual(answer.network_attempts,[]);
          if(failure)throw Error(failure);
          return {nativeReport,native,command,actualRequest,containment,cleanup};
        }});
      assert.ok(!['parser_failure','binding_failure','missing_evidence'].includes(result.outcome.outcome),'Selection validation failed');
      results.push(result);
      await record({event:'case-durable',case_id:c.id,outcome:result.outcome.outcome});
      console.log(JSON.stringify({task:'N15-08B',case_id:c.id,outcome:result.outcome.outcome,
        raw_model_output:result.raw_model_output,execution:result.execution,source_evidence_directory:result.source_evidence_directory}));
    }
    await pins(overlay.protected_hashes);assert.equal(network.length,0);
    if(failure)throw Error(failure);
    await write('summary.json',{task:'N15-08B',execution_qualification:'PASS',native_requests:results.length,
      cases:results,discrimination_demonstrated:results[0].outcome.outcome==='supported_selection'&&results[1].outcome.outcome==='correct_abstention',
      positive_live_quotation_gate:results[0].outcome.outcome==='supported_selection'?'PASS_FOR_THIS_TECHNICAL_CASE_ONLY':'OPEN',
      review:'seen diagnostic data; independent scientific/medical review pending',N15:'In Progress',N16:'Not Started'});
  }finally{clearInterval(monitor);resourceTick();await pending;}
  if(failure)throw Error(failure);
}

try{
  const mode=process.argv[2];
  if(mode==='freeze')await freeze();else if(mode==='run')await run();else throw Error('freeze|run required');
  assert.equal(network.length,0);
}catch(error){
  await record({event:'STOP',reason:error.message});
  console.error(JSON.stringify({task:'N15-08B',status:'STOPPED',reason:error.message,root}));process.exitCode=1;
}
