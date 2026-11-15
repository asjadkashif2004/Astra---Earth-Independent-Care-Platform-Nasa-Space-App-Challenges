// Offline N14 facade. No application constructor, model import or network client.
import {trustedCorpusCaller,loadCatalogContext,reverifyCatalogContext,lookup,PROJECT} from '../corpus/catalog.mjs';
import {lstat} from 'node:fs/promises';import {join} from 'node:path';
import {readPinned} from '../acquisition/local-source.mjs';
import {POLICY,hashJSON,sha256,stableJSON,spanRecord,validateWindow,fail} from './contract.mjs';
import {verifyIndex,rank,validQuery,makeClaimRequest,assessClaim} from './retrieval.mjs';
import {matchedRank,matchedView} from './matched-experiment.mjs';
import {hybridRank} from './hybrid-diagnostic.mjs';
import {validateVector} from './encoder.mjs';
export const VERSION='astra.n14.offline-service.v1',CORPUS_SHA='3858c2b1fa3a9f7ed71e8ea062b08b0da88c47d6f2a86c56485e49dced424362';
export const INDEX_PINS=Object.freeze({'index.json':'56f62593fa9a6a80d010be77bf0654c1225198d1d052704e9301a61f4f65d39c','vectors.f32':'578e1b152cff43974293f7bd4369c72a747b60cff8e6dc81236f7676f521f665','manifest.json':'0223121f1aa333a4bc902b2fa1e4ba8928ef89e498d4d98f07b092f18f00213f'});
export const SOURCE_IDS=Object.freeze(['nasa-hrp-sleep-2016','nasa-std-3001-v2-f']);
export const POLICIES=Object.freeze(['rich_lexical','semantic_minilm','lexical_weighted_rrf','append_only_semantic_rescue']);
const callers=new WeakMap(),contexts=new WeakMap();
export const check=(ok,code)=>{if(!ok)fail(code,'N14 offline service rejected: '+code);};
const exact=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&[Object.prototype,null].includes(Object.getPrototypeOf(o))&&Object.keys(o).every(k=>allowed.includes(k))&&Object.values(Object.getOwnPropertyDescriptors(o)).every(d=>!d.get&&!d.set);
export const canonical=v=>Buffer.from(stableJSON(v)+'\n');
const instance=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].map(String).join(':');
export function trustedResearchCaller(role,{source_ids=SOURCE_IDS,experimental=false}={}){
 check(['researcher','demo_admin'].includes(role)&&typeof experimental==='boolean'&&Array.isArray(source_ids)&&source_ids.length>0&&source_ids.length<=2&&new Set(source_ids).size===source_ids.length&&source_ids.every(id=>SOURCE_IDS.includes(id)),'UNAUTHORIZED');
 const token=Object.freeze({scope:'N14 local research only'});callers.set(token,{role,source_ids:[...source_ids],experimental});return token;
}
export function authorize(token){check(callers.has(token),'UNAUTHORIZED');return structuredClone(callers.get(token));}
export function validateRequest(r,scope){
 check(exact(r,['schema_version','query','top_k','policy','corpus_sha256','exclude_sources'])&&r.schema_version==='astra.n14.search.v1'&&typeof r.query==='string'&&r.query.trim().length>0&&r.query.length<=1200&&Number.isInteger(r.top_k)&&r.top_k>=1&&r.top_k<=5&&POLICIES.includes(r.policy)&&r.corpus_sha256===CORPUS_SHA,'INVALID_REQUEST');
 check(r.policy==='rich_lexical'||scope.experimental,'EXPERIMENTAL_NOT_AUTHORIZED');
 check(r.exclude_sources===undefined||Array.isArray(r.exclude_sources)&&r.exclude_sources.length<=2&&new Set(r.exclude_sources).size===r.exclude_sources.length&&r.exclude_sources.every(s=>SOURCE_IDS.includes(s)),'INVALID_SOURCE_SCOPE');
 return {...r,exclude_sources:[...(r.exclude_sources??[])]};
}
export function verifySnapshot(index,vectors,manifest,evidence){
 verifyIndex(index,vectors,manifest,evidence);check(sha256(canonical(index))===INDEX_PINS['index.json']&&sha256(vectors)===INDEX_PINS['vectors.f32']&&sha256(canonical(manifest))===INDEX_PINS['manifest.json'],'FROZEN_INDEX');
 const rebuilt=evidence.flatMap(u=>u.spans.map(s=>spanRecord(u,s))).sort((a,b)=>a.id.localeCompare(b.id,'en'));
 check(hashJSON(rebuilt)===hashJSON(index.windows),'WINDOW_REBUILD');
 return {schema_version:'astra.n14.snapshot.v1',corpus_sha256:CORPUS_SHA,index_sha256:INDEX_PINS['index.json'],vectors_sha256:INDEX_PINS['vectors.f32'],windows:34,units:33,dimensions:384,model_revision:POLICY.revision,model_sha256:POLICY.weight_sha256,independent_numerical_parity:'UNVERIFIED',scientific_review:'PENDING',index_rebuilt_from_canonical_windows:true,embeddings_recomputed:false};
}
export async function loadResearchService(token,{signal}={}){
 const scope=authorize(token),n13=trustedCorpusCaller('researcher',{access:'evidence'}),corpus=await loadCatalogContext(n13,{signal});
 const view=lookup(corpus,n13,{limit:50}),evidence=view.records.map(r=>r.unit);check(view.catalog_sha256===CORPUS_SHA&&evidence.length===33,'N13_VERSION');
 const values={},instances={};for(const [name,pin]of Object.entries(INDEX_PINS)){const relative='data/research/n14-01/index/'+name,before=await lstat(join(PROJECT,relative),{bigint:true});values[name]=await readPinned(PROJECT,relative,pin,5000000,signal);const after=await lstat(join(PROJECT,relative),{bigint:true});check(instance(before)===instance(after),'INDEX_REPLACED');instances[name]=instance(after);}
 const index=JSON.parse(values['index.json']),vectors=values['vectors.f32'],manifest=JSON.parse(values['manifest.json']),descriptor=verifySnapshot(index,vectors,manifest,evidence),context=Object.freeze({scope:'Verified N14 research snapshot'});
 contexts.set(context,{owner:token,scope,index,vectors,evidence,descriptor,n13corpus:corpus,n13caller:n13,instances});return context;
}
function state(context,token){authorize(token);const s=contexts.get(context);check(s&&s.owner===token,'UNVERIFIED_CONTEXT');return s;}
export function snapshot(context,token){const s=state(context,token);return {...structuredClone({scope:s.scope,index:s.index,evidence:s.evidence,descriptor:s.descriptor}),vectors:Buffer.from(s.vectors)};}
export function descriptor(context,token){return structuredClone(state(context,token).descriptor);}
export async function reverifyService(context,token,{signal}={}){const s=state(context,token);await reverifyCatalogContext(s.n13corpus,s.n13caller,{signal});for(const [name,pin]of Object.entries(INDEX_PINS)){await readPinned(PROJECT,'data/research/n14-01/index/'+name,pin,5000000,signal);check(instance(await lstat(join(PROJECT,'data/research/n14-01/index',name),{bigint:true}))===s.instances[name],'INDEX_REPLACED');}return true;}
const interrupted=signal=>check(!signal?.aborted,'CANCELLED');
async function boundedEmbed(embed,text,signal,timeout){
 interrupted(signal);check(Number.isInteger(timeout)&&timeout>=1&&timeout<=5000,'INVALID_TIMEOUT');let timer,onAbort;
 try{return await Promise.race([Promise.resolve().then(()=>embed(text)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Query timeout'),{code:'TIMEOUT'})),timeout);onAbort=()=>reject(Object.assign(Error('Query cancelled'),{code:'CANCELLED'}));signal?.addEventListener('abort',onAbort,{once:true});})]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}
// Pure integration kernel. `embed` is trusted host dependency injection for QA
// or a separately admitted runtime. Never selected by request/JSON or file path.
export async function querySnapshot(s,request,{embed=null,signal,timeout=1000}={}){
 const r=validateRequest(request,s.scope);interrupted(signal);check(Number.isInteger(timeout)&&timeout>=1&&timeout<=5000,'INVALID_TIMEOUT');
 const allowed=new Set(s.scope.source_ids.filter(id=>!r.exclude_sources.includes(id))),rows=s.index.windows.map((w,i)=>({w,i})).filter(({w})=>allowed.has(w.anchor.document_id));
 const index={...s.index,windows:rows.map(x=>x.w)},vectors=Buffer.concat(rows.map(({i})=>s.vectors.subarray(i*384*4,(i+1)*384*4))),safe=validQuery(r.query);
 const output={schema_version:'astra.n14.search-result.v1',request:structuredClone(r),requested_policy:r.policy,effective_policy:r.policy,policy_version:'N14-05 frozen algorithms; no parameter retuning',status:'ABSTAIN',fallback:null,corpus_sha256:CORPUS_SHA,index_sha256:INDEX_PINS['index.json'],model_revision:POLICY.revision,model_runtime:'NOT_LOADED',independent_numerical_parity:'UNVERIFIED',research_only:true,scientific_review:'PENDING',question_support:'UNKNOWN',factual_answer:null,clinical_support:false,candidates:[]};
 if(!safe){output.reason='UNTRUSTED_QUERY';return output;}
 if(!rows.length){output.reason='NO_ELIGIBLE_SOURCES';return output;}
 const lexical=rank(index,vectors,r.query,{mode:'lexical',k:5,lexical_minimum:3});let semantic=null;
 if(r.policy!=='rich_lexical'){
  if(!embed){output.fallback='MODEL_UNAVAILABLE';output.effective_policy='rich_lexical';}
  else{const value=await boundedEmbed(embed,r.query,signal,timeout);interrupted(signal);validateVector(value?.vector??[]);semantic=matchedRank(matchedView(index),vectors,r.query,{mode:'semantic',vector:value.vector,k:5}).candidates;output.model_runtime='TRUSTED_PROVIDER; authorization and resource qualification external';}
 }
 let ranked=lexical.candidates.map(c=>({window:c.window,score:c.score,score_kind:'lexical_weight_3_topic_1_content'}));
 if(semantic&&r.policy==='semantic_minilm')ranked=semantic.map(c=>({window:index.windows.find(w=>w.id===c.window_id),score:c.score,score_kind:'cosine_not_confidence'}));
 else if(semantic){const lex=lexical.candidates.map(c=>c.window.unit_id),sem=semantic.map(c=>c.unit_id);ranked=hybridRank(lex,sem,r.policy).map(c=>({window:index.windows.find(w=>w.id===(lexical.candidates.find(l=>l.window.unit_id===c.unit_id)?.window.id??semantic.find(v=>v.unit_id===c.unit_id)?.window_id)),score:c.rrf_score??null,score_kind:r.policy==='lexical_weighted_rrf'?'weighted_rank_fusion':'prefix_order_no_numeric_confidence',ranking:c}));}
 output.candidates=ranked.slice(0,r.top_k).map((c,i)=>{validateWindow(c.window,s.evidence);return {rank:i+1,score:c.score,score_kind:c.score_kind,ranking:c.ranking??null,window:structuredClone(c.window),citation:makeClaimRequest(c.window).evidence,verification:'CANONICAL_SOURCE_WINDOW; not question entailment',data_quality:'EXACT_SAVED_TEXT; independent scientific review PENDING'};});
 output.status=output.candidates.length?'RETRIEVED':'ABSTAIN';output.reason=output.candidates.length?'RESEARCH_EVIDENCE_CANDIDATES':'NO_LEXICAL_MATCH';return output;
}
export async function search(context,token,request,options={}){return querySnapshot(state(context,token),request,options);}
export function verifyAttribution(context,token,request){const s=state(context,token),id=request?.evidence?.source_id;check(s.scope.source_ids.includes(id),'SOURCE_NOT_AUTHORIZED');return assessClaim(request,s.index,{evidence:s.evidence});}
export function inactiveAgentAdapter(){return {schema_version:'astra.n14.agent-interface.v1',active:false,N16_dispatch:false,N15_factual_rule_activation:false,permitted_future_output:'Versioned evidence candidates and separate attribution; factual support UNKNOWN',requires:'Separate operational integration authority and original prerequisite/review gates'};}
