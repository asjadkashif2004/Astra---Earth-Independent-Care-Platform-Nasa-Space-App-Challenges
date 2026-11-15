/* Browser-only instrumentation; never imported by the application. */
export function installP01Probe(){
  if(window.__p01)return;
  const p=window.__p01={samples:[],packets:[],pending:[],seen:new Set(),recording:false,draws:{},measured_batches:new Set(),out_of_window:[],last_snapshot_observed_at:null};
  p.beginTrial=observed=>{
    if(!observed.length||new Set(observed).size!==observed.length||observed.some(ts=>!Number.isFinite(Date.parse(ts))))throw Error('Explicit unique measured batches required');
    p.samples=[];p.pending=[];p.seen.clear();p.measured_batches=new Set(observed);p.out_of_window=[];p.recording=true;
  };
  const canvasPrototype=window.HTMLCanvasElement?.prototype;
  if(canvasPrototype){const original=canvasPrototype.getContext,wrapped=new WeakSet();canvasPrototype.getContext=function(...args){const context=original.apply(this,args);if(args[0]==='webgl2'&&context&&!wrapped.has(context)){wrapped.add(context);const draw=context.drawArrays;context.drawArrays=function(...parameters){const id=this.canvas.parentElement?.id??'unknown';p.draws[id]=(p.draws[id]??0)+1;return draw.apply(this,parameters);};}return context;};}
  const normalize=s=>s.replace(/\s/g,'');
  const hh=ts=>new Date(ts).toLocaleTimeString('en-GB',{hour12:false,timeZone:'UTC'});
  const Native=window.EventSource;
  window.EventSource=class extends Native{constructor(...args){super(...args);this.addEventListener('snapshot',event=>{
    const snapshot=JSON.parse(event.data),received=Date.now();p.last_snapshot_observed_at=snapshot.mission.spacecraft_time;if(!p.recording)return;
    p.packets.push({observed_at:snapshot.mission.spacecraft_time,server_snapshot_at:snapshot.server_received_at,browser_received_ms:received});
    if(!p.measured_batches.has(snapshot.mission.spacecraft_time)){
      p.out_of_window.push({reason:'Snapshot outside explicitly measured batches',observed_at:snapshot.mission.spacecraft_time,browser_received_ms:received,snapshot});return;
    }
    p.pending=[];
    const add=(crew,key,selector,digits,unit='')=>{
      const e=crew.metric_observations?.[key];if(!e||e.integrity!=='verified'||!Number.isFinite(crew.values[key]))return;
      p.pending.push({crew_id:crew.id,metric:key,event_id:e.event_id,observed_at:e.ts,ingestion_host_ms:Date.parse(e.ingestion.host_received_at),browser_received_ms:received,snapshot_observed_at:snapshot.mission.spacecraft_time,expected_numeric:crew.values[key].toFixed(digits),expected:crew.values[key].toFixed(digits)+unit,selector,stamp:hh(e.ts),source_kind:e.source.kind});
    };
    if(document.querySelector('#crew-grid')){
      for(const crew of snapshot.crew){const base='[data-crew="'+crew.id+'"]';add(crew,'heart_rate',base+' .crew-hr span',0);add(crew,'spo2',base+' .crew-mini-metrics>div:first-child p',1,'%');add(crew,'sleep_duration',base+' .crew-mini-metrics>div:last-child p',1,'h');}
      ['co2_ppm','temperature_c','humidity_percent','dose_rate_msv_h'].forEach((key,index)=>p.pending.push({crew_id:'CABIN',metric:key,event_id:null,observed_at:snapshot.mission.spacecraft_time,ingestion_host_ms:null,browser_received_ms:received,snapshot_observed_at:snapshot.mission.spacecraft_time,expected_numeric:snapshot.environment[key].toFixed([0,1,0,3][index]),expected:snapshot.environment[key].toFixed([0,1,0,3][index])+['ppm','°C','%','mSv/h'][index],selector:'#environment>div:nth-child('+(index+1)+') p',source_kind:'synthetic cabin snapshot',environment:true}));
    }else if(document.querySelector('#crew-metric-tiles')){
      const id=document.querySelector('#crew-tabs [aria-pressed="true"]')?.dataset.crew,crew=snapshot.crew.find(c=>c.id===id);
      if(crew)['heart_rate','hrv','spo2','respiratory_rate','sleep_duration','temperature'].forEach((key,index)=>add(crew,key,'#crew-metric-tiles>div:nth-child('+(index+1)+') p',['spo2','sleep_duration','temperature'].includes(key)?1:0,['bpm','ms','%','/min','h','°C'][index]));
    }
  });}};
  function inspect(){
    if(!p.recording)return;
    for(const candidate of p.pending){
      const key=candidate.snapshot_observed_at+':'+candidate.crew_id+':'+candidate.metric;if(p.seen.has(key))continue;
      const e=document.querySelector(candidate.selector);if(!e||normalize(e.textContent)!==candidate.expected)continue;
      if(!candidate.environment){const stamp=document.querySelector('#crew-grid')?e.closest('.crew-card')?.querySelector('.crew-source'):e.closest('.metric-tile')?.querySelector('small:last-child');if(!stamp?.textContent.includes(candidate.stamp))continue;}
      const range=document.createRange();range.selectNodeContents(e.firstChild);const r=range.getBoundingClientRect();
      const visible=r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),unobscured=at===e||e.contains(at);
      const dom=Date.now(),id=p.samples.length;performance.mark('n04-metric-dom-'+id);
      p.samples.push({...candidate,id,dom_host_ms:dom,dom_delay_ms:candidate.ingestion_host_ms===null?null:dom-candidate.ingestion_host_ms,receipt_to_dom_ms:dom-candidate.browser_received_ms,visible,unobscured,rect:{x:r.x,y:r.y,width:r.width,height:r.height}});p.seen.add(key);
    }
  }
  new MutationObserver(inspect).observe(document,{subtree:true,childList:true,characterData:true});
}
