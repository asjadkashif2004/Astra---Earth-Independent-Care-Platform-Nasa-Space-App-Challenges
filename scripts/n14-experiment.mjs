// One bounded native run; separate from the application and from provisional labels.
import { readFile,writeFile,appendFile,mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,stableJSON,sha256,hashJSON,POLICY } from '../services/research-retrieval/contract.mjs';
import { loadEncoder } from '../services/research-retrieval/encoder.mjs';
import { numericalChecks } from '../services/research-retrieval/numerics.mjs';
import { buildIndex,saveIndex,verifyIndex,rank } from '../services/research-retrieval/retrieval.mjs';
import { evaluate,validateEvaluation } from '../services/research-retrieval/evaluation.mjs';
import { denyNetworking } from '../services/research-retrieval/offline.mjs';

const [scratch,runtime]=process.argv.slice(2),project=fileURLToPath(new URL('../',import.meta.url)),attempts=denyNetworking();
const start=performance.now(),timer=setTimeout(()=>{console.error('Bounded experiment deadline');process.exit(1);},540000);let encoder;
const save=(name,obj)=>writeFile(join(scratch,name),stableJSON(obj)+'\n',{flag:'wx',flush:true});
try{
  const source=await loadEvidence(project),packet=JSON.parse(await readFile(join(project,'data/corpus/n13-03/derived/packet.json'),'utf8')),planRaw=await readFile(join(project,'data/research/n14-01/evaluation-plan.json')),plan=JSON.parse(planRaw);
  validateEvaluation(plan,packet);await save('evaluation-freeze.json',{plan_file_sha256:sha256(planRaw),canonical_plan_sha256:hashJSON(plan),frozen_before_model_execution:true,policy_sha256:hashJSON(POLICY),no_parameter_search:true});
  encoder=await loadEncoder({runtime,model:join(scratch,'model')});
  await save('numerical-verification.json',await numericalChecks(encoder));
  const built=await buildIndex(source.evidence,encoder);verifyIndex(built.index,built.vectors,built.manifest,source.evidence);await saveIndex(join(scratch,'index'),built);
  await save('build-result.json',{status:'PASS',index_bytes:built.bytes,build_ms:built.build_ms,cold_ms:encoder.cold_ms,graph:encoder.graph,details:encoder.details,manifest:built.manifest});
  // Deterministic rebuild is engineering verification, not a new evaluation/tuning.
  const again=await buildIndex(source.evidence,encoder);const rebuild_max_abs=Math.max(...Array.from({length:built.vectors.length/4},(_,i)=>Math.abs(built.vectors.readFloatLE(i*4)-again.vectors.readFloatLE(i*4))));
  if(rebuild_max_abs>1e-6||hashJSON(built.index)!==hashJSON(again.index))throw Error('Rebuild determinism failed');
  await save('rebuild-verification.json',{status:'PASS',vector_bytes_identical:built.vectors.equals(again.vectors),index_metadata_identical:hashJSON(built.index)===hashJSON(again.index),maximum_abs_difference:rebuild_max_abs});
  const raw=join(scratch,'evaluation-cases.jsonl');await writeFile(raw,'',{flag:'wx'});
  const result=await evaluate({plan,packet,evidence:source.evidence,...built,encoder,onCase:r=>appendFile(raw,JSON.stringify(r)+'\n',{flush:true})});await save('evaluation.json',result);
  const query='How does light influence the circadian clock?',embedding=await encoder.embed(query);await save('example-query.json',{query,...rank(built.index,built.vectors,query,{vector:embedding.vector,k:3})});
  const maps=await readFile('/proc/self/maps','utf8');if(/libcuda|libcudnn|libcublas|providers_cuda|providers_tensorrt/.test(maps))throw Error('Unexpected GPU library');
  if(attempts.length)throw Error('Inference attempted networking');
  await save('experiment-result.json',{status:'PASS',model_loaded:true,inference_executed:true,CPU_only:true,network_attempts:attempts,kernel_network_namespace:await readFile('/proc/net/route','utf8'),node:process.version,arch:process.arch,glibc:process.report.getReport().header.glibcVersionRuntime,cold_ms:encoder.cold_ms,total_ms:performance.now()-start,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,index_bytes:built.bytes,semantic_benefit_demonstrated:result.holdout.benefit_demonstrated,independent_numerical_parity:'UNVERIFIED',clinical_approval:false});
}catch(e){await save('experiment-failure.json',{status:'BLOCKED',reason:e.message,code:e.code??null,network_attempts:attempts,elapsed_ms:performance.now()-start,peak_rss:process.resourceUsage().maxRSS*1024});throw e;}
finally{clearTimeout(timer);await encoder?.release();}
