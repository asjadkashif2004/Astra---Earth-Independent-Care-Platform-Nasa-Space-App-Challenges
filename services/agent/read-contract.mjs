import { createHash } from 'node:crypto';
import { CREW } from '../../packages/contracts.mjs';

export const VERSION = 'astra.n16.read-tools.v1';
export const METRIC_NAMES = Object.freeze(['heart_rate', 'respiratory_rate', 'spo2']);
export const TOOLS = Object.freeze(['get_current_vitals', 'get_data_quality', 'get_personal_baseline', 'get_open_risk_events']);
export const LIMITS = Object.freeze({fixture: 1000000, args: 4096, result: 65536, trace: 1000000, calls: 4, toolMs: 1000, runMs: 10000});
export const TOOL_SCHEMAS = Object.freeze(Object.fromEntries(TOOLS.map(tool => [tool, Object.freeze({
  schema_version: VERSION, additionalProperties: false, required: Object.freeze(tool === 'get_open_risk_events'
    ? ['crew_id', 'limit'] : ['crew_id', 'metrics']), crew_ids: Object.freeze(CREW.map(c => c.id)),
  metrics: METRIC_NAMES, limit: Object.freeze([1, 20])})])));
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
    : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
export function fail(code) { throw Object.assign(Error(code), {code}); }
export const exact = (v, names) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).sort().join() === [...names].sort().join();
export function plain(v, depth = 0, seen = new Set()) {
  if (depth > 20) return false;
  if (v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) return true;
  if (typeof v === 'string') return v.length <= LIMITS.fixture;
  if (typeof v !== 'object' || seen.has(v) || !Array.isArray(v)
    && ![null, Object.prototype].includes(Object.getPrototypeOf(v))) return false;
  const descriptors = Object.entries(Object.getOwnPropertyDescriptors(v));
  if (descriptors.length > 1000) return false;
  seen.add(v);
  const ok = descriptors.every(([k, d]) => !['__proto__', 'constructor', 'prototype'].includes(k)
    && !d.get && !d.set && plain(d.value, depth + 1, seen));
  seen.delete(v); return ok;
}
// Small bounded JSON scanner: duplicate keys (including escaped equivalents),
// prototype keys, invalid grammar and non-finite numbers never reach handlers.
export function parseJSON(text, max = LIMITS.args) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > max) fail('JSON_SIZE');
  let i = 0, nodes = 0;
  const ws = () => { while (i < text.length && /[ \t\r\n]/.test(text[i])) i++; };
  const string = () => {
    const start = i++;
    while (i < text.length) { const c = text[i++]; if (c === '\\') i++; else if (c === '"') return JSON.parse(text.slice(start, i)); }
    fail('INVALID_JSON');
  };
  const value = depth => {
    if (depth > 20 || ++nodes > 20000) fail('JSON_COMPLEXITY'); ws();
    if (text[i] === '"') return string();
    if (text[i] === '{') {
      i++; ws(); const out = {}; const names = new Set();
      if (text[i] === '}') { i++; return out; }
      while (true) {
        ws(); if (text[i] !== '"') fail('INVALID_JSON'); const k = string();
        if (names.has(k) || ['__proto__', 'constructor', 'prototype'].includes(k)) fail('DUPLICATE_OR_UNSAFE_KEY');
        names.add(k); ws(); if (text[i++] !== ':') fail('INVALID_JSON'); out[k] = value(depth + 1); ws();
        if (text[i] === '}') { i++; return out; } if (text[i++] !== ',') fail('INVALID_JSON');
      }
    }
    if (text[i] === '[') {
      i++; ws(); const out = []; if (text[i] === ']') { i++; return out; }
      while (true) { out.push(value(depth + 1)); ws(); if (text[i] === ']') { i++; return out; } if (text[i++] !== ',') fail('INVALID_JSON'); }
    }
    const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!m) fail('INVALID_JSON'); i += m[0].length; const v = JSON.parse(m[0]);
    if (typeof v === 'number' && !Number.isFinite(v)) fail('NONFINITE_JSON'); return v;
  };
  try { const v = value(0); ws(); if (i !== text.length) fail('INVALID_JSON'); return v; }
  catch (e) { if (e.code) throw e; fail('INVALID_JSON'); }
}
export function validateCall(input) {
  const v = typeof input === 'string' ? parseJSON(input) : input;
  if (!plain(v) || Buffer.byteLength(stable(v)) > LIMITS.args
    || !exact(v, ['schema_version', 'tool', 'args']) || v.schema_version !== VERSION) fail('INVALID_CALL');
  if (!TOOLS.includes(v.tool)) fail('TOOL_FORBIDDEN');
  const a = v.args;
  if (!exact(a, TOOL_SCHEMAS[v.tool].required) || !CREW.some(c => c.id === a.crew_id)) fail('INVALID_ARGUMENTS');
  if (v.tool === 'get_open_risk_events') {
    if (!Number.isInteger(a.limit) || a.limit < 1 || a.limit > 20) fail('INVALID_ARGUMENTS');
  } else if (!Array.isArray(a.metrics) || a.metrics.length < 1 || a.metrics.length > 3
    || new Set(a.metrics).size !== a.metrics.length || a.metrics.some(m => !METRIC_NAMES.includes(m))) fail('INVALID_ARGUMENTS');
  return structuredClone(v);
}
export function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
