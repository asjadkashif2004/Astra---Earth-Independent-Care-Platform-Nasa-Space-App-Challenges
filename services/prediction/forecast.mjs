import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const calibrationRaw = readFileSync(new URL('../../models/forecast-calibration.json', import.meta.url), 'utf8');
const calibration = JSON.parse(calibrationRaw);
const calibrationHash = createHash('sha256').update(calibrationRaw).digest('hex');

export function forecast(history, metric, horizonMinutes = 30) {
  if(metric==='sleep_duration')return {available:false,reason:'Completed sleep sessions are discrete records; the continuous-signal forecast/calibration does not support them.',model_version:'linear-trend-v2',unsupported_component:'sleep_duration'};
  const points = history.filter(p => p.quality === 'good' && Number.isFinite(p.values[metric])).slice(-60);
  if (points.length < 12 || history.at(-1)?.quality !== 'good') return { available: false, reason: 'At least 12 reliable observations and a current good signal are required.', model_version: 'linear-trend-v2' };
  const end = Date.parse(points.at(-1).ts);
  const xs = points.map(p => (Date.parse(p.ts) - end) / 60_000);
  if (end - Date.parse(points[0].ts) < 5 * 60_000) return { available: false, reason: 'At least five minutes of reliable history is required.', model_version: 'linear-trend-v2' };
  const ys = points.map(p => p.values[metric]); const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n; const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - meanX) ** 2, 0);
  const slope = xs.reduce((a, x, i) => a + (x - meanX) * (ys[i] - meanY), 0) / sxx;
  const intercept = meanY - slope * meanX;
  const residual = Math.sqrt(ys.reduce((a, y, i) => a + (y - intercept - slope * xs[i]) ** 2, 0) / (n - 2));
  const extrapolation = Math.sqrt(1 + 1 / n + (horizonMinutes - meanX) ** 2 / sxx);
  const estimate = intercept + slope * horizonMinutes;
  const cadenceMatches = n === 60 && points.slice(1).every((p, i) => Date.parse(p.ts) - Date.parse(points[i].ts) === 30_000);
  const calibrated = calibration.status === 'frozen' && cadenceMatches && horizonMinutes === calibration.horizon_minutes && Number.isFinite(calibration.quantiles[metric]);
  const half = calibrated ? calibration.quantiles[metric] : 1.96 * Math.max(0.1, residual) * extrapolation;
  return { available: true, target: metric, horizon_minutes: horizonMinutes, estimate, lower: estimate - half, upper: estimate + half,
    slope_per_minute: slope, history_count: n, model_version: 'linear-trend-v2', clinical_diagnosis: null, synthetic: true,
    confidence: 'synthetic research only', interval_label: calibrated ? '90% target band calibrated on nominal synthetic profiles only; no guarantee under drift or real physiology.' : 'Uncalibrated residual interval; assumes the current trend continues.',
    calibration: calibrated ? { version: calibration.version, sha256: calibrationHash, samples: calibration.samples_per_metric, scope: 'nominal synthetic generator only', target_coverage: calibration.target_coverage } : null,
    trained_through: new Date(end).toISOString() };
}
