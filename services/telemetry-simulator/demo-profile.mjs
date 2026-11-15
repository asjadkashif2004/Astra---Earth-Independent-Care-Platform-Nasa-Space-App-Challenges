import { DEMO_HR } from '../../packages/contracts.mjs';

/** Mission-time envelope only; this has no alert or severity authority. */
export function hrProfile(seconds) {
  if (seconds < DEMO_HR.onset_seconds) return { phase: 'waiting', fraction: 0 };
  const rampEnd = DEMO_HR.onset_seconds + DEMO_HR.ramp_seconds;
  const plateauEnd = rampEnd + DEMO_HR.plateau_seconds;
  if (seconds < rampEnd) return { phase: 'ramp', fraction: (seconds - DEMO_HR.onset_seconds) / DEMO_HR.ramp_seconds };
  if (seconds < plateauEnd) return { phase: 'plateau', fraction: 1 };
  if (seconds < DEMO_HR.total_seconds) return { phase: 'return', fraction: (DEMO_HR.total_seconds - seconds) / DEMO_HR.return_seconds };
  return { phase: 'completed', fraction: 0 };
}

export function hrTargetProblem(crew, baseline, reliable = false) {
  const event = crew?.metric_observations?.heart_rate;
  if (!event || event.integrity !== 'verified' || event.source?.kind !== 'simulator' || event.source.device_id !== `SIM-${crew.id}`)
    return 'Target HR must belong to the verified simulator; imported or unknown ownership is protected.';
  if (!Number.isFinite(baseline?.heart_rate?.center) || !(baseline?.heart_rate?.scale > 0) || !Number.isFinite(baseline.heart_rate.scale))
    return 'Target personal HR baseline is unavailable.';
  if (reliable && (crew.activity !== 'rest' || crew.metric_quality?.heart_rate?.status !== 'good' || crew.metric_quality.heart_rate.stale
    || !(crew.metric_quality.heart_rate.confidence >= 0.7) || crew.metric_quality.heart_rate.artifact))
    return 'Reliable resting HR is required before starting; current context or quality is unavailable.';
  return null;
}
