import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBaselines } from '../services/telemetry-simulator/simulator.mjs';
import { buildEvaluation,validateEvaluation } from '../services/telemetry-simulator/n09-evaluation.mjs';
import { digest } from '../services/telemetry-simulator/n09-model.mjs';
const build=()=>buildEvaluation(createBaselines(42017));
test('G5/G10 actual deterministic producer dataset rebuilds with disjoint crew/scenario/time groups',()=>{
 const p=build(),v=validateEvaluation(p);assert.deepEqual(build(),p);assert.equal(v.units,12);assert.equal(v.source_group_leakage,0);assert.equal(v.feature_label_leakage,0);assert.equal(p.downstream.model_executed,false);assert.notDeepEqual(p.units[0].features,p.units[1].features);
 if(process.env.ASTRA_N09_EVIDENCE){writeFileSync(join(process.env.ASTRA_N09_EVIDENCE,'evaluation-contract.json'),JSON.stringify(p,null,2));writeFileSync(join(process.env.ASTRA_N09_EVIDENCE,'evaluation-validation.json'),JSON.stringify(v,null,2));}
});
for(const [name,mutate]of [
 ['wrong version',p=>p.generator_version='other'],['changed policy',p=>p.policy.cadence_seconds=1],['missing unit',p=>p.units.pop()],['duplicate group',p=>p.units[4].crew_id=p.units[0].crew_id],['scenario contamination',p=>p.units[4].scenario_id=p.units[0].scenario_id],['future sample',p=>p.units[0].features[0].source_at='2027-01-01T00:00:00.000Z'],['label leak',p=>p.units[0].features[0].label='nominal'],['hidden observation label',p=>p.units[0].features[0].observations[0].expected_severity='red'],['mismatched hash',p=>p.hash='0'.repeat(64)]
])test('G10 split/evaluation rejects '+name,()=>{const p=build();mutate(p);if(name!=='mismatched hash'){for(const u of p.units){u.feature_hash=digest(u.features);u.label_hash=digest(u.labels);}const {hash,...body}=p;p.hash=digest(body);}assert.throws(()=>validateEvaluation(p));});
test('G10 authored labels can change only outside inference features; accept-all and reject-all fail controls',()=>{
 const p=build(),features=digest(p.units.map(u=>u.features));p.units[0].labels[0].class='changed_author_annotation';assert.equal(digest(p.units.map(u=>u.features)),features);
 const qualify=fn=>{try{fn(build());const bad=build();bad.hash='bad';try{fn(bad);return false;}catch{return true;}}catch{return false;}};assert.equal(qualify(validateEvaluation),true);assert.equal(qualify(()=>({status:'PASS'})),false);assert.equal(qualify(()=>{throw Error('all');}),false);
});
