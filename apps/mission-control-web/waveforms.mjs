import { escape as esc } from './ui.mjs';

// This viewer replays archived input. It has no detector, model or twin authority.
export function mountWaveforms(root,{crew,crews,identity,api,now,onCrew,isCurrent=()=>true,earth=false,formats}){
  let disposed=false,sequence=0,windowSequence=0,abort=null,timer=null,record=null,cursor=0,records=[],playing=false;
  const canRead=['demo_admin','astronaut','mission_control','flight_surgeon'].includes(identity.role);
  const canWrite=['demo_admin','astronaut'].includes(identity.role);
  const $=s=>root.querySelector(s),active=()=>!disposed&&isCurrent();
  root.innerHTML=`<div class="wave-workspace"><header class="page-heading"><div><div class="eyebrow">N08 / SYNTHETIC WAVEFORM REPLAY</div><h1>Signal archive</h1><p>Archived fictional signals. No live sensors, clinical validation or monitoring alerts.</p></div><span class="tag">SYNTHETIC / NOT LIVE</span></header>
    <section class="panel wave-controls" aria-label="Waveform source controls"><label>Fictional crew<select id="wave-crew">${crews.map(id=>`<option ${id===crew?'selected':''}>${esc(id)}</option>`).join('')}</select></label><label>Knowledge cutoff · UTC<input id="wave-before" type="text" value="${esc(now)}" aria-describedby="wave-clock-note"></label><button id="wave-load" class="button">Load archive</button><p id="wave-clock-note">Source and recording time must both be known by this cutoff. Playback has a separate clock.</p></section>
    <p id="wave-status" role="status" aria-live="polite">Loading archive…</p>
    <section class="panel wave-ingest" aria-label="Synthetic waveform ingestion"><h2>Import an authored synthetic signal</h2><p>ASTRAWV1 float32 little-endian or ASTRA CSV v1 only. Up to 256,000 bytes / 60 seconds. No public, patient or astronaut files.</p>
    <label>Format<select id="wave-format"><option value="binary">ASTRAWV1 binary</option><option value="csv">ASTRA CSV v1</option></select></label><label>Source file<input id="wave-file" type="file" accept=".bin,.csv"></label><label class="wave-check"><input id="wave-confirm" type="checkbox">I confirm this is authored synthetic fictional-crew data.</label><label class="wave-check"><input id="wave-gap" type="checkbox" checked>Include a missing ECG segment in the generated fixture</label><div class="wave-actions"><button id="wave-upload" class="button" ${!canWrite?'disabled':''}>Validate & import file</button><button id="wave-generate" class="button primary" ${!canWrite?'disabled':''}>Generate & import synthetic fixture</button></div><p>Source revisions and originals are retained. New imports are rejected at 64 revisions or 8 MiB per crew; reads never prune records.</p></section>
    <section class="panel wave-view" aria-label="Waveform replay"><div class="wave-controls"><label>Recording<select id="wave-source"><option value="">No source</option></select></label><label>Channel<select id="wave-channel"><option>ECG</option></select></label><label>Range start · ms<input id="wave-from" type="number" min="0" step="1" value="0"></label><label>Range end · ms<input id="wave-until" type="number" min="0" step="1" value="0"></label><button id="wave-range" class="button">Apply range</button></div>
    <div class="wave-actions"><button id="wave-play" class="button">Play</button><button id="wave-pause" class="button">Pause</button><button id="wave-start" class="button">Seek to range start</button><label class="wave-seek">Playback cursor<input id="wave-seek" type="range" min="0" max="0" value="0" step="8"></label><output id="wave-clock">UNKNOWN source time</output></div>
    <div id="wave-chart" class="wave-chart"><p>UNKNOWN — no verified waveform loaded.</p></div><p id="wave-quality">UNKNOWN coverage</p><div id="wave-derived"></div><details><summary>Source provenance & validation boundaries</summary><div id="wave-provenance">No source selected.</div></details>
    <p class="wave-limits">Candidate peaks and descriptive values are engineering controls, not clinical measurements. BP is UNKNOWN. N06 legacy peak-motion interface is INACTIVE; research anatomy uses a separate read-only archive contract. N02 monitoring and alert authority are unchanged.</p></section></div>`;
  const status=(message,error=false)=>{if(active()){ $('#wave-status').textContent=message;$('#wave-status').classList.toggle('wave-error',error);}};
  function stop(){playing=false;clearInterval(timer);timer=null; if(active())$('#wave-play').textContent='Play';}
  function enabled(value){for(const s of ['#wave-source','#wave-channel','#wave-from','#wave-until','#wave-range','#wave-play','#wave-pause','#wave-start','#wave-seek'])$(s).disabled=!value;}
  function unavailable(message){record=null;enabled(false);$('#wave-chart').innerHTML='<p>'+esc(message)+'</p>';$('#wave-quality').textContent='UNKNOWN coverage';$('#wave-derived').textContent='';$('#wave-provenance').textContent='No verified source available.';$('#wave-clock').textContent='UNKNOWN source time';}
  function provenance(r){$('#wave-provenance').innerHTML=`<dl>${Object.entries({recording:r.recording_id,revision:r.revision,source:r.meta.source.id,classification:r.scientific_source,format:r.original_format,source_start:r.meta.start_at,source_end_exclusive:r.end_at,known_at:r.known_at,submitted_at_host:r.submitted_at_host,original_SHA256:r.original_sha256,normalized_SHA256:r.normalized_sha256,transformation:r.transform,rate_Hz:r.meta.sample_rate_hz,frames:r.meta.sample_count,clinical_validation:r.clinical_validation}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl>`;}
  function pendingWindow(){ $('#wave-chart').innerHTML='<p>Loading verified samples…</p>';$('#wave-quality').textContent='Loading verified window…';$('#wave-derived').textContent=''; }
  function draw(v){
    const bins=v.bins,finite=bins.flatMap(b=>b.min===null?[]:[b.min,b.max]),min=finite.length?Math.min(...finite):0,max=finite.length?Math.max(...finite):1,span=max-min||1;
    const start=v.from_ms,end=Math.max(start+1,v.until_ms),x=t=>20+(t-start)/(end-start)*960,y=n=>178-(n-min)/span*148;
    const gaps=bins.filter(b=>b.missing_samples).map(b=>`<rect class="wave-gap" x="${x(b.start_ms)}" width="${Math.max(1,x(b.end_ms)-x(b.start_ms))}" y="15" height="170"/>`).join('');
    let path='',open=false;
    for(const b of bins){if(b.min===null||b.missing_samples){open=false;continue;}const p=[[b.min_at_ms,b.min],[b.max_at_ms,b.max]].sort((a,b)=>a[0]-b[0]);for(const [t,n]of p){path+=(open?'L':'M')+x(t).toFixed(2)+','+y(n).toFixed(2);open=true;}}
    const peaks=v.experimental_peaks.candidates.map(p=>`<line class="wave-peak" x1="${x((Date.parse(p.source_at)-Date.parse(v.source_start_at)))}" x2="${x((Date.parse(p.source_at)-Date.parse(v.source_start_at)))}" y1="15" y2="185"/>`).join('');
    $('#wave-chart').innerHTML=`<svg viewBox="0 0 1000 210" role="img" aria-label="${esc(v.channel)} archived synthetic waveform; ${v.quality.missing_samples} missing samples; ${v.from_ms} to ${v.until_ms} milliseconds"><line x1="20" x2="980" y1="185" y2="185" class="wave-axis"/>${gaps}${peaks}<path class="wave-signal" d="${path}"/><text x="20" y="207">${v.from_ms} ms</text><text x="860" y="207">${v.until_ms} ms</text></svg>`;
    $('#wave-quality').textContent=`${v.status} · ${v.channel} [${v.unit}] · ${v.sample_rate_hz} Hz · ${(v.quality.coverage*100).toFixed(1)}% coverage · ${v.quality.missing_samples} missing samples · declared quality ${v.quality.declared} · engineering format VALID · clinically NOT VALIDATED`;
    $('#wave-derived').textContent=`Experimental candidate peaks: ${v.experimental_peaks.candidates.length}. Descriptive rate: ${v.experimental_peaks.rate_bpm===null?'UNKNOWN':v.experimental_peaks.rate_bpm.toFixed(1)+' /min'}. BP: UNKNOWN. Peak/chunk timing: ${v.twin_interface.status}.`;
    $('#wave-clock').textContent=`Source cursor ${new Date(Date.parse(v.source_start_at)+v.until_ms).toISOString()} · ${playing?'playing archive':'paused archive'}`;
  }
  async function windowLoad(){
    if(!record||!active())return;const id=++windowSequence;
    const from=Number($('#wave-from').value),end=Number($('#wave-until').value),until=Math.max(from,Math.min(end,cursor));
    if(!Number.isInteger(from)||!Number.isInteger(end)||from<0||end<from||end>duration()){stop();status('Invalid range: use integer milliseconds inside the source.',true);return;}
    try{const v=await api(`/crew/${crew}/waveforms/${encodeURIComponent(record.recording_id)}?`+new URLSearchParams({before:$('#wave-before').value,channel:$('#wave-channel').value,from_ms:from,until_ms:until,points:250}));if(active()&&id===windowSequence){draw(v);}}
    catch(e){if(active()&&id===windowSequence){stop();status('Replay unavailable: '+e.message,true);unavailable('UNAVAILABLE — waveform could not be verified.');}}
  }
  const duration=()=>record?record.meta.sample_count*1000/record.meta.sample_rate_hz:0;
  async function choose(){stop();record=records.find(r=>r.recording_id===$('#wave-source').value);if(!record){unavailable('UNKNOWN — no source known at this cutoff.');return;}
    enabled(true);$('#wave-channel').innerHTML=record.meta.channels.map(c=>'<option>'+esc(c.name)+'</option>').join('');
    $('#wave-from').value=0;$('#wave-until').value=duration();$('#wave-from').max=duration();$('#wave-until').max=duration();cursor=duration();$('#wave-seek').max=duration();$('#wave-seek').value=cursor;provenance(record);pendingWindow();await windowLoad();}
  async function load(message){
    if(earth||!canRead||!active())return;
    stop();windowSequence++;const id=++sequence;status('Loading archive…');
    try{const v=await api(`/crew/${crew}/waveforms?`+new URLSearchParams({before:$('#wave-before').value}));if(!active()||id!==sequence)return;
      records=v.recordings;$('#wave-source').innerHTML=records.length?records.map(r=>`<option value="${esc(r.recording_id)}">${esc(r.recording_id)} · r${r.revision} · ${esc(r.original_format)}</option>`).join(''):'<option value="">No source</option>';
      await choose();if(active()&&id===sequence&&(record||!records.length))status(message??`Loaded ${records.length} verified synthetic recording(s).`);
    }catch(e){if(active()&&id===sequence){unavailable('UNAVAILABLE — archive not verified.');status('Archive unavailable: '+e.message,true);}}
  }
  async function upload(generated=false){
    if(earth||!canWrite||!active())return;
    stop();if(!$('#wave-confirm').checked){status('Confirm authored synthetic data before importing.',true);return;}
    const format=$('#wave-format').value,cutoffAtImport=$('#wave-before').value;$('#wave-upload').disabled=true;$('#wave-generate').disabled=true;status('Validating synthetic source…');
    try{
      let bytes;
      if(generated){const d=formats.demoWaveform(crew,new Date(Date.parse(now)-60000).toISOString(),'SYN-'+crypto.randomUUID(),{gap:$('#wave-gap').checked});bytes=format==='binary'?formats.encodeBinary(d.meta,d.frames):formats.encodeCSV(d.meta,d.frames);}
      else{const file=$('#wave-file').files?.[0];if(!file)throw Error('Choose a source file.');if(file.size>formats.WAVE.maxBytes)throw Error('Source exceeds 256,000 bytes.');bytes=new Uint8Array(await file.arrayBuffer());}
      if(!active())return;
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
      if(!active())return;
      abort=new AbortController();const deadline=setTimeout(()=>abort?.abort(),8000);
      let response;try{response=await fetch('/v1/ingest/waveforms?format='+format,{method:'POST',credentials:'same-origin',signal:abort.signal,headers:{'Content-Type':format==='binary'?'application/octet-stream':'text/csv','X-Waveform-Crew':crew,'X-Waveform-SHA256':hash},body:bytes});}finally{clearTimeout(deadline);abort=null;}
      const result=await response.json();if(!response.ok)throw Error(result.error?.message??result.error??result.message??('HTTP '+response.status));
      if(active()){
        const known=result.source.known_at;
        const advance=$('#wave-before').value===cutoffAtImport&&Number.isFinite(Date.parse(known))&&Date.parse(known)>Date.parse(cutoffAtImport);
        if(advance)$('#wave-before').value=known;
        await load(`Imported ${result.source.recording_id} r${result.source.revision}${result.idempotent?' (idempotent; no duplicate)':''}.${advance?' Cutoff advanced to committed source knowledge time '+known+'.':Date.parse(known)>Date.parse($('#wave-before').value)?' Source is later than the selected cutoff; historical view retained.':''}`);
      }
    }catch(e){status('Import failed: '+e.message+'. Input retained; retrying an identical committed source is idempotent.',true);}
    finally{if(active()){$('#wave-upload').disabled=!canWrite;$('#wave-generate').disabled=!canWrite;}}
  }
  $('#wave-crew').addEventListener('change',()=>{stop();abort?.abort();onCrew($('#wave-crew').value);});
  $('#wave-load').addEventListener('click',()=>load());$('#wave-source').addEventListener('change',choose);
  $('#wave-channel').addEventListener('change',()=>{stop();pendingWindow();windowLoad();});$('#wave-range').addEventListener('click',()=>{stop();cursor=Number($('#wave-until').value);$('#wave-seek').value=cursor;windowLoad();});
  $('#wave-seek').addEventListener('input',()=>{stop();cursor=Number($('#wave-seek').value);windowLoad();});
  $('#wave-start').addEventListener('click',()=>{stop();cursor=Number($('#wave-from').value);$('#wave-seek').value=cursor;windowLoad();});
  $('#wave-pause').addEventListener('click',()=>{stop();windowLoad();});
  $('#wave-play').addEventListener('click',()=>{if(!record||playing)return;const end=Number($('#wave-until').value),from=Number($('#wave-from').value);if(end<from||end>duration()||from<0){status('Invalid range.',true);return;}if(cursor>=end||cursor<from)cursor=from;playing=true;$('#wave-play').textContent='Playing archive';let last=performance.now();timer=setInterval(()=>{if(!active()){stop();return;}const at=performance.now();cursor=Math.min(end,Math.round(cursor+at-last));last=at;$('#wave-seek').value=cursor;windowLoad();if(cursor>=end)stop();},250);windowLoad();});
  $('#wave-upload').addEventListener('click',()=>upload());$('#wave-generate').addEventListener('click',()=>upload(true));
  if(earth||!canRead){unavailable(earth?'UNAVAILABLE — onboard waveform archive is excluded from Earth received view.':'PERMISSION DENIED — this role cannot read raw waveform data.');status(earth?'Earth view: no onboard waveform requests.':'Permission denied.',true);$('#wave-load').disabled=true;for(const s of ['#wave-upload','#wave-generate'])$(s).disabled=true;}
  else{enabled(false);load();}
  return ()=>{disposed=true;sequence++;windowSequence++;stop();abort?.abort();};
}
