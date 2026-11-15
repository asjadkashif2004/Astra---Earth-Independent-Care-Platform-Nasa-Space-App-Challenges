// N15-07 only. Reuse immutable N15-06 execution protocol; never tune its inputs.
import {readFile,writeFile,appendFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {loadEvidence,stableJSON,sha256} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/contract.mjs';
import {loadIndex} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/retrieval.mjs';
import {prepareSelection,parseSelection,resolveSelection} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {constrainSelection,validateConstrainedOutput} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/grammar.mjs';
import {main as frozenResearchMain} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/scripts/n15-research-answer.mjs';
import {denyNetworking} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/offline.mjs';

const project='/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai';
const root=fileURLToPath(new URL('.',import.meta.url));
const WINDOW='window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84';
const CASES=[{id:'supported',question:'What environmental accommodations must a spacecraft system provide for crew sleep?',
  supported:true,expected_ids:[WINDOW],expected:'SELECT directly relevant V2 7070 complete quotation',
  criteria:'The complete formal requirement directly lists volume, restraint, accommodations, environmental control (vibration, lighting, noise, temperature) and privacy for crew sleep.'},
 {id:'unsupported',question:"What numeric vibration limit in hertz is specified by NASA's system sleep-accommodation requirement?",
  supported:false,expected_ids:[],expected:'ABSTAIN; requested numeric Hz limit absent from eligible corpus',
  criteria:'Vibration is mentioned qualitatively in the requirement and rationale; neither gives a numeric Hz limit. Review of all 33 eligible units/34 spans found no such value. Lighting lux/distance numerics and table references cannot supply it. No assertion about uncurated pages or all NASA literature.'}];
const write=(name,data)=>writeFile(join(root,name),stableJSON(data)+'\n',{flag:'wx',flush:true});
const read=name=>readFile(join(root,name),'utf8').then(JSON.parse);
const record=event=>appendFile(join(root,'events.jsonl'),JSON.stringify({at_utc:new Date().toISOString(),...event})+'\n',{flush:true});

function score(c,raw,prepared,index,evidence){
  const base={case_id:c.id,expected:c.expected,review:'technical expectation; independent scientific/medical review pending',
    is_success:false,final_answer:{status:'ABSTAIN',quotations:[],supporting_citations:[]}};
  if(prepared?.status!=='READY')return {...base,outcome:'missing_evidence',reason:'case preparation unavailable'};
  let selection;
  try{selection=parseSelection(raw);}catch{return {...base,outcome:'parser_failure'};}
  if(selection.decision==='ABSTAIN')return {...base,selection,
    outcome:c.supported?'conservative_miss':'correct_abstention',is_success:!c.supported};
  try{validateConstrainedOutput(raw,c.grammar);}catch{return {...base,selection,outcome:'binding_failure',reason:'outside frozen retrieved-ID grammar'};}
  const binding=resolveSelection(raw,prepared,index,evidence);
  if(binding.status!=='VERIFIED_QUOTATION')return {...base,selection,outcome:'binding_failure',binding};
  const expected=c.supported&&selection.evidence_ids.every(id=>c.expected_ids.includes(id));
  if(!expected)return {...base,selection,outcome:c.supported?'relevance_error':'false_positive',
    literal_binding:{status:'ACCEPT',scope:'Quotation attribution only; not support for this question',records:binding.quotations},
    reason:'Valid citation does not answer the frozen question; do not publish it as verified support'};
  return {...base,selection,outcome:'supported_selection',is_success:true,final_answer:binding};
}

async function inputs(){
  const source=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),source.evidence);
  return {...saved,evidence:source.evidence};
}
async function verifyPins(pins){
  for(const [path,digest] of Object.entries(pins))
    assert.equal(sha256(await readFile(join(project,path))),digest,'Frozen policy/source mismatch: '+path);
}

async function freeze(){
  const before=await read('preservation-before.json');await verifyPins(before.frozen_hashes);
  const old=JSON.parse(await readFile(join(project,'artifacts/n15-06-20261027/frozen-spec.json'),'utf8'));
  const data=await inputs(),cases=[];
  for(const c of CASES){
    const prepared=prepareSelection(c.question,data.index,data.vectors,data.evidence);
    assert.equal(prepared.status,'READY',c.id+' must reach real selection, not empty-retrieval fallback');
    assert.equal(prepared.retrieval.candidates.length,1);
    assert.equal(prepared.retrieval.candidates[0].window.id,WINDOW);
    const grammar=constrainSelection(prepared);
    assert.deepEqual(grammar,old.grammar,'Grammar bytes and allowed ID must match N15-06 for both cases');
    cases.push({...c,grammar,prepared,expected_quote:c.supported?prepared.retrieval.candidates[0].window.anchor.text:null});
  }
  const positive='{"decision":"SELECT","evidence_ids":["'+WINDOW+'"]}';
  const abstention='{"decision":"ABSTAIN","evidence_ids":[]}';
  let checks=0;
  function expect(c,raw,outcome){const result=score(c,raw,c.prepared,data.index,data.evidence);assert.equal(result.outcome,outcome);checks++;return result;}
  const literal=expect(cases[0],positive,'supported_selection');
  assert.equal(literal.final_answer.quotations[0].text,cases[0].expected_quote);checks++;
  assert.equal(literal.final_answer.quotations[0].assessment.decision,'ACCEPT');checks++;
  expect(cases[0],abstention,'conservative_miss');expect(cases[1],abstention,'correct_abstention');
  const falsePositive=expect(cases[1],positive,'false_positive');
  assert.equal(falsePositive.literal_binding.status,'ACCEPT');assert.deepEqual(falsePositive.final_answer.quotations,[]);checks++;
  expect(cases[0],'{"decision":"SELECT","evidence_ids":["window-'+ '0'.repeat(64)+'"]}','binding_failure');
  expect(cases[0],'{"decision":"SELECT","evidence_id":"'+WINDOW+'"}','parser_failure');
  expect(cases[0],'Here is '+positive,'parser_failure');
  assert.equal(score(cases[0],positive,{status:'ABSTAIN'},data.index,data.evidence).outcome,'missing_evidence');checks++;
  const protectedPlan={task:'N15-07',owner_authorization:'Explicit two-request N15-07 instruction; previous task resources not reused',
    protocol_reuse:'Unchanged N15-06 execution mode/labels are retained as technical protocol. They are not a new N15-06 approval or authority.',
    frozen_before_inference_utc:new Date().toISOString(),native_request_limit:2,order:['supported','unsupported'],cases,
    policy:cases[0].prepared.snapshot.policy,grammar:old.grammar,frozen_hashes:before.frozen_hashes,
    scoring:'supported_selection is positive; supported ABSTAIN conservative_miss; unsupported ABSTAIN correct_abstention; unsupported SELECT false_positive even with ACCEPT literal binding; wrong/invalid binding and parser failures distinct',
    resource_policy:{task:'N15-07 only',storage:1500000000,precaution:1350000000,process_RSS:2000000000,native_s:120,CPU_only:true,network:0,downloads:0},
    driver_sha256:sha256(await readFile(fileURLToPath(import.meta.url))),independent_review:'pending; no independent-validation claim'};
  const corpusReview=data.evidence.map(u=>({id:u.id,key:u.key,role:u.role,source_context:u.source_context,limits:u.limits,spans:u.spans}));
  assert.equal(corpusReview.length,33);assert.equal(corpusReview.reduce((n,u)=>n+u.spans.length,0),34);
  assert.ok(!corpusReview.some(u=>u.spans.some(s=>/\b(?:hertz|hz)\b/i.test(s.text))));
  await write('eligible-corpus-review.json',{units:33,spans:34,technical_review:'All eligible span texts reviewed before generation; numerical Hz vibration threshold absent. Keyword check is supplementary, not independent scientific approval.',absence_scope:'33 eligible curated units only; not complete NASA publications or later literature',evidence:corpusReview});
  await write('qa.json',{status:'PASS',focused_checks:checks,native_generations:0,positive_complete_canonical_quotation:'ACCEPT',unsupported_SELECT_with_valid_literal_binding:'false_positive; withheld answer',reused_QA:'N15-06 76 focused passes reused via exact source hashes; no full rerun',controls:'positive selection, conservative miss, correct abstention, false positive, fabricated/singular/surrounded output and missing evidence'});
  await write('frozen-plan.json',protectedPlan);await chmod(join(root,'frozen-plan.json'),0o400);
  await write('frozen-plan-sha.json',{sha256:sha256(Buffer.from(stableJSON(protectedPlan)+'\n'))});
  console.log(JSON.stringify({task:'N15-07',phase:'FROZEN',focused_QA:checks,cases:cases.map(c=>({id:c.id,question:c.question,expected:c.expected,prompt_bytes:Buffer.byteLength(c.prepared.prompt),retrieved_id:WINDOW,grammar_sha256:c.grammar.sha256})),root}));
}

async function run(){
  const plan=await read('frozen-plan.json'),digest=await read('frozen-plan-sha.json');
  assert.equal(sha256(await readFile(join(root,'frozen-plan.json'))),digest.sha256);
  assert.equal(sha256(await readFile(fileURLToPath(import.meta.url))),plan.driver_sha256);
  assert.equal(plan.native_request_limit,2);assert.deepEqual(plan.order,['supported','unsupported']);
  await verifyPins(plan.frozen_hashes);const data=await inputs();const results=[];
  assert.deepEqual(plan.cases.map(c=>c.id),plan.order);
  for(const c of plan.cases){
    const prepared=prepareSelection(c.question,data.index,data.vectors,data.evidence);
    assert.deepEqual(prepared,c.prepared,'No changed prompt, ranking, evidence ordering or snapshot');
    assert.deepEqual(constrainSelection(prepared),plan.grammar);
  }
  await write('run-reservation.json',{task:'N15-07',generation_limit:2,started_utc:new Date().toISOString()});
  for(const c of plan.cases){
    await write(c.id+'-reservation.json',{question:c.question,expected:c.expected,one_call_only:true});
    await record({event:'case-start',case:c.id});
    const answer=await frozenResearchMain(['--execute-n15-06','--question='+c.question]);
    await write(c.id+'-raw-cli-answer.json',answer); // Preserve before scoring/aggregation.
    const nativeReport=JSON.parse(await readFile(join(answer.evidence_directory,'runtime/report.json'),'utf8'));
    const native=JSON.parse(await readFile(join(answer.evidence_directory,'runtime/generation/native-result.json'),'utf8'));
    const command=JSON.parse(await readFile(join(answer.evidence_directory,'runtime/generation/frozen-execution.json'),'utf8'));
    assert.equal(command.argv[command.argv.index('--grammar')+1],plan.grammar.text);
    const actualRequest=JSON.parse(await readFile(join(answer.evidence_directory,'execution-request.json'),'utf8'));
    assert.equal(actualRequest.prompt,c.prepared.prompt);assert.deepEqual(actualRequest.grammar,c.grammar);
    if(nativeReport.status!=='PASS'||nativeReport.native_commands!==1||native.exit_code!==0||native.timeout_hit
      ||nativeReport.resources.owned_processes_remaining||nativeReport.accounting_failures.length){
      await write(c.id+'-infrastructure-failure.json',{answer,nativeReport,native});throw Error('Stop diagnostic on infrastructure/resource/isolation failure');
    }
    const outcome=score(c,native.stdout,c.prepared,data.index,data.evidence);
    const result={diagnostic_task:'N15-07',legacy_protocol_label:answer.task,case_id:c.id,question:c.question,
      raw_model_output:native.stdout,source_evidence_directory:answer.evidence_directory,outcome,
      execution:answer.execution??{native_result:native,native_report:nativeReport},controller_elapsed_ms:answer.elapsed_ms};
    await write(c.id+'-result.json',result);results.push(result);
    await record({event:'case-durable',case:c.id,outcome:outcome.outcome});
    console.log(JSON.stringify({case:c.id,outcome:outcome.outcome,raw_model_output:native.stdout,source_evidence:answer.evidence_directory}));
  }
  await verifyPins(plan.frozen_hashes);
  await write('summary.json',{task:'N15-07',native_requests:2,results,model_policy:'unchanged',
    positive_live_quotation_gate:results[0].outcome.outcome==='supported_selection'?'PASS_FOR_THIS_ONE_TECHNICAL_CASE':'OPEN',
    unsupported_correct:results[1].outcome.outcome==='correct_abstention',
    interpretation:'Two seen/technical cases, not generalization, independent science, medical or clinical validation',
    N15:'In Progress',N16:'Not Started',resource_authority:'N15-07 only; expires at delivery'});
  console.log(JSON.stringify({task:'N15-07',phase:'COMPLETE_TWO_CASES',root}));
}

const network=denyNetworking();
try{
  const mode=process.argv[2];if(mode==='freeze')await freeze();else if(mode==='run')await run();else throw Error('freeze|run required');
  assert.equal(network.length,0);
}catch(error){
  await record({event:'STOP',error:error.message});console.error(JSON.stringify({task:'N15-07',status:'STOPPED',reason:error.message,root}));process.exitCode=1;
}
