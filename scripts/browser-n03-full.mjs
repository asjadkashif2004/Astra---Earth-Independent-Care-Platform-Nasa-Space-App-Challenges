/* Real installed Chrome, bounded fictional application store; no models or operational sources. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { functionalChecks, automaticChecks, durableChecks } from './browser-checks.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { contrastBounds } from './browser-closure.mjs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const sizes=[[1920,1080],[1366,768],[768,1024],[390,844]];
const routes=['overview','crew','n10','waveforms','agent','comms','knowledge','scenario','sources','replay','cognitive'];
const text=s=>'document.querySelector('+JSON.stringify(s)+')?.textContent';
const p95=a=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1];
async function set(c,s,v){await c.evaluate('document.querySelector('+JSON.stringify(s)+').value='+JSON.stringify(String(v)));}
async function go(c,page){
  if(page==='replay'){await go(c,'crew');await c.click('[data-action=replay]');await c.wait('!!document.querySelector("#replay-range")');}
  else if(page==='cognitive'){await c.click('[data-action=cognitive]');await c.wait('!!document.querySelector("#reaction-target")');}
  else {await c.click('[data-page='+page+']');await c.wait('document.querySelector(".nav-button[aria-current=page]")?.dataset.page==='+JSON.stringify(page));}
  await c.settle();
}
async function key(c,key='Tab',code=key,n=9){for(const type of ['keyDown','keyUp'])await c.send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:n,...(key==='Enter'?{text:'\r'}:{})});}
async function audit(c,page,width,height){
  await c.viewport(width,height);await c.settle();
  if(!await c.evaluate('!!window.axe'))await c.evaluate(readFileSync(new URL('../artifacts/n03-closure-tools/axe.min.js',import.meta.url),'utf8')+'\ntrue');
  const result=await c.evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}}).then(r=>({version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target}))})),passes:r.passes.length}))`);
  const layout=await c.evaluate(`({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visual_scale:visualViewport.scale,css_zoom:getComputedStyle(document.documentElement).zoom,document_width:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,positive_tabindex:[...document.querySelectorAll('[tabindex]')].filter(e=>e.tabIndex>0).length})`);
  const tree=await c.send('Accessibility.getFullAXTree'),unnamed=tree.nodes.filter(n=>!n.ignored&&['button','link','combobox','slider','textbox'].includes(n.role?.value)&&!n.name?.value?.trim()).map(n=>({role:n.role.value,id:n.nodeId}));
  const contrast=await c.evaluate('('+contrastBounds.toString()+')('+JSON.stringify(result.incomplete.filter(v=>v.id==='color-contrast').flatMap(v=>v.nodes.map(n=>n.target)))+')');
  c.report.N03_audits.push({page,physical_width:width,physical_height:height,native_zoom:c.nativeZoom,layout,axe:result,unnamed,supplemental_contrast:contrast});
  assert.equal(layout.overflow,false,page+' document overflow '+width);assert.equal(layout.positive_tabindex,0);assert.equal(layout.css_zoom,'1');assert.equal(layout.visual_scale,1);assert.ok(Math.abs(layout.dpr-c.nativeZoom)<.01);assert.ok(Math.abs(layout.width-width/c.nativeZoom)<=1);
  assert.deepEqual(unnamed,[],page+' unnamed AX controls');assert.deepEqual(result.violations,[],page+' accessibility violations');
  assert.deepEqual(contrast.filter(v=>!v.pass),[],page+' unresolved contrast bounds');
}
export async function n03FullChecks(c){
  // The retained functional checks change pages at mobile width. Wait for finite
  // entry transitions before locating a native pointer target; never click a
  // stale moving rectangle or replace the interaction with element.click().
  const pointer=c.click;c={...c,click:async selector=>{await c.settle();await pointer(selector);}};
  if(process.argv.includes('--task=data'))return dataChecks(c);
  c.report.scope='N03 fresh connected frontend qualification; local fictional database, no N11/N12 model starts, no N14/N15 application activation, no sealed source';
  c.report.N03_audits=[];await c.send('Accessibility.enable');
  await c.check('N03 landing native zoom, responsive entry and accessible identity controls',async()=>{for(const [w,h] of sizes)await audit(c,'landing',w,h);});
  await set(c,'#login-role','demo_admin');await c.click('#login-form button');await c.wait('document.querySelectorAll(".crew-card").length===6');
  if(c.nativeZoom===1){
    await c.check('N03 six canonical profiles, real measurements, source history and invalid crew isolation',async()=>{
      c.report.N03_profiles=[];
      for(const r of c.app().engine.state.crew){await c.click('[data-crew="'+r.id+'"]');await c.wait('!!document.querySelector("#history-chart svg")');assert.equal(await c.evaluate('document.querySelector(".crew-tab[aria-pressed=true]").dataset.crew'),r.id);assert.ok(await c.evaluate(text('#crew-metric-tiles')+'.includes('+JSON.stringify(r.values.heart_rate.toFixed(0))+')'));c.report.N03_profiles.push({crew:r.id,heart_rate:r.values.heart_rate,source:r.metric_observations.heart_rate.source});}
      assert.equal(await c.evaluate('fetch("/v1/crew/CREW-99/telemetry").then(r=>r.status)'),404);
      c.delay('/v1/crew/CREW-03/telemetry',700);await c.click('[data-crew=CREW-03]');await c.click('[data-crew=CREW-02]');await pause(800);assert.equal(await c.evaluate('document.querySelector(".crew-tab[aria-pressed=true]").dataset.crew'),'CREW-02');
    });
    await functionalChecks(c);
    await c.check('N03 monitoring unavailable, offline transport and recovery preserve UNKNOWN',async()=>{
      await go(c,'overview');c.app().engine.monitor.failure();await c.wait('[...document.querySelectorAll(".crew-card")].every(e=>e.classList.contains("gray"))');
      c.app().engine.tick(30);c.app().broadcast();await c.wait('[...document.querySelectorAll(".crew-card")].some(e=>e.classList.contains("green"))');
      await c.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.wait(text('#connection')+'.includes("disconnected")');assert.ok(await c.evaluate('[...document.querySelectorAll(".crew-card")].every(e=>e.classList.contains("gray"))'));
      await c.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await c.wait(text('#connection')+'.includes("Monitoring")');
    });
    await c.check('N03 connected domain views preserve research and inactive integration boundaries',async()=>{
      await go(c,'n10');await c.wait('!!document.querySelector("#n10-status")');assert.ok(await c.evaluate(text('#main')+'.includes("Sleep")'));
      await go(c,'crew');await c.click('[data-crew=CREW-03]');await go(c,'waveforms');await c.wait(text('#wave-status')+'.startsWith("Loaded 0")');assert.ok(await c.evaluate(text('#wave-chart')+'.includes("UNKNOWN")'));
      // Small authored input exercises the existing authorized synthetic archive, not an external medical file.
      await c.click('#wave-confirm');await c.click('#wave-generate');await c.wait(text('#wave-status')+'.startsWith("Imported")');assert.ok(await c.evaluate('!!document.querySelector(".wave-signal")'));await c.click('#wave-start');await c.click('#wave-play');await c.wait('Number(document.querySelector("#wave-seek").value)>100');await c.click('#wave-pause');const at=await c.evaluate('document.querySelector("#wave-seek").value');await pause(250);assert.equal(await c.evaluate('document.querySelector("#wave-seek").value'),at);
      await go(c,'crew');await c.wait(text('#n12-status')+'.startsWith("Loaded")');assert.ok(await c.evaluate(text('#n12-result')+'.includes("UNKNOWN")'));assert.ok(await c.evaluate(text('#n12-research')+'.includes("REJECTED_FOR_PROMOTION")'));
      await go(c,'sources');await c.wait(text('#n11-status')+'.startsWith("Loaded")');assert.ok(await c.evaluate(text('#n11-result')+'.includes("UNKNOWN")'));
      await go(c,'agent');assert.ok(await c.evaluate(text('#main')+'.includes("no executed tool graph")'));assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM n11_jobs').get().n,0);assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM n12_jobs').get().n,0);
    });
  }
  for(const page of routes)await c.check('N03 '+page+' reflow, accessible names and axe audit at four viewports',async()=>{
    await c.viewport(1920,1080);await go(c,page);
    for(const [w,h]of sizes)await audit(c,page,w,h);
    await c.evaluate('document.querySelector("#main").focus()');const keys=[];
    for(let i=0;i<6&&keys.length<3;i++){await key(c);const f=await c.evaluate('(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return {tag:e.tagName,name:e.getAttribute("aria-label")||e.textContent.slice(0,100),visible:e.matches(":focus-visible"),outline:parseFloat(getComputedStyle(e).outlineWidth),in_view:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}})()');if(f.tag==='BODY'){c.report.N03_document_boundary_stops=(c.report.N03_document_boundary_stops??0)+1;continue;}assert.ok(f.visible&&f.outline>=2&&f.in_view,JSON.stringify(f));keys.push(f);}assert.equal(keys.length,3);c.report.N03_audits.at(-1).native_keyboard=keys;
    if(['overview','crew','waveforms','sources'].includes(page))await c.shot('n03-'+page+'-zoom'+c.nativeZoom+'.png');
  });
  if(c.nativeZoom===2)return;
  await c.check('N03 actual N02 pending/failure/recovery, Earth separation and human acknowledgement',async()=>{
    await c.viewport(1920,1080);c.app().engine.comms.control({blackout:true},c.app().engine.state.now);c.app().engine.caseBuilder=()=>{throw new Error('Injected browser-test enrichment failure');};
    c.app().engine.startScenario('sleep-debt-cardio-drift');for(let i=0;i<12;i++)c.app().engine.tick(30);c.app().broadcast();await go(c,'agent');await c.wait(text('#cases-content')+'.includes("enrichment pending")');await c.app().engine.enrichPending();c.app().broadcast();await c.wait(text('#cases-content')+'.includes("enrichment failed")');
    await go(c,'overview');await c.click('[data-view=earth]');await c.wait(text('[data-live=alert-count]')+'===""');assert.ok(await c.evaluate('[...document.querySelectorAll(".crew-card")].every(e=>e.classList.contains("gray"))'));assert.equal(await c.evaluate('document.querySelector("#toast").classList.contains("show")&&document.querySelector("#toast").dataset.reviewEvent==="true"'),false);
    await c.click('[data-view=spacecraft]');c.app().engine.caseBuilder=buildCase;const risk=c.app().store.list('risk_events')[0],job=c.app().store.record('enrichment_jobs',risk.id);job.next_attempt_at=0;c.app().store.put('enrichment_jobs',job.id,job);await c.app().engine.enrichPending();c.app().broadcast();await go(c,'agent');await c.wait('!!document.querySelector("[data-ack]:not([disabled])")');
    c.fault('/v1/alerts/'+risk.id+'/ack',409,'Injected acknowledgement conflict');await c.click('[data-ack]');await c.wait(text('#toast')+'.includes("not confirmed")');assert.equal(c.app().store.record('risk_events',risk.id).status,'open');assert.equal(c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
    await c.wait('!!document.querySelector("[data-ack]:not([disabled])")');await c.click('[data-ack]');await c.wait('!!document.querySelector("[data-ack][disabled]")');assert.equal(c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case').length,1);
  });
  await durableChecks(c);
  await c.check('N03 keyboard navigation, dirty forms and streaming focus stability',async()=>{
    await c.viewport(1366,768);await go(c,'overview');await c.evaluate('document.querySelector("[data-page=comms]").focus()');await key(c,'Enter','Enter',13);await c.wait('!!document.querySelector("#comms-form")');
    await set(c,'[name=delay]',7.5);await c.evaluate('document.querySelector("[name=delay]").focus();window.__focus=document.activeElement');c.app().engine.tick(30);c.app().broadcast();await pause(200);assert.equal(await c.evaluate('document.activeElement===window.__focus'),true);assert.equal(await c.evaluate('document.querySelector("[name=delay]").value'),'7.5');
  });
  await c.check('N03 five actual voluntary timed trials, persistent history and privacy-preserving cache',async()=>{
    await go(c,'crew');await c.click('[data-crew=CREW-03]');await go(c,'cognitive');
    const before=JSON.stringify(c.app().engine.state.crew);
    for(let i=0;i<5;i++){c.app().broadcast();await pause(100);await c.click('#reaction-target');await c.wait('document.querySelector("#reaction-target").classList.contains("ready")');c.app().broadcast();await pause(180);await pointer('#reaction-target');await c.wait('document.querySelectorAll("#reaction-trials span").length==='+String(i+1));}
    await c.click('#save-checkin');await c.wait('!!document.querySelector("#checkin-history .queue-message")');assert.equal(JSON.stringify(c.app().engine.state.crew),before);assert.ok(await c.evaluate('!localStorage.getItem("astra-synthetic-snapshot").includes("reaction_ms")'));
    c.report.N03_personal_task={trials:5,source:'actual browser input timing, approximate and nonclinical',synthetic_sensor_state_unchanged:true,raw_history_not_cached:true};
  });
  await c.check('N03 session-end cancellation, expiry and crew-role privacy',async()=>{
    c.delay('/v1/audit',1000);await go(c,'sources');await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-form")');await pause(1200);assert.equal(await c.evaluate('!!document.querySelector("#audit-content")'),false);
    for(const role of ['astronaut','viewer','researcher','mission_control','flight_surgeon','system_admin']){
      await set(c,'#login-role',role);await c.click('#login-form button');await c.wait('!!document.querySelector(".app-shell")');
      if(role==='system_admin'){await c.wait('!!document.querySelector("#system-audit-content")');assert.equal(await c.evaluate('document.querySelectorAll(".crew-card").length'),0);}
      else{await c.wait('document.querySelectorAll(".crew-card").length==='+String(role==='astronaut'?1:6));if(role==='astronaut'){assert.equal(await c.evaluate('fetch("/v1/crew/CREW-01/telemetry").then(r=>r.status)'),403);assert.equal(await c.evaluate('document.querySelector(".crew-card").dataset.crew'),'CREW-03');}}
      if(['astronaut','viewer','researcher'].includes(role))assert.equal(await c.evaluate('fetch("/v1/crew/CREW-01/checkins").then(r=>r.status)'),403);
      if(role==='viewer'){await go(c,'sources');await c.wait(text('#n11-status')+'.startsWith("Permission denied")');await go(c,'crew');await c.wait(text('#n12-status')+'.startsWith("Permission denied")');}
      await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-form")');
    }
    await set(c,'#login-role','demo_admin');await c.click('#login-form button');await c.wait('document.querySelectorAll(".crew-card").length===6');c.app().store.db.prepare('UPDATE sessions SET expires_at=0').run();await c.send('Page.reload',{ignoreCache:true});await c.wait('!!document.querySelector("#login-form")');assert.equal(await c.evaluate('!!document.querySelector(".crew-card")'),false);
    await set(c,'#login-role','demo_admin');await c.click('#login-form button');await c.wait('document.querySelectorAll(".crew-card").length===6');
  });
  await c.check('N03 warm load, API latency and actual six-crew source-to-DOM diagnostics',async()=>{
    await c.viewport(1920,1080);await c.send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__ready=null;new MutationObserver(()=>{if(window.__ready===null&&document.querySelectorAll(".crew-card").length===6)window.__ready=performance.now()}).observe(document,{childList:true,subtree:true});window.__pendingRAF=new Set();const raf=requestAnimationFrame,cancel=cancelAnimationFrame;window.requestAnimationFrame=fn=>{const id=raf(t=>{window.__pendingRAF.delete(id);fn(t)});window.__pendingRAF.add(id);return id};window.cancelAnimationFrame=id=>{window.__pendingRAF.delete(id);cancel(id)}'});
    const warm=[];for(let i=0;i<3;i++){await c.send('Page.reload');await c.wait('Number.isFinite(window.__ready)');warm.push(await c.evaluate('window.__ready'));}
    const api=await c.evaluate('(async()=>{const a=[];for(let i=0;i<40;i++){const t=performance.now(),r=await fetch(i%2?"/v1/state":"/v1/health");await r.json();a.push({ms:performance.now()-t,status:r.status})}return a})()');
    await c.evaluate('window.__latencies=[];new MutationObserver(()=>{if(window.__sent!==null&&window.__sent!==undefined){window.__latencies.push(performance.now()-window.__sent);window.__sent=null}}).observe(document.querySelector("[data-live=clock]"),{childList:true,subtree:true,characterData:true})');
    const start=performance.now(),rows=c.app().store.db.prepare('SELECT count(*) n FROM telemetry_points').get().n;
    for(let i=0;i<20;i++){await c.evaluate('window.__sent=performance.now()');c.app().engine.tick(1);c.app().broadcast();await c.wait('window.__sent===null');}
    const dom=await c.evaluate('window.__latencies'),count=c.app().store.db.prepare('SELECT count(*) n FROM telemetry_points').get().n-rows;
    c.report.N03_timings={warm_shell_ms:warm,api_samples:api,api_p95_ms:p95(api.map(x=>x.ms)),source_to_clock_DOM_ms:dom,source_to_clock_DOM_p95_ms:p95(dom),workload:{ticks:20,source_step_seconds:1,crew:6,stored_scalar_observations:count,elapsed_ms:performance.now()-start,description:'Burst diagnostic with actual simulator observations, not a certified 60 scalar/s physical workload'}};
    assert.ok(warm.every(x=>x<3000));assert.ok(api.every(x=>x.status===200));assert.ok(p95(api.map(x=>x.ms))<200);assert.ok(p95(dom)<500);
  });
  await c.check('N03 graphics quality, motion preference, reference timing and scene cleanup',async()=>{
    c.report.N03_render_diagnostics=[];
    for(const [name,page,quality,motion]of [['Earth standard','overview',false,false],['Earth performance','overview',true,false],['Earth reduced','overview',true,true],['Schematic performance','crew',true,false]]){
      await go(c,page);if(page==='crew'){await c.click('[data-twin-view=schematic]');await c.settle();}
      await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:motion?'reduce':'no-preference'}]});if(await c.evaluate('document.querySelector("[data-action=graphics]").getAttribute("aria-pressed")')!==String(quality))await c.click('[data-action=graphics]');
      await c.evaluate(`(()=>{const canvas=document.querySelector('#main canvas'),g=canvas.getContext('webgl2');if(!g)throw Error('No WebGL2 diagnostics');const draw=g.drawArrays;window.__render={draws:0,intervals:[],start:performance.now(),last:null,running:true,restore:()=>g.drawArrays=draw};g.drawArrays=function(...args){window.__render.draws++;return draw.apply(this,args)};function frame(t){const p=window.__render;if(!p.running)return;if(p.last!==null)p.intervals.push(t-p.last);p.last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame)})()`);await pause(3000);
      const v=await c.evaluate('(()=>{const p=window.__render;p.running=false;p.restore();const duration=performance.now()-p.start;return {duration_ms:duration,draw_submissions:p.draws,draws_per_second:p.draws*1000/duration,rAF_intervals_ms:p.intervals,reduced_motion:document.body.classList.contains("reduce-motion"),performance_mode:document.body.classList.contains("performance-mode")}})()');
      assert.equal(v.reduced_motion,motion);assert.equal(v.performance_mode,quality);assert.ok(motion?v.draw_submissions<=10:v.draw_submissions>2);c.report.N03_render_diagnostics.push({name,...v,presented_FPS_verified:false});
    }
    await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await c.send('Performance.enable');const before=await c.send('Performance.getMetrics'),cpuBefore=await c.send('SystemInfo.getProcessInfo',{},null);for(let i=0;i<12;i++){await go(c,i%2?'overview':'comms');}await go(c,'comms');await pause(200);const after=await c.send('Performance.getMetrics'),cpuAfter=await c.send('SystemInfo.getProcessInfo',{},null);c.report.N03_navigation_memory={before:before.metrics,after:after.metrics,CPU_processes_before:cpuBefore.processInfo,CPU_processes_after:cpuAfter.processInfo,DOM_counters:await c.send('Memory.getDOMCounters'),observed_only:true,canvases_after_scene_unmount:await c.evaluate('document.querySelectorAll("#main canvas").length'),pending_animation_callbacks:await c.evaluate('window.__pendingRAF.size')};assert.equal(c.report.N03_navigation_memory.canvases_after_scene_unmount,0);assert.equal(c.report.N03_navigation_memory.pending_animation_callbacks,0);
  });
  await automaticChecks(c);
  await c.check('N03 browser reload recovers persisted source and unsupported graphics retain data',async()=>{
    await go(c,'waveforms');await c.wait(text('#wave-status')+'.startsWith("Loaded 1")');const hash=await c.evaluate(text('#wave-provenance'));await c.restart();await c.send('Page.reload');await c.wait('!!document.querySelector(".app-shell")');await go(c,'waveforms');await c.wait(text('#wave-status')+'.startsWith("Loaded 1")');assert.equal(await c.evaluate(text('#wave-provenance')),hash);
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:'const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==="webgl2"?null:get.call(this,t,...a)}'});await c.send('Page.reload');await c.wait('document.querySelectorAll(".crew-card").length===6');await c.wait('/fallback/i.test(document.querySelector("#scene-mode")?.textContent)');
    assert.equal(await c.evaluate('document.querySelectorAll(".crew-card").length'),6);c.report.N03_recovery={source_preserved:true,model_executions:0,sealed_workers:0};
  });
}

async function dataChecks(c){
  await set(c,'#login-role','demo_admin');await c.click('#login-form button');await c.wait('document.querySelectorAll(".crew-card").length===6');
  await c.check('N03 exact six-metric values for all six canonical crew and four environment values',async()=>{
    const keys=['heart_rate','hrv','spo2','respiratory_rate','sleep_duration','temperature'];c.report.N03_numeric_comparisons=[];
    for(const crew of c.app().engine.state.crew){await c.click('[data-crew="'+crew.id+'"]');await c.wait('!!document.querySelector("#history-chart svg")');const actual=await c.evaluate('[...document.querySelectorAll("#crew-metric-tiles .metric-tile p")].map(e=>e.firstChild.textContent)'),expected=keys.map(k=>crew.values[k].toFixed(['spo2','sleep_duration','temperature'].includes(k)?1:0));assert.deepEqual(actual,expected);c.report.N03_numeric_comparisons.push({crew:crew.id,keys,actual,expected,synthetic:true});}
    await go(c,'overview');const e=c.app().engine.snapshot().environment;for(const value of [e.co2_ppm.toFixed(0),e.temperature_c.toFixed(1),e.humidity_percent.toFixed(0),e.dose_rate_msv_h.toFixed(3)])assert.ok(await c.evaluate(text('#environment')+'.includes('+JSON.stringify(value)+')'));c.report.N03_environment={...e,compared_values:4};
  });
  await c.check('N03 real-browser suspended-page handlers cancel reads and recover without stale presentation',async()=>{
    const requests=[];const off=c.on('Network.requestWillBeSent',e=>{if(e.request.url.includes('/v1/'))requests.push(e.request.url);});
    try{c.delay('/v1/audit',1200);await go(c,'sources');await c.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}))');await pause(100);const count=requests.length;await pause(2500);assert.equal(requests.length,count);assert.equal(await c.evaluate('document.querySelectorAll("#main canvas").length'),0);await c.evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');await c.wait(text('#connection')+'.includes("Monitoring")');await go(c,'overview');assert.equal(await c.evaluate('document.querySelectorAll(".crew-card").length'),6);c.report.N03_suspension={requests_during_suspension:0,handler_recovery:true,actual_BFcache_eviction_restoration_verified:false,method:'PageTransitionEvent handler contract in actual Chrome; not proof of native BFcache selection'};}finally{off();}
  });
  await c.check('N03 real-browser error notice has a named region and recovers actual readiness',async()=>{
    await go(c,'waveforms');c.app().engine.monitor.failure();await c.wait(text('#service-notice')+'.includes("Unknown")');assert.equal(await c.evaluate('document.querySelector("#service-notice").getAttribute("role")'),'region');assert.equal(await c.evaluate('document.querySelector("#service-notice").getAttribute("aria-label")'),'Service availability');c.app().engine.tick(30);c.app().broadcast();await c.wait(text('#connection')+'.includes("Monitoring")');
  });
}
