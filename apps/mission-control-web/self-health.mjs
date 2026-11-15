import { escape as esc, icon, fmt, time, statusBadge } from './ui.mjs';

/**
 * Astronaut self-view ("My health") and the NASA five-hazard map.
 * Both are pure projections of the existing scoped snapshot. They own no alert authority:
 * the N02 detector and its recorded review events remain the only source of alerts.
 * Missing or unreliable data stays Unknown, and "not tracked" never means safe.
 * Steps are general, procedural self-checks — never a diagnosis or treatment.
 */

export const HAZARD_SOURCE = Object.freeze({ title: 'NASA Human Research Program · Hazards of human spaceflight', url: 'https://www.nasa.gov/hrp/hazards/' });
export const SELF_METRICS = Object.freeze(['heart_rate', 'hrv', 'spo2', 'respiratory_rate', 'temperature', 'sleep_duration', 'fatigue', 'reaction_time', 'exercise']);
export const REVIEW_Z = 2;
const DIGITS = { spo2: 1, sleep_duration: 1, temperature: 1 };

/** Standardized distance from this crew member's own synthetic baseline, or null when unknown. */
export function deviation(crew, metric) {
  const value = crew?.values?.[metric], b = crew?.baseline?.[metric];
  if (!Number.isFinite(value) || !b || !Number.isFinite(b.center) || !Number.isFinite(b.scale) || b.scale <= 0) return null;
  return (value - b.center) / b.scale;
}

/** Plain-language wording. Direction only — no value judgement about good or bad. */
export function describeDeviation(z) {
  if (z === null || !Number.isFinite(z)) return 'Unknown · reading missing, stale or unreliable';
  const size = Math.abs(z), direction = z >= 0 ? 'higher' : 'lower';
  if (size < 1) return 'About your usual';
  if (size < 2) return `A little ${direction} than your usual`;
  if (size < 3) return `${direction[0].toUpperCase()}${direction.slice(1)} than your usual`;
  return `Much ${direction} than your usual`;
}

const rank = change => change.z === null ? 50 : Math.abs(change.z) >= REVIEW_Z ? 100 + Math.abs(change.z) : Math.abs(change.z);

/** Every personal metric compared with the personal baseline; largest and unknown changes first. */
export function selfChanges(crew, metrics) {
  return SELF_METRICS.filter(key => metrics?.[key]).map(key => {
    const z = deviation(crew, key), value = crew?.values?.[key];
    return { metric: key, label: metrics[key].label, unit: metrics[key].display, value: Number.isFinite(value) ? value : null, digits: DIGITS[key] ?? 0, z,
      text: describeDeviation(z), tone: z === null ? 'gray' : Math.abs(z) >= REVIEW_Z ? 'amber' : 'green',
      observed_at: crew?.metric_observations?.[key]?.ts ?? null };
  }).sort((a, b) => rank(b) - rank(a));
}

export const REPORT_WINDOW_HOURS = 24;
const SEVERITY = { 1: 'mild', 2: 'moderate', 3: 'severe' };

/** Latest self-report made within the window before mission time `now`; older reports stay in history only. */
export function recentReport(reports, now, hours = REPORT_WINDOW_HOURS) {
  const at = Date.parse(now); if (!Number.isFinite(at) || !Array.isArray(reports)) return null;
  return reports.filter(r => { const t = Date.parse(r?.reported_at); return Number.isFinite(t) && t <= at && at - t <= hours * 3_600_000; })
    .sort((a, b) => Date.parse(b.reported_at) - Date.parse(a.reported_at))[0] ?? null;
}

export function reportSummary(report) {
  const symptoms = report?.symptoms ?? [];
  if (!symptoms.length) return 'no symptoms (feeling fine)';
  return [...symptoms].sort((a, b) => b.severity - a.severity).map(s => `${s.label.toLowerCase()} (${SEVERITY[s.severity] ?? 'unknown'})`).join(', ');
}

/** "Am I OK?" — tone comes only from reliability, the detector's crew status and recorded review events. A self-report adds context, never an alert. */
export function selfAssessment({ crew, alerts = [], ready = false, changes = [], report = null }) {
  const mine = alerts.filter(a => a?.crew_id === crew?.id);
  const open = mine.filter(a => a.status === 'open');
  const alert = open[0] ?? mine.find(a => a.id === crew?.risk_id) ?? null;
  const watch = changes.filter(c => c.tone === 'amber').length;
  const symptomatic = Boolean(report?.symptoms?.length);
  const result = base => ({ ...base, report, symptomatic });
  if (!crew || !ready || crew.status === 'gray' || crew.quality !== 'good') {
    return result({ tone: 'gray', title: 'Can’t tell right now', alert, open: open.length, watch: 0,
      detail: `Some readings are missing, stale or unreliable, so ASTRA cannot judge how you are doing right now. Missing data is never treated as healthy.${open.length ? ' An earlier review event is still open.' : ''}` });
  }
  if (open.length || crew.status === 'amber' || crew.status === 'red') {
    return result({ tone: crew.status === 'red' ? 'red' : 'amber', title: 'Needs a check', alert, open: open.length, watch,
      detail: open.length
        ? `The onboard detector recorded a change from your personal baseline that lasted long enough to need a human review${alert?.created_at ? ` (recorded ${time(alert.created_at)} UTC)` : ''}. This is a review event, not a diagnosis.`
        : 'Current readings are outside your personal baseline. The earlier review event was already acknowledged — keep your crew medical officer informed.' });
  }
  const unflagged = watch ? ` ${watch} reading${watch === 1 ? ' is' : 's are'} outside your usual range but ${watch === 1 ? 'has' : 'have'} not lasted long enough to be flagged.` : '';
  if (symptomatic) {
    return result({ tone: 'green', title: 'Readings look usual — but you reported symptoms', alert: null, open: 0, watch,
      detail: `Your sensor readings are reliable and close to your personal baseline, but sensors cannot feel what you feel.${unflagged} Your own report matters — tell your crew medical officer.` });
  }
  return result({ tone: 'green', title: 'Within your usual range', alert: null, open: 0, watch,
    detail: `All monitored readings are reliable and the detector has no open review event.${unflagged} This is not a medical clearance.` });
}

/** Procedural follow-ups for self-reported symptoms, keyed to the related NASA HRP risk. Never treatment. */
const SYMPTOM_STEPS = [
  [['vision'], 'vision', 'Note your vision change', 'Eye and vision changes (SANS) are a known spaceflight risk. Your crew medical officer can arrange an onboard eye check.'],
  [['headache'], 'headache', 'Check cabin CO₂ and your sleep', 'Higher cabin CO₂ and short sleep can both contribute to headaches. The hazards panel on Mission overview shows current cabin readings.', { kind: 'page', value: 'overview', label: 'Mission overview' }],
  [['nausea', 'dizziness'], 'balance', 'Move carefully and tell the crew', 'Balance and stomach changes are common when the body adapts to changing gravity.'],
  [['back_pain', 'muscle_joint'], 'muscle', 'Mention it before your next exercise session', 'Your crew medical officer can decide whether your exercise plan should change.'],
  [['skin', 'cold_flu'], 'immune', 'Tell the crew medical officer early', 'Immune changes are a known spaceflight risk, and illness can spread in a closed cabin.'],
  [['sleep'], 'sleep', 'Look at your sleep record', 'Inadequate sleep and irregular schedules are a known risk on long missions.', { kind: 'page', value: 'n10', label: 'Sleep & resilience' }],
  [['mood', 'team', 'focus'], 'talk', 'Talk to someone', 'Isolation and confinement affect everyone. Talk to your crew medical officer or the mission’s behavioural support — you do not have to wait for a sensor to notice.'],
  [['focus'], 'checkin', 'Do a quick check-in', 'A reaction-time and fatigue check, saved separately from sensor data.', { kind: 'page', value: 'cognitive', label: 'Start check-in' }],
];

/** General self-check steps. Procedural only: review, inform a person, check in, report, read. */
export function selfSteps({ assessment, crew, changes = [], environment = null, comms = null }) {
  const steps = [], z = Object.fromEntries(changes.map(c => [c.metric, c.z]));
  const add = (id, title, detail, action = null) => { if (!steps.some(s => s.id === id)) steps.push({ id, title, detail, action }); };
  const checkin = { kind: 'page', value: 'cognitive', label: 'Start check-in' }, sleep = { kind: 'page', value: 'n10', label: 'Sleep & resilience' };
  const report = assessment.report, reported = new Set((report?.symptoms ?? []).map(s => s.id));
  if (report?.max_severity === 3 || report?.symptoms?.some(s => s.severity === 3)) add('tell', 'Tell your crew medical officer now', 'You reported a severe symptom. Do not wait for a sensor reading or for Earth.');
  if (assessment.tone === 'gray') {
    add('sensor', 'Check your sensors', 'Make sure your wearable sensors are on correctly and have good contact.');
    add('wait', 'Wait for a fresh reading', 'This screen updates by itself when reliable data returns. Nothing is filled in for you.');
    add('tell', 'Tell your crew medical officer if it stays unknown', 'A person can check on you directly when the monitor cannot.');
  }
  if (assessment.tone === 'amber' || assessment.tone === 'red') {
    add('evidence', 'Look at what changed', 'See the measured evidence, signal quality and timing behind this review.', crew ? { kind: 'crew', value: crew.id, label: 'Open evidence' } : null);
    add('tell', 'Tell your crew medical officer', 'A review event needs a person to look at it with you.');
    if (assessment.alert?.status === 'open') {
      const delay = Number.isFinite(comms?.one_way_latency_ms) ? `${fmt(comms.one_way_latency_ms / 60_000, 1)}-minute` : 'configured';
      add('ack', 'Acknowledge and send a report to Earth', comms?.blackout ? 'The Earth link is in blackout, so the report waits onboard until the link returns.' : `Earth receives it after the ${delay} one-way delay — never instantly.`, { kind: 'ack', value: assessment.alert.id, label: 'Acknowledge & queue report' });
    }
    add('checkin', 'Do a quick check-in', 'A reaction-time and fatigue check, saved separately from sensor data.', checkin);
  }
  if (Number.isFinite(z.sleep_duration) && z.sleep_duration <= -REVIEW_Z) add('sleep', 'Your last sleep was shorter than usual', 'Review your sleep record and schedule.', sleep);
  if ((z.fatigue ?? 0) >= REVIEW_Z || (z.reaction_time ?? 0) >= REVIEW_Z) add('checkin', 'Fatigue or reaction time is above your usual', 'A quick check-in records how you feel and how fast you respond.', checkin);
  if (Number.isFinite(z.exercise) && z.exercise <= -REVIEW_Z) add('exercise', 'Exercise was lower than usual', 'Exercise is used in spaceflight to help protect bone and muscle. Check your planned exercise schedule.');
  for (const e of environment?.evidence ?? []) {
    if (e.metric === 'dose_rate_msv_h') add('radiation', 'Radiation reading is above the review level', 'Tell the crew and follow your approved onboard radiation procedure. The review level is illustrative, not a NASA limit.');
    if (e.metric === 'co2_ppm') add('co2', 'Cabin CO₂ is above the review level', 'Tell the crew and follow approved onboard procedures. The review level is illustrative.');
  }
  if (reported.size) {
    add('tell', 'Tell your crew medical officer about your symptoms', 'Your own report matters as much as sensor data. A person can check on you directly.');
    for (const [ids, id, title, detail, action] of SYMPTOM_STEPS) if (ids.some(s => reported.has(s))) add(id, title, detail, action ?? null);
  } else if (!report) {
    add('report', 'Report how you feel', 'Sensors cannot feel a headache, vision change or low mood. A quick private report helps you notice changes early.', { kind: 'scroll', value: 'self-report', label: 'Report symptoms' });
  }
  if (assessment.tone === 'green') {
    add('checkin', 'Keep doing regular check-ins', 'Regular check-ins help you notice changes in yourself early.', checkin);
    add('sleep', 'Look after sleep and recovery', 'NASA lists inadequate sleep and irregular schedules as a risk on long missions.', sleep);
  }
  add('research', 'Read about it in the onboard library', 'Cited NASA research summaries, available without contact with Earth.', { kind: 'page', value: 'knowledge', label: 'Research library' });
  return steps;
}

const HAZARDS = [
  { id: 'radiation', title: 'Space radiation', glyph: 'sun', indicators: 4, about: 'Invisible radiation beyond Earth’s protection — one of the most hazardous parts of spaceflight.', notTracked: ['Total mission dose', 'Neutron dose', 'Personal dosimeter'] },
  { id: 'isolation', title: 'Isolation & confinement', glyph: 'crew', indicators: 5, about: 'Small crews confined together for months can see changes in behaviour, sleep and teamwork.', notTracked: ['Mood & stress', 'Teamwork'] },
  { id: 'distance', title: 'Distance from Earth', glyph: 'comms', indicators: 4, about: 'Far from Earth, help, supplies and medical advice arrive slowly — or not at all.', notTracked: ['Real spacecraft distance (schematic only)', 'Onboard medical supplies'] },
  { id: 'gravity', title: 'Gravity fields', glyph: 'orbit', indicators: 5, about: 'Weightlessness and gravity changes affect bones, muscles, balance and organs.', notTracked: ['Bone density', 'Muscle strength', 'Balance (inner ear)', 'Eye changes (SANS)'] },
  { id: 'environment', title: 'Hostile, closed environment', glyph: 'shield', indicators: 7, about: 'Air, temperature, noise, light and microbes inside the spacecraft all affect crew health.', notTracked: ['Noise', 'Lighting', 'Microbes', 'Immune markers'] },
];

/** NASA's five hazards with honest coverage. Status text never claims safety for untracked indicators. */
export function hazardMap({ crew = [], environment = null, comms = null, alerts = [], linkKnown = false }) {
  const group = (metrics, flagged) => {
    let unknown = 0, flags = 0;
    for (const c of crew) {
      const zs = metrics.map(m => deviation(c, m));
      if (zs.some(z => z === null)) unknown++;
      const recorded = alerts.some(a => a.crew_id === c.id && a.status === 'open' && a.evidence?.some(e => metrics.includes(e.metric)));
      if (recorded || zs.some(z => z !== null && flagged(z))) flags++;
    }
    return { unknown, flags, reliable: crew.length - unknown };
  };
  const crewStatus = (g, ok, flagged) => !crew.length || g.unknown === crew.length ? ['gray', 'Unknown'] : g.flags ? ['amber', `${g.flags} crew ${flagged}`]
    : g.unknown ? ['gray', `${g.unknown} of ${crew.length} crew unknown`] : ['green', ok];
  const recorded = metric => (environment?.evidence ?? []).some(e => e.metric === metric);
  const reading = (value, digits, unit) => Number.isFinite(value) ? `${fmt(value, digits)} ${unit}` : 'Unknown';
  const isolation = group(['sleep_duration', 'fatigue', 'reaction_time'], z => Math.abs(z) >= REVIEW_Z);
  const gravity = group(['exercise'], z => z <= -REVIEW_Z);
  const exercise = crew.map(c => c.values?.exercise).filter(Number.isFinite);
  const dose = environment?.dose_rate_msv_h, delay = comms?.one_way_latency_ms;
  const result = {
    radiation: { status: !Number.isFinite(dose) ? ['gray', 'Unknown'] : recorded('dose_rate_msv_h') ? ['amber', 'Above review level'] : ['green', 'Within illustrative level'],
      tracked: [['Cabin dose rate', reading(dose, 3, 'mSv/h')]] },
    isolation: { status: crewStatus(isolation, 'Within usual range', 'outside usual range'),
      tracked: [['Sleep, fatigue & reaction time', crew.length ? `${isolation.reliable} of ${crew.length} crew reliable` : 'Unknown']] },
    distance: { status: !linkKnown || !comms ? ['gray', 'Link state unknown'] : comms.blackout ? ['amber', 'Blackout · reports wait onboard'] : ['green', 'Link available'],
      tracked: [['One-way delay', reading(Number.isFinite(delay) ? delay / 60_000 : null, 1, 'min')], ['Queued for Earth', Number.isFinite(comms?.counts?.queued) ? String(comms.counts.queued) : comms?.counts ? '0' : 'Unknown']] },
    gravity: { status: crewStatus(gravity, 'Exercise near usual', 'below usual exercise'),
      tracked: [['Daily exercise', exercise.length ? `${fmt(exercise.reduce((a, b) => a + b, 0) / exercise.length)} min crew average` : 'Unknown']] },
    environment: { status: !environment ? ['gray', 'Unknown'] : recorded('co2_ppm') ? ['amber', 'CO₂ above review level'] : ['green', 'Within illustrative levels'],
      tracked: [['CO₂', reading(environment?.co2_ppm, 0, 'ppm')], ['Temperature', reading(environment?.temperature_c, 1, '°C')], ['Humidity', reading(environment?.humidity_percent, 0, '%')]] },
  };
  const trackedCount = { radiation: 1, isolation: 3, distance: 2, gravity: 1, environment: 3 };
  return HAZARDS.map(h => ({ ...h, status: result[h.id].status[0], status_text: result[h.id].status[1],
    tracked: result[h.id].tracked.map(([label, value]) => ({ label, value })), coverage: { tracked: trackedCount[h.id], total: h.indicators } }));
}

function actionButton(action, ackDisabled) {
  if (!action) return '';
  if (action.kind === 'ack') return `<button class="button primary small" data-ack="${esc(action.value)}" ${ackDisabled ? 'disabled' : ''}>${icon('check', 13)}${esc(action.label)}</button>`;
  if (action.kind === 'scroll') return `<button class="button ghost small" data-scroll-to="${esc(action.value)}">${esc(action.label)} ${icon('arrow', 11)}</button>`;
  const attr = action.kind === 'crew' ? 'data-crew' : 'data-page';
  return `<button class="button ghost small" ${attr}="${esc(action.value)}">${esc(action.label)} ${icon('arrow', 11)}</button>`;
}

const reportTime = iso => `${String(iso ?? '').slice(0, 10)} ${time(iso)} UTC`;

/** Static symptom form. Live updates never repaint it, so an unfinished report is never lost. */
export function symptomFormHTML(symptoms, severity) {
  const groups = [...new Set(symptoms.map(s => s.group))];
  const options = `<option value="0" selected>None</option>${Object.entries(severity).map(([value, label]) => `<option value="${value}">${esc(label)}</option>`).join('')}`;
  return `<section class="panel self-report" id="self-report" aria-labelledby="self-report-title" tabindex="-1"><div class="panel-heading"><div><div class="eyebrow">PRIVATE SELF-REPORT</div><h2 id="self-report-title">How do you feel?</h2></div><span class="tag">YOUR WORDS · NOT SENSOR DATA</span></div>
  <div class="self-report-body"><form id="symptom-form" class="symptom-form"><p class="self-report-intro">Choose anything you notice and how strong it is. Leave everything at “None” to record that you feel fine.</p>
  ${groups.map(g => `<fieldset class="symptom-group"><legend>${esc(g)}</legend>${symptoms.filter(s => s.group === g).map(s => `<label class="symptom-item" title="Related NASA risk: ${esc(s.risk)}"><span>${esc(s.label)}</span><select class="field" data-symptom="${esc(s.id)}" aria-label="${esc(s.label)}: how strong">${options}</select></label>`).join('')}</fieldset>`).join('')}
  <label class="symptom-note">Anything else? <small>(optional, up to 280 characters)</small><textarea class="field" id="symptom-note" name="note" maxlength="280" rows="2" aria-label="Anything else? Optional note, up to 280 characters" placeholder="For example: started after exercise"></textarea></label>
  <div class="symptom-actions"><button class="button primary" type="submit" id="save-symptoms" aria-labelledby="save-symptoms-label" disabled>${icon('check', 14)}<span id="save-symptoms-label">Save: I feel fine</span></button><small>Stays onboard and is never sent to Earth automatically. Only you and authorized crew reviewers can read it. It never changes alerts or sensor data.</small></div></form>
  <div class="symptom-history"><h3>Your recent reports</h3><div id="symptom-history" role="status" aria-live="polite"></div></div></div></section>`;
}

export function symptomHistoryHTML({ reports, status = 'ready', canRead = true, message = '' }) {
  if (!canRead) return '<p class="empty-state">Private self-reports can be read only by the crew member and authorized review roles.</p>';
  if (status === 'loading') return '<p class="empty-state">Loading your reports…</p>';
  if (status === 'error') return `<p class="empty-state">Reports unavailable: ${esc(message)}. Nothing is filled in.</p>`;
  if (!reports?.length) return '<p class="empty-state">No reports yet.</p>';
  return `<ul class="symptom-entries">${reports.map(r => `<li class="symptom-entry"><div class="symptom-entry-head"><strong>${r.symptoms?.length ? `${r.symptoms.length} symptom${r.symptoms.length === 1 ? '' : 's'}` : 'Feeling fine'}</strong><small>${esc(reportTime(r.reported_at))}</small></div>${r.symptoms?.length ? `<div class="symptom-chips">${[...r.symptoms].sort((a, b) => b.severity - a.severity).map(s => `<span class="symptom-chip sev-${Number(s.severity)}">${esc(s.label)} · ${esc(SEVERITY[s.severity] ?? 'unknown')}</span>`).join('')}</div>` : ''}${r.note ? `<p>${esc(r.note)}</p>` : ''}</li>`).join('')}</ul>`;
}

/**
 * Static My health layout. Its live regions (#self-verdict, #self-changes, #self-steps, #symptom-history) are painted
 * separately, so per-second reading updates never replace a control a person may be using.
 */
export function selfLayoutHTML(reportForm = '') {
  return `<div id="self-verdict"></div>
  <div class="self-safety notice info">${icon('heart', 15)}<span><strong>Feeling unwell?</strong> Tell your crew medical officer now — don’t wait for a reading. ASTRA offers general self-check steps, never a diagnosis or treatment.</span></div>
  <div class="self-grid"><section class="panel" aria-labelledby="self-changes-title"><div class="panel-heading"><h2 id="self-changes-title">What changed</h2><span class="tag">VS. YOUR PERSONAL BASELINE</span></div><ul class="self-change-list" id="self-changes"></ul><p class="evidence-foot">Compared with your own synthetic baseline, not a population norm. SD = standard deviations from your usual. Only the onboard detector can raise a review event.</p></section>
  <section class="panel" aria-labelledby="self-steps-title"><div class="panel-heading"><h2 id="self-steps-title">What you can do now</h2><span class="tag">GENERAL STEPS · NOT TREATMENT</span></div><ol class="self-step-list" id="self-steps"></ol><p class="evidence-foot">Follow your approved onboard procedures and crew medical officer. These steps never change telemetry or alerts.</p></section></div>${reportForm}`;
}

export function selfVerdictHTML({ crew, assessment }) {
  const glyph = assessment.tone === 'green' ? 'shield' : assessment.tone === 'gray' ? 'clock' : 'alert';
  const evidence = assessment.alert?.evidence?.length ? `<div class="self-flagged"><small>Detector evidence${assessment.alert.status === 'open' ? '' : ' · acknowledged'}</small>${assessment.alert.evidence.map(e => `<span>${esc(String(e.metric ?? 'signal').replaceAll('_', ' '))} ${e.standardized_deviation > 0 ? '+' : ''}${fmt(e.standardized_deviation, 1)} SD · ${fmt(e.persistence_seconds)}s</span>`).join('')}</div>` : '';
  const reported = assessment.report ? `<p class="self-reported">${icon('activity', 13)}<span>You reported ${esc(reportSummary(assessment.report))} · ${esc(reportTime(assessment.report.reported_at))}</span></p>` : '';
  return `<section class="panel self-verdict ${assessment.tone}" aria-labelledby="self-verdict-title"><div class="self-verdict-icon">${icon(glyph, 28)}</div><div><div class="eyebrow">AM I OK?</div><h2 id="self-verdict-title">${esc(assessment.title)}</h2><p>${esc(assessment.detail)}</p>${evidence}${reported}</div><div class="self-verdict-status">${statusBadge(assessment.tone)}<small>${esc(crew?.name ?? 'Crew member')} · ${esc(crew?.id ?? '')}</small></div></section>`;
}

export function selfChangesHTML(changes) {
  return changes.map(c => `<li class="self-change ${c.tone}"><div><strong>${esc(c.label)}</strong><small>${c.value === null ? 'No reliable current value' : `${fmt(c.value, c.digits)} ${esc(c.unit)}`}${c.observed_at ? ` · ${time(c.observed_at)} UTC` : ''}</small></div><span>${esc(c.text)}${c.z === null ? '' : `<small>${c.z >= 0 ? '+' : ''}${fmt(c.z, 1)} SD</small>`}</span></li>`).join('')
    || '<li class="empty-state">No personal readings are available.</li>';
}

export function selfStepsHTML(steps, { ackDisabled = true, ackNote = '' } = {}) {
  return steps.map(s => `<li class="self-step"><div><strong>${esc(s.title)}</strong><p>${esc(s.detail)}</p>${s.id === 'ack' && ackNote ? `<p class="self-note">${esc(ackNote)}</p>` : ''}</div>${actionButton(s.action, ackDisabled)}</li>`).join('');
}

/** Static five-hazard panel frame for Mission overview; only #hazard-grid is repainted with live values. */
export function hazardsLayoutHTML() {
  return `<div class="panel-heading"><div><div class="eyebrow">NASA HUMAN RESEARCH PROGRAM</div><h2 id="hazard-heading">The 5 hazards of human spaceflight</h2></div><a class="button ghost small" href="${esc(HAZARD_SOURCE.url)}" target="_blank" rel="noopener noreferrer">NASA source ${icon('arrow', 11)}</a></div>
  <div class="hazard-grid" id="hazard-grid"></div>
  <p class="evidence-foot">Synthetic readings and illustrative review levels — not NASA exposure limits. “Not tracked” means ASTRA has no data for it; it never means safe.</p>`;
}

export function hazardGridHTML(hazards) {
  return hazards.map(h => `<article class="hazard-card ${h.status}" aria-label="${esc(h.title)}: ${esc(h.status_text)}"><div class="hazard-head"><span class="hazard-glyph">${icon(h.glyph, 16)}</span><h3>${esc(h.title)}</h3></div>${statusBadge(h.status, h.status_text)}<p class="hazard-about">${esc(h.about)}</p><dl class="hazard-tracked">${h.tracked.map(t => `<div><dt>${esc(t.label)}</dt><dd>${esc(t.value)}</dd></div>`).join('')}</dl><p class="hazard-missing"><strong>Not tracked:</strong> ${h.notTracked.map(esc).join(' · ')}</p><div class="hazard-coverage" role="img" aria-label="Coverage ${h.coverage.tracked} of ${h.coverage.total} indicators"><span style="width:${Math.round(h.coverage.tracked / h.coverage.total * 100)}%"></span></div><small class="hazard-coverage-label">Coverage ${h.coverage.tracked} of ${h.coverage.total} indicators</small></article>`).join('');
}

