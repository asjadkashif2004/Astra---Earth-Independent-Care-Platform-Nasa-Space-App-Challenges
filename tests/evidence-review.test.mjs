import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdtemp,rm,cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEvidenceReview,CURATED_SHA } from '../services/corpus/evidence-review.mjs';
import { loadReviewInputs,reviewRoot,verifyReviewOutput,packetMarkdown,coverageMarkdown,parseOptions } from '../scripts/review-evidence.mjs';
import { sha256,stableJSON,ORIGINAL_SHA,SOURCES } from '../services/corpus/sources.mjs';
import { corpusRoot } from '../scripts/research-corpus.mjs';

const inputs=await loadReviewInputs(),clone=v=>structuredClone(v),build=(f=inputs)=>buildEvidenceReview(f.corpus,f.curation,f.plan),packet=build(),derived=join(reviewRoot,'derived');
const code=c=>e=>e.code===c;
const mutate=fn=>{const f=clone(inputs);fn(f);return ()=>build(f);};
async function temporary(t){const p=await mkdtemp(join(tmpdir(),'astra-n13-03-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}

test('N13-03: all40existing cases are technically reviewed without changing24/8/8categories',()=>{
  assert.equal(packet.summary.technically_reviewed_expectations,40);assert.deepEqual(packet.summary.categories,{partially_supported:8,supported:24,unsupported:8});assert.equal(packet.summary.category_changes,0);
  for(const q of packet.cases){const old=inputs.curation.expectations.find(x=>x.id===q.id);assert.equal(q.category,old.category);assert.equal(q.source_case_sha256,sha256(Buffer.from(stableJSON(old))));assert.equal(q.technical_review.status,'complete');}
});
test('N13-03: every case keeps independent decisions,reviewer and approval evidence pending',()=>{
  assert.equal(packet.summary.independently_approved_expectations,0);
  for(const q of packet.cases){assert.equal(q.independent_review.status,'pending');for(const k of ['reviewer','qualifications','reviewed_at','scientific_support_decision','medical_scope_boundary_decision','approval_evidence'])assert.equal(q.independent_review[k],null);assert.equal(q.technical_review.independent_medical_approval,false);}
});
test('N13-03: self-approved medical or owner-scope state is rejected before packet generation',()=>{
  assert.throws(mutate(f=>f.plan.independent_human_review.status='approved'),code('REVIEW_APPROVAL_UNSUPPORTED'));
  assert.throws(mutate(f=>f.plan.independent_human_review.reviewer='invented reviewer'),code('REVIEW_APPROVAL_UNSUPPORTED'));
  assert.throws(mutate(f=>f.plan.scope_acceptance='accepted'),code('INVALID_REVIEW'));
});
test('N13-03: full source attribution and original identities remain explicit for all33units',()=>{
  assert.equal(packet.sources.length,2);assert.equal(packet.evidence.length,33);
  for(const u of packet.evidence){const s=u.source_attribution;assert.equal(s.original_sha256,ORIGINAL_SHA[u.document_id]);assert.ok(s.title&&s.authors.length&&s.publisher&&s.version&&s.attribution&&s.canonical_url);assert.equal(u.claim_approval,'pending_independent_review');}
  assert.ok(packet.sources.find(s=>s.document_id==='nasa-hrp-sleep-2016').publication_date_note.includes('January'));
});
test('N13-03: coverage spans all four topics and exactly the existing reviewed unit set',()=>{
  assert.equal(packet.coverage.areas.length,8);assert.deepEqual([...new Set(packet.coverage.areas.flatMap(a=>a.topics))].sort(),['circadian_disruption','fatigue','sleep','workload']);
  assert.equal(new Set(packet.coverage.areas.flatMap(a=>a.units)).size,33);assert.equal(packet.coverage.runtime_claim_admission,false);assert.match(packet.coverage.default_claim_policy,/exclude_unreviewed/);
});
test('N13-03: missing,duplicate or weakened exclusions cannot admit unsupported claims',()=>{
  assert.throws(mutate(f=>f.plan.exclusions.pop()),code('EXCLUSION_MISSING'));
  assert.throws(mutate(f=>f.plan.exclusions[0].decision='include'),code('EXCLUSION_MISSING'));
  assert.throws(mutate(f=>f.plan.exclusions[0].id=f.plan.exclusions[1].id),code('EXCLUSION_MISSING'));
});
test('N13-03: unreviewed units,new topics and missing unit decisions fail closed',()=>{
  assert.throws(mutate(f=>f.plan.areas[0].units.push('unreviewed-unit')),code('COVERAGE_MISMATCH'));
  assert.throws(mutate(f=>f.plan.areas[0].topics=['unapproved-topic']),code('COVERAGE_MISMATCH'));
  assert.throws(mutate(f=>f.plan.areas[0].units.pop()),code('COVERAGE_MISMATCH'));
});
test('N13-03: case omissions,duplicates or category amendments cannot be silently accepted',()=>{
  assert.throws(mutate(f=>f.plan.cases.pop()),code('INVALID_REVIEW'));
  assert.throws(mutate(f=>f.plan.cases[0].id=f.plan.cases[1].id),code('CASE_MISMATCH'));
  assert.throws(mutate(f=>f.plan.cases[0].category='unsupported'),code('CASE_MISMATCH'));
});
test('N13-03: every technical review has a case-specific note and valid coverage assignment',()=>{
  assert.throws(mutate(f=>f.plan.cases[0].note=''),code('INVALID_REVIEW'));
  assert.throws(mutate(f=>f.plan.cases[0].areas=['missing-area']),code('COVERAGE_MISMATCH'));
  assert.ok(packet.cases.every(q=>q.technical_review.note&&q.coverage_areas.length));
});
test('N13-03: original partial/unsupported boundaries and mandatory abstention remain intact',()=>{
  for(const q of packet.cases){if(q.category==='partially_supported'){assert.ok(q.supported_claims.length&&q.unsupported_claims.length&&q.abstention_reason);assert.equal(q.expected_behavior,'context_then_abstain_unsupported_part');}if(q.category==='unsupported'){assert.equal(q.supported_claims.length,0);assert.equal(q.evidence_refs.length,0);assert.ok(['abstain','refuse_unsafe_request'].includes(q.expected_behavior));}}
  assert.equal(packet.cases.filter(q=>q.expected_behavior==='refuse_unsafe_request').length,2);
});
test('N13-03: altered corpus,curation or fabricated source support fails frozen provenance',()=>{
  assert.throws(mutate(f=>f.corpus.documents[0].pages[3].text+='fabricated'),code('REVIEW_SOURCE_MISMATCH'));
  assert.throws(mutate(f=>f.curation.expectations[0].supported_claims=['individual diagnosis']),code('REVIEW_SOURCE_MISMATCH'));
});
test('N13-03: exact Table2title fixes only the old ambiguous page-number locator',()=>{
  const fix=packet.corrections[0];assert.equal(fix.prior_locator,'20');assert.equal(fix.prior_curation_sha256,CURATED_SHA);assert.equal(fix.new_title_anchor.page_index,20);assert.equal(fix.new_title_anchor.text,'Table 2. Spaceflight Cognitive Performance Studies');assert.equal(fix.action,'replace_review_locator_only');assert.equal(fix.numerical_claims_admitted,false);
  assert.equal(inputs.curation.ambiguities.find(a=>a.id==='performance-table').quote,'20');
});
test('N13-03: all four relevant tables have verified locations but no numerical/clinical admission',()=>{
  assert.equal(packet.tables.length,4);for(const t of packet.tables){assert.equal(t.location_status,'exact_title_and_page_verified');assert.equal(t.numerical_claims_admitted,false);assert.equal(t.clinical_inference_admitted,false);assert.ok(t.title_anchor.base_citations.length);}
  assert.equal(packet.summary.new_pdf_extractions,0);
});
test('N13-03: numeric table approval,unrelated expansion or ambiguous title cannot pass',()=>{
  assert.throws(mutate(f=>f.plan.tables[0].numeric_claims='approved'),code('TABLE_POLICY'));
  assert.throws(mutate(f=>f.plan.tables.pop()),code('TABLE_POLICY'));
  assert.throws(mutate(f=>f.plan.tables.find(t=>t.id==='hrp-performance-table').title='20'),code('AMBIGUOUS_EVIDENCE'));
});
test('N13-03: a clear textual facility qualifier is retained separately from excluded table numerics',()=>{
  assert.equal(packet.coverage.textual_numeric_qualifier.expectation_id,'S20');assert.match(packet.cases.find(q=>q.id==='S20').supported_claims.join(' '),/greater than30days/);assert.ok(packet.tables.every(t=>!t.numerical_claims_admitted));
});
test('N13-03: technical counts cannot close N07/N13 or authorize N14',()=>{
  assert.equal(packet.summary.N13_status,'In Progress');assert.equal(packet.summary.N14_eligible,false);assert.equal(packet.closure_gates.find(g=>g.id==='N07-prerequisite').status,'open_dependency');assert.equal(packet.closure_gates.find(g=>g.id==='evidence-approval').status,'pending_independent_review');assert.equal(packet.closure_gates.find(g=>g.id==='N14-authorization').status,'not_authorized');
});
test('N13-03: deterministic review output survives top-level reviewed-input enumeration changes',()=>{
  const f=clone(inputs);f.plan.cases.reverse();f.plan.areas.reverse();f.plan.exclusions.reverse();f.plan.tables.reverse();assert.equal(stableJSON(build(f)),stableJSON(packet));
});
test('N13-03: source and historical input objects are not mutated by review compilation',()=>{
  const before=stableJSON(inputs);build();assert.equal(stableJSON(inputs),before);
});
test('N13-03: concise human exports show every pending case,source attribution and exclusions',()=>{
  const review=packetMarkdown(packet),coverage=coverageMarkdown(packet);assert.equal((review.match(/^### [SPU]\d\d /gm)??[]).length,40);assert.equal((review.match(/Independent scientific support decision: \*\*pending\*\*/g)??[]).length,40);assert.match(review,/0 independently approved/);assert.match(review,/originals\//);assert.match(coverage,/Numerical claims/);assert.match(coverage,/N07-prerequisite/);
});
test('N13-03: completed output verifies offline with no source download or re-extraction',async()=>{
  const r=await verifyReviewOutput(derived);assert.equal(r.status,'PASS');assert.equal(r.network_requests,0);assert.equal(r.new_pdf_extractions,0);assert.equal(r.independently_approved_expectations,0);
});
test('N13-03: edited approval,manifest or review exports are rejected in disposable copies',async t=>{
  for(const name of ['packet.json','manifest.json','REVIEW_PACKET.md','COVERAGE.md']){const root=await temporary(t);await cp(derived,root,{recursive:true});
    if(name.endsWith('.md'))await writeFile(join(root,name),'Clinically approved');else{const data=JSON.parse(await readFile(join(root,name),'utf8'));if(name==='packet.json')data.cases[0].independent_review.status='approved';else data.packet_sha256='0'.repeat(64);await writeFile(join(root,name),JSON.stringify(data));}
    await assert.rejects(verifyReviewOutput(root),code('REVIEW_OUTPUT_MISMATCH'));
  }
});
test('N13-03: unchanged original documents and CLI without acquisition preserve the task boundary',async()=>{
  for(const s of SOURCES)assert.equal(sha256(await readFile(join(corpusRoot,'originals',s.file))),ORIGINAL_SHA[s.id]);
  for(const args of [['acquire'],['crawl'],['build','--url=https://example.org'],['verify','--output=']])assert.throws(()=>parseOptions(args));
});
