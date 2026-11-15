import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,stableJSON,sha256 } from '../services/research-retrieval/contract.mjs';
import { loadIndex,makeClaimRequest } from '../services/research-retrieval/retrieval.mjs';
import { evaluateClaimControls } from '../services/research-retrieval/evaluation.mjs';
import { fixture,fixtureControls } from '../tests/fixtures/n14-claim-fixtures.mjs';

export async function runClaimQA(project){
  const source=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),source.evidence),f=fixture();
  const independent=evaluateClaimControls(fixtureControls(),f.index,f.evidence),controls=[];
  for(const window of saved.index.windows){
    if(window.claim_readiness!=='bounded_source_text'){controls.push({id:window.id+'-scope',request:makeClaimRequest(window),expected:{decision:'ABSTAIN',status:'unverified_evidence_scope'}});continue;}
    const base=makeClaimRequest(window);
    const add=(suffix,decision,status,mutate=()=>{})=>{const request=structuredClone(base);mutate(request);controls.push({id:window.id+'-'+suffix,request,expected:{decision,status}});};
    add('literal','ACCEPT','verified_literal_support');
    add('source','REJECT','invalid_evidence_binding',r=>r.evidence.source_id+='-incorrect');
    add('role','REJECT','invalid_evidence_binding',r=>r.role='invented_medical_authority');
    add('altered','REJECT','unsupported_assertion',r=>r.claim.text+=' [altered]');
    add('assertion','REJECT','unsupported_assertion',r=>r.claim={kind:'assertion',text:'This source authorizes an individual astronaut diagnosis.'});
    add('paraphrase','ABSTAIN','paraphrase_unverified',r=>r.claim={kind:'paraphrase',text:'This is a paraphrase whose entailment has not been independently verified.'});
  }
  const integration=evaluateClaimControls(controls,saved.index,source.evidence);
  return {schema_version:'astra.n14-02.claim-qa.v1',status:independent.status==='PASS'&&integration.status==='PASS'?'PASS':'FAIL',independent,integration,example_request:controls.find(c=>c.expected.decision==='ACCEPT').request,original_index_sha256:saved.manifest.index_sha256,original_vectors_sha256:saved.manifest.vectors_sha256,old_unsupported_rejection_metric:'16/16 non-diagnostic: required evidence/role was absent; historical bytes unchanged',retrieval_evaluation_executed:false,model_inference_executed:false,medical_approval:false,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024};
}
if(import.meta.main){try{
  const args=process.argv.slice(2);if(args.length!==1||!args[0].startsWith('--output=')||args[0].length===9)throw Error('Usage: node scripts/n14-claim-qa.mjs --output=new-directory');
  const output=resolve(args[0].slice(9)),project=fileURLToPath(new URL('../',import.meta.url));
  const result=await runClaimQA(project);await mkdir(output,{recursive:true});
  await writeFile(join(output,'qa.json'),stableJSON(result)+'\n',{flag:'wx',flush:true});
  await writeFile(join(output,'example-literal-request.json'),stableJSON(result.example_request)+'\n',{flag:'wx',flush:true});
  const altered=structuredClone(result.example_request);altered.claim.text+=' [altered]';await writeFile(join(output,'example-rejected-request.json'),stableJSON(altered)+'\n',{flag:'wx',flush:true});
  const paraphrase=structuredClone(result.example_request);paraphrase.claim={kind:'paraphrase',text:'An unverified paraphrase of the cited research.'};await writeFile(join(output,'example-paraphrase-request.json'),stableJSON(paraphrase)+'\n',{flag:'wx',flush:true});
  const summary={status:result.status,independent_controls:result.independent.controls,independent_positive_accepted:result.independent.positive_accepted,integration_controls:result.integration.controls,integration_positive_accepted:result.integration.positive_accepted,incorrectly_accepted_negatives:result.independent.negative_incorrectly_accepted+result.integration.negative_incorrectly_accepted,old_metric_non_diagnostic:true,model_inference:false,retrieval_evaluation:false};
  await writeFile(join(output,'summary.json'),stableJSON(summary)+'\n',{flag:'wx',flush:true});console.log(JSON.stringify(summary));if(result.status!=='PASS')process.exitCode=1;
}catch(e){console.error(JSON.stringify({status:'BLOCKED',reason:e.message,code:e.code??null}));process.exitCode=1;}}
