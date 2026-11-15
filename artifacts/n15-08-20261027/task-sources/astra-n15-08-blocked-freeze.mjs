import {readFile,writeFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {loadEvidence,sha256,stableJSON} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/contract.mjs';
import {loadIndex} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-retrieval/retrieval.mjs';
import {prepareSelection} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/selection.mjs';
import {EXPERIMENT_PROMPT_POLICY,prepareExperimentalSelection,promptPolicyDigest} from 'file:///mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai/services/research-answer/prompt-experiment.mjs';
import assert from 'node:assert/strict';
const project='/mnt/c/users/basim/onedrive/desktop/astra-space-medical-ai';
const {control}=JSON.parse(await readFile('/tmp/astra-n15-08-root.json','utf8'));
const baseline=JSON.parse(await readFile(join(control,'baseline-plan.json'),'utf8'));
const before=JSON.parse(await readFile(join(control,'preservation-before.json'),'utf8'));
for(const [name,digest] of Object.entries(before.pins))assert.equal(sha256(await readFile(join(project,name))),digest,name);
const source=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),source.evidence);
const cases=baseline.cases.map(c=>{
 const original=prepareSelection(c.question,saved.index,saved.vectors,source.evidence);assert.deepEqual(original,c.prepared);
 const prepared=prepareExperimentalSelection(c.question,saved.index,saved.vectors,source.evidence);
 assert.equal(prepared.status,'READY');assert.deepEqual({...prepared,prompt:null},{...original,prompt:null});
 return {...c,prepared,prompt_sha256:sha256(Buffer.from(prepared.prompt)),prompt_bytes:Buffer.byteLength(prepared.prompt)};
});
const pins={...before.pins};
for(const name of ['services/research-answer/prompt-experiment.mjs','tests/research-prompt-experiment.test.mjs'])
 pins[name]=sha256(await readFile(join(project,name)));
const record={task:'N15-08',status:'BLOCKED_QA',native_execution_authorized:false,
 freeze_timing:'Blocked-candidate closeout after QA failure; no pre-QA or live-execution qualification claimed',
 recorded_utc:new Date().toISOString(),policy:EXPERIMENT_PROMPT_POLICY,system_sha256:promptPolicyDigest(),
 baseline:'N15-07B unchanged; seen diagnostic only',cases,grammar:baseline.grammar,generation_policy:baseline.policy,
 scoring:baseline.scoring,protected_hashes:pins,diagnosis:JSON.parse(await readFile(join(control,'diagnosis.json'),'utf8')),
 phase3:{prompt_grammar_binding_tests_passed:78,controller_tests_failed:6,error:'monitor.unref is not a function'},
 native_requests:0,network_requests:0,downloads:0,resources:JSON.parse(await readFile(join(control,'authorization.json'),'utf8')),
 required_followup:'Separate approval: correct timer mock, rerun controller QA, then conditional unchanged two-case execution with fresh resources'};
const text=stableJSON(record)+'\n';
await writeFile(join(control,'blocked-candidate.json'),text,{flag:'wx',flush:true});await chmod(join(control,'blocked-candidate.json'),0o400);
await writeFile(join(control,'STOPPED.json'),JSON.stringify({task:'N15-08',status:'BLOCKED_QA',candidate_sha256:sha256(Buffer.from(text)),native_requests:0,resource_authority:'expires at blocked delivery; no automatic continuation'})+'\n',{flag:'wx',flush:true});
console.log(JSON.stringify({status:'BLOCKED_QA',system_sha256:record.system_sha256,candidate_sha256:sha256(Buffer.from(text)),
 prompts:cases.map(c=>({case_id:c.id,bytes:c.prompt_bytes,sha256:c.prompt_sha256})),native_requests:0}));
