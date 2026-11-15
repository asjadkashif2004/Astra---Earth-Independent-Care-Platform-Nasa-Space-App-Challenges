/* Bounded vertical-slice checks. Not the N04 acceptance matrix or AC-20. */
import assert from 'node:assert/strict';
import { cpus, totalmem, release } from 'node:os';
import { CREW } from '../packages/contracts.mjs';
import { readFileSync } from 'node:fs';

export async function n05Checks(c){
  if(process.argv.includes('--n05-a11y'))return anatomyAccessibility(c);
  const resume=process.argv.includes('--n05-resume');
  if(resume)c.report.reused_evidence='browser-final/report.json: six independently matched crew selections; not rerun in this continuation';
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const ready=()=>c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="ready"');
  const overflow=()=>c.evaluate('document.documentElement.scrollWidth<=innerWidth+1');
  const sceneShot=async name=>{await c.evaluate('document.querySelector("#twin-scene").scrollIntoView({block:"center",behavior:"instant"})');await c.shot(name);};
  await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const s=window.__n05gl={created:0,deleted:0,draws:0};for(const name of ['createBuffer','deleteBuffer','drawElements']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){if(name==='createBuffer')s.created++;if(name==='deleteBuffer')s.deleted++;if(name==='drawElements')s.draws++;return original.apply(this,args)}}})()`});
  await c.send('Page.reload',{ignoreCache:true});await c.wait('!!document.querySelector("#login-form")');
  await c.check('N05-01 preserved entry/Earth and real loaded reference geometry',async()=>{
    await c.shot('landing-preserved.png');
    await c.evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');
    await c.wait('document.querySelectorAll(".crew-card").length===6');await c.shot('overview-preserved.png');
    await c.click('[data-page="crew"]');await ready();
    assert.equal(await c.evaluate('document.querySelectorAll("#twin-scene canvas").length'),1);
    assert.match(await c.evaluate('document.querySelector(".twin-controls").textContent'),/Not a reconstruction/);
    c.report.reference_geometry=await c.evaluate('fetch("/assets/anatomy/manifest.json").then(r=>r.json()).then(m=>({release:m.source_release,bytes:m.payload_bytes,triangles:m.components.reduce((n,c)=>n+c.triangles,0),vertices:m.components.reduce((n,c)=>n+c.vertices,0),components:m.components.map(c=>c.id),decoded_geometry_bytes:m.decoded_geometry_bytes}))');
    c.report.hardware={cpu:cpus()[0]?.model,logical_cpus:cpus().length,ram_bytes:totalmem(),os_release:release(),browser_system:await c.send('SystemInfo.getInfo',{},null)};
    await c.shot('anatomy-full-body-1920x1080.png');
  });
  await c.check('N05-01 independent reference layers, pointer/camera and keyboard controls',async()=>{
    await c.click('[data-twin-view="schematic"]');await c.wait('!!document.querySelector("[data-layer]")');
    await c.click('[data-twin-view="anatomy"]');await ready();
    await c.click('[data-anatomy-layer="body"]');assert.equal(await c.evaluate('document.querySelector("[data-anatomy-layer=body]").getAttribute("aria-pressed")'),'false');
    await sceneShot('anatomy-skeleton-and-organs.png');
    await c.click('[data-anatomy-layer="skeleton"]');await c.click('[data-anatomy-camera="in"]');await c.click('[data-anatomy-camera="in"]');await c.click('[data-anatomy-camera="in"]');
    await sceneShot('anatomy-heart-lungs.png');
    await c.click('[data-anatomy-camera="left"]');await sceneShot('anatomy-organs-orbit.png');
    await c.evaluate('document.querySelector("[data-anatomy-layer=organs]").focus()');
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    assert.equal(await c.evaluate('document.querySelector("[data-anatomy-layer=organs]").getAttribute("aria-pressed")'),'false');
    assert.ok(await c.evaluate('document.activeElement.matches(":focus-visible")&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'));
    await c.click('[data-anatomy-layer="organs"]');await c.click('[data-anatomy-camera="reset"]');
    await c.evaluate('document.querySelector("#twin-scene canvas").focus()');await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    for(const l of ['body','skeleton'])await c.click('[data-anatomy-layer="'+l+'"]');
  });
  if(!resume)await c.check('N05-01 six crew retain separate telemetry and only one anatomy scene',async()=>{
    c.report.crew=[];
    for(const crew of CREW){
      await c.click('[data-crew="'+crew.id+'"]');await ready();
      c.app().engine.tick(1);c.app().broadcast();
      const expected=c.app().engine.state.crew.find(v=>v.id===crew.id).values.heart_rate.toFixed(0);
      await c.wait('document.querySelector("#crew-metric-tiles .metric-tile p")?.textContent.startsWith('+JSON.stringify(expected)+')');
      assert.equal(await c.evaluate('document.querySelector("#main h1").textContent'),crew.name);
      assert.equal(await c.evaluate('document.querySelectorAll("#twin-scene canvas").length'),1);
      c.report.crew.push({id:crew.id,name:crew.name,expected_hr:expected,matched:true});
    }
  });
  await c.check('N05-01 four viewport reflow and bounded camera diagnostics with independent quality/motion',async()=>{
    for(const [width,height]of [[1920,1080],[1366,768],[768,1024],[390,844]]){
      await c.viewport(width,height);assert.ok(await overflow(),'document overflow '+width);
      assert.ok(await c.evaluate('[...document.querySelectorAll("[data-anatomy-camera],[data-anatomy-layer]")].every(e=>{const r=e.getBoundingClientRect();return r.width>=30&&r.height>=30&&r.left>=0&&r.right<=innerWidth+1})'));
      c.report.viewports.push({page:'N05-01 Crew Health',width,height,document_overflow:false});await c.shot('anatomy-'+width+'x'+height+'.png');
    }
    await c.viewport(1366,768);await c.click('[data-action="graphics"]');assert.equal(await c.evaluate('document.body.classList.contains("reduce-motion")'),false);
    const canvas=await c.evaluate('(()=>{const e=document.querySelector("#twin-scene canvas");return{width:e.width,height:e.height}})()');assert.ok(canvas.width*canvas.height<=650001);
    // Diagnostic CPU draw-submission timing only, NOT presented FPS or an AC-20 trial.
    c.report.camera_diagnostic=await c.evaluate(`new Promise(resolve=>{const canvas=document.querySelector('#twin-scene canvas'),gl=canvas.getContext('webgl2'),original=gl.drawElements,costs=[];gl.drawElements=function(...a){const t=performance.now();const r=original.apply(this,a);costs.push(performance.now()-t);return r};let n=0;function step(){canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));if(++n<40)requestAnimationFrame(step);else requestAnimationFrame(()=>{gl.drawElements=original;costs.sort((a,b)=>a-b);resolve({quality:'performance',frames_requested:n,draw_calls:costs.length,cpu_draw_submission_p95_ms:costs[Math.ceil(costs.length*.95)-1]??null,measurement:'CPU time inside WebGL drawElements only; not GPU completion, display presentation or sustained FPS'})})}requestAnimationFrame(step)})`);
    await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await c.wait('document.body.classList.contains("reduce-motion")');assert.equal(await c.evaluate('document.body.classList.contains("performance-mode")'),true);
    await c.click('[data-anatomy-camera="reset"]');await c.shot('anatomy-performance-reduced-motion.png');
    await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await c.wait('!document.body.classList.contains("reduce-motion")');await c.click('[data-action="graphics"]');
  });
  await c.check('N05-01 real context-loss fallback and retained schematic; no monitoring interruption',async()=>{
    await c.evaluate('document.querySelector("#twin-scene canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()');
    await c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="fallback"');assert.ok(await c.evaluate('!!document.querySelector("#crew-metric-tiles")&&!!document.querySelector("#history-chart")'));
    await c.shot('anatomy-context-loss-fallback.png');
    await c.click('[data-twin-view="schematic"]');assert.ok(await c.evaluate('!!document.querySelector("[data-layer]")'));await c.shot('schematic-retained.png');
    await c.click('[data-twin-view="anatomy"]');await ready();
  });
  await c.check('N05-01 failed loading, navigation cancellation and GPU-buffer cleanup',async()=>{
    await c.click('[data-page="agent"]');
    c.fault('/assets/anatomy/body.glb',503,'Injected bounded N05-01 asset failure');
    await c.click('[data-page="crew"]');await c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="fallback"');
    await c.shot('anatomy-loading-failure.png');assert.ok(await c.evaluate('!!document.querySelector("#crew-metric-tiles")'));
    await c.click('[data-page="agent"]');c.delay('/assets/anatomy/body.glb',1500);
    await c.click('[data-page="crew"]');await c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="loading"');
    await c.click('[data-page="agent"]');await pause(1700);
    assert.equal(await c.evaluate('document.querySelectorAll("#twin-scene canvas").length'),0);
    c.report.gpu_buffer_cleanup=await c.evaluate('({...window.__n05gl})');
    // Probe starts after first entry load; all subsequent allocated WebGL buffers must be released.
    assert.equal(c.report.gpu_buffer_cleanup.created,c.report.gpu_buffer_cleanup.deleted);
  });
  await c.check('N05-01 WebGL denied gives text reference plus usable Canvas schematic',async()=>{
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}}`});
    await c.send('Page.reload',{ignoreCache:true});await c.wait('!!document.querySelector(".app-shell")');await c.click('[data-page="crew"]');await c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="fallback"');
    await c.shot('anatomy-no-webgl.png');await c.click('[data-twin-view="schematic"]');assert.match(await c.evaluate('document.querySelector("#scene-mode").textContent'),/2D|FALLBACK/i);await c.shot('schematic-canvas-fallback.png');
  });
}

async function anatomyAccessibility(c){
  assert.equal(c.nativeZoom,2,'This bounded check requires native browser zoom 200%');
  await c.evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');await c.wait('document.querySelectorAll(".crew-card").length===6');
  await c.click('[data-page="crew"]');await c.wait('document.querySelector("#twin-scene")?.dataset.anatomyState==="ready"');
  await c.evaluate(readFileSync(new URL('../artifacts/n03-closure-tools/axe.min.js',import.meta.url),'utf8')+'\ntrue');
  c.report.anatomy_accessibility=[];
  for(const [width,height]of [[1920,1080],[1366,768],[768,1024],[390,844]])await c.check('N05-01 native200% anatomy reflow/accessibility '+width+'x'+height,async()=>{
    await c.viewport(width,height);
    const layout=await c.evaluate('({innerWidth,innerHeight,dpr:devicePixelRatio,documentWidth:document.documentElement.scrollWidth,cssZoom:getComputedStyle(document.documentElement).zoom,bodyZoom:getComputedStyle(document.body).zoom})');
    assert.ok(Math.abs(layout.dpr-2)<.01);assert.ok(Math.abs(layout.innerWidth-width/2)<=1);assert.ok(layout.documentWidth<=layout.innerWidth+1);
    const axe=await c.evaluate('axe.run(document.querySelector(".anatomy-panel"),{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}}).then(r=>({version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}))');
    const keyboard=[];
    // Real Tab traversal inside this panel, including the canvas; offscreen controls must scroll into view.
    await c.evaluate('document.querySelector("[data-twin-view=anatomy]").focus()');
    for(let i=0;i<12;i++){
      await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      const f=await c.evaluate('(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return{name:e.getAttribute("aria-label")||e.textContent.trim().slice(0,80),focus:e.matches(":focus-visible"),outline:parseFloat(s.outlineWidth),left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()');
      assert.ok(f.name&&f.focus&&f.outline>=2&&f.left>=-1&&f.right<=layout.innerWidth+1,JSON.stringify(f));keyboard.push(f);
    }
    c.report.anatomy_accessibility.push({physical_width:width,physical_height:height,layout,axe,keyboard});assert.deepEqual(axe.violations,[]);
    await c.evaluate('document.querySelector("#twin-scene").scrollIntoView({block:"start",behavior:"instant"})');await c.shot('anatomy-native200-'+width+'x'+height+'.png');
  });
}
