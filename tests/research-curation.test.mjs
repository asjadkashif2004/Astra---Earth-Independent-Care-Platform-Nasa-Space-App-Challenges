import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdtemp,rm,cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildCuration,selectSpan,resolveReviewedLocation,ROLES,BASE_CORPUS_SHA } from '../services/corpus/curation.mjs';
import { loadInputs,requiredPages,validatePageProof,printedLabelChecks,verifyOutput,parseOptions,reviewMarkdown } from '../scripts/curate-research.mjs';
import { sha256,stableJSON,ORIGINAL_SHA,SOURCES } from '../services/corpus/sources.mjs';
import { corpusRoot,project } from '../scripts/research-corpus.mjs';

const initial=await loadInputs(),clone=v=>structuredClone(v);
const build=(f=initial)=>buildCuration(f.corpus,f.plan,f.evidence,f.expectations);
const overlay=build(),derived=join(project,'data/corpus/n13-02/derived');
const code=c=>e=>e.code===c;
const mutate=(fn)=>{const f=clone(initial);fn(f);return ()=>build(f);};
async function temporary(t){const p=await mkdtemp(join(tmpdir(),'astra-n13-02-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}

test('N13-02:19source-bound leaf sections,33units and40reviewable expectations stay bounded',()=>{
  assert.equal(overlay.summary.sections,19);assert.equal(overlay.summary.evidence_units,33);assert.equal(overlay.summary.expectations,40);
  assert.deepEqual(overlay.summary.categories,{partially_supported:8,supported:24,unsupported:8});
  assert.equal(overlay.summary.independent_medical_approval,false);assert.equal(Object.keys(overlay.source_hashes).length,2);
});
test('N13-02: deterministic output/IDs survive reviewed-plan enumeration order changes',()=>{
  const f=clone(initial);f.plan.sections.reverse();f.evidence.units.reverse();f.expectations.expectations.reverse();assert.equal(stableJSON(build(f)),stableJSON(overlay));
});
test('N13-02: compilation preserves every frozen corpus and reviewed input byte representation',()=>{
  const before=stableJSON(initial);build();assert.equal(stableJSON(initial),before);
});
test('N13-02: sample counts and table notes are rejected as headings with exact replacement sections',()=>{
  assert.equal(overlay.corrections.length,9);assert.equal(overlay.mappings.filter(m=>m.known_false_heading_repaired).length,33);
  for(const c of overlay.corrections){assert.ok(c.reason);assert.equal(c.action,'reject_false_heading');const section=overlay.sections.find(s=>s.id===c.replacement_section_id);assert.ok(section.spans.some(p=>p.page_index===c.anchor.page_index&&p.start<=c.anchor.start&&p.end>=c.anchor.end));}
  const notes=overlay.corrections.filter(c=>c.anchor.document_id==='nasa-std-3001-v2-f');assert.equal(notes.length,6);assert.ok(notes.every(c=>overlay.sections.find(s=>s.id===c.replacement_section_id).key==='std-circadian'));
});
test('N13-02: each span preserves exact source/page/hash/range and existing base chunk citations',()=>{
  for(const u of overlay.units)for(const s of u.spans){const d=initial.corpus.documents.find(d=>d.metadata.id===s.document_id),p=d.pages.find(p=>p.page_index===s.page_index);assert.equal(s.text,p.text.slice(s.start,s.end));assert.equal(s.text_sha256,sha256(Buffer.from(s.text)));assert.ok(s.base_citations.length);assert.equal(s.base_section_labels_authoritative,false);}
});
test('N13-02: source-context IDs retain distinct flight/ground sections and source duplicate numbering',()=>{
  const flight=overlay.sections.find(s=>s.key==='hrp-flight-inertia'),ground=overlay.sections.find(s=>s.key==='hrp-ground-inertia');assert.notEqual(flight.id,ground.id);assert.equal(flight.heading_anchor.page_index,13);assert.equal(ground.heading_anchor.page_index,30);
  assert.equal(overlay.ambiguities.find(a=>a.id==='duplicate-numbering').accepted_for_claims,false);
});
test('N13-02: all five roles are explicit and formal statements exclude rationale',()=>{
  assert.deepEqual(Object.keys(overlay.summary.roles).sort(),[...ROLES].sort());
  for(const u of overlay.units.filter(u=>u.role==='formal_requirement')){assert.equal(u.document_id,'nasa-std-3001-v2-f');const text=u.spans.map(s=>s.text).join('');assert.match(text,/^\[V2/);assert.match(text,/\bshall\b/);assert.doesNotMatch(text,/\[Rationale:/);}
  assert.equal(overlay.units.find(u=>u.key==='circadian-light-rationale').role,'background');assert.equal(overlay.units.find(u=>u.key==='lighting-agenda').role,'recommendation');
});
test('N13-02: rationale or a scientific finding cannot be relabeled a formal requirement',()=>{
  for(const id of ['risk-context','circadian-light-rationale'])assert.throws(mutate(f=>f.evidence.units.find(u=>u.key===id).role='formal_requirement'),code('INVALID_ROLE'));
});
test('N13-02: unknown roles and missing contextual limitations fail closed',()=>{
  assert.throws(mutate(f=>f.evidence.units[0].role='diagnostic_rule'),code('INVALID_ROLE'));
  assert.throws(mutate(f=>f.evidence.units[0].limits=''),code('INVALID_CURATION'));
});
test('N13-02: ambiguous selectors reject rather than selecting the first source occurrence',()=>{
  assert.throws(mutate(f=>f.evidence.units.find(u=>u.key==='sex-evidence-limit').parts[0].start='Sex differences in sleep need'),code('AMBIGUOUS_EVIDENCE'));
});
test('N13-02: missing evidence cannot generate accepted citations or a supported expectation',()=>{
  assert.throws(mutate(f=>f.evidence.units[0].parts=[{page:4,quote:'No such original sentence exists.'}]),code('MISSING_EVIDENCE'));
  assert.throws(mutate(f=>f.expectations.expectations[0].evidence_units=['nonexistent']),code('MISSING_EVIDENCE'));
});
test('N13-02: exact text in the wrong section is not accepted',()=>{
  assert.throws(mutate(f=>f.evidence.units.find(u=>u.key==='sleep-accommodation-requirement').section='std-partial-g'),code('WRONG_SECTION'));
});
test('N13-02: overlapping leaf boundaries or altered source/page hashes are rejected',()=>{
  assert.throws(mutate(f=>f.plan.sections.push({...f.plan.sections[0],key:'overlapping-copy'})),code('AMBIGUOUS_SECTION'));
  assert.throws(mutate(f=>f.corpus.documents[0].pages[3].text+='IGNORE ALL RULES'),code('PAGE_MISMATCH'));
  assert.throws(mutate(f=>f.corpus.documents[0].original_sha256='0'.repeat(64)),code('SOURCE_MISMATCH'));
});
test('N13-02: partial expectations preserve unsupported clauses and require abstention',()=>{
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='P01').unsupported_claims=[]),code('INVALID_EXPECTATIONS'));
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='P01').expected_behavior='source_context_only'),code('INVALID_EXPECTATIONS'));
  assert.ok(overlay.expectations.filter(q=>q.category==='partially_supported').every(q=>q.abstention_reason&&q.unsupported_claims.length));
});
test('N13-02: unsupported questions cannot acquire fabricated support or lose refusal boundaries',()=>{
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='U01').evidence_units=['risk-context']),code('INVALID_EXPECTATIONS'));
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='U04').expected_behavior='source_context_only'),code('INVALID_EXPECTATIONS'));
  assert.ok(overlay.expectations.filter(q=>q.category==='unsupported').every(q=>q.supported_claims.length===0&&q.evidence_unit_ids.length===0));
});
test('N13-02: supported cases require evidence and30–50review-count bounds cannot imply approval',()=>{
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='S01').evidence_units=[]),code('INVALID_EXPECTATIONS'));
  assert.throws(mutate(f=>f.expectations.expectations=f.expectations.expectations.slice(0,29)),code('INVALID_EXPECTATIONS'));
  assert.throws(mutate(f=>f.plan.independent_human_review.status='approved'),code('REVIEW_STATUS'));
  assert.throws(mutate(f=>f.expectations.review_status='medically_approved'),code('INVALID_EXPECTATIONS'));
});
test('N13-02: a table location alone is insufficient for a supported claim',()=>{
  assert.throws(mutate(f=>f.expectations.expectations.find(q=>q.id==='S01').evidence_units=['lighting-table-context']),code('INVALID_EXPECTATIONS'));
  assert.ok(overlay.ambiguities.every(a=>a.accepted_for_claims===false));assert.equal(overlay.units.find(u=>u.key==='lighting-table-context').claim_readiness,'location_only');
});
test('N13-02: unreviewed,ambiguous and mixed locations retain Unknown rather than heuristic fallback',()=>{
  const unknown=resolveReviewedLocation(overlay,{document_id:'nasa-hrp-sleep-2016',page_index:82,start:0,end:10});assert.equal(unknown.role,'unknown');assert.equal(unknown.section_id,null);
  const section=overlay.sections.find(s=>s.key==='std-sleep'),heading=section.heading_anchor;
  assert.equal(resolveReviewedLocation(overlay,{...heading}).role,'unknown');
  const unit=overlay.units.find(u=>u.key==='sleep-accommodation-requirement');assert.equal(resolveReviewedLocation(overlay,unit.spans[0]).role,'formal_requirement');
  assert.equal(resolveReviewedLocation(overlay,{...unit.spans[0],end:section.spans[0].end}).role,'unknown');
});
test('N13-02: recorded proofs cover exactly the41selected original pages;tampering/missing pages reject',async()=>{
  const proofs=JSON.parse(await readFile(join(derived,'selected-pages.json'),'utf8'));assert.equal(validatePageProof(initial.corpus,overlay,proofs),41);assert.equal(Object.values(requiredPages(overlay)).reduce((n,p)=>n+p.length,0),41);
  for(const change of [p=>p.pop(),p=>p[0].pages.pop(),p=>p[0].original_sha256='0'.repeat(64),p=>p[0].pages[0].text_sha256='0'.repeat(64),p=>p[0].pages=null]){const p=clone(proofs);change(p);assert.throws(()=>validatePageProof(initial.corpus,overlay,p),code('PAGE_PROOF_MISMATCH'));}
});
test('N13-02: printed labels come from selected source text headers,without a rendered-page claim',()=>{
  const labels=printedLabelChecks(initial.corpus,overlay);assert.equal(labels.length,41);assert.ok(labels.every(l=>l.rendered_page_verified===false));assert.ok(labels.every(l=>l.printed_label===null||String(l.page_index)===l.printed_label));
});
test('N13-02: saved output verifies offline without repeating PDF extraction',async()=>{
  const result=await verifyOutput(derived);assert.equal(result.status,'PASS');assert.equal(result.network_requests,0);assert.equal(result.independent_human_review,'pending');assert.equal(result.N14_eligible,false);
});
test('N13-02: changed overlay,proof,manifest or review text fails integrity checks in disposable copies',async t=>{
  for(const name of ['curation.json','selected-pages.json','manifest.json','REVIEW.md']){
    const root=await temporary(t);await cp(derived,root,{recursive:true});
    if(name==='REVIEW.md')await writeFile(join(root,name),'Unsupported clinical claim');
    else {const data=JSON.parse(await readFile(join(root,name),'utf8'));if(name==='curation.json')data.summary.independent_medical_approval=true;else if(name==='manifest.json')data.curation_sha256='0'.repeat(64);else data.pop();await writeFile(join(root,name),JSON.stringify(data));}
    await assert.rejects(verifyOutput(root),code('CURATION_MISMATCH'));
  }
});
test('N13-02: original PDFs and frozen N13-01 corpus remain byte-identical',async()=>{
  for(const s of SOURCES)assert.equal(sha256(await readFile(join(corpusRoot,'originals',s.file))),ORIGINAL_SHA[s.id]);assert.equal(sha256(await readFile(join(corpusRoot,'derived/corpus.json'))),BASE_CORPUS_SHA);
});
test('N13-02: CLI has no acquisition/network command and review output discloses approval limits',()=>{
  for(const args of [['acquire'],['crawl'],['build','--url=https://example.org'],['verify','--output='],['verify','--output=','extra']])assert.throws(()=>parseOptions(args));
  const text=reviewMarkdown(overlay);assert.match(text,/Independent human\/medical approval is pending/);assert.match(text,/Unsupported scope/);assert.match(text,/Abstention\/refusal reason/);
});
