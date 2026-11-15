import { Worker } from 'node:worker_threads';
import { requirePermission, MISSION_ID, METRICS } from '../../packages/contracts.mjs';
import { contextSummary, observationState, readContext } from './read-context.mjs';
import { fail, LIMITS, plain, sha, stable, validateCall, VERSION } from './read-contract.mjs';

export function projectFixture(fixture, tool, args, fixtureHash) {
  const crew = fixture.crew.find(c => c.crew_id === args.crew_id); if (!crew) fail('CREW_UNAVAILABLE');
  const base = {schema_version:'astra.n16.read-result.v1', tool, crew_id:args.crew_id, mission_id:MISSION_ID,
    research_only:true, synthetic:true, clinical_support:false, inference_performed:false,
    provenance:{fixture_id:fixture.fixture_id, fixture_sha256:fixtureHash, scenario_run_id:fixture.scenario_run_id,
      scenario_id:fixture.scenario_id, view:'onboard', as_of:fixture.as_of, clock:'mission_simulation',
      adapter_version:VERSION, earth_received_at:null, earth_receipt_reason:'onboard_only'}};
  if (tool === 'get_open_risk_events') return {...base, data_status:'UNKNOWN', data:{records:structuredClone(fixture.risk_events.records),
    record_origin:fixture.risk_events.record_origin, coverage:fixture.risk_events.coverage,
    reason:fixture.risk_events.reason, inference_performed:false, requested_limit:args.limit}};
  const items = args.metrics.map(metric => {
    const e = crew.metric_observations[metric], q = observationState(e, fixture.as_of);
    const provenance = {record_sha256:e ? sha(stable(e)) : null, event_id:e?.event_id ?? null,
      observed_at:e?.ts ?? null, received_ts:e?.received_ts ?? null, source:e?.source ?? null,
      source_provenance:e?.provenance ?? null, quality:e?.quality ?? null, ...q};
    if (tool === 'get_personal_baseline') {
      const b = crew.baselines[metric];
      return {metric, data_status:b?'KNOWN':'UNKNOWN', value:b ?? null, unit:METRICS[metric].unit,
        provenance:{record_sha256:b?sha(stable(b)):null, basis:b?.basis ?? 'missing_baseline', synthetic:true}};
    }
    return {metric, data_status:q.status, value:tool === 'get_current_vitals' && q.status === 'KNOWN' ? e.metric.value : null,
      unit:METRICS[metric].unit, provenance, ...(tool === 'get_data_quality' ? {quality:e?.quality ?? null,
        integrity:q.integrity, freshness:q.freshness, reason:q.reason} : {reason:q.reason})};
  });
  const known = items.filter(i => i.data_status === 'KNOWN').length;
  return {...base, data_status:known === items.length?'KNOWN':known?'PARTIAL':'UNKNOWN', data:{items}};
}

async function executeWorker(data, {signal, timeoutMs = LIMITS.toolMs, workerFactory = d => new Worker(new URL('./read-tool-worker.mjs', import.meta.url), {workerData:d})} = {}) {
  if (signal?.aborted) fail('CANCELLED');
  return new Promise((resolve, reject) => {
    let worker, message, reason, settled = false, cleanupTimer;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(cleanupTimer);
      signal?.removeEventListener('abort', abort); error ? reject(Object.assign(Error(error), {code:error})) : resolve(value); };
    const stop = code => {
      if (reason || settled) return; reason = code;
      cleanupTimer = setTimeout(() => { worker.unref?.(); finish('WORKER_CLEANUP_FAILED'); }, 1000);
      try { Promise.resolve(worker.terminate()).then(() => finish(code), () => { worker.unref?.(); finish('WORKER_CLEANUP_FAILED'); }); }
      catch { worker.unref?.(); finish('WORKER_CLEANUP_FAILED'); }
    };
    const abort = () => stop('CANCELLED');
    const timer = setTimeout(() => stop('TIMEOUT'), timeoutMs);
    try {
      worker = workerFactory(data);
      worker.on('message', value => { if (message) { stop('INVALID_WORKER_RESULT'); return; } message = value; });
      worker.once('error', () => stop('WORKER_FAILED'));
      worker.once('exit', code => { if (reason) finish(reason); else if (code !== 0 || !message)
        finish(['FIXTURE_HASH_MISMATCH','FIXTURE_READ_FAILED'].includes(message?.error_code) ? message.error_code : 'WORKER_FAILED'); else finish(null, message); });
      signal?.addEventListener('abort', abort, {once:true}); if (signal?.aborted) abort();
    } catch { finish('WORKER_START_FAILED'); }
  });
}

export class ReadDispatcher {
  constructor(context, trace, options = {}) {
    this.context = context; this.trace = trace; this.options = options;
    this.calls = 0; this.active = false; this.stopped = false; this.started = performance.now();
  }
  async dispatch(input, {signal} = {}) {
    if (this.active || this.stopped || this.calls >= LIMITS.calls || performance.now() - this.started >= LIMITS.runMs) fail('WORKFLOW_CLOSED');
    const c = readContext(this.context); this.active = true;
    const callId = 'call-' + String(++this.calls).padStart(2, '0'); let started = false, call;
    try {
      // No raw unvalidated input/credentials are persisted.
      await this.trace.append('CALL_REQUESTED', {call_id:callId});
      try {
        call = validateCall(input); requirePermission(c.principal, 'read', call.args.crew_id);
      } catch {
        this.stopped = true; await this.trace.append('CALL_DENIED', {call_id:callId, code:'INVALID_OR_UNAUTHORIZED_REQUEST'});
        return {call_id:callId, execution_status:'DENIED', data_status:'UNKNOWN', reason:'INVALID_OR_UNAUTHORIZED_REQUEST'};
      }
      await this.trace.append('CALL_VALIDATED', {call_id:callId, tool:call.tool, args:call.args, trusted_scope:contextSummary(this.context)});
      if (signal?.aborted) {
        this.stopped = true; await this.trace.append('CALL_DENIED', {call_id:callId, code:'CANCELLED_BEFORE_READ'});
        return {call_id:callId, execution_status:'CANCELLED', data_status:'UNKNOWN', reason:'CANCELLED_BEFORE_READ'};
      }
      const begin = performance.now();
      await this.trace.append('CALL_STARTED', {call_id:callId, tool:call.tool, args:call.args}); started = true;
      const message = await executeWorker({dirFd:c.directory.fd, entry:c.entry, profile:c.profile, call},
        {...this.options, signal, timeoutMs:Math.min(this.options.timeoutMs ?? LIMITS.toolMs, LIMITS.toolMs, LIMITS.runMs - (performance.now() - this.started))});
      if (signal?.aborted) fail('CANCELLED');
      const expected = projectFixture(c.fixture, call.tool, call.args, c.fixture_hash);
      if (!plain(message) || Buffer.byteLength(stable(message.result)) > LIMITS.result
        || message.receipt?.fixture_sha256 !== c.fixture_hash || message.receipt?.bytes_read !== c.entry.bytes
        || message.receipt?.actual_file_reads !== 1 || !Number.isInteger(message.receipt?.thread_id) || message.receipt.thread_id < 1
        || sha(stable(message.result)) !== sha(stable(expected))) fail('INVALID_WORKER_RESULT');
      const result = {run_id:this.trace.id, call_id:callId, execution_status:'COMPLETED', ...message.result,
        read_receipt:message.receipt, duration_ms:performance.now() - begin};
      const reference = await this.trace.result(callId, result);
      await this.trace.append('CALL_COMPLETED', {call_id:callId, tool:call.tool, result:reference,
        execution_status:'COMPLETED', data_status:result.data_status, duration_ms:result.duration_ms,
        source:result.provenance, freshness_quality:result.data.items?.map(i => ({metric:i.metric,
          data_status:i.data_status, provenance:i.provenance})) ?? null});
      return result;
    } catch (error) {
      this.stopped = true;
      if (this.trace.failed) throw error;
      const code = ['TIMEOUT','CANCELLED','WORKER_CLEANUP_FAILED','WORKER_FAILED','WORKER_START_FAILED','INVALID_WORKER_RESULT','FIXTURE_HASH_MISMATCH','FIXTURE_READ_FAILED'].includes(error.code) ? error.code : 'TOOL_READ_FAILED';
      await this.trace.append(started ? code === 'TIMEOUT'?'CALL_TIMEOUT':code === 'CANCELLED'?'CALL_CANCELLED':'CALL_FAILED' : 'CALL_DENIED',
        {call_id:callId, tool:call?.tool ?? null, code});
      return {run_id:this.trace.id, call_id:callId, execution_status:code === 'TIMEOUT'?'TIMEOUT':code === 'CANCELLED'?'CANCELLED':'FAILED',
        data_status:'UNKNOWN', reason:code};
    } finally { this.active = false; }
  }
}
