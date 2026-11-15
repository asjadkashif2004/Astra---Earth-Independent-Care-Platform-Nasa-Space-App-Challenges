// Existing-boundary controls only; no N11 candidate implementation or model training.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../../services/api/server.mjs';
import { buildCase } from '../../services/agent/agent.mjs';
import { transport } from '../../tests/http-harness.mjs';
import { MODEL_VERSION } from '../../packages/contracts.mjs';

test('Preflight: no prior N11 sequencing exception was found; new proposal is inactive',()=>{
 const inventory=JSON.parse(readFileSync('artifacts/n11-preflight-20261031/exception-inventory-before.json','utf8'));
 assert.equal(inventory.N11_specific_exception_found,false);assert.equal(inventory.N11_feature_implementation_admitted,false);
 assert.ok(!inventory.exceptions.some(e=>e.path==='docs/DE_N11_SYNTHETIC_01.md'));
 const proposal=readFileSync('docs/DE_N11_SYNTHETIC_01.md','utf8');assert.match(proposal,/PROPOSED \/ INACTIVE/);assert.match(proposal,/Decision — APPROVE \/ REJECT \/ REQUEST CHANGES:\n\nRationale/);assert.match(proposal,/Owner acceptance and explicit activation decision:\n\nOwner decision date:\n\n/);
});
test('Preflight: actual existing model API exposes Tier A, without activating an advanced candidate',async()=>{
 const app=createApp({autoTick:false,caseBuilder:buildCase}),call=transport(app);
 try{assert.equal((await call('/v1/models')).status,401);const login=await call('/v1/auth/demo',{body:{role:'researcher'}}),cookie=login.headers['Set-Cookie'].split(';')[0],before=app.store.db.prepare('SELECT total_changes() n').get().n;
  const result=await call('/v1/models',{cookie});assert.equal(result.status,200);const models=result.json();assert.ok(models.some(m=>m.id===MODEL_VERSION));assert.ok(!models.some(m=>/EWMA|Isolation Forest|n11/i.test(m.name+' '+m.id)));assert.equal(app.store.db.prepare('SELECT total_changes() n').get().n,before);
 }finally{await app.close();}
});
test('Preflight: existing Viewer cannot read protected model API or mutate models',async()=>{
 const app=createApp({autoTick:false,caseBuilder:buildCase}),call=transport(app);
 try{const login=await call('/v1/auth/demo',{body:{role:'viewer'}}),cookie=login.headers['Set-Cookie'].split(';')[0],before=app.store.db.prepare('SELECT total_changes() n').get().n;
  assert.equal((await call('/v1/models',{cookie})).status,403);assert.equal((await call('/v1/models/robust-personal-v2',{cookie,body:{promote:true}})).status,404);assert.equal(app.store.db.prepare('SELECT total_changes() n').get().n,before);
 }finally{await app.close();}
});
test('Preflight: no N11 API, model table or hidden training action is implemented',async()=>{
 const app=createApp({autoTick:false,caseBuilder:buildCase}),call=transport(app);
 try{const login=await call('/v1/auth/demo',{body:{role:'demo_admin'}}),cookie=login.headers['Set-Cookie'].split(';')[0],before=app.store.db.prepare('SELECT total_changes() n').get().n;
  assert.equal((await call('/v1/n11',{cookie})).status,404);assert.equal((await call('/v1/n11/train',{cookie,body:{crew_id:'CREW-03'}})).status,404);assert.equal(app.store.db.prepare("SELECT count(*) n FROM sqlite_schema WHERE name LIKE 'n11_%'").get().n,0);assert.equal(app.store.db.prepare('SELECT total_changes() n').get().n,before);
 }finally{await app.close();}
});
