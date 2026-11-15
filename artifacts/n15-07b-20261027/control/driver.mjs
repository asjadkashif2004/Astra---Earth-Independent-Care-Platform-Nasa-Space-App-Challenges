// N15-07B only: additive execution/provenance wrapper, frozen case content.
import {readFile,writeFile,appendFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {loadEvidence,stableJSON,sha256} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/contract.mjs';
import {loadIndex} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/retrieval.mjs';
import {prepareSelection} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {constrainSelection,validateConstrainedOutput} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/grammar.mjs';
import {captureCase,score,argumentValue} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/scripts/n15-selection-diagnostic.mjs';
import {main as researchMain} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/scripts/n15-research-answer.mjs';
import {denyNetworking} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/offline.mjs';

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
  const before=await read('preservation-before.json'),original=await read('original-plan.json');
  await pins(before.pins);
  const qa=JSON.parse(await readFile(join(project,'artifacts/n15-07b-20261027/qa-results.json'),'utf8'));
  assert.equal(qa.status,'PASS');assert.equal(qa.focused_tests,41);
  const data=await inputs();assert.deepEqual(original.order,['supported','unsupported']);
  for(const c of original.cases){
    assert.deepEqual(prepareSelection(c.question,data.index,data.vectors,data.evidence),c.prepared,'Frozen prepared input changed');
    assert.deepEqual(constrainSelection(c.prepared),original.grammar);
    assert.deepEqual(c.grammar,original.grammar);
    assert.equal(validateConstrainedOutput('{"decision":"ABSTAIN","evidence_ids":[]}',c.grammar).selection.decision,'ABSTAIN');
    const positive=JSON.stringify({decision:'SELECT',evidence_ids:c.grammar.allowed_ids});
    const expected=c.supported?'supported_selection':'false_positive';
    assert.equal(score(c,positive,c.prepared,data.index,data.evidence).outcome,expected);
  }
  const template=JSON.parse(await readFile(join(project,'artifacts/n15-07-20261027/supported/runtime/generation/frozen-execution.json'),'utf8')).argv;
  assert.equal(argumentValue(template,'--grammar'),original.grammar.text);
  const overlay={task:'N15-07B',frozen_before_inference_utc:new Date().toISOString(),
    original_plan_sha256:sha256(await readFile(join(root,'original-plan.json'))),
    original_frozen_file_sha256:before.pins['artifacts/n15-07-20261027/control/frozen-plan.json'],
    cases:original.cases,grammar:original.grammar,policy:original.policy,order:original.order,
    native_request_limit:2,scoring:original.scoring,protected_hashes:before.pins,
    corrected_QA:'N15-07A saved hashes verified; no experimental content changes',
    driver_sha256:sha256(await readFile(fileURLToPath(import.meta.url))),
    command_template:template,resource_policy:await read('authorization.json'),focused_QA:qa.focused_tests,
    independent_review:'pending; seen diagnostic replay, not fresh evaluation'};
  await write('replay-overlay.json',overlay);await chmod(join(root,'replay-overlay.json'),0o400);
  await write('replay-overlay-sha.json',{sha256:sha256(Buffer.from(stableJSON(overlay)+'\n'))});
  console.log(JSON.stringify({task:'N15-07B',phase:'FROZEN',cases:overlay.cases.map(c=>({id:c.id,question:c.question,
    prompt_bytes:Buffer.byteLength(c.prepared.prompt),grammar_sha256:c.grammar.sha256})),root}));
}
async function run(){
  const overlay=await read('replay-overlay.json'),digest=await read('replay-overlay-sha.json');
  assert.equal(sha256(await readFile(join(root,'replay-overlay.json'))),digest.sha256);
  assert.equal(sha256(await readFile(fileURLToPath(import.meta.url))),overlay.driver_sha256);
  assert.equal((await read('storage-preflight.json')).status,'PASS');
  assert.equal(overlay.native_request_limit,2);await pins(overlay.protected_hashes);
  const original=await read('original-plan.json');assert.deepEqual(overlay.cases,original.cases);
  const data=await inputs();
  for(const c of overlay.cases){
    assert.deepEqual(prepareSelection(c.question,data.index,data.vectors,data.evidence),c.prepared);
    assert.deepEqual(constrainSelection(c.prepared),overlay.grammar);
  }
  await write('run-reservation.json',{task:'N15-07B',native_request_limit:2,order:overlay.order,
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
      await write(c.id+'-reservation.json',{task:'N15-07B',case_id:c.id,one_call_only:true,question:c.question});
      await record({event:'case-start',case_id:c.id});
      const result=await captureCase(c,overlay,data,{
        execute:async()=>researchMain(['--execute-n15-06','--question='+c.question]),
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
      console.log(JSON.stringify({task:'N15-07B',case_id:c.id,outcome:result.outcome.outcome,
        raw_model_output:result.raw_model_output,execution:result.execution,source_evidence_directory:result.source_evidence_directory}));
    }
    await pins(overlay.protected_hashes);assert.equal(network.length,0);
    if(failure)throw Error(failure);
    await write('summary.json',{task:'N15-07B',execution_qualification:'PASS',native_requests:results.length,
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
  console.error(JSON.stringify({task:'N15-07B',status:'STOPPED',reason:error.message,root}));process.exitCode=1;
}
