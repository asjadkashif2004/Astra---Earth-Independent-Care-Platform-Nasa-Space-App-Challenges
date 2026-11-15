import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Store, hash } from './store.mjs';
import { Engine } from './engine.mjs';
import { createSession, getIdentity, checkServiceToken } from './auth.mjs';
import { AppError, CREW, METRICS, MISSION_ID, SCENARIOS, ROLES, PERMISSIONS, MODEL_VERSION, requirePermission, finiteNumber } from '../../packages/contracts.mjs';
import { retrieve, SOURCES, DATASETS, KNOWLEDGE_STATUS, refreshSources } from '../rag/retrieval.mjs';
import { fixtureTraceResponse } from '../agent/fixture-trace-view.mjs';
import { append as appendN10,legacyConsent } from '../n10/ledger.mjs';
import { project as projectN10 } from '../n10/projection.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const WEB = resolve(ROOT, 'apps/mission-control-web');
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const headers = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
function json(res, status, value, extra = {}) { res.writeHead(status, { ...headers, 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...extra }); res.end(JSON.stringify(value)); }
async function body(req) {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw new AppError(415, 'JSON_REQUIRED', 'Use application/json.');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 256_000) throw new AppError(413, 'BODY_TOO_LARGE', 'Request exceeds 256 KB.'); chunks.push(chunk); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new AppError(400, 'INVALID_JSON', 'Request must contain a JSON object.'); }
}
function scoped(snapshot, identity) {
  const s = structuredClone(snapshot);
  if (identity.role === 'astronaut') {
    const filter = arr => arr.filter(v => v.crew_id === identity.crew_id || v.id === identity.crew_id);
    s.crew = filter(s.crew); s.alerts = filter(s.alerts); s.cases = filter(s.cases);
    if (s.ground) { s.ground.crew = filter(s.ground.crew); s.ground.alerts = filter(s.ground.alerts); }
    if (s.scenario.demo?.target_crew_id !== identity.crew_id) s.scenario.demo = null;
  }
  if (!PERMISSIONS[identity.role]?.includes('case')) { s.cases = []; }
  return s;
}
const MODEL_CARDS = [
  { id: MODEL_VERSION, name: 'Personalized robust baseline', kind: 'deterministic statistics', inputs: 'Median/MAD from 720 synthetic calibration observations per metric, quality, activity, observation-time single/multisignal persistence and rate of change. See docs/N02_CONTRACTS.md.', output: 'Deviation evidence and review priority; never diagnosis.', limitations: 'Synthetic-only regression. Heuristic evidence strength is not a probability. No clinical thresholds or validation.' },
  { id: 'linear-trend-v2', name: 'Short-horizon linear trend', kind: 'synthetic-calibrated exploratory regression', inputs: 'Last 60 reliable chronological observations; minimum 12 points / 5 minutes. Separate nominal synthetic interval calibration.', output: '30-minute projection with a nominal synthetic calibration band.', limitations: 'Coverage is scoped to the fictional nominal generator, not deteriorating scenarios or real physiology. No disease prediction.' },
  { id: 'curated-lexical-v1', name: 'Onboard source retrieval', kind: 'lexical retrieval; no LLM', inputs: 'Ten checked source summaries, versioned and SHA-256 hashed.', output: 'Matched paraphrases with citations, or abstention.', limitations: 'Small thematic corpus. Not a protocol manual or semantic medical question-answering model.' },
];

export function createApp({ dbPath = ':memory:', speed = 30, autoTick = true, demo = true, ingestToken = '', clock = Date.now, caseBuilder = null, enrichmentRunner = null } = {}) {
  const store = new Store(dbPath); const engine = new Engine(store, { speed, clock, caseBuilder, enrichmentRunner });
  let knowledgeReady = false;
  const syncKnowledge = () => {
    try {
      if (!KNOWLEDGE_STATUS.ready && !refreshSources()) throw new Error('Knowledge unavailable');
      store.transaction(() => {
        for (const doc of SOURCES) {
          store.put('knowledge_documents', doc.id, doc);
          store.put('knowledge_chunks', `${doc.id}-summary`, { id: `${doc.id}-summary`, document_id: doc.id, section: doc.section, text: doc.summary, sha256: doc.sha256 });
        }
      }); knowledgeReady = true;
    } catch { knowledgeReady = false; }
  };
  syncKnowledge();
  const clients = new Set(); const rates = new Map();
  const broadcast = () => {
    for (const client of clients) {
      if (!getIdentity(store, client.cookie)) { client.res.end(); clients.delete(client); continue; }
      if (client.res.writableLength > 256_000) { client.res.destroy(); clients.delete(client); continue; }
      client.res.write(`event: snapshot\ndata: ${JSON.stringify(scoped(engine.snapshot(), client.identity))}\n\n`);
    }
  };
  const enrich = () => engine.enrichPending().then(() => { if (!engine.closed) broadcast(); }).catch(() => {});
  const runTick = () => {
    const failures = engine.monitor.failures;
    try { engine.tick(); }
    catch { if (engine.monitor.failures === failures) engine.monitor.failure(); return false; }
    try { broadcast(); } catch { /* Stream failures cannot stop the monitoring timer. */ }
    if (!knowledgeReady) syncKnowledge(); void enrich(); return true;
  };
  const timer = autoTick ? setInterval(runTick, 1000) : null;
  timer?.unref();
  if (autoTick) void enrich(); // Recover due durable work after restart, independent of telemetry.
  const handleRequest = async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost'); const path = url.pathname;
      let hostname;
      try { hostname = new URL(`http://${req.headers.host ?? ''}`).hostname; } catch { hostname = ''; }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) throw new AppError(421, 'HOST_REJECTED', 'This local simulation accepts only loopback hostnames.');
      if (req.method !== 'GET' && req.method !== 'POST') throw new AppError(405, 'METHOD_NOT_ALLOWED', 'Only GET and POST are supported.');
      if (!path.startsWith('/v1/')) {
        if (req.method !== 'GET') throw new AppError(405, 'METHOD_NOT_ALLOWED', 'Static resources are read only.');
        const relative = path === '/' ? 'index.html' : decodeURIComponent(path).slice(1);
        const base = path.startsWith('/shared/') ? resolve(ROOT, 'packages') : WEB;
        const file = resolve(base, path.startsWith('/shared/') ? relative.slice(7) : relative);
        if (!file.startsWith(base + sep) || relative.includes('..') || relative.startsWith('.')) throw new AppError(404, 'NOT_FOUND', 'File not found.');
        const info = await stat(file).catch(() => null); if (!info?.isFile() || !MIME[extname(file)]) throw new AppError(404, 'NOT_FOUND', 'File not found.');
        res.writeHead(200, { ...headers, 'Content-Type': MIME[extname(file)], 'Cache-Control': 'no-cache' }); res.end(await readFile(file)); return;
      }
      const rateKey = req.socket.remoteAddress ?? 'local'; const now = Date.now();
      if (rates.size > 1000) rates.clear();
      const budget = rates.get(rateKey) ?? { reset: now + 60_000, n: 0 };
      if (now > budget.reset) { budget.reset = now + 60_000; budget.n = 0; }
      budget.n++; rates.set(rateKey, budget);
      if (budget.n > 240) throw new AppError(429, 'RATE_LIMIT', 'Local request limit exceeded.');
      if (req.method === 'POST' && req.headers.origin !== undefined) {
        let origin;
        try { origin = new URL(req.headers.origin); } catch { throw new AppError(400, 'INVALID_ORIGIN', 'Origin must be a serialized HTTP origin.'); }
        if (origin.origin !== req.headers.origin || origin.username || origin.password) throw new AppError(400, 'INVALID_ORIGIN', 'Origin must not contain credentials, paths or query parameters.');
        if (origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) throw new AppError(403, 'ORIGIN_REJECTED', 'Cross-origin writes are not allowed.');
      }
      if (req.method === 'GET' && path === '/v1/health') {
        const health = engine.monitor.report(store, { automatic: autoTick, enrichmentFault: engine.enrichmentFault, knowledgeReady: knowledgeReady && KNOWLEDGE_STATUS.ready });
        json(res, health.ready ? 200 : 503, health); return;
      }
      if (req.method === 'GET' && path === '/v1/auth/config') { json(res, 200, { demo, roles: demo ? ROLES : [] }); return; }
      if (req.method === 'POST' && path === '/v1/auth/demo') {
        if (!demo) throw new AppError(403, 'DEMO_DISABLED', 'Local demo identity selection is disabled.');
        const b = await body(req); const session = createSession(store, b.role ?? 'demo_admin');
        json(res, 200, { identity: session.identity, expires_at: session.expires }, { 'Set-Cookie': `astra_session=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200` }); return;
      }
      const identity = getIdentity(store, req.headers.cookie);
      if (req.method === 'POST' && path === '/v1/ingest/telemetry') {
        checkServiceToken(req.headers.authorization, ingestToken); const b = await body(req);
        const events = b.events; if (!Array.isArray(events) || !events.length || events.length > 120) throw new AppError(422, 'INVALID_BATCH', 'Supply 1–120 events.');
        const count = engine.ingest(events); broadcast(); void enrich(); json(res, 201, { accepted: count }); return;
      }
      if (!identity) throw new AppError(401, 'UNAUTHENTICATED', 'Enter the local demo to access mission records.');
      if (req.method === 'GET' && path === '/v1/auth/me') { json(res, 200, identity); return; }
      if (req.method === 'POST' && path === '/v1/auth/logout') {
        const token = /astra_session=([a-f0-9]{64})/.exec(req.headers.cookie ?? '')?.[1];
        if (token) store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
        store.audit(identity.id, 'auth.logout', identity.id); json(res, 200, { ok: true }, { 'Set-Cookie': 'astra_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); return;
      }
      let match;
      if((match=/^\/v1\/n10\/crew\/(CREW-\d{2})(?:\/(records))?$/.exec(path))){
        if(!demo)throw new AppError(403,'N10_DEMO_ONLY','N10 is available only in the fictional local demonstration.');
        const crew=match[1];
        if(req.method==='POST'&&match[2]==='records'){
          const result=appendN10(store,identity,crew,await body(req),engine.state.now);
          json(res,result.idempotent?200:201,result);return;
        }
        if(req.method==='GET'&&!match[2]){
          if([...url.searchParams.keys()].some(k=>!['day','before','days'].includes(k)))throw new AppError(422,'N10_QUERY','Unknown N10 query option.');
          const before=url.searchParams.get('before')??new Date(engine.state.now).toISOString();
          json(res,200,projectN10(store,identity,crew,{date:url.searchParams.get('day')??before.slice(0,10),before,days:Number(url.searchParams.get('days')??7)},engine.state.now));return;
        }
        throw new AppError(405,'N10_METHOD','Unsupported N10 operation.');
      }
      if (req.method === 'GET' && path === '/v1/state') { requirePermission(identity, 'read'); json(res, 200, scoped(engine.snapshot(), identity)); return; }
      if (req.method === 'GET' && path === `/v1/stream/missions/${MISSION_ID}`) {
        requirePermission(identity, 'read'); if (clients.size >= 20) throw new AppError(503, 'STREAM_CAPACITY', 'Maximum of 20 local dashboards.');
        res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
        res.write(`event: snapshot\ndata: ${JSON.stringify(scoped(engine.snapshot(), identity))}\n\n`);
        const client = { res, identity, cookie: req.headers.cookie }; clients.add(client); req.on('close', () => clients.delete(client)); return;
      }
      if (req.method === 'GET' && path === '/v1/missions') { requirePermission(identity, 'read'); json(res, 200, [engine.snapshot().mission]); return; }
      if (req.method === 'GET' && path === `/v1/missions/${MISSION_ID}/crew`) { requirePermission(identity, 'read'); json(res, 200, scoped(engine.snapshot(), identity).crew); return; }
      if (req.method === 'GET' && (match = /^\/v1\/crew\/(CREW-\d{2})(?:\/(telemetry|predictions|checkins|sleep-sessions))?$/.exec(path))) {
        requirePermission(identity, 'read', match[1]); const c = engine.state.crew.find(c => c.id === match[1]); if (!c) throw new AppError(404, 'NOT_FOUND', 'Unknown crew.');
        if (match[2] === 'checkins') requirePermission(identity, identity.role === 'demo_admin' ? 'checkin_read_own' : 'checkin_read', match[1]);
        const limit = Math.trunc(finiteNumber(Number(url.searchParams.get('limit') ?? 180), 1, 1000, 'limit'));
        let sleepBefore='9999';if(match[2]==='sleep-sessions'&&url.searchParams.has('before')){const at=Date.parse(url.searchParams.get('before'));if(!Number.isFinite(at))throw new AppError(422,'INVALID_BEFORE','Supply a valid sleep knowledge-time cutoff.');sleepBefore=new Date(at).toISOString();}
        const result = match[2] === 'sleep-sessions' ? store.sleepHistory(c.id,limit,sleepBefore) : match[2] === 'telemetry' ? store.history(c.id, limit, url.searchParams.get('before') ?? '9999')
          : match[2] === 'predictions' ? engine.predictions(c.id) : match[2] === 'checkins' ? store.checkins(c.id, limit, identity.role === 'demo_admin' ? identity.id : null) : c;
        json(res, 200, result); return;
      }
      if (req.method === 'GET' && path === '/v1/alerts') { requirePermission(identity, 'read'); json(res, 200, scoped(engine.snapshot(), identity).alerts); return; }
      if (req.method === 'POST' && (match = /^\/v1\/alerts\/([\w-]+)\/ack$/.exec(path))) {
        const risk = store.record('risk_events', match[1]); if (!risk) throw new AppError(404, 'NOT_FOUND', 'Alert not found.');
        requirePermission(identity, 'ack', risk.crew_id); const result = engine.acknowledge(risk.id, identity); broadcast(); json(res, 200, result); return;
      }
      if (req.method === 'GET' && path === '/v1/scenarios') { requirePermission(identity, 'read'); json(res, 200, SCENARIOS); return; }
      if (req.method === 'POST' && (match = /^\/v1\/scenarios\/([\w-]+)\/(start|stop)$/.exec(path))) {
        requirePermission(identity, 'scenario');
        if (identity.role !== 'demo_admin') throw new AppError(403, 'FORBIDDEN', 'Only the Demo administrator controls synthetic scenario runs.');
        if(!SCENARIOS.some(s=>s.id===match[1]))throw new AppError(404,'UNKNOWN_SCENARIO','Unknown scenario.');
        const stopping=match[2]==='stop';
        if(stopping&&engine.state.scenario!==match[1])throw new AppError(409,'SCENARIO_NOT_ACTIVE','Only the currently active scenario can be stopped. Refresh the scenario state.');
        const b=await body(req),demoStart=!stopping&&match[1]==='controlled-hr-rise';
        if (Object.keys(b).some(k=>!['seed',...(demoStart?['target_crew_id']:[])].includes(k))) throw new AppError(422,'INVALID_SCENARIO_INPUT','Only the approved seed and selected demo target are accepted.');
        const suppliedSeed=finiteNumber(b.seed??(stopping?engine.state.seed:42017),0,2**31-1,'seed');
        if(demoStart&&!Number.isInteger(suppliedSeed))throw new AppError(422,'INVALID_DEMO_SEED','Use an integer seed.');
        const run=engine.startScenario(stopping?'nominal':match[1],Math.trunc(suppliedSeed),identity.id,{target_crew_id:b.target_crew_id,advance:true});broadcast();json(res,stopping?200:201,run);return;
      }
      if (req.method === 'POST' && path === '/v1/rag/query') {
        requirePermission(identity, 'rag'); const b = await body(req);
        if (typeof b.query !== 'string' || !b.query.trim() || b.query.length > 1200) throw new AppError(422, 'INVALID_QUERY', 'Question must contain 1–1200 characters.');
        let answer;
        try { answer = retrieve(b.query); knowledgeReady = KNOWLEDGE_STATUS.ready; }
        catch { knowledgeReady = false; throw new AppError(503, 'KNOWLEDGE_UNAVAILABLE', 'Local knowledge is unavailable. Monitoring continues; consult a qualified reviewer.'); }
        json(res, 200, answer); return;
      }
      if (req.method === 'GET' && path === '/v1/provenance') { requirePermission(identity, 'read'); json(res, 200, { sources: SOURCES, datasets: DATASETS, metrics: METRICS, synthetic: true, telemetry_source: 'Seeded simulator and service-authenticated synthetic imports; metric_observations retain each accepted source and generator version.', baseline: '720 synthetic calibration observations per metric / crew across a 30-day window' }); return; }
      if (path === '/v1/agent/fixture-trace') {
        const result = await fixtureTraceResponse(req.method, url.search, identity); json(res, result.status, result.body); return;
      }
      if (req.method === 'GET' && path === '/v1/agent/cases') { requirePermission(identity, 'case'); json(res, 200, scoped(engine.snapshot(), identity).cases); return; }
      if (req.method === 'POST' && path === '/v1/agent/cases') {
        requirePermission(identity, 'case'); const b = await body(req); const risk = store.record('risk_events', b.risk_event_id ?? '');
        if (!risk) throw new AppError(422, 'DETECTOR_EVENT_REQUIRED', 'An existing detector event is required.');
        requirePermission(identity, 'case', risk.crew_id); const c = store.record('agent_cases', `CASE-${risk.id}`);
        if (!c) { json(res, 202, { risk_event_id: risk.id, case: null, enrichment: store.record('enrichment_jobs', risk.id) }); return; }
        json(res, 200, c); return;
      }
      if (req.method === 'GET' && (match = /^\/v1\/agent\/cases\/([\w-]+)$/.exec(path))) {
        const c = store.record('agent_cases', match[1]); if (!c) throw new AppError(404, 'NOT_FOUND', 'Case not found.'); requirePermission(identity, 'case', c.crew_id); json(res, 200, c); return;
      }
      if (req.method === 'GET' && path === '/v1/comms/queue') {
        requirePermission(identity, 'message'); const messages = store.list('comms_messages', 1000).filter(m => m.kind === 'case' && (identity.role !== 'astronaut' || m.payload.crew_id === identity.crew_id));
        json(res, 200, { config: engine.comms.summary(), messages }); return;
      }
      if (req.method === 'POST' && path === '/v1/comms/messages') {
        requirePermission(identity, 'message'); const b = await body(req); const c = store.record('agent_cases', b.case_id ?? '');
        if (!c?.human_ack) throw new AppError(409, 'HUMAN_ACK_REQUIRED', 'Only an acknowledged case can be queued.');
        requirePermission(identity, 'message', c.crew_id); const message = engine.comms.enqueue(c, engine.state.now, { id: `report-${c.id}` });
        store.audit(identity.id, 'message.queued', message.id, { crew_id: c.crew_id }); json(res, 201, message); return;
      }
      if (req.method === 'POST' && path === '/v1/comms/control') {
        requirePermission(identity, 'comms'); const b = await body(req); const patch = {};
        for (const [key, min, max] of [['one_way_latency_ms', 0, 1_320_000], ['jitter_ms', 0, 60_000], ['bandwidth_kbps', 1, 100_000], ['loss', 0, 1]]) if (key in b) patch[key] = finiteNumber(b[key], min, max, key);
        if ('blackout' in b) { if (typeof b.blackout !== 'boolean') throw new AppError(422, 'INVALID_INPUT', 'blackout must be boolean.'); patch.blackout = b.blackout; }
        const result = engine.comms.control(patch, engine.state.now); store.audit(identity.id, 'comms.changed', MISSION_ID, patch); engine.checkpoint(); broadcast(); json(res, 200, result); return;
      }
      if (req.method === 'POST' && path === '/v1/checkins') {
        const b = await body(req); requirePermission(identity, 'checkin', b.crew_id);
        legacyConsent(store,identity,b.crew_id,b);
        if (!CREW.some(c => c.id === b.crew_id)) throw new AppError(422, 'UNKNOWN_CREW', 'Unknown crew.');
        finiteNumber(b.fatigue, 0, 10, 'fatigue');
        if (!Array.isArray(b.reaction_ms) || b.reaction_ms.length < 3 || b.reaction_ms.length > 10) throw new AppError(422, 'INVALID_REACTION', 'Record 3–10 measured reaction trials.');
        b.reaction_ms.forEach(t => finiteNumber(t, 100, 3000, 'reaction trial'));
        const c = { id: randomId(), crew_id: b.crew_id, fatigue: b.fatigue, reaction_ms: b.reaction_ms, mean_reaction_ms: b.reaction_ms.reduce((s, v) => s + v, 0) / b.reaction_ms.length, ts: new Date(engine.state.now).toISOString(), actor: identity.id, source: 'user_checkin', synthetic: false, interpretation: 'Personal task measurement; browser timing is approximate. No cognitive diagnosis.' };
        store.put('checkins', c.id, c); store.audit(identity.id, 'checkin.created', c.id, { crew_id: c.crew_id }); json(res, 201, c); return;
      }
      if (req.method === 'GET' && path === '/v1/models') { requirePermission(identity, 'models'); json(res, 200, MODEL_CARDS); return; }
      if (req.method === 'GET' && path === '/v1/audit') {
        if (identity.role === 'astronaut') { requirePermission(identity, 'audit_self'); json(res, 200, { chain_valid: store.verifyAudit(), events: store.audits().filter(e => e.actor === identity.id || JSON.parse(e.json).crew_id === identity.crew_id) }); }
        else if (identity.role === 'mission_control') { requirePermission(identity, 'audit_limited'); json(res, 200, { chain_valid: store.verifyAudit(), events: store.audits().filter(e => /alert|message|risk/.test(e.action)) }); }
        else { requirePermission(identity, 'audit'); json(res, 200, { chain_valid: store.verifyAudit(), events: store.audits() }); } return;
      }
      if (req.method === 'GET' && (match = /^\/v1\/reports\/([\w-]+)$/.exec(path))) {
        const c = store.record('agent_cases', match[1]); if (!c) throw new AppError(404, 'NOT_FOUND', 'Case not found.'); requirePermission(identity, 'export', c.crew_id);
        const risk = store.record('risk_events', c.risk_event_id); store.audit(identity.id, 'report.exported', c.id, { crew_id: c.crew_id });
        json(res, 200, { title: 'ASTRA research simulation report', notice: 'Not a medical device. Not NASA-certified. All telemetry synthetic; any voluntary check-in is labeled separately.', case: c, risk, generated_at: new Date().toISOString() }, { 'Content-Disposition': `attachment; filename="${c.id}.json"` }); return;
      }
      if (req.method === 'GET' && path === '/v1/openapi.json') {
        requirePermission(identity, 'read'); json(res, 200, openapi()); return;
      }
      if (/waveforms/.test(path)) throw new AppError(501, 'WAVEFORM_EXTENSION', 'Public waveform acquisition and binary replay are tracked in docs/REQUIREMENTS.md R08/R16/R36.');
      throw new AppError(404, 'NOT_FOUND', 'Endpoint not found.');
    } catch (e) {
      if (res.headersSent) { res.end(); return; }
      if (!(e instanceof AppError)) console.error('Request failed:', e.message);
      json(res, e.status ?? 500, { error: { code: e.code ?? 'INTERNAL_ERROR', message: e instanceof AppError ? e.message : 'The local service could not complete this request.' } });
    }
  };
  const server = createServer(handleRequest);
  const close = async () => { clearInterval(timer); for (const c of clients) c.res.end(); clients.clear(); await engine.close(); engine.checkpoint(); await new Promise(resolve => server.listening ? server.close(resolve) : resolve()); store.close(); };
  return { server, store, engine, broadcast, close, handleRequest, runTick };
}
function randomId() { return `CHECK-${hash([Date.now(), Math.random()]).slice(0, 16)}`; }
function openapi() {
  const routes = [
    ['get','/v1/crew/{id}/sleep-sessions','Completed synthetic sleep records and immutable revisions; before filters knowledge time'],
    ['get', '/v1/health', 'Public readiness'], ['get', '/v1/state', 'Role-scoped mission state'], ['get', '/v1/missions', 'Missions'], ['get', '/v1/missions/{id}/crew', 'Crew'], ['get', '/v1/crew/{id}', 'Crew profile'], ['get', '/v1/crew/{id}/telemetry', 'Historical snapshots'],
    ['get', '/v1/stream/missions/{id}', 'Authenticated SSE snapshots'], ['post', '/v1/ingest/telemetry', 'Service-token synthetic ingest'], ['get', '/v1/alerts', 'Risk events'], ['post', '/v1/alerts/{id}/ack', 'Human acknowledgement'],
    ['post', '/v1/scenarios/{id}/start', 'Start scenario'], ['post', '/v1/scenarios/{id}/stop', 'Stop scenario'], ['post', '/v1/rag/query', 'Cited local retrieval'], ['post', '/v1/agent/cases', 'Get existing evidence case'], ['get', '/v1/agent/cases/{id}', 'Case detail'],
    ['post', '/v1/comms/messages', 'Queue acknowledged case'], ['get', '/v1/comms/queue', 'Queue history'], ['post', '/v1/comms/control', 'Delay/blackout controls'], ['get', '/v1/provenance', 'Source manifest'], ['get', '/v1/models', 'Model cards'], ['get', '/v1/audit', 'Role-scoped audit'],
    ['post', '/v1/checkins', 'Voluntary check-in'], ['get', '/v1/crew/{id}/predictions', 'Exploratory forecasts'], ['get', '/v1/reports/{id}', 'Synthetic case export'],
  ];
  const paths = {}; for (const [method, path, summary] of routes) (paths[path] ??= {})[method] = { summary, responses: { 200: { description: 'Successful response; see ARCHITECTURE.md for domain schema' }, 403: { description: 'Role denied' } } };
  return { openapi: '3.1.0', info: { title: 'ASTRA local API route catalogue', version: '0.1.0', description: 'Route catalogue; request/response schema expansion is tracked.' }, paths };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST ?? '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('The local role-selecting demo must bind to loopback. Deploy behind real authentication before allowing remote access.');
  const port = Number(process.env.PORT ?? 3000); const speed = Number(process.env.ASTRA_SPEED ?? 30);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isFinite(speed) || speed < 1 || speed > 3600) throw new Error('Invalid PORT or ASTRA_SPEED.');
  const app = createApp({ dbPath: process.env.ASTRA_DB ?? resolve(ROOT, 'data/runtime/astra.sqlite'), speed, demo: process.env.ASTRA_DEMO !== 'false', ingestToken: process.env.ASTRA_INGEST_TOKEN ?? '' });
  app.server.once('error', async error => {
    console.error(`ASTRA could not open its local listener (${error.code}). Run npm start in a normal terminal with loopback networking enabled.`);
    await app.close(); process.exitCode = 1;
  });
  app.server.listen(port, host, () => console.log(`ASTRA Command — http://localhost:${port}\nLocal synthetic research demo · ${speed}× mission clock · no external services required`));
  let closing = false; for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { if (!closing) { closing = true; await app.close(); process.exit(0); } });
}
