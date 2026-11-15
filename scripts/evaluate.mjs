import { mkdirSync, writeFileSync } from 'node:fs';
import { createBaselines, simulate } from '../services/telemetry-simulator/simulator.mjs';
import { evaluateCrew } from '../services/anomaly/detector.mjs';
import { forecast } from '../services/prediction/forecast.mjs';
import { EPOCH } from '../packages/contracts.mjs';

const seeds=[73,817,1201,3407,99991];
const scenarios=['nominal','post-exercise','sleep-debt-cardio-drift','cardiorespiratory-drift','sensor-dropout','contradictory-sensors'];
const results=[];let tp=0,fp=0,tn=0,fn=0;
for(const seed of seeds){
  const baselines=createBaselines(seed);
  for(const scenario of scenarios){
    let pending={},first=null,firstRed=null,gray=false;
    for(let elapsed=0;elapsed<=600;elapsed+=10){
      const sample=simulate({seed,tick:elapsed/10,elapsed,now:EPOCH+elapsed*1000,scenario,runId:'held-out-eval',baselines,cadenceSeconds:10});
      const c=sample.crew[2];const output=evaluateCrew(c,baselines[c.id],EPOCH+elapsed*1000,pending);pending=output.pending;
      if(output.review&&first===null)first=elapsed;if(output.status==='red'&&firstRed===null)firstRed=elapsed;
      gray ||= output.status==='gray';
    }
    const expectedPositive=['sleep-debt-cardio-drift','cardiorespiratory-drift'].includes(scenario);
    if(expectedPositive){if(first!==null)tp++;else fn++;}else{if(first!==null)fp++;else tn++;}
    results.push({seed,scenario,expected_medical_review:expectedPositive,first_review_seconds:first,first_priority_seconds:firstRed,gray_observed:gray});
  }
}
const errors=[];let coverage=0;
for(const seed of seeds){
  const baselines=createBaselines(seed);
  for(const window of [0,60,120,180,240]){
    const points=[];
    for(let i=0;i<60;i++){
      const tick=window+i;const s=simulate({seed,tick,elapsed:tick*30,now:EPOCH+tick*30_000,scenario:'nominal',runId:'forecast-eval',baselines,cadenceSeconds:30});
      points.push({ts:new Date(EPOCH+tick*30_000).toISOString(),quality:s.crew[2].quality,values:s.crew[2].values});
    }
    const f=forecast(points,'heart_rate',30);const futureTick=window+119;
    const future=simulate({seed,tick:futureTick,elapsed:futureTick*30,now:EPOCH+futureTick*30_000,scenario:'nominal',runId:'forecast-eval',baselines,cadenceSeconds:30}).crew[2].values.heart_rate;
    errors.push(Math.abs(f.estimate-future));if(future>=f.lower&&future<=f.upper)coverage++;
  }
}
const report={scope:'Frozen synthetic demonstrations only; no clinical validity or generalization claim',seeds,scenario_runs:results.length,
  event_confusion_matrix:{true_positive:tp,false_positive:fp,true_negative:tn,false_negative:fn},event_precision:tp/(tp+fp),event_recall:tp/(tp+fn),
  main_scenario_detection_seconds:results.filter(r=>r.scenario==='sleep-debt-cardio-drift').map(r=>r.first_review_seconds),
  forecast:{samples:errors.length,horizon_minutes:30,mae_bpm:errors.reduce((a,b)=>a+b,0)/errors.length,empirical_interval_coverage:coverage/errors.length,calibration_scope:'separate seeds and crew; nominal synthetic generator only',limitation:'Small synthetic nominal evaluation with overlapping windows; not clinical or broad interval validation.'},results};
mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});writeFileSync(new URL('../artifacts/synthetic-evaluation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined},null,2));
if(fn||fp||coverage/errors.length<.9)process.exitCode=1;
