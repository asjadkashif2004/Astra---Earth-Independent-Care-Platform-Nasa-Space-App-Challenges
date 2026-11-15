import assert from 'node:assert/strict';
import { writeFileSync,mkdtempSync,rmSync,statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { demoWaveform,encodeCSV,encodeBinary } from '../packages/waveforms.mjs';
import { sha } from '../services/waveforms/service.mjs';
export async function n08Checks(c){
  const t=s=>'document.querySelector('+JSON.stringify(s)+')?.textContent',start=performance.now(),dir=mkdtempSync(join(tmpdir(),'astra-n08-browser-files-'));
  const set=(s,v,event='change')=>c.evaluate('(()=>{const e=document.querySelector('+JSON.stringify(s)+');e.value='+JSON.stringify(v)+';e.dispatchEvent(new Event('+JSON.stringify(event)+',{bubbles:true}));})()');
  const current=()=>new Date(c.app().engine.state.now).toISOString(),count=()=>c.app().store.db.prepare('SELECT count(*) n FROM waveform_sources').get().n;
  const load=async(before=current())=>{await set('#wave-before',before);await c.click('#wave-load');await c.wait(t('#wave-status')+'.startsWith("Loaded")');};
  const logged=async role=>{await set('#login-role',role);await c.click('#login-form button');await c.wait('!!document.querySelector(".app-shell")');await c.click('[data-page=waveforms]');await c.wait('!!document.querySelector("#wave-status")');};
  const file=async path=>{const {root}=await c.send('DOM.getDocument'),{nodeId}=await c.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#wave-file'});await c.send('DOM.setFileInputFiles',{nodeId,files:[path]});};
  let binaryID,csvID='SYN-browser-csv',firstHash,originalKnown,afterKnown;
  try{
    await c.check('N08 actual application empty/UNKNOWN and synthetic confirmation',async()=>{
      await logged('demo_admin');await c.wait(t('#wave-status')+'.startsWith("Loaded 0")');assert.ok(await c.evaluate(t('#wave-chart')+'.includes("UNKNOWN")'));
      await c.click('#wave-generate');assert.ok(await c.evaluate(t('#wave-status')+'.startsWith("Confirm")'));assert.equal(count(),0);await c.click('#wave-confirm');
    });
    await c.check('N08 genuine binary generate/validate/store/load/plot with source provenance',async()=>{
      await c.click('#wave-generate');await c.wait(t('#wave-status')+'.startsWith("Imported")');assert.equal(count(),1);binaryID=await c.evaluate('document.querySelector("#wave-source").value');
      const r=JSON.parse(c.app().store.db.prepare('SELECT json FROM waveform_sources').get().json);firstHash=r.original_sha256;assert.equal(r.meta.crew_id,'CREW-03');assert.equal(r.original_format,'binary');assert.equal(c.app().store.db.prepare('SELECT count(*) n FROM waveform_chunks').get().n,12);
      assert.ok(await c.evaluate('document.querySelector(".wave-signal").getAttribute("d").length>10'));assert.ok(await c.evaluate(t('#wave-quality')+'.includes("125 missing")'));assert.ok(await c.evaluate(t('#wave-provenance')+'.includes('+JSON.stringify(firstHash)+')'));assert.ok(await c.evaluate('document.querySelectorAll(".wave-gap").length>0'));
      c.report.N08_first_source={id:binaryID,original_sha256:firstHash,normalized_sha256:r.normalized_sha256,known_at:r.known_at};await c.shot('n08-ecg-gaps.png');
    });
    await c.check('N08 channel switching and bounded ranges preserve actual units/quality',async()=>{
      await set('#wave-channel','PPG');await c.wait(t('#wave-quality')+'.includes("PPG [arbitrary_unit]")');assert.ok(await c.evaluate(t('#wave-quality')+'.includes("100.0%")'));assert.ok(await c.evaluate(t('#wave-derived')+'.includes("BP: UNKNOWN")'));
      await set('#wave-channel','RESP');await c.wait(t('#wave-quality')+'.includes("RESP [arbitrary_unit]")');await set('#wave-channel','ECG');await c.wait(t('#wave-quality')+'.includes("ECG [mV]")');
      await set('#wave-from',8000);await set('#wave-until',12000);await c.click('#wave-range');await c.wait(t('#wave-chart')+'.includes("12000 ms")');assert.ok(await c.evaluate(t('#wave-quality')+'.includes("100.0%")'));
      await set('#wave-until',999999);await c.click('#wave-range');assert.ok(await c.evaluate(t('#wave-status')+'.startsWith("Invalid range")'));await set('#wave-until',20000);await set('#wave-from',0);await c.click('#wave-range');await c.wait(t('#wave-quality')+'.includes("125 missing")');
    });
    await c.check('N08 actual play/pause/resume/seek and native keyboard cursor',async()=>{
      await c.click('#wave-start');await c.wait(t('#wave-quality')+'.startsWith("UNKNOWN")');await c.click('#wave-play');await c.wait('Number(document.querySelector("#wave-seek").value)>300');await c.click('#wave-pause');
      const paused=await c.evaluate('document.querySelector("#wave-seek").value');await new Promise(r=>setTimeout(r,400));assert.equal(await c.evaluate('document.querySelector("#wave-seek").value'),paused);
      await c.click('#wave-play');await c.wait('Number(document.querySelector("#wave-seek").value)>'+Number(paused));await c.click('#wave-pause');
      await c.evaluate('document.querySelector("#wave-seek").focus()');const old=await c.evaluate('Number(document.querySelector("#wave-seek").value)');
      await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});assert.ok(await c.evaluate('Number(document.querySelector("#wave-seek").value)')>old);
      await set('#wave-seek',20000,'input');await c.wait(t('#wave-quality')+'.includes("125 missing")');
    });
    await c.check('N08 real file-picker CSV import, normalization, repeated import idempotency',async()=>{
      const d=demoWaveform('CREW-03',new Date(c.app().engine.state.now-60000).toISOString(),csvID,{gap:false}),bytes=encodeCSV(d.meta,d.frames),path=join(dir,'authored-synthetic.csv');writeFileSync(path,bytes);await set('#wave-format','csv');await file(path);await c.click('#wave-upload');await c.wait(t('#wave-status')+'.startsWith("Imported SYN-browser-csv")');assert.equal(count(),2);
      await set('#wave-source',csvID);await c.wait(t('#wave-provenance')+'.includes("SYN-browser-csv")');await c.wait(t('#wave-quality')+'.includes("100.0%")');await c.click('#wave-upload');await c.wait(t('#wave-status')+'.includes("idempotent")');assert.equal(count(),2);
      c.report.N08_CSV={bytes:bytes.length,sha256:sha(bytes)};await c.shot('n08-csv-complete.png');
    });
    await c.check('N08 malformed file fails visibly without partial import and valid input recovers',async()=>{
      const path=join(dir,'malformed.bin');writeFileSync(path,'not-a-waveform');await set('#wave-format','binary');await file(path);await c.click('#wave-upload');await c.wait(t('#wave-status')+'.startsWith("Import failed")');assert.equal(count(),2);assert.ok(c.app().store.db.prepare("SELECT count(*) n FROM audit_events WHERE action='waveform.rejected'").get().n>=1);
      await c.click('#wave-load');await c.wait(t('#wave-status')+'.startsWith("Loaded")');
    });
    await c.check('N08 source corrections and historical knowledge replay before/after correction',async()=>{
      originalKnown=current();const row=c.app().store.db.prepare('SELECT * FROM waveform_sources WHERE recording_id=?').get(csvID),prior=JSON.parse(row.json),d=demoWaveform('CREW-03',prior.meta.start_at,csvID,{gap:false});d.meta.revision=2;d.meta.supersedes_sha256=prior.original_sha256;d.frames[0]=4;
      c.app().engine.tick(1);afterKnown=current();const path=join(dir,'correction.csv');writeFileSync(path,encodeCSV(d.meta,d.frames));await set('#wave-before',afterKnown);await set('#wave-format','csv');await file(path);await c.click('#wave-upload');await c.wait(t('#wave-status')+'.startsWith("Imported SYN-browser-csv r2")');assert.equal(count(),3);
      await set('#wave-source',csvID);await c.wait(t('#wave-provenance')+'.includes("revision2")');await load(originalKnown);await set('#wave-source',csvID);await c.wait(t('#wave-provenance')+'.includes("revision1")');await load(afterKnown);await set('#wave-source',csvID);await c.wait(t('#wave-provenance')+'.includes("revision2")');
      await load('2026-11-14T00:00:00.000Z');assert.ok(await c.evaluate(t('#wave-chart')+'.includes("UNKNOWN")'));await load(afterKnown);
    });
    await c.check('N08 actual API failure/empty recovery and invalid cutoff feedback',async()=>{
      c.fault('/v1/crew/CREW-03/waveforms',503,'Injected archive failure');await c.click('#wave-load');await c.wait(t('#wave-status')+'.startsWith("Archive unavailable")');assert.ok(await c.evaluate(t('#wave-chart')+'.includes("UNAVAILABLE")'));await load();
      await set('#wave-before','not-a-date');await c.click('#wave-load');await c.wait(t('#wave-status')+'.startsWith("Archive unavailable")');await load();
    });
    await c.check('N08 cold application restart recovers originals/chunks/revisions without importing again',async()=>{
      const hashes=c.app().store.db.prepare('SELECT crew_id,recording_id,revision,json FROM waveform_sources ORDER BY recording_id,revision').all();const audit=c.app().store.db.prepare("SELECT count(*) n FROM audit_events WHERE action='waveform.ingested'").get().n;
      await c.restart();await c.click('#wave-load');await c.wait(t('#wave-status')+'.startsWith("Loaded 2")');assert.deepEqual(c.app().store.db.prepare('SELECT crew_id,recording_id,revision,json FROM waveform_sources ORDER BY recording_id,revision').all(),hashes);assert.equal(c.app().store.db.prepare("SELECT count(*) n FROM audit_events WHERE action='waveform.ingested'").get().n,audit);
      c.report.N08_recovery={revisions:count(),visible_sources:2,replayed_imports:0,original_hashes_unchanged:true};
    });
    await c.check('N08 four responsive viewports, accessible chart/labels and actual native Tab focus',async()=>{
      const evidence=[];
      for(const [w,h]of [[1920,1080],[1366,768],[768,1024],[390,844]]){await c.viewport(w,h);await c.settle();assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'overflow at '+w);assert.ok(await c.evaluate('!!document.querySelector("#wave-chart svg[role=img][aria-label]")'));await c.evaluate('document.querySelector("#wave-crew").focus()');
        for(let i=0;i<3;i++){await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});const e=await c.evaluate('(()=>{const e=document.activeElement;return {id:e.id,visible:e.matches(":focus-visible"),outline:getComputedStyle(e).outlineWidth}})()');assert.ok(e.visible&&parseFloat(e.outline)>=2);evidence.push({width:w,...e});}
        await c.shot('n08-'+w+'x'+h+'.png');c.report.viewports.push({page:'waveforms',width:w,height:h,document_overflow:false});}
      c.report.N08_native_keyboard=evidence;await c.viewport(1366,768);
    });
    await c.check('N08 crew switch, trusted astronaut scope and denied Viewer/Researcher',async()=>{
      await set('#wave-crew','CREW-01');await c.wait(t('#wave-status')+'.startsWith("Loaded 0")');assert.ok(await c.evaluate(t('#wave-chart')+'.includes("UNKNOWN")'));await set('#wave-crew','CREW-03');await c.wait(t('#wave-status')+'.startsWith("Loaded 2")');
      for(const role of ['astronaut','viewer','researcher']){await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-role")');await logged(role);
        if(role==='astronaut'){await c.wait(t('#wave-status')+'.startsWith("Loaded 2")');assert.equal(await c.evaluate('document.querySelector("#wave-crew").options.length'),1);assert.equal(await c.evaluate('fetch("/v1/crew/CREW-01/waveforms").then(r=>r.status)'),403);}
        else{assert.ok(await c.evaluate(t('#wave-status')+'.includes("Permission denied")'));assert.equal(await c.evaluate('document.querySelector("#wave-upload").disabled'),true);assert.equal(await c.evaluate('fetch("/v1/crew/CREW-03/waveforms").then(r=>r.status)'),403);}
      }
      await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-role")');await logged('demo_admin');await c.wait(t('#wave-status')+'.startsWith("Loaded 2")');
    });
    await c.check('N08 Earth exclusion, navigation cancellation and existing N10/Health Agent preserved',async()=>{
      await c.click('#wave-play');await c.click('[data-page=n10]');await c.wait('!!document.querySelector("#n10-status")');await c.wait(t('#n10-status')+'.startsWith("Loaded")');assert.equal(await c.evaluate('!!document.querySelector("#wave-chart")'),false);
      await c.click('[data-page=agent]');await c.wait('!!document.querySelector("#fixture-trace-heading")');assert.ok(await c.evaluate('document.querySelector("#main").textContent.includes("no language model")'));
      await c.click('[data-page=overview]');await c.click('[data-view=earth]');await c.click('[data-page=waveforms]');assert.ok(await c.evaluate(t('#wave-status')+'.includes("Earth view")'));assert.equal(await c.evaluate('document.querySelector("#wave-load").disabled'),true);
      await c.click('[data-page=overview]');await c.click('[data-view=spacecraft]');await c.click('[data-page=waveforms]');await c.wait(t('#wave-status')+'.startsWith("Loaded 2")');await c.shot('n08-final.png');
    });
    c.report.N08_resources={elapsed_ms:performance.now()-start,Node_memory:process.memoryUsage(),kernel_max_RSS_KiB:process.resourceUsage().maxRSS,source_revisions:count(),temporary_input_bytes:['authored-synthetic.csv','malformed.bin','correction.csv'].reduce((n,p)=>n+statSync(join(dir,p)).size,0),external_acquisition:0,N16_starts:0,model_runs:0};
  }finally{rmSync(dir,{recursive:true,force:true});c.report.N08_input_cleanup=true;}
}
