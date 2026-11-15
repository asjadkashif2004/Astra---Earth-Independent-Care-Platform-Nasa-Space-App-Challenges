import { join,resolve } from 'node:path';
import { read,writeNew,directory } from '../services/acquisition/cache.mjs';
import { project,corpusRoot } from './research-corpus.mjs';
import { verifyOutput as verifyCuration } from './curate-research.mjs';
import { sha256,stableJSON,fail } from '../services/corpus/sources.mjs';
import { BASE_CORPUS_SHA } from '../services/corpus/curation.mjs';
import { CURATED_SHA,buildEvidenceReview } from '../services/corpus/evidence-review.mjs';

export const reviewRoot=join(project,'data/corpus/n13-03');
export async function loadReviewInputs(){
  // Reuses the saved targeted proof. No publication acquisition or PDF re-extraction.
  await verifyCuration(join(project,'data/corpus/n13-02/derived'));
  const corpus=await read(join(corpusRoot,'derived/corpus.json'),24000000),curation=await read(join(project,'data/corpus/n13-02/derived/curation.json'),6000000);
  if(sha256(corpus)!==BASE_CORPUS_SHA||sha256(curation)!==CURATED_SHA)fail('REVIEW_SOURCE_MISMATCH','Frozen source/curation changed.');
  return {corpus:JSON.parse(corpus.toString('utf8')),curation:JSON.parse(curation.toString('utf8')),plan:JSON.parse((await read(join(reviewRoot,'review-plan.json'),256000)).toString('utf8'))};
}
const md=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'\\|');
const pdf=(source,page)=>`[${md(source.document_id)} p${page}](../../n13-01/originals/${encodeURIComponent(source.original_file)}#page=${page})`;
export function packetMarkdown(packet){
  const lines=['# Independent evidence review packet — N13-03','','**40 technically reviewed expectations; 0 independently approved. Every independent decision remains pending.**','','This packet prepares review of source support and scope. It does not certify ASTRA,provide clinical advice or authorize N14–N16. Engineering/source-text checks and tests are not independent scientific/medical approval.','','Reviewer: record identity,appropriate qualifications,date,accept/revise/reject decision,comments and evidence for each ID. Assess clinical-scope boundaries with appropriately qualified medical review where applicable. Supply actual decisions through a separately approved recording task;do not edit immutable generated evidence to simulate approval.','','## Preserved sources',''];
  for(const d of packet.sources)lines.push(`- **${md(d.document_id)}**: ${md(d.title)}; ${md(d.authors.join('; '))}; ${md(d.publisher)}; version ${md(d.version)}. ${pdf(d,1)}; [official record](${d.canonical_url}). Original SHA ${d.original_sha256}. ${md(d.publication_date_note)} Attribution: ${md(d.attribution)}`);
  lines.push('','## Forty per-expectation decisions','');
  for(const q of packet.cases){
    lines.push(`### ${q.id} — ${q.category} — independent review pending`,'',md(q.question),'',`Allowed source scope: ${q.supported_claims.length?q.supported_claims.map(md).join(' '):'None; no supporting medical/scientific citation is manufactured.'}`,`Unsupported/excluded scope: ${q.unsupported_claims.length?q.unsupported_claims.map(md).join(' '):'No additional or individualized inference beyond the stated source context.'}`,`Required behavior: ${q.expected_behavior}. ${md(q.boundary)}`);
    if(q.abstention_reason)lines.push(`Abstention/refusal reason: ${md(q.abstention_reason)}`);
    const refs=q.evidence_refs.map(r=>{const source=packet.sources.find(s=>s.document_id===r.document_id);return `${r.unit_key} (${r.role}): ${r.pages.map(p=>pdf(source,p)).join(', ')}`;});
    lines.push(`Evidence: ${refs.length?refs.join('; '):'No positive source support;the applicable boundary is explicitly stated above.'}`,`Technical review: ${md(q.technical_review.note)}`,'Independent scientific support decision: **pending**. Medical-scope decision: **pending**. Reviewer/qualifications/date/comments/approval evidence: **not supplied**.','');
  }
  lines.push('## Review completion boundaries','','Use packet.json for exact original/page/range/text hashes and per-case blank decision fields. The earlier N13-02 review pack retains the full quoted excerpts. Numerical table claims remain excluded;see COVERAGE.md. The clear textual duration qualifier in S20 remains a system-design qualifier,not a clinical threshold.','','All40cases require actual independent decisions;the current24/8/8classification is a bounded technical assessment,not an approved clinical answer set. Full N07→N13 closure and separate N14 authorization remain unresolved.');
  return lines.join('\n')+'\n';
}
export function coverageMarkdown(packet){
  const lines=['# N13-03 evidence coverage and exclusions','','Technical matrix finalized for independent/owner review. Scope acceptance and evidence approval are pending;no runtime claim admission is authorized. Only the33reviewed excerpts from the two frozen originals are considered. Unreviewed/ambiguous evidence defaults to exclusion.','','## Included for bounded review','','| Area | Topics | Allowed scope |','|---|---|---|'];
  for(const a of packet.coverage.areas)lines.push(`| ${a.id} | ${a.topics.join(', ')} | ${md(a.scope)} |`);
  lines.push('','## Excluded claims','','| Exclusion | Scope | Reason |','|---|---|---|');for(const x of packet.coverage.exclusions)lines.push(`| ${x.id} | ${md(x.scope)} | ${md(x.reason)} |`);
  lines.push('',`Textual qualifier: ${md(packet.coverage.textual_numeric_qualifier.policy)}`,'','## Relevant table inspection','','| Table | Original page | Location | Numerical claims | Review finding |','|---|---|---|---|---|');
  for(const t of packet.tables)lines.push(`| ${md(t.title)} | ${pdf(t.source_attribution,t.page)} | exact title/page verified | excluded | ${md(t.interpretation)} |`);
  lines.push('','The six existing source-text pages11/12/20/21/152/156 were inspected;no new extraction,OCR or rendered-page review was performed. Title/reference meaning is identifiable. Reliable numerical row/column/operator/footnote interpretation is not established by this pass and is not admitted. This does not claim the original tables are inherently uninterpretable.','','The additive Table2correction replaces the prior page-number-only locator with its exact title. It does not alter historical records or approve numbers.','','## Formal closure gates','','| Gate | Status | Requirement |','|---|---|---|');
  for(const g of packet.closure_gates)lines.push(`| ${g.id} | ${g.status} | ${md(g.requirement)} |`);
  lines.push('','Four table exclusions need no forced numerical extraction if the owner accepts this restricted scope;they must remain excluded. Broader quantitative claims would require separately authorized remediation and independent review. No N07 requirement is waived.');
  return lines.join('\n')+'\n';
}
export async function makeReviewOutput(){const inputs=await loadReviewInputs();return {inputs,packet:buildEvidenceReview(inputs.corpus,inputs.curation,inputs.plan)};}
async function materialize(){
  const {inputs,packet}=await makeReviewOutput(),raw=Buffer.from(stableJSON(packet)+'\n');if(raw.length>2000000)fail('REVIEW_LIMIT','Bounded packet exceeds2MB.');
  const documents={'REVIEW_PACKET.md':Buffer.from(packetMarkdown(packet)),'COVERAGE.md':Buffer.from(coverageMarkdown(packet))};
  const manifest={schema_version:'astra.closure-review-manifest.v1',packet_sha256:sha256(raw),plan_sha256:sha256(Buffer.from(stableJSON(inputs.plan))),base_corpus_sha256:BASE_CORPUS_SHA,prior_curation_sha256:CURATED_SHA,prior_review_sha256:sha256(await read(join(project,'data/corpus/n13-02/derived/REVIEW.md'),128000)),governance:'DE-N07-N13-01-N13-03',governance_sha256:sha256(await read(join(project,'docs/DE_N07_N13_01_N13_03.md'),65536)),exports:Object.fromEntries(Object.entries(documents).map(([name,data])=>[name,sha256(data)]))};
  return {packet,raw,documents,manifest};
}
export async function buildReviewOutput(output){
  const result=await materialize(),dir=await directory(output);
  await writeNew(join(dir,'packet.json'),result.raw);for(const [name,data]of Object.entries(result.documents))await writeNew(join(dir,name),data);await writeNew(join(dir,'manifest.json'),Buffer.from(stableJSON(result.manifest)+'\n'));
  return {status:'PASS',verification_scope:'Technical source/citation/scope/consistency checks only;no independent medical approval',...result.packet.summary,packet_sha256:sha256(result.raw)};
}
export async function verifyReviewOutput(output){
  const result=await materialize();
  if(!(await read(join(output,'packet.json'),2000000)).equals(result.raw)||!(await read(join(output,'manifest.json'),65536)).equals(Buffer.from(stableJSON(result.manifest)+'\n')))fail('REVIEW_OUTPUT_MISMATCH','Saved review packet/manifest differs from the frozen inputs and deterministic review plan.');
  for(const [name,data]of Object.entries(result.documents))if(!(await read(join(output,name),512000)).equals(data))fail('REVIEW_OUTPUT_MISMATCH','Human review export changed.');
  return {status:'PASS',verification_scope:'Technical source/citation/scope/consistency checks only;no independent medical approval',...result.packet.summary,packet_sha256:sha256(result.raw)};
}
export function parseOptions(argv){const [mode,arg,...extra]=argv;if(!['build','verify'].includes(mode)||extra.length||arg&&(!arg.startsWith('--output=')||arg.length===9))throw Error('Usage: node scripts/review-evidence.mjs build|verify [--output=path]');return {mode,output:arg?resolve(arg.slice(9)):join(reviewRoot,'derived')};}
if(import.meta.main){try{const {mode,output}=parseOptions(process.argv.slice(2));console.log(JSON.stringify(await(mode==='build'?buildReviewOutput:verifyReviewOutput)(output),null,2));}catch(e){console.error(JSON.stringify({status:'BLOCKED',code:e.code??e.name,message:e.message}));process.exitCode=1;}}
