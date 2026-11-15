import { parentPort } from 'node:worker_threads';
import { buildCase } from './agent.mjs';

// No database, telemetry authority or acknowledgement capability crosses this boundary.
parentPort.on('message', ({ id, risk, now }) => {
  try { parentPort.postMessage({ id, value: buildCase(risk, now) }); }
  catch { parentPort.postMessage({ id, error: 'CASE_ENRICHMENT_FAILED' }); }
});
