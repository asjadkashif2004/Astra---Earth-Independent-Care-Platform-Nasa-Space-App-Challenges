import { performance } from 'node:perf_hooks';
import { CREW,METRICS,validateTelemetry } from '../../packages/contracts.mjs';
import { createBaselines } from '../telemetry-simulator/simulator.mjs';
import { generateSleep,lastSleepCompletion } from '../telemetry-simulator/sleep.mjs';
import { generatedCrew,baselineArchive,DEFINITION_HASH,DAY } from '../telemetry-simulator/n09-model.mjs';
import { POLICY as GROUPS } from '../telemetry-simulator/n09-evaluation.mjs';
import { evaluateCrew } from '../anomaly/detector.mjs';
import { POLICY,POLICY_HASH,KEYS,LIMIT,digest,ensure,validPoint } from './contracts.mjs';
import { fitReferences,featurePoint,ewma,fitForest,forestScore } from './algorithms.mjs';
const iso=n=>new Date(n).toISOString();
export function buildDataset(config,knownAt){
 const baselines=createBaselines(42017),anchor=Date.parse(config.before),trainAt=anchor-3*DAY,calibration=baselineArchive(baselines,trainAt),units=[];
 const generate=(part,crew,scenario,start,duration,cadence,seed)=>{
  const id=part+'-'+crew+'-'+scenario,unit={id,partition:part,crew_id:crew,scenario_id:scenario,start_at:iso(start),end_at:iso(start+duration*1000),cadence_seconds:cadence,frames:[],labels:[],synthetic:true};
  const run={id:'N11-'+id,config:{seed,cadence_seconds:cadence},start_at:start,completed_days:Object.fromEntries(CREW.map(c=>[c.id,[]])),frame_count:0};let sleep=generateSleep({seed,crewId:crew,baseline:baselines[crew].sleep_duration,endAt:lastSleepCompletion(start),knownAt:start,scenario:'nominal',historical:true});
  for(let sec=0;sec<=duration;sec+=cadence){const at=start+sec*1000;run.frame_count=unit.frames.length;const g=generatedCrew(run,{crew_id:crew,scenario_id:scenario,onset_seconds:0,elapsed_seconds:sec},baselines[crew],at,sleep);
   const values={sleep_duration:sleep.duration_hours};for(const raw of g.events){validateTelemetry(raw,at);values[raw.metric.name]=raw.metric.value;if(raw.sleep_session){sleep={...raw.sleep_session,duration_hours:raw.metric.value};run.completed_days[crew].push({quality:raw.quality.status,reference_hours:g.plan.reference_hours,observed_hours:raw.metric.value});}}
   const point={id:id+':'+sec,crew_id:crew,at:iso(at),known_at:knownAt,source_id:'SYN-N09-'+id,source_hash:digest(g.events),source_generator:'n09-source-time-v1',values,units:Object.fromEntries(Object.entries(METRICS).map(([k,m])=>[k,m.unit])),quality:g.events[0].quality,activity:g.activity,cadence_seconds:cadence,synthetic:true};
   unit.frames.push(point);unit.labels.push({at:point.at,class:g.truth.class,review:['authored_deviation','authored_longitudinal_deviation'].includes(g.truth.class),artifact:g.truth.class==='artifact',missing:g.truth.class==='dropout',authored:true,diagnosis:null});
  }unit.feature_hash=digest(unit.frames);unit.label_hash=digest(unit.labels);units.push(unit);
 };
 GROUPS.partitions.forEach((p,index)=>{for(const crew of p.crew)for(const scenario of p.scenarios)generate(p.name,crew,scenario,trainAt+index*DAY,600,30,(config.seed+p.seed)>>>0);});
 for(const crew of ['CREW-05','CREW-06'])generate('seen_robustness',crew,'nominal',anchor-DAY,86400,300,config.seed);
 const d={schema_version:'astra.n11.dataset.v1',source_type:'AUTHORED_SYNTHETIC',generator_hash:DEFINITION_HASH,known_at:knownAt,before:config.before,calibration,units,independence:'MECHANICALLY_DISJOINT_MAIN_PARTITIONS; seen robustness separately identified; no biological or scientific independence',N11_policy_hash:POLICY_HASH};d.hash=digest(d);validateDataset(d);return {dataset:d,baselines};
}
export function validateDataset(d){
 const {hash,...body}=d;ensure(hash===digest(body)&&d.generator_hash===DEFINITION_HASH&&d.N11_policy_hash===POLICY_HASH&&d.units.length===14,'N11_DATASET_INTEGRITY');
 let count=0;const ids=new Set(),crews=new Map(),scenarios=new Map();
 for(const u of d.units){ensure(!ids.has(u.id)&&u.feature_hash===digest(u.frames)&&u.label_hash===digest(u.labels)&&u.frames.length===u.labels.length,'N11_DATASET_DUPLICATE');ids.add(u.id);
  const group=GROUPS.partitions.find(p=>p.name===u.partition);ensure(u.partition==='seen_robustness'?['CREW-05','CREW-06'].includes(u.crew_id)&&u.scenario_id==='nominal':group?.crew.includes(u.crew_id)&&group.scenarios.includes(u.scenario_id),'N11_SPLIT');
  ensure(u.start_at===iso(Date.parse(d.before)-(group?3-GROUPS.partitions.indexOf(group):1)*DAY),'N11_SPLIT_TIME');
  if(group)for(const [map,key]of [[crews,u.crew_id],[scenarios,u.scenario_id]]){ensure(!map.has(key)||map.get(key)===u.partition,'N11_SPLIT_LEAKAGE');map.set(key,u.partition);}
  ensure(u.id===u.partition+'-'+u.crew_id+'-'+u.scenario_id&&u.frames.length===(group?21:289)&&u.cadence_seconds===(group?30:300)&&u.end_at===iso(Date.parse(u.start_at)+(group?600:86400)*1000),'N11_UNIT_SCHEMA');
  u.frames.forEach((p,i)=>{validPoint(p);ensure(p.id===u.id+':'+i*u.cadence_seconds&&p.source_id==='SYN-N09-'+u.id&&p.crew_id===u.crew_id&&p.at===iso(Date.parse(u.start_at)+i*u.cadence_seconds*1000)&&p.at<=d.before&&p.known_at===d.known_at&&Object.keys(p).every(k=>['id','crew_id','at','known_at','source_id','source_hash','source_generator','values','units','quality','activity','cadence_seconds','synthetic'].includes(k)),'N11_SOURCE_OR_LABEL_LEAK');ensure(u.labels[i].at===p.at,'N11_LABEL_ALIGNMENT');count++;});
 }ensure(count<=LIMIT.frames,'N11_FRAME_LIMIT');return {frames:count,partitions:{train:4,validation:4,test:4,seen_robustness:2},main_group_leakage:0,scientific_validation:'PENDING'};
}
const ratio=(n,d)=>d?n/d:null;
export function metrics(units,decisions,method,partition){
 const selected=units.filter(u=>partition==='all'||u.partition===partition);let tp=0,fp=0,tn=0,fn=0,unknown=0,episodes=0,covered=0,unscorable=0;const latencies=[],matrix=[];
 for(const u of selected){const rows=decisions.filter(r=>r.unit_id===u.id),onset=u.labels.find(l=>l.review)?.at;let first=null,previous=false,eligible=0,unitEpisodes=0;
  for(let i=0;i<rows.length;i++){const r=rows[i],out=r[method],active=out.status==='KNOWN'&&out.review;
   if(out.status==='UNKNOWN')unknown++;else{eligible++;if(i&&rows[i-1][method].status==='KNOWN')covered+=u.cadence_seconds;}
   if(active&&!previous){if(!onset||r.at<onset){episodes++;unitEpisodes++;}}
   if(active&&onset&&r.at>=onset&&!first)first=r.at;previous=active;
  }
  if(onset){if(first){tp++;latencies.push((Date.parse(first)-Date.parse(onset))/1000);}else fn++;}
  else if(!unitEpisodes&&eligible===rows.length)tn++;else if(!unitEpisodes)unscorable++;
  fp+=unitEpisodes;
  matrix.push({unit_id:u.id,scenario:u.scenario_id,partition:u.partition,expected_review:!!onset,observed_review:first!==null,false_alert_episodes:unitEpisodes,eligible_frames:eligible,latency_seconds:first?(Date.parse(first)-Date.parse(onset))/1000:null});
 }
 const days=covered/86400;return {method,partition,event_confusion:{tp,fp,tn,fn},precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn),false_alert_episodes:episodes,observed_crew_days:days,false_alerts_per_observed_crew_day:ratio(episodes,days),latency_seconds:latencies,unknown_frames:unknown,unscorable_negative_units:unscorable,scenario_matrix:matrix,denominator_note:'Eligible adjacent source samples at declared cadence, not proof of continuous sensing. Partly UNKNOWN negative units are unscorable, not true-negatives. FP counts unmatched alert episodes; post-onset detection deduplicates to one event. Latency starts at separate authored onset.'};
}
export async function execute(config,knownAt,progress=()=>{}){
 const begun=performance.now();progress('SOURCE_VALIDATION');const {dataset,baselines}=buildDataset(config,knownAt);const refs=fitReferences(dataset.calibration,iso(Date.parse(config.before)-3*DAY),config.excluded_indices);progress('REFERENCE_FIT');await new Promise(r=>setImmediate(r));
 const training=dataset.units.filter(u=>u.partition==='train').flatMap(u=>u.frames.map(p=>featurePoint(p,refs)).filter(f=>f.status==='KNOWN').map(f=>f.z));ensure(training.length>=12,'N11_INSUFFICIENT_TRAINING');const forest=fitForest(training,config.seed);progress('CANDIDATE_FIT');await new Promise(r=>setImmediate(r));
 const decisions=[],timings=[];let artifactTP=0,artifactFN=0,artifactFP=0,artifactTN=0,missingFP=0,missingTN=0;
 for(const u of dataset.units){let prior=null,ew=null,pending={};for(let i=0;i<u.frames.length;i++){
  const p=u.frames[i],label=u.labels[i],start=performance.now(),f=featurePoint(p,refs,prior);let e={status:'UNKNOWN',reason:f.reason,review:false},is={...e};
  if(f.status==='KNOWN'){ew=ewma(f.z,ew);e={status:'KNOWN',review:ew.review,score:ew.magnitude};const s=forestScore(forest,f.z);is={status:'KNOWN',review:s.review,score:s.score};}else ew=null;
  const n02=evaluateCrew({id:p.crew_id,values:p.values,observed_at:p.at,quality:p.quality.status,confidence:p.quality.confidence,artifact:p.quality.artifact,activity:p.activity},baselines[p.crew_id],Date.parse(p.at),pending);pending=n02.pending;
  const tier={status:n02.status==='gray'?'UNKNOWN':'KNOWN',review:n02.review,score:n02.uncertainty?.score??null};
  const row={unit_id:u.id,crew_id:p.crew_id,at:p.at,known_at:p.known_at,source_hash:p.source_hash,ewma:e,isolation_forest:is,tier_a:tier,quality:f.quality,contributors:f.contributors,clinical_diagnosis:null};decisions.push(row);timings.push(performance.now()-start);prior=p;
  if(f.quality.numeric_artifact!==null){if(label.artifact){if(f.quality.numeric_artifact)artifactTP++;else artifactFN++;}else if(f.quality.numeric_artifact)artifactFP++;else artifactTN++;}
  if(!label.missing){if(f.quality.missing_values)missingFP++;else missingTN++;}
 }await new Promise(r=>setImmediate(r));}
 progress('EVALUATED');const report={schema_version:'astra.n11.result.v1',policy:POLICY,policy_hash:POLICY_HASH,dataset,references:refs,models:{isolation_forest:forest,ewma:{version:'ewma-v1',alpha:POLICY.alpha,threshold:POLICY.ewma_limit,train_partition:'train',clinical_probability:null}},decisions,
  metrics:['tier_a','ewma','isolation_forest'].flatMap(m=>['train','validation','test','seen_robustness','all'].map(p=>metrics(dataset.units,decisions,m,p))),quality_metrics:{numeric_artifact_confusion:{tp:artifactTP,fn:artifactFN,fp:artifactFP,tn:artifactTN},artifact_recall:ratio(artifactTP,artifactTP+artifactFN),false_artifact_rate:ratio(artifactFP,artifactFP+artifactTN),false_sensor_failure_rate:ratio(missingFP,missingFP+missingTN),limitations:'Numeric rule is evaluated independently of declared flags; authored synthetic labels, not external sensor validation.'},
  performance:{total_ms:performance.now()-begun,inference_batches:timings.length,p95_batch_ms:[...timings].sort((a,b)=>a-b)[Math.floor(timings.length*.95)],maximum_observed_batch_ms:Math.max(...timings),target_ms:50,scope:'One fictional crew frame incl quality/EWMA/forest/TierA; includes model hash validation; observed CPU only'},
  model_cards:['ewma','isolation_forest'].map(method=>({method,policy_hash:POLICY_HASH,source_hash:dataset.hash,reference_hash:refs.hash,features:KEYS,training_units:dataset.units.filter(u=>u.partition==='train').map(u=>u.id),status:'NOT_PROMOTED',reason:'Synthetic shadow comparison only; actual metrics and rejected/promoted distinctions retained. Independent scientific/source/release acceptance pending.',clinical_validation:false})),
  temporal_extension:{status:'NOT_JUSTIFIED',reason:'No reviewed public-signal/generalization evidence or demonstrated requirement for a temporal model; simpler methods measured first.'},downstream:{schema_version:'astra.n11.shadow-evidence.v1',N12:'INACTIVE',N16:'INACTIVE',may_create_N02_alert:false},independent_scientific_review:'PENDING',clinical_conclusion:null};
 report.hash=digest(report);ensure(Buffer.byteLength(JSON.stringify(report))<=LIMIT.result,'N11_RESULT_LIMIT');return report;
}
