import { escape as esc } from './ui.mjs';

const names = ['get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events'];
const execution = ['COMPLETED','FAILED','CANCELLED','TIMEOUT','DENIED'];
const data = ['KNOWN','PARTIAL','UNKNOWN'];
const header = '<div class="eyebrow">SYNTHETIC / FIXTURE DEMO · ARCHIVED</div><h2 id="fixture-trace-heading">Recorded read-only tool execution</h2><p>Saved N16-01 fixture reads. No tools run when this panel opens. No LLM selected or executed these tools. Separate from operational cases, N02 alerts and Earth delivery.</p>';
const unavailable = '<p role="status" aria-live="polite" aria-atomic="true"><strong>UNAVAILABLE</strong> · Recorded fixture evidence could not be verified for this session. No execution or data values are presented.</p>';
const tag = (label,value) => `<span class="tag">${label}: ${esc(value)}</span>`;
const json = value => esc(JSON.stringify(value,null,2));
function validView(v) {
  return v?.schema_version === 'astra.n16.fixture-trace-view.v1' && v.status === 'AVAILABLE'
    && v.synthetic === true && v.archived === true && v.generated_by_llm === false
    && v.run_id === '9392250d-93a4-45d4-a871-0dd590190774' && v.crew_id === 'CREW-03'
    && v.recovery?.status === 'COMPLETE' && v.recovery.committed_events === 18 && v.recovery.replayed_calls === 0
    && Array.isArray(v.timeline) && v.timeline.length === 18 && Array.isArray(v.calls) && v.calls.length === 4
    && v.recorded_scope?.fixture_sha256 === '7ee532bcf759f051ad0cd0f4932493770802e19df1b4dc67c052433f85da3774'
    && v.recorded_scope.view === 'onboard' && v.source_as_of === '2026-11-14T11:00:00.000Z'
    && v.calls.every((c,i)=>c.tool === names[i] && c.call_id === `call-0${i+1}` && execution.includes(c.execution_status)
      && data.includes(c.data_status) && c.result?.crew_id === v.crew_id && c.result?.synthetic === true
      && c.result?.execution_status === c.execution_status && c.result?.data_status === c.data_status
      && Number.isFinite(c.duration_ms) && c.duration_ms >= 0
      && (c.execution_status !== 'COMPLETED' || (i === 3 ? c.data_status === 'UNKNOWN' && c.result.data?.records?.length === 0
        : Array.isArray(c.result.data?.items) && c.result.data.items.length === 3)));
}
function summary(c) {
  if (c.execution_status !== 'COMPLETED') return 'No completed result is available for this recorded call.';
  if (c.tool === 'get_open_risk_events') return 'UNKNOWN: no verified N02 risk record supplied; coverage unknown. No alert or all-clear is inferred.';
  const items = c.result.data?.items ?? [];
  if (c.tool === 'get_current_vitals') return items.map(i=>`${i.metric}: ${i.data_status === 'KNOWN' ? i.value+' '+i.unit : 'UNKNOWN'}`).join(' · ');
  if (c.tool === 'get_data_quality') return items.map(i=>`${i.metric}: ${i.quality?.status ?? 'UNKNOWN'}, ${i.freshness ?? 'UNKNOWN'} at recorded mission time`).join(' · ');
  return items.map(i=>`${i.metric}: authored reference center ${i.value?.center ?? 'UNKNOWN'} ${i.unit}`).join(' · ')+'. Not a learned personal baseline archive.';
}
export function renderFixtureTrace(view) {
  if (!validView(view)) return header+unavailable;
  return header+`<p role="status" aria-live="polite" aria-atomic="true"><strong>VERIFIED ARCHIVE</strong> · Four recorded calls · recovery COMPLETE · replayed calls: 0</p>
    <dl class="fixture-trace-meta"><dt>Verified crew scope</dt><dd>${esc(view.crew_id)} · onboard fixture only</dd>
    <dt>Saved execution (host UTC)</dt><dd>${esc(view.started_at)} to ${esc(view.ended_at)}</dd>
    <dt>Recorded mission as_of</dt><dd>${esc(view.source_as_of)} · fixed simulation clock; not current telemetry</dd>
    <dt>Earth reception</dt><dd>Not recorded · onboard archive; not delivered Earth evidence</dd>
    <dt>Run ID</dt><dd>${esc(view.run_id)}</dd>
    <dt>Fixture SHA-256</dt><dd>${esc(view.recorded_scope.fixture_sha256)}</dd></dl>
    <ol class="fixture-trace-calls">${view.calls.map(c=>`<li><article aria-labelledby="fixture-${esc(c.call_id)}"><h3 id="fixture-${esc(c.call_id)}">${esc(c.tool)}</h3>
      <p>${tag('Execution',c.execution_status)} ${tag('Data',c.data_status)}</p><p>${esc(summary(c))}</p>
      <p class="evidence-foot">Recorded start ${esc(c.started_at)} · end ${esc(c.ended_at)} · ${esc(c.duration_ms.toFixed(3))} ms</p>
      <details><summary>Inspect ${esc(c.tool)} result and provenance</summary><pre tabindex="0" role="region" aria-label="${esc(c.tool)} recorded provenance">${json({validated_arguments:c.args,result:c.result})}</pre></details></article></li>`).join('')}</ol>
    <details><summary>Inspect committed event order and archive hashes</summary><pre tabindex="0" role="region" aria-label="Recorded trace order and hashes">${json({recorded_scope:view.recorded_scope,recovery:view.recovery,artifact_hashes:view.artifact_hashes,timeline:view.timeline})}</pre></details>
    <p class="evidence-foot">Freshness and quality describe the saved mission as_of only. KNOWN means available fixture data, not clinical truth. Authored baselines, UNKNOWN risk coverage, and existing review gates remain unchanged.</p>`;
}
export async function mountFixtureTrace(element, {request,isCurrent=()=>true}) {
  element.innerHTML = header+'<p role="status" aria-live="polite" aria-atomic="true">Checking saved fixture evidence…</p>';
  try {
    const view = await request();
    if (element.isConnected && isCurrent()) element.innerHTML = renderFixtureTrace(view);
  } catch {
    if (element.isConnected && isCurrent()) element.innerHTML = header+unavailable;
  }
}
