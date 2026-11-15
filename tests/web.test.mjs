import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createApp } from '../services/api/server.mjs';
import { transport } from './http-harness.mjs';
import { escape, sparkline, lineChart, hasCurrentEvidence } from '../apps/mission-control-web/ui.mjs';
import { METRICS } from '../packages/contracts.mjs';

test('static app and every offline shell asset resolve with correct security headers', async () => {
  const app = createApp({ autoTick: false }); const call = transport(app);
  try {
    const sw = readFileSync(new URL('../apps/mission-control-web/sw.js', import.meta.url),'utf8');
    const shell = sw.match(/const SHELL = \[(.*?)\];/s)[1].match(/'[^']+'/g).map(s=>s.slice(1,-1));
    for (const path of shell) { const response = await call(path); assert.equal(response.status,200,path); assert.ok(response.headers['Content-Security-Policy']); assert.ok(response.text().length); }
    assert.match((await call('/')).text(), /id="app"/);
    assert.match((await call('/app.mjs')).headers['Content-Type'], /javascript/);
    for (const path of ['/.git/config','/../package.json','/shared/../../package.json','/services/api/server.mjs','/%2e%2e/package.json']) assert.equal((await call(path)).status,404,path);
    assert.equal((await call('/v1/health',{headers:{host:'rebind.invalid'}})).status,421);
  } finally { await app.close(); }
});
test('HTML escaping and charts do not invent zero readings for missing samples', () => {
  assert.equal(escape('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert.match(sparkline([null,null]),/Awaiting history/);
  const line=sparkline([65,null,67]); assert.equal((line.match(/M/g)??[]).length,2);
  assert.match(lineChart([{ts:'2026-01-01',values:{heart_rate:null}}],'heart_rate',{center:65,scale:4}),/No measurements/);
  assert.ok(METRICS.heart_rate.unit==='/min');
  assert.equal(hasCurrentEvidence({quality:'good'},undefined),false);
  assert.equal(hasCurrentEvidence({quality:'good',risk_id:'a'},{id:'b'}),false);
  assert.equal(hasCurrentEvidence({quality:'missing',risk_id:'a'},{id:'a'}),false);
  assert.equal(hasCurrentEvidence({quality:'good',risk_id:'a'},{id:'a'}),true);
});
test('SSE emits authenticated, astronaut-scoped snapshots and revokes expired sessions', async () => {
  const app=createApp({autoTick:false});const call=transport(app);
  try{
    assert.equal((await call('/v1/stream/missions/MARS-DEMO-01')).status,401);
    const login=await call('/v1/auth/demo',{body:{role:'astronaut'}});const cookie=login.headers['Set-Cookie'].split(';')[0];
    const stream=await call('/v1/stream/missions/MARS-DEMO-01',{cookie});assert.equal(stream.status,200);
    const data=JSON.parse(stream.text().match(/data: (.+)/)[1]);assert.equal(data.crew.length,1);assert.equal(data.crew[0].id,'CREW-03');
    app.store.db.prepare('UPDATE sessions SET expires_at=0').run();app.broadcast();stream.request.emit('close');
  }finally{await app.close();}
});
test('mixed-quality ingest stays Gray; later good signals cannot overwrite a suspect channel',async()=>{
  const app=createApp({autoTick:false});
  try{
    const c=app.engine.state.crew[2];
    const make=(name,value,quality)=>({schema_version:'astra.telemetry.v1',event_id:`ingest-${name}`,mission_id:'MARS-DEMO-01',crew_id:c.id,ts:new Date(app.engine.state.now).toISOString(),received_ts:new Date(app.engine.state.now).toISOString(),metric:{system:METRICS[name].system??'urn:astra:metric',code:METRICS[name].code,name,unit:METRICS[name].unit,value},quality:{status:quality,confidence:quality==='good'?.98:.3,artifact:quality!=='good'},source:{kind:'synthetic-import',device_id:'TEST-MIXED',sampling_hz:1/30},provenance:{synthetic:true,seed:42,scenario_id:'mixed',generator_version:'test-v1'}});
    app.engine.ingest([make('heart_rate',155,'suspect'),make('spo2',98,'good')]);assert.equal(app.engine.state.crew[2].status,'gray');
  }finally{await app.close();}
});

test('API-backed frontend routes render without runtime exceptions in a lightweight DOM harness',()=>{
  const result=spawnSync(process.execPath,['scripts/frontend-smoke.mjs'],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stdout+result.stderr);
});

test('N01: Viewer and Researcher workspaces handle private check-in denial without fetching raw history',()=>{
  for (const role of ['viewer', 'researcher']) {
    const result=spawnSync(process.execPath,['scripts/frontend-smoke.mjs',role],{encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }
});

test('voluntary check-ins preserve self scope and cannot overwrite synthetic telemetry',async()=>{
  const app=createApp({autoTick:false});const call=transport(app);
  try{
    const login=await call('/v1/auth/demo',{body:{role:'astronaut'}});const cookie=login.headers['Set-Cookie'].split(';')[0];
    const original=app.engine.state.crew[2].values.reaction_time;
    const data={crew_id:'CREW-03',fatigue:4,reaction_ms:[215,240,245]};
    assert.equal((await call('/v1/checkins',{cookie,body:{...data,crew_id:'CREW-01'}})).status,403);
    assert.equal((await call('/v1/checkins',{cookie,body:{...data,reaction_ms:[1,2,3]}})).status,422);
    const response=await call('/v1/checkins',{cookie,body:data});assert.equal(response.status,201);
    assert.equal(response.json().synthetic,false);assert.equal(response.json().source,'user_checkin');
    assert.equal(app.engine.state.crew[2].values.reaction_time,original);
    const predictions=await call('/v1/crew/CREW-03/predictions',{cookie});assert.equal(predictions.status,200);
    assert.ok(app.store.list('predictions').length>0);assert.equal(app.store.list('knowledge_documents').length,29);
  }finally{await app.close();}
});
