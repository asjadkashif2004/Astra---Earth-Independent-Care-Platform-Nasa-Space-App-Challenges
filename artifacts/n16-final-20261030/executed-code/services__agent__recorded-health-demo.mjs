// Deterministic reproduction of verified synthetic records, never a medical inference.
import { masterCall,projectMaster,ORDER } from './master-contract.mjs';
import { expectedRows,SOURCE_ID,SOURCE_SHA,AS_OF } from './designated-contract.mjs';
import { stable,sha } from './read-contract.mjs';
import { singleCheck as check } from './single-select-contract.mjs';

const escape=v=>String(v??'UNKNOWN').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recordedResponse(model){
  check(model?.schema_version==='astra.n16.master-demo.v1'&&model.fresh_UI_execution===false
    &&Array.isArray(model.results)&&model.results.length===4
    &&ORDER.every(t=>model.results.filter(r=>r.tool===t).length===1),'RECORDED_MODEL_INVALID');
  const verified=tool=>{
    const r=model.results.find(r=>r.tool===tool);
    if(!/^CREW-0[1-6]$/.test(model.crew_id??'')||r.execution_status!=='COMPLETED'||r.data_status!=='KNOWN')return null;
    const c=masterCall(tool,model.crew_id),expected=projectMaster(c,expectedRows(c));
    if(r.crew_id!==model.crew_id||r.synthetic!==true||r.inference_performed!==false||r.clinical_support!==false
      ||r.provenance?.source_id!==SOURCE_ID||r.provenance.source_sha256!==SOURCE_SHA||r.provenance.source_as_of!==AS_OF
      ||r.provenance.original_projection_sha256!==sha(stable(expected))||stable(r.data)!==stable(expected.data))return null;
    return r;
  };
  const vitals=verified('get_current_vitals'),quality=verified('get_data_quality'),baseline=verified('get_personal_baseline'),risk=verified('get_open_risk_events');
  const observation=vitals?.data.items[0]??null,q=quality?.data.items[0]?.quality??null,b=baseline?.data.items[0]?.value??null;
  const statements=[
    observation?'The archived synthetic observation for '+model.crew_id+' records a heart rate of '+observation.value+' '+observation.unit+' at '+observation.provenance.observed_at+'.'
      :'The archived observation is UNKNOWN or unavailable.',
    q?'The source declares quality '+q.status+', confidence '+q.confidence+' and artifact '+q.artifact+'. This is recorded quality metadata.'
      :'Verified source-quality metadata is UNKNOWN or unavailable.',
    b?'The authored synthetic reference has center '+b.center+' '+b.unit+' and scale '+b.scale+' '+b.unit+'. It is not a clinically validated personal baseline.'
      :'The authored baseline reference is UNKNOWN or unavailable.',
    risk?'The archive contains '+risk.data.records.length+' authored risk-schema record(s). Independently verified N02 event provenance remains UNKNOWN.'
      :'The risk-tool result is UNKNOWN or unavailable. Absence of a verified result establishes no medical all-clear.'
  ];
  return {schema_version:'astra.n16.recorded-response.v1',generated_by_llm:false,observation,quality:q,baseline:b,
    risk:risk?.data??null,statements,diagnosis:null,treatment:null,clinical_validation:'NOT PROVIDED',
    scientific_answer_support:'ABSTAIN',research_rule_activated:false,scope:'Literal historical synthetic records only'};
}
const names={get_current_vitals:'Archived vitals',get_data_quality:'Source data quality',get_personal_baseline:'Authored reference',get_open_risk_events:'Authored risk records'};
export function renderRecordedDemo(model){
  const response=recordedResponse(model),started=(model.timeline??[]).filter(r=>r.status==='CALL_STARTED').map(r=>r.tool),
    ordered=started.length===4&&new Set(started).size===4&&started.every(t=>ORDER.includes(t))?started:ORDER;
  const cards=ordered.map((tool,i)=>{
    const r=model.results.find(r=>r.tool===tool);
    const verified=tool==='get_current_vitals'?response.observation:tool==='get_data_quality'?response.quality:tool==='get_personal_baseline'?response.baseline:response.risk;
    let body='<p class="unknown">UNKNOWN — no verified source result is available.</p>';
    if(tool==='get_current_vitals'&&response.observation){
      const v=response.observation;body='<p class="metric">'+escape(v.value)+'<span>'+escape(v.unit)+'</span></p><p>Heart rate recorded at source time</p><p class="muted">'+escape(v.provenance.observed_at)+'</p>';
    }
    if(tool==='get_data_quality'&&response.quality){
      const q=response.quality;body='<p class="metric word">'+escape(q.status)+'</p><dl><dt>Declared confidence</dt><dd>'+escape(q.confidence)+'</dd><dt>Artifact flag</dt><dd>'+escape(q.artifact)+'</dd></dl><p class="muted">Measurement value withheld by this tool.</p>';
    }
    if(tool==='get_personal_baseline'&&response.baseline){
      const b=response.baseline;body='<p class="metric">'+escape(b.center)+'<span>'+escape(b.unit)+'</span></p><p>Authored center · scale '+escape(b.scale)+' '+escape(b.unit)+'</p><p class="muted">No clinical calibration, measured history count or archive window is established.</p>';
    }
    if(tool==='get_open_risk_events'&&response.risk){
      body=response.risk.records.map(e=>'<article class="event"><strong>'+escape(e.id)+'</strong><dl><dt>Source record status</dt><dd>'+escape(e.status)+'</dd><dt>Record time</dt><dd>'+escape(e.observed_at)+'</dd><dt>Origin</dt><dd>'+escape(e.record_origin)+'</dd><dt>actual_N02_event</dt><dd>'+escape(e.actual_N02_event)+'</dd></dl></article>').join('')+
        '<p class="unknown">N02 event provenance: UNKNOWN. These authored examples are not operational alerts or an all-clear.</p>';
    }
    return '<section class="card" aria-labelledby="tool-'+i+'"><div class="eyebrow">TOOL '+(i+1)+' · '+escape(tool)+'</div><h2 id="tool-'+i+'">'+escape(names[tool])+'</h2>'+
      '<p class="status">Execution: '+escape(r.execution_status)+' <span>· Data: '+escape(verified?r.data_status:'UNKNOWN')+'</span></p>'+body+
      '<details><summary>Verified result and provenance</summary><pre>'+escape(JSON.stringify(r,null,2))+'</pre></details></section>';
  }).join('');
  const known=model.results.filter(r=>r.execution_status==='COMPLETED').length,scope=escape(model.crew_id);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'+
    '<title>ASTRA Health Agent — recorded synthetic demonstration</title><style>'+
    ':root{color-scheme:dark;--bg:#050508;--panel:#111116;--text:#f0ece6;--muted:#b2afb9;--line:#3c3b44;--accent:#9875e8;--cyan:#70d5e8;font-family:Inter,"Segoe UI",Arial,sans-serif}'+
    '*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 90% 0,#24203a 0,transparent 44%),var(--bg);color:var(--text);font-size:16px;line-height:1.6}'+
    'a{color:var(--cyan)}.skip{position:absolute;left:1rem;top:-5rem;background:var(--panel);padding:.6rem}.skip:focus{top:1rem}'+
    'main{max-width:1260px;margin:auto;padding:clamp(20px,4vw,60px)}header{border-bottom:1px solid var(--line);padding-bottom:26px;margin-bottom:28px}'+
    '.brand{letter-spacing:.25em;color:#c7b7ff;font-size:14px;font-weight:700}.eyebrow{font-size:12px;letter-spacing:.08em;color:var(--muted);overflow-wrap:anywhere}'+
    'h1{font-size:clamp(32px,4vw,54px);line-height:1.15;margin:16px 0}h2{font-size:23px;line-height:1.3;margin:12px 0 16px}p{margin:.6rem 0}'+
    '.subhead{max-width:850px;color:var(--muted)}.badge{display:inline-block;border:1px solid var(--line);border-radius:30px;padding:6px 13px;font-size:13px;margin:5px 5px 5px 0}'+
    '.controls{display:flex;gap:24px;align-items:end;flex-wrap:wrap;margin-top:25px}label{display:block;font-weight:600;margin-bottom:5px}select{font:inherit;background:#19191f;color:var(--text);padding:10px;border:1px solid #716a82;border-radius:8px;min-height:44px}'+
    '.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card,.block{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:24px}'+
    '.status{font-size:14px;color:#c6e8ee}.status span{color:var(--muted)}.metric{font-size:54px;line-height:1.2;letter-spacing:-.04em;margin:22px 0 6px}.metric span{font-size:21px;letter-spacing:0;margin-left:9px;color:var(--muted)}.word{font-size:38px}'+
    'dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}.unknown{background:#20212b;border-left:3px solid #b2afb9;padding:12px;font-size:14px}'+
    '.event{border-top:1px solid var(--line);padding-top:16px;font-size:14px}.event strong{overflow-wrap:anywhere}.block{margin-top:24px}details{margin-top:18px}summary{cursor:pointer;min-height:44px;padding:8px 0;color:#c7b7ff}'+
    'pre{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:32rem;overflow:auto;padding:14px;background:#08080d;border-radius:8px}ol{padding-left:24px}li{padding:5px 0}.timeline{font-size:14px}.timeline time{color:var(--muted)}'+
    ':focus-visible{outline:3px solid #f3c777;outline-offset:4px}footer{padding:25px 0;color:var(--muted);font-size:14px}'+
    '@media(max-width:740px){.grid{grid-template-columns:1fr}.card,.block{padding:18px}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}'+
    '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'+
    '</style></head><body><a class="skip" href="#main">Skip to recorded results</a><main id="main" tabindex="-1"><header><div class="brand">ASTRA COMMAND</div>'+
    '<div class="badge">SYNTHETIC / DESIGNATED SOURCE</div><div class="badge">RECORDED · OFFLINE · NO LLM</div><h1>ASTRA Health Agent</h1>'+
    '<p class="subhead">An independently usable, read-only demonstration of real tool execution against a sealed synthetic archive. Opening this file runs no tools. Recorded evidence is not live astronaut telemetry.</p>'+
    '<div class="controls"><div><label for="crew">Selected fictional astronaut</label><select id="crew" aria-describedby="crew-note">'+
    ['CREW-01','CREW-02','CREW-03','CREW-04','CREW-05','CREW-06'].map(c=>'<option '+(c===model.crew_id?'selected':'disabled')+'>'+c+(c===model.crew_id?' · recorded':' · unavailable')+'</option>').join('')+
    '</select><p id="crew-note" class="eyebrow">Only the recorded crew has verified results in this file.</p></div><div><span class="badge">Workflow: '+escape(model.workflow_status??'UNKNOWN')+'</span><span class="badge">'+known+'/4 completed calls</span><span class="badge">Trace: '+escape(model.trace_status)+'</span></div></div>'+
    '<p class="muted">Source mission time: <time>'+escape(AS_OF)+'</time> · Host currency: NOT_LIVE_ARCHIVE</p></header>'+
    '<div class="grid">'+cards+'</div><section class="block" aria-labelledby="response"><div class="eyebrow">DETERMINISTIC RECORDED RESPONSE</div><h2 id="response">What the verified records say</h2>'+
    response.statements.map(s=>'<p>'+escape(s)+'</p>').join('')+'<p class="unknown">No diagnosis, treatment or medical safety conclusion is generated. Scientific answer support: ABSTAIN; unreviewed research rules remain inactive.</p></section>'+
    '<section class="block" aria-labelledby="timeline"><h2 id="timeline">Actual recorded execution timeline</h2><ol class="timeline">'+
    (model.timeline??[]).map(r=>'<li><time>'+escape(r.at)+'</time> · '+escape(r.status)+' · '+escape(r.tool??r.call_id??'workflow')+'</li>').join('')+'</ol></section>'+
    '<section class="block" aria-labelledby="provenance"><h2 id="provenance">Provenance and recovery</h2><dl><dt>Source identity</dt><dd>'+escape(SOURCE_ID)+'</dd><dt>Source SHA-256</dt><dd>'+escape(SOURCE_SHA)+'</dd><dt>Fictional crew scope</dt><dd>'+scope+'</dd><dt>Run identity</dt><dd>'+escape(model.run_id)+'</dd><dt>Committed trace recovery</dt><dd>'+escape(model.trace_status)+'</dd><dt>SQL replay during recovery</dt><dd>'+escape(model.replayed_calls)+'</dd></dl>'+
    '<details><summary>Independent scientific-support status</summary><pre>'+escape(JSON.stringify(model.research,null,2))+'</pre></details></section>'+
    '<footer>Archived synthetic research/demo only. N02 remains the sole operational alert authority. No operational Health Agent integration, live sensor connection, Qwen execution or clinical validation is implied.</footer></main></body></html>\n';
}
