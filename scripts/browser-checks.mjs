/* Additional real-browser acceptance. No production hooks or simulated DOM. */
import assert from 'node:assert/strict';
import { CREW } from '../packages/contracts.mjs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const text=s=>`document.querySelector(${JSON.stringify(s)}).textContent`;
async function field(c,selector,value,event='input'){
  await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}))})()`);
}
async function go(c,page){await c.click('[data-page="'+page+'"]');await c.wait('document.querySelector(".nav-button[aria-current=page]")?.dataset.page==='+JSON.stringify(page));}
const uniform=name=>`(()=>{const g=document.querySelector('#twin-scene canvas').getContext('webgl2');return g?g.getUniform(g.getParameter(g.CURRENT_PROGRAM),g.getUniformLocation(g.getParameter(g.CURRENT_PROGRAM),${JSON.stringify(name)})):null})()`;

export async function workspaceChecks(c){
  await c.check('exact six crew identities, metric values and source labels',async()=>{
    await go(c,'overview');c.report.crew_verification=[];
    for(const crew of CREW){
      await c.click('[data-crew="'+crew.id+'"]');await c.wait(text('#main h1')+'==='+JSON.stringify(crew.name));await c.wait('!!document.querySelector("#history-chart svg")');
      await c.wait('document.querySelector("#crew-metric-tiles .metric-tile p")?.firstChild.textContent!=="—"');
      const observed=await c.evaluate('[...document.querySelectorAll("#crew-metric-tiles .metric-tile p")].map(e=>e.firstChild.textContent)');
      const record=c.app().engine.state.crew.find(v=>v.id===crew.id),keys=['heart_rate','hrv','spo2','respiratory_rate','sleep_duration','temperature'];
      assert.deepEqual(observed,keys.map(k=>record.values[k].toFixed(['spo2','sleep_duration','temperature'].includes(k)?1:0)));
      assert.ok((await c.evaluate(text('#crew-metric-tiles'))).includes('simulator'));
      c.report.crew_verification.push({id:crew.id,name:crew.name,metrics:keys,matched_backend:true,synthetic:true});await c.shot('profile-'+crew.id+'.png');
    }
    await go(c,'overview');
    const env=c.app().engine.snapshot().environment;
    for(const value of [env.co2_ppm.toFixed(0),env.temperature_c.toFixed(1),env.humidity_percent.toFixed(0),env.dose_rate_msv_h.toFixed(3)])assert.ok((await c.evaluate(text('#environment'))).includes(value));
    assert.ok((await c.evaluate(text('#system-activity'))).includes('manual mode'));
  });
}

export async function functionalChecks(c){
  await c.check('research citations, abstention, pending response and unavailable recovery',async()=>{
    await go(c,'knowledge');await field(c,'#knowledge-query','Why monitor sleep and fatigue?');await c.click('#knowledge-form button');await c.wait('!!document.querySelector("#knowledge-result .citation")');
    c.delay('/v1/rag/query',1000);await field(c,'#knowledge-query','How does communication delay affect care?');await c.click('#knowledge-form button');
    assert.ok(await c.evaluate('/Searching|Loading/.test('+text('#knowledge-result')+')'),'A new pending query must not show the previous answer as current');
    await c.wait('!!document.querySelector("#knowledge-result .citation")');
    await field(c,'#knowledge-query','How many unicorns inhabit this spacecraft?');await c.click('#knowledge-form button');await c.wait('/ABSTAIN/.test('+text('#knowledge-result')+')');
    c.fault('/v1/rag/query',503,'Injected unavailable corpus');await field(c,'#knowledge-query','sleep');await c.click('#knowledge-form button');await c.wait('/Knowledge unavailable/.test('+text('#knowledge-result')+')');
    assert.equal(await c.evaluate('document.querySelectorAll("#knowledge-result .citation").length'),0);assert.equal(await c.evaluate('document.querySelector("#knowledge-query").value'),'sleep');
    await c.shot('research-unavailable.png');
  });
  await c.check('scenario controls propagate exercise, missing and suspect quality without false Green',async()=>{
    await go(c,'scenario');await field(c,'#scenario-seed',42017);await c.click('[data-scenario="post-exercise"]');await c.wait(text('#active-scenario')+'==="post-exercise"');
    c.app().engine.tick(30);c.app().broadcast();await go(c,'overview');await c.wait('!document.querySelector("[data-crew=CREW-03]").classList.contains("gray")');
    assert.equal(await c.evaluate('document.querySelector("[data-crew=CREW-03]").classList.contains("red")'),false);
    for(const scenario of ['sensor-dropout','contradictory-sensors']){
      await go(c,'scenario');await c.click('[data-scenario="'+scenario+'"]');await c.wait(text('#active-scenario')+'==='+JSON.stringify(scenario));c.app().engine.tick(30);c.app().broadcast();
      await go(c,'overview');await c.wait('document.querySelector("[data-crew=CREW-03]").classList.contains("gray")');
      assert.ok((await c.evaluate('document.querySelector("[data-crew=CREW-03]").textContent')).includes('—'));await c.shot(scenario+'.png');
    }
    await go(c,'scenario');await c.click('[data-stop-scenario]');await c.wait(text('#active-scenario')+'==="nominal"');assert.equal(c.app().engine.state.seed,42017);
    c.app().engine.tick(30);c.app().broadcast();await go(c,'overview');await c.wait('[...document.querySelectorAll(".crew-card")].every(n=>n.classList.contains("green"))');
  });
  await c.check('actual replay slider follows stored observation times and independent evidence panels fail honestly',async()=>{
    await go(c,'crew');await c.click('[data-action="replay"]');await c.wait('!document.querySelector("#replay-range").disabled');
    const last=await c.evaluate(text('#replay-time'));await field(c,'#replay-range',0);assert.notEqual(await c.evaluate(text('#replay-time')),last);assert.ok(await c.evaluate('!!document.querySelector("#replay-chart svg")'));
    c.fault('/v1/models',503,'Injected model metadata failure');c.fault('/v1/audit',403,'Injected audit denial');await go(c,'sources');
    await c.wait('/Models unavailable/.test('+text('#model-cards')+')&&/Audit unavailable/.test('+text('#audit-content')+')');
    assert.equal(await c.evaluate('document.querySelectorAll("#source-grid .source-card").length'),10);assert.ok(await c.evaluate('!!document.querySelector("#dataset-catalogue table")'));await c.shot('independent-provenance-failures.png');
    await go(c,'overview');
  });
}

export async function durableChecks(c){
  await c.check('disk restart preserves human acknowledgement and queued report; delayed Earth receipt remains separate',async()=>{
    const before=c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case');assert.equal(before.length,1);assert.equal(before[0].received_at,null);
    const id=before[0].id,clock=c.app().engine.state.now;
    await c.restart(false,true);await c.wait(text('#connection')+'.includes("Monitoring")');assert.equal(c.app().engine.state.now,clock);
    const resumed=c.app().store.record('comms_messages',id);assert.equal(resumed.id,id);assert.equal(c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case').length,1);
    await go(c,'comms');await c.wait(text('#comms-state')+'==="BLACKOUT"');await c.click('[data-action="blackout"]');await c.wait(text('#comms-state')+'==="LINK AVAILABLE"');
    c.app().engine.tick(30);c.app().broadcast();assert.equal(c.app().store.record('comms_messages',id).received_at,null);
    for(let i=0;i<100&&!c.app().store.record('comms_messages',id).received_at;i++){c.app().engine.tick(30);c.app().broadcast();await pause(20);}
    const delivered=c.app().store.record('comms_messages',id);assert.ok(delivered.received_at>=delivered.deliver_at);assert.ok(delivered.received_at>delivered.observed_at);
    for(let i=0;i<5;i++){c.app().engine.tick(30);c.app().broadcast();await pause(20);}
    await go(c,'overview');await c.click('[data-view="earth"]');
    await c.wait(text('#live-notice')+'.includes("received")');
    const ground=c.app().engine.snapshot().ground;assert.ok(ground);assert.equal(await c.evaluate(text('[data-live=alert-count]')),String(ground.alerts.filter(r=>r.status==='open').length||''));
    await go(c,'agent');assert.equal(await c.evaluate('document.querySelectorAll("#cases-content .case-card").length'),0);
    c.report.delivery={message_id:id,observed_at:delivered.observed_at,deliver_at:delivered.deliver_at,received_at:delivered.received_at,survived_disk_restart:true};await c.shot('earth-received-after-restart.png');
    await c.click('[data-view="spacecraft"]');await go(c,'overview');
  });
}

export async function interactionChecks(c){
  await c.check('native twin rotation, layer selection and chart controls',async()=>{
    await go(c,'crew');await c.wait(text('#scene-mode')+'==="WEBGL2"');await pause(200);
    const before=await c.evaluate(uniform('rotation'));await field(c,'#twin-rotation',60);await pause(120);assert.notEqual(await c.evaluate(uniform('rotation')),before);
    const point=await c.evaluate('(()=>{const e=document.querySelector("#twin-scene canvas");e.scrollIntoView({block:"center",behavior:"instant"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+100}})()');
    const dragBefore=await c.evaluate(uniform('rotation'));
    await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:point.x+40,y:point.y});
    await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:point.x+40,y:point.y});await pause(150);
    assert.ok(await c.evaluate(uniform('rotation'))>dragBefore+.2);
    await c.evaluate('document.querySelector("#twin-scene canvas").focus()');await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await pause(120);
    assert.ok(await c.evaluate(uniform('rotation'))>1.1);
    await c.click('[data-layer="2"]');await pause(120);assert.equal(await c.evaluate(uniform('layer')),2);
    assert.equal(await c.evaluate(`document.querySelector('[data-layer="2"]').getAttribute('aria-pressed')`),'true');
    await field(c,'#chart-metric','sleep_duration','change');await c.wait('document.querySelector("#history-chart svg")?.getAttribute("aria-label").includes("sleep_duration")');await c.shot('twin-controls.png');
  });
  await c.check('streamed updates preserve native focused control and dirty communications input',async()=>{
    await go(c,'overview');await c.evaluate('window.__n03Focus=document.querySelector("[data-crew=CREW-01]");window.__n03Focus.focus()');c.app().engine.tick(30);c.app().broadcast();await pause(200);
    assert.ok(await c.evaluate('document.activeElement===window.__n03Focus&&window.__n03Focus.isConnected'));
    await go(c,'comms');await field(c,'[name="delay"]',7.5);await c.evaluate('window.__n03Focus=document.querySelector("[name=delay]");window.__n03Focus.focus()');
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9});
    c.app().engine.tick(30);c.app().broadcast();await pause(200);assert.ok(await c.evaluate('document.activeElement===window.__n03Focus&&window.__n03Focus.value==="7.5"'));
    assert.ok(await c.evaluate('document.activeElement.matches(":focus-visible")&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'));await c.shot('focused-dirty-form.png');
    await c.evaluate('delete window.__n03Focus');
  });
  await c.check('five browser-timed voluntary trials and save preserve synthetic telemetry',async()=>{
    await go(c,'agent');await c.click('#main [data-action="cognitive"]');await c.click('#reaction-target');await c.click('#reaction-target');await c.wait('/Too early/.test('+text('#reaction-target')+')');
    assert.equal(await c.evaluate('document.querySelectorAll("#reaction-trials span").length'),0);
    const sensor=JSON.stringify(c.app().engine.state.crew);
for(let i=0;i<5;i++){c.app().broadcast();await pause(100);await c.click('#reaction-target');await c.wait('document.querySelector("#reaction-target").classList.contains("ready")');c.app().broadcast();await pause(160);await c.click('#reaction-target');assert.equal(await c.evaluate('document.querySelectorAll("#reaction-trials span").length'),i+1);}
    await field(c,'#fatigue-input',6);await c.click('#save-checkin');await c.wait('!!document.querySelector("#checkin-history .queue-message")');assert.equal(JSON.stringify(c.app().engine.state.crew),sensor);
    assert.ok(await c.evaluate('!JSON.stringify(JSON.parse(localStorage.getItem("astra-synthetic-snapshot"))).includes("reaction_ms")'));await c.shot('checkin-saved.png');
  });
  await c.check('browser accessibility tree names and representative opaque text contrast',async()=>{
    await go(c,'overview');await c.settle();await c.send('Accessibility.enable');const tree=await c.send('Accessibility.getFullAXTree');
    const unnamed=tree.nodes.filter(n=>!n.ignored&&['button','link','combobox'].includes(n.role?.value)&&!n.name?.value?.trim());assert.deepEqual(unnamed,[]);
    c.report.accessibility={named_controls:tree.nodes.filter(n=>!n.ignored&&['button','link','combobox'].includes(n.role?.value)).length,formal_wcag_conformance:false};
    const samples=await c.evaluate(`(()=>{const rgb=s=>{const a=s.match(/[\\d.]+/g)?.map(Number);return a?{rgb:a.slice(0,3),a:a[3]??1}:null};const luminance=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);return ['#main h1','#connection','.status.green','.button.primary'].flatMap(selector=>{const e=document.querySelector(selector);if(!e)return[];let bg=[5,5,8],gradient=false;const ancestors=[];for(let p=e;p;p=p.parentElement)ancestors.unshift(p);for(const p of ancestors){const s=getComputedStyle(p);gradient||=s.backgroundImage!=='none';const col=rgb(s.backgroundColor);if(col)bg=col.rgb.map((v,i)=>v*col.a+bg[i]*(1-col.a))}const fg=rgb(getComputedStyle(e).color),a=luminance(fg.rgb),b=luminance(bg);return[{selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),gradient_ancestor:gradient}]})})()`);
    c.report.accessibility.contrast_samples=samples;for(const sample of samples.filter(s=>!s.gradient_ancestor))assert.ok(sample.ratio>=4.5,JSON.stringify(sample));
  });
  await c.check('actual browser graphics submission, frame timing, memory and cleanup sample',async()=>{
    await go(c,'crew');await c.wait(text('#scene-mode')+'==="WEBGL2"');await c.send('Performance.enable');const before=await c.send('Performance.getMetrics');
await c.evaluate(`(()=>{const g=document.querySelector('#twin-scene canvas').getContext('webgl2'),ext=g.getExtension('WEBGL_debug_renderer_info'),draw=g.drawArrays;window.__n03Perf={start:performance.now(),draws:0,frames:[],last:0,running:true,renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)};g.drawArrays=function(...a){window.__n03Perf.draws++;return draw.apply(this,a)};window.__n03Perf.restore=()=>{g.drawArrays=draw};function frame(t){const p=window.__n03Perf;if(!p?.running)return;if(p.last)p.frames.push(t-p.last);p.last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame)})()`);
    await pause(30000);
    const sample=await c.evaluate(`(()=>{const p=window.__n03Perf;p.running=false;p.restore();const ms=performance.now()-p.start,result={duration_ms:ms,draw_submissions:p.draws,draw_submissions_per_second:p.draws*1000/ms,raf_intervals_ms:p.frames,renderer:p.renderer};delete window.__n03Perf;return result})()`);
const after=await c.send('Performance.getMetrics');sample.before_metrics=before.metrics;sample.after_metrics=after.metrics;sample.caveat='Headless graphics submissions and rAF timing; actual renderer is recorded. Not physical display FPS or full designated-machine acceptance.';c.report.rendering_performance=sample;
    assert.ok(sample.draw_submissions>0);await c.shot('webgl-performance-sample.png');
    await c.evaluate('document.querySelector("#twin-scene canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()');await c.wait('/fallback/i.test('+text('#scene-mode')+')');assert.ok(await c.evaluate('!!document.querySelector("#crew-metric-tiles")'));await c.shot('actual-context-loss-fallback.png');
    for(let i=0;i<4;i++){await go(c,i%2?'crew':'overview');assert.equal(await c.evaluate('document.querySelectorAll("#main canvas").length'),1);}
    await c.send('HeapProfiler.collectGarbage');c.report.rendering_performance.after_navigation_metrics=(await c.send('Performance.getMetrics')).metrics;
  });
}

export async function automaticChecks(c){
  await c.check('automatic monitoring produces actual timed SSE updates after process-equivalent restart',async()=>{
    await c.restart(true,false);await go(c,'overview');await c.wait(text('#connection')+'.includes("operational")');
    const before=await c.evaluate(text('[data-live=clock]'));await c.wait(text('[data-live=clock]')+'!=='+JSON.stringify(before));
    assert.equal(c.app().engine.monitor.failures,0);await c.shot('automatic-monitoring-live.png');
  });
}
