import { check } from '../../packages/waveforms.mjs';
export function analyzeWindow(samples,{meta,channel,offset,points,source_sha256}){
  const rate=meta.sample_rate_hz,valid=[...samples].filter(Number.isFinite),missing=samples.length-valid.length;
  const declared=meta.quality.status,status=!samples.length||!valid.length?'UNKNOWN':missing||declared!=='good'?'PARTIAL':'KNOWN';
  const bins=[],size=Math.max(1,Math.ceil(samples.length/points));
  for(let from=0;from<samples.length;from+=size){
    const to=Math.min(samples.length,from+size);let min=null,max=null,min_at=null,max_at=null,absent=0;
    for(let i=from;i<to;i++){const n=samples[i];if(!Number.isFinite(n)){absent++;continue;}if(min===null||n<min){min=n;min_at=(offset+i)*1000/rate;}if(max===null||n>max){max=n;max_at=(offset+i)*1000/rate;}}
    bins.push({start_ms:(offset+from)*1000/rate,end_ms:(offset+to)*1000/rate,min,max,min_at_ms:min_at,max_at_ms:max_at,missing_samples:absent,sample_count:to-from});
  }
  const peaks=[];
  if(channel==='ECG')for(let i=1;i<samples.length-1;i++){
    const n=samples[i];if(Number.isFinite(n)&&Number.isFinite(samples[i-1])&&Number.isFinite(samples[i+1])&&n>=.8&&n>samples[i-1]&&n>=samples[i+1]
      &&(!peaks.length||(offset+i-peaks.at(-1).frame)>=rate*.25))peaks.push({frame:offset+i,source_at:new Date(Date.parse(meta.start_at)+(offset+i)*1000/rate).toISOString(),source_sha256});
  }
  const rr=peaks.slice(1).map((p,i)=>(p.frame-peaks[i].frame)/rate),estimate=status==='KNOWN'&&declared==='good'&&rr.length>=2?60/(rr.reduce((a,b)=>a+b,0)/rr.length):null;
  return {status,quality:{declared,coverage:samples.length?valid.length/samples.length:0,missing_samples:missing,engineering_format:'VALID',scientific_source:'AUTHORED_SYNTHETIC',clinical_validation:'NOT_VALIDATED'},
    bins,observed_statistics:valid.length?{min:Math.min(...valid),max:Math.max(...valid),mean:valid.reduce((a,b)=>a+b,0)/valid.length,rms:Math.sqrt(valid.reduce((a,b)=>a+b*b,0)/valid.length)}:null,
    experimental_peaks:{method:'positive-local-max-0.8mV-250ms-v1; fictional controls only',candidates:peaks,rate_bpm:estimate,clinical_validation:false},
    blood_pressure:{status:'UNKNOWN',reason:'No authorized verified BP source; no PPG inference.'},
    twin_interface:{schema_version:'astra.n08.peak-time-interface.v1',status:'INACTIVE_N06_GATE',source_sha256,peaks:peaks.map(p=>({...p,chunk_index:Math.floor(p.frame/(rate*5)),frame_in_chunk:p.frame%(rate*5)}))}};
}
