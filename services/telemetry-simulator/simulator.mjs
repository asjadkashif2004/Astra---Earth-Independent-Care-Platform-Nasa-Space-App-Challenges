import { CREW, METRICS, GENERATOR_VERSION, MISSION_ID, DEMO_HR } from '../../packages/contracts.mjs';
import { hrProfile } from './demo-profile.mjs';
import { completedSleeps, sleepObservation } from './sleep.mjs';
import { refreshReading } from '../api/telemetry.mjs';

export function random(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function gaussian(rng) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng()); }
export function median(values) { const a = [...values].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
export function baselineFrom(values, minScale = 0.001) {
  const center = median(values);
  return { center, scale: Math.max(minScale, median(values.map(v => Math.abs(v - center))) * 1.4826), method: 'median/MAD', count: values.length, window_days: 30, version: 'baseline-v1', synthetic: true };
}
export function createBaselines(seed = 42017) {
  return Object.fromEntries(CREW.map((crew, i) => {
    const rng = random(seed + i * 1009);
    return [crew.id, Object.fromEntries(Object.entries(METRICS).map(([key, m]) => {
      const personal = m.center + (i - 2.5) * m.scale * 0.15;
      const values = Array.from({ length: 720 }, () => personal + gaussian(rng) * m.scale);
      return [key, { ...baselineFrom(values, m.scale * 0.5), unit: m.unit }];
    }))];
  }));
}
export function simulate({ seed, tick, elapsed, now, scenario, runId, baselines, cadenceSeconds = 1, sleepSessions = {}, demo = null }) {
  const environment = {
    co2_ppm: Math.round(720 + Math.sin(tick * 0.05) * 45), temperature_c: 22.1, humidity_percent: 44,
    oxygen_percent: 20.9, dose_rate_msv_h: 0.016, cumulative_msv: 36.1 + tick * 0.000004,
    synthetic: true, warning: false,
  };
  if (scenario === 'radiation-spike' && elapsed >= 30) {
    environment.co2_ppm = 2800; environment.dose_rate_msv_h = 0.084; environment.warning = true;
  }
  const crew = CREW.map((profile, i) => {
    const rng = random(seed + tick * 7919 + i * 1009);
    const baseline = baselines[profile.id];
    const values = Object.fromEntries(Object.keys(METRICS).map(key => [key, baseline[key].center + baseline[key].scale * (gaussian(rng) * 0.16 + Math.sin(tick * 0.035 + i) * 0.25)]));
    let quality = 'good'; let confidence = 0.98; let activity = 'rest'; let artifact = false;
    if (scenario === DEMO_HR.id && demo?.status === 'active' && demo.target_crew_id === profile.id)
      values.heart_rate += baseline.heart_rate.scale * DEMO_HR.baseline_scale_units * hrProfile(elapsed).fraction;
    if (i === 2) {
      const ramp = Math.max(0, Math.min(1, (elapsed - 30) / 150));
      if (scenario === 'sleep-debt-cardio-drift') {
        values.heart_rate += baseline.heart_rate.scale * 3.2 * ramp;
        values.hrv -= baseline.hrv.scale * 2.8 * ramp;
        values.fatigue += baseline.fatigue.scale * 2.9 * ramp;
      }
      if (scenario === 'sleep-fatigue') {
        values.fatigue += baseline.fatigue.scale * 3.0 * ramp;
        values.reaction_time += baseline.reaction_time.scale * 2.2 * ramp;
      }
      if (scenario === 'cardiorespiratory-drift') {
        values.heart_rate += baseline.heart_rate.scale * 5.3 * ramp;
        values.respiratory_rate += baseline.respiratory_rate.scale * 5.1 * ramp;
        values.spo2 -= baseline.spo2.scale * 4.8 * ramp;
      }
      if (scenario === 'post-exercise') {
        activity = elapsed < 900 ? 'exercise_recovery' : 'rest';
        values.heart_rate += 54 * Math.exp(-elapsed / 180);
        values.respiratory_rate += 11 * Math.exp(-elapsed / 180);
        values.hrv -= 20 * Math.exp(-elapsed / 180);
      }
      if (scenario === 'sensor-dropout' && elapsed >= 30) {
        quality = 'missing'; confidence = 0; for (const key of Object.keys(values)) values[key] = null;
      }
      if (scenario === 'contradictory-sensors' && elapsed >= 30) {
        values.heart_rate = 151; quality = 'suspect'; confidence = 0.4; artifact = true;
      }
    }
    if (quality !== 'missing') {
      values.radiation = environment.dose_rate_msv_h;
      for (const [key, value] of Object.entries(values)) {
        const [lo, hi] = METRICS[key].range;
        values[key] = Number(Math.max(lo, Math.min(hi, value)).toFixed(key === 'radiation' ? 4 : 2));
      }
    }
    const sleep=completedSleeps({previous:sleepSessions[profile.id],now,seed,crewId:profile.id,baseline:baseline.sleep_duration,scenario:scenario===DEMO_HR.id?'nominal':scenario,quality,confidence,artifact});
    values.sleep_duration=sleep.current.duration_hours;
    return { ...profile, values, quality, confidence, activity, artifact, observed_at: new Date(now).toISOString(), synthetic: true,
      sleep_session:sleep.current, completed_sleep_records:sleep.records };
  });
  const events = crew.flatMap(c => Object.entries(c.values).map(([name, value]) => name==='sleep_duration'?sleepObservation(c.sleep_session):({
    schema_version: 'astra.telemetry.v1', event_id: `${runId}:${tick}:${c.id}:${name}`, mission_id: MISSION_ID, crew_id: c.id,
    ts: new Date(now).toISOString(), received_ts: new Date(now).toISOString(),
    metric: { system: METRICS[name].system ?? 'urn:astra:metric', code: METRICS[name].code, name, value, unit: METRICS[name].unit },
    quality: { status: c.quality, confidence: c.confidence, artifact: c.artifact },
    source: { kind: 'simulator', device_id: `SIM-${c.id}`, sampling_hz: 1 / cadenceSeconds, runtime_hz: 1, clock: 'mission_simulation' },
    provenance: { synthetic: true, scenario_id: scenario, seed, generator_version: GENERATOR_VERSION },
  })));
  for(const c of crew){
    c.metric_observations=Object.fromEntries(events.filter(e=>e.crew_id===c.id).map(e=>[e.metric.name,{...structuredClone(e),integrity:'verified'}]));
    refreshReading(c,now);
  }
  return { crew, environment, events };
}
