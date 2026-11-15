import { CREW, METRICS, SCENARIOS, PERMISSIONS, DEMO_HR } from '/shared/contracts.mjs';
import { Scene } from './scenes.mjs';
import { AnatomyScene } from './anatomy.mjs';
import { escape as esc, icon, fmt, time, statusBadge, sparkline, lineChart, metricHistory, sleepDetails, hasCurrentEvidence, crewInsignia } from './ui.mjs';
import { present, validSnapshot, monitoringState, RequestGate, patchContent } from '/shared/presentation.mjs';
import { mountFixtureTrace } from './fixture-trace.mjs';
import { mountN10 } from './n10.mjs';
import { mountWaveforms } from './waveforms.mjs';
import * as waveformFormats from '/shared/waveforms.mjs';

const root = document.querySelector('#app');
let n10Dispose=null,waveDispose=null;
const NAV = [['overview','overview','Mission overview'],['crew','crew','Crew health'],['n10','clock','Sleep & resilience'],['waveforms','activity','Signal archive'],['agent','brain','Health agent'],['comms','comms','Communications'],['knowledge','book','Research library'],['scenario','flask','Scenario lab'],['sources','shield','Evidence & provenance']];
let identity = null, state = null, connected = false, page = 'overview', crewId = 'CREW-03', view = 'spacecraft';
let source = null, scenes = [], history = [], histories = new Map(), chartMetric = 'heart_rate', queryResult = null, provenance = null;
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let userReducedMotion = false;
let performanceMode = false, tick = 0, historyRequest = 0, sceneLayer = 0, replayIndex = null, replayHistory = [];
let twinView='anatomy';
let demoTarget='CREW-03',scenarioSeed='42017';
const anatomyLayers={body:true,skeleton:true,organs:true};
let reaction = { phase: 'idle', trials: [], readyAt: 0, timer: null };
let lastPacketAt = 0; let toastTimer;
let health = null, healthAt = 0, transportMode = 'connecting', sessionVersion = 0, polling = false;
const requests = new RequestGate(), caseStates = new Map(), caseRequests = new Set(), busy = new Set();
const seenAlerts = new Set(); let stateRequest = 0;
const announcedAlerts = new Set(); let announcedView = null;
function clearReviewToast() {
  const el=document.querySelector('#toast');
  if(el?.dataset.reviewEvent==='true'){clearTimeout(toastTimer);el.classList.remove('show');el.textContent='';el.dataset.reviewEvent='false';}
}
function announceMonitoring() {
  const monitor = document.querySelector('#monitor-announcement'), riskRegion = document.querySelector('#risk-announcement');
  if (!identity || !state) { if(monitor)monitor.textContent='';if(riskRegion)riskRegion.textContent='';clearReviewToast();return; }
  const p=projection();
  const unknown=p.crew.filter(c=>c.status==='gray').map(c=>c.id).join(', ');
  const message=(view==='earth'?'Earth received view. ':'Spacecraft view. ')+(connected?p.monitoring.label+'. '+p.monitoring.knowledge+'.':'API disconnected; current monitoring availability unknown.')+(unknown?' Current measurements Unknown for '+unknown+'.':'');
  if(monitor&&monitor.textContent!==message)monitor.textContent=message;
  if(announcedView!==view){if(riskRegion)riskRegion.textContent='';clearReviewToast();announcedView=view;}
  const fresh=p.alerts.filter(r=>r.status==='open'&&!announcedAlerts.has(view+':'+r.id));
  for(const r of fresh)announcedAlerts.add(view+':'+r.id);
  if(fresh.length&&riskRegion)riskRegion.textContent=fresh.map(r=>(view==='earth'?'Earth received recorded review: ':'Onboard recorded review: ')+r.crew_id+' · '+r.display.status_text+'. Human review required; this is recorded evidence, not a diagnosis.').join(' ');
}
const paint = (selector, html) => patchContent(typeof selector === 'string' ? document.querySelector(selector) : selector, html);
function projection() { return present(state, { view, connected, lastPacketAt, health, healthAt }); }
function canAct(permission) { return allowed(permission) && connected && Date.now()-lastPacketAt<=5000 && monitoringState(health, healthAt).ready; }
function currentRequest() { const ticket = requests.ticket(), crew = crewId, viewpoint = view; return () => ticket() && crew === crewId && viewpoint === view; }
function availableCases() {
  if (view === 'earth') return [];
  const result = new Map((state?.cases ?? []).map(c => [c.risk_event_id, c]));
  for (const [risk, value] of caseStates) if (value.case && !result.has(risk)) result.set(risk, value.case);
  return [...result.values()];
}
function caseFor(risk) { return availableCases().find(c => c.risk_event_id === risk.id); }
function pendingCase(risk) {
  const value = caseStates.get(risk.id);
  return `<div class="notice info case-pending" data-pending-risk="${esc(risk.id)}">${icon('clock',14)}${!allowed('case') ? 'Case details require an authorized review role.' : value?.status === 'failed'
    ? 'Case enrichment failed; automatic recovery is pending. The original alert is retained.' : value?.status === 'unknown'
      ? 'Case service unavailable; its current state is unknown. The original alert is retained.' : 'Case enrichment pending. Acknowledgement becomes available when the report can be reviewed.'}</div>`;
}
async function probeCases(force = false) {
  if (!state || view === 'earth' || !allowed('case') || !connected) return;
  const version = sessionVersion;
  const missing = effectiveAlerts().filter(r => !caseFor(r) && !caseRequests.has(r.id)
    && (force || Date.now() - (caseStates.get(r.id)?.checkedAt ?? 0) > 5000)).slice(0, 6);
  await Promise.all(missing.map(async risk => {
    caseRequests.add(risk.id);
    try {
      const value = await api('/agent/cases', { risk_event_id: risk.id }, { global: true });
      if (version !== sessionVersion) return;
      caseStates.set(risk.id, value?.id ? { status: 'ready', case: value, checkedAt: Date.now() }
        : { status: value?.enrichment?.status ?? 'pending', checkedAt: Date.now() });
    } catch (error) { if (version === sessionVersion) caseStates.set(risk.id, { status: 'unknown', checkedAt: Date.now() }); }
    finally { caseRequests.delete(risk.id); }
  }));
  if (version === sessionVersion && missing.length) refreshLive();
}
function syncControls() {
  if (!state || !identity) return;
  for (const b of document.querySelectorAll('button[data-ack]')) {
    const risk = effectiveAlerts().find(r => r.id === b.dataset.ack);
    b.disabled = !canAct('ack') || view === 'earth' || !risk || risk.status === 'acknowledged' || !caseFor(risk) || busy.has(`ack:${risk.id}`);
  }
  for (const b of document.querySelectorAll('button[data-scenario],button[data-stop-scenario]')) b.disabled = !canAct('scenario') || busy.has('scenario') || b.hasAttribute('data-stop-scenario') && state.scenario.id === 'nominal' || b.dataset.scenario===DEMO_HR.id&&view==='earth';
  const target=document.querySelector('#demo-target');if(target)target.disabled=!canAct('scenario')||busy.has('scenario')||view==='earth';
  for (const b of document.querySelectorAll('[data-query],#knowledge-form button')) b.disabled = !canAct('rag') || busy.has('knowledge');
  const blackout = document.querySelector('[data-action="blackout"]'); if (blackout) blackout.disabled = !canAct('comms') || busy.has('blackout');
  for (const b of document.querySelectorAll('#comms-form button')) b.disabled = !canAct('comms') || busy.has('comms');
  const reactionButton = document.querySelector('#reaction-target'); if (reactionButton) reactionButton.disabled = !canAct('checkin') || reaction.phase === 'complete';
  const save = document.querySelector('#save-checkin'); if (save) save.disabled = !canAct('checkin') || reaction.phase !== 'complete' || busy.has('checkin');
}
function resetSession() {
  waveDispose?.();waveDispose=null;
  n10Dispose?.();n10Dispose=null;
  sessionVersion++; requests.invalidate(); stateRequest++; source?.close(); source = null;
  clearTimeout(reaction.timer); reaction = { phase: 'idle', trials: [], readyAt: 0, timer: null };
  identity = null; state = null; health = null; healthAt = 0; connected = false; lastPacketAt = 0;
  page = 'overview'; crewId = 'CREW-03'; view = 'spacecraft'; history = []; histories.clear();
  demoTarget='CREW-03';scenarioSeed='42017';
  caseStates.clear(); caseRequests.clear(); busy.clear(); seenAlerts.clear(); provenance = null; queryResult = null; polling = false;
  announcedAlerts.clear();announcedView=null;announceMonitoring();
  try { localStorage.removeItem('astra-synthetic-snapshot'); } catch {}
}
async function pollStatus() {
  if (!identity || identity.offline || polling) return;
  const version = sessionVersion, wasReady = monitoringState(health,healthAt).ready; polling = true;
  try {
    try {
      const result = await api('/health', undefined, { global: true, healthResponse: true });
      if (version !== sessionVersion) return; health = result; healthAt = Date.now();
    } catch { if (version !== sessionVersion) return; health = null; healthAt = 0; }
    if (identity.role !== 'system_admin' && (!connected || Date.now() - lastPacketAt > 5000)) {
      try { transportMode = 'polling'; await refreshState(); if (version === sessionVersion && (!source || source.readyState === 2)) connectStream(); }
      catch { if (version === sessionVersion) connected = false; }
    }
    if (version === sessionVersion) { refreshLive(); if(!wasReady&&monitoringState(health,healthAt).ready&&page==='crew'){void loadHistory();void loadForecast();}void probeCases(); }
  } finally { if (version === sessionVersion) polling = false; }
}

function allowed(permission) { return !identity?.offline && PERMISSIONS[identity?.role]?.includes(permission); }
function toast(message, announce = true) { const el = document.querySelector('#toast'); el.dataset.reviewEvent=String(!announce); el.setAttribute('aria-live',announce?'polite':'off'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 5000); }
async function api(path, payload, { global = false, healthResponse = false } = {}) {
  if (identity?.offline && !path.startsWith('/auth/')) throw new Error('This cached view cannot request fresh data without the local API.');
  const requestedSession = sessionVersion;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  if (!global && payload === undefined) requests.controllers.add(controller);
  try {
    const response = await fetch(`/v1${path}`, { method: payload === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: payload === undefined ? {} : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload), signal: controller.signal });
    let body; try { body = await response.json(); } catch { throw new Error('The service returned an unreadable response. No data was applied.'); }
    if (requestedSession !== sessionVersion) throw Object.assign(new Error('Session changed; outdated response ignored.'), { code: 'STALE_SESSION' });
    if (!response.ok && !(healthResponse && response.status === 503 && typeof body?.ready === 'boolean')) {
      if (response.status === 401 && identity && !identity.offline && !path.startsWith('/auth/')) { resetSession(); void renderLogin(); }
      throw Object.assign(new Error(body?.error?.message ?? 'Local service request failed.'), { status: response.status, code: body?.error?.code });
    }
    return body;
  } finally { clearTimeout(timeout); requests.controllers.delete(controller); }
}
function disposeScenes() { for (const s of scenes) s.dispose(); scenes = []; }
function syncGraphics(){
  const systemReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  reducedMotion=userReducedMotion||systemReduced;
  document.body.classList.toggle('reduce-motion',reducedMotion);document.body.classList.toggle('performance-mode',performanceMode);
  for(const s of scenes){s.options.performance=performanceMode;s.options.reducedMotion=reducedMotion;s.size();}
  for(const b of document.querySelectorAll('[data-action="graphics"]')){b.setAttribute('aria-pressed',String(performanceMode));if(!b.classList.contains('mobile-session'))b.innerHTML=icon('settings',14)+'<span>'+(performanceMode?'Performance mode on':'Performance mode')+'</span>';}
  for(const b of document.querySelectorAll('[data-action="motion"]')){b.setAttribute('aria-pressed',String(reducedMotion));b.disabled=systemReduced;b.textContent=systemReduced?'Motion reduced by system':'Reduce motion';}
}
function sceneTools(id){return `<div class="scene-tools" role="group" aria-label="Earth scene controls"><div class="camera-tools"><button class="button ghost" data-camera="left" data-scene="${id}" aria-label="Rotate Earth left">←</button><button class="button ghost" data-camera="right" data-scene="${id}" aria-label="Rotate Earth right">→</button><button class="button ghost" data-camera="in" data-scene="${id}" aria-label="Zoom Earth in">+</button><button class="button ghost" data-camera="out" data-scene="${id}" aria-label="Zoom Earth out">−</button><button class="button ghost" data-camera="reset" data-scene="${id}" aria-label="Reset Earth view">${icon('refresh',14)}</button></div><button class="button ghost" data-action="motion" aria-pressed="${reducedMotion}">Reduce motion</button></div>`;}
function effectiveCrew() {
  return projection().crew;
}
function effectiveEnvironment() { return projection().environment; }
function effectiveAlerts() { return projection().alerts; }
function selected() { return effectiveCrew().find(c => c.id === crewId) ?? effectiveCrew()[0]; }
function badge(role) { return role.replaceAll('_',' '); }
function footer() { return `<footer class="footer"><p>Research & simulation prototype. Not a medical device, NASA-certified or flight-qualified. Review support requires qualified human judgment.</p><span class="simulation-label">◇ SYNTHETIC TELEMETRY · FICTIONAL CREW</span></footer>`; }
function brand() { return '<div class="brand"><img src="/icon.svg" alt=""><div><div class="brand-name">ASTRA</div><div class="brand-sub">EARTH-INDEPENDENT CARE</div></div></div>'; }
function heading(title, description, actions = '') { return `<div class="page-heading"><div><div class="eyebrow">ARES I / CREW HEALTH INTELLIGENCE</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`; }
function actionButton(action, label, glyph = 'arrow', extra = '', disabled = false) { return `<button class="button ${extra}" data-action="${action}" ${disabled ? 'disabled' : ''}>${icon(glyph,14)}${label}</button>`; }
function toggleView() { return `<div class="view-toggle" role="group" aria-label="Telemetry reception viewpoint"><button data-view="spacecraft" aria-pressed="${view==='spacecraft'}" class="${view === 'spacecraft' ? 'active' : ''}">Spacecraft</button><button data-view="earth" aria-pressed="${view==='earth'}" class="${view === 'earth' ? 'active' : ''}">Earth received</button></div>`; }
function liveNotice() {
  if (!connected) return `<div class="notice">${icon('alert',15)}Local API unavailable. Cached readings are Gray and frozen. Monitoring cannot continue in this browser without the local server.</div>`;
  const monitor = monitoringState(health, healthAt);
  const service = !monitor.ready || health?.status === 'degraded' ? `<div class="notice ${monitor.ready ? 'info' : ''}">${icon('alert',15)}${esc(monitor.label)} · ${esc(monitor.knowledge)}. ${!monitor.ready ? 'Current measurements are Unknown; earlier alerts remain available as historical evidence.' : 'Original alerts remain available while optional case enrichment recovers.'}</div>` : '';
  if (view === 'earth') return service + `<div class="notice info">${icon('clock',15)}Earth received view · ${state.comms.one_way_latency_ms / 60_000} min configured one-way delay · ${state.mission.speed}× simulation. ${state.ground ? `Observed ${time(state.ground.observed_at)}; received ${time(state.ground.received_at)} UTC.` : 'No packet has arrived yet. No onboard health is substituted.'}</div>`;
  return service;
}
function shell() {
  disposeScenes();
  root.innerHTML = `<div class="app-shell"><aside class="sidebar">${brand()}<div class="mission-chip"><span>${icon('orbit',18)}</span><div><strong>ARES I <span class="muted">/</span> MARS TRANSIT</strong><p>Authorized crew · Mission day <span data-live="day">95</span></p></div></div><div class="nav-label">MISSION WORKSPACE</div><nav class="nav" aria-label="Mission workspaces">${NAV.map(([id,glyph,label]) => `<button class="nav-button ${page === id ? 'active' : ''}" data-page="${id}" title="${label}" ${page === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span>${id === 'agent' ? '<span class="nav-count" data-live="alert-count"></span>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="edge-note"><p><span class="connection-dot"></span>LOCAL EDGE SYSTEM</p>Knowledge & detection run onboard.<br>No external AI service required.</div><div class="nav"><button class="nav-button" data-action="cognitive" aria-label="Open voluntary crew check-in">${icon('activity')}<span>Cognitive check-in</span></button><button class="nav-button" data-action="graphics" aria-label="Toggle performance mode" aria-pressed="${performanceMode}">${icon('settings')}<span>${performanceMode ? 'Standard graphics' : 'Performance mode'}</span></button></div><div class="user-profile"><div class="user-avatar">${identity.role === 'astronaut' ? 'AO' : 'MC'}</div><div><strong>Local simulation</strong><p>${esc(badge(identity.role))}</p></div><button data-action="logout" title="End local session" aria-label="End local session">${icon('logout',15)}</button></div></div></aside><div class="app-content"><header class="topbar"><div class="breadcrumb"><span class="mobile-title">ASTRA</span>Mission workspace ${icon('chevron',11)}<strong id="breadcrumb">Mission overview</strong></div><div class="topbar-right"><button class="mobile-session button ghost" data-action="graphics" aria-label="Toggle performance mode" aria-pressed="${performanceMode}">${icon("settings",15)}</button><button class="mobile-session button ghost" data-action="logout" aria-label="End local session">${icon("logout",15)}</button><span id="connection"><i class="connection-dot"></i>Monitoring status pending</span><span class="mono" data-live="clock"></span><span class="version-tag">RESEARCH V0.1</span></div></header><div id="service-notice" class="service-notice"></div><main id="main" class="workspace" tabindex="-1"></main></div></div>`;
  renderPage(); refreshTop();
}
function navigate(next) {
  if(!NAV.some(n=>n[0]===next)&&!['cognitive','replay'].includes(next))return;
  if(identity?.role==='system_admin'&&next!=='sources'){toast('The system administrator can inspect audit records; crew medical views require a separate authorized role.');return;}
  if (next === page && next !== 'crew') return;
  page = next; replayIndex = null; clearTimeout(reaction.timer); reaction.phase = 'idle';
  document.querySelectorAll('.nav-button[data-page]').forEach(button => { button.classList.toggle('active', button.dataset.page === page); if (button.dataset.page === page) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
  renderPage(); document.querySelector('#main')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
}
function renderPage() {
  waveDispose?.();waveDispose=null;
  n10Dispose?.();n10Dispose=null;
  requests.invalidate(); historyRequest++; history = [];
  disposeScenes();
  const main = document.querySelector('#main'); if (!main) return;
  main.classList.toggle('overview-workspace',page==='overview');
  document.querySelector('#breadcrumb').textContent = NAV.find(n => n[0] === page)?.[2] ?? ({ cognitive: 'Crew check-in', replay: 'Mission replay' }[page] ?? 'Mission workspace');
  main.classList.remove('animation-enter'); void main.offsetWidth; main.classList.add('animation-enter');
  if (identity.role === 'system_admin') { renderSystemAudit(main); return; }
  const pages = { overview: renderOverview, crew: renderCrew, n10:renderN10, waveforms:renderWaveforms, agent: renderAgent, comms: renderComms, knowledge: renderKnowledge, scenario: renderScenarios, sources: renderSources, cognitive: renderCognitive, replay: renderReplay };
  (pages[page] ?? renderOverview)(main); syncControls(); refreshTop();
}
function renderN10(main){
  main.innerHTML='';const current=currentRequest();
  n10Dispose=mountN10(main,{crew:crewId,crews:state.crew.map(c=>c.id),onCrew:next=>{if(state.crew.some(c=>c.id===next)){crewId=next;renderPage();}},identity,api,isCurrent:current,now:state.mission.spacecraft_time,earth:view==='earth'});
}
function renderWaveforms(main){
  main.innerHTML='';const current=currentRequest();
  waveDispose=mountWaveforms(main,{crew:crewId,crews:state.crew.map(c=>c.id),onCrew:next=>{if(state.crew.some(c=>c.id===next)){crewId=next;renderPage();}},identity,api,isCurrent:current,now:state.mission.spacecraft_time,earth:view==='earth',formats:waveformFormats});
}
function refreshTop() {
  const clock = document.querySelector('[data-live="clock"]'); if (clock) clock.textContent = Number.isFinite(state.mission.speed) ? `${time(state.mission.spacecraft_time)} UTC · ${state.mission.speed}×` : 'Crew telemetry outside this role’s scope';
  const day = document.querySelector('[data-live="day"]'); if (day) day.textContent = state.mission.mission_day ?? '—';
  const count = document.querySelector('[data-live="alert-count"]'); if (count) count.textContent = effectiveAlerts().filter(a => a.status === 'open').length || '';
  const monitor = monitoringState(health, healthAt);
  const conn = document.querySelector('#connection'); if (conn) paint(conn, `<i class="connection-dot ${connected && monitor.ready ? '' : 'off'}"></i>${connected ? esc(monitor.label) + (transportMode === 'polling' ? ' · polling' : '') : 'Cached · API disconnected'}`);
  const edge = document.querySelector('.edge-note p');
  if(edge)edge.innerHTML=`<span class="connection-dot ${connected?'':'off'}"></span>${connected?'LOCAL EDGE SYSTEM':'LOCAL NODE UNAVAILABLE'}`;
  paint('#service-notice',document.querySelector('#live-notice')?'':liveNotice());
  announceMonitoring();
}
async function renderSystemAudit(main) {
  const current=requests.ticket();
  main.innerHTML = `${heading('System audit','Append-only local audit evidence. Medical records require a separate review role.')}<section class="panel" id="system-audit-content"><div class="empty-state">Loading audit records…</div></section>${footer()}`;
  try {
    const audit = await api('/audit');
    if(!current()||identity?.role!=='system_admin')return;
    const el = document.querySelector('#system-audit-content');
    if (el) el.innerHTML = `<div class="panel-heading"><h2>System events</h2><span class="tag">CHAIN ${audit.chain_valid?'VERIFIED':'INVALID'}</span></div>${audit.events.map(e=>`<div class="audit-event"><div><p>${esc(e.action)}</p><small>${esc(e.actor)} · ${esc(e.resource_id)}</small></div><span class="mono muted">${time(e.ts)} UTC</span></div>`).join('')}`;
  } catch (error) { if(current())paint('#system-audit-content','<div class="empty-state">Audit unavailable: '+esc(error.message)+'</div>'); }
}
function renderOverview(main) {
  main.innerHTML = `${heading('Mission overview','Crew health intelligence · local-first, evidence-led.', `${toggleView()}${actionButton('scenario-page','Scenario lab','flask','ghost')}`)}
    <div id="live-notice"></div>
    <div class="overview-top">
      <section class="panel orbit-panel" aria-label="Mission trajectory">
        <div class="orbital-stage"><div id="earth-scene" class="scene-holder"></div>
          <div class="orbit-overlay"><div class="eyebrow">MISSION CONTEXT / MARS TRANSIT</div><h2>ARES I</h2><p>Earth & spacecraft · schematic scale<br>No live NASA tracking</p>
            <div class="mission-day"><span id="mission-day-num">${state.mission.mission_day}</span><small>MISSION DAY</small></div>
          </div>
          <div class="scene-corner"><span class="fps-label" id="scene-fps"></span><span class="tag" id="scene-mode">INITIALIZING</span></div>
          <div class="orbit-legend"><strong>◇ ARES I</strong><br>ILLUSTRATIVE TRANSFER VEHICLE</div>
        </div>
        <div class="orbit-footer"><div><small>MISSION PROFILE</small><p>Mars transit <span>SIMULATION</span></p></div><div><small>ONE-WAY LATENCY</small><p><span id="latency-minutes">—</span> min <span>CONFIGURED</span></p></div><div><small>EARTH LINK</small><p id="earth-link-text">Awaiting state</p></div></div>
        <div class="earth-control-bar">${sceneTools('earth-scene')}<p class="asset-credit" id="earth-assets">Loading local Earth imagery…</p></div>
      </section>
      <section class="panel mission-summary"><div class="panel-heading"><h2>Monitoring picture</h2><span class="live-pill"><i></i>ONBOARD</span></div><p id="reception-view-label" class="reception-context">Awaiting reception state</p>
        <div class="summary-stat"><div><span class="stat-icon">${icon('crew',18)}</span><div><p>Crew monitored</p><small>Reliable current signals</small></div></div><strong id="crew-monitored">—</strong></div>
        <div class="summary-stat"><div><span class="stat-icon">${icon('heart',18)}</span><div><p>Within baseline</p><small>Evidence supports nominal</small></div></div><strong id="crew-nominal">—</strong></div>
        <div class="summary-stat"><div><span class="stat-icon">${icon('alert',18)}</span><div><p>Open review events</p><small>Human judgement required</small></div></div><strong id="open-reviews">—</strong></div>
        <div class="reception-timeline" id="reception-timeline"></div>
        <div class="summary-footer">${icon('shield',13)}<span><strong id="overview-monitoring">Monitoring availability pending</strong><small>Availability ≠ crew risk</small></span></div>
      </section>
    </div>
    <div class="section-line"><h2>Crew health <span id="crew-count">AUTHORIZED CREW</span></h2><p id="crew-stream-label">Synthetic telemetry</p></div>
    <section class="crew-grid" id="crew-grid" aria-label="Crew health overview"></section>
    <div class="bottom-row">
      <section class="panel"><div class="panel-heading"><h2>Cabin environment</h2><span class="tag">SIMULATED</span></div><div class="environment-metrics" id="environment"></div><p class="instrument-note" id="environment-context"></p></section>
      <section class="panel"><div class="panel-heading"><h2>Operational status</h2><button class="button ghost small" data-page="comms">View link ${icon('arrow',11)}</button></div><div id="system-activity"></div></section>
    </div>${footer()}`;
  createScene('earth-scene','earth');updateOverview();syncGraphics();
}
function createScene(id, type) {
  const container = document.getElementById(id); if (!container) return;
  try { const Renderer=type==='anatomy'?AnatomyScene:Scene;const s = new Renderer(container,type,{
    reducedMotion, performance:performanceMode,planetRadius:id==='login-earth' ? .70 : 1.02,
    onMode: mode => { const el = document.querySelector('#scene-mode'); if(el)el.textContent=mode.toUpperCase();for(const control of document.querySelectorAll(`[data-camera][data-scene="${id}"]`))control.disabled=mode==='Text fallback';for(const control of document.querySelectorAll('[data-anatomy-camera],[data-anatomy-layer]'))control.disabled=mode!=='WebGL2 anatomy'; },
    onFps: fps => { const el=document.querySelector('#scene-fps'); if(el)el.textContent=`${fps} draws/s · diagnostic`; },
    onAsset: status=>{container.setAttribute('data-assets',status);const el=document.querySelector('#earth-assets');if(el)el.textContent=status==='ready'?'NASA Earth Observatory · historical composite':status==='loading'?'Loading local Earth imagery…':'Earth imagery unavailable · schematic view';},
    onInspect: region => {
      const c=selected(); if(!c)return;
      if(region==='lower_body'){toast(`Exercise adherence: ${fmt(c.values.exercise)} min. Schematic lower body; no live bone or muscle measurement.`);return;}
      chartMetric=region==='head'?'sleep_duration':'heart_rate'; sceneLayer=region==='head'?3:1;
      const select=document.querySelector('#chart-metric');if(select)select.value=chartMetric;
      updateCrew();updateChart();toast(region==='head'?'Sleep history selected. Cognitive context is not a neurological diagnosis.':'Cardiorespiratory trend selected. Every review highlight requires detector evidence.');
    },
  }); scenes.push(s); return s;
  } catch { container.innerHTML = '<p class="graphics-fallback">Scene unavailable. Telemetry and evidence remain accessible below.</p>'; const mode = document.querySelector('#scene-mode'); if (mode) mode.textContent = 'TEXT FALLBACK'; }
}
function updateOverview() {
  const crew = effectiveCrew(); const grid = document.querySelector('#crew-grid'); if (!grid) return;
  document.querySelector('#live-notice').innerHTML = liveNotice() + (effectiveEnvironment()?.warning ? `<div class="notice">${icon('alert',15)}Synthetic environmental deviation · ${effectiveEnvironment().evidence.map(e=>`${esc(e.metric)} ${fmt(e.value,e.unit==='mSv/h'?3:0)} ${esc(e.unit)}`).join(' · ')}. Illustrative review thresholds; no clinical exposure limit or illness is inferred.</div>` : '');
  paint(grid, crew.map(c => {
    const recent = metricHistory(histories.get(c.id)?.filter(p=>view!=='earth'||(state.ground&&Date.parse(p.ts)<=state.ground.observed_at)) ?? [], 'heart_rate').slice(-40);
    const tone=['#e8bd91','#c7c2b9','#bea6eb','#b2c9c2','#ddad97','#c9bba6'][Number(c.id.slice(-2))-1];
    const trace={green:'#54c9b7',amber:'#f3a64a',red:'#f08e97',gray:'#b2afb9'}[c.status];
    return `<button class="crew-card ${c.status}" data-crew="${c.id}" aria-label="Inspect ${esc(c.name)}. ${esc(c.status_text)}"><div class="crew-card-head"><div class="crew-avatar" style="color:${tone}">${crewInsignia(c)}</div><div><div class="crew-name">${esc(c.name)}</div><div class="crew-role">${esc(c.role)}</div></div><div class="crew-designation"><strong class="crew-callsign">${esc(c.call_sign)}</strong><span class="crew-id">${c.id}</span></div></div><div class="crew-values"><div class="crew-hr"><span>${fmt(c.values.heart_rate)}</span><small>bpm</small><div class="metric-caption">${icon('heart',10)}Heart rate</div></div><div class="crew-mini-metrics"><div><p>${fmt(c.values.spo2,1)}<small>%</small></p><small>SpO₂</small></div><div title="${esc(sleepDetails(c).detail)}"><p>${fmt(c.values.sleep_duration,1)}<small>h</small></p><small>${esc(sleepDetails(c).label)}</small></div></div></div><div class="crew-trend">${sparkline(recent.map(p=>p.value),trace,180,40,recent.map(p=>p.ts))}<small>HR trend · ${recent.length?time(recent[0].ts)+'–'+time(recent.at(-1).ts)+' UTC':'awaiting history'}</small></div><div class="crew-card-bottom">${statusBadge(c.status)}<small class="crew-quality">Data ${c.quality==='good'?'available':'unknown'}</small><span>Inspect ${icon('chevron',9)}</span></div><div class="crew-source"><span>HR source</span> ${esc(c.metric_observations?.heart_rate?.source?.kind??'Source unavailable')} · ${time(c.metric_observations?.heart_rate?.ts??c.observed_at)} UTC</div></button>`;
  }).join(''));
  document.querySelector('#crew-nominal').textContent = String(crew.filter(c=>c.status==='green').length).padStart(2,'0');
  const livePill=document.querySelector('.mission-summary .live-pill');
  if(livePill){livePill.innerHTML=`<i></i>${view==='earth'&&!state.ground?'NO PACKET':projection().stale?'CACHED':view==='earth'?'RECEIVED':'ONBOARD'}`;livePill.classList.toggle('unknown',projection().stale||view==='earth'&&!state.ground);}
  document.querySelector('#reception-view-label').textContent=view==='earth'?(state.ground?'Earth · delivered packet only':'Earth · awaiting first packet'):'Spacecraft · onboard observations';
  document.querySelector('#crew-monitored').innerHTML = `${String(crew.filter(c=>c.quality==='good').length).padStart(2,'0')} <span>/ ${String(crew.length).padStart(2,'0')}</span>`;
  const crewCount = document.querySelector('#crew-count'); if (crewCount) crewCount.textContent = `${crew.length} AUTHORIZED CREW`;
  document.querySelector('#open-reviews').textContent = String(effectiveAlerts().filter(a=>a.status==='open').length).padStart(2,'0');
  document.querySelector('#mission-day-num').textContent = state.mission.mission_day;
  document.querySelector('#latency-minutes').textContent = fmt(state.comms.one_way_latency_ms/60_000,1);
  document.querySelector('#earth-link-text').textContent = !connected||Date.now()-lastPacketAt>5000?'Link state unknown':state.comms.blackout ? 'Blackout · queued' : 'Store & forward';
  const env = effectiveEnvironment();
  document.querySelector('#environment').setAttribute('data-stale',String(!env));
  document.querySelector('#environment').innerHTML = [ ['CO₂ LEVEL',fmt(env?.co2_ppm),'ppm','activity'],['TEMPERATURE',fmt(env?.temperature_c,1),'°C','sun'],['HUMIDITY',fmt(env?.humidity_percent),'%','orbit'],['DOSE RATE',fmt(env?.dose_rate_msv_h,3),'mSv/h','shield'] ].map(([label,value,unit,glyph])=>`<div><small>${icon(glyph,12)}${label}</small><p>${value} <span>${unit}</span></p></div>`).join('');
  document.querySelector('#environment-context').textContent=env?`Synthetic cabin context · ${view==='earth'?'received observation '+time(state.ground?.observed_at):'snapshot '+time(state.mission.spacecraft_time)} UTC. ${env.warning?'Measured deviation; illustrative review thresholds only.':'No certified safe exposure range is implied.'}`:'Environment unavailable for this reception view. No healthy value is substituted.';
  document.querySelector('#crew-stream-label').textContent=projection().stale?'Gray / unknown · synthetic telemetry':view==='earth'?'Received synthetic telemetry':'Updating synthetic telemetry';
  paint('#reception-timeline',`<div><span>Onboard clock</span><strong>${time(state.mission.spacecraft_time)} UTC</strong></div><div><span>Earth observation</span><strong>${time(state.ground?.observed_at)}</strong></div><div><span>Transmission</span><strong>${time(state.ground?.transmitted_at)}</strong></div><div><span>Earth receipt</span><strong>${time(state.ground?.received_at)}</strong></div><p>Received packet timestamps · ${state.mission.speed}× simulation</p>`);
  const monitor = monitoringState(health, healthAt);
  document.querySelector('#overview-monitoring').textContent=connected?monitor.label:'Monitoring availability unknown';
  paint('#system-activity', `<div class="activity-item"><span>${icon(monitor.ready?'check':'alert',12)}</span><div><p>${connected ? esc(monitor.label) : 'Monitoring availability unknown'}</p><small>Service availability · separate from crew risk</small></div></div><div class="activity-item"><span>${icon('book',12)}</span><div><p>${connected ? esc(monitor.knowledge) : 'Knowledge availability unknown'}</p><small>Local research context · no cloud model</small></div></div><div class="activity-item"><span>${icon('comms',12)}</span><div><p>${!connected||Date.now()-lastPacketAt>5000?'Simulated link state unknown':state.comms.blackout?'Earth link in blackout':'Simulated Earth link available'}</p><small>${state.comms.blackout?'Delivery paused; original alerts retained onboard':'Store and forward · configured mission delay'}</small></div></div>`);
  scenes[0]?.update({ blackout:state.comms.blackout,linkAvailable:connected&&Date.now()-lastPacketAt<=5000 });
}
function renderCrew(main) {
  const c = selected(); if (!c) return;
  crewId=c.id;
  main.innerHTML = `${heading(c.name,`${c.id} · ${c.role} · Call sign ${c.call_sign}`,`${toggleView()}${actionButton('replay','Mission replay','clock','ghost')}`)}<div id="crew-tabs" class="crew-tabs">${effectiveCrew().map(v=>`<button class="crew-tab ${v.id===crewId?'active':''}" data-crew="${v.id}">${statusBadge(v.status,'')} ${v.call_sign}</button>`).join('')}</div><div id="live-notice"></div><div class="detail-grid"><section class="panel twin-panel"><div class="twin-heading"><div><h2>Physiological twin</h2><small>SCHEMATIC · DATA-LINKED VISUALIZATION</small></div><div><span id="scene-mode" class="tag"></span><span class="fps-label" id="scene-fps"></span></div></div><div id="twin-scene" class="twin-scene scene-holder"></div><div id="twin-annotation" class="twin-annotation">Cardiorespiratory domain<br>Linked to displayed HR / RR</div><div class="twin-controls"><div class="twin-layers"><button class="button small ghost" data-layer="0">All systems</button><button class="button small ghost" data-layer="1">Cardiovascular</button><button class="button small ghost" data-layer="2">Respiratory</button><button class="button small ghost" data-layer="3">Cognitive context</button></div><label>ROTATE<input id="twin-rotation" type="range" min="-180" max="180" value="-7" aria-label="Rotate digital twin"></label><p>Animation follows observed heart and respiratory rates. Geometry is illustrative; no pathology is inferred.</p></div></section><div class="detail-right"><div id="crew-metric-tiles" class="metric-grid"></div><section class="panel"><div class="panel-heading"><h2>Personal trend</h2><select id="chart-metric" aria-label="Chart metric">${['heart_rate','hrv','spo2','sleep_duration'].map(k=>`<option value="${k}" ${k===chartMetric?'selected':''}>${METRICS[k].label}</option>`).join('')}</select></div><div id="history-chart" class="chart-content"></div></section><section class="panel"><div class="panel-heading"><h2>Evidence & review</h2><span id="crew-status"></span></div><div id="crew-evidence" class="evidence-content"></div></section></div></div><div class="section-line"><h2>Conditional trend projection</h2><span class="tag">EXPLORATORY · NOT CLINICAL</span></div><section class="panel wide-panel" id="forecast-content"><p class="muted">Loading chronological model output…</p></section>${footer()}`;
  prepareTwinPanel(main);
  const scene=createScene('twin-scene',twinView==='anatomy'?'anatomy':'twin');
  if(twinView==='anatomy')for(const [layer,on]of Object.entries(anatomyLayers))scene?.setLayer(layer,on);
  updateCrew(); loadHistory(); loadForecast();
}
function prepareTwinPanel(main){
  const heading=main.querySelector('.twin-heading');
  heading.innerHTML+=`<div class="twin-view-options" role="group" aria-label="Body visualization"><button class="button small ghost" data-twin-view="anatomy" aria-pressed="${twinView==='anatomy'}">Reference anatomy</button><button class="button small ghost" data-twin-view="schematic" aria-pressed="${twinView==='schematic'}">Data-linked schematic</button></div>`;
  if(twinView!=='anatomy')return;
  heading.querySelector('h2').textContent='Reference anatomy';heading.querySelector('small').textContent='GENERIC ADULT MALE · STATIC REFERENCE';
  main.querySelector('.twin-panel').classList.add('anatomy-panel');
  main.querySelector('#scene-fps').textContent='On-demand rendering';
  main.querySelector('.twin-controls').innerHTML=`<div class="anatomy-layer-controls" role="group" aria-label="Reference anatomy layers">${[['body','Body envelope'],['skeleton','Skeleton'],['organs','Heart & lungs']].map(([id,label])=>`<button class="button small ghost" data-anatomy-layer="${id}" aria-pressed="${anatomyLayers[id]}" disabled>${label}</button>`).join('')}</div><div class="anatomy-camera-controls" role="group" aria-label="Reference anatomy camera">${[['left','Orbit left'],['right','Orbit right'],['up','Tilt up'],['down','Tilt down'],['in','Zoom in'],['out','Zoom out'],['reset','Reset camera']].map(([id,label])=>`<button class="button small ghost" data-anatomy-camera="${id}" disabled>${label}</button>`).join('')}</div><p>Generic reference geometry, shared across all six fictional profiles. Not a reconstruction of this astronaut. Static organs are not animated by HR or RR.</p><details class="anatomy-source"><summary>Reference source, license & limitations</summary><p>BodyParts3D 4.3 · © 2008 The Database Center for Life Science. <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noopener noreferrer">CC Attribution-Share Alike 2.1 Japan</a>. Locally simplified and converted to GLB; original component IDs and hashes retained. Adult male reference only. Source anatomy may contain errors; no independent clinical validation. Materials identify layers, never medical severity.</p><a href="/assets/anatomy/attribution.json" target="_blank" rel="noopener noreferrer">Asset attribution and limitations</a></details>`;
}
function updateCrew() {
  const c=selected(); if(!c || !document.querySelector('#crew-metric-tiles'))return;
  for(const button of document.querySelectorAll('[data-layer]')) button.setAttribute('aria-pressed',String(Number(button.dataset.layer)===sceneLayer));
  document.querySelector('#live-notice').innerHTML=liveNotice();
  if(!connected||!monitoringState(health,healthAt).ready)paint('#forecast-content','<p class="muted">No current projection: monitoring or API availability is not established.</p>');
  const keys=['heart_rate','hrv','spo2','respiratory_rate','sleep_duration','temperature'];
  paint('#crew-tabs', effectiveCrew().map(v=>`<button class="crew-tab ${v.id===crewId?'active':''}" data-crew="${v.id}" aria-pressed="${v.id===crewId}">${statusBadge(v.status,'')} ${esc(v.call_sign)}</button>`).join(''));
  paint('#crew-metric-tiles', keys.map(k=>{
    const m=METRICS[k],b=c.baseline?.[k],observation=c.metric_observations?.[k];
    const z=b&&Number.isFinite(c.values[k])&&b.scale>0?(c.values[k]-b.center)/b.scale:null;
    return `<div class="metric-tile ${c.status==='gray'?'unavailable':''}"><small>${k==='sleep_duration'?esc(sleepDetails(c).label):m.label}</small><p>${fmt(c.values[k],['spo2','sleep_duration','temperature'].includes(k)?1:0)}<span>${m.display}</span></p><div class="delta ${Math.abs(z)>2?'warn':''}">${z===null?'Current measurement unknown':`${z>=0?'+':''}${fmt(z,1)} SD from personal baseline`}</div><small>${k==='sleep_duration'?esc(sleepDetails(c).detail):esc(observation?.source?.kind??'Source unavailable')+' · '+time(observation?.ts)+' UTC'}</small></div>`;
  }).join(''));
  document.querySelector('#crew-status').innerHTML=statusBadge(c.status);
  const risk=effectiveAlerts().find(a=>a.id===c.risk_id)??effectiveAlerts().find(a=>a.crew_id===crewId&&a.status==='open');
  if(risk){
    const current=hasCurrentEvidence(c,risk);
    paint('#crew-evidence', `<div class="evidence-header"><h3>${esc(risk.display.status_text)}</h3><small>${time(risk.created_at)} UTC · ${current?'Current detector evidence':'Recorded alert; not current measurement status'}</small></div><div class="table-wrap"><table class="evidence-table"><thead><tr><th>Signal / source</th><th>Deviation</th><th>Persistence / rate</th></tr></thead><tbody>${risk.evidence.map(e=>`<tr><td>${esc(METRICS[e.metric]?.label??e.metric)}<small>${esc(e.source?.kind??'Legacy source unknown')} · ${time(e.observed_at)} UTC · ${esc(e.quality?.status??risk.data_quality)}</small></td><td class="mono">${e.standardized_deviation>0?'+':''}${fmt(e.standardized_deviation,1)} SD</td><td class="mono">${fmt(e.persistence_seconds)}s${e.rules?.includes('persistent_rate_of_change')?`<small>${fmt(e.rate_of_change_sd_per_minute,2)} SD/min · ${fmt(e.rate_persistence_seconds)}s sustained</small>`:''}</td></tr>`).join('')}</tbody></table></div><details><summary>Observation provenance and rule evidence</summary><pre class="provenance-json">${esc(JSON.stringify(risk.evidence,null,2))}</pre></details><p class="evidence-foot">${esc(risk.detector.version)} · Recorded quality ${esc(risk.data_quality)} · Evidence strength ${fmt(risk.uncertainty.score,2)} (heuristic, uncalibrated). No clinical diagnosis.</p>${view==='earth'?'<p class="evidence-foot">Received alert only. Onboard case details and acknowledgement require spacecraft view.</p>':!caseFor(risk)?pendingCase(risk):''}<div class="evidence-actions"><button class="button primary" data-ack="${risk.id}" ${!canAct('ack')||risk.status==='acknowledged'||view==='earth'||!caseFor(risk)?'disabled':''}>${icon('check',14)}${risk.status==='acknowledged'?'Acknowledged':'Acknowledge & queue report'}</button><button class="button ghost" data-page="agent">${icon('brain',14)}Review agent case</button></div>`);
  }else paint('#crew-evidence', `<div class="empty-state">${icon(c.status==='gray'?'alert':'shield',25)}<strong>${c.status==='gray'?'Verify measurement availability':'No persistent review event'}</strong>${c.status==='gray'?'Unavailable or unreliable data is never interpreted as healthy.':'Readings are assessed against this crew member’s synthetic personal baseline.'}</div>`);
  const annotation=document.querySelector('#twin-annotation');const currentEvidence=hasCurrentEvidence(c,risk);annotation.classList.toggle('warn',twinView==='schematic'&&currentEvidence);annotation.textContent=twinView==='anatomy'?'GENERIC REFERENCE · NO HEALTH INFERENCE':currentEvidence?`${risk.display.body_region.toUpperCase()} · evidence-linked review`:`${c.quality==='good'?'HR / RR':'SIGNAL UNAVAILABLE'} · schematic`;
  scenes[0]?.update({heartRate:c.values.heart_rate,breathingRate:c.values.respiratory_rate,quality:c.quality,warning:risk?.id===c.risk_id&&risk?.display.body_region==='thorax'&&c.quality==='good',layer:sceneLayer});
}
async function loadHistory() {
  const current = currentRequest();
  if(!connected){paint('#history-chart','<div class="empty-state">History unavailable while disconnected. No values are fabricated.</div>');return;}
  const request=++historyRequest;const requestedCrew=crewId;const requestedView=view;
  if (!history.length) paint('#history-chart','<div class="empty-state">Loading this crew member’s history…</div>');
  try{
    const before=view==='earth'?state.ground?.observed_at:null;if(view==='earth'&&!before){history=[];paint('#history-chart','<div class="empty-state">Awaiting an Earth-received observation.</div>');return;}
    const result=await api(`/crew/${requestedCrew}/telemetry?limit=120${before?`&before=${encodeURIComponent(new Date(before).toISOString())}`:''}`);
    if(!current()||request!==historyRequest||requestedCrew!==crewId||requestedView!==view)return;history=result;
    if(page==='crew'&&crewId===requestedCrew)updateChart();
  }catch(e){if(current()){history=[];paint('#history-chart',`<div class="empty-state">History unavailable: ${esc(e.message)}</div>`);}}
}
function updateChart(){const el=document.querySelector('#history-chart');const c=selected();if(el&&c)el.innerHTML=lineChart(history,chartMetric,c.baseline?.[chartMetric]);}
async function loadForecast(){
  const el=document.querySelector('#forecast-content'),current=currentRequest();if(!el)return;
  if(view==='earth'){el.innerHTML='<p class="muted">Onboard forecasts are not included in received Earth telemetry. Switch to spacecraft view to inspect them.</p>';return;}
  if(!connected||!monitoringState(health,healthAt).ready){el.innerHTML='<p class="muted">Projection unavailable: current monitoring readiness is not established.</p>';return;}
  try{const data=await api(`/crew/${crewId}/predictions`);if(!current()||page!=='crew')return;
    if(!monitoringState(health,healthAt).ready){el.textContent='Monitoring unavailable; projection is not presented as current.';return;}
    const f=data.heart_rate;el.innerHTML=f.available?`<p style="font-size:13px">${fmt(f.estimate,1)} bpm <span class="muted">in ${f.horizon_minutes} minutes if the observed trend continues.</span></p><p class="muted" style="margin-top:8px;font-size:11px">Exploratory interval ${fmt(f.lower,1)}–${fmt(f.upper,1)} bpm · ${f.history_count} past observations · ${esc(f.model_version)}.</p><p class="evidence-foot">${esc(f.interval_label)} This is a statistical projection, not a disease forecast.</p>`:`<p class="muted">${esc(f.reason)}</p>`;
  }catch(e){if(current())el.textContent='Projection unavailable: '+e.message;}
}
function renderAgent(main){main.innerHTML=`${heading('Crew health agent','A constrained review workflow. Every case begins with measured evidence.',toggleView()+actionButton('knowledge-page','Ask onboard knowledge','book','ghost'))}<div class="notice info">${icon('shield',16)}Deterministic report template · no executed tool graph · no language model · no diagnosis, prescriptions, telemetry writes or autonomous alert creation.</div><div class="split-layout"><section class="panel" id="cases-content"></section><section class="panel wide-panel"><div class="eyebrow">WORKFLOW REFERENCE · NOT AN EXECUTED TOOL TRACE</div><h2 style="margin:10px 0 18px">Evidence first. Human review next.</h2>${['Observe detector event','Verify signal quality','Read personal baseline','Explain measured deviation','Retrieve curated references','Recommend voluntary check-in','Draft a cited case report','Wait for human acknowledgement','Queue report for Earth review'].map((name,i)=>`<div class="timeline-step"><span class="step-check">${icon('clock',11)}</span>${name}</div>`).join('')}<p class="evidence-foot">These labels describe the intended workflow; they do not establish that tools executed. Only acknowledgement moves a drafted case into the transmission queue. Sources are research context; no clinical protocol is inferred.</p>${actionButton('cognitive','Voluntary crew check-in','activity','ghost')}</section></div><section class="panel fixture-trace-panel" id="fixture-trace-demo" aria-labelledby="fixture-trace-heading"></section>${footer()}`;updateAgent();const fixtureElement=document.querySelector('#fixture-trace-demo'),fixtureSession=sessionVersion;void mountFixtureTrace(fixtureElement,{request:()=>api('/agent/fixture-trace'),isCurrent:()=>fixtureSession===sessionVersion&&page==='agent'});}
function updateAgent(){
  const el=document.querySelector('#cases-content');if(!el)return;
  if(!allowed('case')){paint(el,'<div class="empty-state">This role cannot access protected agent cases.</div>');return;}
  if(view==='earth'){paint(el,'<div class="empty-state">Earth received view contains received alerts only. Onboard case details are available in spacecraft view.</div>'+toggleView());return;}
  const cases=availableCases(),pending=effectiveAlerts().filter(r=>!caseFor(r));
  const pendingHTML=pending.map(r=>`<article class="case-card"><h3>${esc(r.crew_id)} · Original detector alert</h3><p>${esc(r.display.status_text)}</p>${pendingCase(r)}</article>`).join('');
  if(!cases.length&&!pending.length){paint(el,'<div class="empty-state">No detector alert or case is recorded for this authorized view.</div>');return;}
  paint(el,pendingHTML+cases.map(c=>{const risk=effectiveAlerts().find(r=>r.id===c.risk_event_id);return `<article class="case-card"><div class="case-topline"><span class="tag">${esc(c.id)}</span><small>${esc(c.state.replaceAll('_',' '))}</small></div><h3>${esc(c.crew_id)} · ${esc(risk?.display.status_text??'Recorded review case')}</h3><p>${esc(c.summary)}</p><p style="margin-top:10px">${esc(c.recommendation)}</p>${c.citations.map((s,i)=>`<a class="citation" href="${esc(s.url)}" target="_blank" rel="noreferrer">[${i+1}] ${esc(s.title)} ${icon('arrow',10)}<small>${esc(s.section)}</small></a>`).join('')}<div class="evidence-actions"><button class="button primary" data-ack="${c.risk_event_id}" ${!canAct('ack')||c.human_ack?'disabled':''}>${icon('check',13)}${c.human_ack?'Human acknowledged':'Acknowledge & queue'}</button>${allowed('export')&&connected?`<a class="button ghost" href="/v1/reports/${esc(c.id)}" download>${icon('download',13)}Export report</a>`:''}</div><p class="evidence-foot">${esc(c.agent_version)} · Template report, not an executed tool trace · ${esc(c.uncertainty.interpretation)} · ${c.human_ack?`Acknowledged by ${esc(c.human_ack.actor)}`:'Human acknowledgement required.'}</p></article>`;}).join(''));
}
function renderComms(main){main.innerHTML=`${heading('Communications','Care continues onboard. Earth receives evidence when the link permits.',actionButton('blackout',state.comms.blackout?'Restore Earth link':'Simulate blackout','comms',state.comms.blackout?'primary':'danger',!allowed('comms')))}<div class="split-layout"><section class="panel"><div class="panel-heading"><h2>Deep-space link</h2><span id="comms-state" class="tag"></span></div><div class="comms-visual"><div class="comms-node"><span>${icon('orbit',30)}</span><p>ARES I</p><small>ONBOARD / EDGE</small></div><div class="comms-path" id="comms-path"><p id="comms-delay"></p></div><div class="comms-node"><span>${icon('comms',30)}</span><p>Earth</p><small>GROUND REVIEW</small></div></div><div class="wide-panel"><p class="muted" style="font-size:11px">Simulation uses ${state.mission.speed}× mission time. The configured one-way delay remains real in mission seconds. Priority cases precede newly transmitted telemetry; no packet arrives early.</p><form id="comms-form"><div class="controls-grid"><label>One-way delay (minutes)<input class="field" type="number" name="delay" min="0" max="22" step="0.1" value="${state.comms.one_way_latency_ms/60_000}" required></label><label>Jitter (seconds)<input class="field" type="number" name="jitter" min="0" max="60" step="0.1" value="${state.comms.jitter_ms/1000}" required></label><label>Bandwidth (kbps)<input class="field" type="number" name="bandwidth" min="1" max="100000" value="${state.comms.bandwidth_kbps}" required></label><label>Packet loss (%)<input class="field" type="number" name="loss" min="0" max="100" value="${state.comms.loss*100}" required></label></div><button class="button ghost" style="margin-top:18px" ${allowed('comms')?'':'disabled'}>${icon('settings',14)}Apply simulated link</button></form><div id="comms-times" style="margin-top:20px"></div></div></section><section class="panel"><div class="panel-heading"><h2>Store & forward queue</h2><span class="tag" id="queue-count"></span></div><div id="queue-content"></div></section></div>${footer()}`;updateComms();loadQueue();}
function updateComms(){if(!document.querySelector('#comms-state'))return;document.querySelector('#comms-state').textContent=state.comms.blackout?'BLACKOUT':'LINK AVAILABLE';document.querySelector('#comms-path').classList.toggle('off',state.comms.blackout);document.querySelector('#comms-delay').textContent=`${fmt(state.comms.one_way_latency_ms/60_000,1)} MIN · ONE WAY`;document.querySelector('#queue-count').textContent=`${state.comms.counts.queued??0} QUEUED`;document.querySelector('#comms-times').innerHTML=`<div class="queue-times"><div><small>SPACECRAFT EVENT TIME</small><p class="mono">${time(state.mission.spacecraft_time)} UTC</p></div><div><small>LAST EARTH OBSERVATION</small><p class="mono">${time(state.ground?.observed_at)}</p></div><div><small>LAST EARTH RECEIPT</small><p class="mono">${time(state.ground?.received_at)}</p></div><div><small>MONITORING NODE</small><p>${connected?esc(monitoringState(health,healthAt).label):'Monitoring status unknown'}</p></div></div>`;const b=document.querySelector('[data-action="blackout"]');if(b)b.innerHTML=`${icon('comms',14)}${state.comms.blackout?'Restore Earth link':'Simulate blackout'}`;}
async function loadQueue(){const current=currentRequest();const el=document.querySelector('#queue-content');if(!el)return;if(!allowed('message')){el.innerHTML='<div class="empty-state">Case queue access requires a crew or mission review role.</div>';return;}try{const q=await api('/comms/queue');if(!current()||page!=='comms')return;paint(el,q.messages.length?q.messages.map(m=>`<div class="queue-message"><div class="case-topline"><h3>${esc(m.payload.id)}</h3><span class="tag">${esc(m.status.replaceAll('_',' '))}</span></div><small>${esc(m.payload.crew_id)} · human-acknowledged report · priority ${m.priority}</small><div class="queue-times"><div><small>OBSERVED</small><p class="mono">${time(m.observed_at)}</p></div><div><small>TRANSMITTED</small><p class="mono">${time(m.transmitted_at)}</p></div><div><small>EARLIEST DELIVERY</small><p class="mono">${time(m.deliver_at)}</p></div><div><small>EARTH RECEIVED</small><p class="mono">${time(m.received_at)}</p></div></div><p class="evidence-foot">${m.attempts} transmission attempts · ${m.failure_reason?esc(m.failure_reason):'SHA-256 payload integrity recorded'}</p></div>`).join(''):'<div class="empty-state">No case report queued yet.<br>Acknowledge a detector case to prepare an Earth report. Telemetry packets use the same link scheduler.</div>');}catch(e){if(current())el.textContent='Queue unavailable: '+e.message;}}
function renderKnowledge(main){main.innerHTML=`${heading('Onboard research library','Trusted source context, available without an Internet connection.','<span class="tag">LOCAL RETRIEVAL · NO LLM</span>')}<div class="split-layout"><section class="panel wide-panel"><div class="eyebrow">ASK THE ONBOARD CORPUS</div><h2 style="margin-top:9px">Knowledge for an Earth-independent crew.</h2><p class="muted" style="font-size:11px;margin-top:10px">Search ten curated NASA, NTRS, PhysioNet and NIST source summaries. Topic matches return cited paraphrases. Unsupported questions abstain.</p><form class="query-form" id="knowledge-form"><input class="field" id="knowledge-query" name="query" maxlength="1200" placeholder="Why monitor sleep and heart-rate trends together?" aria-label="Research question" required><button class="button primary" ${allowed('rag')?'':'disabled'}>${icon('book',14)}Search sources</button></form><div class="question-chips">${['Why monitor sleep and fatigue?','How does communication delay affect care?','What is OSDR?','What is sensor quality context?'].map(q=>`<button data-query="${esc(q)}">${esc(q)}</button>`).join('')}</div><div id="knowledge-result"></div></section><section class="panel wide-panel"><div class="eyebrow">SOURCE BOUNDARIES</div><h2 style="margin:10px 0 15px">A research companion.</h2><p class="muted" style="font-size:12px;line-height:1.9">The local corpus contains short, project-authored summaries of checked public source pages. It does not contain a flight-certified protocol manual, full medical literature, personal health records or an embedded language model.</p><div class="timeline-step"><span class="step-check">${icon('check',11)}</span>Versioned, hashed source summaries</div><div class="timeline-step"><span class="step-check">${icon('check',11)}</span>Title, publisher, section and source URL</div><div class="timeline-step"><span class="step-check">${icon('check',11)}</span>Explicit abstention and human review</div><button class="button ghost" data-page="sources" style="margin-top:15px">${icon('shield',14)}Inspect provenance</button></section></div>${footer()}`;updateKnowledge();}
function updateKnowledge(){const el=document.querySelector('#knowledge-result');if(!el)return;if(!allowed('rag')){el.innerHTML='<div class="notice">This local role cannot query protected research assistance.</div>';return;}if(!queryResult){el.innerHTML='<div class="empty-state">Ask a source-based question to inspect the evidence.</div>';return;}el.innerHTML=`<div class="answer-meta"><span class="tag">${esc(queryResult.status.toUpperCase())}</span><span class="tag">${esc(queryResult.method)}</span></div><div class="answer">${esc(queryResult.answer)}</div>${queryResult.citations.map(c=>`<a class="citation" href="${esc(c.url)}" target="_blank" rel="noreferrer">[${c.number}] ${esc(c.title)} ${icon('arrow',11)}<small>${esc(c.publisher)} · ${esc(c.section)} · checked ${esc(c.accessed_at)}</small></a>`).join('')}<p class="evidence-foot">Retrieval confidence: ${esc(queryResult.confidence)}. Source context supports review; it does not establish a diagnosis.</p>`;}
function renderScenarios(main){main.innerHTML=`${heading('Scenario lab','Reproducible mission stories. Controlled signals, transparent ground truth.',`${toggleView()}<label class="scenario-seed">GENERATOR SEED<input id="scenario-seed" class="field mono" type="number" value="${esc(scenarioSeed)}" min="0" max="2147483647" aria-label="Deterministic simulation seed"></label><button class="button ghost" data-stop-scenario ${!canAct('scenario')||state.scenario.id==='nominal'?'disabled':''}>Stop active scenario</button>`)}<div class="notice info scenario-notice">${icon('flask',15)}<span>Every scenario is synthetic. Detection reads measurements, activity and quality; it never receives the scenario label. Current: <strong id="active-scenario">${esc(state.scenario.id)}</strong>.</span></div>
  <section class="panel wide-panel scenario-demo" aria-labelledby="demo-heading"><div class="eyebrow">CONTROLLED SYNTHETIC DEMONSTRATION · ${DEMO_HR.version}</div><h2 id="demo-heading">One astronaut. Measured evidence.</h2><p class="muted">A finite heart-rate change, assessed by the existing detector. No clinical threshold, diagnosis or guaranteed alert.</p><div class="controls-grid"><label for="demo-target">Fictional astronaut<select id="demo-target" class="field" ${canAct('scenario')?'':'disabled'}>${state.crew.map(c=>`<option value="${c.id}" ${demoTarget===c.id?'selected':''}>${esc(c.name)} · ${esc(c.call_sign)} · ${c.id}</option>`).join('')}</select></label><div><p>30s onset · 60s ramp · 240s plateau · 60s return</p><p class="muted">390 mission seconds · +5 personal baseline scale units · bounded synthetic HR only</p><button class="button primary" data-scenario="${DEMO_HR.id}" ${canAct('scenario')?'':'disabled'}>${icon('play',12)}Start selected-crew HR demo</button></div></div><p class="evidence-foot">Demo administrator only. Selection applies to the next run. Imported or unknown HR ownership is rejected. Stop retains history, alerts and queues; blackout must be restored separately. This mission is shared by connected viewers.</p><p id="demo-status" role="status" aria-live="polite" aria-atomic="true"></p><div id="demo-evidence"></div></section>
  <div class="scenario-grid">${SCENARIOS.filter(s=>s.id!==DEMO_HR.id).map((s,i)=>`<article class="scenario-card ${state.scenario.id===s.id?'running':''}">${icon(['orbit','heart','activity','brain','alert','sun','comms','shield','comms'][i],25)}<div class="eyebrow">${esc(s.category)}</div><h2>${esc(s.title)}</h2><p>${esc(s.description)}</p><button class="button ${i===1?'primary':'ghost'}" data-scenario="${s.id}" ${allowed('scenario')?'':'disabled'}>${icon('play',12)}${state.scenario.id===s.id?'Restart scenario':'Run scenario'}</button><small style="margin-top:12px;font-size:9px">${esc(s.expected)}</small></article>`).join('')}</div><p class="evidence-foot">Starting a scenario retains earlier cases and audit records. Stop resumes nominal generation; it does not erase history or restore the Earth link.</p>${footer()}`;updateScenarioDemo();}
function updateScenarioDemo(){
  const label=document.querySelector('#demo-status');if(!label)return;
  if(view==='earth'){
    label.textContent='Earth received view: onboard demonstration status is withheld. Switch to Spacecraft to operate the demo; inspect received alerts in Mission Overview.';
    paint('#demo-evidence','<p class="muted">No unreceived onboard alert or case is substituted in this view.</p>');return;
  }
  const d=state.scenario.demo;
  const ready=connected&&Date.now()-lastPacketAt<=5000&&monitoringState(health,healthAt).ready;
  const status=!ready?'UNKNOWN · current monitoring/API availability is not established.':!d?'Ready to configure a synthetic demonstration.':
    d.monitoring_state==='detected'?`DETECTED · recorded ${d.risk.severity} alert · ${d.phase}. Human review required.`:
    d.monitoring_state==='unknown'?`UNKNOWN · ${d.reason}`:d.monitoring_state==='no_alert'?'COMPLETED · no matching detector alert recorded; no healthy or clinical conclusion.':
    d.monitoring_state==='stopped'?'STOPPED · injection ended; existing evidence and queues are retained.':`PENDING · ${d.phase} · no qualifying alert yet.`;
  if(label.textContent!==status)label.textContent=status;
  if(!d){paint('#demo-evidence','<p class="muted">No selected-crew HR demonstration is recorded. Existing presets remain available below.</p>');return;}
  const target=state.crew.find(c=>c.id===d.target_crew_id);
  paint('#demo-evidence',`<p><strong>${esc(target?.name??d.target_crew_id)} · ${esc(d.target_crew_id)}</strong> · ${d.current_run?'Current demonstration':'Last demonstration; a different scenario is now active'}</p><p class="mono demo-run">Run ${esc(d.run_id)}</p><p>Started ${time(d.started_at)} UTC · elapsed ${fmt(d.elapsed_seconds)} mission seconds · latest HR observation ${time(d.source_observed_at)} UTC</p><p class="muted">${esc(d.reason??'Await actual measurement evidence.')} ${d.quality_gaps?'Measurement/monitoring gaps were recorded during this run.':''}</p>${d.risk?`<p>Alert ${esc(d.risk.id)} · ${esc(d.risk.status)} · ${esc(d.case_state??'Case pending')} · recorded ${time(d.risk.created_at)} UTC</p>`:''}<div class="evidence-actions"><button class="button ghost" data-crew="${d.target_crew_id}">Inspect target telemetry</button><button class="button ghost" data-page="agent">Review template case</button><button class="button ghost" data-page="comms">Inspect Earth queue</button></div><p class="evidence-foot">Reports are deterministic templates, not LLM analysis. Only a human acknowledgement queues a case report. Earth receives packets after the configured simulated delay.</p>`);
}
async function renderSources(main){const current=currentRequest();main.innerHTML=`${heading('Evidence & provenance','Know where every claim, reading and model comes from.','<span class="tag">TRANSPARENT BY DESIGN</span>')}<div class="notice info">${icon('shield',16)}All mission telemetry is synthetic. Accepted observations retain their simulator or import source. Public studies provide research context. A voluntary check-in records your actual task timing separately and makes no clinical claim.</div><div class="section-line"><h2>Curated research sources</h2><p>Versioned source summaries · SHA-256</p></div><div id="source-grid" class="source-grid"></div><div class="section-line"><h2>Public dataset catalogue</h2><p>Acquisition status is explicit</p></div><section class="panel table-wrap" id="dataset-catalogue"></section><div class="section-line"><h2>Model & audit evidence</h2><span class="tag">RESEARCH PROTOTYPE</span></div><div id="model-cards" class="source-grid"></div><section class="panel" style="margin-top:18px" id="audit-content"></section>${footer()}`;
  const load=async(selector,path,render,label)=>{
    paint(selector,'<div class="empty-state" role="status">Loading '+label.toLowerCase()+'…</div>');
    try{const value=await api(path);if(current()&&page==='sources')paint(selector,render(value));}
    catch(error){if(current())paint(selector,'<div class="empty-state" role="status">'+label+' unavailable: '+esc(error.message)+'</div>');}
  };
  const metadata=async()=>{
    paint('#source-grid','<div class="empty-state" role="status">Loading source metadata…</div>');
    paint('#dataset-catalogue','<div class="empty-state" role="status">Loading dataset catalogue…</div>');
    try{
      const value=provenance??await api('/provenance');if(!current()||page!=='sources')return;provenance=value;
      paint('#source-grid',value.sources.map(s=>`<article class="panel source-card"><div class="eyebrow">${esc(s.publisher)}</div><h3><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ${icon('arrow',11)}</a></h3><p>${esc(s.summary)}</p><div class="hash">SHA-256 ${esc(s.sha256)}</div><small>${esc(s.content_kind)} · ${esc(s.corpus_version)} · checked ${esc(s.accessed_at)}</small></article>`).join(''));
      paint('#dataset-catalogue',`<table class="dataset-table"><thead><tr><th>Dataset</th><th>Integration status</th><th>License / scientific boundary</th></tr></thead><tbody>${value.datasets.map(d=>`<tr><td><a href="${esc(d.url)}" target="_blank" rel="noreferrer">${esc(d.title)}</a><small>${esc(d.kind)}</small></td><td>${esc(d.status)}</td><td>${esc(d.license)}<small>${esc(d.usage)}</small></td></tr>`).join('')}</tbody></table>`);
    }catch(error){if(current()){const message='<div class="empty-state" role="status">Source metadata unavailable: '+esc(error.message)+'</div>';paint('#source-grid',message);paint('#dataset-catalogue',message);}}
  };
  const tasks=[metadata()];
  if(allowed('models'))tasks.push(load('#model-cards','/models',cards=>cards.map(m=>`<article class="panel source-card"><span class="tag">${esc(m.id)}</span><h3>${esc(m.name)}</h3><p>${esc(m.inputs)}</p><p style="margin-top:9px">${esc(m.limitations)}</p></article>`).join(''),'Models'));
  else paint('#model-cards','<div class="empty-state">Model evidence requires an authorized research or review role.</div>');
  if(allowed('audit')||allowed('audit_self')||allowed('audit_limited'))tasks.push(load('#audit-content','/audit',audit=>`<div class="panel-heading"><h2>Audit timeline</h2><span class="tag">CHAIN ${audit.chain_valid?'VERIFIED':'INVALID'}</span></div>${audit.events.slice(0,20).map(e=>`<div class="audit-event"><div><p>${esc(e.action)}</p><small>${esc(e.actor)} · ${esc(e.resource_id)}</small></div><span class="mono muted">${time(e.ts)} UTC</span></div>`).join('')}`,'Audit'));
  else paint('#audit-content','<div class="empty-state">Audit records require an authorized role.</div>');
  await Promise.all(tasks);
}
function renderCognitive(main){main.innerHTML=`${heading('Crew check-in','A voluntary personal measurement. No diagnostic score or population ranking.','<span class="tag">PERSONAL TASK · APPROXIMATE TIMING</span>')}<div class="split-layout"><section class="panel wide-panel"><h2>Reaction-time check</h2><p class="muted" style="margin-top:10px;font-size:11px">Wait for the target to turn green, then press it or use Enter. Complete five trials. Early clicks and readings outside 100–3000 ms are excluded.</p><button id="reaction-target" class="cognitive-target" data-action="reaction" ${allowed('checkin')?'':'disabled'}><strong>Begin check-in</strong><span>Five short trials · use mouse, touch or Enter</span></button><div id="reaction-trials" class="trial-list"></div><label class="fatigue-field">How fatigued do you feel? <span id="fatigue-label">3 / 10</span><input id="fatigue-input" type="range" min="0" max="10" value="3" aria-label="Subjective fatigue from zero to ten"></label><button class="button primary" id="save-checkin" data-action="save-checkin" disabled>${icon('check',14)}Save personal check-in</button><p class="evidence-foot">Saved under ${esc(crewId)}. Task timing depends on your device and browser. A check-in does not change synthetic sensor measurements or personal baselines.</p></section><section class="panel wide-panel"><h2>Recent personal check-ins</h2><div id="checkin-history"></div></section></div>${footer()}`;reaction={phase:'idle',trials:[],timer:null};loadCheckins();}
async function loadCheckins() {
  const el=document.querySelector('#checkin-history');if(page!=='cognitive'||!el)return;
  const current=currentRequest();
  if(!allowed('checkin_read')&&!allowed('checkin_read_own')){paint(el,'<div class="empty-state">Private check-in history requires crew or authorized mission review access.</div>');return;}
  paint(el,'<div class="empty-state" role="status">Loading permitted personal check-ins…</div>');
  try {
    const data=await api(`/crew/${crewId}/checkins`);if(!current()||page!=='cognitive')return;
    paint(el,data.length?data.map(c=>`<div class="queue-message"><h3>${fmt(c.mean_reaction_ms)} ms <span class="muted">mean reaction</span></h3><p class="muted">Fatigue ${c.fatigue}/10 · ${c.reaction_ms.length} trials · ${time(c.ts)} UTC</p><small>USER MEASUREMENT · not synthetic telemetry</small></div>`).join(''):'<div class="empty-state">No permitted voluntary task measurements recorded.</div>');
  } catch(error) { if(current())paint(el,'<div class="empty-state" role="status">Check-in history unavailable: '+esc(error.message)+'</div>'); }
}
function reactionClick(){const target=document.querySelector('#reaction-target');if(!target)return;if(reaction.phase==='waiting'){clearTimeout(reaction.timer);reaction.phase='idle';target.className='cognitive-target';target.innerHTML='<strong>Too early</strong><span>Press to retry this trial.</span>';return;}if(reaction.phase==='ready'){const ms=Math.round(performance.now()-reaction.readyAt);reaction.phase='idle';target.className='cognitive-target';if(ms>=100&&ms<=3000)reaction.trials.push(ms);else toast('Timing outside the accepted task range; retry the trial.');document.querySelector('#reaction-trials').innerHTML=reaction.trials.map((t,i)=>`<span>${i+1} · ${t} ms</span>`).join('');if(reaction.trials.length>=5){reaction.phase='complete';target.innerHTML=`<strong>${fmt(reaction.trials.reduce((a,b)=>a+b,0)/reaction.trials.length)} ms</strong><span>Mean measured reaction · ready to save</span>`;target.disabled=true;document.querySelector('#save-checkin').disabled=false;return;}target.innerHTML=`<strong>Trial ${reaction.trials.length+1} of 5</strong><span>Press to begin the next trial.</span>`;return;}if(reaction.phase==='complete')return;if(reaction.phase==='saved'){reaction.trials=[];document.querySelector('#reaction-trials').innerHTML='';}reaction.phase='waiting';target.className='cognitive-target waiting';target.innerHTML='<strong>Wait for green…</strong><span>Keep your finger ready.</span>';reaction.timer=setTimeout(()=>{if(page!=='cognitive')return;reaction.phase='ready';reaction.readyAt=performance.now();target.className='cognitive-target ready';target.innerHTML='<strong>Now.</strong><span>Press the target</span>';},1500+Math.random()*2000);}
async function renderReplay(main){const current=currentRequest();replayHistory=[];main.innerHTML=`${heading('Mission replay',`${crewId} · inspect previously stored synthetic observations without changing live state.`,actionButton('crew-page','Return to live twin','arrow','ghost'))}<div class="notice">${icon('clock',14)}Historical inspection. The live mission continues in the background. Any displayed review evidence keeps its original time.</div><section class="panel"><div class="replay-controls"><label for="replay-range">OBSERVATION</label><input id="replay-range" disabled type="range" min="0" max="0" value="0"><span class="mono" id="replay-time"></span></div><div class="wide-panel"><div id="replay-metrics" class="metric-grid"></div><div id="replay-chart" class="chart-content"><div class="empty-state" role="status">Loading stored observations…</div></div></div></section>${footer()}`;
  try {
    const before=view==='earth'?state.ground?.observed_at:null;
    if(view==='earth'&&!before){paint('#replay-chart','<div class="empty-state">Awaiting an Earth-received packet. No onboard history is substituted.</div>');return;}
    const result=await api(`/crew/${crewId}/telemetry?limit=1000${before?'&before='+encodeURIComponent(new Date(before).toISOString()):''}`);
    if(!current()||page!=='replay')return;replayHistory=result;
    if(!result.length){paint('#replay-chart','<div class="empty-state">No stored observations are available for this authorized reception view.</div>');return;}
    const slider=document.querySelector('#replay-range');slider.max=result.length-1;slider.value=slider.max;slider.disabled=false;updateReplay(Number(slider.max));
  } catch(error) { if(current())paint('#replay-chart','<div class="empty-state" role="status">Replay unavailable: '+esc(error.message)+'</div>'); }
}
function updateReplay(index){replayIndex=index;const c=replayHistory[index];if(!c)return;document.querySelector('#replay-time').textContent=`${time(c.ts)} UTC · ${c.status??c.quality}`;document.querySelector('#replay-metrics').innerHTML=['heart_rate','hrv','spo2','sleep_duration','fatigue','respiratory_rate'].map(k=>`<div class="metric-tile"><small>${k==='sleep_duration'?esc(sleepDetails(c).label):METRICS[k].label}</small><p>${fmt(metricHistory([c],k)[0]?.value,k==='sleep_duration'?1:0)}<span>${METRICS[k].display}</span></p>${k==='sleep_duration'?`<small>${esc(sleepDetails(c).detail)}</small>`:''}</div>`).join('');document.querySelector('#replay-chart').innerHTML=lineChart(replayHistory.slice(Math.max(0,index-120),index+1),'heart_rate',state.crew.find(v=>v.id===crewId)?.baseline?.heart_rate);}
function refreshLive(){
  if(!state||!identity||document.hidden)return;
  refreshTop();
  if(page==='overview')updateOverview();
  if(page==='crew'){updateCrew();if(tick%4===0){void loadHistory();void loadForecast();}}
  if(page==='agent')updateAgent();
  if(page==='comms'){updateComms();if(tick%3===0)void loadQueue();}
  if(page==='scenario'){
    const label=document.querySelector('#active-scenario');if(label)label.textContent=state.scenario.id;
    for(const card of document.querySelectorAll('.scenario-card'))card.classList.toggle('running',card.querySelector('[data-scenario]')?.dataset.scenario===state.scenario.id);
    updateScenarioDemo();
  }
  syncControls();
}
function consume(snapshot){
  if(!validSnapshot(snapshot))throw new Error('Invalid mission snapshot; no readings applied.');
  if(state?.server_received_at&&Date.parse(snapshot.server_received_at)<Date.parse(state.server_received_at))return false;
  if(state?.scenario.run_id!==snapshot.scenario.run_id){requests.invalidate();history=[];histories.clear();}
  state=snapshot;connected=true;lastPacketAt=Date.now();tick++;
  for(const key of caseStates.keys())if(!snapshot.alerts.some(r=>r.id===key))caseStates.delete(key);
  try{if(snapshot.mission.synthetic===true)localStorage.setItem('astra-synthetic-snapshot',JSON.stringify({...snapshot,cases:[]}));}catch{}
  for(const c of snapshot.crew){
    const arr=histories.get(c.id)??[], previous=arr.at(-1);
    if(!previous||JSON.stringify(previous.metric_observations)!==JSON.stringify(c.metric_observations)||previous.observed_at!==c.observed_at){arr.push({...c,ts:snapshot.mission.spacecraft_time});if(arr.length>120)arr.shift();}
    histories.set(c.id,arr);
  }
  for(const risk of effectiveAlerts()){
    const key=view+':'+risk.id;
    if(!seenAlerts.has(key)&&risk.status==='open'&&monitoringState(health,healthAt).ready)toast((view==='earth'?'Earth received: ':'Onboard: ')+risk.crew_id+' · '+risk.display.status_text,false);
    seenAlerts.add(key);
  }
  if(document.querySelector('#main'))refreshLive();
  void probeCases();return true;
}
function connectStream(){
  source?.close();if(identity?.offline||!identity||!state||identity.role==='system_admin')return;
  const version=sessionVersion,stream=new EventSource('/v1/stream/missions/'+state.mission.id);source=stream;
  stream.addEventListener('snapshot',event=>{
    if(version!==sessionVersion||source!==stream)return;
    try{transportMode='stream';consume(JSON.parse(event.data));}catch{connected=false;refreshLive();}
  });
  stream.onerror=()=>{if(version===sessionVersion&&source===stream){connected=false;transportMode='reconnecting';refreshLive();void pollStatus();}};
}
async function refreshState(){
  const version=sessionVersion,request=++stateRequest,previous=lastPacketAt;
  const snapshot=await api('/state',undefined,{global:true});
  if(version!==sessionVersion||request!==stateRequest)return;
  if(lastPacketAt!==previous&&state?.server_received_at>=snapshot.server_received_at)return;
  consume(snapshot);
}
async function renderLogin(){
  disposeScenes();source?.close();
  root.innerHTML=`<div class="login-page">
    <div class="login-visual" role="region" aria-label="Mission introduction">
      ${brand()}<div id="login-earth" class="scene-holder"></div>
      <div class="login-story"><div class="eyebrow">Autonomous Space Telemedicine<br>& Research Assistant</div>
        <h1>Beyond Earth.<br><span>Within reach.</span></h1>
        <p>A clearer picture of crew health.<br>Even when Earth is a world away.</p>
      </div>
      <div class="landing-coordinate"><span class="mission-rule"></span><p>ARES I / MARS TRANSIT<br><small>Schematic mission · historical Earth imagery</small></p></div>
      <details class="landing-scene-tools"><summary>Earth & display controls</summary><div class="landing-tools-content">${sceneTools('login-earth')}<p class="asset-credit" id="earth-assets">Loading local Earth imagery…</p><button class="button ghost" data-action="graphics" aria-label="Toggle performance mode" aria-pressed="${performanceMode}">${icon('settings',14)}<span>Performance mode</span></button></div></details>
    </div>
    <main id="main" class="login-form-side" tabindex="-1">
      <form class="login-form" id="login-form">
        <div class="entry-index"><span>ASTRA COMMAND</span><span>01 / ENTRY</span></div>
        <span class="tag">LOCAL RESEARCH SIMULATION</span>
        <h2>Care, beyond<br>the horizon.</h2>
        <p>Enter a mission with six fictional astronauts. Follow their health, understand the evidence, and keep care connected across deep space.</p>
        <div class="entry-capabilities"><span>06 <small>Fictional crew</small></span><span>Local <small>Monitoring first</small></span></div>
        <label for="login-role">Demonstration role<select id="login-role" name="role">
          <option value="demo_admin">Demo administrator · full simulation</option><option value="mission_control">Mission control · review operations</option><option value="flight_surgeon">Flight surgeon · evidence review</option><option value="astronaut">Astronaut · CREW-03 only</option><option value="viewer">Viewer · read-only dashboard</option><option value="researcher">Researcher · de-identified context</option><option value="system_admin">System administrator · audit only</option>
        </select></label>
        <button class="button primary">Enter simulation ${icon('arrow',15)}</button>
        <p class="login-note">Local role selection is a demonstration convenience, not production authentication. All telemetry is synthetic. Not a medical device, NASA-certified or flight-qualified. No credentials or external AI service required.</p>
        <p class="login-note" id="login-error" role="status"></p>
      </form>
    </main>
  </div>`;
  createScene('login-earth','earth');syncGraphics();
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('button,a[data-action]');if(!button||button.disabled)return;
  try{
    if(button.dataset.twinView){if(!['anatomy','schematic'].includes(button.dataset.twinView)||page!=='crew')return;twinView=button.dataset.twinView;renderPage();document.querySelector(`[data-twin-view="${twinView}"]`)?.focus();return;}
    if(button.dataset.anatomyLayer){const layer=button.dataset.anatomyLayer;if(!(layer in anatomyLayers))return;anatomyLayers[layer]=!anatomyLayers[layer];button.setAttribute('aria-pressed',String(anatomyLayers[layer]));scenes[0]?.setLayer?.(layer,anatomyLayers[layer]);return;}
    if(button.dataset.anatomyCamera){scenes[0]?.camera(button.dataset.anatomyCamera);return;}
    if(button.dataset.camera){const s=scenes.find(s=>s.container.id===button.dataset.scene);if(s){if(['left','right'].includes(button.dataset.camera)){s.rotation+=button.dataset.camera==='left'?-.15:.15;s.requestPaint();}else s.camera(button.dataset.camera);}return;}
    if(button.dataset.page){navigate(button.dataset.page);return;}
    if(button.dataset.crew){if(!state.crew.some(c=>c.id===button.dataset.crew))return;crewId=button.dataset.crew;navigate('crew');return;}
    if(button.dataset.view){if(!['earth','spacecraft'].includes(button.dataset.view))return;view=button.dataset.view;renderPage();refreshTop();void probeCases();return;}
    if(button.dataset.layer){sceneLayer=Number(button.dataset.layer);updateCrew();return;}
    if(button.dataset.query){document.querySelector('#knowledge-query').value=button.dataset.query;document.querySelector('#knowledge-form').requestSubmit();return;}
    if(button.dataset.scenario||button.hasAttribute('data-stop-scenario')){
      if(!canAct('scenario')||busy.has('scenario'))return;busy.add('scenario');syncControls();const current=()=>button.isConnected&&page==='scenario';
      try{const stop=button.hasAttribute('data-stop-scenario'),id=stop?state.scenario.id:button.dataset.scenario;
        if(!stop)scenarioSeed=document.querySelector('#scenario-seed').value;
        const seed=stop?state.scenario.seed:Number(scenarioSeed);
        const target=stop||id!==DEMO_HR.id?{}:{target_crew_id:document.querySelector('#demo-target').value};
        if(target.target_crew_id)demoTarget=target.target_crew_id;
        await api('/scenarios/'+id+(stop?'/stop':'/start'),{seed,...target},{global:true});await refreshState();
        if(current()&&page==='scenario'){renderPage();document.querySelector(`[data-scenario="${stop?DEMO_HR.id:id}"]`)?.focus();}toast(stop?'Scenario stopped; nominal simulation resumed. Imported source ownership and existing records are preserved.':'Synthetic scenario started. Detector persistence uses observation time.');
      }finally{busy.delete('scenario');syncControls();}return;
    }
    if(button.dataset.ack){
      const id=button.dataset.ack,key='ack:'+id;if(!canAct('ack')||view==='earth'||busy.has(key))return;
      busy.add(key);syncControls();
      try{const result=await api('/alerts/'+id+'/ack',{}, {global:true});await refreshState();toast(result.case?.message_id?'Human acknowledgement recorded. Report queued with the configured Earth delay.':'Acknowledgement response received. Inspect the current case state.');}
      catch(error){if(error.status===409){caseStates.delete(id);state.cases=state.cases.filter(c=>c.risk_event_id!==id);await probeCases(true);toast('Acknowledgement was not confirmed: '+error.message+' The original alert is retained.');}else throw error;}
      finally{busy.delete(key);refreshLive();}return;
    }
    const action=button.dataset.action;
    if(action?.endsWith('-page')){navigate(action.replace('-page',''));return;}
    if(action==='blackout'){if(!canAct('comms')||busy.has('blackout'))return;busy.add('blackout');syncControls();try{await api('/comms/control',{blackout:!state.comms.blackout},{global:true});await refreshState();toast(state.comms.blackout?'Simulated Earth link in blackout. Check monitoring and knowledge status separately.':'Link restored. Reports retain their configured delivery delay.');}finally{busy.delete('blackout');syncControls();}return;}
    if(action==='cognitive'){navigate('cognitive');return;}
    if(action==='replay'){navigate('replay');return;}
    if(action==='graphics'){performanceMode=!performanceMode;syncGraphics();toast(performanceMode?'Performance mode: lower rendering cost with continuous motion. Motion preferences remain independent.':'Standard graphics enabled. Motion preferences retained.');return;}
    if(action==='motion'){userReducedMotion=!userReducedMotion;syncGraphics();return;}
    if(action==='reaction'){if(canAct('checkin'))reactionClick();return;}
    if(action==='save-checkin'){if(!canAct('checkin')||reaction.phase!=='complete'||busy.has('checkin'))return;busy.add('checkin');syncControls();try{await api('/checkins',{crew_id:crewId,fatigue:Number(document.querySelector('#fatigue-input').value),reaction_ms:reaction.trials},{global:true});reaction.phase='saved';await loadCheckins();toast('Personal check-in saved separately from synthetic telemetry.');}finally{busy.delete('checkin');syncControls();}return;}
    if(action==='logout'){try{await api('/auth/logout',{}, {global:true});}catch{toast('Local view cleared. Server logout could not be confirmed.');}finally{resetSession();await renderLogin();}}
  }catch(error){if(error.code!=='STALE_SESSION'){button.disabled=false;toast(error.message);}syncControls();}
});
document.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target;const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit)submit.disabled=true;
  try{
    if(form.id==='login-form'){
      const role=new FormData(form).get('role');resetSession();
      const result=await api('/auth/demo',{role},{global:true});await establishSession(result.identity);
    }
    if(form.id==='knowledge-form'){
      if(!canAct('rag')||busy.has('knowledge'))return;const current=currentRequest();busy.add('knowledge');syncControls();
      queryResult=null;paint('#knowledge-result','<div class="empty-state" role="status">Searching the local corpus…</div>');
      try{const result=await api('/rag/query',{query:new FormData(form).get('query')});if(current()&&page==='knowledge'){queryResult=result;updateKnowledge();}}
      catch(error){if(current()){queryResult=null;paint('#knowledge-result','<div class="notice">Knowledge unavailable: '+esc(error.message)+'. No answer or citations are substituted.</div>');}throw error;}
      finally{busy.delete('knowledge');}
    }
    if(form.id==='comms-form'){
      if(!canAct('comms')||busy.has('comms'))return;busy.add('comms');syncControls();
      try{const f=new FormData(form);await api('/comms/control',{one_way_latency_ms:Number(f.get('delay'))*60_000,jitter_ms:Number(f.get('jitter'))*1000,bandwidth_kbps:Number(f.get('bandwidth')),loss:Number(f.get('loss'))/100},{global:true});await refreshState();toast('Simulated link configuration saved and audited.');}
      finally{busy.delete('comms');}
    }
  }catch(error){if(error.code!=='STALE_SESSION'&&error.name!=='AbortError'){if(form.id==='login-form'){const el=document.querySelector('#login-error');if(el)el.textContent=error.message;}else toast(error.message);}}finally{if(submit)submit.disabled=false;syncControls();}
});
document.addEventListener('focusin',event=>{if(event.target.matches('.sidebar .nav-button'))event.target.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});});
document.addEventListener('change',event=>{if(event.target.id==='demo-target')demoTarget=event.target.value;});
document.addEventListener('input',event=>{if(event.target.id==='scenario-seed')scenarioSeed=event.target.value;if(event.target.id==='twin-rotation'&&scenes[0]){scenes[0].rotation=Number(event.target.value)*Math.PI/180;scenes[0].requestPaint();}if(event.target.id==='fatigue-input')document.querySelector('#fatigue-label').textContent=`${event.target.value} / 10`;if(event.target.id==='replay-range')updateReplay(Number(event.target.value));});
document.addEventListener('change',event=>{if(event.target.id==='chart-metric'){chartMetric=event.target.value;updateChart();}});
async function seedHistories(){const version=sessionVersion;await Promise.all(state.crew.map(async c=>{try{const rows=await api(`/crew/${c.id}/telemetry?limit=40`,undefined,{global:true});if(version===sessionVersion)histories.set(c.id,rows);}catch{}}));}
async function establishSession(who){
  identity=who;page=identity.role==='system_admin'?'sources':'overview';
  if(identity.role==='system_admin'){
    state={mission:{id:'MARS-DEMO-01',mission_day:null,spacecraft_time:null,speed:null},crew:[],alerts:[],cases:[],comms:{counts:{}},scenario:{},environment:null};
    connected=true;lastPacketAt=Date.now();await pollStatus();shell();return;
  }
  const snapshot=await api('/state',undefined,{global:true});if(!validSnapshot(snapshot))throw new Error('The mission response is invalid.');
  state=snapshot;connected=true;lastPacketAt=Date.now();transportMode='polling';
  crewId=state.crew.some(c=>c.id===crewId)?crewId:state.crew[0].id;
  for(const risk of state.alerts)seenAlerts.add('spacecraft:'+risk.id);
  await pollStatus();await seedHistories();shell();connectStream();
}
async function boot(){
  document.body.classList.toggle('reduce-motion',reducedMotion);
  try{const who=await api('/auth/me',undefined,{global:true});await establishSession(who);}
  catch(error){
    if(error.status===401){resetSession();await renderLogin();return;}
    try{const cached=JSON.parse(localStorage.getItem('astra-synthetic-snapshot'));if(validSnapshot(cached)&&cached.mission.synthetic===true){state={...cached,cases:[]};identity={role:'viewer',offline:true};health=null;connected=false;shell();return;}}catch{}
    resetSession();await renderLogin();const el=document.querySelector('#login-error');if(el)el.textContent='Start the local server with npm start, then reload. No fresh health data is available.';
  }
}
const heartbeat=setInterval(()=>{if(connected&&lastPacketAt&&Date.now()-lastPacketAt>5000){connected=false;refreshLive();}void pollStatus();},2000);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>syncGraphics());
window.addEventListener('pagehide',()=>{waveDispose?.();waveDispose=null;n10Dispose?.();n10Dispose=null;source?.close();source=null;requests.invalidate();disposeScenes();});
window.addEventListener('pageshow',event=>{if(event.persisted&&identity&&state){renderPage();connectStream();void pollStatus();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&identity&&state){refreshLive();void pollStatus();}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(error=>console.info('PWA cache unavailable:',error.message));
boot();
