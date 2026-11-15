/* N04 actual Chromium scene and performance checks; reuse isolated browser/server harness. */
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { cpus,totalmem,platform,release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { frameEvidence,metricPresentationEvidence } from './frame-evidence.mjs';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))];
const task=process.argv.find(s=>s.startsWith('--task='))?.slice(7)??'scene';
function missionStep(c){const value=Number(process.argv.find(s=>s.startsWith('--mission-step='))?.slice(15)??c.app().engine.speed);assert.ok(Number.isFinite(value)&&value>0&&value<=3600,'Invalid benchmark mission step');return value;}
export const METRIC_PROBE=`if(!window.__n04ProbeInstalled){window.__n04ProbeInstalled=true;window.__n04MetricSamples=[];window.__n04Packets={};window.__n04Seen={};window.__n04PacketCount=0;const NativeSource=EventSource;window.EventSource=class extends NativeSource{constructor(...args){super(...args);this.addEventListener('snapshot',event=>{const s=JSON.parse(event.data);window.__n04PacketCount++;for(const c of s.crew??[]){const e=c.metric_observations?.heart_rate;if(e?.ingestion?.host_received_at&&e.integrity==='verified')window.__n04Packets[c.id]={crew_id:c.id,metric:'heart_rate',event_id:e.event_id,received_host_ms:Date.parse(e.ingestion.host_received_at),expected:c.values.heart_rate.toFixed(0),stamp:new Date(e.ts).toLocaleTimeString('en-GB',{hour12:false,timeZone:'UTC'})}}})}};new MutationObserver(()=>{for(const p of Object.values(window.__n04Packets)){const card=document.querySelector('[data-crew="'+p.crew_id+'"]'),value=card?.querySelector('.crew-hr span')?.textContent,stamp=card?.querySelector('.crew-source')?.textContent;if(value===p.expected&&stamp?.includes(p.stamp)&&window.__n04Seen[p.crew_id]!==p.event_id&&window.__n04MetricSamples.length<600){window.__n04Seen[p.crew_id]=p.event_id;const id=window.__n04MetricSamples.length;performance.mark('n04-metric-dom-'+id);window.__n04MetricSamples.push({id,crew_id:p.crew_id,metric:p.metric,event_id:p.event_id,value,dom_delay_ms:Date.now()-p.received_host_ms,received_host_ms:p.received_host_ms})}}}).observe(document,{subtree:true,childList:true,characterData:true})}`;
async function enter(c){await c.evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');await c.wait('document.querySelectorAll(".crew-card").length===6');}
async function trace(c,name,duration){
  await c.send('Tracing.start',{traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:262144,includedCategories:['disabled-by-default-devtools.timeline.frame','blink.user_timing'],excludedCategories:['*']},transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'gzip'});
  const visibility=[],hostTicks=[];
  await c.evaluate(`performance.mark(${JSON.stringify(name+'-start')})`);
  const scheduleStart=performance.now();
  for(let i=0;i<duration;i++){
    await pause(Math.max(0,scheduleStart+(i+1)*1000-performance.now()));
    const begin=performance.now(),step=missionStep(c);c.app().engine.tick(step);const afterTick=performance.now();c.app().broadcast();
    hostTicks.push({second:i,scheduled_ms:(i+1)*1000,started_ms:begin-scheduleStart,mission_seconds:step,tick_ms:afterTick-begin,broadcast_ms:performance.now()-afterTick});
    visibility.push(await c.evaluate(`(()=>{const e=document.querySelector('#earth-scene canvas,#login-earth canvas'),r=e?.getBoundingClientRect();return{second:${i},state:document.visibilityState,scene_id:e?.parentElement?.id??null,scroll_y:scrollY,canvas_rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,draws:window.__n04?.draws??null}})()`));if((i+1)%20===0)console.log(name+': '+(i+1)+'/'+duration+'s');
  }
  await c.evaluate(`performance.mark(${JSON.stringify(name+'-end')})`);
  await pause(250); // retain presentation feedback for work submitted at the interval boundary
  const done=new Promise(resolve=>{const off=c.on('Tracing.tracingComplete',p=>{off();resolve(p);});});await c.send('Tracing.end');
  const result=await done,chunks=[];let data;
  do{data=await c.send('IO.read',{handle:result.stream,size:1048576});chunks.push(Buffer.from(data.data,data.base64Encoded?'base64':'utf8'));}while(!data.eof);
  await c.send('IO.close',{handle:result.stream});const bytes=Buffer.concat(chunks);writeFileSync(join(c.directory,name+'.trace.json.gz'),bytes);
  const raw=JSON.parse(gunzipSync(bytes)),counts={};for(const e of raw.traceEvents??[])counts[e.name]=(counts[e.name]??0)+1;
  const metricSamples=await c.evaluate('window.__n04MetricSamples??[]');
  return {file:name+'.trace.json.gz',bytes:bytes.length,counts,visibility,host_ticks:hostTicks,workload_schedule:'Host-clock deadlines every1000ms; raw start lateness and tick/broadcast costs retained. A late callback cannot be counted as an on-time tick.',frame_evidence:frameEvidence(raw.traceEvents??[],name+'-start',duration),...(metricSamples.length?{metric_presentation:metricPresentationEvidence(raw.traceEvents??[],metricSamples)}:{}),data_loss:result.dataLossOccurred??null};
}
export async function n04Checks(c){
  c.report.scope='N04 actual-browser '+task;c.report.headed=process.argv.includes('--headed');
  c.report.measurement_source_hashes=Object.fromEntries(['browser-n04.mjs','browser-acceptance.mjs','frame-evidence.mjs'].map(file=>[file,createHash('sha256').update(readFileSync(new URL('./'+file,import.meta.url))).digest('hex')]));
  c.report.runtime_source_hashes=Object.fromEntries(['app.mjs','styles.css','mission.css','index.html','scenes.mjs','earth.mjs','ui.mjs','sw.js','assets/earth/manifest.json'].map(file=>[file,createHash('sha256').update(readFileSync(new URL('../apps/mission-control-web/'+file,import.meta.url))).digest('hex')]));
  await c.viewport(1920,1080);await c.wait('document.querySelector("#login-earth")?.dataset.assets==="ready"');
  if(task==='probe'){
    await c.check('headed presentation trace capability probe, not a performance gate',async()=>{
      await enter(c);await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
      c.report.trace_probe=await trace(c,'presentation-probe',4);await c.shot('headed-overview-probe.png');
      console.log(JSON.stringify({interesting_counts:Object.fromEntries(Object.entries(c.report.trace_probe.counts).filter(([n])=>/PipelineReporter|FrameDisplayed|FramePresented|Presentation|SwapBuffers/.test(n))),frame_evidence:c.report.trace_probe.frame_evidence}));
    });return;
  }
  if(task==='refinement'){
    c.report.refinement_layout=[];
    const layout=()=>c.evaluate(`(()=>{const nodes=[...document.querySelectorAll('.crew-card')];return{scroll_y:scrollY,overflow:document.documentElement.scrollWidth>innerWidth+1,node_count:document.querySelectorAll('*').length,canvas_count:document.querySelectorAll('canvas').length,cards:nodes.map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.crew,name:e.querySelector('.crew-name').textContent,hr:e.querySelector('.crew-hr span').textContent,spo2:e.querySelector('.crew-mini-metrics>div:first-child p').textContent,sleep:e.querySelector('.crew-mini-metrics>div:last-child p').textContent,quality:e.querySelector('.crew-quality')?.textContent??null,source:e.querySelector('.crew-source').textContent,visible:r.top>=0&&r.bottom<=innerHeight,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})}})()`);
    await c.check('refinement Landing at four sizes with existing entry and local imagery',async()=>{
      for(const [w,h]of [[1920,1080],[1366,768],[768,1024],[390,844]]){
        await c.viewport(w,h);await c.wait('document.querySelector("#login-earth")?.dataset.assets==="ready"');
        assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await c.shot('landing-'+w+'x'+h+'.png');
      }
    });
    await c.viewport(1920,1080);await enter(c);
    await c.check('refinement crew values,comparison geometry and full rendered Overview',async()=>{
      for(const [w,h]of [[1920,1080],[1366,768],[768,1024],[390,844]]){
        await c.viewport(w,h);await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');await c.settle();
        const l=await layout();assert.equal(l.overflow,false);assert.equal(l.cards.length,6);
        for(const card of l.cards){const crew=c.app().engine.state.crew.find(x=>x.id===card.id);assert.equal(card.hr,crew.values.heart_rate.toFixed(0));assert.equal(card.spo2,crew.values.spo2.toFixed(1)+'%');assert.equal(card.sleep,crew.values.sleep_duration.toFixed(1)+'h');assert.ok(card.source.includes('simulator'));}
        c.report.refinement_layout.push({width:w,height:h,...l});await c.shot('overview-'+w+'x'+h+'.png');
      }
      await c.viewport(1920,1080);await c.evaluate('document.querySelector("#crew-grid").scrollIntoView({block:"center",behavior:"instant"})');
      const fullCrew=await layout();assert.ok(fullCrew.cards.every(x=>x.visible));c.report.full_crew_visibility={...fullCrew,note:'All six inside1920x1080 after scrolling to crew comparison;not a claim that orbit and six cards fit initially.'};await c.shot('six-crew-visible.png');
      await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');await c.settle();
      const metrics=await c.send('Page.getLayoutMetrics'),height=Math.ceil(metrics.cssContentSize.height),shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1920,height,scale:1}});
      writeFileSync(join(c.directory,'overview-full-page.png'),Buffer.from(shot.data,'base64'));c.report.screenshots.push('overview-full-page.png');
    });
    await c.check('refinement reception state is visibly separate and never substitutes onboard metrics',async()=>{
      await c.click('[data-view="earth"]');assert.equal(await c.evaluate('document.querySelectorAll(".crew-card.gray").length'),6);
      assert.ok(await c.evaluate('document.querySelector("#reception-timeline").textContent.includes("Awaiting packet")'));await c.shot('earth-before-receipt.png');
      c.app().engine.comms.control({blackout:true},c.app().engine.state.now);c.app().broadcast();await c.wait('/Blackout/.test(document.querySelector("#earth-link-text").textContent)');await c.shot('earth-blackout.png');
    });return;
  }
  if(task==='review'){
    await enter(c);await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
    await c.check('rendered review includes all six crew and full Overview without changing data',async()=>{
      await c.evaluate('document.querySelector("#crew-grid").scrollIntoView({block:"center",behavior:"instant"})');
      const cards=await c.evaluate(`[...document.querySelectorAll('.crew-card')].map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.crew,within:r.top>=0&&r.bottom<=innerHeight,name:e.querySelector('.crew-name')?.textContent}})`);
      assert.equal(cards.length,6);assert.equal(new Set(cards.map(c=>c.id)).size,6);assert.ok(cards.every(c=>c.within));c.report.crew_review=cards;await c.shot('six-crew-visible.png');
      await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');await c.settle();
      const layout=await c.send('Page.getLayoutMetrics'),height=Math.ceil(layout.cssContentSize.height),shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1920,height,scale:1}});
      writeFileSync(join(c.directory,'overview-full-page.png'),Buffer.from(shot.data,'base64'));c.report.screenshots.push('overview-full-page.png');c.report.full_page_capture={width:1920,height,kind:'Beyond-viewport rendered page;not a1920x1080 visibility certification'};
    });return;
  }
  if(task==='scene'){
    await c.check('Earth local imagery, independent quality/motion and bounded accessible camera controls',async()=>{
      await c.click('.landing-scene-tools summary');await c.click('[data-action="motion"]');
      const uniform=name=>`(()=>{const g=document.querySelector('#login-earth canvas').getContext('webgl2');return g.getUniform(g.getParameter(g.CURRENT_PROGRAM),g.getUniformLocation(g.getParameter(g.CURRENT_PROGRAM),${JSON.stringify(name)}))})()`;
      await c.click('[data-camera="in"]');await pause(100);assert.ok(await c.evaluate(uniform('zoom'))>1);
      await c.click('[data-camera="reset"]');await pause(100);assert.equal(await c.evaluate(uniform('zoom')),1);
      await c.click('[data-action="graphics"]');assert.equal(await c.evaluate('document.body.classList.contains("reduce-motion")'),true);
      await c.click('[data-action="motion"]');assert.equal(await c.evaluate('document.body.classList.contains("reduce-motion")'),false);
      await pause(100);assert.equal(await c.evaluate(uniform('quality')),1);
      const first=await c.evaluate(uniform('elapsed'));await pause(150);assert.ok(await c.evaluate(uniform('elapsed'))>first);
      await c.shot('landing-active-performance.png');await c.click('[data-action="graphics"]');await c.wait('document.querySelector("#login-earth")?.dataset.assets==="ready"');
    });
    await c.check('all four rendered Landing compositions after responsive repairs',async()=>{
      c.report.scene_viewports=[];
      for(const [width,height]of [[1920,1080],[1366,768],[768,1024],[390,844]]){console.log('Scene viewport '+width+'x'+height);await c.viewport(width,height);await c.evaluate('document.querySelector(".landing-scene-tools").open=false');await c.wait('document.querySelector("#login-earth")?.dataset.assets==="ready"');assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));c.report.scene_viewports.push({width,height});await c.shot('landing-'+width+'x'+height+'.png');}
    });
    await c.viewport(1920,1080);await enter(c);
    await c.check('received-link storytelling never discloses onboard events and blackout remains truthful',async()=>{
      await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');await c.shot('overview-standard.png');
      await c.click('[data-view="earth"]');assert.ok(await c.evaluate('document.querySelector("#reception-timeline").textContent.includes("Awaiting packet")'));
      assert.equal(await c.evaluate('document.querySelectorAll(".crew-card.gray").length'),6);
      c.app().engine.comms.control({blackout:true},c.app().engine.state.now);c.app().broadcast();await c.wait('/Blackout/.test(document.querySelector("#earth-link-text").textContent)');await c.shot('earth-gray-blackout.png');
      await c.click('[data-view="spacecraft"]');
    });
    await c.check('missing local texture reports imagery failure while monitoring remains usable',async()=>{
      await c.send('Network.setBypassServiceWorker',{bypass:true});await c.send('Network.setCacheDisabled',{cacheDisabled:true});await c.send('Network.setBlockedURLs',{urls:['*/assets/earth/day-*.jpg']});await c.send('Page.reload');
      await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="unavailable"');assert.equal(await c.evaluate('document.querySelectorAll(".crew-card").length'),6);assert.ok(await c.evaluate('/imagery unavailable/.test(document.querySelector("#earth-assets").textContent)'));await c.shot('texture-failure-monitoring.png');
      await c.send('Network.setBlockedURLs',{urls:[]});await c.send('Page.reload');await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
    });
    await c.check('shell cache versions the new local modules and imagery is never needed for core API readiness',async()=>{
      const r=await c.evaluate(`(async()=>{await navigator.serviceWorker.ready;const keys=await caches.keys(),cache=await caches.open('astra-shell-v4-n04-refinement');return{keys,mission:!!await cache.match('/mission.css'),earth:!!await cache.match('/earth.mjs'),health:(await fetch('/v1/health')).status}})()`);
      assert.equal(r.mission,true);assert.equal(r.earth,true);assert.equal(r.health,200);c.report.shell_cache=r;
    });return;
  }
  if(task==='load-latency'){
    await enter(c);await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
    c.report.load_latency={warm_shell:[],api:[],scope:'Warm local shell and rendered capture completion; actual loopback API with six-crew tick/broadcast load. Metric presentation is measured separately; no cold-start or physical scanout certificate.'};
    await c.check('three warm usable rendered reloads and forty actual API requests under six-crew load',async()=>{
      await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__n04ReadyMs=null;new MutationObserver(()=>{if(window.__n04ReadyMs===null&&document.querySelectorAll('.crew-card').length===6&&document.querySelector('[data-page="crew"]'))window.__n04ReadyMs=performance.now()}).observe(document,{childList:true,subtree:true})`});
      const timer=setInterval(()=>{c.app().engine.tick(1);c.app().broadcast();},1000);
      try{
        for(let i=0;i<3;i++){
          const start=performance.now();await c.send('Page.reload');await c.wait('window.__n04ReadyMs!==null&&window.__n04ReadyMs!==undefined');
          const dom=await c.evaluate('window.__n04ReadyMs'),shot=await c.send('Page.captureScreenshot',{format:'png'}),name='warm-shell-'+i+'.png';
          writeFileSync(join(c.directory,name),Buffer.from(shot.data,'base64'));c.report.screenshots.push(name);c.report.load_latency.warm_shell.push({dom_ready_ms:dom,reload_to_capture_complete_ms:performance.now()-start});
        }
        c.report.load_latency.api=await c.evaluate(`(async()=>{const samples=[];for(let i=0;i<40;i++){const start=performance.now(),r=await fetch(i%2?'/v1/health':'/v1/state');await r.json();samples.push({status:r.status,ms:performance.now()-start})}return samples})()`);
      }finally{clearInterval(timer);}
      c.report.load_latency.api_p95_ms=percentile(c.report.load_latency.api.map(s=>s.ms),.95);
      assert.ok(c.report.load_latency.warm_shell.every(s=>s.reload_to_capture_complete_ms<=3000));assert.ok(c.report.load_latency.api.every(s=>s.status===200));assert.ok(c.report.load_latency.api_p95_ms<200);
    });return;
  }
  if(task==='latency'){
    await enter(c);await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
    c.report.latency={warm_shell:[],api:[],metric_captures:[],scope:'Actual HTTP/SSE and painted screenshot-capture completion upper bounds; no physical panel timing or other machine certification'};
    await c.check('warm usable crew shell and actual rendered capture after three local reloads',async()=>{
      await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__n04ReadyMs=null;new MutationObserver(()=>{if(window.__n04ReadyMs===null&&document.querySelectorAll('.crew-card').length===6&&document.querySelector('[data-page="crew"]'))window.__n04ReadyMs=performance.now()}).observe(document,{childList:true,subtree:true})`});
      for(let i=0;i<3;i++){const start=performance.now();await c.send('Page.reload');await c.wait('window.__n04ReadyMs!==null&&window.__n04ReadyMs!==undefined');const dom=await c.evaluate('window.__n04ReadyMs');const shot=await c.send('Page.captureScreenshot',{format:'png'});writeFileSync(join(c.directory,'warm-shell-'+i+'.png'),Buffer.from(shot.data,'base64'));c.report.screenshots.push('warm-shell-'+i+'.png');c.report.latency.warm_shell.push({dom_ready_ms:dom,reload_to_capture_complete_ms:performance.now()-start});}
      assert.ok(c.report.latency.warm_shell.every(s=>s.reload_to_capture_complete_ms<=3000));
    });
    await c.check('simple actual API p95 and twenty verified metric-to-rendered-capture samples under six-crew load',async()=>{
      const timer=setInterval(()=>{c.app().engine.tick(1);c.app().broadcast();},1000);
      try{
        c.report.latency.api=await c.evaluate(`(async()=>{const samples=[];for(let i=0;i<40;i++){const start=performance.now(),r=await fetch(i%2?'/v1/health':'/v1/state');await r.json();samples.push({status:r.status,ms:performance.now()-start})}return samples})()`);
        await c.evaluate(`window.__n04MetricBefore=null;window.__n04MetricDomMs=null;new MutationObserver(()=>{const value=document.querySelector('[data-crew="CREW-01"] .crew-hr span')?.textContent;if(window.__n04MetricBefore!==null&&value!==window.__n04MetricBefore){window.__n04MetricDomMs=performance.now()-window.__n04MetricAt;window.__n04MetricBefore=null}}).observe(document.querySelector('#crew-grid'),{subtree:true,childList:true,characterData:true});window.scrollTo({top:0,behavior:'instant'})`);
        for(let attempt=0;c.report.latency.metric_captures.length<20&&attempt<80;attempt++){
          const before=await c.evaluate(`(()=>{const e=document.querySelector('[data-crew="CREW-01"] .crew-hr span');window.__n04MetricBefore=e.textContent;window.__n04MetricDomMs=null;window.__n04MetricAt=performance.now();return e.textContent})()`);
          const start=performance.now();c.app().engine.tick(30);c.app().broadcast();const expected=c.app().engine.state.crew[0].values.heart_rate.toFixed(0);if(expected===before)continue;
          await c.wait(`document.querySelector('[data-crew="CREW-01"] .crew-hr span')?.textContent===${JSON.stringify(expected)}`);
          const observed=await c.evaluate(`(()=>{const e=document.querySelector('[data-crew="CREW-01"] .crew-hr span'),r=e.getBoundingClientRect();return{value:e.textContent,dom_ms:window.__n04MetricDomMs,clip:{x:r.x,y:Math.max(0,r.y-5),width:r.width+35,height:r.height+10,scale:1},css_height:innerHeight}})()`);
          assert.equal(observed.value,expected);assert.ok(observed.clip.y+observed.clip.height<=observed.css_height,'Metric capture must be within viewport');
          const shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:observed.clip});const ms=performance.now()-start,index=c.report.latency.metric_captures.length;
          writeFileSync(join(c.directory,'metric-'+index+'.png'),Buffer.from(shot.data,'base64'));c.report.screenshots.push('metric-'+index+'.png');c.report.latency.metric_captures.push({crew_id:'CREW-01',metric:'heart_rate',expected,observed:observed.value,dom_upper_bound_ms:observed.dom_ms,ingest_to_capture_complete_ms:ms});
        }
      }finally{clearInterval(timer);}
      c.report.latency.api_p95_ms=percentile(c.report.latency.api.map(s=>s.ms),.95);c.report.latency.telemetry_capture_p95_ms=percentile(c.report.latency.metric_captures.map(s=>s.ingest_to_capture_complete_ms),.95);
      assert.ok(c.report.latency.api.every(s=>s.status===200));assert.ok(c.report.latency.api_p95_ms<200);assert.equal(c.report.latency.metric_captures.length,20);assert.ok(c.report.latency.telemetry_capture_p95_ms<500);
    });return;
  }
  if(task==='latency-trace'){
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__n04MetricSamples=[];window.__n04Packet=null;window.__n04LastValue=null;const NativeSource=EventSource;window.EventSource=class extends NativeSource{constructor(...args){super(...args);this.addEventListener('snapshot',event=>{const s=JSON.parse(event.data),c=s.crew?.find(c=>c.id==='CREW-01'),e=c?.metric_observations?.heart_rate;if(e?.ingestion?.host_received_at&&e.integrity==='verified')window.__n04Packet={event_id:e.event_id,received_host_ms:Date.parse(e.ingestion.host_received_at),expected:c.values.heart_rate.toFixed(0)}})}};new MutationObserver(()=>{const value=document.querySelector('[data-crew="CREW-01"] .crew-hr span')?.textContent,p=window.__n04Packet;if(p&&value===p.expected&&value!==window.__n04LastValue&&window.__n04MetricSamples.length<30){window.__n04LastValue=value;const id=window.__n04MetricSamples.length;performance.mark('n04-metric-dom-'+id);window.__n04MetricSamples.push({id,event_id:p.event_id,value,dom_delay_ms:Date.now()-p.received_host_ms,received_host_ms:p.received_host_ms})}}).observe(document,{subtree:true,childList:true,characterData:true})`});
    await c.send('Page.reload');await c.wait('!!document.querySelector("#login-form")');await enter(c);await c.wait('document.querySelector("#earth-scene")?.dataset.assets==="ready"');
    await c.check('sixty-second six-crew HTTP/SSE metric presentation trace with ingestion provenance',async()=>{
      await c.evaluate('window.__n04MetricSamples=[]');c.report.latency_trace=await trace(c,'metric-presentation',60);
      const result=c.report.latency_trace.metric_presentation;assert.ok(result?.supported);assert.ok(result.samples.length>=20);
      c.report.telemetry_presentation_p95_ms=percentile(result.samples.map(s=>s.end_to_end_feedback_ms),.95);assert.ok(c.report.telemetry_presentation_p95_ms<500);await c.shot('metric-presentation-overview.png');
    });return;
  }
  if(task==='performance'){
    const diagnostic=process.argv.includes('--short-diagnostic'),seconds=diagnostic?4:60,trials=diagnostic?1:3;
    await c.evaluate(METRIC_PROBE);
    c.report.hardware={platform:platform(),os_release:release(),cpu:cpus()[0]?.model,logical_cpus:cpus().length,total_ram_bytes:totalmem(),chrome_system:await c.send('SystemInfo.getInfo',{},null),display:await c.evaluate('({screen_width:screen.width,screen_height:screen.height,available_width:screen.availWidth,available_height:screen.availHeight,dpr:devicePixelRatio,visibility:document.visibilityState,css_width:innerWidth,css_height:innerHeight})'),host_placement:'Windows Node API/SQLite and Windows Chrome co-located on same laptop',thermal:'Not instrumented; no thermal certification'};
    try{c.report.hardware.window=await c.send('Browser.getWindowForTarget');}catch{c.report.hardware.window='Window bounds unavailable';}
    try{c.report.hardware.power_scheme=execFileSync('powercfg.exe',['/getactivescheme'],{encoding:'utf8'}).trim();}catch{c.report.hardware.power_scheme='Unavailable';}
    c.report.designated_minimum=false;c.report.measurement_protocol={diagnostic_only:diagnostic,trials,duration_seconds:seconds,viewport:[1920,1080],warmup_seconds:10,mission_seconds_per_tick:missionStep(c),load:'six crew, ten scalar metrics, tick/broadcast scheduled once per real second; mission step recorded separately; landing has no protected telemetry UI',certification:diagnostic?'Short/headless diagnostics cannot satisfy DE protocol or presentedFPS acceptance':'Named reference hardware only; trace capabilities must be interpreted before any presentedFPS claim'};
    await c.check('N04 warmed Earth profiles with live six-crew monitoring and raw frame evidence',async()=>{
      c.report.graphics_trials=[];
      for(const page of process.argv.includes('--overview-only')?['overview']:['landing','overview']){
        if(page==='landing'){
          await c.send('Network.clearBrowserCookies');await c.send('Page.reload');await c.wait('!!document.querySelector("#login-form")');await c.evaluate(METRIC_PROBE);
        }else await enter(c);
        for(const mode of ['standard','performance']){
          if(page==='landing')await c.evaluate('document.querySelector(".landing-scene-tools").open=true');
          if(mode==='performance')await c.click('[data-action="graphics"]');
          await c.wait(`document.querySelector(${JSON.stringify(page==='landing'?'#login-earth':'#earth-scene')})?.dataset.assets==="ready"`);
          for(let trial=1;trial<=trials;trial++){
            const name=page+'-'+mode+'-'+trial;
            await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');
            for(let warm=0;warm<10;warm++){await pause(1000);c.app().engine.tick(missionStep(c));c.app().broadcast();}
            assert.ok(await c.evaluate(`!!document.querySelector(${JSON.stringify(page==='landing'?'#login-earth canvas':'#earth-scene canvas')})`),'Benchmark page changed during warm-up; trial invalid, not an FPS failure');
            await c.evaluate('window.__n04MetricSamples=[]');
            const setup=await c.evaluate(`(()=>{const canvas=document.querySelector(${JSON.stringify(page==='landing'?'#login-earth canvas':'#earth-scene canvas')}),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),original=gl.drawArrays;window.__n04={start:performance.now(),draws:0,frames:[],last:0,running:true,buckets:{},renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),canvas:[canvas.width,canvas.height],dpr:devicePixelRatio,zoom:visualViewport.scale};gl.drawArrays=function(...args){const p=window.__n04;p.draws++;const second=Math.floor((performance.now()-p.start)/1000);p.buckets[second]=(p.buckets[second]??0)+1;return original.apply(this,args)};window.__n04.restore=()=>{gl.drawArrays=original};function frame(t){const p=window.__n04;if(!p.running)return;if(p.last)p.frames.push(t-p.last);p.last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame);return{renderer:window.__n04.renderer,canvas:window.__n04.canvas,dpr:devicePixelRatio,css_viewport:[innerWidth,innerHeight],reduced_motion:document.body.classList.contains('reduce-motion'),performance:document.body.classList.contains('performance-mode')}})()`);
            assert.equal(setup.reduced_motion,false);assert.equal(setup.performance,mode==='performance');
            const evidence=await trace(c,name,seconds);
            const diagnostic=await c.evaluate(`(()=>{const p=window.__n04;p.running=false;p.restore();const {restore,...value}=p;return{...value,duration_ms:performance.now()-p.start}})()`);
            const expectedScene=page==='landing'?'login-earth':'earth-scene',stable=await c.evaluate(`!!document.querySelector(${JSON.stringify('#'+expectedScene+' canvas')})`);
            const validWorkload=stable&&evidence.visibility.every(v=>v.state==='visible'&&v.scene_id===expectedScene);
            c.report.graphics_trials.push({page,mode,trial,...setup,valid_workload:validWorkload,draw_submissions:diagnostic.draws,draws_per_second:diagnostic.draws*1000/diagnostic.duration_ms,draw_buckets:diagnostic.buckets,raf_p95_ms:percentile(diagnostic.frames,.95),raf_intervals_ms:diagnostic.frames,duration_ms:diagnostic.duration_ms,trace:evidence});
            assert.ok(validWorkload,'Scene or visibility changed during trial; collected record is invalid, not FPS acceptance');
            console.log(name+' '+JSON.stringify({draws_per_second:c.report.graphics_trials.at(-1).draws_per_second}));
          }
          await c.shot(page+'-'+mode+'.png');if(mode==='performance')await c.click('[data-action="graphics"]');
        }
      }
    });return;
  }
  throw new Error('Unknown N04 task: '+task);
}
