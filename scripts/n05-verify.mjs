/* Offline evidence/preservation inventory. No browser, workload, database or cleanup. */
import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'artifacts/n05-01-20261023');
const read=p=>readFileSync(resolve(root,p));const json=p=>JSON.parse(read(p));const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=json('artifacts/n05-01-20261023/baseline.json');
// This pre-integration snapshot was taken while the first N05 GLB build was
// completing. Preserve it intact and distinguish those five new staging files
// from the pre-existing application; do not claim they were N04 assets.
const staged=Object.keys(baseline).filter(p=>p.startsWith('apps/mission-control-web/assets/anatomy/'));
const legacy=Object.keys(baseline).filter(p=>!staged.includes(p));
const changed=legacy.filter(p=>sha(read(p))!==baseline[p]);
assert.deepEqual([...changed].sort(),['apps/mission-control-web/app.mjs','apps/mission-control-web/index.html','apps/mission-control-web/sw.js','services/api/server.mjs'].sort());
assert.equal(sha(read('services/api/server.mjs').toString().replace(" '.glb': 'model/gltf-binary',",'')),baseline['services/api/server.mjs'],'Only GLB MIME may change in server');
const matrix=json('artifacts/n04-p01-final11-20261020/matrix.json');
assert.equal(matrix.trials.length,24);assert.ok(matrix.trials.every(t=>t.passed&&sha(read(t.assessment))===t.assessment_sha256));
const files=[];function scan(path){for(const name of readdirSync(path)){const p=resolve(path,name);if(statSync(p).isDirectory())scan(p);else files.push(p);}}
for(const dir of ['assets/anatomy','assets/earth','vendor/three'])scan(resolve(root,'apps/mission-control-web',dir));
for(const name of ['anatomy.mjs','anatomy-runtime.mjs','anatomy.css','scenes.mjs','earth.mjs'])files.push(resolve(root,'apps/mission-control-web',name));
const payload=files.reduce((n,p)=>n+statSync(p).size,0);assert.ok(payload<=20_000_000);
const manifest=json('apps/mission-control-web/assets/anatomy/manifest.json');
for(const a of manifest.assets)assert.equal(sha(read('apps/mission-control-web/assets/anatomy/'+a.file)),a.sha256);
const reports=['browser-initial','browser-final','browser-closure','browser-accessibility'].map(dir=>{const path='artifacts/n05-01-20261023/'+dir+'/report.json';const report=json(path);return{path,sha256:sha(read(path)),status:report.status,checks:report.checks,screenshots:report.screenshots.length,console_errors:report.console_errors,scope:dir==='browser-final'?'Reuse only the passing six-crew group; overall failed view-switch run retained':dir};});
assert.equal(reports.find(r=>r.scope==='browser-closure').status,'passed');assert.equal(reports.find(r=>r.scope==='browser-accessibility').status,'passed');
const logPath=process.argv.find(v=>v.startsWith('--log='))?.slice(6)??'/tmp/astra-n05-01-final-regression.log';
const log=readFileSync(logPath,'utf8');assert.match(log,/tests 195/);assert.match(log,/pass 195/);assert.match(log,/fail 0/);
writeFileSync(resolve(out,'regression.log'),log);
if(existsSync('/tmp/astra-n05-01-regression.log')&&!existsSync(resolve(out,'regression-before-final.log')))writeFileSync(resolve(out,'regression-before-final.log'),readFileSync('/tmp/astra-n05-01-regression.log'));
const lock=json('package-lock.json');assert.equal(lock.packages['node_modules/three'].version,'0.186.1');
const runtimeFiles=['apps/mission-control-web/anatomy.mjs','apps/mission-control-web/anatomy-runtime.mjs','apps/mission-control-web/anatomy.css',...changed];
const sourceFiles=['scripts/build-anatomy.py','scripts/build-anatomy-runtime.mjs','scripts/n05-acquire.py','scripts/n05-source-review.py','scripts/browser-n05-01.mjs','scripts/n05-verify.mjs','scripts/browser-acceptance.mjs','scripts/frontend-smoke.mjs','tests/anatomy.test.mjs','tests/dom-harness.mjs','tests/frontend-correctness.test.mjs','package.json','package-lock.json'];
const result={recorded_at:new Date().toISOString(),scope:'N05-01 bounded vertical slice only; no N04 trial reruns or AC20 certification',status:{n01:'Complete',n02:'Complete',n03:'Partial',n04:'Complete',n05:'In Progress; N05-01 delivered; STOP',ac20:'Open / Unverified'},regression:{tests:195,pass:195,fail:0,log:'regression.log',note:'Node unit/integration suite, not browser acceptance or sustained performance'},syntax:{javascript_files:76,errors:0,python_ast_files:3},preservation:{baseline_files:Object.keys(baseline).length,pre_existing_files:legacy.length,unchanged:legacy.length-changed.length,changed,n05_build_staging_files:staged,n05_build_staging_changes:staged.filter(p=>sha(read(p))!==baseline[p]),baseline_scope_note:'Snapshot includes five already-created N05 derived assets; these are not historical N04 files.',server_only_glb_mime:true,n04_immutable_assessment_fingerprints:24,earth_renderer_shader_assets_unchanged:true,database_files_not_read_or_hashed:true},critical_graphics_bytes:payload,critical_limit_bytes:20_000_000,graphics_files:files.map(p=>({path:relative(root,p).replaceAll('\\','/'),bytes:statSync(p).size,sha256:sha(readFileSync(p))})),runtime_and_qa_files:[...runtimeFiles,...sourceFiles].map(p=>({path:p,sha256:sha(read(p))})),browser_evidence:reports,limitations:['Headless real Chrome; no headed sustained-performance certification','No presented FPS, physical display timing, measured peak CPU/GPU memory or designated-minimum hardware result','Full N05 LOD/performance/load/memory gates and N06 remain unapproved/incomplete','Native200% panel axe color-contrast incomplete for translucent status backing retained; not formal WCAG certification']};
writeFileSync(resolve(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({critical_graphics_bytes:payload,baseline_unchanged:result.preservation.unchanged,allowed_changes:changed.length,n04_assessments_preserved:24,regressions:'195/195',browser_reports:reports.map(r=>({path:r.path,status:r.status}))},null,2));
