import { Worker } from 'node:worker_threads';

/** One bounded optional task per worker. Errors/crashes/timeouts cannot unwind a committed tick. */
export class EnrichmentRunner {
  constructor({ timeoutMs = 2000, workerURL = new URL('../agent/enrichment-worker.mjs', import.meta.url) } = {}) {
    this.timeoutMs = timeoutMs; this.workerURL = workerURL; this.sequence = 0;
  }
  build(risk, now) {
    if (this.closed) return Promise.reject(new Error('Enrichment runner closed'));
    return new Promise((resolve, reject) => {
      let settled = false; let timer;
      const finish = (error, value) => {
        if (settled) return; settled = true; clearTimeout(timer); this.cancel = null;
        worker.removeAllListeners(); worker.on('error', () => {}); void worker.terminate().catch(() => {});
        if (error) reject(error); else resolve(value);
      };
      const worker = new Worker(this.workerURL, { resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 } }); const id = ++this.sequence;
      this.cancel = () => finish(new Error('Enrichment runner closed'));
      worker.once('error', () => finish(new Error('Enrichment worker failed')));
      worker.once('exit', () => finish(new Error('Enrichment worker exited')));
      worker.on('message', message => { if (message.id === id) finish(message.error ? new Error(message.error) : null, message.value); });
      timer = setTimeout(() => finish(new Error('Enrichment timeout')), this.timeoutMs);
      try { worker.postMessage({ id, risk, now }); } catch { finish(new Error('Enrichment message failed')); }
    });
  }
  close() { this.closed = true; this.cancel?.(); }
}
