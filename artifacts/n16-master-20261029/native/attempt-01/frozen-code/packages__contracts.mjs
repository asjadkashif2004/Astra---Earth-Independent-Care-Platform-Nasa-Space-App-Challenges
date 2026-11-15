export const MISSION_ID = 'MARS-DEMO-01';
export const GENERATOR_VERSION = '1.0.0';
export const MODEL_VERSION = 'robust-personal-v2';
export const DEMO_HR = Object.freeze({ id: 'controlled-hr-rise', version: 'demo-hr-v1', onset_seconds: 30, ramp_seconds: 60, plateau_seconds: 240, return_seconds: 60, total_seconds: 390, baseline_scale_units: 5 });
export const EPOCH = Date.parse('2026-11-14T11:00:00Z');
export const CREW = [
  { id: 'CREW-01', name: 'Elena Voss', call_sign: 'VEGA', role: 'Commander', initials: 'EV', color: '#9bb8eb' },
  { id: 'CREW-02', name: 'Marcus Chen', call_sign: 'ATLAS', role: 'Mission pilot', initials: 'MC', color: '#86cfce' },
  { id: 'CREW-03', name: 'Amara Okafor', call_sign: 'NOVA', role: 'Science officer', initials: 'AO', color: '#bfa4ee' },
  { id: 'CREW-04', name: 'Yuki Tanaka', call_sign: 'KITE', role: 'Systems engineer', initials: 'YT', color: '#87b5e0' },
  { id: 'CREW-05', name: 'Rafael Costa', call_sign: 'SOL', role: 'Medical officer', initials: 'RC', color: '#d8b394' },
  { id: 'CREW-06', name: 'Noor Hassan', call_sign: 'LYRA', role: 'Comms specialist', initials: 'NH', color: '#9bd5b5' },
];
export const METRICS = {
  heart_rate: { label: 'Heart rate', unit: '/min', display: 'bpm', code: '8867-4', system: 'http://loinc.org', range: [20, 250], center: 68, scale: 4.5 },
  hrv: { label: 'Heart rate variability', unit: 'ms', display: 'ms', code: 'hrv-rmssd', range: [1, 250], center: 55, scale: 6 },
  spo2: { label: 'Oxygen saturation', unit: '%', display: '%', code: '59408-5', system: 'http://loinc.org', range: [50, 100], center: 98.1, scale: 0.65 },
  respiratory_rate: { label: 'Respiratory rate', unit: '/min', display: '/min', code: '9279-1', system: 'http://loinc.org', range: [3, 65], center: 14, scale: 1.5 },
  temperature: { label: 'Body temperature', unit: 'Cel', display: '°C', code: '8310-5', system: 'http://loinc.org', range: [30, 43], center: 36.7, scale: 0.22 },
  sleep_duration: { label: 'Last sleep duration', unit: 'h', display: 'h', code: 'sleep-duration', range: [0, 24], center: 7.8, scale: 0.6 },
  fatigue: { label: 'Subjective fatigue', unit: '{score}', display: '/10', code: 'fatigue', range: [0, 10], center: 2.7, scale: 0.65 },
  reaction_time: { label: 'Reaction time', unit: 'ms', display: 'ms', code: 'reaction-time', range: [100, 3000], center: 262, scale: 22 },
  exercise: { label: 'Daily exercise', unit: 'min', display: 'min', code: 'exercise-duration', range: [0, 400], center: 110, scale: 12 },
  radiation: { label: 'Radiation dose rate', unit: 'mSv/h', display: 'mSv/h', code: 'dose-rate', range: [0, 100], center: 0.016, scale: 0.002 },
};
export const SCENARIOS = [
  { id: 'nominal', title: 'Nominal mission day', category: 'BASELINE', description: 'Personal variation, circadian rhythm and stable sensor quality.', expected: 'All six crew remain within their personal patterns.' },
  { id: 'sleep-debt-cardio-drift', title: 'Sleep debt + cardiac drift', category: 'PRIMARY DEMO', description: 'CREW-03 develops HR/HRV/fatigue deviations. Shorter sleep is recorded only at the next completed synthetic session; past nights are not rewritten.', expected: 'Amber within 300 simulation seconds from qualifying current signals; sleep changes at session completion.' },
  { id: 'post-exercise', title: 'Post-exercise recovery', category: 'CONTEXT', description: 'CREW-03 has an elevated pulse with explicit exercise context and gradual recovery.', expected: 'Context suppresses inappropriate resting cardiovascular escalation.' },
  { id: 'sleep-fatigue', title: 'Sleep & fatigue pattern', category: 'LONGITUDINAL', description: 'CREW-03 develops fatigue/reaction-time deviations; shorter sleep accumulates through future completed sessions, not an invented multi-day history.', expected: 'Review qualified deviations; inspect completed sleep records and optional personal cognitive check-in.' },
  { id: 'cardiorespiratory-drift', title: 'Multi-signal deviation', category: 'ESCALATION', description: 'Strong resting HR, respiration and oxygen deviations in CREW-03.', expected: 'High-priority review after sustained multi-signal evidence; no diagnosis.' },
  { id: 'radiation-spike', title: 'Environmental exposure', category: 'ENVIRONMENT', description: 'Synthetic dose-rate and cabin CO₂ rise; exposure context only.', expected: 'Mission environment warning, never an inferred radiation illness.' },
  { id: 'sensor-dropout', title: 'Sensor dropout', category: 'QUALITY', description: 'CREW-03 sensor readings become absent.', expected: 'Gray / unavailable; no false Red clinical event.' },
  { id: 'contradictory-sensors', title: 'Contradictory sensors', category: 'QUALITY', description: 'Inconsistent pulse measurements are flagged as suspect.', expected: 'Gray, reduced confidence and measurement verification.' },
  { id: 'communication-blackout', title: 'Earth link blackout', category: 'RESILIENCE', description: 'Stop Earth deliveries while local telemetry and knowledge continue.', expected: 'Durable queue, delayed reception after restoration.' },
  { id: DEMO_HR.id, title: 'Selected-crew HR demonstration', category: 'CONTROLLED SYNTHETIC DEMO', description: 'Choose one fictional astronaut. A finite HR rise passes through actual monitoring; imported channels are protected.', expected: '30s onset · 60s ramp · 240s plateau · 60s return. Alerts require actual qualified persistence; no diagnosis.' },
];
export const ROLES = ['viewer', 'astronaut', 'mission_control', 'flight_surgeon', 'researcher', 'demo_admin', 'system_admin'];
export const PERMISSIONS = {
  viewer: ['read'],
  astronaut: ['read', 'ack', 'rag', 'case', 'message', 'checkin', 'checkin_read', 'export', 'audit_self'],
  mission_control: ['read', 'ack', 'rag', 'case', 'message', 'checkin', 'checkin_read', 'export', 'audit_limited'],
  flight_surgeon: ['read', 'ack', 'rag', 'case', 'message', 'checkin', 'checkin_read', 'export', 'audit', 'models'],
  researcher: ['read', 'rag', 'models', 'research'],
  demo_admin: ['read', 'ack', 'rag', 'case', 'message', 'checkin', 'checkin_read_own', 'export', 'audit', 'models', 'scenario', 'comms'],
  system_admin: ['audit', 'system'],
};
export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function requirePermission(identity, permission, crewId) {
  if (!identity) throw new AppError(401, 'UNAUTHENTICATED', 'Enter a local demo session first.');
  if (!PERMISSIONS[identity.role]?.includes(permission)) throw new AppError(403, 'FORBIDDEN', 'This role cannot perform that action.');
  if (identity.role === 'astronaut' && crewId && crewId !== identity.crew_id) throw new AppError(403, 'SELF_ONLY', 'Astronaut access is limited to your own records.');
}
export function validateTelemetry(event, now) {
  const fail = (message) => { throw new AppError(422, 'INVALID_TELEMETRY', message); };
  const object = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('Unsupported telemetry object or field.');
  };
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
  const timestamp = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) fail('Use an ISO UTC telemetry timestamp.');
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== (value.includes('.') ? value : value.replace('Z', '.000Z'))) fail('Invalid telemetry calendar timestamp.');
    return parsed;
  };
  object(event, ['schema_version', 'event_id', 'mission_id', 'crew_id', 'ts', 'received_ts', 'metric', 'quality', 'source', 'provenance', 'sleep_session']);
  if (event.schema_version !== 'astra.telemetry.v1') fail('Unknown telemetry schema.');
  if (typeof event.event_id !== 'string' || !/^[\w:-]{1,128}$/.test(event.event_id)) fail('Invalid event identifier.');
  if (event.mission_id !== MISSION_ID || !CREW.some(c => c.id === event.crew_id)) fail('Unknown mission or crew.');
  object(event.metric, ['system', 'code', 'name', 'value', 'unit']);
  object(event.quality, ['status', 'confidence', 'artifact']);
  object(event.source, ['kind', 'device_id', 'sampling_hz', 'runtime_hz', 'clock']);
  object(event.provenance, ['synthetic', 'scenario_id', 'seed', 'generator_version']);
  const def = typeof event.metric.name === 'string' && Object.hasOwn(METRICS, event.metric.name) ? METRICS[event.metric.name] : null;
  if (!def || event.metric.unit !== def.unit || event.metric.code !== def.code || event.metric.system !== (def.system ?? 'urn:astra:metric')) fail('Unknown metric, code, system or unit.');
  if (!['good', 'suspect', 'missing'].includes(event.quality?.status) || !Number.isFinite(event.quality.confidence) || event.quality.confidence < 0 || event.quality.confidence > 1 || typeof event.quality.artifact !== 'boolean') fail('Invalid signal quality.');
  if (event.metric.value === null) {
    if (event.quality.status !== 'missing') fail('Null values require missing quality.');
  } else if (!Number.isFinite(event.metric.value) || event.metric.value < def.range[0] || event.metric.value > def.range[1]) fail('Metric outside simulator plausibility bounds.');
  if (event.quality.status === 'missing' && event.metric.value !== null) fail('Missing measurements must be null.');
  const ts = timestamp(event.ts); const received = timestamp(event.received_ts);
  if (!Number.isFinite(now) || ts > now || ts < now - 86_400_000 || received < ts || received > now) fail('Stale, future or inconsistent observation/received timestamp.');
  if (event.provenance.synthetic !== true || !Number.isInteger(event.provenance.seed) || event.provenance.seed < 0 || event.provenance.seed > 2 ** 31 - 1 || !identifier(event.provenance.scenario_id) || !identifier(event.provenance.generator_version)) fail('Supply bounded synthetic seed, scenario and generator provenance.');
  if (!['simulator', 'synthetic-import'].includes(event.source.kind) || !identifier(event.source.device_id)) fail('Unsupported source or device for the synthetic edition.');
  if (!Number.isFinite(event.source.sampling_hz) || event.source.sampling_hz < 1 / 86_400 || event.source.sampling_hz > 1000) fail('Sampling rate must be between one observation per mission day and 1000 Hz.');
  if ('runtime_hz' in event.source && (!Number.isFinite(event.source.runtime_hz) || event.source.runtime_hz <= 0 || event.source.runtime_hz > 1000)) fail('Invalid runtime sampling rate.');
  if ('clock' in event.source && event.source.clock !== 'mission_simulation') fail('The local edition uses mission-simulation timestamps.');
  if ('sleep_session' in event) {
    const s = event.sleep_session;
    object(s,['session_id','revision','start_at','end_at','scheduled_end_at','reason','historical_fixture']);
    if(event.metric.name!=='sleep_duration'||typeof s.session_id!=='string'||!/^SLEEP-[A-Za-z0-9_-]{1,80}$/.test(s.session_id)||!Number.isSafeInteger(s.revision)||s.revision<1||s.revision>100000)fail('Invalid completed sleep identity/revision.');
    const start=timestamp(s.start_at),end=timestamp(s.end_at);
    if(start>=end||end>ts||end-start>86_400_000||event.metric.value!==null&&Math.abs((end-start)/3_600_000-event.metric.value)>1e-8)fail('Sleep duration must match a completed session.');
    if('scheduled_end_at' in s&&timestamp(s.scheduled_end_at)>now)fail('Sleep schedule is not completed.');
    if('historical_fixture' in s&&typeof s.historical_fixture!=='boolean')fail('Invalid historical fixture flag.');
    if('reason' in s&&(typeof s.reason!=='string'||!s.reason.trim()||s.reason.length>256)||s.revision>1&&!s.reason)fail('Sleep revisions require a bounded correction reason.');
    if(event.source.sampling_hz!==1/86_400)fail('Completed sleep records declare daily observation cadence.');
  }
  return event;
}
export function finiteNumber(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new AppError(422, 'INVALID_INPUT', `${name} must be between ${min} and ${max}.`);
  return value;
}
