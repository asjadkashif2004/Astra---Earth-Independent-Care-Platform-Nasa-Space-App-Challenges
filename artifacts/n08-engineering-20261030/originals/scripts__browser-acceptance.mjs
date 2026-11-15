/* Real Chromium acceptance for normal WSL. No downloaded packages; never a stub/browser pass. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync,copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createApp } from '../services/api/server.mjs';
import { buildCase } from '../services/agent/agent.mjs';
import { workspaceChecks, functionalChecks, durableChecks, interactionChecks, automaticChecks } from './browser-checks.mjs';
import { closureChecks } from './browser-closure.mjs';
import { n04Checks } from './browser-n04.mjs';
import { p01Checks } from './browser-n04-p01.mjs';
import { n05Checks } from './browser-n05-01.mjs';
import { n09Checks } from './browser-n09-d01.mjs';
import { n10Checks } from './browser-n10.mjs';

const closureMode=process.argv.includes('--closure');
const nativeZoom=process.argv.includes('--zoom=2')?2:1;

const directory=resolve(process.argv.find(s=>s.startsWith('--output='))?.slice(9)??process.env.ASTRA_BROWSER_OUTPUT??'artifacts/n03-browser');mkdirSync(directory,{recursive:true});
const executable=process.env.ASTRA_BROWSER_BIN??['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
const report={status:'blocked',started_at:new Date().toISOString(),checks:[],screenshots:[],console_errors:[],http_errors:[],viewports:[],caveats:['No FPS/physical Internet-off/clinical acceptance is inferred. Headless rendering is not target-laptop hardware validation.','Pointer/keyboard/rendered DOM checks and screenshots supplement human visual, text-contrast and assistive-technology review; they do not establish WCAG conformance.']};
let app,browser,profile,dbDirectory,activeCheck='startup';let sequence=0,buffer='';const pending=new Map(),events=new Map();let session;
const n10Deadline=process.argv.includes('--n10')?performance.now()+900000:Infinity;
function send(method,params={},sessionId=session){
  if(performance.now()>n10Deadline&&method!=='Browser.close')return Promise.reject(new Error('N10 browser campaign deadline reached'));
  return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Browser command timeout: '+method));},10000);
    pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
  });
}
function receive(chunk){
  buffer+=chunk.toString();let end;
  while((end=buffer.indexOf('\0'))>=0){
    const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const message=JSON.parse(raw);
    if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);}}
    if(message.method==='Runtime.exceptionThrown')report.console_errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')report.console_errors.push(message.params.args.map(a=>a.value??a.description).join(' '));
    if(message.method==='Network.responseReceived'&&message.params.response.status>=400)report.http_errors.push({url:message.params.response.url,status:message.params.response.status,stage:activeCheck});
    for(const fn of events.get(message.method)??[])fn(message.params);
  }
}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;}
async function wait(expression){const start=performance.now();while(performance.now()-start<15000){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('DOM condition timed out: '+expression);}
async function click(selector){
  await wait(`[...document.querySelectorAll(${JSON.stringify(selector)})].some(n=>!n.disabled&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden')`);
  const point=await evaluate(`(()=>{const node=[...document.querySelectorAll(${JSON.stringify(selector)})].find(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');if(!node||node.disabled)throw Error('No visible enabled control: '+${JSON.stringify(selector)});node.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function settle(){await evaluate(`(async()=>{const animations=document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations!==Infinity&&!a.effect?.target?.closest('details:not([open])'));let timer;try{await Promise.race([Promise.all(animations.map(a=>a.finished.catch(()=>{}))),new Promise(resolve=>{timer=setTimeout(resolve,1000)})]);}finally{clearTimeout(timer)}})()`);await new Promise(resolve=>setTimeout(resolve,250));}
async function shot(name){await settle();const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(directory,name),Buffer.from(result.data,'base64'));report.screenshots.push(name);}
async function check(name,fn){activeCheck=name;console.log('Checking: '+name);try{await fn();report.checks.push({name,status:'passed'});}catch(error){report.checks.push({name,status:'failed',reason:error.message});await shot('failure-'+report.checks.length+'.png').catch(()=>{});throw error;}}
const viewports=[[1920,1080],[1366,768],[768,1024],[390,844]];
async function viewport(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:closureMode?false:width<600});}
async function layout(label,width,height){
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label+' document overflow');
  if(await evaluate('!!document.querySelector(".breadcrumb")'))assert.ok(await evaluate('(()=>{const a=document.querySelector(".breadcrumb").getBoundingClientRect(),b=document.querySelector(".topbar-right").getBoundingClientRect();return a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1})()'),label+' header overlap');
  assert.ok(await evaluate('!!document.querySelector("#main")&&document.querySelector("#main").getBoundingClientRect().width>0'),label+' main content');
  if(await evaluate('!!document.querySelector(".app-shell")')){
    for(let i=0;i<3;i++){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      if(await evaluate('document.activeElement===document.body')){
        report.keyboard_browser_boundary_transitions=(report.keyboard_browser_boundary_transitions??0)+1;
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      }
      const focus=await evaluate('(()=>{const e=document.activeElement;return{element:e.outerHTML.slice(0,250),visible:e.matches(":focus-visible"),outline:getComputedStyle(e).outlineWidth,connection:document.querySelector("#connection").textContent}})()');
      assert.ok(focus.visible&&parseFloat(focus.outline)>=2,label+' native focus '+JSON.stringify(focus));
    }
    await wait('(()=>{window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"});return scrollY+innerHeight>=document.documentElement.scrollHeight-2})()');
    await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  }
  report.viewports.push({page:label,width,height,document_overflow:false});await shot(label+'-'+width+'x'+height+'.png');
}
const faults=new Map(),delays=new Map(),delayed=new Set();function fault(path,status,message){faults.set(path,{status,message});}
async function startApp(port=0,automatic=false){
  app=createApp({dbPath:join(dbDirectory,'acceptance.sqlite'),autoTick:automatic,caseBuilder:buildCase});
  const original=app.server.listeners('request')[0];app.server.removeListener('request',original);
  app.server.on('request',(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname,injected=faults.get(path);
    if(delays.has(path)){const ms=delays.get(path);delays.delete(path);const timer=setTimeout(()=>{delayed.delete(timer);if(!res.destroyed)void original(req,res);},ms);delayed.add(timer);return;}
    if(!injected)return original(req,res);faults.delete(path);req.resume();res.writeHead(injected.status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'ACCEPTANCE_INJECTED',message:injected.message}}));
  });
  await new Promise((resolve,reject)=>{app.server.once('error',error=>reject(Object.assign(error,{blocked:true})));app.server.listen(port,'127.0.0.1',resolve);});
}
async function restart(automatic=false,checkDisconnected=false){const port=app.server.address().port;await app.close();app=null;if(checkDisconnected)await wait('document.querySelector("#connection").textContent.includes("disconnected")');await startApp(port,automatic);await wait('document.querySelector("#connection").textContent.includes("Monitoring")');}
const context={app:()=>app,browserPid:()=>browser?.pid,restart,send,evaluate,click,wait,check,shot,viewport,report,fault,delay:(path,ms)=>delays.set(path,ms),settle,nativeZoom,directory,on:(name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);return()=>events.get(name).delete(fn);}};
try{
  if(!executable||!existsSync(executable))throw Object.assign(new Error('No usable Chromium configured. Set ASTRA_BROWSER_BIN to a Linux Chrome/Chromium executable in normal WSL.'),{blocked:true});
  dbDirectory=mkdtempSync(join(tmpdir(),'astra-n03-database-'));
  const fixture=process.argv.find(s=>s.startsWith('--fixture-db='))?.slice(13);if(fixture)copyFileSync(resolve(fixture),join(dbDirectory,'acceptance.sqlite'));
  await startApp();
  profile=mkdtempSync(join(tmpdir(),'astra-n03-chromium-'));
  if(closureMode){
    mkdirSync(join(profile,'Default'),{recursive:true});
    const level=Math.log(nativeZoom)/Math.log(1.2);
    writeFileSync(join(profile,'Default','Preferences'),JSON.stringify({partition:{default_zoom_level:{x:level}}}));
    report.native_zoom_preferences={factor:nativeZoom,partition_key:'x',level,disposable_profile:true};
  }
  const flags=[...(process.argv.includes('--headed')?['--start-fullscreen']:['--headless']),'--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'];
  if(process.argv.includes('--n10'))flags.unshift('--disable-background-networking','--disable-component-update','--disable-sync','--no-pings','--disable-default-apps');
  if(closureMode)flags.unshift('--force-device-scale-factor=1');
  if(process.env.ASTRA_BROWSER_NO_SANDBOX==='1')flags.unshift('--no-sandbox');
  browser=spawn(executable,flags,{stdio:['ignore','ignore','pipe','pipe','pipe']});
  if(process.argv.includes('--n10'))report.N10_browser_start={pid:browser.pid,source:'Existing installed Chrome, disposable profile',Node:process.version,Node_memory:process.memoryUsage(),at:new Date().toISOString()};
  browser.stdio[3].on('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Object.assign(error,{blocked:true}));}pending.clear();});
  browser.stdio[4].setEncoding('utf8');browser.stdio[4].on('data',receive);let stderr='';browser.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-3000);});
  browser.once('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Object.assign(error,{blocked:true}));}pending.clear();});
  browser.once('exit',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Object.assign(new Error('Browser exited: '+stderr),{blocked:true}));}pending.clear();});
  report.browser=await send('Browser.getVersion',{},null);
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));
  if(process.argv.includes('--headed')){await send('Target.activateTarget',{targetId},null);await send('Page.bringToFront');}
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  await viewport(1920,1080);
  const base='http://127.0.0.1:'+app.server.address().port;
  await send('Page.navigate',{url:base});await wait('!!document.querySelector("#login-form")');
  if(process.argv.includes('--n10')){
    await n10Checks(context);
  }else if(process.argv.includes('--n09-d01')){
    await n09Checks(context);
  }else if(process.argv.includes('--n05-01')){
    await n05Checks(context);
  }else if(process.argv.includes('--p01')){
    await p01Checks(context);
  }else if(process.argv.includes('--n04')){
    await n04Checks(context);
  }else if(closureMode){
    await closureChecks(context);
  }else{
  await check('landing at four viewports, disclaimers and native keyboard focus',async()=>{
    for(const [width,height]of viewports){await viewport(width,height);assert.ok(await evaluate('/fictional/.test(document.querySelector("#login-form").textContent)&&/synthetic/.test(document.querySelector(".login-note").textContent)'));await layout('landing',width,height);}
    await viewport(1920,1080);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await evaluate('document.activeElement!==document.body&&document.activeElement.matches(":focus-visible")&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'));
  });
  await evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');
  await wait('document.querySelectorAll(".crew-card").length===6');
  await check('six crew, initial health and desktop overflow',async()=>{assert.equal(await evaluate('document.querySelector("#crew-count").textContent'),'6 AUTHORIZED CREW');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await shot('overview-desktop.png');});
  await check('all six selections and existing workspaces',async()=>{
    for(let i=1;i<=6;i++){const id='CREW-0'+i;await click('[data-crew="'+id+'"]');await wait('!!document.querySelector("#history-chart svg")');assert.ok((await evaluate('document.querySelector("#main h1").textContent')).length>0);}
    for(const page of ['overview','agent','comms','knowledge','scenario','sources']){await click('[data-page="'+page+'"]');await wait('document.querySelector(".nav-button[aria-current=page]")?.dataset.page==='+JSON.stringify(page));}
    await click('[data-page="crew"]');await click('[data-action="replay"]');await wait('!!document.querySelector("#replay-chart svg")');
    await click('[data-action="crew-page"]');await click('[data-action="cognitive"]');await wait('!!document.querySelector("#reaction-target")');
  });
  await workspaceChecks(context);
  await check('all nine workspaces at desktop, laptop, tablet and mobile',async()=>{
    for(const [width,height]of viewports){await viewport(width,height);
      for(const page of ['overview','crew','agent','comms','knowledge','scenario','sources']){await click('[data-page="'+page+'"]');await wait('document.querySelector(".nav-button[aria-current=page]")?.dataset.page==='+JSON.stringify(page));await layout(page,width,height);}
      await click('[data-page="crew"]');await click('[data-action="replay"]');await wait('document.querySelector("#breadcrumb").textContent==="Mission replay"');await layout('replay',width,height);
      await click('[data-page="agent"]');await click('#main [data-action="cognitive"]');await wait('document.querySelector("#breadcrumb").textContent==="Crew check-in"');await layout('checkin',width,height);
    }await viewport(1920,1080);await click('[data-page="overview"]');
  });
  await functionalChecks(context);
  await check('pending/failure/recovery, Earth separation and actual acknowledgement',async()=>{
    app.engine.comms.control({blackout:true},app.engine.state.now);app.engine.caseBuilder=()=>{throw new Error('Injected browser-test enrichment failure');};
    app.engine.startScenario('sleep-debt-cardio-drift');for(let i=0;i<12;i++)app.engine.tick(30);app.broadcast();
    await click('[data-page="agent"]');await wait('document.querySelector("#cases-content").textContent.includes("enrichment pending")');
    await app.engine.enrichPending();app.broadcast();
    await click('[data-page="agent"]');await wait('document.querySelector("#cases-content").textContent.includes("enrichment failed")');
    await click('[data-page="overview"]');await wait('document.querySelector("[data-live=alert-count]").textContent==="1"');
    await click('[data-view="earth"]');await wait('document.querySelector("[data-live=alert-count]").textContent===""');
    assert.ok(await evaluate('[...document.querySelectorAll(".crew-card")].every(c=>c.classList.contains("gray"))'));
    await click('[data-view="spacecraft"]');app.engine.caseBuilder=buildCase;const risk=app.store.list('risk_events')[0],job=app.store.record('enrichment_jobs',risk.id);job.next_attempt_at=0;app.store.put('enrichment_jobs',job.id,job);await app.engine.enrichPending();app.broadcast();
    await click('[data-page="agent"]');await wait('!!document.querySelector("[data-ack]:not([disabled])")');
    fault('/v1/alerts/'+risk.id+'/ack',409,'Injected acknowledgement conflict');await click('[data-ack]');await wait('document.querySelector("#toast").textContent.includes("not confirmed")');
    assert.equal(app.store.record('risk_events',risk.id).status,'open');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
    await wait('!!document.querySelector("[data-ack]:not([disabled])")');await click('[data-ack]');
    await wait('!!document.querySelector("[data-ack][disabled]")');assert.equal(app.store.list('comms_messages',1000).filter(m=>m.kind==='case').length,1);
  });
  await durableChecks(context);
  await check('400/403 rejected writes retain unsaved input',async()=>{
    await click('[data-page="comms"]');
    for(const status of [400,403]){await evaluate('document.querySelector("[name=delay]").value="7.5"');const previous=app.engine.comms.config.one_way_latency_ms;
      fault('/v1/comms/control',status,'Injected link rejection '+status);await click('#comms-form button');await wait('document.querySelector("#toast").textContent.includes('+JSON.stringify('Injected link rejection '+status)+')');
      assert.equal(await evaluate('document.querySelector("[name=delay]").value'),'7.5');assert.equal(app.engine.comms.config.one_way_latency_ms,previous);
    }
  });
  await check('delayed history cannot replace the next selected crew',async()=>{
    await click('[data-page="crew"]');delays.set('/v1/crew/CREW-03/telemetry',600);await click('[data-crew="CREW-03"]');await click('[data-crew="CREW-02"]');
    await wait('!!document.querySelector("#history-chart svg")');await new Promise(resolve=>setTimeout(resolve,700));
    const crew=app.engine.state.crew.find(c=>c.id==='CREW-02');
    assert.ok((await evaluate('document.querySelector("#main").textContent')).includes(crew.id));
    assert.equal(await evaluate('document.querySelector(".crew-tab[aria-pressed=true]").dataset.crew'),'CREW-02');
  });
  await check('health503, API disconnect and recovery',async()=>{
    await click('[data-page="overview"]');app.engine.monitor.failure();await wait('[...document.querySelectorAll(".crew-card")].every(c=>c.classList.contains("gray"))');
    app.engine.tick(30);app.broadcast();await wait('[...document.querySelectorAll(".crew-card")].some(c=>c.classList.contains("green"))');
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await wait('document.querySelector("#connection").textContent.includes("disconnected")');
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await wait('document.querySelector("#connection").textContent.includes("Monitoring")');
  });
  await interactionChecks(context);
  await check('keyboard, mobile overflow and reduced motion',async()=>{
    await click('[data-page="overview"]');
    await evaluate('document.querySelector("[data-page=knowledge]").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await wait('document.querySelector(".nav-button[aria-current=page]").dataset.page==="knowledge"');
    await evaluate('document.querySelector("[data-page=overview]").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',text:' ',windowsVirtualKeyCode:32});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await wait('document.querySelector(".nav-button[aria-current=page]").dataset.page==="overview"');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await evaluate('document.activeElement!==document.body'));
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    assert.ok(await evaluate('getComputedStyle(document.querySelector("[data-page=scenario]")).display!=="none"'));
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait('document.body.classList.contains("reduce-motion")');await shot('overview-mobile-reduced.png');
    await evaluate('(()=>{const g=document.querySelector("#main canvas").getContext("webgl2"),draw=g.drawArrays;window.__n03Reduced={draws:0,restore:()=>{g.drawArrays=draw}};g.drawArrays=function(...a){window.__n03Reduced.draws++;return draw.apply(this,a)}})()');
    await new Promise(resolve=>setTimeout(resolve,700));report.reduced_motion_draws_in_700ms=await evaluate('(()=>{const p=window.__n03Reduced;p.restore();delete window.__n03Reduced;return p.draws})()');assert.ok(report.reduced_motion_draws_in_700ms<=5);
  });
  await check('unsupported WebGL fallback retains monitoring',async()=>{
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==="webgl2"?null:originalContext.call(this,type,...args)};'});
    await send('Page.reload',{ignoreCache:true});await wait('document.querySelectorAll(".crew-card").length===6');await wait('/fallback/i.test(document.querySelector("#scene-mode").textContent)');await shot('fallback-mobile.png');
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'HTMLCanvasElement.prototype.getContext=function(){return null};'});
    await send('Page.reload',{ignoreCache:true});await wait('/^text fallback$/i.test(document.querySelector("#scene-mode")?.textContent)');assert.equal(await evaluate('document.querySelectorAll(".crew-card").length'),6);await shot('text-fallback-mobile.png');
  });
  await check('observed DOM-update latency (100ms polling upper bound, not paint/FPS)',async()=>{
    const observations=[];for(let i=0;i<8;i++){const before=await evaluate('document.querySelector("[data-live=clock]").textContent'),start=performance.now();app.engine.tick(30);app.broadcast();await wait('document.querySelector("[data-live=clock]").textContent!=='+JSON.stringify(before));observations.push(performance.now()-start);}
    report.dom_update_observation_ms=observations;report.dom_update_observation_p95_ms=[...observations].sort((a,b)=>a-b).at(-1);
  });
  await automaticChecks(context);
  await check('expired sessions, actual role selection and least-privilege views',async()=>{
    app.store.db.prepare('UPDATE sessions SET expires_at=0').run();await send('Page.reload',{ignoreCache:true});await wait('!!document.querySelector("#login-form")');
    assert.equal(await evaluate('!!document.querySelector(".crew-card")'),false);
    for(const role of ['astronaut','viewer','researcher','mission_control','flight_surgeon','system_admin']){
      await evaluate('document.querySelector("#login-role").value='+JSON.stringify(role));await click('#login-form button');
      if(role==='system_admin'){await wait('!!document.querySelector("#system-audit-content")');assert.equal(await evaluate('document.querySelectorAll(".crew-card").length'),0);}
      else{await wait('document.querySelectorAll(".crew-card").length==='+String(role==='astronaut'?1:6));if(role==='astronaut')assert.equal(await evaluate('document.querySelector(".crew-card").dataset.crew'),'CREW-03');}
      if(['astronaut','viewer','researcher'].includes(role)){
        assert.equal(await evaluate('fetch("/v1/crew/CREW-01/checkins").then(r=>r.status)'),403);
        if(role!=='astronaut'){await click('[data-page="agent"]');await click('#main [data-action="cognitive"]');await wait('/Private check-in history/.test(document.querySelector("#checkin-history").textContent)');assert.equal(await evaluate('document.querySelector("#reaction-target").disabled'),true);}
      }
      await click('[data-action="logout"]');await wait('!!document.querySelector("#login-form")');
    }
  });
  }
  assert.deepEqual(report.console_errors,[]);report.status='passed';
}catch(error){report.status=error.blocked?'blocked':'failed';report.reason=error.message;process.exitCode=error.blocked?2:1;}
finally{
  for(const timer of delayed)clearTimeout(timer);delayed.clear();
  if(browser&&browser.exitCode===null)await send('Browser.close',{},null).catch(()=>{});
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Acceptance run closed'));}pending.clear();
  if(browser&&browser.exitCode===null)await new Promise(resolve=>{browser.once('exit',resolve);browser.kill();const stop=setTimeout(()=>{browser.kill('SIGKILL');resolve();},2000);stop.unref();});
  if(app)await app.close();
  if(process.argv.includes('--p01')&&dbDirectory){copyFileSync(join(dbDirectory,'acceptance.sqlite'),join(directory,'fixture.sqlite'));report.synthetic_fixture='fixture.sqlite';}
  if(profile)rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});if(dbDirectory)rmSync(dbDirectory,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  if(process.argv.includes('--n10'))report.N10_cleanup={application_closed:!!app,browser_exited:!browser||browser.exitCode!==null||browser.signalCode!==null,profile_removed:!profile||!existsSync(profile),database_directory_removed:!dbDirectory||!existsSync(dbDirectory),Node_memory:process.memoryUsage(),N16_designated_starts:0,model_executions:0};
  report.finished_at=new Date().toISOString();writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,browser:report.browser?.product,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='failed'),screenshots:report.screenshots.length,reason:report.reason,report:join(directory,'report.json')},null,2));
}
