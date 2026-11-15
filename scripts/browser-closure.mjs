/* Targeted N03 acceptance only; actual Chromium DOM, HTTP and native zoom. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sizes=[[1920,1080],[1366,768],[768,1024],[390,844]];
const task=process.argv.find(v=>v.startsWith('--task='))?.slice(7)??'audit';
const auditMode=task==='audit'||task==='resume';
const routes=['overview','crew','agent','comms','knowledge','scenario','sources','replay','cognitive'];
async function key(c,key,code=key,number=9,modifiers=0){
  await c.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,modifiers,...(key==='Enter'?{text:'\r'}:key===' '?{text:' '}: {})});
  await c.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number,modifiers});
}
async function go(c,page){
  if(page==='replay'){await go(c,'crew');await c.click('[data-action="replay"]');await c.wait('!!document.querySelector("#replay-chart svg")');}
  else if(page==='cognitive'){await go(c,'agent');await c.click('#main [data-action="cognitive"]');await c.wait('!!document.querySelector("#reaction-target")');}
  else{await c.click('[data-page="'+page+'"]');await c.wait('document.querySelector(".nav-button[aria-current=page]")?.dataset.page==='+JSON.stringify(page));}
  await c.settle();c.app().broadcast();await pause(100);
}
async function axe(c){
  if(!await c.evaluate('!!window.axe'))await c.evaluate(readFileSync(new URL('../artifacts/n03-closure-tools/axe.min.js',import.meta.url),'utf8')+'\ntrue');
  return c.evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}}).then(r=>({version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary,checks:[...n.any,...n.all,...n.none].map(k=>({id:k.id,data:k.data}))}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))})),passes:r.passes.map(p=>({id:p.id,nodes:p.nodes.length}))}))`);
}
// Conservative contrast bounds supplement axe's indeterminate gradient results.
// Uses every gradient stop and ancestor color, never a single convenient pixel.
export function contrastBounds(targets){
  const rgb=s=>{const n=s?.match(/[\d.]+/g)?.map(Number);return n?{v:n.slice(0,3),a:n[3]??1}:null;};
  const lum=v=>v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
  const mix=(c,b)=>c.v.map((n,i)=>n*c.a+b[i]*(1-c.a));
  return targets.flatMap(target=>{
    if(target.length!==1)return[{target,resolved:false,reason:'Non-simple selector'}];
    const e=document.querySelector(target[0]);if(!e||!e.textContent.trim())return[];
    const ancestors=[];for(let p=e;p;p=p.parentElement)ancestors.unshift(p);
    let lo=[5,5,8],hi=[5,5,8],uncertain=false,opacity=1;
    for(const p of ancestors){const s=getComputedStyle(p),c=rgb(s.backgroundColor);opacity*=Number(s.opacity);
      if(c){lo=mix(c,lo);hi=mix(c,hi);}
      if(s.backgroundImage!=='none'){
        if(!s.backgroundImage.includes('gradient(')||s.backgroundImage.includes('url(')){uncertain=true;continue;}
        const colors=[...s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m=>rgb(m[0]));
        if(!colors.length){uncertain=true;continue;}
        const lows=colors.map(c=>mix(c,lo)),highs=colors.map(c=>mix(c,hi));
        lo=lo.map((_,i)=>Math.min(...lows.map(v=>v[i])));hi=hi.map((_,i)=>Math.max(...highs.map(v=>v[i])));
      }
    }
    const s=getComputedStyle(e),fg=rgb(s.color);if(!fg||fg.a!==1||opacity!==1)return[{target,resolved:false,reason:'Unsupported text opacity',opacity}];
    const f=lum(fg.v),low=lum(lo),high=lum(hi),near=Math.max(low,Math.min(high,f));
    const ratio=(Math.max(f,near)+.05)/(Math.min(f,near)+.05),large=parseFloat(s.fontSize)>=24||parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700,required=large?3:4.5;
    return[{target,text:e.textContent.trim().slice(0,100),resolved:!uncertain,minimum_ratio:ratio,required,pass:!uncertain&&ratio>=required,background_low:lo,background_high:hi,foreground:fg.v,method:'Conservative computed CSS gradient-stop/ancestor bounds; no rendered-pixel/physical-display certification'}];
  });
}
async function keyboard(c){
  await c.evaluate('document.querySelector(".skip-link").focus()');
  const expected=await c.evaluate(`[...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY')).map(e=>({tag:e.tagName,id:e.id,name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,90),tabIndex:e.tabIndex}))`);
  const sequence=[],issues=[];
  for(let i=0;i<Math.min(expected.length+2,150);i++){
    if(i%5===0){c.app().broadcast();await pause(40);}
    await key(c,'Tab');
    const f=await c.evaluate(`(()=>{const e=document.activeElement;if(e===document.body)return{boundary:true};if(e.classList.contains('skip-link'))return{wrapped:true};const s=getComputedStyle(e),r=e.getBoundingClientRect();const ink=[...e.getClientRects()].find(r=>r.top>=0&&r.bottom<=innerHeight)??r;const points=e.tagName==='CANVAS'?[[.1,.1],[.5,.5],[.9,.9]]:[[.5,.5]];const unobscured=points.some(([x,y])=>{const p=document.elementFromPoint(Math.min(innerWidth-1,Math.max(1,ink.x+ink.width*x)),Math.min(innerHeight-1,Math.max(1,ink.y+ink.height*y)));return p===e||e.contains(p)});return{tag:e.tagName,id:e.id,name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,90),tabIndex:e.tabIndex,focusVisible:e.matches(':focus-visible'),outline:parseFloat(s.outlineWidth),withinViewport:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,unobscured,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`);
    if(f.wrapped)break;if(f.boundary)continue;sequence.push(f);
    if(!f.focusVisible||f.outline<2||!f.withinViewport||!f.unobscured||f.tabIndex>0)issues.push(f);
  }
  const identity=e=>[e.tag,e.id,e.name];
  const logical_order=JSON.stringify(expected.slice(1).map(identity))===JSON.stringify(sequence.map(identity));
  return {expected,sequence,issues,logical_order};
}
async function auditPage(c,page,width,height){
  await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');
  const layout=await c.evaluate(`(()=>{const over=[...document.querySelectorAll('#main button,#main input,#main select,#main .metric-tile p,#main h1,#main label')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1?[{tag:e.tagName,id:e.id,text:e.textContent.slice(0,100),left:r.left,right:r.right}]:[]});return{cssWidth:innerWidth,cssHeight:innerHeight,dpr:devicePixelRatio,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,criticalOutside:over,positiveTabindex:document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length,reduced_motion_preference:matchMedia('(prefers-reduced-motion: reduce)').matches,reduced_motion_class:document.body.classList.contains('reduce-motion'),running_animations:document.getAnimations().filter(a=>a.playState==='running').length}})()`);
  const result=await axe(c);const keys=await keyboard(c);
  const introduction_issues=page==='landing'?await c.evaluate(`(()=>{const v=document.querySelector('.login-visual').getBoundingClientRect(),b=document.querySelector('.login-visual .brand').getBoundingClientRect();return [...document.querySelector('.login-story').children].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect(),clipped=r.left<v.left-1||r.right>v.right+1||r.top<v.top-1||r.bottom>v.bottom+1,overlapsBrand=r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top;return clipped||overlapsBrand?[{tag:e.tagName,text:e.textContent.slice(0,100),clipped,overlapsBrand}]:[]})})()`):[];
  const targets=result.incomplete.filter(r=>r.id==='color-contrast').flatMap(r=>r.nodes.map(n=>n.target));
  const supplemental_contrast=await c.evaluate('('+contrastBounds.toString()+')('+JSON.stringify(targets)+')');
  const tree=await c.send('Accessibility.getFullAXTree');
  const unnamed_controls=tree.nodes.filter(n=>!n.ignored&&['button','link','combobox','slider'].includes(n.role?.value)&&!n.name?.value?.trim()).map(n=>({role:n.role.value,id:n.nodeId}));
  await c.evaluate('document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"})');await c.shot(page+'-'+width+'x'+height+'-zoom'+c.nativeZoom+'.png');
  c.report.accessibility_audit.push({page,physical_width:width,physical_height:height,layout,axe:result,keyboard:keys,unnamed_controls,supplemental_contrast,introduction_issues});
}
export async function closureChecks(c){
  c.report.scope='Targeted N03 native zoom/accessibility/performance closure; prior functional suite not repeated';
  if(task==='resume'){
    assert.equal(c.nativeZoom,2,'Resume task covers the interrupted native200% pass');
    c.report.reused_evidence=['n03-closure-200-audit','n03-closure-100-audit','n03-closure-100-performance'].map(name=>{
      const raw=readFileSync(new URL('../artifacts/'+name+'/report.json',import.meta.url),'utf8'),r=JSON.parse(raw);
      assert.equal(r.status,'passed','Reuse requires a completed passing numerical report: '+name);
      return{path:'artifacts/'+name+'/report.json',sha256:createHash('sha256').update(raw).digest('hex'),started_at:r.started_at,finished_at:r.finished_at,checks:r.checks.length,audited_pages:r.accessibility_audit?.length??0};
    });
    c.report.scope='Resume only: four changed Landing layouts; mobile Replay/Check-in interrupted before completion;200% AX-live/recovery/Earth isolation. Earlier complete numerical audits and performance are reused, not rerun.';
    c.report.caveats.push('Earlier200% report JSON is complete, but some sibling PNGs were overwritten by the interrupted later attempt. Do not attribute those mixed PNGs to the earlier report. This resume lists only newly captured screenshots.');
  }
  c.report.zoom_probe=[];
  await c.check('native zoom proof at four physical viewport sizes',async()=>{
    for(const [width,height]of sizes){
      await c.viewport(width,height);await pause(100);
      const observed=await c.evaluate('({innerWidth,innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale,cssZoom:getComputedStyle(document.documentElement).zoom,bodyZoom:getComputedStyle(document.body).zoom})');
      c.report.zoom_probe.push({physical_width:width,physical_height:height,...observed});
      assert.equal(observed.cssZoom,'1');assert.equal(observed.bodyZoom,'1');assert.equal(observed.visualScale,1);
      assert.ok(Math.abs(observed.dpr-c.nativeZoom)<.01,'Native browser zoom must affect DPR');
      assert.ok(Math.abs(observed.innerWidth-width/c.nativeZoom)<=1,'Native browser zoom must reflow the CSS viewport');
    }
    await c.shot('native-zoom-landing.png');
  });
  if(task==='probe')return;
  if(auditMode){
    c.report.accessibility_audit=[];await c.send('Accessibility.enable');
    for(const [w,h]of c.nativeZoom===2?sizes:[sizes[0]]){await c.viewport(w,h);await auditPage(c,'landing',w,h);}
  }
  await c.viewport(1920,1080);
  await c.evaluate('document.querySelector("#login-form").requestSubmit()');await c.wait('document.querySelectorAll(".crew-card").length===6');
  if(task==='performance'){
    c.report.hardware=JSON.parse(readFileSync(new URL('../artifacts/n03-closure-tools/hardware.json',import.meta.url),'utf8'));
    c.report.performance_requirements={research_lines:[374,744,754,766,774,858],judge_client:'Recent browser, 8 GB RAM, WebGL2; no local AI required',designated_minimum_machine:'Not specified in research/roadmap; designation not inferred',warm_shell_ms:3000,telemetry_to_ui_p95_ms:500,api_p95_ms:200,judge_mode_fps_minimum:30,normal_fps_target:60};
    const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]??null;
    await c.check('warm shell and actual local browser API timings on named laptop',async()=>{
      await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__warmReadyMs=null;new MutationObserver(()=>{if(window.__warmReadyMs===null&&document.querySelectorAll('.crew-card').length===6)window.__warmReadyMs=performance.now()}).observe(document,{subtree:true,childList:true})`});
      const warm=[];for(let i=0;i<3;i++){await c.send('Page.reload');await c.wait('window.__warmReadyMs!==null&&window.__warmReadyMs!==undefined');warm.push(await c.evaluate('window.__warmReadyMs'));}
      const api=await c.evaluate(`(async()=>{const samples=[];for(let i=0;i<40;i++){const start=performance.now(),r=await fetch(i%2?'/v1/state':'/v1/health');await r.json();samples.push({path:i%2?'state':'health',status:r.status,ms:performance.now()-start})}return samples})()`);
      c.report.browser_timing={warm_shell_ms:warm,api_samples:api,api_p95_ms:percentile(api.map(s=>s.ms),.95)};
      assert.ok(warm.every(n=>n<=3000));assert.ok(c.report.browser_timing.api_p95_ms<200);assert.ok(api.every(s=>s.status===200));
    });
    await c.check('telemetry clock mutation latency from real SSE deliveries',async()=>{
      await c.evaluate(`window.__uiLatencies=[];new MutationObserver(()=>{if(window.__uiSentAt!==null&&window.__uiSentAt!==undefined){window.__uiLatencies.push(performance.now()-window.__uiSentAt);window.__uiSentAt=null}}).observe(document.querySelector('[data-live="clock"]'),{subtree:true,childList:true,characterData:true})`);
      for(let i=0;i<20;i++){await c.evaluate('window.__uiSentAt=performance.now()');c.app().engine.tick(30);c.app().broadcast();await c.wait('window.__uiSentAt===null');}
      const samples=await c.evaluate('window.__uiLatencies');c.report.browser_timing.telemetry_clock_latency_ms=samples;c.report.browser_timing.telemetry_clock_p95_ms=percentile(samples,.95);assert.equal(samples.length,20);assert.ok(c.report.browser_timing.telemetry_clock_p95_ms<500);
    });
    c.report.graphics_profiles=[];
    for(const page of ['overview','crew'])for(const mode of ['standard','existing-performance-control']){
      await c.check(page+' '+mode+' 30-second actual graphics profile',async()=>{
        await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await go(c,page);await c.wait('document.querySelector("#scene-mode").textContent==="WEBGL2"');
        if(await c.evaluate('document.querySelector("[data-action=graphics]").getAttribute("aria-pressed")==="true"'))await c.click('[data-action="graphics"]');
        if(mode!=='standard')await c.click('[data-action="graphics"]');
        await pause(300);
        await c.evaluate(`(()=>{const canvas=document.querySelector('#main canvas'),g=canvas.getContext('webgl2'),ext=g.getExtension('WEBGL_debug_renderer_info'),draw=g.drawArrays;window.__closurePerf={start:performance.now(),draws:0,frames:[],last:0,running:true,renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),canvas_width:canvas.width,canvas_height:canvas.height,reduced_motion:document.body.classList.contains('reduce-motion'),performance_pressed:document.querySelector('[data-action=graphics]').getAttribute('aria-pressed')};g.drawArrays=function(...args){window.__closurePerf.draws++;return draw.apply(this,args)};window.__closurePerf.restore=()=>{g.drawArrays=draw};function frame(t){const p=window.__closurePerf;if(!p.running)return;if(p.last)p.frames.push(t-p.last);p.last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame)})()`);
        const timer=setInterval(()=>{c.app().engine.tick(30);c.app().broadcast();},1000);
        try{await pause(30000);}finally{clearInterval(timer);}
        const sample=await c.evaluate(`(()=>{const p=window.__closurePerf;p.running=false;p.restore();const duration_ms=performance.now()-p.start;const {restore,...r}=p;return {...r,duration_ms,draw_submissions_per_second:p.draws*1000/duration_ms}})()`);
        sample.page=page;sample.mode=mode;sample.raf_p95_ms=percentile(sample.frames,.95);sample.caveat='Actual Chrome draw submissions and rAF scheduling on recorded laptop; no physical display presentation or another machine certified. Performance control also enables event-driven reduced motion; not an implemented continuously animated judge-performance profile.';
        c.report.graphics_profiles.push(sample);assert.ok(sample.draws>0);await c.shot(page+'-'+mode+'-performance.png');
      });
    }
    c.report.judge_certification={complete:false,reason:'No team-designated minimum hardware recorded; existing Performance control enables reduced motion rather than a continuously animated >=30 FPS judge-performance profile. Shader/frame-rate redesign remains outside this targeted N03 pass.'};return;
  }
  if(auditMode){
    await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await c.send('Accessibility.enable');
    for(const [width,height]of task==='resume'?[sizes[3]]:c.nativeZoom===2?sizes:[sizes[0]]){
      await c.viewport(width,height);
      await c.check((task==='resume'?'finish interrupted Replay and Check-in audits ':'collect all nine workspace accessibility and keyboard audits ')+width+'x'+height,async()=>{
        for(const page of task==='resume'?['replay','cognitive']:routes){console.log('Auditing: '+page+' '+width+'x'+height);await go(c,page);await auditPage(c,page,width,height);}
      });
    }
    await c.check('critical monitoring and risk live-region semantics',async()=>{
      await go(c,'overview');
      const before=await c.evaluate('({monitor:document.querySelector("#monitor-announcement")?.outerHTML,risk:document.querySelector("#risk-announcement")?.outerHTML})');c.report.announcements={before};
      c.app().engine.monitor.failure();c.app().broadcast();await pause(2300);
      c.report.announcements.after_failure=await c.evaluate('({monitor:document.querySelector("#monitor-announcement")?.textContent,connection:document.querySelector("#connection").textContent})');
      assert.match(c.report.announcements.after_failure.monitor,/Monitoring failed/);
      c.app().engine.tick(30);c.app().broadcast();await pause(2300);
      c.report.announcements.after_recovery=await c.evaluate('document.querySelector("#monitor-announcement").textContent');assert.match(c.report.announcements.after_recovery,/Monitoring in manual mode/);
      c.app().engine.startScenario('sleep-debt-cardio-drift');for(let i=0;i<12;i++)c.app().engine.tick(30);c.app().broadcast();await pause(300);
      c.report.announcements.after_alert=await c.evaluate('({risk:document.querySelector("#risk-announcement")?.textContent,toast:document.querySelector("#toast").textContent})');
      assert.match(c.report.announcements.after_alert.risk,/Onboard recorded review/);
      const tree=await c.send('Accessibility.getFullAXTree');c.report.announcements.accessibility_tree=tree.nodes.filter(n=>!n.ignored&&['alert','status'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,properties:n.properties}));
      assert.ok(c.report.announcements.accessibility_tree.some(n=>n.role==='alert'&&n.properties.some(p=>p.name==='live'&&p.value.value==='assertive')));
      const announcement=c.report.announcements.after_alert.risk;c.app().broadcast();await pause(150);assert.equal(await c.evaluate('document.querySelector("#risk-announcement").textContent'),announcement);
      await c.click('[data-view="earth"]');assert.equal(await c.evaluate('document.querySelector("#risk-announcement").textContent'),'');
      assert.equal(await c.evaluate('document.querySelector("#toast").classList.contains("show")&&/Onboard:/.test(document.querySelector("#toast").textContent)'),false,'Earth view must not retain an unreceived onboard alert toast');
      await c.click('[data-view="spacecraft"]');
      await c.shot('critical-announcement.png');
    });
    await c.check('mandatory accessibility and zoom checks have no unresolved defects',async()=>{
      const bad=c.report.accessibility_audit.filter(r=>r.layout.overflow||r.layout.criticalOutside.length||r.axe.violations.length||r.keyboard.issues.length||!r.keyboard.logical_order||r.unnamed_controls.length||r.supplemental_contrast.some(s=>!s.pass)||r.introduction_issues.length);
      c.report.unresolved_audit_pages=bad.map(r=>({page:r.page,width:r.physical_width,overflow:r.layout.overflow,criticalOutside:r.layout.criticalOutside,violations:r.axe.violations.map(v=>v.id),keyboard_issues:r.keyboard.issues.length,logical_order:r.keyboard.logical_order,unnamed:r.unnamed_controls.length,contrast_unresolved:r.supplemental_contrast.filter(s=>!s.pass),introduction_issues:r.introduction_issues}));
      assert.deepEqual(c.report.unresolved_audit_pages,[]);
      assert.ok(c.report.announcements.before.monitor&&c.report.announcements.before.risk,'Persistent availability and critical-risk announcements required');
      for(const a of c.report.accessibility_audit.filter(a=>a.page!=='landing')){assert.equal(a.layout.reduced_motion_preference,true);assert.equal(a.layout.reduced_motion_class,true);assert.equal(a.layout.running_animations,0);}
    });return;
  }
  throw new Error('Unknown targeted closure task: '+task);
}
