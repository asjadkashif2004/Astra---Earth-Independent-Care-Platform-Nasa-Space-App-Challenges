import { MODEL_VERSION, METRICS } from '../../packages/contracts.mjs';

// Software heuristics in personal robust-scale units, not clinical limits.
export const TIER_A = Object.freeze({ multi_z: 2, multi_seconds: 90, single_z: 4, single_seconds: 120,
  red_z: 4, red_seconds: 180, single_red_z: 6, rate_z_per_minute: 3, rate_window_seconds: 60,
  rate_persistence_seconds: 60, minimum_confidence: 0.7, fallback_gap_seconds: 90 });
const SIGNALS = ['heart_rate', 'hrv', 'spo2', 'respiratory_rate', 'temperature', 'sleep_duration', 'fatigue', 'reaction_time'];
const CARDIO = new Set(['heart_rate', 'hrv', 'respiratory_rate']);
const gray = () => ({ status: 'gray', evidence: [], pending: {}, review: false,
  reason: 'Verify measurement — stale, incomplete, unreliable signal or unavailable baseline' });

/** Pure, versioned Tier A rules. No scenario labels, diagnoses or retrieval inputs. */
export function evaluateCrew(reading, baseline, now, previous = {}) {
  if (!Number.isFinite(now) || reading.quality !== 'good' || !Number.isFinite(reading.confidence)
    || reading.confidence < TIER_A.minimum_confidence || reading.artifact
    || Object.keys(METRICS).some(key => !Number.isFinite(reading.values?.[key])
      || reading.values[key] < METRICS[key].range[0] || reading.values[key] > METRICS[key].range[1])) return gray();
  const pending = { version: MODEL_VERSION, channels: {} }; const evidence = []; let candidate = false;
  for (const key of SIGNALS) {
    const b = baseline?.[key]; const value = reading.values[key];
    if (!b || !Number.isFinite(b.center) || !Number.isFinite(b.scale) || b.scale <= 0) return gray();
    const observation = reading.metric_observations?.[key]; const quality = reading.metric_quality?.[key];
    if (reading.metric_observations && !observation) return gray();
    const at = Date.parse(observation?.ts ?? reading.observed_at);
    const maxGap = observation ? Math.max(5000, 3000 / observation.source?.sampling_hz) : TIER_A.fallback_gap_seconds * 1000;
    if (!Number.isFinite(at) || at > now || !Number.isFinite(maxGap) || now - at > maxGap
      || quality && (quality.status !== 'good' || quality.stale || quality.artifact || !(quality.confidence >= TIER_A.minimum_confidence))
      || observation && (observation.integrity !== 'verified' || observation.quality?.status !== 'good'
        || observation.quality?.artifact || !(observation.quality?.confidence >= TIER_A.minimum_confidence))) return gray();
    if (reading.activity !== 'rest' && CARDIO.has(key)) continue;
    const source = observation ? `${observation.source.kind}:${observation.source.device_id}:${b.version}` : `reading:${b.version}`;
    let prior = previous.version === MODEL_VERSION ? previous.channels?.[key] : null;
    if (!prior || prior.source !== source || at < prior.at || at - prior.at > maxGap) prior = null;
    // Re-evaluating a held observation never advances persistence or rate history.
    const fresh = !prior || at > prior.at;
    const rawZ = (value - b.center) / b.scale;
    if (!Number.isFinite(rawZ)) return gray();
    const z = Number(rawZ.toFixed(9)); const sign = Math.sign(z);
    const since = Math.abs(z) >= TIER_A.multi_z ? (prior?.sign === sign ? prior.since ?? at : at) : null;
    const singleSince = Math.abs(z) >= TIER_A.single_z ? (prior?.sign === sign ? prior.singleSince ?? at : at) : null;
    const redSince = Math.abs(z) >= TIER_A.red_z ? (prior?.sign === sign ? prior.redSince ?? at : at) : null;
    const singleRedSince = Math.abs(z) >= TIER_A.single_red_z ? (prior?.sign === sign ? prior.singleRedSince ?? at : at) : null;
    let samples = fresh ? [...(prior?.samples ?? []), { at, z, event_id: observation?.event_id ?? null }] : prior.samples;
    if (samples.length > 2 && Math.floor(samples.at(-1).at / 1000) === Math.floor(samples.at(-2).at / 1000)) samples.splice(-2, 1);
    samples = samples.filter(s => at - s.at <= 2 * TIER_A.rate_window_seconds * 1000).slice(-256);
    const start = samples.findLast(s => at - s.at >= TIER_A.rate_window_seconds * 1000);
    const rate = start && samples.length >= 3 ? (z - start.z) * 60_000 / (at - start.at) : null;
    const rateSign = Math.sign(rate); const rapid = rate !== null && Math.abs(rate) + 1e-9 >= TIER_A.rate_z_per_minute;
    candidate ||= Math.abs(z) >= TIER_A.multi_z || rapid;
    const rateSince = rapid ? (prior?.rateSign === rateSign ? prior.rateSince ?? at : at) : null;
    const persistence = since === null ? 0 : Math.max(0, (at - since) / 1000);
    const singlePersistence = singleSince === null ? 0 : Math.max(0, (at - singleSince) / 1000);
    const redPersistence = redSince === null ? 0 : Math.max(0, (at - redSince) / 1000);
    const singleRedPersistence = singleRedSince === null ? 0 : Math.max(0, (at - singleRedSince) / 1000);
    const ratePersistence = rateSince === null ? 0 : Math.max(0, (at - rateSince) / 1000);
    pending.channels[key] = { at, source, sign, since, singleSince, redSince, singleRedSince, samples, rateSign: rapid ? rateSign : 0, rateSince };
    const rules = [];
    if (since !== null && persistence >= TIER_A.multi_seconds) rules.push('persistent_deviation');
    if (singleSince !== null && singlePersistence >= TIER_A.single_seconds) rules.push('persistent_single_signal');
    if (rapid && ratePersistence >= TIER_A.rate_persistence_seconds) rules.push('persistent_rate_of_change');
    if (rules.length) evidence.push({ metric: key, value, unit: METRICS[key].unit, baseline_center: b.center, baseline_scale: b.scale,
      baseline_version: b.version, standardized_deviation: Number(z.toFixed(3)), persistence_seconds: persistence,
      direction: z >= 0 ? 'above_personal_baseline' : 'below_personal_baseline', rules,
      single_persistence_seconds: singlePersistence, severe_persistence_seconds: redPersistence, single_red_persistence_seconds: singleRedPersistence,
      rate_of_change_sd_per_minute: rate === null ? null : Number(rate.toFixed(3)), rate_persistence_seconds: ratePersistence,
      rate_window_seconds: start ? (at - start.at) / 1000 : null,
      rate_start: start ? { observed_at: new Date(start.at).toISOString(), event_id: start.event_id, standardized_deviation: start.z } : null });
  }
  const persistent = evidence.filter(e => e.rules.includes('persistent_deviation'));
  const single = evidence.some(e => e.rules.includes('persistent_single_signal'));
  const rapid = evidence.some(e => e.rules.includes('persistent_rate_of_change'));
  const review = persistent.length >= 2 || single || rapid;
  const severe = persistent.filter(e => e.severe_persistence_seconds >= TIER_A.red_seconds);
  const red = severe.length >= 2 || severe.some(e => e.single_red_persistence_seconds >= TIER_A.red_seconds);
  const status = red ? 'red' : review ? 'amber' : 'green';
  return { status, evidence, pending, review,
    reason: red ? 'High-priority deviation — human review required' : review
      ? rapid ? 'Persistent rapid change — human review required' : single ? 'Persistent single-signal deviation — human review required' : 'Persistent multi-signal deviation — human review required'
      : candidate ? 'Deviation observed — review persistence threshold not yet met' : 'Within expected personal pattern',
    detector: { name: 'personalized_robust_baseline', version: MODEL_VERSION, method: 'median/MAD + two-sided deviation + observation-time persistence + rate + context' },
    uncertainty: { score: review ? Math.min(0.92, 0.65 + evidence.length * 0.045) : null,
      interpretation: 'heuristic evidence strength, not a clinical probability', limitations: 'Synthetic baseline and heuristic thresholds; no clinical calibration.' } };
}
