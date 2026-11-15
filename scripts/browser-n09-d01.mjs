/* One short real-browser functional slice; no N04 performance/acceptance matrix. */
import assert from 'node:assert/strict';
import { DEMO_HR } from '../packages/contracts.mjs';

export async function n09Checks(c) {
  const layoutOnly=process.argv.includes('--n09-layout-only');
  const text = selector => `document.querySelector(${JSON.stringify(selector)})?.textContent`;
  const go = async page => { await c.click(`[data-page="${page}"]`); await c.wait(`!!document.querySelector('#main h1')`); };
  let runId, riskId, messageId;
  await c.check('N09-D01 real selector, fixed profile, keyboard focus and two viewport layouts', async () => {
    await c.evaluate('document.querySelector("#login-role").value="demo_admin";document.querySelector("#login-form").requestSubmit()');
    await c.wait('document.querySelectorAll(".crew-card").length===6'); await go('scenario');
    assert.equal(await c.evaluate('document.querySelectorAll("#demo-target option").length'), 6);
    await c.evaluate('document.querySelector("#demo-target").value="CREW-01";document.querySelector("#demo-target").dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("#demo-target").focus()');
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await c.evaluate('document.activeElement.matches(":focus-visible")&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2'));
    for(const [width,height] of [[1920,1080],[390,844]]) {
      await c.viewport(width,height);
      assert.ok(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
      const box=await c.evaluate('(()=>{const r=document.querySelector("#demo-target").getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,viewport:innerWidth}})()');
      assert.ok(box.left>=0&&box.right<=box.viewport+1&&box.width>100);
      if(width===390&&layoutOnly)assert.ok(box.width>250,'Final mobile selector uses its available full column');
      c.report.viewports.push({page:'Scenario Lab N09-D01',width,height,document_overflow:false});await c.shot('scenario-'+width+'x'+height+'.png');
      if(width===390&&layoutOnly){await c.evaluate('document.querySelector(".scenario-demo").scrollIntoView({block:"start",behavior:"instant"})');await c.shot('scenario-controls-mobile.png');}
    }
    if(layoutOnly)return;
    await c.viewport(1366,768);await c.click(`[data-scenario="${DEMO_HR.id}"]`);
    await c.wait(text('#demo-status')+'.includes("PENDING")');
    runId=c.app().engine.state.runId;assert.equal(c.app().engine.demoSummary().target_crew_id,'CREW-01');
    c.report.profile=c.app().engine.demoSummary();await c.shot('scenario-pending.png');
  });
  if(layoutOnly)return;
  await c.check('N09-D01 actual persistence, synchronized displays, template and human acknowledgement',async()=>{
    for(let i=0;i<6;i++){c.app().engine.tick(30);c.app().broadcast();}
    await c.wait(text('#demo-status')+'.includes("DETECTED")');const d=c.app().engine.demoSummary();riskId=d.risk.id;
    const risk=c.app().store.record('risk_events',riskId);assert.equal(risk.run_id,runId);assert.equal(risk.crew_id,'CREW-01');
    assert.ok(risk.evidence.some(e=>e.rules.includes('persistent_single_signal')&&e.single_persistence_seconds>=120));
    c.report.detector=risk;await c.shot('scenario-detected.png');
    const hr=c.app().engine.state.crew[0].values.heart_rate.toFixed(0);
    await go('overview');await c.wait('document.querySelector("[data-crew=CREW-01] .crew-hr span")?.textContent==='+JSON.stringify(hr));
    await c.click('[data-crew="CREW-01"]');await c.wait(text('#main h1')+'==="Elena Voss"');
    await c.wait(text('#crew-metric-tiles .metric-tile p')+'.startsWith('+JSON.stringify(hr)+')');
    await c.app().engine.enrichPending();c.app().broadcast();
    await go('comms');await c.click('[data-action="blackout"]');await c.wait(text('#comms-state')+'==="BLACKOUT"');
    await c.evaluate('document.querySelector("#comms-form [name=delay]").value="1";document.querySelector("#comms-form [name=jitter]").value="0";document.querySelector("#comms-form").requestSubmit()');
    await c.wait('document.querySelector("#comms-delay").textContent.startsWith("1.0")');
    await go('agent');await c.wait('!!document.querySelector("[data-ack='+riskId+']:not([disabled])")');
    assert.ok((await c.evaluate(text('#main'))).includes('no language model'));
    assert.equal(c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case').length,0);
    await c.click(`[data-ack="${riskId}"]`);await c.wait(text('#cases-content')+'.includes("Human acknowledged")');
    const messages=c.app().store.list('comms_messages',1000).filter(m=>m.kind==='case');assert.equal(messages.length,1);messageId=messages[0].id;
    c.report.display_match={crew_id:'CREW-01',overview_hr:hr,crew_health_hr:hr,matched:true};await c.shot('case-human-acknowledged.png');
  });
  await c.check('N09-D01 stop retains blackout/queue and Earth shows no unreceived alert before delayed delivery',async()=>{
    await go('scenario');await c.click('[data-stop-scenario]');await c.wait(text('#active-scenario')+'==="nominal"');
    assert.equal(c.app().engine.comms.config.blackout,true);assert.equal(c.app().store.record('comms_messages',messageId).status,'queued');
    await c.click('[data-view="earth"]');assert.ok((await c.evaluate(text('#demo-status'))).includes('withheld'));
    assert.ok(!(await c.evaluate(text('#demo-evidence'))).includes(riskId));
    await go('overview');assert.equal(c.app().engine.state.ground,null);assert.equal(await c.evaluate('document.querySelectorAll(".crew-card.gray").length'),6);
    await go('comms');await c.click('[data-action="blackout"]');await c.wait(text('#comms-state')+'==="LINK AVAILABLE"');
    c.app().engine.tick(30);c.app().broadcast();assert.equal(c.app().store.record('comms_messages',messageId).received_at,null);
    for(let i=0;i<5&&!c.app().store.record('comms_messages',messageId).received_at;i++){c.app().engine.tick(30);c.app().broadcast();}
    const delivered=c.app().store.record('comms_messages',messageId);assert.equal(delivered.status,'delivered');assert.ok(delivered.received_at>=delivered.deliver_at);
    c.report.delivery={id:messageId,observed_at:delivered.observed_at,transmitted_at:delivered.transmitted_at,deliver_at:delivered.deliver_at,received_at:delivered.received_at,guard:'human acknowledgement and configured mission delay'};
    await c.shot('delayed-earth-queue.png');
  });
}
