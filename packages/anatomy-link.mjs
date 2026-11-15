import { METRICS, validateTelemetry } from './contracts.mjs';
export const LINK_VERSION='astra.n06.link.v1';
const make=(id,mesh,name,metrics,channels=[],limitation='Navigation context only; no disease localization or clinical inference.')=>Object.freeze({id,mesh,name,metrics:Object.freeze(metrics),units:Object.freeze(Object.fromEntries(metrics.map(k=>[k,METRICS[k].unit]))),channels:Object.freeze(channels),version:LINK_VERSION,crew_scope:'authorized fictional crew',source_contract:'astra.telemetry.v1 / N02 read only',quality:'verified synthetic, good, no artifact, known by cutoff and fresh at source time',limitation});
export const REGIONS=Object.freeze([
 make('cardiovascular','reference.heart','Cardiovascular · heart surfaces',['heart_rate','hrv'],['ECG','PPG'],'Three reference chamber-wall surfaces, not a complete heart. HR/HRV do not establish heart disease.'),
 make('respiratory-left','reference.lung.left','Respiratory · left lung',['respiratory_rate','spo2'],['RESP'],'General RR/SpO₂ context, not a lung-specific measurement or disease localization.'),
 make('respiratory-right','reference.lung.right','Respiratory · right lung',['respiratory_rate','spo2'],['RESP'],'General RR/SpO₂ context, not a lung-specific measurement or disease localization.'),
 make('body','reference.body','Body envelope',['temperature']),
 make('skeleton','reference.skeleton','Skeleton · no bone measurement',[]),
 make('head',null,'Head context · geometry unavailable',['sleep_duration'],[],'No head/brain mesh. Completed synthetic sleep is descriptive context, not a neurological or private cognition record.'),
 make('thorax',null,'Thorax context · conceptual',['heart_rate','respiratory_rate'],['ECG','RESP'],'Conceptual navigation only. Select actual heart/lung surfaces for mesh selection; no thorax disease localization.')
]);
export function region(id){const r=REGIONS.find(r=>r.id===id);if(!r)throw Error('Unsupported anatomical region');return r;}
export function validateMappings(rows){if(!Array.isArray(rows)||rows.length!==REGIONS.length)throw Error('Incomplete mapping');const ids=new Set();for(const r of rows){if(!r||ids.has(r.id))throw Error('Duplicate/invalid mapping');ids.add(r.id);const expected=region(r.id);if(JSON.stringify(r)!==JSON.stringify(expected))throw Error('Unsupported mapping version, mesh, metric, unit or source');}return rows;}
export function reading(event,metric,crew,cutoff){
 const unknown=reason=>({metric,unit:METRICS[metric]?.unit??null,status:'UNKNOWN',value:null,reason,coverage:0,source_at:Date.parse(event?.ts)<=cutoff?event.ts:null,known_at:Date.parse(event?.received_ts)<=cutoff?event.received_ts:null});
 if(!event)return unknown('NO AVAILABLE DATA');
 try{const {integrity,ingestion,...canonical}=event;validateTelemetry(canonical,cutoff);}catch{return unknown('INVALID OR INELIGIBLE SOURCE');}
 const source=Date.parse(event.ts),known=Math.max(Date.parse(event.received_ts),Date.parse(event.ingestion?.mission_received_at??event.received_ts));
 if(event.crew_id!==crew||event.metric.name!==metric||event.integrity!=='verified'||!Number.isFinite(known)||known>cutoff||source>cutoff)return unknown('WRONG CREW / UNVERIFIED / FUTURE SOURCE');
 const quality=event.quality,stale=cutoff-source>Math.max(5000,3000/event.source.sampling_hz);
 if(stale||quality.status!=='good'||quality.artifact||!Number.isFinite(event.metric.value))return unknown(stale?'STALE SOURCE':'MISSING / SUSPECT / ARTIFACT');
 return {metric,unit:event.metric.unit,status:'KNOWN',value:event.metric.value,coverage:1,source_at:event.ts,known_at:new Date(known).toISOString(),event_id:event.event_id,quality:{...quality},source:{...event.source},provenance:{...event.provenance}};
}
