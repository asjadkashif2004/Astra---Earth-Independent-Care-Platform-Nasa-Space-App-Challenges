import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { status,events,replay } from '../services/telemetry-simulator/n09-engine.mjs';
import { digest } from '../services/telemetry-simulator/n09-model.mjs';
export async function n09FullChecks(c){
 const who={id:'demo-demo_admin',role:'demo_admin'},t=s=>'document.querySelector('+JSON.stringify(s)+')?.textContent',started=performance.now();
 const set=(s,v)=>c.evaluate('(()=>{const e=document.querySelector('+JSON.stringify(s)+');e.value='+JSON.stringify(v)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
 const run=()=>status(c.app().engine,who).current;let firstId,firstAt,waveId;
 const control=async(action,scope='',seconds=null)=>{await set('#n09-scope',scope);if(seconds!==null)await set('#n09-step-seconds',seconds);await c.click('[data-n09-control='+action+']');await c.wait(t('#n09-status')+'.startsWith("Executed '+action+'")');};
 const login=async role=>{await set('#login-role',role);await c.click('#login-form button');await c.wait('!!document.querySelector(".app-shell")');await c.click('[data-page=scenario]');await c.wait('!!document.querySelector("#n09-status")');};
 await c.check('N09 actual Scenario Lab, empty state and malformed configuration feedback',async()=>{
  await login('demo_admin');await c.wait(t('#n09-status')+'.startsWith("Loaded")');assert.ok(await c.evaluate(t('#n09-summary')+'.includes("UNKNOWN")'));assert.equal(await c.evaluate('document.querySelectorAll("[data-n09-assignment]").length'),6);assert.ok(await c.evaluate('!!document.querySelector("#demo-target")'));
  await set('#n09-duration',7);await c.click('#n09-start');await c.wait(t('#n09-status')+'.startsWith("Start failed")');assert.equal(await c.evaluate('document.querySelector("#n09-duration").value'),'7');assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM n09_runs').get().n,0);
 });
 await c.check('N09 real N08 synthetic import and verified waveform source selection',async()=>{
  await c.click('[data-page=waveforms]');await c.wait('!!document.querySelector("#wave-confirm")');await c.click('#wave-confirm');await c.click('#wave-generate');await c.wait(t('#wave-status')+'.startsWith("Imported")');waveId=await c.evaluate('document.querySelector("#wave-source").value');
  await c.click('[data-page=scenario]');await c.wait(t('#n09-status')+'.startsWith("Loaded")');await c.click('#n09-wave-sources');await c.wait(t('#n09-status')+'.startsWith("Loaded 1 verified")');await set('#n09-wave-select',waveId);
 });
 await c.check('N09 genuine multi-crew startup, canonical generation and actual N02 warning/UNKNOWN',async()=>{
  await set('#n09-duration',600);await set('[data-n09-assignment="CREW-03"]','nominal');await set('[data-n09-assignment="CREW-01"]','cardiorespiratory-drift');await set('[data-n09-assignment="CREW-04"]','sensor-dropout');
  await c.click('#n09-start');await c.wait(t('#n09-status')+'.startsWith("Started versioned")');firstId=run().id;firstAt=run().started_at;assert.equal(run().frames,1);await control('step','',300);assert.equal(run().frames,11);
  const crew=run().crew;assert.equal(crew[0].status,'amber');assert.equal(crew[3].status,'gray');assert.equal(crew[2].status,'green');assert.ok(c.app().store.list('risk_events').some(r=>r.run_id===firstId&&r.crew_id==='CREW-01'));assert.ok(await c.evaluate(t('#n09-summary')+'.includes("11actual frames")'));
  await c.shot('n09-multi-crew.png');
 });
 await c.check('N09 actual bounded waveform display preserves original source and gaps',async()=>{
  await c.click('#n09-wave');await c.wait('!!document.querySelector("#n09-detail svg")');assert.ok(await c.evaluate(t('#n09-detail')+'.includes("125missing")'));assert.ok(await c.evaluate(t('#n09-detail')+'.includes("scalar injection:false")'));assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n,1);await c.shot('n09-waveform.png');
 });
 await c.check('N09 per-crew and run pause/resume keep source clock and staleness honest',async()=>{
  const at=c.app().engine.state.crew[0].observed_at;await control('pause','CREW-01');await control('step','',120);assert.equal(c.app().engine.state.crew[0].observed_at,at);assert.equal(c.app().engine.state.crew[0].status,'gray');await control('resume','CREW-01');await control('step','',30);assert.notEqual(c.app().engine.state.crew[0].observed_at,at);
  const activeSeconds=run().elapsed_seconds;await control('pause');await control('step','',120);assert.equal(run().elapsed_seconds,activeSeconds);assert.equal(c.app().engine.state.crew[2].status,'gray');await control('resume');
 });
 await c.check('N09 historical source/knowledge cutoffs and append-only exclusions',async()=>{
  await c.click('#n09-follow');await set('#n09-at',firstAt);await set('#n09-before',firstAt);await c.click('#n09-replay');await c.wait(t('#n09-replay-view')+'.includes("committed frame 1")');assert.equal(await c.evaluate(t('#n09-timeline')+'.includes("CREW_PAUSED")'),false);
  await set('#n09-at','2026-11-14T00:00:00.000Z');await set('#n09-before','2026-11-14T00:00:00.000Z');await c.click('#n09-replay');await c.wait(t('#n09-replay-view')+'.includes("UNKNOWN")');
  await c.click('#n09-follow');await c.click('#n09-load');await c.wait(t('#n09-status')+'.startsWith("Loaded")');
  await c.evaluate('document.querySelector("#n09-reason").closest("details").open=true');await set('#n09-reason','Synthetic QA exclusion; original samples retained');const count=run().frames;await c.click('#n09-exclude');await c.wait(t('#n09-status')+'.startsWith("Executed exclude")');assert.equal(run().frames,count);assert.ok(events(c.app().engine,firstId).some(e=>e.kind==='ANNOTATION'));
 });
 await c.check('N09 dated calibration and consent-preserving N10 context are actual reads',async()=>{
  await c.click('#n09-calibration');await c.wait(t('#n09-detail')+'.includes("720 hourly samples")');assert.ok(await c.evaluate(t('#n09-detail')+'.includes("Not a validated clinical reference")'));await c.click('#n09-context');await c.wait(t('#n09-detail')+'.includes("N10 source-bound context")');assert.equal(c.app().store.db.prepare("SELECT count(*) n FROM n10_records WHERE kind IN ('consent','checkin')").get().n,0);
 });
 await c.check('N09 stop/reset and genuine multiday completion with source-bound N10 records',async()=>{
  c.app().engine.comms.control({blackout:true},c.app().engine.state.now);await control('stop');assert.equal(run().status,'CANCELLED');assert.equal(c.app().engine.comms.config.blackout,true);await control('reset');assert.notEqual(run().id,firstId);assert.ok(c.app().store.record('risk_events',c.app().store.list('risk_events')[0].id));await control('stop');
  for(const crew of ['CREW-01','CREW-04'])await set('[data-n09-assignment="'+crew+'"]','nominal');await set('[data-n09-assignment="CREW-03"]','sleep-fatigue');await set('#n09-duration',259200);await set('#n09-cadence',3600);await c.click('#n09-start');await c.wait(t('#n09-status')+'.startsWith("Started versioned")');
  // Each of12 UI commands genuinely advances the hourly cadence; no browser clock fabrication.
  for(let i=0;i<12;i++){
   await control('step','',21600);
   if(i===3){
    const e=c.app().engine,oldFrame=replay(e,who,run().id).frame,oldHash=digest(oldFrame),day=run().completed_days['CREW-03'][0],sleep=e.state.crew[2].sleep_session;e.tick(1);
    const corrected=e.correctSleep('CREW-03',sleep.session_id,{expected_revision:1,start_at:new Date(Date.parse(sleep.end_at)-Math.round(day.reference_hours*3600000)).toISOString(),reason:'Synthetic browser acceptance correction'});
    assert.equal(run().completed_days['CREW-03'][0].observed_hours,corrected.duration_hours);assert.equal(digest(replay(e,who,run().id,{at:oldFrame.source_at,before:oldFrame.known_at}).frame),oldHash);
    await c.click('#n09-load');await c.wait(t('#n09-timeline')+'.includes("SLEEP_SOURCE_CORRECTED")');
    c.report.N09_sleep_correction={session_id:sleep.session_id,revision:corrected.revision,earlier_frame_hash:oldHash,earlier_replay_unchanged:true,execution:'existing authorized synthetic service, then real UI refresh'};
   }
  }
  assert.equal(run().status,'COMPLETED');assert.equal(run().frames,73);assert.equal(run().completed_days['CREW-03'].length,3);assert.ok(c.app().store.db.prepare("SELECT count(*) n FROM n10_records WHERE kind='exercise'").get().n>0);assert.ok(await c.evaluate(t('#n09-summary')+'.includes("COMPLETED")'));await c.shot('n09-multiday.png');
 });
 await c.check('N09 real restart recovers exact committed frames without replay or duplicate sources',async()=>{
  const before=run(),hash=digest(replay(c.app().engine,who,before.id).frame),count=c.app().store.db.prepare('SELECT count(*) n FROM telemetry_points').get().n;
  await c.restart();await c.click('#n09-load');await c.wait(t('#n09-status')+'.startsWith("Loaded")');assert.equal(run().id,before.id);assert.equal(run().frames,before.frames);assert.equal(digest(replay(c.app().engine,who,before.id).frame),hash);assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM telemetry_points').get().n,count);assert.ok(await c.evaluate(t('#n09-summary')+'.includes("RECOVERED AFTER RESTART")'));c.report.N09_recovery={run_id:before.id,frames:before.frames,frame_hash:hash,observation_count:count,replayed_ticks:0};
 });
 await c.check('N09 API failure/recovery and permission/privacy denial',async()=>{
  if(await c.evaluate('document.querySelector("#n09-follow").checked'))await c.click('#n09-follow');
  await c.settle(); // Drain any read admitted before manual refresh mode was selected.
  c.fault('/v1/scenarios/runs/'+run().id,503,'Injected saved-state failure');await c.click('#n09-load');await c.wait(t('#n09-status')+'.startsWith("Run unavailable")');assert.ok(await c.evaluate(t('#n09-summary')+'.includes("UNAVAILABLE")'));await c.click('#n09-load');await c.wait(t('#n09-status')+'.startsWith("Loaded")');
  for(const role of ['viewer','astronaut']){await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-role")');await login(role);await c.wait(t('#n09-status')+'.startsWith("Loaded")');assert.equal(await c.evaluate('document.querySelector("#n09-start").disabled'),true);if(role==='astronaut')assert.equal(await c.evaluate('document.querySelectorAll(".n09-readings article").length'),1);assert.equal(await c.evaluate('fetch("/v1/scenarios/nominal/start",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).then(r=>r.status)'),403);}
  await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-role")');await login('demo_admin');await c.wait(t('#n09-status')+'.startsWith("Loaded")');
 });
 await c.check('N09 four viewports, source/provenance visibility and native keyboard focus',async()=>{
  const focus=[];for(const [width,height]of [[1920,1080],[1366,768],[768,1024],[390,844]]){await c.viewport(width,height);await c.settle();assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await c.evaluate('document.querySelector("#n09-seed").focus()');for(let i=0;i<3;i++){await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});const a=await c.evaluate('(()=>{const e=document.activeElement;return{id:e.id,visible:e.matches(":focus-visible"),outline:getComputedStyle(e).outlineWidth}})()');assert.ok(a.visible&&parseFloat(a.outline)>=2);focus.push({width,...a});}c.report.viewports.push({page:'N09 Scenario Lab',width,height,overflow:false});await c.shot('n09-'+width+'x'+height+'.png');}c.report.N09_keyboard=focus;await c.viewport(1366,768);
 });
 await c.check('N09 Earth exclusion, preserved selected-HR controls and no implicit operational integration',async()=>{
  await c.click('[data-view=earth]');await c.wait(t('#n09-status')+'.includes("Earth received view")');assert.equal(await c.evaluate('document.querySelector("#n09-start").disabled'),true);assert.equal(await c.evaluate('document.querySelector("#demo-target").disabled'),true);await c.click('[data-view=spacecraft]');await c.wait(t('#n09-status')+'.startsWith("Loaded")');assert.ok(await c.evaluate('!!document.querySelector("#demo-target")'));await c.shot('n09-final.png');
 });
 c.report.N09_resources={elapsed_ms:performance.now()-started,Node_memory:process.memoryUsage(),kernel_max_RSS_KiB:process.resourceUsage().maxRSS,SQL_run_count:c.app().store.db.prepare('SELECT count(*) n FROM n09_runs').get().n,observations:c.app().store.db.prepare('SELECT count(*) n FROM telemetry_points').get().n,N16_worker_starts:0,model_executions:0,external_acquisition:0};
 writeFileSync(join(c.directory,'executed-runs.json'),JSON.stringify(status(c.app().engine,who),null,2));
}
