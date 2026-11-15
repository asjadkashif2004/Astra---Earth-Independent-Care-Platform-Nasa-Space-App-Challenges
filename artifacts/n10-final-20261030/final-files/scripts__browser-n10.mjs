import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ledger,digest } from '../services/n10/ledger.mjs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function n10Checks(c){
  const t=s=>'document.querySelector('+JSON.stringify(s)+')?.textContent';
  const set=async(selector,value)=>c.evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  const count=()=>c.app().store.db.prepare('SELECT COUNT(*) AS n FROM n10_records').get().n;
  const current=()=>new Date(c.app().engine.state.now).toISOString();
  const refresh=async(before=current())=>{await set('.n10-controls [name=before]',before);await c.click('#n10-load');await c.wait(t('#n10-status')+'.startsWith("Loaded")');};
  async function login(role){
    await set('#login-role',role);await c.click('#login-form button');await c.wait('!!document.querySelector(".app-shell")');
    await c.click('[data-page=n10]');await c.wait('!!document.querySelector("#n10-status")');
  }
  async function record(kind,id,values){
    await set('#n10-record [name=kind]',kind);await set('#n10-record [name=id]',id);await set('#n10-record [name=expected_revision]',0);
    for(const [key,value] of Object.entries(values))await set('#n10-fields [name="'+key+'"]',value);
    const n=count();await c.click('#n10-record button.primary');await c.wait(t('#n10-status')+'.startsWith("Saved")');assert.equal(count(),n+1);
  }
  const revisions=[];
  await c.check('N10 actual application navigation, denied consent, skip/cancel and approximate device notice',async()=>{
    await login('demo_admin');await c.wait(t('#n10-status')+'.startsWith("Loaded")');
    assert.ok(await c.evaluate(t('#n10-movement')+'.includes("UNKNOWN")'));
    assert.ok(await c.evaluate(t('.n10-private')+'.includes("Browser/device timing is approximate")'));
    await c.click('#n10-consent button[value=declined]');await c.wait(t('#n10-consent-state')+'.includes("declined")');
    assert.equal(await c.evaluate('document.querySelector("#n10-target").disabled'),true);
    for(const value of ['skipped','cancelled']){
      await c.click('#n10-checkin button[value='+value+']');await c.wait(t('#n10-status')+'.startsWith("Saved")');
      const r=ledger(c.app().store,'CREW-03').at(-1);assert.equal(r.data.status,value);assert.equal(r.data.trials.length,0);assert.equal(r.data.mood,null);
    }
    await c.shot('n10-consent-declined.png');
  });
  await c.check('N10 real consent, early click and out-of-range timing exclusion',async()=>{
    await c.click('#n10-consent input[name=mood]');await c.click('#n10-consent input[name=fatigue]');
    await c.click('#n10-consent button[value=granted]');await c.wait(t('#n10-consent-state')+'.includes("granted")');
    await c.click('#n10-target');await c.click('#n10-target');assert.ok(await c.evaluate(t('#n10-target')+'.includes("Too early")'));
    assert.ok(await c.evaluate(t('#n10-trials')+'.includes("No task")'));
    await c.click('#n10-target');await c.wait(t('#n10-target')+'.startsWith("NOW")');await pause(3150);await c.click('#n10-target');
    assert.ok(await c.evaluate(t('#n10-trials')+'.includes("Out of range")'));assert.ok(await c.evaluate(t('#n10-trials')+'.includes("0")'));
  });
  await c.check('N10 four genuine five-trial browser sessions and same-device personal reference',async()=>{
    const measured=[];
    for(let session=0;session<4;session++){
      c.app().engine.tick(1);await refresh();
      for(let trial=0;trial<5;trial++){
        await c.click('#n10-target');await c.wait(t('#n10-target')+'.startsWith("NOW")');await pause(180);await c.click('#n10-target');
      }
      assert.ok(await c.evaluate(t('#n10-target')+'.includes("Five trials complete")'));
      await set('#n10-checkin [name=mood]',3);await set('#n10-checkin [name=fatigue]',4);
      const n=count();await c.click('#n10-save-task');await c.wait(t('#n10-status')+'.startsWith("Saved")');assert.equal(count(),n+1);
      const r=ledger(c.app().store,'CREW-03').at(-1);
      assert.equal(r.kind,'checkin');assert.equal(r.source.kind,'browser_task');assert.equal(r.data.trials.length,5);
      assert.ok(r.data.trials.every(x=>x>=100&&x<=3000));measured.push({id:r.id,trials:r.data.trials,hash:r.hash,source_at:r.source_at,known_at:r.known_at});
    }
    assert.ok(await c.evaluate(t('#n10-reference')+'.startsWith("KNOWN")'));
    c.report.N10_actual_browser_trials=measured;await c.shot('n10-personal-reference.png');
  });
  await c.check('N10 stage/schedule editor, source-bound aggregation and delayed correction replay',async()=>{
    await record('stage','stage-ui-a',{start_at:'2026-11-14T01:00:00.000Z',end_at:'2026-11-14T02:00:00.000Z',label:'Sleep stage 2'});
    await record('stage','stage-ui-b',{start_at:'2026-11-14T02:00:00.000Z',end_at:'2026-11-14T03:00:00.000Z',label:'Sleep stage R'});
    await record('schedule','schedule-ui',{start_at:'2026-11-13T23:00:00.000Z',end_at:'2026-11-14T07:00:00.000Z',effective_from:'2026-11-14',effective_to:'2026-11-14',reference_hours:8});
    assert.ok(await c.evaluate(t('#n10-stage-summary')+'.includes("PARTIAL")'));assert.ok(await c.evaluate(t('#n10-sleep-summary')+'.includes("Planned 8")'));
    assert.ok(await c.evaluate(t('#n10-deficit')+'.includes("UNKNOWN")'),'Missing prior days withhold cumulative result');
    await set('.n10-controls [name=days]',1);await refresh();
    assert.equal(await c.evaluate(t('#n10-deficit')+'.includes("UNKNOWN")'),false,'One covered day has a descriptive result');
    const before=current();c.app().engine.tick(1);
    await c.evaluate('(()=>{const row=[...document.querySelectorAll(".n10-history-row")].find(e=>e.textContent.includes("stage-ui-a r1"));row.querySelector("[data-n10-edit]").click()})()');
    await set('#n10-fields [name=label]','Sleep stage W');await c.click('#n10-record button.primary');await c.wait(t('#n10-status')+'.startsWith("Saved")');
    const after=current();await refresh(before);
    assert.ok(await c.evaluate(t('#n10-results')+'.includes("Sleep stage 2")'));
    assert.equal(await c.evaluate(t('#n10-results')+'.includes("Sleep stage W")'),false);
    await refresh(after);assert.ok(await c.evaluate(t('#n10-results')+'.includes("Sleep stage W")'));
    revisions.push({id:'stage-ui-a',before,after});await c.shot('n10-sleep-replay.png');
  });
  await c.check('N10 exercise input, transparent adherence and explicit unknown movement',async()=>{
    await record('exercise_plan','exercise-plan-ui',{target_minutes:30});
    assert.ok(await c.evaluate(t('#n10-adherence')+'.includes("UNKNOWN")'));
    await record('exercise','exercise-ui',{plan_id:'exercise-plan-ui',plan_revision:1,end_at:'2026-11-14T06:45:00.000Z'});
    assert.ok(await c.evaluate(t('#n10-adherence')+'.includes("100%")'));
    assert.ok(await c.evaluate(t('#n10-movement')+'.includes("UNKNOWN")'));
    await record('movement','movement-ui',{steps:230});
    assert.ok(await c.evaluate(t('#n10-movement')+'.includes("230 steps")'));
    await c.shot('n10-countermeasures.png');
  });
  await c.check('N10 save failure retains inputs and never reports a committed result',async()=>{
    await set('#n10-record [name=kind]','stage');await set('#n10-record [name=id]','failed-ui-record');await set('#n10-record [name=expected_revision]',0);
    const n=count();c.fault('/v1/n10/crew/CREW-03/records',503,'Synthetic persistence failure control');
    await c.click('#n10-record button.primary');await c.wait(t('#n10-status')+'.startsWith("SAVE FAILED")');
    assert.equal(count(),n);assert.equal(await c.evaluate('document.querySelector("#n10-record [name=id]").value'),'failed-ui-record');
  });
  await c.check('N10 responsive keyboard controls, crew switching and no cross-crew result reuse',async()=>{
    for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]){
      await c.viewport(width,height);assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      await c.settle();
      // Native date fields contain browser-owned segmented focus stops. Test
      // explicit application controls instead of assuming one Tab leaves one.
      await c.evaluate('document.querySelector(".n10-controls [name=before]").focus()');
      for(const [shift,expected] of [[false,'days'],[false,'n10-load'],[true,'days']]){
        await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});
        await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});
        const focus=await c.evaluate('(()=>{const e=document.activeElement;return{target:e.id||e.name,element:e.outerHTML.slice(0,300),visible:e.matches(":focus-visible"),outline:getComputedStyle(e).outlineWidth,page_focused:document.hasFocus()}})()');
        (c.report.N10_keyboard_transitions??=[]).push({width,height,shift,expected,...focus});
        assert.equal(focus.target,expected,'Native Tab target '+JSON.stringify(focus));
        assert.ok(focus.page_focused&&focus.visible&&parseFloat(focus.outline)>=2,'Native focus '+JSON.stringify(focus));
      }
      c.report.viewports.push({page:'N10',width,height,overflow:false,keyboard_focus:true});await c.shot('n10-'+width+'.png');
    }
    await c.viewport(1366,768);await set('[name=n10_crew]','CREW-01');await c.wait(t('#n10-crew')+'==="CREW-01"');await c.wait(t('#n10-status')+'.startsWith("Loaded")');
    assert.ok(await c.evaluate(t('#n10-results')+'.includes("no supplied stage")'));assert.equal(await c.evaluate(t('#n10-history')+'.includes("stage-ui-a")'),false);
    await set('[name=n10_crew]','CREW-03');await c.wait(t('#n10-crew')+'==="CREW-03"');await c.wait(t('#n10-status')+'.startsWith("Loaded")');
  });
  await c.check('N10 consent withdrawal removes optional raw history, cancels task and blocks collection',async()=>{
    await c.click('#n10-target');await c.click('#n10-consent button[value=withdrawn]');await c.wait(t('#n10-consent-state')+'.includes("withdrawn")');
    assert.equal(await c.evaluate('document.querySelector("#n10-target").disabled'),true);
    const proof=await c.evaluate('fetch("/v1/n10/crew/CREW-03").then(r=>r.json()).then(v=>({history:v.cognition.history.length,reference:v.cognition.reference.status,consent:v.cognition.status}))');
    assert.equal(proof.history,0);assert.equal(proof.reference,'UNKNOWN');assert.equal(proof.consent,'WITHDRAWN');
    await c.shot('n10-consent-withdrawn.png');
  });
  await c.check('N10 real restart/recovery preserves committed ledger without replay or read-side writes',async()=>{
    const rows=ledger(c.app().store,'CREW-03'),hash=digest(rows),n=count();await c.restart();
    assert.equal(digest(ledger(c.app().store,'CREW-03')),hash);assert.equal(count(),n);
    await c.wait('!!document.querySelector("#n10-status")');await refresh();
    c.report.N10_recovery={records:rows.length,ledger_sha256:hash,replayed_writes:0,source:'fresh disposable synthetic browser database'};
    c.report.N10_correction_cutoffs=revisions;
    writeFileSync(join(c.directory,'n10-records.json'),JSON.stringify(rows,null,2)+'\n');
  });
  await c.check('N10 real unauthorised-role denial and astronaut self scope',async()=>{
    await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-form")');await login('viewer');
    await c.wait(t('#n10-status')+'.startsWith("UNAVAILABLE")');assert.ok(await c.evaluate(t('#n10-results')+'.includes("UNKNOWN")'));
    assert.equal(await c.evaluate('document.querySelector("#n10-record button.primary").disabled'),true);
    assert.equal(await c.evaluate('fetch("/v1/n10/crew/CREW-03").then(r=>r.status)'),403);
    await c.click('[data-action=logout]');await c.wait('!!document.querySelector("#login-form")');await login('astronaut');
    await c.wait(t('#n10-status')+'.startsWith("Loaded")');
    assert.equal(await c.evaluate('document.querySelector("[name=n10_crew]").options.length'),1);
    assert.equal(await c.evaluate('fetch("/v1/n10/crew/CREW-01").then(r=>r.status)'),403);
  });
}
