/* Offline assessment: capture, OCR/glyph references and source SQLite remain independent evidence. */
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { join,resolve,sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { decodeScreenshot,numericGlyph,digest,verifyGlyphReferences } from './n04-p01-pixels.mjs';
import { percentile } from './n04-p01-profile.mjs';
export function assessTrial(trial,verified,lookup,batchCount){
  const errors=[],groups=new Map(),ids=new Set();
  for(const sample of trial.samples){
    if(ids.has(sample.id))errors.push('Duplicate sample '+sample.id);ids.add(sample.id);
    const capture=trial.captures.find(c=>c.metric_ids.includes(sample.id)),text=verified.find(v=>v.id===sample.id&&v.file===capture?.file);
    if(!sample.visible||!sample.unobscured||!capture||!text?.matched||text.expected!==sample.expected_numeric)errors.push('Unverified visible numeric sample '+sample.id);
    if(capture?.observed_at!==sample.snapshot_observed_at||!trial.host.some(h=>h.observed_at===sample.snapshot_observed_at))errors.push('Stale capture/batch association '+sample.id);
    if(!sample.environment){
      const source=lookup(sample.event_id);
      if(!source||source.crew_id!==sample.crew_id||source.metric.name!==sample.metric||source.ts!==sample.observed_at||Date.parse(source.ingestion?.host_received_at)!==sample.origin_host_ms||source.provenance?.synthetic!==true||!Number.isFinite(source.provenance.seed)||!source.provenance.generator_version||!source.provenance.scenario_id||source.integrity!=='verified'||source.quality?.status!=='good'||source.source?.kind!==sample.source_kind||Number(source.metric.value).toFixed(sample.expected_numeric.includes('.')?sample.expected_numeric.split('.')[1].length:0)!==sample.expected_numeric)errors.push('Source mismatch '+sample.id);
    }else if(sample.event_id!==null||sample.latency_origin!=='Synthetic batch processing start;no independent sensor ingestion event')errors.push('Unsupported cabin provenance '+sample.id);
    if(!Number.isFinite(sample.dom_delay_ms)||!Number.isFinite(sample.capture_bound_ms)||sample.dom_delay_ms<0||sample.capture_bound_ms<sample.dom_delay_ms||sample.dom_host_ms-sample.origin_host_ms!==sample.dom_delay_ms||capture?.capture_completed_host_ms-sample.origin_host_ms!==sample.capture_bound_ms)errors.push('Invalid clock bound '+sample.id);
    const key=sample.crew_id+':'+sample.metric;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(sample);
  }
  const expectedKeys=trial.context==='overview'?[...Array.from({length:6},(_,i)=>['heart_rate','spo2','sleep_duration'].map(m=>'CREW-0'+(i+1)+':'+m)).flat(),...['co2_ppm','temperature_c','humidity_percent','dose_rate_msv_h'].map(m=>'CABIN:'+m)]:Array.from({length:6},(_,i)=>['heart_rate','hrv','spo2','respiratory_rate','sleep_duration','temperature'].map(m=>'CREW-0'+(i+1)+':'+m)).flat();
  const perGroup=expectedKeys.map(key=>{const a=groups.get(key)??[];const expected=trial.context==='overview'?60:10;const record={key,count:a.length,expected_count:expected,dom_p95_ms:percentile(a.map(s=>s.dom_delay_ms)),capture_bound_p95_ms:percentile(a.map(s=>s.capture_bound_ms))};if(record.count!==expected||record.dom_p95_ms>=500||record.capture_bound_p95_ms>=500)errors.push('Coverage/latency gate '+key);return record;});
  if(trial.host.length!==60||new Set(trial.host.map(h=>h.observed_at)).size!==60||trial.captures.length!==60||trial.trace_data_loss!==false)errors.push('Incomplete60-second workload or trace');
  const scalarBatches=typeof batchCount==='function'?trial.host.map(h=>({observed_at:h.observed_at,stored_scalars:batchCount(h.observed_at)})):[];
  if(scalarBatches.length!==60||scalarBatches.some(b=>b.stored_scalars!==60))errors.push('Unverified60-scalar batch cadence');
  const pending=(trial.before??[]).filter(r=>['queued','in_transit'].includes(r.status));
  const stress={pending_packets:pending.reduce((n,r)=>n+r.packets,0),pending_bytes:pending.reduce((n,r)=>n+r.bytes,0),required_at_1x:{packets:825,bytes:54000000,origin:'Unchanged-backend failing60-second baseline;not a clinical or general queue capacity limit'}};
  if(trial.rate===1&&(stress.pending_packets<825||stress.pending_bytes<54000000))errors.push('Not the reproduced1x disk queue-stress workload');
  return {name:trial.name,rate:trial.rate,context:trial.context,mode:trial.mode,passed:errors.length===0,errors,groups:perGroup,scalar_batches:scalarBatches,stress,tick_p95_ms:percentile(trial.host.map(h=>h.tick_ms)),deadline_lateness_max_ms:Math.max(...trial.host.map(h=>h.deadline_lateness_ms)),dom_p95_ms:percentile(trial.samples.map(s=>s.dom_delay_ms)),capture_bound_p95_ms:percentile(trial.samples.map(s=>s.capture_bound_ms)),transport_to_receipt_p95_ms:percentile(trial.samples.map(s=>s.transport_to_receipt_ms)),server_before_write_p95_ms:percentile(trial.samples.map(s=>s.server_before_write_ms)),receipt_to_dom_p95_ms:percentile(trial.samples.map(s=>s.receipt_to_dom_ms)),frame_feedback_scope:'Compositor feedback only;headless mode and physical presentation limitations remain report-level constraints'};
}
async function main(){
  const directories=process.argv.slice(2).filter(a=>!a.startsWith('--')).map(d=>resolve(d)),output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);if(!directories.length||!output)throw Error('Supply report directories and --output=path');
  const entries=[],runs=[];let manual=[];
  const reviewFile=process.argv.find(a=>a.startsWith('--review-file='))?.slice(14);
  if(reviewFile)manual=JSON.parse(readFileSync(resolve(reviewFile),'utf8')).map(m=>({...m,file:resolve(m.source_directory,m.file)}));
  for(const directory of directories){
    const report=JSON.parse(readFileSync(join(directory,'report.json'))),manifest=JSON.parse(readFileSync(join(directory,'ocr-manifest.json'))),ocr=JSON.parse(readFileSync(join(directory,'ocr.json'),'utf8').replace(/^\uFEFF/,''));
    if(existsSync(join(directory,'manual-text.json')))manual.push(...JSON.parse(readFileSync(join(directory,'manual-text.json'))).map(m=>({...m,file:join(directory,m.file)})));
    let decoded=0;
    for(const image of manifest){const bytes=readFileSync(join(directory,image.file)),png=decodeScreenshot(bytes),ocrChecks=ocr.results.find(r=>r.file===image.file)?.checks??[];
      for(const t of image.targets){const check=ocrChecks.find(c=>c.id===t.id);let glyph=null,glyph_error=null;try{glyph=numericGlyph(png,t.rect);}catch(error){glyph_error=error.message;}entries.push({file:join(directory,image.file),id:t.id,crew_id:t.crew_id,metric:t.metric,expected:t.expected,screenshot_sha256:digest(bytes),glyph,glyph_error,ocr_matched:check?.matched===true&&check.expected===t.expected});}
      if(++decoded%60===0)console.log('Offline captured glyphs '+directory+': '+decoded+'/'+manifest.length);
    }
    runs.push({directory,report});
  }
  const verified=verifyGlyphReferences(entries,manual),result={method:'Strict OCR plus exact thresholded numeric glyph identity to OCR/manual-reviewed PNG references;no fuzzy matching,digit substitution,physical display or pixel-perfect claim',threshold_luminance:145,runs:[],unverified:verified.filter(v=>!v.matched)};
  for(const {directory,report}of runs){
    const db=new DatabaseSync(join(directory,'fixture.sqlite'),{readOnly:true});
    try{
      const ids=[...new Set(report.trials.flatMap(t=>t.samples.map(s=>s.event_id)).filter(Boolean))];
      const sources=new Map(db.prepare('SELECT json FROM telemetry_points WHERE event_id IN ('+ids.map(()=>'?').join(',')+')').all(...ids).map(r=>{const e=JSON.parse(r.json);return [e.event_id,e];}));
      const counts=new Map(db.prepare('SELECT ts,COUNT(*) AS n FROM telemetry_points GROUP BY ts').all().map(r=>[r.ts,r.n]));
      result.runs.push({directory,headed:report.headed,protocol:report.protocol,status:report.status,console_errors:report.console_errors,images:report.screenshots.length,numbers:verified.filter(v=>v.file.startsWith(directory+sep)).length,trials:report.trials.map(t=>assessTrial(t,verified.filter(v=>v.file.startsWith(directory+sep)).map(v=>({...v,file:v.file.slice(directory.length+1)})),id=>sources.get(id),ts=>counts.get(ts)??0))});
    }finally{db.close();}
  }
  result.verified_numbers=verified.filter(v=>v.matched).length;result.total_numbers=verified.length;result.direct_ocr_matches=entries.filter(v=>v.ocr_matched).length;result.exact_reference_matches=verified.filter(v=>v.matched&&!v.ocr_matched).length;result.reviewed_manual_anchors=manual.length;
  result.coverage=Array.from({length:2},(_,r)=>['overview','crew'].flatMap(context=>['standard','performance'].map(mode=>{const rate=[1,30][r],trials=result.runs.flatMap(run=>run.trials).filter(t=>t.rate===rate&&t.context===context&&t.mode===mode);return {rate,context,mode,trials:trials.map(t=>t.name),complete:trials.length===3&&new Set(trials.map(t=>t.name)).size===3&&trials.every(t=>t.passed)};}))).flat();
  result.all_trial_bounds_pass=result.coverage.every(c=>c.complete);result.headed_acceptance_supported=result.all_trial_bounds_pass&&result.runs.every(r=>r.headed);
  writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({total_numbers:result.total_numbers,verified_numbers:result.verified_numbers,unverified:result.unverified.length,all_trial_bounds_pass:result.all_trial_bounds_pass,headed_acceptance_supported:result.headed_acceptance_supported}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
