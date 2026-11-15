// File-only final evidence validation. No database, application, model or network execution.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,readdirSync,statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join,dirname,resolve } from 'node:path';
import { digest,GEN,DEFINITION_HASH } from '../../services/telemetry-simulator/n09-model.mjs';
import { validateEvaluation } from '../../services/telemetry-simulator/n09-evaluation.mjs';
const root='artifacts/n09-engineering-20261031',json=f=>JSON.parse(readFileSync(join(root,f),'utf8')),sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex'),checks=[];
const check=(name,fn)=>{fn();checks.push({name,status:'PASS'});};
const baseline=json('preservation-before.json'),changes=json('changed-files.json'),allowed=new Set(changes.files.filter(f=>f.status==='modified').map(f=>f.path));
let preserved=0,changed=0,tableRows=0,exemptRows=0;
check('All prior hashes accounted for; only explicitly inventoried edits allowed',()=>{
 for(const [f,pin]of Object.entries(baseline.files)){const actual=sha(f);if(allowed.has(f)){assert.equal(changes.files.find(v=>v.path===f).before_sha256,pin);changed++;}else{assert.equal(actual,pin,f);preserved++;}}
 assert.equal(changed,18);assert.equal(preserved+changed,2981);
});
check('Exact changed file after-hashes and preserved originals verify',()=>{
 for(const f of changes.files){assert.equal(sha(f.path),f.after_sha256,f.path);if(f.status==='modified')assert.equal(sha(join(root,'originals',f.path.replaceAll('/','__'))),f.before_sha256,f.path);}
 assert.equal(changes.modified_count,18);assert.equal(changes.added_count,11);
});
check('Every unrelated authoritative status row preserved',()=>{
 for(const [f,rows]of Object.entries(baseline.tables)){const current=readFileSync(f,'utf8').split('\n');for(const row of rows){if(row.startsWith('| N09 ')){exemptRows++;continue;}assert.ok(current.includes(row),f+': '+row);tableRows++;}}
});
check('Final browser source pins match delivered executable files',()=>{for(const [f,pin]of Object.entries(json('pre-browser-05-code-pins.json')))assert.equal(sha(f),pin,f);});
check('Final combined QA counts and real-source skip remain explicit',()=>{
 const s=readFileSync(join(root,'qa-final-release.txt'),'utf8');for(const expected of ['tests 663','pass 662','fail 0','cancelled 0','skipped 1'])assert.ok(s.includes('ℹ '+expected),expected);assert.ok(s.includes('completed real originals,publisher checksums,manifest,card and subject-group policy verify offline'));assert.ok(s.includes('# SKIP'));
});
check('Syntax/import validation passed without executing modules',()=>{assert.match(readFileSync(join(root,'syntax-final-release.txt'),'utf8'),/226 JavaScript files parsed and local imports checked; 0 errors/);});
const cal=json('final-qa/calibration.json');
check('Actual authored calibration archive hash, period and all crew observations verify',()=>{
 const {hash,...body}=cal;assert.equal(digest(body),hash);assert.equal(cal.source,'AUTHORED_SYNTHETIC_CALIBRATION');assert.equal(cal.timebase.count,720);assert.equal(cal.timebase.period_seconds,3600);assert.equal(Object.keys(cal.crew).length,6);for(const metrics of Object.values(cal.crew))for(const metric of Object.values(metrics))assert.equal(metric.values.length,720);
});
const trace=json('final-qa/multiday-trace.json');
check('Executed multiday run checkpoint and every committed event hash/sequence verify',()=>{
 const {hash,...body}=trace.run;assert.equal(digest(body),hash);assert.equal(trace.run.definition_version,GEN);assert.equal(trace.run.definition_hash,DEFINITION_HASH);assert.equal(trace.run.status,'COMPLETED');assert.equal(trace.run.frame_count,121);assert.equal(trace.events.length,trace.run.event_count);let prior='GENESIS';for(const [i,v]of trace.events.entries()){const {hash,...body}=v;assert.equal(digest(body),hash);assert.equal(v.seq,i+1);assert.equal(v.previous_hash,prior);assert.ok(v.at<=v.known_at);prior=hash;}
});
check('Six-crew frames and separate labels bind actual multiday execution',()=>{const frames=trace.events.filter(e=>e.kind==='OBSERVATION'),labels=trace.events.filter(e=>e.kind==='AUTHORED_LABELS');assert.equal(frames.length,121);assert.equal(labels.length,121);for(const f of frames){assert.equal(f.payload.crew.length,6);assert.equal(new Set(f.payload.crew.map(c=>c.id)).size,6);}assert.ok(trace.run.completed_days['CREW-03'].length>=4);});
check('Mechanical split/evaluation packet passes actual validator; no model/independence claim',()=>{const result=validateEvaluation(json('final-qa/evaluation-contract.json'));assert.deepEqual(result,json('final-qa/evaluation-validation.json'));assert.equal(result.scientific_review,'PENDING');assert.equal(result.downstream_model_execution,false);});
check('Cold process recovered exact committed history with zero replay',()=>{const c=json('final-qa/cold-recovery.json');assert.equal(c.replayed_ticks,0);assert.equal(c.run.recovered_after_restart,true);assert.equal(c.observations,330);assert.match(c.hash,/^[0-9a-f]{64}$/);});
const browser=json('browser-05/report.json');
check('Real installed browser completed all required groups/viewports/keyboard checks',()=>{assert.equal(browser.status,'passed');assert.equal(browser.checks.length,12);assert.ok(browser.checks.every(c=>c.status==='passed'));assert.equal(browser.viewports.length,4);assert.equal(browser.N09_keyboard.length,12);assert.equal(browser.console_errors.length,0);assert.match(browser.browser.product,/Chrome\/156/);});
check('Browser restart and canonical correction preserve earlier frame without replay',()=>{assert.equal(browser.N09_recovery.frames,73);assert.equal(browser.N09_recovery.observation_count,4903);assert.equal(browser.N09_recovery.replayed_ticks,0);assert.equal(browser.N09_sleep_correction.revision,2);assert.equal(browser.N09_sleep_correction.earlier_replay_unchanged,true);});
check('Every real browser launch cleaned disposable application/profile/database resources',()=>{for(const n of ['01','02','03','04','05']){const c=json('browser-'+n+'/report.json').N09_cleanup;for(const key of ['application_closed','browser_exited','profile_removed','database_directory_removed'])assert.equal(c[key],true,n+': '+key);assert.equal(c.N16_designated_starts,0);assert.equal(c.model_executions,0);}});
check('Original failed browser and QA evidence remains failed',()=>{assert.equal(json('browser-01/report.json').status,'failed');assert.equal(json('browser-03/report.json').status,'failed');assert.match(readFileSync(join(root,'qa-first.txt'),'utf8'),/fail 2/);assert.match(readFileSync(join(root,'qa-final.txt'),'utf8'),/fail 1/);});
check('Finite fresh-process throughput measurement and no forbidden worker/model execution',()=>{const p=json('performance/resources.json');assert.ok(p.observations_per_second>=100);assert.ok(p.memory.rss>0&&p.database_bytes>0);assert.equal(p.N16_starts,0);assert.equal(p.model_executions,0);assert.equal(browser.N09_resources.N16_worker_starts,0);assert.equal(browser.N09_resources.model_executions,0);});
check('Local report/matrix/contract references resolve',()=>{
 for(const f of ['docs/N09_FINAL_ENGINEERING_COMPLETION.md','docs/N09_SYNTHETIC_CONTRACT.md','docs/DE_N09_SYNTHETIC_01.md']){const content=readFileSync(f,'utf8');for(const m of content.matchAll(/\]\(([^)]+)\)/g)){if(/^(?:https?:|#)/.test(m[1]))continue;const target=resolve(dirname(f),m[1].split('#')[0]);if(target===resolve(root,'final-validation.json'))continue;assert.ok(statSync(target).isFile(),f+': '+m[1]);}}
 const m=json('requirement-matrix.json');assert.equal(m.rows.length,10);assert.ok(m.rows.every(r=>r.synthetic_engineering_status==='PASS'&&r.full_formal_status==='EXTERNAL_GATES_OPEN'));assert.equal(m.formal_module_status,'In Progress');
});
const size=d=>readdirSync(d,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(join(d,e.name)):statSync(join(d,e.name)).size),0);
const result={schema_version:'astra.n09.final-validation.v1',status:'PASS',checks,protected_files:2981,preserved_unchanged:preserved,intended_modified:changed,added_source_test_governance_files:11,unrelated_authoritative_rows_preserved:tableRows,N09_rows_updated:exemptRows,artifact_bytes_before_final_manifests:size(root),source_scope:'Authored synthetic; no operational or sealed database accessed/rehash claimed',N16_native_starts:0,model_executions:0,external_acquisition:0,formal_N09:'In Progress',scientific_review:'PENDING',accounting:'662 distinct automated passes + 12 browser groups; file-integrity checks and repeated suites are separate overlapping evidence, not additional automated cases.'};
writeFileSync(join(root,'final-validation.json'),JSON.stringify(result,null,2)+'\n');
assert.equal(json('final-validation.json').status,'PASS'); // Own report link now resolves only after successful checks and actual write/readback.
writeFileSync(join(root,'unrelated-status-preservation.json'),JSON.stringify({status:'PASS',unrelated_rows_preserved:tableRows,N09_rows_updated:exemptRows,formal_N09:'In Progress',other_module_statuses:'UNCHANGED',independent_scientific_medical_reviews:'UNCHANGED/PENDING',N15_rule:'INACTIVE',N15_experimental_prompt:'UNPROMOTED'},null,2)+'\n');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
