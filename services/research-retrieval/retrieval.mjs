import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { POLICY,hashJSON,sha256,stableJSON,fail,spanRecord,validateWindow,readBounded } from './contract.mjs';
import { validateVector } from './encoder.mjs';

const stops=new Set('a an the what why how is are do does can should to for of in on with my me our it and about this that which from as be astra'.split(' '));
export const terms=text=>[...new Set(text.toLowerCase().match(/[a-z0-9]+/g)??[])].filter(t=>t.length>2&&!stops.has(t));
export function validQuery(text){
  if(typeof text!=='string'||!text.trim()||text.length>12000)fail('INVALID_QUERY','Nonempty query of at most12000characters required.');
  const normalized=text.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)||/ignore\s+(all|previous|prior)|system\s*prompt|<\/?(?:script|system|tool)|execute\s+(?:shell|code)|(?:alter|change|overwrite)\s+telemetry|(?:delete|acknowledge)\s+(?:the\s+)?(?:alerts?|cases?)|(?:file|https?):\/\//i.test(normalized))return false;
  return true;
}
export async function buildIndex(evidence,encoder){
  const started=performance.now(),windows=evidence.flatMap(u=>u.spans.map(s=>spanRecord(u,s))).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  if(windows.length>256)fail('INDEX_LIMIT','Too many windows.');
  const vectors=Buffer.alloc(windows.length*384*4),token_lengths=[];
  // All current spans must fit whole. No decoded-string offset reconstruction.
  for(const w of windows)token_lengths.push(encoder.encode(w.anchor.text).input_ids.length);
  for(let row=0;row<windows.length;row++){
    if(performance.now()-started>300000)fail('TIME_LIMIT','Index build exceeded300s.');
    const {vector}=await encoder.embed(windows[row].anchor.text);
    for(let d=0;d<384;d++)vectors.writeFloatLE(vector[d],(row*384+d)*4);
  }
  const index={schema_version:'astra.n14.index.v1',policy:{...POLICY},review:'research_only_pending_independent_review',windows};
  const json=Buffer.from(stableJSON(index)+'\n'),manifest={schema_version:'astra.n14.index-manifest.v1',policy_sha256:hashJSON(POLICY),packet_sha256:POLICY.packet_sha256,model_sha256:POLICY.weight_sha256,index_sha256:sha256(json),vectors_sha256:sha256(vectors),windows:windows.length,units:evidence.length,dimensions:384,vector_encoding:'float32-little-endian',token_lengths};
  const bytes=json.length+vectors.length+Buffer.byteLength(stableJSON(manifest)+'\n');if(bytes>5000000)fail('INDEX_LIMIT','Index exceeds5MB.');
  return {index,vectors,manifest,bytes,build_ms:performance.now()-started};
}
export async function saveIndex(output,built){await mkdir(output,{recursive:true});for(const [name,data]of [['index.json',stableJSON(built.index)+'\n'],['vectors.f32',built.vectors],['manifest.json',stableJSON(built.manifest)+'\n']])await writeFile(join(output,name),data,{flag:'wx'});}
export function verifyIndex(index,vectors,manifest,evidence){
  if(index.schema_version!=='astra.n14.index.v1'||hashJSON(index.policy)!==hashJSON(POLICY)||manifest.policy_sha256!==hashJSON(POLICY)||manifest.packet_sha256!==POLICY.packet_sha256||manifest.model_sha256!==POLICY.weight_sha256||sha256(Buffer.from(stableJSON(index)+'\n'))!==manifest.index_sha256||sha256(vectors)!==manifest.vectors_sha256)fail('INDEX_MISMATCH','Index provenance or content hash changed.');
  const expected=evidence.flatMap(u=>u.spans.map(s=>spanRecord(u,s))).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  if(index.windows.length!==expected.length||manifest.windows!==expected.length||manifest.units!==33||manifest.dimensions!==384||vectors.length!==expected.length*384*4||manifest.vector_encoding!=='float32-little-endian'||hashJSON(index.windows)!==hashJSON(expected)||manifest.token_lengths?.length!==expected.length||manifest.token_lengths.some(n=>!Number.isInteger(n)||n<3||n>256))fail('INDEX_MISMATCH','Eligible evidence/window dimensions differ.');
  for(const w of index.windows)validateWindow(w,evidence);
  for(let i=0;i<expected.length;i++)validateVector(vectorAt(vectors,i));
  return true;
}
export async function loadIndex(path,evidence){const raw=await readBounded(join(path,'index.json'),4500000),vectors=await readBounded(join(path,'vectors.f32'),393216),manifest=JSON.parse(await readBounded(join(path,'manifest.json'),65536)),index=JSON.parse(raw);if(raw.length+vectors.length+Buffer.byteLength(stableJSON(manifest))>5000000)fail('INDEX_LIMIT','Index exceeds5MB.');verifyIndex(index,vectors,manifest,evidence);return {index,vectors,manifest};}
export function vectorAt(bytes,row){return Float32Array.from({length:384},(_,d)=>bytes.readFloatLE((row*384+d)*4));}
export function rank(index,vectors,query,{vector=null,k=5,mode='semantic',lexical_minimum=3,semantic_minimum=0}={}){
  if(!['lexical','semantic'].includes(mode)||!Number.isInteger(k)||k<1||k>33)fail('INVALID_QUERY','Invalid search settings.');
  if(!validQuery(query))return {status:'abstained',reason:'Unsafe instructions are untrusted input.',candidates:[]};
  if(mode==='semantic')validateVector(vector??[]);
  const q=terms(query),rows=index.windows.map((w,i)=>{
    let score=0;
    if(mode==='semantic'){const v=vectorAt(vectors,i);for(let d=0;d<384;d++)score+=vector[d]*v[d];}
    else{const topics=new Set(terms(w.key.replaceAll('-',' ')+' '+w.source_context)),content=new Set(terms(w.source.title+' '+w.anchor.text));score=q.reduce((n,t)=>n+(topics.has(t)?3:content.has(t)?1:0),0);}
    return {window:w,score};
  }).filter(r=>r.score>=(mode==='semantic'?semantic_minimum:lexical_minimum)).sort((a,b)=>b.score-a.score||a.window.id.localeCompare(b.window.id,'en'));
  const seen=new Set(),out=[];for(const r of rows){if(seen.has(r.window.unit_id))continue;seen.add(r.window.unit_id);out.push(r);if(out.length===k)break;}
  return {status:out.length?'research_candidates':'abstained',method:mode,review:'pending_independent_review',similarity_is_not_entailment:true,candidates:out};
}
export const CLAIM_SCHEMA='astra.claim-assessment.v2';
const claimScope=w=>({usage:'source_research_only',source_context:w.source_context,limitations:w.limits});
const claimEvidence=w=>({source_id:w.anchor.document_id,citation:{window_id:w.id,unit_id:w.unit_id,section_id:w.section_id,original_sha256:w.anchor.original_sha256,page_index:w.anchor.page_index,page_sha256:w.anchor.page_sha256,start:w.anchor.start,end:w.anchor.end,offset_unit:w.anchor.offset_unit,text_sha256:w.anchor.text_sha256,base_citations:structuredClone(w.anchor.base_citations)}});

// Trusted tooling convenience only. Assessment independently resolves and checks
// the submitted fields; this builder never gives a client record authority.
export function makeClaimRequest(window,{kind='literal_quote',text=window.anchor.text}={}){
  return {schema_version:CLAIM_SCHEMA,evidence:claimEvidence(window),role:window.role,scope:claimScope(window),claim:{kind,text}};
}
function plainData(value,depth=0,seen=new Set()){
  if(depth>10)return false;
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return true;
  if(typeof value==='string')return value.length<=12000;
  if(typeof value!=='object'||seen.has(value)||!Array.isArray(value)&&![null,Object.prototype].includes(Object.getPrototypeOf(value)))return false;
  const entries=Object.entries(Object.getOwnPropertyDescriptors(value));
  if(entries.length>128)return false;seen.add(value);
  const valid=entries.every(([key,d])=>key.length<=100&&!d.get&&!d.set&&plainData(d.value,depth+1,seen));seen.delete(value);return valid;
}
const exactKeys=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
const claimOutcome=(status,decision,reason,binding=null)=>({schema_version:'astra.claim-result.v2',status,decision,abstained:decision!=='ACCEPT',reason,evidence_binding:binding,citations:[],research_only:true,clinical_support:false,independent_review:'pending',entailment:'not_independently_verified'});

export function assessClaim(request,index,{evidence}={}){
  if(plainData(request)&&request?.schema_version===CLAIM_SCHEMA&&!Object.hasOwn(request,'role'))return claimOutcome('invalid_evidence_binding','REJECT','missing_role');
  if(!plainData(request)||!exactKeys(request,['schema_version','evidence','role','scope','claim'])||request.schema_version!==CLAIM_SCHEMA||Buffer.byteLength(stableJSON(request))>24000||!exactKeys(request.claim,['kind','text'])||!['literal_quote','assertion','paraphrase'].includes(request.claim.kind)||typeof request.claim.text!=='string'||!request.claim.text.trim())return claimOutcome('invalid_claim_request','REJECT','invalid_schema_or_claim');
  const supplied=request.evidence;
  if(!exactKeys(supplied,['source_id','citation'])||!supplied.citation||typeof supplied.citation.window_id!=='string')return claimOutcome('invalid_evidence_binding','REJECT','missing_citation');
  if(request.role===null||typeof request.role!=='string'||!request.role.trim())return claimOutcome('invalid_evidence_binding','REJECT','missing_role');
  if(!Array.isArray(evidence)||!Array.isArray(index?.windows))return claimOutcome('invalid_evidence_binding','REJECT','authoritative_evidence_required');
  const matches=index.windows.filter(w=>w.id===supplied.citation.window_id);
  if(matches.length!==1)return claimOutcome('invalid_evidence_binding','REJECT','unknown_or_duplicate_window');
  const window=matches[0];
  try{validateWindow(window,evidence);}catch{return claimOutcome('invalid_evidence_binding','REJECT','index_evidence_mismatch');}
  const canonical=claimEvidence(window);
  if(supplied.source_id!==canonical.source_id)return claimOutcome('invalid_evidence_binding','REJECT','source_mismatch');
  if(hashJSON(supplied.citation)!==hashJSON(canonical.citation))return claimOutcome('invalid_evidence_binding','REJECT','citation_mismatch');
  if(request.role!==window.role)return claimOutcome('invalid_evidence_binding','REJECT','role_mismatch');
  const scope=claimScope(window);
  if(hashJSON(request.scope)!==hashJSON(scope))return claimOutcome('invalid_evidence_binding','REJECT','scope_mismatch');
  const binding={...canonical,role:window.role,scope,source:structuredClone(window.source)};
  if(!validQuery(request.claim.text)||!validQuery(window.anchor.text))return claimOutcome('untrusted_content','REJECT','embedded_instructions_or_unsafe_content',binding);
  if(window.claim_readiness!=='bounded_source_text')return claimOutcome('unverified_evidence_scope','ABSTAIN','source_scope_not_claim_ready',binding);
  if(request.claim.kind==='paraphrase')return claimOutcome('paraphrase_unverified','ABSTAIN','independent_entailment_unverified',binding);
  if(request.claim.kind!=='literal_quote'||request.claim.text!==window.anchor.text)return claimOutcome('unsupported_assertion','REJECT','complete_literal_quote_required',binding);
  const result=claimOutcome('verified_literal_support','ACCEPT','complete_canonical_quotation',binding);
  result.citations=[{...canonical.citation,document_id:canonical.source_id,role:window.role,source:structuredClone(window.source)}];
  result.support_scope='Attribution of this complete source quotation only; not scientific truth, medical approval or individual clinical advice.';
  return result;
}
