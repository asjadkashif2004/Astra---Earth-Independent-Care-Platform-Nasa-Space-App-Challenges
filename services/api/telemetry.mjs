import { METRICS, validateTelemetry } from '../../packages/contracts.mjs';

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value && Object.hasOwn(value, key)).map(key => [key, structuredClone(value[key])]));

/** Keep canonical observations separate from server-owned receipt/integrity annotations. */
export function retainObservation(event, ingestion = null) {
  const canonical = {
    ...pick(event, ['schema_version', 'event_id', 'mission_id', 'crew_id', 'ts', 'received_ts']),
    metric: pick(event.metric, ['system', 'code', 'name', 'value', 'unit']),
    quality: pick(event.quality, ['status', 'confidence', 'artifact']),
    source: pick(event.source, ['kind', 'device_id', 'sampling_hz', 'runtime_hz', 'clock']),
    provenance: pick(event.provenance, ['synthetic', 'scenario_id', 'seed', 'generator_version']),
    ...(event.sleep_session ? { sleep_session: structuredClone(event.sleep_session) } : {}),
  };
  let integrity = 'verified';
  // Legacy records remain retrievable but incomplete metadata never becomes a good signal.
  try { validateTelemetry(canonical, Date.parse(canonical.received_ts)); } catch { integrity = 'legacy-unverified'; }
  for (const key of ['ts', 'received_ts']) if (Number.isFinite(Date.parse(canonical[key]))) canonical[key] = new Date(canonical[key]).toISOString();
  for(const key of ['start_at','end_at','scheduled_end_at'])if(canonical.sleep_session?.[key]&&Number.isFinite(Date.parse(canonical.sleep_session[key])))canonical.sleep_session[key]=new Date(canonical.sleep_session[key]).toISOString();
  return { ...canonical, integrity, ingestion: structuredClone(ingestion ?? event.ingestion ?? null) };
}

/** A held value is never a new observation. Derive freshness without rewriting its source quality. */
export function refreshReading(reading, now) {
  reading.metric_quality = {};
  let latest = -Infinity;
  for (const name of Object.keys(METRICS)) {
    const event = reading.metric_observations[name];
    if (event) reading.values[name] = event.metric.value;
    const ts = event?.sleep_session ? Math.min(Date.parse(event.ts),Date.parse(event.sleep_session.end_at)) : Date.parse(event?.ts);
    const staleAfter = Math.max(5000, 3000 / (event?.source.sampling_hz ?? 0));
    const stale = !event || event.integrity !== 'verified' || !Number.isFinite(ts) || ts > now || now - ts > staleAfter;
    reading.metric_quality[name] = { ...(event?.quality ?? {}), status: stale ? 'missing' : event.quality.status,
      confidence: stale ? 0 : event.quality.confidence, artifact: event?.quality.artifact ?? false, stale };
    if (Number.isFinite(ts)) latest = Math.max(latest, ts);
  }
  if (Number.isFinite(latest)) reading.observed_at = new Date(latest).toISOString();
  const quality = Object.values(reading.metric_quality);
  reading.quality = quality.some(q => q.status === 'missing') ? 'missing' : quality.some(q => q.status === 'suspect') ? 'suspect' : 'good';
  reading.confidence = Math.min(...quality.map(q => q.confidence)); reading.artifact = quality.some(q => q.artifact);
  return reading;
}
