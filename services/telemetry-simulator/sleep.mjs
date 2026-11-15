import { createHash } from 'node:crypto';
import { MISSION_ID, AppError } from '../../packages/contracts.mjs';

export const SLEEP_GENERATOR_VERSION = 'completed-sleep-v1';
export const SLEEP_PERIOD_MS = 86_400_000;
export const SLEEP_COMPLETION_UTC_HOUR = 7; // Explicit synthetic schedule, not a clinical recommendation.
const iso = n => new Date(n).toISOString();

export function lastSleepCompletion(now) {
  const today = Math.floor(now / SLEEP_PERIOD_MS) * SLEEP_PERIOD_MS + SLEEP_COMPLETION_UTC_HOUR * 3_600_000;
  return today > now ? today - SLEEP_PERIOD_MS : today;
}

export function sleepRecord(event) {
  const s = event.sleep_session;
  return { schema_version: 'astra.sleep-session.v1', record_id: `${s.session_id}:r${s.revision}`,
    session_id: s.session_id, crew_id: event.crew_id, revision: s.revision,
    supersedes_record_id: s.revision > 1 ? `${s.session_id}:r${s.revision-1}` : null,
    start_at: s.start_at, end_at: s.end_at, scheduled_end_at:s.scheduled_end_at??s.end_at, duration_hours: event.metric.value,
    observed_at: event.ts, received_ts: event.received_ts, known_at:event.ingestion?.mission_received_at??event.received_ts, historical_fixture: s.historical_fixture ?? false,
    correction_reason: s.reason ?? null, source: structuredClone(event.source), quality: structuredClone(event.quality),
    provenance: structuredClone(event.provenance), observation: structuredClone(event) };
}

export function sleepObservation(record) {
  const e = structuredClone(record.observation);
  delete e.integrity; delete e.ingestion;
  return e;
}

export function generateSleep({seed, crewId, baseline, endAt, knownAt, scenario, historical = false, quality = 'good', confidence = .98, artifact = false}) {
  const identity = `${SLEEP_GENERATOR_VERSION}:${seed}:${crewId}:${iso(endAt)}:${scenario}`;
  const hash = createHash('sha256').update(identity).digest('hex');
  const u = (parseInt(hash.slice(0,8),16)+1)/4294967297, v = parseInt(hash.slice(8,16),16)/4294967296;
  const noise = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*.16;
  const reduction = crewId === 'CREW-03' ? scenario === 'sleep-debt-cardio-drift' ? 2.6 : scenario === 'sleep-fatigue' ? 3.1 : 0 : 0;
  const duration = Number(Math.max(.01,Math.min(24,baseline.center+baseline.scale*(noise-reduction))).toFixed(2));
  const session = { session_id: `SLEEP-${hash.slice(0,32)}`, revision: 1,
    start_at: iso(endAt-duration*3_600_000), end_at: iso(endAt), scheduled_end_at:iso(endAt), historical_fixture: historical||knownAt-endAt>SLEEP_PERIOD_MS };
  return sleepRecord({ schema_version: 'astra.telemetry.v1', event_id: `${session.session_id}:r1`, mission_id: MISSION_ID, crew_id: crewId,
    ts: iso(knownAt-endAt>SLEEP_PERIOD_MS?knownAt:endAt), received_ts: iso(knownAt), metric: {system:'urn:astra:metric',code:'sleep-duration',name:'sleep_duration',unit:'h',value:quality==='missing'?null:duration},
    quality:{status:quality,confidence,artifact},source:{kind:'simulator',device_id:`SIM-SLEEP-${crewId}`,sampling_hz:1/86_400,clock:'mission_simulation'},
    provenance:{synthetic:true,seed,scenario_id:scenario,generator_version:SLEEP_GENERATOR_VERSION},sleep_session:session });
}

/** A held record is returned verbatim. Context/seed changes never rewrite it. */
export function completedSleeps({previous,now,seed,crewId,baseline,scenario,quality,confidence,artifact}) {
  const last = lastSleepCompletion(now); const records=[];
  const from = previous ? Date.parse(previous.scheduled_end_at??previous.end_at)+SLEEP_PERIOD_MS : last;
  // Catch up all completed days in an explicitly bounded local simulation step.
  if ((last-from)/SLEEP_PERIOD_MS >= 365) throw new AppError(422,'SLEEP_STEP_TOO_LARGE','Complete at most 365 synthetic sleep sessions per step.');
  for(let endAt=from;endAt<=last;endAt+=SLEEP_PERIOD_MS)records.push(generateSleep({seed,crewId,baseline,endAt,knownAt:now,scenario,
    historical:!previous,quality,confidence,artifact}));
  return { current: records.at(-1) ?? previous, records };
}

export function correctedSleep(previous,{start_at,end_at,reason,quality=previous.quality},now) {
  if(typeof reason!=='string'||!reason.trim()||reason.length>256)throw new AppError(422,'INVALID_SLEEP_CORRECTION','Supply a bounded correction reason.');
  if(now<=Date.parse(previous.observed_at))throw new AppError(409,'OUT_OF_ORDER','Correction observation time must advance.');
  const duration=(Date.parse(end_at)-Date.parse(start_at))/3_600_000;
  const e=sleepObservation(previous),revision=previous.revision+1;
  e.event_id=`${previous.session_id}:r${revision}`;e.ts=iso(now);e.received_ts=iso(now);
  e.metric.value=quality.status==='missing'?null:duration;e.quality=structuredClone(quality);
  e.sleep_session={session_id:previous.session_id,revision,start_at,end_at,scheduled_end_at:previous.scheduled_end_at,reason:reason.trim(),historical_fixture:previous.historical_fixture};
  return sleepRecord(e);
}
