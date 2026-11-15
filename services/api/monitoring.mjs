/** Host-clock service health, deliberately independent of accelerated mission time. */
export class MonitoringHealth {
  constructor(clock = Date.now) { this.clock = clock; this.startedAt = clock(); this.failures = 0; this.lastSuccess = null; this.lastFailure = null; this.failed = false; }
  success() { this.lastSuccess = this.clock(); this.failed = false; }
  failure() { this.lastFailure = this.clock(); this.failures++; this.failed = true; }
  report(store, { automatic = true, enrichmentFault = false, knowledgeReady = true } = {}) {
    let database = 'ready'; let jobs = { pending: 0, failed: 0 };
    try {
      store.db.prepare('SELECT 1').get();
      jobs = store.db.prepare("SELECT COALESCE(SUM(status='pending'),0) AS pending, COALESCE(SUM(status='failed'),0) AS failed FROM enrichment_jobs").get();
    } catch { database = 'unavailable'; }
    const age = this.lastSuccess === null ? null : Math.max(0, this.clock() - this.lastSuccess);
    const status = database !== 'ready' ? 'unavailable' : this.failed ? 'failed' : this.lastSuccess === null ? 'starting'
      : automatic && age > 5000 ? 'stale' : automatic ? 'running' : 'manual';
    const ready = database === 'ready' && ['running', 'manual'].includes(status);
    const degraded = !knowledgeReady || enrichmentFault || jobs.failed > 0 || jobs.pending > 0;
    const iso = value => value === null ? null : new Date(value).toISOString();
    return { status: !ready ? 'unavailable' : degraded ? 'degraded' : 'ok', ready, live: true,
      version: '0.1.0', mode: 'local-research-simulation', database, external_dependencies: 0,
      monitoring: { status, automatic, last_success_at: iso(this.lastSuccess), last_failure_at: iso(this.lastFailure),
        consecutive_failure: this.failed, failure_count: this.failures, age_ms: age, stale_after_ms: 5000 },
      enrichment: { status: !knowledgeReady || enrichmentFault || jobs.failed ? 'degraded' : jobs.pending ? 'pending' : 'ready', ...jobs } };
  }
}
