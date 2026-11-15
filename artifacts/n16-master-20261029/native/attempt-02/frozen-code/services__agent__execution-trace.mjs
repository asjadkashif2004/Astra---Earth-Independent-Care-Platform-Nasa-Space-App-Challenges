import { open, mkdir, rename, unlink } from 'node:fs/promises';
import { constants as C } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { safeDirectory, childDirectory, readAt } from './read-context.mjs';
import { fail, LIMITS, parseJSON, sha, stable, VERSION } from './read-contract.mjs';

export const TRACE_ROOT = fileURLToPath(new URL('../../artifacts/n16-01-executions/', import.meta.url));
export const RUN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
async function writeAll(file, bytes) {
  let offset = 0;
  while (offset < bytes.length) { const {bytesWritten} = await file.write(bytes, offset, bytes.length - offset); if (!bytesWritten) fail('SHORT_TRACE_WRITE'); offset += bytesWritten; }
  await file.sync();
}
async function atomic(dir, name, bytes) {
  const temp = name + '.tmp-' + randomUUID(); let file;
  try {
    file = await open(dir.at(temp), C.O_WRONLY | C.O_CREAT | C.O_EXCL | C.O_NOFOLLOW, 0o600);
    await writeAll(file, bytes); await file.close(); file = null;
    await rename(dir.at(temp), dir.at(name)); await dir.handle.sync();
  } finally {
    if (file) await file.close();
    try { await unlink(dir.at(temp)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}
export class ExecutionTrace {
  static async create(context, {root = TRACE_ROOT, fault = () => {}} = {}) {
    const parent = await safeDirectory(root), id = randomUUID(); let dir, log;
    try {
      await mkdir(parent.at(id), {mode:0o700}); await parent.handle.sync();
      dir = await childDirectory(parent, id);
      log = await open(dir.at('trace.jsonl'), C.O_WRONLY | C.O_CREAT | C.O_EXCL | C.O_APPEND | C.O_NOFOLLOW, 0o600);
      const trace = new ExecutionTrace(id, dir, log, fault);
      await trace.append('RUN_STARTED', {schema_version:VERSION, context}); return trace;
    } catch (e) { if (log) await log.close(); if (dir) await dir.close(); throw e; }
    finally { await parent.close(); }
  }
  constructor(id, directory, log, fault) {
    this.id = id; this.dir = directory; this.log = log; this.fault = fault;
    this.seq = 0; this.head = 'GENESIS'; this.bytes = 0; this.failed = false;
    this.queue = Promise.resolve(); this.closed = false;
    this.resultBytes = 0; this.results = new Set();
  }
  append(type, payload) {
    const operation = async () => {
      if (this.failed || this.closed) fail('TRACE_CLOSED');
      const body = {schema_version:'astra.n16.execution-event.v1', run_id:this.id, seq:this.seq + 1,
        previous_hash:this.head, at:new Date().toISOString(), type, payload};
      const row = {...body, hash:sha(stable(body))}, bytes = Buffer.from(stable(row) + '\n');
      if (bytes.length > LIMITS.result || this.bytes + this.resultBytes + bytes.length + 4096 > LIMITS.trace) { this.failed = true; fail('TRACE_SIZE_LIMIT'); }
      try {
        this.fault('append', type); await writeAll(this.log, bytes);
        this.fault('checkpoint', type);
        await atomic(this.dir, 'checkpoint.json', Buffer.from(stable({run_id:this.id, seq:row.seq, hash:row.hash}) + '\n'));
        this.seq = row.seq; this.head = row.hash; this.bytes += bytes.length;
        return row;
      } catch { this.failed = true; fail('TRACE_PERSISTENCE_FAILED'); }
    };
    const next = this.queue.then(operation); this.queue = next.catch(() => {}); return next;
  }
  async result(callId, value) {
    if (this.failed || this.closed || !/^call-0[1-4]$/.test(callId) || this.results.has(callId)) fail('TRACE_CLOSED');
    const bytes = Buffer.from(stable(value) + '\n');
    if (bytes.length > LIMITS.result || this.bytes + this.resultBytes + bytes.length + 4096 > LIMITS.trace) { this.failed = true; fail('RESULT_SIZE_LIMIT'); }
    try {
      this.fault('result', callId); const file = callId + '.json'; await atomic(this.dir, file, bytes);
      this.results.add(callId); this.resultBytes += bytes.length;
      return {file, bytes:bytes.length, sha256:sha(bytes)};
    } catch { this.failed = true; fail('TRACE_PERSISTENCE_FAILED'); }
  }
  async close() { await this.queue; this.closed = true; try { await this.log.close(); } finally { await this.dir.close(); } }
}

export async function recoverTrace(id, {root = TRACE_ROOT} = {}) {
  if (!RUN_PATTERN.test(id)) fail('UNSAFE_RUN_ID');
  const parent = await safeDirectory(root); let dir;
  try {
    dir = await childDirectory(parent, id);
    const raw = await readAt(dir.fd, 'trace.jsonl', LIMITS.trace);
    let checkpoint;
    try { checkpoint = parseJSON((await readAt(dir.fd, 'checkpoint.json', 4096)).toString(), 4096); }
    catch { return {run_id:id, status:'INCOMPLETE', reason:'checkpoint_unavailable', executed_calls:[], replayed_calls:0}; }
    const rows = [], text = raw.toString(), lines = text.split('\n'); let head = 'GENESIS';
    const partial = lines.pop() !== '';
    for (const line of lines) {
      const row = parseJSON(line, LIMITS.result), {hash, ...body} = row;
      if (row.run_id !== id || row.seq !== rows.length + 1 || row.previous_hash !== head || sha(stable(body)) !== hash) fail('TRACE_CORRUPT');
      rows.push(row); head = hash;
    }
    if (checkpoint.run_id !== id || checkpoint.seq < 1 || rows[checkpoint.seq - 1]?.hash !== checkpoint.hash) fail('CHECKPOINT_CORRUPT');
    const committed = rows.slice(0, checkpoint.seq), calls = new Map(); let ended = false, outcome = null;
    for (const [position, row] of committed.entries()) {
      const p = row.payload;
      if (ended || position === 0 && row.type !== 'RUN_STARTED' || position > 0 && row.type === 'RUN_STARTED') fail('TRACE_LIFECYCLE_CORRUPT');
      if (row.type === 'CALL_REQUESTED') {
        if (calls.has(p.call_id) || !/^call-0[1-4]$/.test(p.call_id) || [...calls.values()].some(c => !c.terminal)) fail('TRACE_LIFECYCLE_CORRUPT');
        calls.set(p.call_id, {call_id:p.call_id, stage:'REQUESTED', status:'INCOMPLETE', started:false, terminal:false});
      }
      if (row.type === 'CALL_VALIDATED') {
        const c = calls.get(p.call_id); if (c?.stage !== 'REQUESTED') fail('TRACE_LIFECYCLE_CORRUPT'); c.stage = 'VALIDATED'; c.tool = p.tool;
      }
      if (row.type === 'CALL_STARTED') {
        const c = calls.get(p.call_id); if (c?.stage !== 'VALIDATED' || c.tool !== p.tool) fail('TRACE_LIFECYCLE_CORRUPT'); c.stage = 'STARTED'; c.started = true;
      }
      if (row.type === 'CALL_COMPLETED') {
        const c = calls.get(p.call_id); if (c?.stage !== 'STARTED' || c.terminal || p.result.file !== p.call_id + '.json') fail('TRACE_CORRUPT');
        const bytes = await readAt(dir.fd, p.result.file, LIMITS.result);
        if (bytes.length !== p.result.bytes || sha(bytes) !== p.result.sha256) fail('RESULT_CORRUPT');
        c.status = 'COMPLETED'; c.result = parseJSON(bytes.toString(), LIMITS.result); c.terminal = true;
      }
      if (['CALL_FAILED','CALL_CANCELLED','CALL_TIMEOUT'].includes(row.type)) {
        const c = calls.get(p.call_id); if (c?.stage !== 'STARTED' || c.terminal) fail('TRACE_CORRUPT'); c.status = row.type.slice(5); c.terminal = true;
      }
      if (row.type === 'CALL_DENIED') {
        const c = calls.get(p.call_id); if (!c || c.started || c.terminal) fail('TRACE_CORRUPT'); c.status = 'DENIED'; c.terminal = true;
      }
      if (row.type === 'RUN_ENDED') { ended = true; outcome = p.status; if ([...calls.values()].some(c => !c.terminal)) fail('TRACE_LIFECYCLE_CORRUPT'); }
      if (!['RUN_STARTED','RUN_ENDED','CALL_REQUESTED','CALL_VALIDATED','CALL_STARTED','CALL_COMPLETED','CALL_FAILED','CALL_CANCELLED','CALL_TIMEOUT','CALL_DENIED'].includes(row.type)) fail('TRACE_LIFECYCLE_CORRUPT');
    }
    return {run_id:id, status:ended && !partial && rows.length === committed.length
      && [...calls.values()].every(c => c.status !== 'INCOMPLETE') ? 'COMPLETE' : 'INCOMPLETE',
      committed_events:committed.length, uncommitted_tail:partial || rows.length !== committed.length,
      workflow_outcome:outcome, executed_calls:[...calls.values()].filter(c => c.started),
      not_started_calls:[...calls.values()].filter(c => !c.started), replayed_calls:0};
  } finally { if (dir) await dir.close(); await parent.close(); }
}
