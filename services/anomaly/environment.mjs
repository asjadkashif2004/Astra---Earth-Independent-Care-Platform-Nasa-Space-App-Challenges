/** Illustrative simulator review thresholds; not NASA standards or exposure limits. */
export function evaluateEnvironment(environment) {
  const evidence = [];
  if (Number.isFinite(environment.co2_ppm) && environment.co2_ppm > 2000) evidence.push({ metric: 'co2_ppm', value: environment.co2_ppm, threshold: 2000, unit: 'ppm' });
  if (Number.isFinite(environment.dose_rate_msv_h) && environment.dose_rate_msv_h > 0.05) evidence.push({ metric: 'dose_rate_msv_h', value: environment.dose_rate_msv_h, threshold: 0.05, unit: 'mSv/h' });
  return { warning: evidence.length > 0, evidence, model_version: 'environment-illustrative-v1', interpretation: 'Synthetic environmental context. Review measurements and approved onboard procedures; these thresholds are not certified exposure limits.' };
}
