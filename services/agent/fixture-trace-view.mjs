// Presentation of ONE approved archive. No dispatcher, worker, application or database imports.
import { readdir } from 'node:fs/promises';
import { requirePermission } from '../../packages/contracts.mjs';
import { safeDirectory, childDirectory, readAt, MANIFEST_SHA } from './read-context.mjs';
import { recoverTrace, TRACE_ROOT } from './execution-trace.mjs';
import { exact, fail, freeze, parseJSON, sha, stable, TOOLS, VERSION, validateCall } from './read-contract.mjs';

export const APPROVED_TRACE = freeze({
  run_id:'9392250d-93a4-45d4-a871-0dd590190774', crew_id:'CREW-03',
  fixture_sha256:'7ee532bcf759f051ad0cd0f4932493770802e19df1b4dc67c052433f85da3774',
  files:{
    'trace.jsonl':{bytes:16696,sha256:'044440f5c1a7c04fe7501e24fba46b362e1dbfafbda98ac804972fd30e7e3c62'},
    'checkpoint.json':{bytes:133,sha256:'f4e1a57e72c4551b7292c7022e6d89f41981865ec7bd768ff7c65b6e59e74213'},
    'call-01.json':{bytes:3062,sha256:'aebd7d02f8a353941ce086ca411f3c4a0db518f5f26d3f9618583847d17c839d'},
    'call-02.json':{bytes:3388,sha256:'336357bb62be6630996ad2c4afea9fa849bc4fac9d023e1c6ad0412aa8483eb2'},
    'call-03.json':{bytes:2503,sha256:'9d1a1875deda837f89cde123a0126b43c27d5a1da29f1979376c63195b0c23ff'},
    'call-04.json':{bytes:1151,sha256:'b8d92eacde303364100529ba6773657b868d5751b053b3531971eea4d607adff'}
  }
});
const schema = 'astra.n16.fixture-trace-view.v1';
const check = (condition, code='TRACE_PRESENTATION_INVALID') => { if (!condition) fail(code); };
const same = (a,b) => stable(a) === stable(b);
const utc = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const scope = c => exact(c,['as_of','fixture_id','fixture_sha256','manifest_sha256','mission_id','policy','principal','scenario_run_id','view'])
  && c.fixture_id === 'elevated' && c.fixture_sha256 === APPROVED_TRACE.fixture_sha256 && c.manifest_sha256 === MANIFEST_SHA
  && c.mission_id === 'MARS-DEMO-01' && c.policy === 'n16-fixture-read-v1' && c.view === 'onboard'
  && c.as_of === '2026-11-14T11:00:00.000Z' && c.scenario_run_id === 'N16-FIXTURE-ELEVATED'
  && same(c.principal,{id:'n16-local-demo-admin',role:'demo_admin',crew_id:null,demo:true});

// Pure validation also permits deterministic corruption controls. Public reads ALWAYS pin original bytes first.
export function validateRecordedTrace(files) {
  check(same(Object.keys(files).sort(),Object.keys(APPROVED_TRACE.files).sort()));
  const text = files['trace.jsonl'].toString(); check(text.endsWith('\n'));
  const rows = text.slice(0,-1).split('\n').map(s => parseJSON(s,65536)); check(rows.length === 18);
  let previous = 'GENESIS', lastTime = -Infinity;
  for (const [i,r] of rows.entries()) {
    check(exact(r,['schema_version','run_id','seq','previous_hash','at','type','payload','hash']));
    const {hash,...body} = r;
    check(r.schema_version === 'astra.n16.execution-event.v1' && r.run_id === APPROVED_TRACE.run_id
      && r.seq === i+1 && r.previous_hash === previous && hash === sha(stable(body)) && utc(r.at)
      && Date.parse(r.at) >= lastTime);
    previous = hash; lastTime = Date.parse(r.at);
  }
  const checkpoint = parseJSON(files['checkpoint.json'].toString());
  check(exact(checkpoint,['run_id','seq','hash']) && checkpoint.run_id === APPROVED_TRACE.run_id && checkpoint.seq === 18 && checkpoint.hash === previous);
  check(rows[0].type === 'RUN_STARTED' && exact(rows[0].payload,['schema_version','context'])
    && rows[0].payload.schema_version === VERSION && scope(rows[0].payload.context));
  const context = rows[0].payload.context, calls = [];
  for (const [i,tool] of TOOLS.entries()) {
    const [request,validated,start,end] = rows.slice(1+i*4,5+i*4), callId = `call-0${i+1}`;
    check(same([request.type,validated.type,start.type,end.type],['CALL_REQUESTED','CALL_VALIDATED','CALL_STARTED','CALL_COMPLETED']));
    check(exact(request.payload,['call_id']) && request.payload.call_id === callId
      && exact(validated.payload,['call_id','tool','args','trusted_scope'])
      && same(validated.payload.trusted_scope,context) && exact(start.payload,['call_id','tool','args']));
    for (const r of [validated,start,end]) check(r.payload.call_id === callId && r.payload.tool === tool);
    const args = validateCall({schema_version:VERSION,tool,args:validated.payload.args}).args;
    check(args.crew_id === APPROVED_TRACE.crew_id && same(args,start.payload.args), 'TRACE_SCOPE_MISMATCH');
    check(same(args,tool === 'get_open_risk_events' ? {crew_id:APPROVED_TRACE.crew_id,limit:20}
      : {crew_id:APPROVED_TRACE.crew_id,metrics:['heart_rate','respiratory_rate','spo2']}));
    const p = end.payload, name = callId+'.json', raw = files[name];
    check(exact(p,['call_id','data_status','duration_ms','execution_status','freshness_quality','result','source','tool'])
      && exact(p.result,['file','bytes','sha256']) && p.result.file === name && p.result.bytes === raw.length && p.result.sha256 === sha(raw));
    const result = parseJSON(raw.toString(),65536);
    check(exact(result,['call_id','clinical_support','crew_id','data','data_status','duration_ms','execution_status','inference_performed',
      'mission_id','provenance','read_receipt','research_only','run_id','schema_version','synthetic','tool']));
    check(result.schema_version === 'astra.n16.read-result.v1' && result.run_id === APPROVED_TRACE.run_id
      && result.call_id === callId && result.tool === tool && result.crew_id === args.crew_id && result.mission_id === context.mission_id
      && result.synthetic === true && result.research_only === true && result.clinical_support === false && result.inference_performed === false
      && result.execution_status === 'COMPLETED' && p.execution_status === result.execution_status
      && p.data_status === result.data_status && p.duration_ms === result.duration_ms && Number.isFinite(result.duration_ms) && result.duration_ms >= 0);
    const source = result.provenance;
    check(exact(source,['adapter_version','as_of','clock','earth_receipt_reason','earth_received_at','fixture_id','fixture_sha256','scenario_id','scenario_run_id','view'])
      && source.adapter_version === VERSION && source.as_of === context.as_of && source.clock === 'mission_simulation'
      && source.earth_received_at === null && source.earth_receipt_reason === 'onboard_only' && source.fixture_id === context.fixture_id
      && source.fixture_sha256 === context.fixture_sha256 && source.scenario_id === 'n16-fixture-elevated'
      && source.scenario_run_id === context.scenario_run_id && source.view === context.view && same(source,p.source));
    check(exact(result.read_receipt,['actual_file_reads','bytes_read','fixture_sha256','thread_id'])
      && result.read_receipt.actual_file_reads === 1 && result.read_receipt.bytes_read === 27196
      && result.read_receipt.fixture_sha256 === context.fixture_sha256 && Number.isInteger(result.read_receipt.thread_id) && result.read_receipt.thread_id > 0);
    if (tool === 'get_open_risk_events') {
      check(result.data_status === 'UNKNOWN' && result.data.coverage === 'unknown' && result.data.record_origin === 'unavailable'
        && same(result.data.records,[]) && result.data.inference_performed === false && result.data.requested_limit === 20
        && typeof result.data.reason === 'string' && p.freshness_quality === null);
    } else {
      check(result.data_status === 'KNOWN' && Array.isArray(result.data.items) && result.data.items.length === 3
        && same(result.data.items.map(x=>x.metric),args.metrics));
      for (const item of result.data.items) {
        check(item.data_status === 'KNOWN');
        if (tool === 'get_personal_baseline') check(item.value?.method === 'authored_fixture_reference' && item.value.synthetic === true
          && item.value.count === null && item.value.window_days === null && item.provenance.synthetic === true);
        else check(item.provenance.freshness === 'fresh' && item.provenance.integrity === 'verified' && item.provenance.age_ms === 0
          && item.provenance.observed_at === context.as_of && item.provenance.received_ts === context.as_of
          && item.provenance.source.kind === 'simulator' && item.provenance.source_provenance.synthetic === true
          && item.provenance.quality.status === 'good' && item.provenance.quality.artifact === false);
      }
      check(same(p.freshness_quality,result.data.items.map(x=>({metric:x.metric,data_status:x.data_status,provenance:x.provenance}))));
    }
    calls.push({call_id:callId,tool,execution_status:result.execution_status,data_status:result.data_status,
      started_at:start.at,ended_at:end.at,duration_ms:result.duration_ms,args,result});
  }
  check(rows[17].type === 'RUN_ENDED' && same(rows[17].payload,{calls:4,status:'COMPLETED'}));
  return {schema_version:schema,status:'AVAILABLE',synthetic:true,archived:true,generated_by_llm:false,
    run_id:APPROVED_TRACE.run_id,crew_id:APPROVED_TRACE.crew_id,recorded_scope:context,
    started_at:rows[0].at,ended_at:rows[17].at,source_as_of:context.as_of,
    recovery:{status:'COMPLETE',committed_events:18,replayed_calls:0},
    artifact_hashes:APPROVED_TRACE.files,calls,
    timeline:rows.map(r=>({seq:r.seq,at:r.at,type:r.type,call_id:r.payload.call_id ?? null,hash:r.hash}))};
}

export async function readFixtureTrace(identity, {root=TRACE_ROOT} = {}) {
  // Trusted session only; denial happens BEFORE any file is opened. Root is a trusted QA seam, never a request argument.
  requirePermission(identity,'read',APPROVED_TRACE.crew_id);
  let parent, dir;
  try {
    parent = await safeDirectory(root); dir = await childDirectory(parent,APPROVED_TRACE.run_id);
    check(same((await readdir(`/proc/self/fd/${dir.fd}`)).sort(),Object.keys(APPROVED_TRACE.files).sort()));
    const files = {};
    for (const [name,pin] of Object.entries(APPROVED_TRACE.files)) {
      const bytes = await readAt(dir.fd,name,pin.bytes); check(bytes.length === pin.bytes && sha(bytes) === pin.sha256,'UNVERIFIED_TRACE_ARTIFACT'); files[name] = bytes;
    }
    const view = validateRecordedTrace(files);
    // Existing N16-01 recovery semantics are retained. Compare against the already pinned bytes to reject replacement races.
    const recovered = await recoverTrace(APPROVED_TRACE.run_id,{root});
    check(recovered.status === 'COMPLETE' && recovered.workflow_outcome === 'COMPLETED' && recovered.committed_events === 18
      && recovered.executed_calls.length === 4 && recovered.not_started_calls.length === 0 && recovered.replayed_calls === 0
      && !recovered.uncommitted_tail && recovered.executed_calls.every((c,i)=>same(c.result,view.calls[i].result)));
    return view;
  } catch {
    return {schema_version:schema,status:'UNAVAILABLE',synthetic:true,archived:true,
      reason:'Recorded fixture evidence is unavailable, incomplete or unverified.',calls:[]};
  } finally { try { if (dir) await dir.close(); } finally { if (parent) await parent.close(); } }
}

// Pure route adapter: no Store/Engine construction, database, dispatcher or writes.
export async function fixtureTraceResponse(method, search, identity) {
  if (method !== 'GET' || search !== '') return {status:400,body:{status:'UNAVAILABLE',calls:[],reason:'Only the fixed read-only fixture trace is supported.'}};
  const body = await readFixtureTrace(identity); return {status:200,body};
}
