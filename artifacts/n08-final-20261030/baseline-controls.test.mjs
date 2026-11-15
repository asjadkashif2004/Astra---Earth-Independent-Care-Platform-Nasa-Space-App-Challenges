// QA of existing behavior only. No N08 feature, source acquisition or DB migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../services/api/server.mjs';
import { buildCase } from '../../services/agent/agent.mjs';
import { transport } from '../../tests/http-harness.mjs';
import { loadLocalSource,trustedLocalCaller,originalContext } from '../../services/acquisition/local-source.mjs';
import { defaultAnnotation,appendAnnotation,consumerDescriptor } from '../../services/acquisition/evidence-card.mjs';
async function fixture(t){const app=createApp({autoTick:false,caseBuilder:buildCase});t.after(()=>app.close());return {app,call:transport(app)};}
test('Existing anonymous waveform route rejects access without creating data',async t=>{
  const {app,call}=await fixture(t),before=app.store.db.prepare('SELECT total_changes() AS n').get().n;
  assert.equal((await call('/v1/crew/CREW-03/waveforms')).status,401);
  assert.equal(app.store.db.prepare('SELECT total_changes() AS n').get().n,before);
});
test('Existing authenticated waveform GET remains explicit501; not an implemented replay',async t=>{
  const {app,call}=await fixture(t),login=await call('/v1/auth/demo',{body:{role:'demo_admin'}}),cookie=login.headers['Set-Cookie'].split(';')[0];
  const before=app.store.db.prepare('SELECT total_changes() AS n').get().n,r=await call('/v1/crew/CREW-03/waveforms',{cookie});
  assert.equal(r.status,501);assert.equal(r.json().error.code,'WAVEFORM_EXTENSION');
  assert.equal(app.store.db.prepare('SELECT total_changes() AS n').get().n,before);
  assert.equal(app.store.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='waveform_chunks'").get().n,0);
});
test('Existing waveform POST cannot silently create chunks or monitoring alerts',async t=>{
  const {app,call}=await fixture(t),login=await call('/v1/auth/demo',{body:{role:'demo_admin'}}),cookie=login.headers['Set-Cookie'].split(';')[0];
  const before=JSON.stringify({state:app.engine.state,risks:app.store.list('risk_events'),messages:app.store.list('comms_messages')});
  const r=await call('/v1/ingest/waveforms',{cookie,body:{synthetic:true,chunk:'not-a-waveform'}});assert.equal(r.status,501);assert.equal(r.json().error.code,'WAVEFORM_EXTENSION');
  assert.equal(JSON.stringify({state:app.engine.state,risks:app.store.list('risk_events'),messages:app.store.list('comms_messages')}),before);
});
test('Retained BIDMC original is numerics, not an available ECG/PPG waveform',async()=>{
  const c=await loadLocalSource('physionet-bidmc-01-numerics',trustedLocalCaller('researcher')),v=originalContext(c);
  assert.equal(v.parsed.rows.length,481);assert.equal(v.legacyCard.download_inventory.waveforms,false);
  assert.equal(v.legacyCard.record.time.absolute_start_at,null);assert.equal(v.legacyCard.source_category,'real_public_historical_research;not_synthetic;not_live_mission_data');
});
test('Existing N07 N08 descriptor remains inactive and cannot serve raw crew telemetry',async()=>{
  const t=trustedLocalCaller('researcher'),c=await loadLocalSource('physionet-bidmc-01-numerics',t);
  const h=appendAnnotation(c,[],defaultAnnotation(c),{id:'baseline-only',expected_revision:0,reason:'Read-only compatibility audit'},t),d=consumerDescriptor(c,h,t,{consumer:'N08'});
  assert.equal(d.runtime_integration,'INACTIVE');assert.equal(d.raw_measurements,null);assert.equal(d.crew_id,null);assert.equal(d.clinical_conclusion,null);
});
