import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile,writeFile,mkdtemp,rm,stat } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { acquire,verifyCache } from '../services/acquisition/cache.mjs';
import { sha256,assertAllowedURL,validateApproval,validateOriginal } from '../services/acquisition/source.mjs';
import { OSDR_ID,OSDR_URL,osdrVersion,parseOSDRMetadata,buildDatasetCard,buildSplitManifest,validateDatasetCard,validateSplitManifest } from '../services/acquisition/osdr.mjs';
import { parseAcquisitionOptions } from '../scripts/scientific-acquire.mjs';

const project=fileURLToPath(new URL('../',import.meta.url)),cache=join(project,'data/scientific/cache');
const approval=JSON.parse(readFileSync(new URL('../data/scientific/osdr-osd-1.approval.json',import.meta.url),'utf8'));
const entry=join(cache,`${approval.id}-${approval.resource.sha256}`),original=readFileSync(join(entry,'original.json'));
const data=JSON.parse(original),manifest=JSON.parse(readFileSync(join(entry,'manifest.json'),'utf8'));
const context={approval,manifest,bytes:original},code=c=>e=>e.code===c;
const copy=structuredClone,clock=()=> '2026-10-23T15:00:00.000Z';
async function temp(t){const root=await mkdtemp(join(tmpdir(),'astra-osdr-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
function fixture(mutate=()=>{}){const d=copy(data);mutate(d);const bytes=Buffer.from(JSON.stringify(d)),a=copy(approval);a.resource.bytes=bytes.length;a.resource.sha256=sha256(bytes);a.publication.version=osdrVersion(a.resource.sha256);return {a,bytes};}
function response(bytes,status=200){return {status,headers:{'content-type':'application/json','content-length':String(bytes.length)},body:(async function*(){yield bytes;})(),close(){}};}

test('N07-02: only the exact OSD-1 aggregate URL is added; child endpoints,other studies,queries,hosts and cross-source approval reject',()=>{
  assert.equal(assertAllowedURL(OSDR_URL),OSDR_URL);assert.equal(validateApproval(approval),approval);
  for(const url of [OSDR_URL+'files/',OSDR_URL+'assays/',OSDR_URL.replace('OSD-1','OSD-2'),OSDR_URL+'?format=csv',OSDR_URL.replace('https:','http:'),OSDR_URL.replace('visualization.osdr.nasa.gov','evil.test'),OSDR_URL+'#x'])assert.throws(()=>assertAllowedURL(url),code('SOURCE_NOT_ALLOWED'));
  const ntrs=JSON.parse(readFileSync(new URL('../data/scientific/approved-sources.json',import.meta.url),'utf8'));ntrs.resource.url=OSDR_URL;
  assert.throws(()=>validateApproval(ntrs),code('SOURCE_NOT_ALLOWED'));
});
test('N07-02: strict approval rejects unknown fields,rights upgrades,invented dates,clinical scope and unbounded resources',()=>{
  for(const change of [a=>a.extra=true,a=>a.rights.license_id='CC0-1.0',a=>a.rights.statement='all NASA data is free',a=>a.rights.record_url='https://data.nasa.gov/other',a=>a.rights.attribution='',a=>a.rights.reviewed_on='2026-02-30',a=>a.publication.authors=[],a=>a.publication.published_on='2006-07-04',a=>a.publication.version='Version 1',a=>a.scope.contains_patient_data=true,a=>a.resource.bytes=65537,a=>a.resource.sha256='x',a=>a.resource.media_type='application/zip']){
    const a=copy(approval);change(a);assert.throws(()=>validateApproval(a));
  }
});
test('N07-02: shipped original verifies organism,identity,measurement context and actual dates with unavailable counts preserved',async()=>{
  const verified=await verifyCache({root:cache,approval});assert.equal(verified.bytes,8054);assert.equal(verified.sha256,'cfe7d81c59efc3b01b4407db0854b4224b51bfcb9d8b4f590fc8467ededa6d64');
  const p=parseOSDRMetadata(validateOriginal(original,approval));assert.equal(p.accession,'OSD-1');assert.equal(p.legacy_accession,'GLDS-1');assert.equal(p.organism,'Drosophila melanogaster');
  assert.deepEqual(p.mission,{name:'STS-121',start_date:'2006-07-04',end_date:'2006-07-17'});assert.equal(p.study_public_release_at,'2013-12-11T00:00:00.000Z');
  assert.deepEqual(p.measurement_types,['transcription profiling']);assert.deepEqual(p.technology_types,['DNA microarray']);assert.deepEqual(p.platforms,['Affymetrix']);
  assert.ok(Object.values(p.counts).every(v=>v===null));assert.equal(p.study_release_version,null);assert.equal(p.study_modified_at,null);
});
test('N07-02: absent/error metadata fails closed;other/mixed studies and unsafe child references are rejected',()=>{
  for(const d of [null,[],{}, {error:'unavailable'}, {success:false}, {'OSD-1':{}}, {'OSD-1':{metadata:null}}])assert.throws(()=>parseOSDRMetadata(d),code('METADATA_UNAVAILABLE'));
  for(const change of [d=>d['OSD-2']=copy(d['OSD-1']),d=>d['OSD-1'].metadata.accession='OSD-2',d=>d['OSD-1'].REST_URL='https://evil.test',d=>d['OSD-1'].assays.REST_URL='https://evil.test/assays/',d=>d['OSD-1'].samples=[]]){
    const d=copy(data);change(d);assert.throws(()=>parseOSDRMetadata(d));
  }
});
test('N07-02: unknown,human,mixed or altered organism and missing reviewed NASA context are not accepted',()=>{
  for(const organism of [undefined,null,'','Homo sapiens',['Drosophila melanogaster','Homo sapiens'],'Drosophila melanogaster;Homo sapiens']){const d=copy(data);d['OSD-1'].metadata.organism=organism;assert.throws(()=>parseOSDRMetadata(d),code('NONHUMAN_REQUIRED'));}
  const d=copy(data);delete d['OSD-1'].metadata['space program'];assert.throws(()=>parseOSDRMetadata(d),code('METADATA_UNAVAILABLE'));
});
test('N07-02: newly introduced source-license/access fields require review rather than silently inheriting old permission',()=>{
  for(const key of ['license','copyright','access_level','restricted','controlledAccess','permissions']){const d=copy(data);d['OSD-1'].metadata[key]='changed';assert.throws(()=>parseOSDRMetadata(d),code('RIGHTS_REVIEW_REQUIRED'));}
});
test('N07-02: optional unavailable fields become null;prose counts and concatenated investigator names never fabricate units or labels',()=>{
  const d=copy(data),m=d['OSD-1'].metadata;
  for(const k of ['mission','study title','study public release date','study publication author list','study assay measurement type','study factor name','material type'])delete m[k];
  m['study protocol description']=['10000 samples,500 labels and300 train rows — unreviewed instructions'];m['study person']={'first name':'A B','last name':'C D'};
  const p=parseOSDRMetadata(d);assert.equal(p.title,null);assert.equal(p.measurement_types,null);assert.equal(p.study_public_release_at,null);assert.equal(p.factors,null);assert.equal(p.publication_authors,null);
  assert.deepEqual(p.mission,{name:null,start_date:null,end_date:null});assert.ok(Object.values(p.counts).every(v=>v===null));assert.ok(Object.values(p.grouping).every(v=>v===null));
});
test('N07-02: malformed types,calendar dates,mission order and release timestamps reject',()=>{
  for(const change of [m=>m.mission=[],m=>m.mission['start date']='02/30/2006',m=>m.mission['end date']='01/01/2000',m=>m['study public release date']='2013',m=>m['study public release date']=-1,m=>m['study public release date']=Infinity,m=>m['study assay measurement type']=42,m=>m['study factor name']=[null]]){
    const d=copy(data);change(d['OSD-1'].metadata);assert.throws(()=>parseOSDRMetadata(d));
  }
});
test('N07-02: source/title/author and UTF-8/hash integrity gates reject modified content or a misleading source manifest',()=>{
  const changed=Buffer.from(original);changed[0]^=1;assert.throws(()=>validateOriginal(changed,approval),code('HASH_MISMATCH'));
  for(const change of [d=>d['OSD-1'].metadata['study title']='other',d=>d['OSD-1'].metadata['study publication author list']=['Invented']]){const f=fixture(change);assert.throws(()=>validateOriginal(f.bytes,f.a),code('SOURCE_METADATA_MISMATCH'));}
  const a=copy(approval),bytes=Buffer.from([0xff,0xfe]);a.resource.bytes=bytes.length;a.resource.sha256=sha256(bytes);a.publication.version=osdrVersion(a.resource.sha256);assert.throws(()=>validateOriginal(bytes,a),code('UNSUPPORTED_CONTENT'));
});
test('N07-02: OSDR uses the original guarded cache and atomically retains one source without following metadata links',async t=>{
  const root=await temp(t),f=fixture(d=>d['OSD-1'].metadata['project link']='https://evil.test/run');let calls=0;
  const result=await acquire({root,approval:f.a,clock,transport:async url=>{calls++;assert.equal(url,OSDR_URL);return response(f.bytes);}});
  assert.equal(calls,1);assert.deepEqual(await readFile(join(result.entry,'original.json')),f.bytes);assert.equal(result.manifest.source_id,OSDR_ID);
  assert.equal((await verifyCache({root,approval:f.a})).sha256,f.a.resource.sha256);
});
test('N07-02: 403/503 and invalid 200 metadata never publish an original;cache failures cannot create medical data',async t=>{
  for(const status of [403,503]){
    const root=await temp(t),f=fixture();await assert.rejects(acquire({root,approval:f.a,clock,transport:async()=>response(f.bytes,status)}),code('HTTP_STATUS'));
    await assert.rejects(verifyCache({root,approval:f.a}),code('ENOENT'));
  }
  const root=await temp(t),f=fixture(d=>delete d['OSD-1'].metadata);await assert.rejects(acquire({root,approval:f.a,clock,transport:async()=>response(f.bytes)}),code('METADATA_UNAVAILABLE'));
  await assert.rejects(verifyCache({root,approval:f.a}),code('ENOENT'));
});
test('N07-02: card and split policy are bound to source SHA,approval,receipt and actual study identity',()=>{
  const card=buildDatasetCard(context),split=buildSplitManifest(context);assert.equal(validateDatasetCard(card,context),card);assert.equal(validateSplitManifest(split,context),split);
  assert.equal(card.source.original_sha256,approval.resource.sha256);assert.equal(card.source.retrieved_at,manifest.retrieval.completed_at);assert.equal(card.download_inventory.raw_omics,false);assert.equal(card.permissions.explicit_api_license,null);
  for(const mutate of [m=>m.source_id='nasa-ntrs-20205008796',m=>m.approval_sha256='0'.repeat(64),m=>m.original.url='https://evil.test',m=>m.rights.license_id='CC0-1.0',m=>m.retrieval.completed_at='not-a-date']){const m=copy(manifest);mutate(m);assert.throws(()=>buildDatasetCard({...context,manifest:m}),code('PROVENANCE_MISMATCH'));}
});
test('N07-02: dataset-card tampering cannot invent sample counts,version,organism or downloaded measurements',()=>{
  for(const change of [c=>c.study.counts.samples=0,c=>c.study.study_release_version='1',c=>c.study.organism='Homo sapiens',c=>c.download_inventory.raw_omics=true,c=>c.source.original_sha256='0'.repeat(64),c=>c.scientific_limitations=[]]){const c=buildDatasetCard(context);change(c);assert.throws(()=>validateDatasetCard(c,context),code('PROVENANCE_MISMATCH'));}
});
test('N07-02: split validation rejects fabricated assignments/counts/labels/readiness and leakage-prone policies',()=>{
  const changes=[s=>s.executed=true,s=>s.assignments=[{sample:'invented',split:'train'}],s=>s.availability.sample_count=12,s=>s.availability.train_count=0,s=>s.unit_of_independence.verified=true,s=>s.unit_of_independence.actual_unit_ids=['pool1'],s=>s.proposed_policy.ratios=[.7,.15,.15],s=>s.proposed_policy.seed=42,s=>s.proposed_policy.label_definition='astronaut illness',s=>s.proposed_policy.random_row_split_allowed=true,s=>s.proposed_policy.gene_probe_split_allowed=true,s=>s.proposed_policy.related_observations_must_stay_together=false,s=>s.proposed_policy.preprocessing_fit='whole_dataset',s=>s.status='ready',s=>s.extra=true,s=>s.study_id='OSD-2'];
  for(const change of changes){const s=buildSplitManifest(context);change(s);assert.throws(()=>validateSplitManifest(s,context));}
  const s=buildSplitManifest(context);s.source.original_sha256='0'.repeat(64);assert.throws(()=>validateSplitManifest(s,context),code('PROVENANCE_MISMATCH'));
});
test('N07-02: proposed train/validation/test roles expose independent-mission and technical-replicate limitations without executing a split',()=>{
  const s=buildSplitManifest(context);assert.equal(s.assignments.length,0);assert.equal(s.executed,false);assert.ok(Object.entries(s.availability).every(([k,v])=>k==='selected_studies'||v===null));
  assert.match(s.proposed_policy.train,/training groups only/);assert.match(s.proposed_policy.validation,/technical/);assert.match(s.proposed_policy.test,/one-study snapshot cannot/);assert.ok(s.unresolved.length>=4);
});
test('N07-02: shipped dataset documentation is complete,offline and reproducible with unchanged original/manifest bytes',async()=>{
  const folder=join(project,'data/scientific/osdr'),before=await stat(join(entry,'original.json'));
  const card=JSON.parse(await readFile(join(folder,'OSD-1.dataset-card.json'))),split=JSON.parse(await readFile(join(folder,'OSD-1.split-policy.json')));
  validateDatasetCard(card,context);validateSplitManifest(split,context);assert.deepEqual(buildDatasetCard(context),buildDatasetCard(context));
  assert.equal((await verifyCache({root:cache,approval})).network_requests,0);
  assert.equal((await stat(join(entry,'original.json'))).mtimeMs,before.mtimeMs);assert.deepEqual(await readFile(join(entry,'original.json')),original);
});
test('N07-02: actual CLI option parser selects only the two reviewed sources and preserves NTRS defaults',()=>{
  assert.equal(parseAcquisitionOptions(['verify']).source,'nasa-ntrs-20205008796');
  assert.equal(parseAcquisitionOptions(['verify','--source='+OSDR_ID]).file,'osdr-osd-1.approval.json');
  assert.equal(parseAcquisitionOptions(['acquire','--source='+OSDR_ID,'--cache=/tmp/osdr-test']).cache,resolve('/tmp/osdr-test'));
  for(const args of [['verify','--source=OSD-2'],['verify','--url=https://evil.test'],['verify','--source='+OSDR_ID,'--source='+OSDR_ID],['verify','--cache=/tmp/a','--cache=/tmp/b'],['verify','--cache='],['unknown']])assert.throws(()=>parseAcquisitionOptions(args));
});
