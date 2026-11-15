import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { CREW } from '../packages/contracts.mjs';
import { present, validSnapshot, monitoringState } from '../packages/presentation.mjs';
import { metricHistory, lineChart } from '../apps/mission-control-web/ui.mjs';
import { frontendSession } from './dom-harness.mjs';
import { transport } from './http-harness.mjs';

const ready={ready:true,status:'ok',monitoring:{status:'manual'},enrichment:{status:'ready'}};
const project=(snapshot,options={})=>present(snapshot,{connected:true,lastPacketAt:10000,health:ready,healthAt:10000,now:10000,...options});
async function session(role,fn,options={}){
  const app=createApp({autoTick:false,caseBuilder:buildCase,...options});let ui;
  try{ui=await frontendSession(app,role);await fn(ui,app);}finally{if(ui)await ui.close();await app.close();}
}
function alert(engine){engine.startScenario('sleep-debt-cardio-drift');for(let i=0;i<12;i++)engine.tick(30);return engine.store.list('risk_events')[0];}
const response=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>value});

test('N04: performance quality never silently enables reduced motion, and both preferences survive navigation',async()=>{
  await session('demo_admin',async ui=>{
    await ui.click('[data-action="graphics"]');assert.equal(ui.document.body.classList.contains('performance-mode'),true);assert.equal(ui.document.body.classList.contains('reduce-motion'),false);
    await ui.click('[data-page="crew"]');assert.equal(ui.module.inspect().scenes[0].options.performance,true);assert.equal(ui.module.inspect().scenes[0].options.reducedMotion,false);
    await ui.click('[data-action="logout"]');assert.ok(ui.el('#login-form'));await ui.click('[data-action="motion"]');assert.equal(ui.document.body.classList.contains('reduce-motion'),true);
    await ui.click('[data-action="graphics"]');assert.equal(ui.document.body.classList.contains('performance-mode'),false);assert.equal(ui.document.body.classList.contains('reduce-motion'),true);
  });
});

test('N03 closure: icon-only controls stay named and both performance toggles expose their real selected state',async()=>{
  await session('demo_admin',async ui=>{
    assert.ok(ui.el('[data-action="cognitive"]').getAttribute('aria-label'));
    for(const b of ui.all('[data-action="graphics"]')){assert.ok(b.getAttribute('aria-label'));assert.equal(b.getAttribute('aria-pressed'),'false');}
    await ui.click('[data-action="graphics"]');
    assert.ok(ui.all('[data-action="graphics"]').every(b=>b.getAttribute('aria-pressed')==='true'));
    await ui.click(ui.all('[data-action="graphics"]').at(-1));
    assert.ok(ui.all('[data-action="graphics"]').every(b=>b.getAttribute('aria-pressed')==='false'));
  });
});
test('N03 closure: persistent announcements reflect monitoring failure/recovery, avoid tick chatter and clear on logout',async()=>{
  await session('demo_admin',async(ui,app)=>{
    const region=ui.el('#monitor-announcement');assert.equal(region.getAttribute('role'),'status');assert.equal(region.getAttribute('aria-atomic'),'true');
    const nominal=region.textContent;assert.match(nominal,/Monitoring in manual mode/);
    app.engine.tick(30);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.equal(region.textContent,nominal);
    app.engine.monitor.failure();await ui.module.pollStatus();assert.match(region.textContent,/Monitoring failed.*Unknown/);
    app.engine.tick(30);await ui.module.pollStatus();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.equal(region.textContent,nominal);
    await ui.click('[data-action="logout"]');assert.equal(region.textContent,'');assert.equal(ui.el('#risk-announcement').textContent,'');
  });
});
test('N03 closure/N01/N02: recorded-risk announcements survive unavailable monitoring, deduplicate and never leak into Earth before receipt',async()=>{
  await session('demo_admin',async(ui,app)=>{
    app.engine.monitor.failure();await ui.module.pollStatus();const risk=alert(app.engine);
    // Keep health unavailable while the already-persisted alert arrives.
    ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    const region=ui.el('#risk-announcement');assert.equal(region.getAttribute('role'),'alert');assert.equal(region.getAttribute('aria-live'),'assertive');
    assert.match(region.textContent,/Onboard recorded review: CREW-03/);assert.match(region.textContent,/not a diagnosis/);
    region.textContent='deduplication sentinel';ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.equal(region.textContent,'deduplication sentinel');
    await ui.click('[data-view="earth"]');assert.equal(region.textContent,'');assert.match(ui.el('#monitor-announcement').textContent,/Earth received view/);
    assert.equal(app.store.record('risk_events',risk.id).status,'open');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
  });
});

test('N03 closure F08: transient onboard review toast cannot survive Earth selection or session clearing',async()=>{
  for(const action of ['[data-view="earth"]','[data-action="logout"]'])await session('demo_admin',async(ui,app)=>{
    const risk=alert(app.engine);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    assert.match(ui.el('#toast').textContent,/Onboard: CREW-03/);assert.equal(ui.el('#toast').classList.contains('show'),true);
    await ui.click(action);assert.equal(ui.el('#toast').classList.contains('show'),false);assert.equal(ui.el('#toast').textContent,'');
    assert.equal(app.store.record('risk_events',risk.id).status,'open');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
  });
});

test('N03 F08: Earth projection never substitutes onboard readings, alerts or cases before receipt',()=>{
  const app=createApp({autoTick:false});
  try{alert(app.engine);const snapshot=app.engine.snapshot(),copy=structuredClone(snapshot);
    const p=project(snapshot,{view:'earth'});assert.equal(p.alerts.length,0);assert.equal(p.cases.length,0);
    assert.equal(p.crew.length,6);for(const c of p.crew){assert.equal(c.status,'gray');assert.equal(c.values.heart_rate,null);}
    assert.deepEqual(snapshot,copy);
  }finally{void app.close();}
});
test('N03: quality/freshness/readiness gates override optimistic status without changing canonical provenance',()=>{
  const app=createApp({autoTick:false});
  try{const snapshot=app.engine.snapshot();assert.equal(project(snapshot).crew[0].status,'green');
    for(const patch of [{status:'suspect'},{stale:true},{confidence:.1},{artifact:true}]){
      const s=structuredClone(snapshot);Object.assign(s.crew[0].metric_quality.heart_rate,patch);const p=project(s);
      assert.equal(p.crew[0].status,'gray');assert.equal(p.crew[0].values.heart_rate,null);
      assert.deepEqual(p.crew[0].metric_observations,s.crew[0].metric_observations);
    }
    for(const patch of [{connected:false},{now:15001},{health:{...ready,ready:false,monitoring:{status:'failed'}}},{health:null},{healthAt:2000}])
      assert.ok(project(snapshot,patch).crew.every(c=>c.status==='gray'));
    const degraded=project(snapshot,{health:{...ready,status:'degraded',enrichment:{status:'degraded'}}});
    assert.ok(degraded.crew.every(c=>c.status==='green'));assert.match(degraded.monitoring.knowledge,/degraded/);
    assert.equal(monitoringState(ready,10000,17001).ready,false);
  }finally{void app.close();}
});
test('N03: snapshots reject malformed identity/reception data; charts discard stale and held measurements',()=>{
  const app=createApp({autoTick:false});
  try{const s=app.engine.snapshot();assert.ok(validSnapshot(s));assert.equal(validSnapshot({...s,crew:[s.crew[0],s.crew[0]]}),false);
    assert.equal(validSnapshot({...s,server_received_at:'invalid'}),false);assert.equal(validSnapshot({...s,ground:{observed_at:1,crew:[{id:'invented'}],alerts:[]}}),false);
    const c=s.crew[0],first={...structuredClone(c),ts:c.observed_at},held={...structuredClone(c),ts:new Date(Date.parse(c.observed_at)+30000).toISOString()};
    const stale=structuredClone(held);stale.metric_quality.heart_rate.stale=true;
    const history=metricHistory([first,held,stale],'heart_rate');assert.equal(history.length,2);assert.equal(history[1].value,null);
    assert.match(lineChart([stale],'heart_rate',c.baseline.heart_rate),/No measurements/);
  }finally{void app.close();}
});
test('N03: all six actual profiles navigate to their own values; every existing workspace has real template targets',async()=>{
  await session('demo_admin',async(ui,app)=>{
    assert.equal(ui.all('.crew-card').length,6);assert.equal(ui.el('#crew-count').textContent,'6 AUTHORIZED CREW');
    for(const crew of CREW){
      ui.module.navigate('overview');await ui.click('[data-crew="'+crew.id+'"]');
      assert.equal(ui.el('#main h1').textContent,crew.name);assert.equal(ui.module.inspect().crewId,crew.id);
      assert.match(ui.el('#crew-metric-tiles').textContent,new RegExp(app.engine.state.crew.find(c=>c.id===crew.id).values.heart_rate.toFixed(0)));
      assert.equal(ui.el('.nav-button[aria-current="page"]').dataset.page,'crew');
    }
    for(const page of ['overview','agent','comms','knowledge','scenario','sources','cognitive','replay']){ui.module.navigate(page);await ui.flush();assert.ok(ui.el('#main h1'),page);}
    assert.ok(ui.el('#main').textContent.includes('Mission replay'));assert.equal(ui.el('#toast').textContent,'');
  });
});
test('N03 F08: actual Earth view toggle updates the badge immediately and hides onboard agent cases',async()=>{
  await session('demo_admin',async(ui,app)=>{
    alert(app.engine);await app.engine.enrichPending();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    assert.equal(ui.el('[data-live="alert-count"]').textContent,'1');
    await ui.click('[data-view="earth"]');assert.equal(ui.el('[data-live="alert-count"]').textContent,'');
    assert.ok(ui.all('.crew-card').every(c=>c.classList.contains('gray')));
    ui.module.navigate('agent');await ui.flush();assert.match(ui.el('#cases-content').textContent,/received alerts only/);
    assert.equal(ui.el('#cases-content .case-card'),null);
  });
});
test('N03/N01: received history remains independent when new onboard evidence has not reached Earth',()=>{
  const app=createApp({autoTick:false});
  try{
    for(let i=0;i<26;i++)app.engine.tick(30);assert.ok(app.engine.state.ground);
    alert(app.engine);const snapshot=app.engine.snapshot(),p=project(snapshot,{view:'earth'});
    assert.equal(p.alerts.length,0);assert.equal(snapshot.alerts.length,1);
    assert.equal(p.crew[2].values.heart_rate,snapshot.ground.crew[2].values.heart_rate);
    assert.notEqual(p.crew[2].values.heart_rate,snapshot.crew[2].values.heart_rate);
  }finally{void app.close();}
});
test('N03/N01: Astronaut sees one profile, correct counts and no other private crew history requests',async()=>{
  await session('astronaut',async(ui)=>{
    assert.equal(ui.all('.crew-card').length,1);assert.equal(ui.el('#crew-count').textContent,'1 AUTHORIZED CREW');
    assert.match(ui.el('#crew-monitored').textContent,/01.*01/);await ui.click('[data-crew="CREW-03"]');
    assert.equal(ui.all('.crew-tab').length,1);assert.equal(ui.module.inspect().crewId,'CREW-03');
  });
});
test('N03/N01: actual Viewer/Researcher templates never request raw private check-in history',async()=>{
  for(const role of ['viewer','researcher'])await session(role,async ui=>{
    let reads=0;ui.intercept((path,options,next)=>{if(path.includes('/checkins'))reads++;return next(path,options);});
    ui.module.navigate('cognitive');await ui.flush();assert.equal(reads,0);assert.match(ui.el('#checkin-history').textContent,/Private check-in history/);
    assert.equal(ui.el('#reaction-target').disabled,true);
  });
});
test('N03/N02: 202 pending and failed enrichment remain visible; recovery requires one actual human acknowledgement',async()=>{
  await session('demo_admin',async(ui,app)=>{
    const risk=alert(app.engine);ui.sources.at(-1).emit(app.engine.snapshot());ui.module.navigate('agent');await ui.module.probeCases(true);await ui.flush();
    assert.match(ui.el('#cases-content').textContent,/enrichment pending/);assert.ok(!ui.el('#cases-content').textContent.includes('No detector'));
    app.engine.caseBuilder=()=>{throw new Error('fault');};await app.engine.enrichPending();await ui.module.probeCases(true);await ui.module.pollStatus();
    assert.match(ui.el('#cases-content').textContent,/enrichment failed/);assert.equal(ui.module.inspect().health.status,'degraded');
    const job=app.store.record('enrichment_jobs',risk.id);job.next_attempt_at=0;app.store.put('enrichment_jobs',job.id,job);
    app.engine.caseBuilder=buildCase;await app.engine.enrichPending();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    const button=ui.el('[data-ack="'+risk.id+'"]');assert.equal(button.disabled,false);await ui.click(button);
    assert.equal(app.store.record('risk_events',risk.id).status,'acknowledged');assert.match(ui.el('[data-ack="'+risk.id+'"]').textContent,/acknowledged/i);
    await ui.click('[data-ack="'+risk.id+'"]');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,1);
  });
});
test('N03/N02: acknowledgement 409 never claims success or queues a report',async()=>{
  await session('demo_admin',async(ui,app)=>{
    const risk=alert(app.engine);await app.engine.enrichPending();ui.sources.at(-1).emit(app.engine.snapshot());ui.module.navigate('agent');await ui.flush();
    ui.intercept((path,options,next)=>path.endsWith('/ack')?response(409,{error:{code:'CASE_ENRICHMENT_PENDING',message:'Case enrichment is pending.'}})
      :path==='/v1/agent/cases'?response(202,{risk_event_id:risk.id,case:null,enrichment:{status:'pending'}}):next(path,options));
    await ui.click('[data-ack="'+risk.id+'"]');assert.match(ui.el('#toast').textContent,/not confirmed/);
    assert.match(ui.el('#cases-content').textContent,/enrichment pending/);assert.equal(ui.el('[data-ack]'),null);
    assert.equal(app.store.record('risk_events',risk.id).status,'open');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
  });
});
test('N03 F13: health503, lost API and recovery update actual UI instead of asserting availability',async()=>{
  await session('demo_admin',async(ui,app)=>{
    app.engine.monitor.failure();await ui.module.pollStatus();assert.match(ui.el('#system-activity').textContent,/failed/);
    assert.ok(ui.all('.crew-card').every(c=>c.classList.contains('gray')));assert.match(ui.el('#crew-grid').textContent,/—/);
    app.engine.tick(30);await ui.module.pollStatus();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.ok(ui.all('.crew-card').every(c=>c.classList.contains('green')));
    ui.intercept(()=>{throw new Error('offline');});ui.sources.at(-1).onerror();await ui.flush();
    assert.equal(ui.module.inspect().connected,false);assert.ok(ui.all('.crew-card').every(c=>c.classList.contains('gray')));
    assert.match(ui.el('#system-activity').textContent,/availability unknown/);
    ui.intercept(null);await ui.module.pollStatus();await ui.flush();assert.equal(ui.module.inspect().connected,true);
    assert.match(ui.el('#connection').textContent,/polling/);
  });
});
test('N03: late forecast/history responses cannot populate another crew selection',async()=>{
  await session('demo_admin',async(ui)=>{
    const pending=[];ui.intercept((path,options,next)=>{
      if(path.includes('/CREW-03/')&&(path.includes('predictions')||path.includes('telemetry')))return new Promise(resolve=>pending.push({path,resolve}));
      if(path.includes('/predictions'))return response(200,{heart_rate:{available:true,estimate:88,horizon_minutes:30,lower:87,upper:89,history_count:60,model_version:'CURRENT',interval_label:'Synthetic fixture'}});
      return next(path,options);
    });
    await ui.click('[data-crew="CREW-03"]');assert.equal(pending.length,2);
    await ui.click('[data-crew="CREW-02"]');assert.match(ui.el('#forecast-content').textContent,/88/);
    for(const p of pending)p.resolve(response(200,p.path.includes('predictions')?{heart_rate:{available:true,estimate:222}}:[{id:'CREW-03',values:{heart_rate:222}}]));
    await ui.flush();assert.ok(!ui.el('#forecast-content').textContent.includes('222'));assert.ok(ui.module.inspect().history.every(c=>c.id==='CREW-02'));
  });
});
test('N03: streaming updates preserve focused controls and an unsaved link form',async()=>{
  await session('demo_admin',async(ui,app)=>{
    const card=ui.el('[data-crew="CREW-01"]');card.focus();app.engine.tick(30);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    assert.equal(ui.document.activeElement,card);assert.equal(ui.el('[data-crew="CREW-01"]'),card);
    ui.module.navigate('comms');const field=ui.el('[name="delay"]');field.value='7.5';field.focus();
    app.engine.tick(30);ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();assert.equal(ui.document.activeElement,field);assert.equal(field.value,'7.5');
  });
});
test('N03: stale session responses and cached protected cases cannot survive session expiry',async()=>{
  await session('demo_admin',async(ui,app)=>{
    alert(app.engine);await app.engine.enrichPending();ui.sources.at(-1).emit(app.engine.snapshot());await ui.flush();
    const cached=JSON.parse(ui.storage.get('astra-synthetic-snapshot'));assert.deepEqual(cached.cases,[]);
    const oldStream=ui.sources.at(-1);app.store.db.prepare('UPDATE sessions SET expires_at=0').run();
    await assert.rejects(ui.module.refreshState());await ui.flush();assert.equal(ui.module.inspect().identity,null);assert.equal(ui.module.inspect().state,null);
    assert.equal(ui.storage.size,0);oldStream.emit(app.engine.snapshot());assert.equal(ui.module.inspect().state,null);assert.ok(ui.el('#login-form'));
  });
});
test('N03: stopping only the active known scenario preserves imported ownership and existing records',async()=>{
  const app=createApp({autoTick:false});const call=transport(app);
  try{const login=await call('/v1/auth/demo',{body:{role:'demo_admin'}}),cookie=login.headers['Set-Cookie'].split(';')[0];
    const run=app.engine.state.runId;
    assert.equal((await call('/v1/scenarios/invented/stop',{cookie,body:{}})).status,404);assert.equal(app.engine.state.runId,run);
    assert.equal((await call('/v1/scenarios/post-exercise/stop',{cookie,body:{}})).status,409);
    const observation=structuredClone(app.engine.state.crew[2].metric_observations.heart_rate);
    delete observation.integrity;delete observation.ingestion;observation.event_id='n03-stop-import';observation.source.kind='synthetic-import';observation.source.device_id='N03';
    app.engine.ingest([observation]);
    await call('/v1/scenarios/post-exercise/start',{cookie,body:{seed:123}});
    assert.equal((await call('/v1/scenarios/post-exercise/stop',{cookie,body:{}})).status,200);
    assert.equal(app.engine.state.scenario,'nominal');assert.equal(app.engine.state.seed,123);
    assert.equal(app.engine.state.crew[2].metric_observations.heart_rate.event_id,observation.event_id);
    assert.ok(app.store.list('scenario_runs').length>=2);assert.equal(app.store.verifyAudit(),true);
  }finally{await app.close();}
});
test('N03: existing scenario start/stop controls submit the actual active ID and recover their enabled state',async()=>{
  await session('demo_admin',async(ui,app)=>{
    ui.module.navigate('scenario');assert.equal(ui.el('[data-stop-scenario]').disabled,true);
    await ui.click('[data-scenario="post-exercise"]');assert.equal(app.engine.state.scenario,'post-exercise');assert.equal(ui.el('[data-stop-scenario]').disabled,false);
    await ui.click('[data-stop-scenario]');assert.equal(app.engine.state.scenario,'nominal');assert.equal(ui.el('[data-stop-scenario]').disabled,true);
  });
});
test('N03: failed research and history requests render unavailable states without reusing an earlier answer',async()=>{
  await session('demo_admin',async(ui)=>{
    ui.module.navigate('knowledge');ui.el('#knowledge-query').value='sleep fatigue';await ui.submit('#knowledge-form');assert.ok(ui.el('#knowledge-result .citation'));
    ui.intercept((path,options,next)=>path==='/v1/rag/query'?response(503,{error:{code:'KNOWLEDGE_UNAVAILABLE',message:'Knowledge unavailable'}})
      :path.includes('/telemetry')?Promise.reject(new Error('history offline')):next(path,options));
    ui.el('#knowledge-query').value='heart';await ui.submit('#knowledge-form');assert.match(ui.el('#knowledge-result').textContent,/Knowledge unavailable/);assert.equal(ui.el('#knowledge-result .citation'),null);
    ui.module.navigate('crew');await ui.flush();assert.match(ui.el('#history-chart').textContent,/History unavailable/);
  });
});

test('N03 browser continuation: pending research removes prior citations and exposes loading without losing input',async()=>{
  await session('demo_admin',async ui=>{
    ui.module.navigate('knowledge');ui.el('#knowledge-query').value='sleep fatigue';await ui.submit('#knowledge-form');
    assert.ok(ui.el('#knowledge-result .citation'));
    let release;
    ui.intercept((path,options,next)=>path==='/v1/rag/query'?new Promise(resolve=>{release=()=>resolve(next(path,options));}):next(path,options));
    ui.el('#knowledge-query').value='communication delay';const pending=ui.submit('#knowledge-form');await ui.flush();
    try{
      assert.match(ui.el('#knowledge-result').textContent,/Searching/);
      assert.equal(ui.el('#knowledge-result .citation'),null);assert.equal(ui.el('#knowledge-query').value,'communication delay');
      assert.equal(ui.el('#knowledge-form button').disabled,true);
    }finally{release();await pending;}
    assert.ok(ui.el('#knowledge-result .citation'));
  });
});
test('N03 browser continuation: twin layers expose the selected state to assistive technology',async()=>{
  await session('demo_admin',async ui=>{
    ui.module.navigate('crew');await ui.click('[data-twin-view="schematic"]');assert.equal(ui.el('[data-layer="0"]').getAttribute('aria-pressed'),'true');
    await ui.click('[data-layer="2"]');assert.equal(ui.el('[data-layer="2"]').getAttribute('aria-pressed'),'true');
    assert.equal(ui.el('[data-layer="0"]').getAttribute('aria-pressed'),'false');
    ui.sources.at(-1).emit(ui.module.inspect().state);await ui.flush();
    assert.equal(ui.el('[data-layer="2"]').getAttribute('aria-pressed'),'true');
  });
});
test('N03 acceptance: replay and check-in breadcrumbs identify the actual workspace',async()=>{
  await session('demo_admin',async ui=>{
    ui.module.navigate('replay');await ui.flush();assert.equal(ui.el('#breadcrumb').textContent,'Mission replay');
    ui.module.navigate('cognitive');await ui.flush();assert.equal(ui.el('#breadcrumb').textContent,'Crew check-in');
  });
});
test('N03 acceptance: private check-in requests show persistent loading and403 failure without old records',async()=>{
  await session('demo_admin',async ui=>{
    let finish;
    ui.intercept((path,options,next)=>path.endsWith('/checkins')?new Promise(resolve=>{finish=resolve;}):next(path,options));
    ui.module.navigate('cognitive');await ui.flush();assert.match(ui.el('#checkin-history').textContent,/Loading/);
    finish(response(403,{error:{code:'FORBIDDEN',message:'Check-in review permission unavailable'}}));await ui.flush();
    assert.match(ui.el('#checkin-history').textContent,/Check-in history unavailable/);
    assert.match(ui.el('#checkin-history').textContent,/permission unavailable/);assert.equal(ui.el('#checkin-history .queue-message'),null);
  });
});
test('N03 acceptance: empty and failed replay keep the slider disabled and state the actual availability',async()=>{
  await session('demo_admin',async ui=>{
    let finish;
    ui.intercept((path,options,next)=>path.includes('/telemetry')?new Promise(resolve=>{finish=resolve;}):next(path,options));
    ui.module.navigate('replay');await ui.flush();assert.match(ui.el('#replay-chart').textContent,/Loading/);assert.equal(ui.el('#replay-range').disabled,true);
    finish(response(200,[]));await ui.flush();assert.match(ui.el('#replay-chart').textContent,/No stored observations/);assert.equal(ui.el('#replay-range').disabled,true);
    ui.module.navigate('crew');await ui.flush();ui.intercept((path,options,next)=>path.includes('/telemetry')?response(400,{error:{code:'INVALID_HISTORY',message:'History request rejected'}}):next(path,options));
    ui.module.navigate('replay');await ui.flush();assert.match(ui.el('#replay-chart').textContent,/Replay unavailable.*History request rejected/);
    assert.equal(ui.el('#replay-range').disabled,true);assert.equal(ui.el('#replay-chart svg'),null);
  });
});
test('N03 acceptance: model503 and audit403 do not relabel valid provenance as unavailable',async()=>{
  await session('demo_admin',async ui=>{
    ui.intercept((path,options,next)=>path==='/v1/models'?response(503,{error:{code:'MODELS_UNAVAILABLE',message:'Model service unavailable'}})
      :path==='/v1/audit'?response(403,{error:{code:'FORBIDDEN',message:'Audit permission unavailable'}}):next(path,options));
    ui.module.navigate('sources');await ui.flush();assert.equal(ui.all('#source-grid .source-card').length,29);
    assert.match(ui.el('#model-cards').textContent,/Models unavailable.*Model service unavailable/);
    assert.match(ui.el('#audit-content').textContent,/Audit unavailable.*Audit permission unavailable/);
    assert.ok(ui.el('#dataset-catalogue table'));
  });
});
test('N03 acceptance:400 and403 writes retain entered link settings and never report success',async()=>{
  for(const status of [400,403])await session('demo_admin',async(ui,app)=>{
    ui.module.navigate('comms');ui.el('[name="delay"]').value='7.5';const previous=app.engine.comms.config.one_way_latency_ms;
    ui.intercept((path,options,next)=>path==='/v1/comms/control'?response(status,{error:{code:'REJECTED',message:'Link change rejected '+status}}):next(path,options));
    await ui.submit('#comms-form');assert.equal(ui.el('[name="delay"]').value,'7.5');assert.match(ui.el('#toast').textContent,new RegExp('Link change rejected '+status));
    assert.equal(app.engine.comms.config.one_way_latency_ms,previous);assert.equal(ui.el('#comms-form button').disabled,false);
  });
});
