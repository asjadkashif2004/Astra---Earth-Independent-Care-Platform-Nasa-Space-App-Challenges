/* N04-P01 isolated browser measurements; no runtime application imports this module. */
import assert from 'node:assert/strict';
import { writeFileSync,readFileSync,existsSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { cpus,totalmem,release } from 'node:os';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { attachProfiler,queueStats,precondition,percentile } from './n04-p01-profile.mjs';
import { installP01Probe } from './n04-p01-probe.mjs';
import { frameEvidence,metricPresentationEvidence } from './frame-evidence.mjs';
import { createTrialJournal,persistRawTrial,correlateMeasuredSamples } from './n04-p01-correlation.mjs';
import { startTrialGuard,captureTrialFailureContext,GUARD_LIMITS } from './n04-p01-trial-guard.mjs';
import { createUserAssistedStartup,USER_READY_WAIT_MS } from './n04-p01-startup.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const option=(key,fallback)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
export async function p01Checks(c){
  const baseline=option('task','matrix')==='baseline',smoke=process.argv.includes('--smoke'),rate=Number(option('rate','1')),context=option('context','overview'),trials=Number(option('trials',baseline||smoke?'1':'3')),firstTrial=Number(option('first-trial','1')),modes=option('modes',baseline?'standard':'standard,performance').split(','),seconds=smoke?3:60;
  assert.ok([1,30].includes(rate));assert.ok(['overview','crew'].includes(context));assert.ok(modes.every(m=>['standard','performance'].includes(m)));assert.ok(Number.isInteger(trials)&&trials>=1&&trials<=3&&Number.isInteger(firstTrial)&&firstTrial>=1&&firstTrial+trials<=4);
  c.report.scope='N04-P01 '+(baseline?'unchanged-backend reproduction':'latency matrix');c.report.headed=process.argv.includes('--headed');c.report.protocol={rate,context,trials,firstTrial,modes,seconds,warmup_seconds:10,viewport:[1920,1080],scalar_observations_per_second:60,diagnostic_only:smoke,clock:'Host1Hz deadlines;source/host receipt/DOM/compositor/capture clocks retained separately',capture:'Actual browser PNG completion is a conservative rendered-capture bound,not physical panel timing. Offline OCR validates visible captured text separately.'};
  c.report.protocol.instrumentation_version='p01-explicit-batches-focus-3';
  c.report.protocol.continuous_guard={...GUARD_LIMITS,required:c.report.headed,method:'Sticky page lifecycle events and periodic focus/visibility checks;one read-only native foreground observer;first failure aborts;no reactivation or retry'};
  if(c.report.headed){assert.equal(process.platform,'win32','Headed acceptance requires supported native ownership monitoring');assert.ok(process.argv.includes('--native-foreground'),'Headed acceptance requires --native-foreground');}
  c.report.protocol.user_assisted_startup={required:c.report.headed,operator_wait_cap_ms:USER_READY_WAIT_MS,scope:'Unmeasured preparation;explicit READY inside owned Chrome once per process;fresh native/page checks every trial;no retry or inherited confirmation'};
  c.report.protocol.raw_evidence='Per-batch raw.jsonl writes and pre-summary raw.json;observer I/O remains part of host scheduling,not a physical presentation measurement';
  c.report.source_hashes=Object.fromEntries(['services/comms/scheduler.mjs','services/api/engine.mjs','services/api/store.mjs','apps/mission-control-web/app.mjs','apps/mission-control-web/mission.css','apps/mission-control-web/scenes.mjs','scripts/browser-n04-p01.mjs','scripts/n04-p01-probe.mjs','scripts/n04-p01-correlation.mjs','scripts/n04-p01-profile.mjs','scripts/n04-p01-trial-guard.mjs','scripts/n04-p01-native-ownership.ps1','scripts/n04-p01-focus.ps1','scripts/n04-p01-startup.mjs','scripts/n04-p01-startup-inspect.ps1'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
  c.report.hardware={cpu:cpus()[0].model,logical_cpus:cpus().length,total_ram:totalmem(),os:release(),chrome:await c.send('SystemInfo.getInfo',{},null),host_placement:'Windows Node/SQLite/Chrome co-located;disposable database/profile',thermal:'Not instrumented'};
  c.report.protocol.png_encoding={lossless:true,optimizeForSpeed:true,scale:'min(2,2500/visible numeric union width);application viewport/render quality unchanged'};
  if(process.platform==='win32'){
    const power=spawnSync('powercfg.exe',['/getactivescheme'],{encoding:'utf8'});c.report.hardware.power_plan={status:power.status,stdout:power.stdout,stderr:power.stderr};
    const display=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate | ConvertTo-Json -Compress'],{encoding:'utf8'});c.report.hardware.display_configuration={status:display.status,stdout:display.stdout,stderr:display.stderr};
  }
  c.report.transport=[];c.report.trials=[];c.report.ocr_manifest=[];
  c.app().server.prependListener('request',(req,res)=>{
    if(!req.url.startsWith('/v1/stream/missions/'))return;
    const old=res.write;res.write=function(chunk,...args){
      const data=String(chunk);let snap;
      if(data.startsWith('event: snapshot\ndata: '))snap=JSON.parse(data.slice(22));
      const started=Date.now(),begin=performance.now();try{return old.call(this,chunk,...args);}finally{if(snap)c.report.transport.push({observed_at:snap.mission.spacecraft_time,server_snapshot_at:snap.server_received_at,write_started_host_ms:started,write_returned_host_ms:Date.now(),write_call_ms:performance.now()-begin,bytes:Buffer.byteLength(data)});}
    };
  });
  const target=Number(option('prefill','840')),prefillStep=Number(option('prefill-step',String(rate)));c.report.protocol.preconditioning={target_tick:target,mission_step:prefillStep,fast_build_only:true};c.report.queue_before_precondition=queueStats(c.app().engine);await precondition(c.app().engine,Math.max(0,target-c.app().engine.state.tick),prefillStep);c.report.queue_after_precondition=queueStats(c.app().engine);
  await c.evaluate('('+installP01Probe.toString()+')()');
  await c.evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');await c.wait('document.querySelectorAll(".crew-card").length===6');
  if(context==='crew'){await c.click('[data-page="crew"]');await c.wait('document.querySelectorAll("#crew-metric-tiles .metric-tile").length===6');}
  const arrange=async()=>{
    if(context==='overview')await c.evaluate('document.querySelector("#crew-grid").scrollIntoView({block:"center",behavior:"instant"})');
    else await c.evaluate('window.scrollTo({top:0,behavior:"instant"})');
  };
  const startup=c.report.headed?createUserAssistedStartup({c,pid:c.browserPid(),activate:trial=>{
    const focus=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('scripts/n04-p01-focus.ps1'),'-TestPid',String(c.browserPid())],{encoding:'utf8',windowsHide:true,timeout:GUARD_LIMITS.startup_ms});
    (c.report.native_foreground_attempts??=[]).push({trial,host_at_ms:Date.now(),status:focus.status,stdout:focus.stdout,stderr:focus.stderr,error:focus.error?.message});return focus;
  },record:entry=>{
    (c.report.startup_checkpoints??=[]).push(entry);
    writeFileSync(join(c.directory,entry.trial+'.startup.json'),JSON.stringify(entry,null,2)+'\n',{flag:'wx'});
  }}):null;
  let profiler=attachProfiler(c.app().engine);
  try{await c.check('N04-P01 source-correlated telemetry,visible capture and raw compositor traces',async()=>{
    for(const mode of modes){
      const reduced=await c.evaluate('document.body.classList.contains("performance-mode")');if(reduced!==(mode==='performance'))await c.click('[data-action="graphics"]');
      assert.equal(await c.evaluate('document.body.classList.contains("performance-mode")'),mode==='performance');
      assert.equal(await c.evaluate('document.body.classList.contains("reduce-motion")'),false);
      for(let trial=firstTrial;trial<firstTrial+trials;trial++){
        const name=rate+'x-'+context+'-'+mode+'-'+trial;
        await arrange();
        if(process.argv.includes('--headed')){const windowInfo=await c.send('Browser.getWindowForTarget');await c.send('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:'normal'}});}
        await c.send('Page.bringToFront');
        const finishLayout=async()=>{
          if(process.argv.includes('--fullscreen')){assert.ok(process.argv.includes('--headed'));const windowInfo=await c.send('Browser.getWindowForTarget');await c.send('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:'fullscreen'}});}
          if(c.report.headed)await c.viewport(1920,1080);
          await c.settle();await arrange();await c.wait('document.visibilityState==="visible"');
        };
        if(startup)await startup.run(name,finishLayout);
        else{assert.ok(!process.argv.includes('--native-foreground'),'Native foreground requires headed Windows Chrome');await finishLayout();}
        await c.evaluate('window.__p01.recording=false;window.__p01.pending=[]');
        for(let i=0;i<10;i++){await sleep(1000);c.app().engine.tick(rate);c.app().broadcast();}
        const warmupObserved=new Date(c.app().engine.state.now).toISOString();
        await c.wait('window.__p01.last_snapshot_observed_at==='+JSON.stringify(warmupObserved));
        const measuredBatches=Array.from({length:seconds},(_,i)=>new Date(c.app().engine.state.now+(i+1)*rate*1000).toISOString());
        await arrange();await c.evaluate('window.__p01.beginTrial('+JSON.stringify(measuredBatches)+')');
        const before=queueStats(c.app().engine),sampleStart=profiler.samples.length;
        const sceneBefore=await c.evaluate('(()=>{const canvas=document.querySelector("#main canvas"),r=canvas?.getBoundingClientRect();return {draw_submissions:{...window.__p01.draws},mode:document.querySelector("#scene-mode")?.textContent,canvas_rect:r?{x:r.x,y:r.y,width:r.width,height:r.height,visible_height:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))}:null,performance:document.body.classList.contains("performance-mode"),reduced_motion:document.body.classList.contains("reduce-motion")}})()');
        sceneBefore.native_window=await c.send('Browser.getWindowForTarget');
        const journal=createTrialJournal(c.directory,name,{name,rate,context,mode,trial,before,scene_workload:sceneBefore,measured_batches:measuredBatches});
        const captures=[],host=[];
        let guard;try{
        if(c.report.headed)guard=await startTrialGuard({c,pid:c.browserPid(),failureContext:()=>captureTrialFailureContext({trial:name,profiles:profiler.samples,profileStart:sampleStart,host}),record:(type,data)=>{
          if(type==='guard_failure'){
            const failure={trial:name,...data};(c.report.guard_failures??=[]).push(failure);
            journal(type,data);
            writeFileSync(join(c.directory,name+'.failure.json'),JSON.stringify(failure,null,2)+'\n',{flag:'wx'});
          }else journal(type,data);
        }});
        const guarded=action=>guard?guard.checkpoint(action):action();
        await guarded(()=>c.send('Tracing.start',{traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:262144,includedCategories:['disabled-by-default-devtools.timeline.frame','blink.user_timing'],excludedCategories:['*']},transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'gzip'}));
        await guarded(()=>c.evaluate(`performance.mark(${JSON.stringify(name+'-start')})`));
        const start=performance.now();let unexpectedLogged=0;
        for(let second=0;second<seconds;second++){
          const stopFile=option('stop-file',null);if(stopFile&&existsSync(stopFile))throw Error('Cooperative test stop requested;partial trial is not acceptance');
          await guarded(()=>sleep(Math.max(0,start+(second+1)*1000-performance.now())));
          assert.equal(await guarded(()=>c.evaluate('document.visibilityState')),'visible','Trial obscured/hidden;invalid workload,not a latency result');
          if(context==='crew'&&second%10===0){await guarded(()=>c.evaluate('window.__p01.recording=false;window.__p01.pending=[]'));await guarded(()=>c.click('.crew-tab[data-crew="CREW-0'+(Math.floor(second/10)+1)+'"]'));await guarded(arrange);await guarded(()=>c.evaluate('window.__p01.recording=true'));}
          guard?.assertHealthy();
          const begin=performance.now(),at=Date.now();c.app().engine.tick(rate);const done=Date.now();c.app().broadcast();
          const observed=new Date(c.app().engine.state.now).toISOString();host.push({second,started_host_ms:at,completed_host_ms:done,tick_ms:performance.now()-begin,deadline_lateness_ms:begin-start-(second+1)*1000,observed_at:observed});
          journal('host',{host:host.at(-1)});assert.equal(observed,measuredBatches[second],'Actual tick must match declared measured batch');
          await guarded(()=>c.wait(`window.__p01.samples.filter(s=>s.snapshot_observed_at===${JSON.stringify(observed)}).length===${context==='overview'?22:6}`));
          const batch=await guarded(()=>c.evaluate(`({samples:window.__p01.samples.filter(s=>s.snapshot_observed_at===${JSON.stringify(observed)}),out_of_window:window.__p01.out_of_window.slice(${unexpectedLogged})})`)),samples=batch.samples;
          if(batch.out_of_window.length){journal('out_of_window',{observations:batch.out_of_window});unexpectedLogged+=batch.out_of_window.length;}
          assert.ok(samples.every(s=>s.visible&&s.unobscured),'Every sampled numeric text must actually be visible and unobscured');
          const left=Math.floor(Math.min(...samples.map(s=>s.rect.x))-3),top=Math.floor(Math.min(...samples.map(s=>s.rect.y))-3),right=Math.ceil(Math.max(...samples.map(s=>s.rect.x+s.rect.width))+3),bottom=Math.ceil(Math.max(...samples.map(s=>s.rect.y+s.rect.height))+3);
          const scroll=await guarded(()=>c.evaluate('({x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scale:visualViewport?.scale})'));
          const scale=Math.min(2,2500/(right-left)),file=name+'-'+second+'.png',shot=await guarded(()=>c.send('Page.captureScreenshot',{format:'png',optimizeForSpeed:true,captureBeyondViewport:false,clip:{x:left+scroll.x,y:top+scroll.y,width:right-left,height:bottom-top,scale}})),completed=Date.now();
          writeFileSync(join(c.directory,file),Buffer.from(shot.data,'base64'));c.report.screenshots.push(file);
          captures.push({second,observed_at:observed,file,capture_completed_host_ms:completed,metric_ids:samples.map(s=>s.id),viewport:scroll});
          journal('capture',{capture:captures.at(-1),samples});
          c.report.ocr_manifest.push({file,path:resolve(c.directory,file),targets:samples.map(s=>({id:s.id,crew_id:s.crew_id,metric:s.metric,expected:s.expected_numeric,rect:{x:(s.rect.x-left)*scale,y:(s.rect.y-top)*scale,width:s.rect.width*scale,height:s.rect.height*scale}}))});
          if((second+1)%20===0)console.log(name+': '+(second+1)+'/'+seconds+'s');
        }
        await guarded(()=>c.evaluate(`window.__p01.recording=false;performance.mark(${JSON.stringify(name+'-end')})`));
        const monitoringGuard=guard?await guard.finish():{applicable:false,reason:'Headless diagnostic;no headed ownership certification'};
        await sleep(250);
        const tracingDone=new Promise(resolve=>{const off=c.on('Tracing.tracingComplete',p=>{off();resolve(p);});});await c.send('Tracing.end');const traceInfo=await tracingDone,chunks=[];let chunk;
        do{chunk=await c.send('IO.read',{handle:traceInfo.stream,size:1048576});chunks.push(Buffer.from(chunk.data,chunk.base64Encoded?'base64':'utf8'));}while(!chunk.eof);await c.send('IO.close',{handle:traceInfo.stream});const bytes=Buffer.concat(chunks);writeFileSync(join(c.directory,name+'.trace.json.gz'),bytes);
        const probe=await c.evaluate('({samples:window.__p01.samples,out_of_window:window.__p01.out_of_window})');
        const evidence={name,rate,context,mode,trial,before,after:queueStats(c.app().engine),host,profile:profiler.samples.slice(sampleStart),...probe,captures,transport:c.report.transport,measured_batches:measuredBatches,monitoring_guard:monitoringGuard,scene_workload:sceneBefore,trace:name+'.trace.json.gz',trace_data_loss:traceInfo.dataLossOccurred??null};
        persistRawTrial(c.directory,evidence);
        const {samples,out_of_window}=correlateMeasuredSamples(evidence,context==='overview'?22:6),raw=JSON.parse(gunzipSync(bytes));
        const record={name,rate,context,mode,trial,before,after:evidence.after,host,profile:evidence.profile,samples,out_of_window,captures,monitoring_guard:monitoringGuard,frame_evidence:frameEvidence(raw.traceEvents,name+'-start',seconds),metric_compositor:metricPresentationEvidence(raw.traceEvents,samples),trace:evidence.trace,trace_data_loss:evidence.trace_data_loss,summary:{dom_p95_ms:percentile(samples.map(s=>s.dom_delay_ms)),rendered_capture_bound_p95_ms:percentile(samples.map(s=>s.capture_bound_ms))}};
        record.scene_workload={before:sceneBefore,after_draw_submissions:await c.evaluate('({...window.__p01.draws})'),limitation:'Draw submissions demonstrate an active scene only;they are not presented FPS or physical scanout'};
        c.report.trials.push(record);writeFileSync(join(c.directory,'ocr-manifest.json'),JSON.stringify(c.report.ocr_manifest,null,2)+'\n');writeFileSync(join(c.directory,'partial.json'),JSON.stringify(c.report,null,2)+'\n');console.log(name+' '+JSON.stringify(record.summary));
        }finally{await guard?.dispose();}
      }
    }
  });}finally{c.report.probe_debug=await c.evaluate('({cache:JSON.parse(localStorage.getItem("astra-synthetic-snapshot")??"null"),packets:window.__p01?.packets,pending:window.__p01?.pending,samples:window.__p01?.samples?.slice(-24),out_of_window:window.__p01?.out_of_window,nodes:window.__p01?.pending?.map(s=>({selector:s.selector,expected:s.expected,actual:document.querySelector(s.selector)?.textContent,stamp:s.stamp}))})').catch(()=>null);profiler.restore();}
}
