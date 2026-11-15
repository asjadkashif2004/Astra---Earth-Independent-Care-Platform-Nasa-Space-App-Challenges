import { METRICS } from '../../packages/contracts.mjs';
import { median,random,baselineFrom } from '../telemetry-simulator/simulator.mjs';
import { KEYS,POLICY,digest,ensure,validPoint } from './contracts.mjs';
export function fitReferences(cal,before,excluded=[]){
 const {hash,...body}=cal;ensure(hash===digest(body)&&cal.schema_version==='astra.n09.calibration.v1'&&cal.source==='AUTHORED_SYNTHETIC_CALIBRATION','N11_REFERENCE_SOURCE');
 const stop=Date.parse(before),start=Date.parse(cal.timebase.start_at);ensure(Number.isFinite(stop)&&cal.timebase.count===720&&cal.timebase.period_seconds===3600&&start+719*3600000<stop,'N11_REFERENCE_FUTURE');
 const crew={};for(const [id,metrics]of Object.entries(cal.crew)){crew[id]={};for(const [key,m]of Object.entries(METRICS)){
  const values=metrics[key]?.values;ensure(Array.isArray(values)&&values.length===720&&metrics[key].unit===m.unit,'N11_REFERENCE_SCHEMA');
  const eligible=values.map((value,index)=>({value,index,at:new Date(start+index*3600000).toISOString()})).filter(v=>!excluded.includes(v.index)&&Number.isFinite(v.value)&&v.value>=m.range[0]&&v.value<=m.range[1]&&Date.parse(v.at)<stop);
  crew[id][key]=eligible.length>=POLICY.minimum_reference?{...baselineFrom(eligible.map(v=>v.value),m.scale*.5),version:'n11-reference-v1',unit:m.unit,eligible_count:eligible.length,excluded_indices:values.map((_,i)=>i).filter(i=>!eligible.some(v=>v.index===i)),trained_through:eligible.at(-1).at}:null;
 }}const r={schema_version:'astra.n11.reference.v1',calibration_hash:hash,before,excluded_indices:excluded,crew,clinical_validation:false};r.hash=digest(r);return r;
}
export function featurePoint(p,refs,previous=null){
 validPoint(p);const b=refs.crew[p.crew_id];ensure(b,'N11_REFERENCE_CREW');
 const complete=KEYS.every(k=>p.values[k]!==null&&b[k]?.scale>0),z=complete?KEYS.map(k=>(p.values[k]-b[k].center)/b[k].scale):null;
 const artifact=z&&p.activity==='rest'&&Math.abs(z[0])>10&&Math.abs(z[3])<1;
 const missing=Object.values(p.values).some(v=>v===null),quality={numeric_artifact:complete?!!artifact:null,missing_values:missing,declared:p.quality.status,interpretation:'Narrow numeric consistency heuristic; not a validated artifact classifier'};
 let reason=null;
 if(!complete||missing)reason='MISSING_VALUE_OR_REFERENCE';else if(p.quality.status!=='good'||p.quality.artifact||p.quality.confidence<.7||artifact)reason='UNVERIFIED_QUALITY';
 else if(['exercise','exercise_recovery'].includes(p.activity))reason='RESTING_CONTEXT_EXCLUDED';
 else if(previous&&(p.at<=previous.at||Date.parse(p.at)-Date.parse(previous.at)>p.cadence_seconds*3000||p.source_id!==previous.source_id))reason='TIME_OR_SOURCE_GAP';
 return {status:reason?'UNKNOWN':'KNOWN',reason,z:reason?null:z,quality,contributors:reason?[]:KEYS.map((metric,i)=>({metric,value:p.values[metric],unit:METRICS[metric].unit,center:b[metric].center,scale:b[metric].scale,deviation:z[i],source_at:p.at,reference_hash:refs.hash})).sort((a,b)=>Math.abs(b.deviation)-Math.abs(a.deviation)).slice(0,3)};
}
export function ewma(z,prior=null){ensure(Array.isArray(z)&&z.length===KEYS.length&&z.every(Number.isFinite),'N11_EWMA_INPUT');const mean=z.map((v,i)=>POLICY.alpha*v+(1-POLICY.alpha)*(prior?.mean[i]??0));const magnitude=Math.max(...mean.map(Math.abs)),streak=magnitude>=POLICY.ewma_limit?(prior?.streak??0)+1:0;return {mean,magnitude,streak,review:streak>=POLICY.persistence,clinical_probability:null};}
export const averagePath=n=>{if(n<=1)return 0;let h=0;for(let k=1;k<n;k++)h+=1/k;return 2*h-2*(n-1)/n;};
export function fitForest(rows,seed){
 ensure(Array.isArray(rows)&&rows.length>=12&&rows.length<=256&&rows.every(r=>Array.isArray(r)&&r.length===KEYS.length&&r.every(Number.isFinite)),'N11_FOREST_ROWS');
 const rng=random(seed),sample=Math.min(POLICY.sample,rows.length),maxDepth=Math.ceil(Math.log2(sample)),build=(data,depth)=>{
  if(data.length<=1||depth>=maxDepth)return {size:data.length};
  const eligible=KEYS.map((_,i)=>({i,min:Math.min(...data.map(r=>r[i])),max:Math.max(...data.map(r=>r[i]))})).filter(v=>v.min<v.max);
  if(!eligible.length)return {size:data.length};const d=eligible[Math.floor(rng()*eligible.length)],split=d.min+rng()*(d.max-d.min),left=data.filter(r=>r[d.i]<split),right=data.filter(r=>r[d.i]>=split);
  if(!left.length||!right.length)return {size:data.length};return {feature:d.i,split,left:build(left,depth+1),right:build(right,depth+1)};
 };
 const trees=Array.from({length:POLICY.trees},()=>{const copy=rows.map(r=>[...r]);for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return build(copy.slice(0,sample),0);});
 const model={schema_version:'astra.n11.isolation-forest.v1',seed,sample,max_depth:maxDepth,trees,feature_names:KEYS,threshold:POLICY.forest_limit,train_hash:digest(rows),clinical_validation:false};model.hash=digest(model);return model;
}
export function forestScore(model,row){
 const {hash,...body}=model;ensure(hash===digest(body)&&model.trees.length===32&&digest(model.feature_names)===digest(KEYS)&&Array.isArray(row)&&row.length===KEYS.length&&row.every(Number.isFinite),'N11_FOREST_INTEGRITY');
 const path=(tree,depth=0)=>{ensure(depth<=POLICY.depth,'N11_FOREST_DEPTH');if(Object.hasOwn(tree,'size')){ensure(Number.isSafeInteger(tree.size)&&tree.size>=0&&tree.size<=model.sample,'N11_FOREST_LEAF');return depth+averagePath(tree.size);}ensure(Number.isSafeInteger(tree.feature)&&tree.feature>=0&&tree.feature<KEYS.length&&Number.isFinite(tree.split),'N11_FOREST_NODE');return path(row[tree.feature]<tree.split?tree.left:tree.right,depth+1);};
 const score=2**(-model.trees.reduce((n,t)=>n+path(t),0)/model.trees.length/averagePath(model.sample));return {score,review:score>=model.threshold,clinical_probability:null};
}
