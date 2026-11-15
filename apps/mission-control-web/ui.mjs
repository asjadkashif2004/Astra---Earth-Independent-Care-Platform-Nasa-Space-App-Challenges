export function escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
export const fmt = (v, digits = 0) => Number.isFinite(v) ? v.toFixed(digits) : '—';
export const time = value => value !== null && value !== undefined && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' }) : 'Awaiting packet';
export function sleepDetails(crew){
  const e=crew.metric_observations?.sleep_duration,s=e?.sleep_session??crew.sleep_session;
  const valid=s?.session_id&&Number.isFinite(Date.parse(s.end_at));
  return valid?{label:'Last sleep',detail:`Completed ${s.end_at.replace('T',' ')} · revision ${s.revision} · ${e?.source.kind??crew.sleep_session?.source.kind??'source unknown'} · observed ${e?.ts??crew.sleep_session?.observed_at??'unknown'}${s.historical_fixture?' · synthetic historical fixture':''}`}:
    {label:'Sleep observation',detail:`Session unverified · ${e?.source.kind??'legacy source'} · observed ${e?.ts??crew.ts??'unknown'}. No completed-session identity was supplied.`};
}
export function hasCurrentEvidence(crew, risk) { return Boolean(risk && crew && risk.id === crew.risk_id && crew.quality === 'good'); }
export const icon = (name, size = 18) => {
  const paths = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    crew: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a5 5 0 0 0-3-4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="m4 12 4 0 2-4 3 8 2-4h5"/>',
    shield: '<path d="m12 3 9 4v5c0 5-6 9-9 10-3-1-9-5-9-10V7Z"/><path d="m8 12 3 3 5-6"/>',
    orbit: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/>',
    comms: '<path d="m4 9 11 11M5 5a10 10 0 0 0 14 14L5 5ZM15 3a6 6 0 0 1 6 6M15 7a2 2 0 0 1 2 2M5 17l-2 5h9"/>',
    flask: '<path d="M9 3h6m-5 0v6l-6 10a1.4 1.4 0 0 0 1 2h14a1.4 1.4 0 0 0 1-2L14 9V3M7 15h10"/>',
    book: '<path d="M12 5C8 2 4 3 2 4v16c3-1 6-1 10 1 4-2 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
    brain: '<path d="M12 4a4 4 0 0 0-7-1 4 4 0 0 0-3 6 5 5 0 0 0 1 8 4 4 0 0 0 9 2V4Zm0 0a4 4 0 0 1 7-1 4 4 0 0 1 3 6 5 5 0 0 1-1 8 4 4 0 0 1-9 2M6 8l3 2-2 4m11-6-3 2 2 4"/>',
    activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1"/>',
    arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/>',
    play: '<path d="m8 4 13 8-13 8V4Z"/>',
    refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v5h-5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    link: '<path d="m9 15 6-6M8 17l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0m2-2 2-2a4 4 0 1 1 5 5l-5 5a4 4 0 0 1-5 0"/>',
    logout: '<path d="M9 3H3v18h6m6-15 6 6-6 6M8 12h13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.orbit}</svg>`;
};
export function statusBadge(status, text) { const labels = { green: 'Nominal', amber: 'Review required', red: 'Priority review', gray: 'Signal unavailable' }; if (!Object.hasOwn(labels, status)) status = 'gray'; return `<span class="status ${status}"><span>${status === 'green' ? '●' : status === 'gray' ? '◌' : '▲'}</span>${escape(text ?? labels[status])}</span>`; }
export function crewInsignia(crew) {
  const number=Number(crew.id.slice(-2)),sides=number+2;
  const points=Array.from({length:sides},(_,i)=>{const a=i*Math.PI*2/sides-Math.PI/2;return `${24+Math.cos(a)*16},${24+Math.sin(a)*16}`;}).join(' ');
  return `<svg class="crew-insignia" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" opacity=".3"/><polygon points="${points}" fill="none" stroke="currentColor" opacity=".6"/><text x="24" y="28" text-anchor="middle" fill="currentColor" font-size="11" font-family="sans-serif">${escape(crew.initials)}</text></svg>`;
}
export function sparkline(values, color = '#54c9b7', width = 180, height = 40, timestamps = null) {
  const clean = values.filter(Number.isFinite); if (clean.length < 2) return '<span class="empty-spark">Awaiting history</span>';
  const min = Math.min(...clean) - 1; const range = Math.max(2, Math.max(...clean) - min + 1);
  const times=timestamps?.map(v=>Date.parse(v));const timed=times?.length===values.length&&times.every(Number.isFinite)&&times.at(-1)>times[0];
  const points = values.map((v, i) => Number.isFinite(v) ? `${timed?(times[i]-times[0])*width/(times.at(-1)-times[0]):i * width / Math.max(1, values.length - 1)},${height - 4 - (v - min) / range * (height - 8)}` : null);
  let d = ''; let gap = true; for (const p of points) { if (!p) { gap = true; continue; } d += `${gap ? 'M' : 'L'}${p} `; gap = false; }
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Recent synthetic trend"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
export function lineChart(history, metric, baseline) {
  if (!history?.length) return '<div class="empty-state">Awaiting reliable history.</div>';
  history = metricHistory(history, metric);
  if (!baseline || !Number.isFinite(baseline.center) || !Number.isFinite(baseline.scale) || baseline.scale <= 0) return '<div class="empty-state">Personal baseline unavailable.</div>';
  const values = history.map(p => p.value); const finite = values.filter(Number.isFinite);
  if (!finite.length) return '<div class="empty-state">No measurements in this interval.</div>';
  const lo = Math.min(...finite, baseline.center - baseline.scale * 2) - baseline.scale;
  const hi = Math.max(...finite, baseline.center + baseline.scale * 2) + baseline.scale;
  const width = 680; const height = 155; const py = v => height - 16 - (v - lo) / (hi - lo) * (height - 32);
  let path = ''; let gap = true; const markers = [];
  const first = Date.parse(history[0].ts), span = Math.max(1, Date.parse(history.at(-1).ts) - first);
  const discrete=metric==='sleep_duration'&&history.some(p=>p.session_id);
  history.forEach(p => { const v = p.value; if (!Number.isFinite(v) || !Number.isFinite(Date.parse(p.ts))) { gap = true; return; } const x=Math.max(0,(Date.parse(p.ts)-first)/span)*width;path+=gap?`M${x},${py(v)} `:discrete?`H${x}V${py(v)} `:`L${x},${py(v)} `; if(discrete)markers.push(`<circle cx="${x}" cy="${py(v)}" r="3" fill="#54c9b7"/>`); gap = false; });
  const y1 = py(baseline.center + baseline.scale * 2); const y2 = py(baseline.center - baseline.scale * 2);
  return `<div class="chart-key"><span><i class="key-line"></i>Observed · synthetic${discrete?' · completed sessions':''}</span><span><i class="key-band"></i>Personal baseline ±2 SD</span></div><svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(metric)} history from ${escape(time(history[0].ts))} to ${escape(time(history.at(-1).ts))}"><rect x="0" y="${y1}" width="${width}" height="${y2 - y1}" fill="#9875e8" opacity=".08"/>${[0.25, 0.5, 0.75].map(y => `<path d="M0 ${y * height}H${width}" stroke="#45414b" stroke-dasharray="3 6"/>`).join('')}<path d="M0 ${py(baseline.center)}H${width}" stroke="#aaa1b8" stroke-dasharray="5 6"/><path d="${path}" fill="none" stroke="#54c9b7" stroke-width="2" vector-effect="non-scaling-stroke"/>${markers.join('')}</svg><div class="chart-axis"><span>${time(history[0].ts)} UTC</span><span>${time(history[Math.floor(history.length / 2)].ts)}</span><span>${time(history.at(-1).ts)}</span></div>`;
}

export function metricHistory(history, metric) {
  const output = []; let lastKey = null;
  for (const row of history ?? []) {
    const event = row.metric_observations?.[metric]; const q = row.metric_quality?.[metric] ?? event?.quality;
    const ts = event?.ts ?? row.ts; const key = event?.event_id ?? ts;
    const good = q ? q.status === 'good' && q.confidence >= 0.7 && !q.stale && !q.artifact && (!event || event.integrity === 'verified')
      : row.quality === 'good' && !row.artifact;
    if (!good || !Number.isFinite(row.values?.[metric])) { output.push({ ts: row.ts, value: null }); continue; }
    if (key === lastKey) continue;
    lastKey = key; output.push({ ts, value: row.values[metric],...(metric==='sleep_duration'&&(event?.sleep_session??row.sleep_session)?{session_id:(event?.sleep_session??row.sleep_session).session_id}:{}) });
  }
  return output;
}
