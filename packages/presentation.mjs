import { CREW, METRICS } from './contracts.mjs';

export const PACKET_TIMEOUT_MS = 5000;
export const HEALTH_TIMEOUT_MS = 7000;
export function validSnapshot(s) {
  return Boolean(s?.schema_version === 'astra.snapshot.v1' && s.mission?.id && Number.isFinite(Date.parse(s.mission.spacecraft_time))
    && Number.isFinite(s.mission.speed) && Number.isFinite(Date.parse(s.server_received_at)) && Array.isArray(s.crew) && s.crew.length > 0
    && new Set(s.crew.map(c => c.id)).size === s.crew.length
    && s.crew.every(c => CREW.some(p => p.id === c.id) && c.values && typeof c.values === 'object')
    && Array.isArray(s.alerts) && Array.isArray(s.cases) && s.comms && s.scenario
    && (!s.ground || Array.isArray(s.ground.crew) && Array.isArray(s.ground.alerts) && Number.isFinite(s.ground.observed_at)
      && s.ground.crew.every(c=>s.crew.some(v=>v.id===c.id)&&c.values)));
}
export function monitoringState(health, at, now = Date.now()) {
  if (!health || !Number.isFinite(at) || now - at > HEALTH_TIMEOUT_MS) return { ready: false, label: 'Monitoring status unknown', knowledge: 'Knowledge availability unknown' };
  const ready = health.ready === true && ['running', 'manual'].includes(health.monitoring?.status);
  return { ready, label: ready ? health.monitoring.status === 'manual' ? 'Monitoring in manual mode' : 'Monitoring operational'
    : `Monitoring ${health.monitoring?.status ?? 'unavailable'}`,
    knowledge: health.enrichment?.status === 'ready' ? 'Knowledge and case service ready'
      : health.enrichment?.status === 'pending' ? 'Case enrichment pending' : 'Knowledge / case service degraded' };
}
/** Project the selected reception view; never substitute onboard health for missing Earth packets. */
export function present(snapshot, { view = 'spacecraft', connected = false, lastPacketAt = 0, health = null, healthAt = 0, now = Date.now() } = {}) {
  if (!snapshot) return { crew: [], alerts: [], cases: [], environment: null, stale: true };
  const earth = view === 'earth'; const ground = snapshot.ground;
  const monitoring = monitoringState(health, healthAt, now);
  const onboardTime = Date.parse(snapshot.mission.spacecraft_time);
  const received = ground?.crew ?? snapshot.crew.map(c => ({ ...c, values: {}, metric_observations: {}, observed_at: null, risk_id: null, evidence: [] }));
  const stale = !connected || now - lastPacketAt > PACKET_TIMEOUT_MS || !monitoring.ready || earth && (!ground || snapshot.comms.blackout
    || onboardTime - ground.observed_at > snapshot.comms.one_way_latency_ms + snapshot.mission.speed * 4000 + snapshot.comms.jitter_ms);
  const crew = (earth ? received : snapshot.crew).map(c => {
    const observationNow = earth ? ground?.observed_at : onboardTime;
    const values = {}; const metric_quality = {};
    for (const name of Object.keys(METRICS)) {
      const event = c.metric_observations?.[name]; const q = c.metric_quality?.[name];
      const eventTime = event?.sleep_session ? Math.min(Date.parse(event.ts),Date.parse(event.sleep_session.end_at)) : Date.parse(event?.ts);
      const expired = event && (!Number.isFinite(eventTime) || eventTime > observationNow || observationNow - eventTime > Math.max(5000, 3000 / event.source?.sampling_hz));
      const reliable = !stale && (!earth || ground) && c.quality === 'good' && c.confidence >= 0.7 && !c.artifact
        && (!q || q.status === 'good' && q.confidence >= 0.7 && !q.artifact && !q.stale)
        && (!event || event.integrity === 'verified' && event.quality?.status === 'good' && event.quality?.confidence >= 0.7 && !event.quality?.artifact && !expired)
        && Number.isFinite(c.values[name]);
      values[name] = reliable ? c.values[name] : null;
      metric_quality[name] = { ...q, available: reliable };
    }
    const good = Object.values(metric_quality).every(q => q.available);
    return { ...c, ...CREW.find(p=>p.id===c.id), values, metric_quality, quality: good ? 'good' : 'missing', status: good && ['green', 'amber', 'red'].includes(c.status) ? c.status : 'gray',
      status_text: good ? c.status_text : stale ? 'Cached / unavailable — current measurements unknown' : 'Verify measurement — missing, stale or unreliable signal' };
  });
  return { crew, alerts: earth ? ground?.alerts ?? [] : snapshot.alerts, cases: earth ? [] : snapshot.cases,
    environment: stale ? null : earth ? ground?.environment ?? null : snapshot.environment, stale, monitoring };
}
export class RequestGate {
  constructor() { this.version = 0; this.controllers = new Set(); }
  invalidate() { this.version++; for (const c of this.controllers) c.abort(); this.controllers.clear(); }
  ticket() { const version = this.version; return () => this.version === version; }
}

/** Keep focused controls mounted while updating sibling panels during streaming refreshes. */
export function patchContent(element, html) {
  if (!element || element.innerHTML === html) return;
  const active = element.ownerDocument?.activeElement;
  if (!active || !element.contains(active)) { element.innerHTML = html; return; }
  const holder = element.ownerDocument.createElement('template'); holder.innerHTML = html;
  const morph = (parent, incoming) => {
    if (parent === active) {
      for (const attr of ['disabled', 'aria-disabled', 'aria-label', 'aria-pressed', 'class']) {
        if (incoming.hasAttribute(attr)) parent.setAttribute(attr, incoming.getAttribute(attr)); else parent.removeAttribute(attr);
      }
      if (['BUTTON', 'A'].includes(parent.tagName) && parent.innerHTML !== incoming.innerHTML) parent.innerHTML = incoming.innerHTML;
      return;
    }
    const children = [...parent.childNodes]; const next = [...incoming.childNodes];
    if (children.length !== next.length || children.some((c, i) => c.nodeType !== next[i].nodeType || c.nodeName !== next[i].nodeName)) {
      if (!parent.contains?.(active)) parent.replaceChildren(...next.map(n => n.cloneNode(true)));
      return;
    }
    for (let i = 0; i < children.length; i++) {
      const old = children[i], fresh = next[i];
      if (old.nodeType === 3) { if (old.textContent !== fresh.textContent) old.textContent = fresh.textContent; continue; }
      if (old === active || old.contains(active)) morph(old, fresh);
      else if (!old.isEqualNode(fresh)) old.replaceWith(fresh.cloneNode(true));
    }
  };
  morph(element, holder.content);
}
