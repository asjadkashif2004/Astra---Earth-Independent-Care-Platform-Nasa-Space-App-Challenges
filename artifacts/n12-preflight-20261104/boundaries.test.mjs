import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createApp } from '../../services/api/server.mjs';
import { buildCase } from '../../services/agent/agent.mjs';
import { transport } from '../../tests/http-harness.mjs';
import { forecast } from '../../services/prediction/forecast.mjs';
import { EPOCH } from '../../packages/contracts.mjs';
const root=new URL('./',import.meta.url),make=()=>createApp({autoTick:false,caseBuilder:buildCase});
const sign=async(call,role)=>{const r=await call('/v1/auth/demo',{body:{role}});return r.headers['Set-Cookie'].split(';')[0];};
test('preflight: genuine existing forecast positive/abstention controls are legacy compatibility, not N12 qualification',()=>{
 const h=Array.from({length:20},(_,i)=>({ts:new Date(EPOCH+i*60000).toISOString(),quality:'good',values:{heart_rate:65+i*.1}})),before=JSON.stringify(h),start=performance.now(),v=forecast(h,'heart_rate');
 assert.equal(v.available,true);assert.ok(Math.abs(v.estimate-69.9)<1e-9);assert.equal(v.calibration,null);assert.equal(v.clinical_diagnosis,null);assert.equal(JSON.stringify(h),before);assert.equal(forecast([],'heart_rate').available,false);assert.equal(forecast(h,'sleep_duration').available,false);h.at(-1).quality='missing';assert.equal(forecast(h,'heart_rate').available,false);
 writeFileSync(new URL('legacy-forecast-control.json',root),JSON.stringify({scope:'Existing linear-trend-v2 only; not new N12 acceptance',result:v,elapsed_ms:performance.now()-start},null,2));
});
test('preflight: actual legacy prediction API remains authenticated and self-scoped, with documented write-side effects',async()=>{
 const a=make(),call=transport(a);try{assert.equal((await call('/v1/crew/CREW-03/predictions')).status,401);const cookie=await sign(call,'astronaut');assert.equal((await call('/v1/crew/CREW-01/predictions',{cookie})).status,403);
 for(let i=0;i<20;i++)a.engine.tick(30);const protectedBefore=JSON.stringify({crew:a.engine.state.crew,risks:a.store.list('risk_events'),cases:a.store.list('agent_cases'),comms:a.store.list('comms_messages')}),before=a.store.db.prepare('SELECT total_changes() n').get().n,r=await call('/v1/crew/CREW-03/predictions',{cookie});assert.equal(r.status,200);const data=r.json();assert.equal(data.heart_rate.available,true);assert.equal(data.sleep_duration.available,false);assert.equal(data.heart_rate.synthetic,true);assert.equal(JSON.stringify({crew:a.engine.state.crew,risks:a.store.list('risk_events'),cases:a.store.list('agent_cases'),comms:a.store.list('comms_messages')}),protectedBefore);const mutations=a.store.db.prepare('SELECT total_changes() n').get().n-before;assert.ok(mutations>0,'Existing prediction GET persists available results; it is not a read-only entry point');
 writeFileSync(new URL('legacy-api-control.json',root),JSON.stringify({scope:'Fresh synthetic memory application, no operational DB',status:r.status,result:data,existing_prediction_GET_mutations:mutations,N02_noninterference:true,qualified_N12_read_only_API:false},null,2));
 }finally{await a.close();}
});
test('preflight: authorized existing model read works while unsupported prediction mutation and N12 tables remain absent',async()=>{
 const a=make(),call=transport(a);try{const researcher=await sign(call,'researcher');const r=await call('/v1/models',{cookie:researcher});assert.equal(r.status,200);assert.ok(r.json().some(c=>c.id==='linear-trend-v2'));const viewer=await sign(call,'viewer');assert.equal((await call('/v1/models',{cookie:viewer})).status,403);const admin=await sign(call,'demo_admin'),before=a.store.db.prepare('SELECT total_changes() n').get().n;
 assert.equal((await call('/v1/crew/CREW-03/predictions',{cookie:admin,body:{horizon_minutes:360}})).status,404);assert.equal(a.store.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name LIKE 'n12_%'").get().n,0);assert.equal(a.store.db.prepare('SELECT count(*) n FROM n11_jobs').get().n,0);assert.equal(a.store.db.prepare('SELECT total_changes() n').get().n,before);
 }finally{await a.close();}
});
test('preflight: new proposal stays inactive and genuine saved N11 rejection remains unpromoted',()=>{
 const proposal=readFileSync(new URL('../../docs/DE_N12_SYNTHETIC_01.md',import.meta.url),'utf8');assert.match(proposal,/PROPOSED \/ INACTIVE/);assert.match(proposal,/does not activate N12/);const original=JSON.parse(readFileSync(new URL('../n11-engineering-20261031/candidate-dispositions.json',root)));assert.equal(original.isolation_forest.status,'REJECTED_FOR_PROMOTION');assert.equal(original.operational_promotion_authorized,false);const inventory=JSON.parse(readFileSync(new URL('exception-inventory-before.json',root)));assert.deepEqual(inventory.N12_specific_proposals,[]);
});
