import { CREW,METRICS } from '../../packages/contracts.mjs';
import { GEN,DEFINITION_HASH,digest,generatedCrew,check } from './n09-model.mjs';
// Frozen mechanical partitions for a producer contract, never model training or held-out clinical evidence.
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const POLICY=freeze({version:'n09-authored-disjoint-v1',cadence_seconds:30,frames:11,partitions:[
 {name:'train',crew:['CREW-01','CREW-02'],scenarios:['nominal','post-exercise'],at:'2026-11-14T11:00:00.000Z',seed:81},
 {name:'validation',crew:['CREW-03','CREW-04'],scenarios:['sensor-dropout','contradictory-sensors'],at:'2026-11-15T11:00:00.000Z',seed:902},
 {name:'test',crew:['CREW-05','CREW-06'],scenarios:['cardiorespiratory-drift','controlled-hr-rise'],at:'2026-11-16T11:00:00.000Z',seed:713}
]});
export function buildEvaluation(baselines){
 const units=[];
 for(const part of POLICY.partitions)for(const crew of part.crew)for(const scenario of part.scenarios){
  const unit={id:part.name+'-'+crew+'-'+scenario,partition:part.name,crew_id:crew,scenario_id:scenario,seed:part.seed,source_start_at:part.at,source_end_at:new Date(Date.parse(part.at)+300000).toISOString(),features:[],labels:[]};
  const run={id:'EVAL-'+unit.id,config:{seed:part.seed,cadence_seconds:30},start_at:Date.parse(part.at),completed_days:Object.fromEntries(CREW.map(c=>[c.id,[]])),frame_count:0};
  for(let index=0;index<POLICY.frames;index++){
   run.frame_count=index;const at=run.start_at+index*30000,g=generatedCrew(run,{crew_id:crew,scenario_id:scenario,onset_seconds:0,elapsed_seconds:index*30},baselines[crew],at,null);
   unit.features.push({source_at:new Date(at).toISOString(),activity:g.activity,observations:g.events.map(e=>({metric:e.metric.name,value:e.metric.value,unit:e.metric.unit,quality:e.quality}))});
   unit.labels.push({source_at:new Date(at).toISOString(),...g.truth});
  }
  unit.feature_hash=digest(unit.features);unit.label_hash=digest(unit.labels);units.push(unit);
 }
 const result={schema_version:'astra.n09.evaluation-contract.v1',source_type:'AUTHORED_SYNTHETIC',generator_version:GEN,definition_hash:DEFINITION_HASH,policy:structuredClone(POLICY),units,downstream:{N11:'INACTIVE',N12:'INACTIVE',model_executed:false},scientific_independence:'NOT_ESTABLISHED',limitations:['Fictional crew/time/scenario identifiers are mechanically disjoint, not independent real biological cohorts.','These cases and generator are inspected engineering controls; no scientific generalization, clinical accuracy or fitted-model score is claimed.']};result.hash=digest(result);return result;
}
export function validateEvaluation(packet){
 check(packet?.schema_version==='astra.n09.evaluation-contract.v1'&&packet.generator_version===GEN&&packet.definition_hash===DEFINITION_HASH&&digest(packet.policy)===digest(POLICY),'N09_EVAL_POLICY');
 const {hash,...body}=packet;check(hash===digest(body)&&packet.units.length===12,'N09_EVAL_INTEGRITY');
 const groups={crew:new Map(),scenario:new Map()},hashes=new Set();
 for(const u of packet.units){const p=POLICY.partitions.find(p=>p.name===u.partition);check(p&&p.crew.includes(u.crew_id)&&p.scenarios.includes(u.scenario_id)&&u.source_start_at===p.at&&u.seed===p.seed&&u.source_end_at===new Date(Date.parse(p.at)+300000).toISOString(),'N09_EVAL_MEMBERSHIP');
  for(const [type,value]of [['crew',u.crew_id],['scenario',u.scenario_id]]){check(!groups[type].has(value)||groups[type].get(value)===u.partition,'N09_EVAL_LEAKAGE');groups[type].set(value,u.partition);}
  check(!hashes.has(u.feature_hash)&&u.feature_hash===digest(u.features)&&u.label_hash===digest(u.labels)&&u.features.length===11&&u.labels.length===11,'N09_EVAL_DUPLICATE');hashes.add(u.feature_hash);
  for(const [index,f]of u.features.entries())check(f.source_at===new Date(Date.parse(p.at)+index*30000).toISOString()&&!['scenario_id','truth','expected','label','diagnosis'].some(k=>Object.hasOwn(f,k))&&f.observations.length===9&&new Set(f.observations.map(o=>o.metric)).size===9&&f.observations.every(o=>Object.keys(o).every(k=>['metric','value','unit','quality'].includes(k))&&METRICS[o.metric]?.unit===o.unit&&['good','suspect','missing'].includes(o.quality.status)&&(o.quality.status==='missing'?o.value===null:Number.isFinite(o.value)&&o.value>=METRICS[o.metric].range[0]&&o.value<=METRICS[o.metric].range[1])),'N09_EVAL_LABEL_FEATURE_LEAK');
 }
 return {status:'PASS',units:12,frames:132,crew_groups:6,scenarios:6,partitions:{train:4,validation:4,test:4},source_group_leakage:0,feature_label_leakage:0,scientific_review:'PENDING',downstream_model_execution:false};
}
