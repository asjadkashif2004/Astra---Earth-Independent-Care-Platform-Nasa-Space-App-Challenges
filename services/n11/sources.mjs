import { readFileSync,lstatSync,realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ensure,digest } from './contracts.mjs';
import * as n09 from '../telemetry-simulator/n09-engine.mjs';
import { list,windowData } from '../waveforms/service.mjs';
import { project } from '../n10/projection.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),REL='artifacts/n07-final-20261030/source-inventory-final.json',PIN='cb76d62bd42e88479625b23e92996ecdc5e85cad3e640b748bbf837141b7853c';
export function validateInventory(raw){ensure(createHash('sha256').update(raw).digest('hex')===PIN,'N11_SOURCE_HASH');const v=JSON.parse(raw);ensure(v.schema_version==='astra.n07.inventory.v1','N11_SOURCE_SCHEMA');return v;}
export function sourceInventory(){
 let path=realpathSync(ROOT);for(const component of REL.split('/')){path=join(path,component);ensure(!lstatSync(path).isSymbolicLink(),'N11_SOURCE_SYMLINK');}
 const before=lstatSync(path);ensure(before.isFile()&&before.nlink===1&&before.size<=262144,'N11_SOURCE_FILE');const raw=readFileSync(path),after=lstatSync(path);
 ensure([before.dev,before.ino,before.size,before.mtimeMs,before.ctimeMs].join(':')===[after.dev,after.ino,after.size,after.mtimeMs,after.ctimeMs].join(':')&&createHash('sha256').update(raw).digest('hex')===PIN,'N11_SOURCE_HASH');
 const data=validateInventory(raw);return {schema_version:'astra.n11.source-context.v1',retained_inventory_sha256:PIN,verification:'PINNED_RETAINED_DESCRIPTOR; original intake verified by N07, not a fresh scientific review',originals:data.rows.filter(r=>r.module==='N07'&&r.category==='A_AUTHENTIC_ORIGINAL').map(r=>({id:r.id,title:r.title,version:r.version,sha256:r.sha256,rights:r.rights,scope:r.scope,review:r.review})),missing:data.rows.filter(r=>r.category==='E_UNAVAILABLE_OR_UNAUTHORIZED_ACQUISITION').map(r=>({id:r.id,reason:r.reason})),training_measurements:null,scientific_clearance:false};
}
export function contexts(engine,who,config){
 const at=Date.parse(config.before),source=sourceInventory();let waveform={status:'UNKNOWN',reason:'NO_AUTHORIZED_SOURCE_SELECTED'},n09Run={status:'UNKNOWN',reason:'NO_RUN_SELECTED'},n10={status:'UNKNOWN',reason:'UNAVAILABLE_OR_UNAUTHORIZED'};
 if(config.waveform){const w=config.waveform,found=list(engine.store,who,config.crew_id,config.before,engine.state.now).recordings.find(r=>r.recording_id===w.recording_id);ensure(found&&found.revision===w.revision&&found.original_sha256===w.source_sha256,'N11_WAVEFORM_SOURCE');const view=windowData(engine.store,who,config.crew_id,w.recording_id,{before:config.before,channel:w.channel,until_ms:Math.floor(found.meta.sample_count*1000/found.meta.sample_rate_hz),points:200},engine.state.now);waveform={status:view.status,source_hash:view.source_sha256,channel:view.channel,unit:view.unit,quality:view.quality,source_at:found.meta.start_at,revision:w.revision,scalar_injection:false,medical_features:'UNKNOWN_UNREVIEWED',window_hash:digest(view)};}
 if(config.source_run_id){const r=n09.replay(engine,who,config.source_run_id,{at:config.before,before:config.before,crew_id:config.crew_id});n09Run=runContext(r,n09.load(engine,config.source_run_id),config);}
 try{const r=project(engine.store,who,config.crew_id,{date:config.before.slice(0,10),before:config.before,days:7},engine.state.now);n10={status:'AVAILABLE',sleep:r.sleep,exercise:r.exercise,private_cognition:'EXCLUDED'};}catch(error){if(error.status!==403)throw error;}
 return {N07:source,N08:waveform,N09:n09Run,N10:n10,source_cutoff:config.before,known_at:new Date(engine.state.now).toISOString(),scope:'Synthetic shadow; context is not clinical support or additional training data'};
}

export function runContext(r,run,config){
 const c=r.frame?.crew.find(c=>c.id===config.crew_id),age=c?(Date.parse(config.before)-Date.parse(c.observed_at))/1000:null,fresh=age!==null&&Number.isFinite(age)&&age>=0&&age<=run.config.cadence_seconds*3&&c.quality==='good'&&c.confidence>=.7;
 return {status:fresh?r.status:'UNKNOWN',reason:fresh?null:'MISSING_STALE_OR_UNVERIFIED_CREW_SOURCE',crew_id:config.crew_id,run_id:r.run_id,frame_hash:r.frame?.hash??null,frame_at:r.frame?.source_at??null,source_at:c?.observed_at??null,age_seconds:age,quality:c?.quality??'UNKNOWN',confidence:c?.confidence??null,metric_quality:c?.metric_quality??null,provenance:c?Object.fromEntries(Object.entries(c.metric_observations??{}).map(([metric,o])=>[metric,{event_id:o.event_id,source:o.source,provenance:o.provenance}])):null,values:fresh?c.values:null,clinical_conclusion:null};
}
