/* Parse Chromium's renderer feedback, separately from rAF/draw counters. */
export function frameEvidence(events,startName,durationSeconds=60){
  const marker=events.find(e=>e.name===startName);if(!marker)return{supported:false,reason:'Trace lacks workload start marker'};
  if(startName.endsWith('-start')){const end=events.find(e=>e.name===startName.slice(0,-6)+'-end');if(!end||end.ts<marker.ts+durationSeconds*1000000)return{supported:false,reason:'Trace does not contain the full marked measurement window'};}
  const renderers=new Set(events.filter(e=>e.name==='process_name'&&e.args?.name==='Renderer').map(e=>e.pid));
  if(renderers.size!==1)return{supported:false,reason:'Renderer attribution is ambiguous',renderer_pids:[...renderers]};
  const pid=[...renderers][0],pending=new Map(),frames=new Map(),start=marker.ts,end=start+durationSeconds*1000000;
  for(const e of [...events].sort((a,b)=>a.ts-b.ts)){
    if(e.name!=='PipelineReporter'||e.pid!==pid)continue;
    const key=String(e.id2?.local??e.id);
    if(e.ph==='b')pending.set(key,e);
    if(e.ph==='e'){
      const begin=pending.get(key);pending.delete(key);const report=begin?.args?.frame_reporter??begin?.args?.chrome_frame_reporter;
      if(!report||e.ts<start||e.ts>=end)continue;
      const identity=report.frame_source+':'+report.frame_sequence;
      const old=frames.get(identity);if(!old||report.state==='STATE_PRESENTED_ALL')frames.set(identity,{at_us:e.ts,state:report.state,duration_us:e.ts-begin.ts,sequence:identity});
    }
  }
  const buckets=Array.from({length:durationSeconds},(_,second)=>({second,complete:0,partial:0,dropped:0,no_update:0}));
  const fields={STATE_PRESENTED_ALL:'complete',STATE_PRESENTED_PARTIAL:'partial',STATE_DROPPED:'dropped',STATE_NO_UPDATE_DESIRED:'no_update'};
  for(const f of frames.values()){const field=fields[f.state];if(field)buckets[Math.floor((f.at_us-start)/1000000)][field]++;}
  const complete=[...frames.values()].filter(f=>f.state==='STATE_PRESENTED_ALL').sort((a,b)=>a.at_us-b.at_us),intervals=complete.slice(1).map((f,i)=>(f.at_us-complete[i].at_us)/1000);
  return{supported:frames.size>0,method:'Single renderer PipelineReporter frame_source/sequence dedup; STATE_PRESENTED_ALL counted at end/feedback timestamp in exact start-marker60s window. Partial/dropped/no-update separate.',limitation:'Chromium compositor presentation feedback, not physical panel instrumentation. Feedback timing can differ from scanout; no minimum judge certification.',renderer_pid:pid,start_us:start,duration_seconds:durationSeconds,buckets,complete_frames:complete.length,minimum_complete_per_second:Math.min(...buckets.map(b=>b.complete)),at_least_30_each_second:buckets.every(b=>b.complete>=30),complete_feedback_intervals_ms:intervals,states:frames.size};
}

export function metricPresentationEvidence(events,samples){
  const renderers=new Set(events.filter(e=>e.name==='process_name'&&e.args?.name==='Renderer').map(e=>e.pid));
  if(renderers.size!==1)return{supported:false,reason:'Renderer attribution ambiguous',samples:[]};
  const pid=[...renderers][0],pending=new Map(),frames=[];
  for(const e of [...events].sort((a,b)=>a.ts-b.ts)){if(e.pid!==pid)continue;const key=String(e.id2?.local??e.id);
    if(e.name==='PipelineReporter'&&e.ph==='b')pending.set(key,{state:(e.args?.frame_reporter??e.args?.chrome_frame_reporter)?.state,begin:e.ts});
    const f=pending.get(key);if(!f)continue;
    if(e.name==='Commit'&&e.ph==='b')f.commit=e.ts;
    if(e.name==='PipelineReporter'&&e.ph==='e'){f.end=e.ts;frames.push(f);pending.delete(key);}
  }
  const output=samples.map((sample,index)=>{
    const dom=events.find(e=>e.name==='n04-metric-dom-'+sample.id),later=samples.slice(index+1).find(s=>s.crew_id===sample.crew_id&&s.metric===sample.metric),next=later&&events.find(e=>e.name==='n04-metric-dom-'+later.id);
    const frame=dom&&frames.filter(f=>f.state==='STATE_PRESENTED_ALL'&&f.commit>=dom.ts&&f.end>=f.commit&&(!next||f.commit<next.ts)).sort((a,b)=>a.end-b.end)[0];
    return{...sample,supported:!!frame,...(frame?{feedback_after_dom_ms:(frame.end-dom.ts)/1000,end_to_end_feedback_ms:sample.dom_delay_ms+(frame.end-dom.ts)/1000}: {})};
  });
  return{supported:output.length>0&&output.every(s=>s.supported),method:'Server-owned ingestion.host_received_at to observed metric DOM mutation using the same Windows host clock, then same-renderer Commit in a STATE_PRESENTED_ALL PipelineReporter before next metric mutation. Endpoint is compositor presentation feedback, not physical scanout.',limitation:'A renderer commit does not prove specific text pixels were presented; offscreen cards have DOM timing only. Element visibility and element-specific paint require separate evidence. No all-metric paint or physical scanout certification.',samples:output};
}
