import { METRICS } from '../../packages/contracts.mjs';
import { POLICY,KEYS,ensure,verify,validPoint,sealed,iso,utc } from './contracts.mjs';
export const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
export const median=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n?n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2:null;};
export function reference(values,before,sourceHash){ensure(Array.isArray(values)&&values.length>=12&&values.every(Number.isFinite)&&utc(before),'N12_REFERENCE');const center=mean(values),sd=Math.sqrt(values.reduce((n,v)=>n+(v-center)**2,0)/(values.length-1));ensure(sd>0,'N12_REFERENCE_VARIANCE');return sealed({schema_version:'astra.n12.reference.v1',center,sd,count:values.length,before,source_hash:sourceHash,formula:'sample mean and sample SD (n-1); authored same-person history',clinical:false});}
export function windowAt(points,crew,metric,issue,ref){
 ensure(KEYS.includes(metric)&&utc(issue),'N12_FORECAST_ARGUMENTS');verify(ref);ensure(ref.before<issue,'N12_REFERENCE_FUTURE');
 const latest=new Map(),seen=new Set();let last=null;
 for(const p of points){validPoint(p);ensure(p.crew_id===crew,'N12_CROSS_CREW',403);const key=p.at+':'+p.revision;ensure(!seen.has(key),'N12_DUPLICATE');seen.add(key);ensure(last===null||p.at>=last,'N12_ORDER');last=p.at;
  if(p.at>issue||p.known_at>issue)continue;
  const old=latest.get(p.at);if(p.revision===2)ensure(points.some(o=>o.at===p.at&&o.hash===p.supersedes&&o.revision===1),'N12_CORRECTION_LINEAGE');if(!old||old.revision<p.revision)latest.set(p.at,p);
 }
 const known=[...latest.values()],eligible=known.filter(p=>Date.parse(p.at)>=Date.parse(issue)-POLICY.window_minutes*60000),good=eligible.filter(p=>p.values[metric]!==null&&p.quality.status==='good'&&p.quality.confidence>=POLICY.min_confidence&&!p.quality.artifact),unknown=reason=>({status:'UNKNOWN',reason,points:eligible,coverage:good.length/POLICY.points,record_coverage:eligible.length/POLICY.points});
 if(known.length&&(Date.parse(issue)-Date.parse(known.at(-1).at))/1000>POLICY.max_age_seconds)return unknown('STALE_SOURCE');
 if(eligible.length!==POLICY.points)return unknown('INSUFFICIENT_OR_GAPPED_HISTORY');
 for(let i=0;i<eligible.length;i++){const p=eligible[i];if(i&&Date.parse(p.at)-Date.parse(eligible[i-1].at)!==60000)return unknown('IRREGULAR_CADENCE');if(p.values[metric]===null||p.quality.status!=='good'||p.quality.confidence<POLICY.min_confidence||p.quality.artifact)return unknown('MISSING_OR_UNVERIFIED_QUALITY');}
 const age=(Date.parse(issue)-Date.parse(eligible.at(-1).at))/1000;if(age<0||age>POLICY.max_age_seconds)return unknown('STALE_SOURCE');
 const z=(eligible.at(-1).values[metric]-ref.center)/ref.sd;if(Math.abs(z)>POLICY.domain_sd)return unknown('OUTSIDE_AUTHORED_REFERENCE_DOMAIN');
 return {status:'KNOWN',reason:null,points:eligible,coverage:1,age_seconds:age,current_z:z};
}
export function estimate(points,metric,method,horizon){
 ensure(POLICY.methods.includes(method)&&POLICY.horizons.includes(horizon)&&points.length===POLICY.points,'N12_ESTIMATOR');
 const y=points.map(p=>p.values[metric]),x=points.map(p=>(Date.parse(p.at)-Date.parse(points[0].at))/60000);let slope=0,intercept=y.at(-1);
 if(method==='linear'){const mx=mean(x),my=mean(y);slope=x.reduce((n,v,i)=>n+(v-mx)*(y[i]-my),0)/x.reduce((n,v)=>n+(v-mx)**2,0);intercept=my-slope*mx;}
 if(method==='robust'){const slopes=[];for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++)slopes.push((y[j]-y[i])/(x[j]-x[i]));slope=median(slopes);intercept=median(y.map((v,i)=>v-slope*x[i]));}
 const value=method==='persistence'?y.at(-1):intercept+slope*(x.at(-1)+horizon);ensure(Number.isFinite(value),'N12_NONFINITE_ESTIMATE');return {value,slope_per_minute:slope};
}
export function radius(errors){ensure(errors.length>=POLICY.min_calibration&&errors.every(v=>Number.isFinite(v)&&v>=0),'N12_CALIBRATION');const s=[...errors].sort((a,b)=>a-b),rank=Math.ceil((s.length+1)*POLICY.coverage_target);ensure(rank<=s.length,'N12_CALIBRATION_RANK');return {radius:s[rank-1],n:s.length,rank,target:POLICY.coverage_target};}
export function predict({points,crew,metric,issue,horizon,method,ref,calibration,model,sourceHash}){
 ensure(KEYS.includes(metric)&&POLICY.methods.includes(method)&&POLICY.horizons.includes(horizon)&&utc(issue),'N12_FORECAST_ARGUMENTS');
 verify(model);ensure(model.method===method&&model.metric===metric&&model.horizon_minutes===horizon&&model.available_at<issue&&model.input_schema==='astra.n12.point.v1','N12_MODEL_VERSION');
 const w=windowAt(points,crew,metric,issue,ref),base={schema_version:'astra.n12.forecast.v1',crew_id:crew,metric,unit:METRICS[metric].unit,issue_at:issue,target_at:iso(Date.parse(issue)+horizon*60000),horizon_minutes:horizon,method,model_hash:model.hash,reference_hash:ref.hash,source_hash:sourceHash,observations:w.points.map(p=>({at:p.at,known_at:p.known_at,value:p.values[metric],quality:p.quality,revision:p.revision,hash:p.hash})),coverage:w.coverage,synthetic:true,source_type:'HISTORICAL_AUTHORED_SYNTHETIC_BACKTEST',clinical_conclusion:null,may_create_N02_alert:false};
 if(w.status==='UNKNOWN')return sealed({...base,status:'UNKNOWN',reason:w.reason,estimate:null,uncertainty:null,trajectory:{status:'UNKNOWN'}});
 if(model.selection_available_at&&model.selection_available_at>=issue)return sealed({...base,status:'UNKNOWN',reason:'MODEL_SELECTION_NOT_YET_AVAILABLE',estimate:null,uncertainty:null,trajectory:{status:'UNKNOWN'}});
 if(model.selection==='REJECTED_FOR_ADDITIONAL_USE')return sealed({...base,status:'UNKNOWN',reason:'REJECTED_MODEL',estimate:null,uncertainty:null,trajectory:{status:'UNKNOWN'}});
 verify(calibration);ensure(calibration.available_at<issue&&calibration.model_hash===model.hash&&calibration.metric===metric&&calibration.horizon_minutes===horizon&&calibration.n>=POLICY.min_calibration&&Number.isFinite(calibration.radius)&&calibration.radius>=0,'N12_CALIBRATION_BINDING');
 const e=estimate(w.points,metric,method,horizon),lo=e.value-calibration.radius,hi=e.value+calibration.radius,z=(e.value-ref.center)/ref.sd;
 if(e.value<METRICS[metric].range[0]||e.value>METRICS[metric].range[1])return sealed({...base,status:'UNKNOWN',reason:'EXTRAPOLATION_OUT_OF_BOUNDS',estimate:null,uncertainty:null,trajectory:{status:'UNKNOWN'}});
 return sealed({...base,status:'AVAILABLE',reason:null,estimate:e.value,personal_baseline_sd:z,slope_per_minute:e.slope_per_minute,uncertainty:{lower:lo,upper:hi,personal_sd_lower:(lo-ref.center)/ref.sd,personal_sd_upper:(hi-ref.center)/ref.sd,calibration_hash:calibration.hash,n:calibration.n,nominal_target:POLICY.coverage_target,interpretation:'Calibration-only absolute residual interval; real-world coverage UNVERIFIED; not a clinical probability'},trajectory:{status:Math.abs(z)>2?'PROJECTED_REFERENCE_DEVIATION':'NO_PROJECTED_REFERENCE_CROSSING',current_sd:w.current_z,target_sd:z,reference_band:2,meaning:'Authored descriptive band; absence is not medical safety',actual_N02_event:false}});
}
