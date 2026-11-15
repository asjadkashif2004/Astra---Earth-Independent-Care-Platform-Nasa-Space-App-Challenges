import { readFile,writeFile,appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,stableJSON,sha256,hashJSON,validateWindow,readBounded,POLICY } from '../services/research-retrieval/contract.mjs';
import { loadEncoder } from '../services/research-retrieval/encoder.mjs';
import { loadIndex,validQuery } from '../services/research-retrieval/retrieval.mjs';
import { percentile } from '../services/research-retrieval/evaluation.mjs';
import { matchedView,validateMatchedInputs,matchedRank,matchedMetrics,failureCases } from '../services/research-retrieval/matched-experiment.mjs';
import { denyNetworking } from '../services/research-retrieval/offline.mjs';

const [scratch,runtime,model]=process.argv.slice(2),project=fileURLToPath(new URL('../',import.meta.url)),network=denyNetworking();
const started=performance.now(),timer=setTimeout(()=>{console.error('Matched experiment overall deadline');process.exit(1);},300000);let encoder;
const save=(name,value)=>writeFile(join(scratch,name),stableJSON(value)+'\n',{flag:'wx',flush:true});
async function observer(){const status=JSON.parse(await readFile(join(scratch,'observer.json'),'utf8'));if(status.stop||Date.now()-status.timestamp_ms>2500)throw Error('Resource observer stopped/stale');if(process.resourceUsage().maxRSS*1024>=1000000000)throw Error('Process RSS ceiling');}
try{
  await observer();
  const inputs=await loadEvidence(project),saved=await loadIndex(join(project,'data/research/n14-01/index'),inputs.evidence),specRaw=await readFile(join(project,'data/research/n14-03/spec.json')),spec=JSON.parse(specRaw);
  const packet=JSON.parse(await readBounded(join(project,'data/corpus/n13-03/derived/packet.json'),2000000));
  const questions=spec.queries.ids.map(id=>{const q=packet.cases.find(q=>q.id===id);if(!q||q.independent_review.status!=='pending')throw Error('Question/review identity mismatch');return {id,text:q.question};}),view=matchedView(saved.index);
  validateMatchedInputs(spec,saved.index,saved.manifest,view,questions);
  const oldRaw=await readFile(join(project,'artifacts/n14-01-20261025/evaluation.json')),old=JSON.parse(oldRaw);
  if(old.rows.length!==40||questions.some(q=>!old.rows.some(r=>r.id===q.id)))throw Error('Historical comparison identity mismatch');
  const implementationFiles=['scripts/n14-matched-experiment.mjs','services/research-retrieval/matched-experiment.mjs','services/research-retrieval/encoder.mjs','services/research-retrieval/retrieval.mjs','services/research-retrieval/evaluation.mjs','services/research-retrieval/contract.mjs','services/research-retrieval/offline.mjs'];
  const hashes=Object.fromEntries(await Promise.all(implementationFiles.map(async p=>[p,sha256(await readFile(join(project,p)))])));
  await save('input-freeze.json',{status:'FROZEN_BEFORE_INFERENCE',spec_sha256:sha256(specRaw),canonical_spec_sha256:hashJSON(spec),view_sha256:hashJSON(view),queries_sha256:hashJSON(questions),old_evaluation_sha256:sha256(oldRaw),code_sha256:hashes,all_questions_seen:true,no_parameter_search:true,original_index_sha256:saved.manifest.index_sha256,original_vectors_sha256:saved.manifest.vectors_sha256});
  await save('representation.json',view);await save('queries.json',questions);await save('frozen-spec.json',spec);
  await observer();encoder=await loadEncoder({runtime,model});
  for(const text of spec.queries.warmup){await observer();await encoder.embed(text);}
  const rows=[],lexTimes=[],semTimes=[],totalTimes=[];let citationChecks=0;const evaluationStart=performance.now();
  await writeFile(join(scratch,'raw-queries.jsonl'),'',{flag:'wx'});
  for(const q of questions){
    await observer();if(performance.now()-evaluationStart>180000)throw Error('Evaluation deadline');
    const tick=performance.now(),lexStart=performance.now(),lexical=matchedRank(view,saved.vectors,q.text,{mode:'lexical'}),lexical_ms=performance.now()-lexStart;
    const semStart=performance.now(),embedded=validQuery(q.text)?await encoder.embed(q.text):null,semantic=matchedRank(view,saved.vectors,q.text,{mode:'semantic',vector:embedded?.vector}),semantic_ms=performance.now()-semStart;
    const canonical=packet.cases.find(c=>c.id===q.id),expected_units=canonical.evidence_refs.map(r=>r.unit_id);
    for(const candidate of [...lexical.candidates,...semantic.candidates]){const w=saved.index.windows.find(w=>w.id===candidate.window_id);validateWindow(w,inputs.evidence);candidate.source={document_id:w.anchor.document_id,original_sha256:w.anchor.original_sha256,page_index:w.anchor.page_index,start:w.anchor.start,end:w.anchor.end,text_sha256:w.anchor.text_sha256,section_id:w.section_id,base_citations:w.anchor.base_citations};citationChecks++;}
    const total_ms=performance.now()-tick;if(total_ms>5000)throw Error('Query deadline');
    const row={id:q.id,query:q.text,query_sha256:sha256(Buffer.from(q.text)),seen:true,category:canonical.category,expected_units,lexical:lexical.candidates,semantic:semantic.candidates,guard:lexical.status,lexical_ms,semantic_ms,total_ms};
    const bytes=embedded?Buffer.alloc(embedded.vector.length*4):null;if(bytes)for(let i=0;i<embedded.vector.length;i++)bytes.writeFloatLE(embedded.vector[i],i*4);
    // Raw input/encoding/vector/ranks are flushed before summary aggregation.
    await appendFile(join(scratch,'raw-queries.jsonl'),JSON.stringify({...row,encoding:embedded?.encoding??null,query_vector_f32le_base64:bytes?.toString('base64')??null})+'\n',{flush:true});
    rows.push(row);if(embedded){lexTimes.push(lexical_ms);semTimes.push(semantic_ms);totalTimes.push(total_ms);}
  }
  const metrics=matchedMetrics(rows),oldMetrics=matchedMetrics(old.rows),cohorts={};
  for(const [oldSet,label]of [['tuning','previous_tuning_now_seen'],['holdout','previous_holdout_now_seen']]){const ids=new Set(old.rows.filter(r=>r.set===oldSet).map(r=>r.id));cohorts[label]={matched:matchedMetrics(rows.filter(r=>ids.has(r.id))),original_asymmetric:matchedMetrics(old.rows.filter(r=>ids.has(r.id)))};}
  const latency=times=>({samples:times.length,p50:percentile(times,.5),p95:percentile(times,.95),max:Math.max(...times)});
  const semanticRankingChanges=rows.filter(r=>r.semantic.map(c=>c.unit_id).join()!==old.rows.find(x=>x.id===r.id).semantic.join()).map(r=>r.id);
  await observer();if(network.length)throw Error('Unexpected network attempt');
  const maps=await readFile('/proc/self/maps','utf8');if(/libcuda|libcudnn|libcublas|providers_cuda|providers_tensorrt/.test(maps))throw Error('GPU native mapping');
  for(const [p,h]of Object.entries(hashes))if(sha256(await readFile(join(project,p)))!==h)throw Error('Implementation changed during experiment');
  await save('results.json',{schema_version:'astra.n14.matched-results.v1',status:'PASS',scope:'Seen-question tuning/diagnostic only; no new holdout or clinical/entailment validation',spec_sha256:hashJSON(spec),matched:metrics,original_asymmetric:oldMetrics,historical_seen_cohorts:cohorts,semantic_rank_changes_vs_original:semanticRankingChanges,failures:failureCases(rows),citation_checks:{valid:citationChecks,invalid:0},latency_ms:{lexical:latency(lexTimes),semantic_including_query_embedding:latency(semTimes),both_plus_citation_checks:latency(totalTimes),blocked_queries_excluded:questions.length-lexTimes.length,persistence_io_excluded:true},rows,independent_numerical_parity:'UNVERIFIED',claim_contract_unchanged:true,production_baseline:'unchanged lexical-first',hybrid_executed:false,model_document_embeddings_generated:0,network_attempts:network});
  await save('experiment-result.json',{status:'PASS',cold_load_ms:encoder.cold_ms,evaluation_ms:performance.now()-evaluationStart,elapsed_ms:performance.now()-started,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,network_attempts:network,new_network_bytes:0,new_model_or_runtime_bytes:0,CPU_only:true,node:process.version,arch:process.arch,glibc:process.report.getReport().header.glibcVersionRuntime,network_routes:await readFile('/proc/net/route','utf8'),model_revision:POLICY.revision,intra_op_threads:2,all_queries_seen:true});
}catch(e){await save('failure.json',{status:'BLOCKED',reason:e.message,code:e.code??null,network_attempts:network,elapsed_ms:performance.now()-started,peak_rss_bytes:process.resourceUsage().maxRSS*1024});throw e;}
finally{clearTimeout(timer);await encoder?.release();}
