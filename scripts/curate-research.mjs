import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join,resolve } from 'node:path';
import { read,writeNew,directory } from '../services/acquisition/cache.mjs';
import { approvedSources,project,corpusRoot } from './research-corpus.mjs';
import { verifyOriginal } from '../services/corpus/acquire.mjs';
import { sha256,stableJSON,fail,ORIGINAL_SHA } from '../services/corpus/sources.mjs';
import { buildCuration,BASE_CORPUS_SHA,documentFor } from '../services/corpus/curation.mjs';

const execute=promisify(execFile),curationRoot=join(project,'data/corpus/n13-02');
const json=async(p,max=1048576)=>JSON.parse((await read(p,max)).toString('utf8'));
export async function loadInputs(){
  const sources=await approvedSources();for(const d of sources.documents)await verifyOriginal(join(corpusRoot,'originals'),d,await json(join(corpusRoot,'originals',d.id+'.receipt.json')));
  const raw=await read(join(corpusRoot,'derived/corpus.json'),24000000);
  if(sha256(raw)!==BASE_CORPUS_SHA)fail('CORPUS_MISMATCH','The immutable N13-01 corpus differs;no automatic rebuild/repair.');
  return {corpus:JSON.parse(raw.toString('utf8')),plan:await json(join(curationRoot,'sections.json')),evidence:await json(join(curationRoot,'evidence-units.json')),expectations:await json(join(curationRoot,'expectations.json'))};
}
export function requiredPages(curation){
  const result=Object.fromEntries(Object.keys(ORIGINAL_SHA).map(id=>[id,new Set()]));
  for(const s of curation.sections)for(const p of [...s.spans,s.heading_anchor,s.end_boundary])result[s.document_id].add(p.page_index);
  for(const a of curation.ambiguities)result[a.document_id].add(a.page);
  for(const c of curation.corrections)result[c.anchor.document_id].add(c.anchor.page_index);
  return Object.fromEntries(Object.entries(result).map(([id,pages])=>[id,[...pages].sort((a,b)=>a-b)]));
}
export function validatePageProof(corpus,curation,proofs){
  const required=requiredPages(curation);let count=0;
  if(!Array.isArray(proofs)||proofs.length!==2)fail('PAGE_PROOF_MISMATCH','Both approved original page proofs are required.');
  for(const [id,pages]of Object.entries(required)){
    const proof=proofs.find(p=>p.document_id===id);
    if(!proof||proof.schema_version!=='astra.target-pages-proof.v1'||proof.original_sha256!==ORIGINAL_SHA[id]||proof.parser_version!=='6.21.2'||proof.network_requests!==0||!Array.isArray(proof.pages)||stableJSON(proof.pages.map(p=>p?.page_index))!==stableJSON(pages))fail('PAGE_PROOF_MISMATCH','Selected page proof identity/coverage/version differs.');
    const doc=documentFor(corpus,id);
    for(const p of proof.pages){const page=doc.pages.find(x=>x.page_index===p.page_index);if(!page||page.sha256!==p.text_sha256||Buffer.byteLength(page.text)!==p.text_bytes)fail('PAGE_PROOF_MISMATCH','Original page re-extraction differs from the frozen source text.');count++;}
  }
  return count;
}
export async function targetedPageProof(corpus,curation){
  const proofs=[];
  for(const [id,pages]of Object.entries(requiredPages(curation))){
    const {stdout}=await execute('python3',['-I',join(project,'scripts/verify-curated-pages.py'),id,JSON.stringify(pages)],{timeout:60000,maxBuffer:1048576,encoding:'utf8'});
    proofs.push(JSON.parse(stdout));
  }
  validatePageProof(corpus,curation,proofs);return proofs;
}
export function printedLabelChecks(corpus,curation){
  const checks=[];
  for(const [id,pages]of Object.entries(requiredPages(curation))){const d=documentFor(corpus,id);for(const n of pages){
    const p=d.pages.find(p=>p.page_index===n),head=p.text.slice(0,180),m=id==='nasa-hrp-sleep-2016'?/^\s*(\d+)\s*\n/.exec(head):/\bPage (\d+) of \d+/.exec(head);
    checks.push({document_id:id,page_index:n,pdf_declared_label:p.pdf_page_label,printed_label:m?.[1]??null,verification:m?'original_text_header_only':'unresolved',rendered_page_verified:false});
  }}return checks;
}
const md=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'\\|');
export function reviewMarkdown(curation){
  const lines=['# N13-02 evidence review pack','','Engineering/source-text review only. Independent human/medical approval is pending. No retrieval/model answers or clinical validation.','',`Frozen base corpus: ${curation.base_corpus_sha256}`,'','## Reviewed section boundaries',''];
  for(const s of curation.sections)lines.push(`- **${md(s.key)}**: ${md(s.title)}; ${s.document_id}, physical pages ${s.heading_anchor.page_index}–${s.end_boundary.page_index}, ending before the next cited heading. Source-normalized label; exact boundary quotes remain in JSON.`);
  lines.push('','## Evidence expectations','');
  for(const q of curation.expectations){
    lines.push(`### ${q.id} — ${q.category}`,'',md(q.question),'',`Expected behavior: ${q.expected_behavior}.`, '',`Boundary: ${md(q.boundary)}`);
    if(q.supported_claims.length)lines.push('',...q.supported_claims.map(c=>`- Supported scope: ${md(c)}`));
    if(q.unsupported_claims.length)lines.push('',...q.unsupported_claims.map(c=>`- Unsupported scope: ${md(c)}`));
    if(q.abstention_reason)lines.push('',`Abstention/refusal reason: ${md(q.abstention_reason)}`);
    for(const id of q.evidence_unit_ids){const u=curation.units.find(u=>u.id===id);lines.push('',`Evidence **${u.key}** — ${u.role}; ${md(u.source_context)}. Limits: ${md(u.limits)}`);
      for(const p of u.spans)lines.push(`- ${p.document_id}, physical page ${p.page_index}, UTF-16 range ${p.start}–${p.end}; text SHA ${p.text_sha256}.`, '',...p.text.split('\n').map(line=>'> '+md(line)));
    }
    lines.push('','Independent review: pending; no medical approval.','');
  }
  lines.push('## Unresolved/limited evidence','');for(const a of curation.ambiguities)lines.push(`- ${md(a.id)}: ${md(a.explanation)} Location/semantic status: ${a.anchor_status}; accepted for claims: false.`);
  return lines.join('\n')+'\n';
}
function summary(curation,proofs,raw){return {status:'PASS',verification_scope:'Source/citation/curation structure and original integrity,not independent medical approval or model-answer accuracy',...curation.summary,selected_original_pages:proofs.reduce((n,p)=>n+p.pages.length,0),curation_sha256:sha256(raw),base_corpus_sha256:BASE_CORPUS_SHA,source_hashes:{...ORIGINAL_SHA},network_requests:0,independent_human_review:'pending',N13:'In Progress',N14_eligible:false};}
export async function buildOutput(output){
  const {corpus,plan,evidence,expectations}=await loadInputs(),curation=buildCuration(corpus,plan,evidence,expectations),proofs=await targetedPageProof(corpus,curation);
  curation.printed_label_checks=printedLabelChecks(corpus,curation);
  const dir=await directory(output),raw=Buffer.from(stableJSON(curation)+'\n');if(raw.length>6000000)fail('CURATION_LIMIT','Curated overlay exceeds6MB.');
  const evidenceRaw=Buffer.from(stableJSON(proofs)+'\n');
  const manifest={schema_version:'astra.curation-manifest.v1',version:curation.schema_version,base_corpus_sha256:BASE_CORPUS_SHA,curation_sha256:sha256(raw),selected_page_proof_sha256:sha256(evidenceRaw),plans:{sections:sha256(Buffer.from(stableJSON(plan))),units:sha256(Buffer.from(stableJSON(evidence))),expectations:sha256(Buffer.from(stableJSON(expectations)))},governance:'DE-N07-N13-01-N13-02',governance_sha256:sha256(await read(join(project,'docs/DE_N07_N13_01_N13_02.md'),65536))};
  await writeNew(join(dir,'curation.json'),raw);await writeNew(join(dir,'selected-pages.json'),evidenceRaw);await writeNew(join(dir,'manifest.json'),Buffer.from(stableJSON(manifest)+'\n'));await writeNew(join(dir,'REVIEW.md'),Buffer.from(reviewMarkdown(curation)));
  return summary(curation,proofs,raw);
}
export async function verifyOutput(dir){
  const {corpus,plan,evidence,expectations}=await loadInputs(),expected=buildCuration(corpus,plan,evidence,expectations);expected.printed_label_checks=printedLabelChecks(corpus,expected);
  const raw=await read(join(dir,'curation.json'),6000000),proofRaw=await read(join(dir,'selected-pages.json'),1048576),manifest=await json(join(dir,'manifest.json'));
  if(manifest.schema_version!=='astra.curation-manifest.v1'||manifest.version!==expected.schema_version||!raw.equals(Buffer.from(stableJSON(expected)+'\n'))||manifest.curation_sha256!==sha256(raw)||manifest.selected_page_proof_sha256!==sha256(proofRaw)||manifest.base_corpus_sha256!==BASE_CORPUS_SHA)fail('CURATION_MISMATCH','Saved overlay/proof does not match its deterministic plans and frozen corpus.');
  if(stableJSON(manifest.plans)!==stableJSON({sections:sha256(Buffer.from(stableJSON(plan))),units:sha256(Buffer.from(stableJSON(evidence))),expectations:sha256(Buffer.from(stableJSON(expectations)))}))fail('CURATION_MISMATCH','Reviewed input plans changed.');
  if(manifest.governance!=='DE-N07-N13-01-N13-02'||manifest.governance_sha256!==sha256(await read(join(project,'docs/DE_N07_N13_01_N13_02.md'),65536)))fail('GOVERNANCE_MISMATCH','Recorded bounded extension changed.');
  if(!(await read(join(dir,'REVIEW.md'),4000000)).equals(Buffer.from(reviewMarkdown(expected))))fail('CURATION_MISMATCH','Review document differs from its verified expectations.');
  const proofs=JSON.parse(proofRaw.toString('utf8'));validatePageProof(corpus,expected,proofs);
  return {...summary(expected,proofs,raw),page_proof_mode:'Previously recorded targeted original-page re-extraction verified against unchanged original/frozen hashes;not a fresh re-extraction in this command.'};
}
export function parseOptions(argv){const [mode,arg,...extra]=argv;if(!['build','verify'].includes(mode)||extra.length||arg&&(!arg.startsWith('--output=')||arg.length===9))throw Error('Usage: node scripts/curate-research.mjs build|verify [--output=path]');return {mode,output:arg?resolve(arg.slice(9)):join(curationRoot,'derived')};}
if(import.meta.main){try{const {mode,output}=parseOptions(process.argv.slice(2));console.log(JSON.stringify(await (mode==='build'?buildOutput:verifyOutput)(output),null,2));}catch(e){console.error(JSON.stringify({status:'BLOCKED',code:e.code??e.name,message:e.message}));process.exitCode=1;}}
