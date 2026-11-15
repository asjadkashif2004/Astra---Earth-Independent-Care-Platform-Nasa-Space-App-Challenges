import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile,writeFile,mkdtemp,rm,stat } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { acquire,verifyCache,entryPath } from '../services/acquisition/cache.mjs';
import { assertAllowedURL,validateApproval,validateOriginal,sha256,MAX_SAMPLE_BYTES,MAX_DEADLINE_MS,MAX_REQUESTS } from '../services/acquisition/source.mjs';
import { BIDMC_ID,BIDMC_URL,BIDMC_SHA256,BIDMC_BYTES,parseBIDMCNumerics,validateBIDMCNotice,buildBIDMCCard,buildBIDMCSplit,validateBIDMCCard,validateBIDMCSplit } from '../services/acquisition/bidmc.mjs';
import { parseAcquisitionOptions } from '../scripts/scientific-acquire.mjs';

const project=fileURLToPath(new URL('../',import.meta.url)),cache=join(project,'data/scientific/cache');
const approval=JSON.parse(readFileSync(new URL('../data/scientific/bidmc-01-numerics.approval.json',import.meta.url),'utf8'));
const entry=entryPath(cache,approval),original=readFileSync(join(entry,'original.csv'));
const manifest=JSON.parse(readFileSync(join(entry,'manifest.json'),'utf8')),context={approval,manifest,bytes:original};
const code=c=>e=>e.code===c,copy=structuredClone,clock=()=> '2026-10-23T16:00:00.000Z';
async function temp(t){const root=await mkdtemp(join(tmpdir(),'astra-bidmc-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
function response(bytes=original,extra={}){return {status:200,headers:{'content-type':'text/plain; charset=utf-8','content-length':String(bytes.length),etag:'"fixture-v1"'},body:(async function*(){yield bytes;})(),close(){},...extra};}

test('N07 BIDMC: add only the exact reviewed CSV; reject other recordings,formats,hosts,queries and cross-source approvals',()=>{
  assert.equal(assertAllowedURL(BIDMC_URL),BIDMC_URL);assert.equal(validateApproval(approval),approval);
  for(const url of [BIDMC_URL.replace('_01_','_02_'),BIDMC_URL.replace('Numerics','Signals'),BIDMC_URL+'?download=1',BIDMC_URL+'#x',BIDMC_URL.replace('https:','http:'),BIDMC_URL.replace('physionet.org','evil.test')])assert.throws(()=>assertAllowedURL(url),code('SOURCE_NOT_ALLOWED'));
  for(const file of ['approved-sources.json','osdr-osd-1.approval.json']){const a=JSON.parse(readFileSync(join(project,'data/scientific',file),'utf8'));a.resource.url=BIDMC_URL;assert.throws(()=>validateApproval(a),code('SOURCE_NOT_ALLOWED'));}
});
test('N07 BIDMC: strict release,notice,license,patient-derived scope and resource pins reject upgrades and traversal',()=>{
  for(const change of [a=>a.extra=true,a=>a.publication.version='2',a=>a.publication.published_on='2026-10-23',a=>a.publication.authors=[],a=>a.resource.file='../original.csv',a=>a.resource.file='original.json',a=>a.resource.media_type='text/csv',a=>a.resource.bytes=65537,a=>a.resource.sha256='0'.repeat(64),a=>a.rights.license_id='CC0-1.0',a=>a.rights.legacy_notice_sha256='0'.repeat(64),a=>a.rights.attribution='',a=>a.rights.reviewed_on='2026-02-30',a=>a.scope.synthetic=true,a=>a.scope.contains_patient_data=false,a=>a.scope.clinical_use=true,a=>a.scope.corpus_ingestion=true]){const a=copy(approval);change(a);assert.throws(()=>validateApproval(a));}
  assert.equal(MAX_SAMPLE_BYTES,65536);assert.equal(MAX_DEADLINE_MS,15000);assert.equal(MAX_REQUESTS,4);
});
test('N07 BIDMC: complete original verifies actual row/time/channel evidence without imputing missing data or inventing absolute dates',async()=>{
  const p=validateOriginal(original,approval);assert.equal(original.length,BIDMC_BYTES);assert.equal(sha256(original),BIDMC_SHA256);assert.equal(p.rows.length,481);
  assert.deepEqual(p.missing_counts,{HR:0,PULSE:13,RESP:0,SpO2:13});assert.equal(p.rows[0].elapsed_seconds,0);assert.equal(p.rows.at(-1).elapsed_seconds,480);
  assert.equal(p.source_subject_number,'01');assert.equal(p.original_mimic_patient_id,null);assert.equal(p.source_session_id,null);assert.equal(p.time.absolute_start_at,null);
  assert.equal(p.rows.filter(r=>r.SpO2===null).length,13);assert.equal(p.rows.filter(r=>r.PULSE===null).length,13);assert.equal(p.clinical_quality,'not_independently_validated');
  assert.equal((await verifyCache({root:cache,approval})).network_requests,0);
});
test('N07 BIDMC: CSV parser rejects malformed/truncated/HTML/executable cells,wrong channels and reordered or missing seconds',()=>{
  const source=original.toString('utf8');
  for(const changed of [source.slice(0,-1),source.replace('Time [s]','Date'),source.replace(', HR,',', ECG,'),source.replace(/^0,/m,'1,'),source.replace(/^480,.*\n/m,''),source.replace('NaN','Infinity'),source.replace('NaN','=1+1'),source.replace('NaN',''),source.replace('NaN','<script>'),'<html>error</html>\n'])assert.throws(()=>parseBIDMCNumerics(Buffer.from(changed)));
  assert.throws(()=>parseBIDMCNumerics(Buffer.from([0xff,0xfe])),code('UNSUPPORTED_CONTENT'));
  const zero=parseBIDMCNumerics(Buffer.from(source.replace('NaN','0')));assert.equal(zero.missing_counts.PULSE,12);assert.ok(zero.rows.some(r=>r.PULSE===0));
});
test('N07 BIDMC: changed original and legacy notice reject rather than being repinned or silently repaired',()=>{
  const bytes=Buffer.from(original);bytes[100]^=1;assert.throws(()=>validateOriginal(bytes,approval),code('HASH_MISMATCH'));
  const notice=readFileSync(join(project,'data/scientific/bidmc/source-notices/LICENSE'));assert.equal(validateBIDMCNotice(notice),true);
  assert.throws(()=>validateBIDMCNotice(Buffer.concat([notice,Buffer.from(' ')])),code('RIGHTS_REVIEW_REQUIRED'));
});
test('N07 BIDMC: cache uses the approved CSV filename/MIME while retaining exact bytes,one request and atomic source receipt',async t=>{
  const root=await temp(t);let calls=0;
  const result=await acquire({root,approval,clock,transport:async(url,{headers})=>{calls++;assert.equal(url,BIDMC_URL);assert.equal(headers.Accept,'text/plain');assert.equal(headers['Accept-Encoding'],'identity');return response();}});
  assert.equal(calls,1);assert.deepEqual(await readFile(join(result.entry,'original.csv')),original);assert.equal(result.manifest.original.file,'original.csv');assert.equal(result.manifest.retrieval.started_at,clock());
  const before=await stat(join(result.entry,'original.csv'));await acquire({root,approval,clock,transport:()=>assert.fail('No refetch for held original')});assert.equal((await stat(join(result.entry,'original.csv'))).mtimeMs,before.mtimeMs);
});
test('N07 BIDMC: wrong HTTP/MIME/encoding/size/hash cannot promote a CSV original',async t=>{
  const bad=Buffer.from(original);bad[100]^=1;
  const cases=[response(original,{status:503}),response(original,{headers:{'content-type':'application/json'}}),response(original,{headers:{'content-type':'text/html'}}),response(original,{headers:{'content-type':'text/plain','content-encoding':'gzip'}}),response(Buffer.concat([original,Buffer.from('x')])),response(bad)];
  for(const value of cases){const root=await temp(t);await assert.rejects(acquire({root,approval,clock,transport:async()=>value}));await assert.rejects(verifyCache({root,approval}),code('ENOENT'));}
});
test('N07 BIDMC: interrupted CSV resumes the verified prefix with unchanged Range/ETag guards and full-object hash',async t=>{
  const root=await temp(t),cut=91;
  await assert.rejects(acquire({root,approval,clock,transport:async()=>response(original,{body:(async function*(){yield original.subarray(0,cut);throw Error('injected CSV interruption');})()})}),/injected CSV interruption/);
  const result=await acquire({root,approval,clock,transport:async(url,{headers})=>{
    assert.equal(headers.Range,`bytes=${cut}-`);assert.equal(headers['If-Range'],'"fixture-v1"');return response(original.subarray(cut),{status:206,headers:{'content-type':'text/plain','content-length':String(original.length-cut),'content-range':`bytes ${cut}-${original.length-1}/${original.length}`,etag:'"fixture-v1"'}});
  }});
  assert.equal(result.manifest.retrieval.requests,2);assert.deepEqual(await readFile(join(result.entry,'original.csv')),original);
});
test('N07 BIDMC: full-length bytes without successful transport completion remain unaccepted',async t=>{
  const root=await temp(t);
  await assert.rejects(acquire({root,approval,clock,transport:async()=>response(original,{body:(async function*(){yield original;throw Error('late disconnect');})()})}),/late disconnect/);
  await assert.rejects(verifyCache({root,approval}),code('ENOENT'));
  await assert.rejects(acquire({root,approval,clock,transport:()=>assert.fail('No retry or silent promotion')}),code('INCOMPLETE_RESPONSE'));
});
test('N07 BIDMC: corrupt completed CSV is detected offline without overwrite or network',async t=>{
  const root=await temp(t),result=await acquire({root,approval,clock,transport:async()=>response()});const path=join(result.entry,'original.csv'),bad=Buffer.from(original);bad[100]^=1;await writeFile(path,bad);
  await assert.rejects(acquire({root,approval,clock,transport:()=>assert.fail('No corruption refetch')}),code('HASH_MISMATCH'));assert.deepEqual(await readFile(path),bad);
});
test('N07 BIDMC: card preserves real population/time/missingness,receipt provenance and explicitly limited download inventory',()=>{
  const card=buildBIDMCCard(context);assert.equal(validateBIDMCCard(card,context),card);assert.equal(card.record.row_count,481);assert.equal(card.population.selected_recordings,1);assert.equal(card.download_inventory.waveforms,false);assert.equal(card.source.publisher_checksum_verified,false);
  assert.equal(card.record.time.absolute_start_at,null);assert.notEqual(card.source.retrieved_at,card.record.time.absolute_start_at);
  for(const change of [c=>c.source.original_sha256='0'.repeat(64),c=>c.record.row_count=480,c=>c.source_category='live NASA telemetry',c=>c.population.selected_age=45,c=>c.record.missing_counts.SpO2=0,c=>c.permissions.license_id='CC0-1.0']){const card=buildBIDMCCard(context);change(card);assert.throws(()=>validateBIDMCCard(card,context),code('PROVENANCE_MISMATCH'));}
  for(const change of [m=>m.source_id='OSD-1',m=>m.scope.synthetic=true,m=>m.rights.license_id='CC0-1.0',m=>m.publication.version='2',m=>m.retrieval.completed_at='bad',m=>m.retrieval.started_at='2099-01-01T00:00:00.000Z']){const m=copy(manifest);change(m);assert.throws(()=>buildBIDMCCard({...context,manifest:m}),code('PROVENANCE_MISMATCH'));}
});
test('N07 BIDMC: split is unexecuted and blocks invented identities,independent counts,random rows and allocations',()=>{
  const s=buildBIDMCSplit(context);assert.equal(validateBIDMCSplit(s,context),s);assert.equal(s.available.recording_count,1);assert.equal(s.available.row_count,481);assert.equal(s.available.independently_verified_subject_count,null);assert.deepEqual(s.assignments,[]);assert.equal(s.executed,false);
  for(const change of [s=>s.executed=true,s=>s.assignments=[{record:'bidmc_01',split:'train'}],s=>s.independently_validated=true,s=>s.unit_of_independence.verified=true,s=>s.available.independently_verified_subject_count=481,s=>s.proposed_policy.random_row_split_allowed=true,s=>s.proposed_policy.related_windows_and_channels_together=false,s=>s.proposed_policy.preprocessing_fit='all',s=>s.proposed_policy.ratios=[.7,.15,.15],s=>s.time_boundaries.absolute_start_at=manifest.retrieval.completed_at]){const s=buildBIDMCSplit(context);change(s);assert.throws(()=>validateBIDMCSplit(s,context),code('UNSUPPORTED_SPLIT'));}
});
test('N07 BIDMC: shipped card,split and legacy notice verify offline and deterministically',async()=>{
  const folder=join(project,'data/scientific/bidmc'),card=JSON.parse(await readFile(join(folder,'BIDMC-01.dataset-card.json'))),split=JSON.parse(await readFile(join(folder,'BIDMC-01.split-policy.json')));
  validateBIDMCCard(card,context);validateBIDMCSplit(split,context);validateBIDMCNotice(await readFile(join(folder,'source-notices/LICENSE')));assert.deepEqual(buildBIDMCCard(context),buildBIDMCCard(context));
  assert.equal((await verifyCache({root:cache,approval})).network_requests,0);
});
test('N07 BIDMC: CLI retains previous source selections and rejects arbitrary source/URL/duplicate arguments',()=>{
  assert.equal(parseAcquisitionOptions(['verify']).source,'nasa-ntrs-20205008796');assert.equal(parseAcquisitionOptions(['verify','--source=nasa-osdr-osd-1']).file,'osdr-osd-1.approval.json');
  assert.equal(parseAcquisitionOptions(['acquire','--source='+BIDMC_ID,'--cache=/tmp/astra-bidmc']).cache,resolve('/tmp/astra-bidmc'));assert.equal(parseAcquisitionOptions(['verify','--source='+BIDMC_ID]).file,'bidmc-01-numerics.approval.json');
  for(const args of [['verify','--source=bidmc02'],['verify','--url='+BIDMC_URL],['verify','--source='+BIDMC_ID,'--source='+BIDMC_ID]])assert.throws(()=>parseAcquisitionOptions(args));
});
