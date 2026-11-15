import { randomUUID } from 'node:crypto';
import { hash } from '../api/store.mjs';
import { random } from '../telemetry-simulator/simulator.mjs';

export class Comms {
  constructor(store) {
    this.store = store;
    this.config = store.get('comms_config', { blackout: false, one_way_latency_ms: 720_000, jitter_ms: 1000, bandwidth_kbps: 128, loss: 0, seed: 42017 });
    this.nextTxAt = store.get('comms_next_tx', 0);
  }
  control(patch, now) {
    this.config = { ...this.config, ...patch }; this.store.set('comms_config', this.config);
    if (!this.config.blackout) this.nextTxAt = Math.max(now, this.nextTxAt);
    return this.config;
  }
  enqueue(payload, now, { kind = 'case', priority = 3, id = randomUUID(), observedAt = now } = {}) {
    const existing = this.store.record('comms_messages', id); if (existing) return existing;
    const message = { id, kind, origin: 'spacecraft', destination: 'earth', priority, status: 'queued', created_at: now, observed_at: observedAt,
      transmitted_at: null, deliver_at: null, received_at: null, attempts: 0, payload_hash: hash(payload), payload, synthetic: true };
    this.store.put('comms_messages', id, message); return message;
  }
  step(now) {
    if (this.config.blackout) return [];
    const rows = this.store.db.prepare("SELECT id,status,deliver_at FROM comms_messages WHERE status IN ('queued','in_transit') ORDER BY priority DESC,rowid ASC LIMIT 10000").all();
    const delivered = [];
    for (const row of rows) {
      // Waiting packets do not change. Keep the existing order/cursor semantics
      // without reading, decoding and rewriting their potentially large payloads.
      if (row.status === 'queued' ? this.nextTxAt > now : row.deliver_at > now) continue;
      const m = this.store.record('comms_messages', row.id);
      if (m.status === 'queued' && this.nextTxAt <= now) {
        const rng = random(this.config.seed + parseInt(hash(m.id).slice(0, 7), 16) + m.attempts);
        const jitter = Math.floor(rng() * this.config.jitter_ms);
        const serialization = Math.ceil(Buffer.byteLength(JSON.stringify(m.payload)) * 8 / this.config.bandwidth_kbps);
        m.transmitted_at = now; m.deliver_at = now + this.config.one_way_latency_ms + jitter + serialization;
        m.status = 'in_transit'; m.attempts++;
        this.nextTxAt = now + serialization;
      }
      if (m.status === 'in_transit' && m.deliver_at <= now) {
        const loss = random(this.config.seed + m.attempts + parseInt(hash(m.id).slice(0, 7), 16))();
        if (loss < this.config.loss && m.attempts < 8) { m.status = 'queued'; m.deliver_at = null; m.last_retry_at = now; }
        else if (loss < this.config.loss) { m.status = 'failed'; m.failure_reason = 'Retry budget exhausted; human resend required.'; }
        else { m.status = 'delivered'; m.received_at = now; delivered.push(m); }
      }
      this.store.put('comms_messages', m.id, m);
    }
    this.store.set('comms_next_tx', this.nextTxAt);
    return delivered;
  }
  summary() {
    const counts = this.store.db.prepare('SELECT status,COUNT(*) AS n FROM comms_messages GROUP BY status').all();
    return { ...this.config, counts: Object.fromEntries(counts.map(c => [c.status, c.n])) };
  }
}
