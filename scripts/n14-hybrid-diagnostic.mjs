import { readFile,writeFile,appendFile,mkdir } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidence,readBounded,sha256,hashJSON,stableJSON,validateWindow } from '../services/research-retrieval/contract.mjs';
import { validateHybridSpec,validateSavedList,hybridRank,summarizeHybrid } from '../services/research-retrieval/hybrid-diagnostic.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)];
export async function prepareHybrid(projectRoot=project){
  const specRaw=await readBounded(join(projectRoot,'data/research/n14-04/spec.json'),24000),spec=JSON.parse(specRaw);validateHybridSpec(spec);
  const loaded={};for(const [key,input]of Object.entries(spec.inputs)){if(!input?.file)continue;const raw=await readBounded(join(projectRoot,input.file),1000000);if(sha256(raw)!==input.sha256)throw Error('Frozen input hash mismatch: '+key);loaded[key]={raw,data:JSON.parse(raw)};}
  const source=await loadEvidence(projectRoot),index=loaded.index.data;
  for(const w of index.windows)validateWindow(w,source.evidence);
  const catalogue=source.evidence.map(u=>({unit_id:u.id,key:u.key,role:u.role,source_context:u.source_context,limitations:u.limits,review:'pending_independent_review',source:u.source_attribution,spans:index.windows.filter(w=>w.unit_id===u.id).map(w=>{const {text,...anchor}=w.anchor;return {window_id:w.id,...anchor};}),lexical_winning_span:'not_saved;all_canonical_unit_spans_retained'}));
  if(catalogue.length!==33||catalogue.reduce((n,u)=>n+u.spans.length,0)!==34)throw Error('Canonical evidence scope changed');
  const packetRaw=await readBounded(join(projectRoot,'data/corpus/n13-03/derived/packet.json'),2000000);if(sha256(packetRaw)!==spec.inputs.packet_sha256)throw Error('Provisional packet changed');const packet=JSON.parse(packetRaw);
  const oldRows=loaded.rich_lexical.data.rows,semRows=loaded.semantic.data.rows;
  if(oldRows.length!==40||semRows.length!==40||new Set(oldRows.map(r=>r.id)).size!==40||new Set(semRows.map(r=>r.id)).size!==40)throw Error('Saved query identity mismatch');
  const cases=oldRows.map(old=>{
    const saved=semRows.find(r=>r.id===old.id),canonical=packet.cases.find(q=>q.id===old.id);
    if(!saved||!canonical||saved.query!==canonical.question||canonical.independent_review.status!=='pending'||hashJSON(old.expected_units)!==hashJSON(canonical.evidence_refs.map(r=>r.unit_id))||hashJSON(saved.expected_units)!==hashJSON(old.expected_units))throw Error('Question/reference/review mismatch');
    const lexical=[...old.lexical],semantic=saved.semantic.map(r=>r.unit_id);validateSavedList(lexical);validateSavedList(semantic);
    if(hashJSON(semantic)!==hashJSON(old.semantic))throw Error('Saved semantic ranks changed');
    for(const id of [...lexical,...semantic])if(!catalogue.some(c=>c.unit_id===id))throw Error('Unknown evidence ID');
    for(const r of saved.semantic){const w=index.windows.find(w=>w.id===r.window_id&&w.unit_id===r.unit_id);if(!w||!Number.isFinite(r.score)||r.source.original_sha256!==w.anchor.original_sha256||r.source.page_index!==w.anchor.page_index||r.source.start!==w.anchor.start||r.source.end!==w.anchor.end||r.source.text_sha256!==w.anchor.text_sha256)throw Error('Semantic span binding mismatch');}
    return {id:old.id,query:canonical.question,category:canonical.category,expected_units:[...old.expected_units],baseline:lexical,semantic,semantic_windows:Object.fromEntries(saved.semantic.map(r=>[r.unit_id,r.window_id]))};
  }).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  return {spec,specRaw,catalogue,cases,index,evidence:source.evidence};
}
export async function runHybrid(output,projectRoot=project){
  const started=performance.now(),prepared=await prepareHybrid(projectRoot),preparation_ms=performance.now()-started;
  let written=0;await mkdir(output,{recursive:true});
  const save=async(name,value)=>{const b=Buffer.from(stableJSON(value)+'\n');if(b.length>2000000||written+b.length>8000000)throw Error('Bounded replay output exceeded');written+=b.length;await writeFile(join(output,name),b,{flag:'wx',flush:true});};
  const files=['services/research-retrieval/hybrid-diagnostic.mjs','scripts/n14-hybrid-diagnostic.mjs'];
  const code=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha256(await readFile(join(projectRoot,f)))])));
  await save('input-freeze.json',{status:'FROZEN_BEFORE_HYBRID_SCORING',spec_sha256:sha256(prepared.specRaw),canonical_spec_sha256:hashJSON(prepared.spec),saved_inputs:prepared.spec.inputs,case_ids:prepared.cases.map(r=>r.id),code_sha256:code,catalogue_sha256:hashJSON(prepared.catalogue),all_questions_seen:true,no_parameter_search:true});
  await save('catalogue.json',prepared.catalogue);
  const candidateIDs=prepared.spec.candidates.map(c=>c.id),times=Object.fromEntries(candidateIDs.map(id=>[id,[]])),rows=[];let unitChecks=0,spanChecks=0;
  const raw=join(output,'raw-rows.jsonl');let rawBytes=0;await writeFile(raw,'',{flag:'wx'});
  for(const c of prepared.cases){
    const candidates={};for(const id of candidateIDs){const tick=performance.now();candidates[id]=hybridRank(c.baseline,c.semantic,id);times[id].push(performance.now()-tick);}
    for(const list of Object.values(candidates))for(const entry of list){const canonical=prepared.catalogue.find(u=>u.unit_id===entry.unit_id);if(!canonical)throw Error('Output unit mismatch');entry.catalogue_ref=canonical.unit_id;entry.role=canonical.role;entry.semantic_match_window_id=c.semantic_windows[entry.unit_id]??null;unitChecks++;
      for(const span of canonical.spans){const w=prepared.index.windows.find(w=>w.id===span.window_id);validateWindow(w,prepared.evidence);spanChecks++;}
    }
    const row={...c,seen:true,candidates};const b=Buffer.from(JSON.stringify(row)+'\n');if(rawBytes+b.length>2000000||written+b.length>8000000)throw Error('Bounded raw replay output exceeded');rawBytes+=b.length;written+=b.length;await appendFile(raw,b,{flush:true});rows.push(row);
    if(process.resourceUsage().maxRSS*1024>=1000000000)throw Error('Process RSS limit');
  }
  const summaries=Object.fromEntries(candidateIDs.map(id=>[id,summarizeHybrid(rows,id)]));
  const costs=Object.fromEntries(candidateIDs.map(id=>[id,{samples:times[id].length,total_ms:times[id].reduce((a,b)=>a+b,0),p50_ms:percentile(times[id],.5),p95_ms:percentile(times[id],.95),max_ms:Math.max(...times[id]),live_inference_latency:false}]));
  for(const [file,hash]of Object.entries(code))if(sha256(await readFile(join(projectRoot,file)))!==hash)throw Error('Code changed during replay');
  const nativeMaps=await readFile('/proc/self/maps','utf8');if(/onnxruntime|libcuda|libcublas|libcudnn/.test(nativeMaps))throw Error('Unexpected model/native library loaded');
  const result={schema_version:'astra.n14.hybrid-results.v1',status:'PASS',scope:'Two frozen truncated-list policies over40seen/tuning questions;no generalization or clinical validation',spec_sha256:hashJSON(prepared.spec),summaries,replay_processing_cost:costs,preparation_ms,elapsed_ms:performance.now()-started,process_peak_rss_bytes:process.resourceUsage().maxRSS*1024,source_validation:{units:33,canonical_spans:34,output_unit_references_checked:unitChecks,output_span_references_checked:spanChecks,invalid:0},rows,unsupported_queries:rows.filter(r=>!r.expected_units.length).map(r=>({id:r.id,baseline_candidates:r.baseline.length,candidate_counts:Object.fromEntries(candidateIDs.map(id=>[id,r.candidates[id].length])),medical_or_entailment_assessment:'not_executed;candidate_presence_is_not_support'})),new_model_inference:false,new_model_runtime_bytes:0,network_requests:0,new_embeddings_or_index:false,new_storage_policy_exception:false,output_bytes_before_final_summary:written,claim_contract_unchanged:true,independent_numerical_parity:'Unverified;unchanged',old_16_of_16_claim_rejection:'non-diagnostic;unchanged',independent_evidence_review:'pending',production_ranking_changed:false};
  await save('results.json',result);
  await save('summary.json',{status:'PASS',summaries,costs,process_peak_rss_bytes:result.process_peak_rss_bytes,source_validation:result.source_validation,model_inference:false,all_questions_seen:true});
  return {status:'PASS',summaries,costs,source_validation:result.source_validation,process_peak_rss_bytes:result.process_peak_rss_bytes,files_written_bytes:written,new_inference:false};
}
if(import.meta.main){const deadline=setTimeout(()=>{console.error('Bounded hybrid replay deadline');process.exit(1);},15000);try{const args=process.argv.slice(2);if(args.length!==1||!args[0].startsWith('--output=')||args[0].length===9)throw Error('Usage: node scripts/n14-hybrid-diagnostic.mjs --output=new-directory');console.log(JSON.stringify(await runHybrid(resolve(args[0].slice(9)))));}catch(e){console.error(JSON.stringify({status:'BLOCKED',code:e.code??null,reason:e.message}));process.exitCode=1;}finally{clearTimeout(deadline);}}
