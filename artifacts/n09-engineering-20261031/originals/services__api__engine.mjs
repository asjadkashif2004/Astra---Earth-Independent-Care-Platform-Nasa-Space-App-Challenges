import { randomUUID } from 'node:crypto';
import { CREW, METRICS, SCENARIOS, MISSION_ID, EPOCH, AppError, validateTelemetry, DEMO_HR } from '../../packages/contracts.mjs';
import { hrProfile, hrTargetProblem } from '../telemetry-simulator/demo-profile.mjs';
import { createBaselines, simulate } from '../telemetry-simulator/simulator.mjs';
import { evaluateCrew } from '../anomaly/detector.mjs';
import { evaluateEnvironment } from '../anomaly/environment.mjs';
import { EnrichmentRunner } from './enrichment.mjs';
import { MonitoringHealth } from './monitoring.mjs';
import { Comms } from '../comms/scheduler.mjs';
import { forecast } from '../prediction/forecast.mjs';
import { retainObservation, refreshReading } from './telemetry.mjs';
import { sleepRecord, sleepObservation, correctedSleep } from '../telemetry-simulator/sleep.mjs';

export class Engine {
  constructor(store, { speed = 30, clock = Date.now, caseBuilder = null, enrichmentRunner = null } = {}) {
    this.store = store; this.speed = speed;
    this.clock = clock; this.monitor = new MonitoringHealth(clock);
    this.runner = enrichmentRunner ?? new EnrichmentRunner();
    this.caseBuilder = caseBuilder ?? ((risk, now) => this.runner.build(risk, now));
    this.enrichmentFault = false;
    store.put('missions', MISSION_ID, { id: MISSION_ID, name: 'ARES I', profile: 'mars', synthetic: true });
    for (const crew of CREW) store.put('crew_members', crew.id, { ...crew, mission_id: MISSION_ID, synthetic: true });
    this.baselines = store.get('baselines') ?? createBaselines(42017); store.set('baselines', this.baselines);
    for (const c of CREW) store.put('health_baselines', c.id, this.baselines[c.id]);
    this.state = store.get('mission_state') ?? { now: EPOCH, tick: 0, runId: randomUUID(), seed: 42017, scenario: 'nominal', startedAt: EPOCH, pending: {}, ground: null };
    this.comms = new Comms(store);
    this.state.packet_sequence ??= 0;
    if (this.state.crew) {
      for (const c of this.state.crew) {
        c.metric_observations ??= {};
        for (const name of Object.keys(METRICS)) {
          if (c.metric_observations[name]) continue;
          const event = store.latestTelemetry(c.id, name);
          if (event) c.metric_observations[name] = retainObservation(event);
        }
        refreshReading(c, this.state.now);
        c.sleep_session=c.metric_observations.sleep_duration?.sleep_session?sleepRecord(c.metric_observations.sleep_duration):null;
        if (c.quality !== 'good') { c.status = 'gray'; c.status_text = 'Verify measurement — stale, incomplete or unreliable signal'; }
      }
    }
    if (!this.state.crew) {
      this.initialSleeps={};
      for (let i = -90; i < 0; i++) {
        const s = simulate({ seed: this.state.seed, tick: i, elapsed: 0, now: EPOCH + i * 60_000, scenario: 'nominal', runId: 'seed-history', baselines: this.baselines,sleepSessions:this.initialSleeps });
        for(const c of s.crew){this.initialSleeps[c.id]=c.sleep_session;delete c.completed_sleep_records;}
        store.snapshot(s.crew.map(c => ({ ...c, status: 'green' })), new Date(EPOCH + i * 60_000).toISOString());
      }
      this.tick(0);
    }
    // The new detector must evaluate recovered state before readiness is claimed.
    if (this.monitor.lastSuccess === null) {
      this.store.transaction(() => { this.state.crew = this.detect(this.state.crew); this.checkpoint(); });
      this.monitor.success();
    }
    // Additive recovery for pre-N02 alerts without cases. No capped list lookup.
    this.store.transaction(() => {
      const missing = store.db.prepare('SELECT r.id FROM risk_events r LEFT JOIN agent_cases c ON c.risk_event_id=r.id LEFT JOIN enrichment_jobs j ON j.id=r.id WHERE c.id IS NULL AND j.id IS NULL').all();
      for (const { id } of missing) this.queueEnrichment(id);
    });
  }
  checkpoint() { this.store.set('mission_state', this.state); }
  queueEnrichment(id) {
    this.store.put('enrichment_jobs', id, { id, status: 'pending', attempts: 0, next_attempt_at: this.clock(),
      created_at: new Date(this.clock()).toISOString(), last_attempt_at: null, last_error_code: null, completed_at: null });
  }
  enrichPending() {
    if (this.enrichmentWork) return this.enrichmentWork;
    this.enrichmentWork = this.processEnrichment().catch(() => { this.enrichmentFault = true; }).finally(() => { this.enrichmentWork = null; });
    return this.enrichmentWork;
  }
  async processEnrichment() {
    if (this.closed) return;
    // One process/worker owns this local DB. At most six due jobs per pass.
    const jobs = this.store.db.prepare("SELECT json FROM enrichment_jobs WHERE status!='complete' AND next_attempt_at<=? ORDER BY next_attempt_at,rowid LIMIT 6").all(this.clock()).map(r => JSON.parse(r.json));
    for (const job of jobs) {
      if (this.closed) return;
      const risk = this.store.record('risk_events', job.id);
      job.attempts++; job.last_attempt_at = new Date(this.clock()).toISOString();
      // Persist dispatch before optional work. A process exit leaves recoverable pending work.
      job.next_attempt_at = this.clock() + 2000;
      try { this.store.put('enrichment_jobs', job.id, job); }
      catch { this.enrichmentFault = true; return; }
      let c; let failure = false;
      try {
        c = await this.caseBuilder(structuredClone(risk), this.state.now);
        // Optional output has no authority to acknowledge, transmit or change the alert.
        if (c?.id !== `CASE-${risk.id}` || c.risk_event_id !== risk.id || c.crew_id !== risk.crew_id
          || c.human_ack !== null || c.message_id !== null || c.state !== 'awaiting_human_ack' || !Array.isArray(c.citations)) throw new Error('Invalid enrichment result');
      } catch { failure = true; }
      if (this.closed) return; // The durable job remains pending for the next process.
      try {
        this.store.transaction(() => {
          const existing = this.store.record('agent_cases', `CASE-${risk.id}`);
          if (!failure && !existing) this.store.put('agent_cases', c.id, c);
          job.status = existing || !failure ? 'complete' : 'failed';
          job.last_error_code = job.status === 'failed' ? 'CASE_ENRICHMENT_FAILED' : null;
          job.next_attempt_at = this.clock() + Math.min(60_000, 1000 * 2 ** Math.min(job.attempts - 1, 6));
          if (job.status === 'complete') job.completed_at = new Date(this.clock()).toISOString();
          this.store.put('enrichment_jobs', job.id, job);
          this.store.audit('enrichment', job.status === 'complete' ? 'case.enriched' : 'case.enrichment_failed', job.id, { attempts: job.attempts, code: job.last_error_code });
        });
        this.enrichmentFault = false;
      } catch {
        // Original risk/job are already committed. Failed optional writes roll back together.
        this.enrichmentFault = true; return;
      }
    }
  }
  async close() { this.closed = true; this.runner.close(); await this.enrichmentWork; }
  recordRisk(reading, result) {
    const row = this.store.db.prepare("SELECT json FROM risk_events WHERE crew_id=? AND json_extract(json,'$.run_id')=? ORDER BY rowid DESC LIMIT 1").get(reading.id, this.state.runId);
    const existing = row ? JSON.parse(row.json) : null;
    if (existing && !(result.status === 'red' && existing.severity !== 'critical')) return existing;
    const evidence = result.evidence.map(item => {
      const observation = reading.metric_observations?.[item.metric];
      const startRow = item.rate_start?.event_id ? this.store.db.prepare('SELECT json FROM telemetry_points WHERE event_id=?').get(item.rate_start.event_id) : null;
      const start = startRow ? JSON.parse(startRow.json) : null;
      return { ...item, rate_start: item.rate_start ? { ...item.rate_start,
        value: start?.metric.value ?? null, unit: start?.metric.unit ?? null, source: structuredClone(start?.source ?? null),
        provenance: structuredClone(start?.provenance ?? null), quality: structuredClone(start?.quality ?? null) } : null,
        event_id: observation?.event_id ?? null, observed_at: observation?.ts ?? null,
        received_ts: observation?.received_ts ?? null, source: structuredClone(observation?.source ?? null),
        quality: structuredClone(reading.metric_quality?.[item.metric] ?? observation?.quality ?? null),
        provenance: structuredClone(observation?.provenance ?? null) };
    });
    const common = key => { const values = new Set(evidence.flatMap(e => [e.provenance?.[key], ...(e.rate_start?.provenance ? [e.rate_start.provenance[key]] : [])])); return values.size === 1 ? [...values][0] : null; };
    const risk = { schema_version: 'astra.risk-event.v1', id: `RISK-${randomUUID().slice(0, 8)}`, crew_id: reading.id,
      created_at: new Date(this.state.now).toISOString(), run_id: this.state.runId, severity: result.status === 'red' ? 'critical' : 'warning', status: 'open',
      detector: result.detector, evidence, data_quality: reading.quality, uncertainty: result.uncertainty,
      display: { body_region: result.evidence.some(e => ['heart_rate', 'hrv', 'spo2', 'respiratory_rate'].includes(e.metric)) ? 'thorax' : 'head', status_text: result.reason },
      safety: { diagnosis: null, requires_human_acknowledgement: true },
      provenance: { synthetic: true, scenario_id: common('scenario_id') ?? 'mixed', seed: common('seed'),
        generator_version: common('generator_version') ?? 'mixed', mission_scenario_id: this.state.scenario } };
    risk.risk_event_id = risk.id;
    risk.detector = { ...risk.detector, score: risk.uncertainty.score };
    if (existing) risk.escalates_risk_id = existing.id;
    this.store.put('risk_events', risk.id, risk);
    this.queueEnrichment(risk.id);
    this.store.audit('detector', 'risk.created', risk.id, { crew_id: reading.id, model: result.detector.version });
    return risk;
  }
  detect(crew) {
    for (const c of crew) {
      const result = evaluateCrew(c, this.baselines[c.id], this.state.now, this.state.pending[c.id]);
      this.state.pending[c.id] = result.pending; c.status = result.status; c.status_text = result.reason;
      c.evidence = result.evidence; c.baseline = this.baselines[c.id];
      if (result.review) c.risk_id = this.recordRisk(c, result).id;
      else delete c.risk_id;
    }
    return crew;
  }
  tick(seconds = this.speed) {
    const previous = structuredClone(this.state); const previousTx = this.comms.nextTxAt;
    try { const result = this.store.transaction(() => this.advance(seconds)); this.monitor.success(); return result; }
    catch (error) { this.state = previous; this.comms.nextTxAt = previousTx; this.monitor.failure(); throw error; }
  }
  advance(seconds) {
    this.state.now += seconds * 1000; this.state.tick++;
    this.advanceDemo();
    const s = simulate({ seed: this.state.seed, tick: this.state.tick, elapsed: (this.state.now - this.state.startedAt) / 1000,
      now: this.state.now, scenario: this.state.scenario, runId: this.state.runId, baselines: this.baselines, cadenceSeconds: seconds || this.speed,
      sleepSessions:this.state.crew?Object.fromEntries(this.state.crew.map(c=>[c.id,c.sleep_session])):this.initialSleeps??{}, demo: this.state.demo });
    const events = s.events.filter(e => {
      const previous=this.state.crew?.find(c=>c.id===e.crew_id)?.metric_observations?.[e.metric.name];
      return previous?.source.kind!=='synthetic-import'&&(e.metric.name!=='sleep_duration'||e.event_id!==previous?.event_id);
    });
    for (const e of events) validateTelemetry(e, this.state.now);
    const receipt = { mission_received_at: new Date(this.state.now).toISOString(), host_received_at: new Date().toISOString(), principal: 'simulator' };
    const observations = events.map(e => retainObservation(e, receipt));
    this.store.ingest(observations);
    for(const e of observations)if(e.sleep_session)this.persistSleep(sleepRecord(e));
    for(const c of s.crew){
      if(this.state.crew?.find(v=>v.id===c.id)?.metric_observations?.sleep_duration?.source.kind!=='synthetic-import'){
        for(const record of c.completed_sleep_records){
          if(observations.some(e=>e.event_id===record.observation.event_id))continue;
          const observation=observations.find(e=>e.event_id===record.observation.event_id)??retainObservation(sleepObservation(record),receipt);
          this.persistSleep(sleepRecord(observation));
        }
      }
      delete c.completed_sleep_records;
    }
    this.state.crew = this.detect(s.crew.map(c => {
      c.metric_observations = structuredClone(this.state.crew?.find(previous => previous.id === c.id)?.metric_observations ?? {});
      for (const event of observations) if (event.crew_id === c.id) c.metric_observations[event.metric.name] = event;
      c.sleep_session=c.metric_observations.sleep_duration?.sleep_session?sleepRecord(c.metric_observations.sleep_duration):null;
      return refreshReading(c, this.state.now);
    }));
    this.noteDemoQuality();
    const cumulative = (this.state.environment?.cumulative_msv ?? 36.1) + s.environment.dose_rate_msv_h * seconds / 3600;
    this.state.environment = { ...s.environment, cumulative_msv: cumulative, ...evaluateEnvironment(s.environment) };
    const ts = new Date(this.state.now).toISOString(); this.store.snapshot(this.state.crew, ts);
    this.queueSnapshot(); this.processComms();
    this.checkpoint(); if (this.state.tick % 120 === 0) this.store.prune(this.state.now);
    this.initialSleeps=null;
    return this.snapshot();
  }
  persistSleep(record){
    this.store.appendSleep(record);
    this.store.audit(record.source.kind==='simulator'?'simulator':'telemetry-service',record.revision===1?'sleep.completed':'sleep.corrected',record.record_id,
      {crew_id:record.crew_id,session_id:record.session_id,revision:record.revision,end_at:record.end_at,observed_at:record.observed_at,historical_fixture:record.historical_fixture,reason:record.correction_reason});
  }
  correctSleep(crewId,sessionId,changes){
    const previous=structuredClone(this.state),previousTx=this.comms.nextTxAt;
    try{return this.store.transaction(()=>{
      const c=this.state.crew.find(c=>c.id===crewId),prior=c?.sleep_session;
      if(!prior||prior.session_id!==sessionId)throw new AppError(409,'SLEEP_NOT_CURRENT','Corrections must identify the current completed session.');
      if(prior.source.kind!=='simulator'||c.metric_observations.sleep_duration.source.kind==='synthetic-import')throw new AppError(409,'SOURCE_CONFLICT','Imported sleep corrections belong to the authorized import source.');
      if(changes.expected_revision!==prior.revision)throw new AppError(409,'SLEEP_REVISION_CONFLICT','Inspect the current sleep revision before correcting it.');
      const record=correctedSleep(prior,{...changes,start_at:changes.start_at??prior.start_at,end_at:changes.end_at??prior.end_at},this.state.now);
      const event=sleepObservation(record);validateTelemetry(event,this.state.now);
      const observation=retainObservation(event,{mission_received_at:new Date(this.state.now).toISOString(),host_received_at:new Date().toISOString(),principal:'simulator-correction'});
      this.store.ingest([observation]);c.sleep_session=sleepRecord(observation);this.persistSleep(c.sleep_session);c.metric_observations.sleep_duration=observation;
      this.detect([refreshReading(c,this.state.now)]);this.store.snapshot([c],new Date(this.state.now).toISOString());this.queueSnapshot();this.processComms();this.checkpoint();return structuredClone(c.sleep_session);
    });}catch(error){this.state=previous;this.comms.nextTxAt=previousTx;if(!(error instanceof AppError)||error.status>=500)this.monitor.failure();throw error;}
  }
  queueSnapshot() {
    const sequence = ++this.state.packet_sequence;
    const packet = { sequence, observed_at: this.state.now, crew: structuredClone(this.state.crew), environment: structuredClone(this.state.environment), alerts: this.store.list('risk_events', 100) };
    this.comms.enqueue(packet, this.state.now, { kind: 'telemetry', priority: 1, id: `telemetry-${this.state.runId}-${sequence}` });
  }
  processComms() {
    for (const message of this.comms.step(this.state.now)) {
      const sequence = message.payload.sequence;
      const newer = !this.state.ground || (Number.isInteger(sequence) ? sequence > (this.state.ground.sequence ?? -1)
        : this.state.ground.sequence === undefined && message.observed_at > this.state.ground.observed_at);
      if (message.kind === 'telemetry' && newer) {
        this.state.ground = { ...message.payload, transmitted_at: message.transmitted_at, received_at: message.received_at };
      }
      if (message.kind === 'case') {
        const c = this.store.record('agent_cases', message.payload.id);
        if (c) { c.state = 'delivered_to_earth'; c.earth_received_at = new Date(message.received_at).toISOString(); this.store.put('agent_cases', c.id, c); }
        this.store.audit('comms', 'message.delivered', message.id, { crew_id: message.payload.crew_id, received_at: message.received_at });
      }
    }
  }
  snapshot() {
    return { schema_version: 'astra.snapshot.v1', mission: { id: MISSION_ID, name: 'ARES I', subtitle: 'Earth-independent crew health', location: 'Mars transfer trajectory', profile: 'mars', mission_day: 95 + Math.floor((this.state.now - EPOCH) / 86_400_000),
      spacecraft_time: new Date(this.state.now).toISOString(), host_time: new Date().toISOString(), speed: this.speed, synthetic: true },
      crew: this.state.crew, environment: this.state.environment, ground: this.state.ground, comms: this.comms.summary(),
      scenario: { id: this.state.scenario, seed: this.state.seed, run_id: this.state.runId, elapsed_seconds: (this.state.now - this.state.startedAt) / 1000, generator_version: '1.0.0', demo: this.demoSummary() },
      alerts: this.store.list('risk_events', 100), cases: this.store.list('agent_cases', 100), server_received_at: new Date().toISOString() };
  }
  saveDemo() {
    const d = this.state.demo;
    const row = this.store.db.prepare('SELECT json FROM scenario_runs WHERE id=?').get(d.run_id);
    if (!row) throw new Error('Demonstration run record is unavailable');
    const run = JSON.parse(row.json);
    this.store.put('scenario_runs', d.run_id, { ...run, demo: structuredClone(d) });
  }
  advanceDemo() {
    const d = this.state.demo;
    if (this.state.scenario !== DEMO_HR.id || d?.status !== 'active') return;
    const crew = this.state.crew.find(c => c.id === d.target_crew_id);
    const problem = hrTargetProblem(crew, this.baselines[d.target_crew_id]);
    if (problem) {
      d.status = 'blocked'; d.reason = problem; d.blocked_at = new Date(this.state.now).toISOString();
      this.saveDemo();
    } else if (this.state.now >= Date.parse(d.scheduled_end_at)) {
      d.status = 'completed'; d.completed_at = new Date(this.state.now).toISOString(); this.saveDemo();
    }
  }
  noteDemoQuality() {
    const d = this.state.demo;
    if (this.state.scenario !== DEMO_HR.id || !d || d.quality_gaps) return;
    const c = this.state.crew.find(c => c.id === d.target_crew_id);
    if (this.monitor.failed || c?.status === 'gray' || c?.quality !== 'good' || c.activity !== 'rest') {
      d.quality_gaps = true; d.first_uncertain_at = new Date(this.state.now).toISOString(); this.saveDemo();
    }
  }
  demoSummary() {
    const d = this.state.demo; if (!d) return null;
    const c = this.state.crew.find(c => c.id === d.target_crew_id);
    const risks = this.store.db.prepare("SELECT json FROM risk_events WHERE crew_id=? AND json_extract(json,'$.run_id')=? ORDER BY rowid DESC").all(d.target_crew_id, d.run_id).map(r => JSON.parse(r.json));
    const risk = risks.find(r => r.evidence.some(e => e.metric === 'heart_rate' && e.source?.kind === 'simulator'
      && e.source.device_id === `SIM-${d.target_crew_id}` && e.provenance?.scenario_id === DEMO_HR.id && e.event_id?.startsWith(d.run_id + ':')));
    const current = this.state.runId === d.run_id;
    const available = !this.monitor.failed && c?.quality === 'good' && c?.status !== 'gray';
    const status = risk ? 'detected' : d.status === 'blocked' ? 'unknown' : d.status === 'stopped' ? 'stopped'
      : !available || d.quality_gaps ? 'unknown' : d.status === 'completed' ? 'no_alert' : 'pending';
    const report = risk ? this.store.record('agent_cases', `CASE-${risk.id}`) : null;
    const job = risk ? this.store.record('enrichment_jobs', risk.id) : null;
    const elapsed = Math.max(0, ((Date.parse(d.stopped_at ?? d.completed_at ?? d.blocked_at ?? new Date(this.state.now).toISOString())) - Date.parse(d.started_at)) / 1000);
    return { ...structuredClone(d), current_run: current, elapsed_seconds: elapsed,
      phase: d.status === 'active' ? hrProfile(elapsed).phase : d.status, monitoring_state: status,
      reason: risk ? 'A matching persisted detector alert is recorded; inspect evidence and human review.' : d.reason
        ?? (!available || d.quality_gaps ? 'Monitoring or measurement coverage is uncertain; no healthy outcome is inferred.' : c?.status_text),
      detector_pending: current ? structuredClone(this.state.pending[d.target_crew_id]?.channels?.heart_rate ?? null) : null,
      risk: risk ? { id: risk.id, severity: risk.severity, status: risk.status, created_at: risk.created_at } : null,
      case_state: report?.state ?? (job ? `enrichment_${job.status}` : null),
      source_observed_at: current ? c?.metric_observations?.heart_rate?.ts ?? null : null };
  }
  startScenario(id, seed = 42017, actor = 'demo_admin', { target_crew_id, advance = false } = {}) {
    if (!SCENARIOS.some(s => s.id === id)) throw new AppError(404, 'UNKNOWN_SCENARIO', 'Unknown scenario.');
    if (id === DEMO_HR.id) {
      if (!CREW.some(c => c.id === target_crew_id)) throw new AppError(422, 'INVALID_DEMO_TARGET', 'Select one of the six fictional crew.');
      const problem = hrTargetProblem(this.state.crew.find(c => c.id === target_crew_id), this.baselines[target_crew_id], true);
      if (problem) throw new AppError(409, 'DEMO_TARGET_UNAVAILABLE', problem);
      if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31 - 1) throw new AppError(422, 'INVALID_DEMO_SEED', 'Use a bounded integer seed.');
    }
    const previous = structuredClone(this.state), tx = this.comms.nextTxAt, config = structuredClone(this.comms.config);
    try { return this.store.transaction(() => {
      if (this.state.scenario === DEMO_HR.id && ['active', 'blocked'].includes(this.state.demo?.status)) {
        Object.assign(this.state.demo, { status: 'stopped', stopped_at: new Date(this.state.now).toISOString() }); this.saveDemo();
      }
      this.state.scenario = id; this.state.startedAt = this.state.now; this.state.runId = randomUUID(); this.state.seed = seed; this.state.pending = {};
      const run = { id: this.state.runId, scenario: id, seed, started_at: new Date(this.state.now).toISOString(), synthetic: true };
      if (id === DEMO_HR.id) {
        this.state.demo = { run_id: run.id, target_crew_id, profile: { ...DEMO_HR }, seed, started_at: run.started_at,
          start_tick: this.state.tick, scheduled_end_at: new Date(this.state.now + DEMO_HR.total_seconds * 1000).toISOString(), status: 'active', quality_gaps: false };
        run.demo = structuredClone(this.state.demo);
      }
      this.store.put('scenario_runs', run.id, run);
      if (id === 'communication-blackout') this.comms.control({ blackout: true }, this.state.now);
      this.store.audit(actor, 'scenario.started', run.id, { scenario: id, seed, ...(id === DEMO_HR.id ? { target_crew_id, profile_version: DEMO_HR.version } : {}) });
      this.checkpoint(); if (advance) this.tick(); return run;
    }); } catch (error) {
      this.state = previous; this.comms.nextTxAt = tx; this.comms.config = config;
      if (!(error instanceof AppError) || error.status >= 500) this.monitor.failure(); throw error;
    }
  }
  acknowledge(id, identity) {
    const risk = this.store.record('risk_events', id); if (!risk) throw new AppError(404, 'NOT_FOUND', 'Alert not found.');
    const c = this.store.record('agent_cases', `CASE-${risk.id}`);
    if (!c) throw new AppError(409, 'CASE_ENRICHMENT_PENDING', 'The original alert is retained. Case enrichment must recover before acknowledgement and transmission.');
    if (risk.status === 'acknowledged' && c.human_ack) return { risk, case: c, idempotent: true };
    return this.store.transaction(() => {
      risk.status = 'acknowledged'; risk.acknowledged_at = new Date(this.state.now).toISOString(); risk.acknowledged_by = identity.id;
      this.store.put('risk_events', risk.id, risk);
      if (c) {
        c.human_ack = { actor: identity.id, ts: risk.acknowledged_at }; c.state = 'queued_for_earth';
        c.message_id = `report-${c.id}`;
        this.comms.enqueue(c, this.state.now, { id: c.message_id, kind: 'case', priority: 5, observedAt: Date.parse(risk.created_at) });
        this.store.put('agent_cases', c.id, c);
      }
      this.store.audit(identity.id, 'alert.acknowledged', risk.id, { crew_id: risk.crew_id, case_id: c?.id });
      this.store.audit(identity.id, 'message.queued', c?.message_id ?? risk.id, { crew_id: risk.crew_id });
      return { risk, case: c };
    });
  }
  ingest(events) {
    const previous = structuredClone(this.state); const previousTx = this.comms.nextTxAt;
    try { return this.store.transaction(() => this.applyIngest(events)); }
    catch (error) { this.state = previous; this.comms.nextTxAt = previousTx; if (!(error instanceof AppError) || error.status >= 500) this.monitor.failure(); throw error; }
  }
  applyIngest(events) {
    if (!Array.isArray(events) || !events.length || events.length > 120) throw new AppError(422, 'INVALID_BATCH', 'Supply 1–120 events.');
    for (const e of events) {
      validateTelemetry(e, this.state.now);
      if (e.source.kind !== 'synthetic-import') throw new AppError(422, 'INVALID_TELEMETRY', 'External ingest must identify a synthetic-import source.');
    }
    const receipt = { mission_received_at: new Date(this.state.now).toISOString(), host_received_at: new Date().toISOString(), principal: 'telemetry-service' };
    const observations = events.map(e => retainObservation(e, receipt));
    const latest = new Map();
    for (const e of observations) {
      const current = this.state.crew.find(c => c.id === e.crew_id);
      const row = latest.get(e.crew_id) ?? structuredClone(current);
      const previous = row.metric_observations[e.metric.name];
      const imported = previous?.source.kind === 'synthetic-import';
      if (imported && previous.source.device_id && previous.source.device_id !== e.source.device_id) throw new AppError(409, 'SOURCE_CONFLICT', 'This channel already belongs to another import device.');
      if (previous && (Date.parse(e.ts) < Date.parse(previous.ts) || imported && Date.parse(e.ts) === Date.parse(previous.ts))) throw new AppError(409, 'OUT_OF_ORDER', 'Each imported channel must advance its observation time.');
      if(e.metric.name==='sleep_duration'){
        if(e.sleep_session){
          const priorSession=previous?.sleep_session;
          if(e.sleep_session.revision>1&&priorSession?.session_id!==e.sleep_session.session_id)throw new AppError(409,'SLEEP_NOT_CURRENT','Only the current imported session can be corrected.');
          if(priorSession&&previous.source.kind===e.source.kind&&previous.source.device_id===e.source.device_id&&e.sleep_session.session_id!==priorSession.session_id&&Date.parse(e.sleep_session.end_at)<=Date.parse(priorSession.end_at))throw new AppError(409,'OUT_OF_ORDER','A new completed session must advance completion time.');
          row.sleep_session=sleepRecord(e);this.persistSleep(row.sleep_session);
        }else row.sleep_session=null; // Legacy scalar imports remain accepted, never invented into completed sessions.
      }
      row.metric_observations[e.metric.name] = e;
      latest.set(e.crew_id, row);
    }
    const count = this.store.ingest(observations);
    const updated = this.detect([...latest.values()].map(c => refreshReading(c, this.state.now)));
    for (const c of updated) this.state.crew[this.state.crew.findIndex(v => v.id === c.id)] = c;
    this.advanceDemo(); this.noteDemoQuality();
    this.store.snapshot(updated, new Date(this.state.now).toISOString());
    this.queueSnapshot(); this.processComms();
    this.store.audit('telemetry-service', 'telemetry.ingested', MISSION_ID, { count });
    this.checkpoint(); return count;
  }
  predictions(crewId) {
    const history = this.store.history(crewId, 120);
    return Object.fromEntries(['heart_rate', 'hrv', 'sleep_duration'].map(metric => {
      if(metric==='sleep_duration')return [metric,forecast([],metric)];
      const current = this.state.crew.find(c => c.id === crewId); const b = this.baselines[crewId][metric];
      if (['amber', 'red'].includes(current.status) || (current.quality === 'good' && Math.abs(current.values[metric] - b.center) > 2 * b.scale)) {
        return [metric, { available: false, reason: 'Current deviation is outside nominal synthetic calibration. Inspect measured evidence and request human review instead of extrapolating.', model_version: 'linear-trend-v2' }];
      }
      const prediction = { ...forecast(history, metric), unit: METRICS[metric].unit };
      if (prediction.available) {
        const id = `PRED-${crewId}-${metric}-${this.state.now}`;
        this.store.put('predictions', id, { ...prediction, id, crew_id: crewId, created_at: new Date(this.state.now).toISOString() });
      }
      return [metric, prediction];
    }));
  }
}
