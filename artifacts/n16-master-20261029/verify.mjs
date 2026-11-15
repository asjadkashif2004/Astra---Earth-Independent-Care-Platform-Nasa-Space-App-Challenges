// File-only postflight verification. No SQLite/model/worker/source-data interfaces.
import { readFile,writeFile,readdir,mkdir,lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha,stable } from '../../services/agent/read-contract.mjs';
import { allocated,atomicRecord } from '../../services/agent/master-storage.mjs';
import { reconcileResourceJournal } from '../../services/agent/resource-journal.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url)),out=join(project,'artifacts/n16-master-20261029'),native=join(out,'native');
const read=async p=>readFile(p.startsWith('/')?p:join(project,p));
const json=async p=>JSON.parse((await read(p)).toString());
const assert=(ok,why)=>{if(!ok)throw Error(why);};
const before=await json(join(out,'preservation-before.json'));
const governance=Object.keys(before.governance),changed=[];
for(const [p,h] of Object.entries(before.files)){
  assert(/\.(?:mjs|js|py|md|txt|json|jsonl|html|css)$/.test(p),'NO_DATABASE_READS_IN_PRESERVATION');
  if(sha(await read(p))!==h)changed.push(p);
}
assert(changed.every(p=>p==='scripts/check.mjs'||governance.includes(p)),'UNEXPECTED_OLD_FILE_CHANGE');
assert(changed.includes('scripts/check.mjs'),'CHECKER_DIFF_MISSING');
const tableChanges=[];
for(const [p,old] of Object.entries(before.tables)){
  const rows=(await read(p)).toString().split('\n').filter(x=>x.startsWith('|'));
  assert(rows.length===old.length,'TABLE_ROWS_CHANGED');
  for(let i=0;i<old.length;i++)if(rows[i]!==old[i]){
    assert(p==='docs/MASTER_PLAN.md'||p==='docs/MODULE_TRACKER.md','UNRELATED_TABLE_CHANGE');
    assert(rows[i].startsWith('| N16 ')&&old[i].startsWith('| N16 ')&&rows[i].includes('In Progress'),'STATUS_CHANGE');
    if(p==='docs/MASTER_PLAN.md')assert(rows[i].split('|')[3]===old[i].split('|')[3],'PREREQUISITES_CHANGED');
    tableChanges.push({path:p,before:old[i],after:rows[i]});
  }
}
assert(tableChanges.length===2,'TABLE_CHANGE_SCOPE');
const plan=await json(join(out,'code-plan.json'));
// Preserve exact executed revision2. Three files have known QA-only postflight
// edits; reconstruct those bytes and verify their PRIOR frozen digests, never a PASS.
const snapshot=join(native,'attempt-02','frozen-code');await mkdir(snapshot,{recursive:true});
await writeFile(join(native,'attempt-02/frozen-code-plan.json'),await read(join(out,'code-plan.json')));
const reconstructed=[];
for(const [p,h] of Object.entries(plan.code_pins)){
  let b=await read(p);
  if(sha(b)!==h){
    let text=b.toString();
    if(p==='scripts/n16-master-demo.mjs')text=text.replace("  let closure;try{closure=await readRecord(NATIVE,'mission-closed.json');}catch(e){if(e.code!=='ENOENT')throw e;}\n  check(!closure,'MISSION_AUTHORITY_EXPIRED');\n",'');
    else if(p==='services/agent/master-supervisor.mjs')text=text.replace("      SQL_open_attempts:sql,native_wall_ms:started!==null&&ended!==null?ended-started:null,observer_pending:sampleBusy?1:0,\n",'');
    else if(p==='tests/n16-master.test.mjs'){
      const start=text.indexOf("test('risk step with a second SELECT compiler callback");
      const end=text.indexOf("test('missing baseline",start);assert(start>=0&&end>start,'RECONSTRUCT_TEST');
      text=text.slice(0,start)+text.slice(end);
      const expiry=text.indexOf("test('closed mission refuses execution");
      assert(expiry>0,'RECONSTRUCT_EXPIRY_TEST');text=text.slice(0,expiry);
    }else throw Error('UNEXPECTED_POSTFLIGHT_CODE_DIFF:'+p);
    b=Buffer.from(text);assert(sha(b)===h,'EXECUTED_REVISION_RECOVERY_HASH:'+p);reconstructed.push(p);
  }
  await writeFile(join(snapshot,p.replaceAll('/','__')),b);
}
const budget=await json(join(native,'startup-budget.json'));
assert(budget.maximum===12&&budget.reservations.length===5&&budget.halted==='UNAUTHORIZED_SQL','NATIVE_BUDGET');
const uniqueJournals=new Set(),seenPids=new Map(),calls=[];
let rowsTotal=0,samplesTotal=0,eventsTotal=0,maxRSS=0,maxDisk=0,kernelSuccessful=0;
for(const attempt of ['attempt-01','attempt-02']){
  const parent=await json(join(native,attempt,'outcome.json'));
  assert(parent.status==='FAILED'&&parent.recovery.status==='COMPLETE'&&parent.recovery.replayed_calls===0,'WORKFLOW_FALSE_PASS');
  assert(parent.result.calls.filter(c=>c.execution_status==='COMPLETED').length===3,'COMMITTED_COUNT');
  assert(parent.source_before.source_sha256===parent.source_after.source_sha256
    &&parent.source_after.source_sha256==='4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73'
    &&stable(parent.source_before)===stable(parent.source_after),'SOURCE_BEFORE_AFTER');
  for(let i=1;i<=4;i++){
    const call='call-0'+i,root=join(native,attempt,call),v=await json(join(root,'outcome.json')),raw=await read(join(root,'resources-v2.jsonl'));
    const records=raw.toString().trimEnd().split('\n').map(JSON.parse),resource=v.resources??v.resource_accounting;
    const counts=v.resources?.counters??{sample:resource.sample,event:resource.event};
    const n=records.filter(x=>x.kind==='sample').length,e=records.filter(x=>x.kind==='event').length;
    const r=reconcileResourceJournal(raw,counts,{samples:n,events:e},resource.journal_id,resource.head_hash??resource.hash);
    if(v.resources)assert(v.resources.journal_sha256===r.journal_sha256,'RECEIPT_DIGEST');
    else assert(v.status==='FAILED'&&resource.error&&resource.pending===0&&resource.close_acknowledged&&!resource.finalization_pending,'FAILED_RESOURCE_STATE');
    if(!uniqueJournals.has(r.journal_id)){uniqueJournals.add(r.journal_id);rowsTotal+=r.record_count;samplesTotal+=n;eventsTotal+=e;}
    for(const row of records)for(const p of row.payload.owned??[])seenPids.set(p.pid,p.birth);
    if(!v.recovered_from){
      const m=v.measurement??{max_process_RSS:v.peak,max_counted_storage:v.maxDisk};
      maxRSS=Math.max(maxRSS,m.max_process_RSS);maxDisk=Math.max(maxDisk,m.max_counted_storage);
      if(v.status==='PASS')kernelSuccessful=Math.max(kernelSuccessful,...v.events.map(x=>x.kernel_max_rss??0));
      calls.push({attempt,call,status:v.status,reason:v.reason??null,measurement:v.measurement??null,journal_samples:n,journal_events:e});
    }
  }
}
assert(uniqueJournals.size===5&&rowsTotal===51&&samplesTotal===36&&eventsTotal===15,'JOURNAL_COUNT');
assert(calls.length===5&&calls.filter(c=>c.status==='PASS').length===3,'ACTUAL_NATIVE_COUNTS');
assert(maxRSS<536870912&&maxDisk<67108864,'RESOURCE_CEILING');
const risk=await json(join(native,'attempt-02/call-04/outcome.json'));
const error=risk.events.at(-1);
assert(error.code==='UNAUTHORIZED_SQL'&&error.sql_diagnostic.errcode===23&&error.sql_diagnostic.stage==='step'
  &&error.sql_diagnostic.authorizer_actions.filter(x=>x.action===21).length===2,'DENIAL_EVIDENCE');
const remaining=[];
for(const [pid,birth] of seenPids)try{
  const stat=await readFile('/proc/'+pid+'/stat','utf8');
  if(stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]===birth)remaining.push(pid);
}catch(e){if(e.code!=='ENOENT')throw e;}
assert(!remaining.length,'OWNED_PROCESS_REMAINS');
const cold=await json(join(native,'cold-recovery.json')),demo=await json(join(native,'demo.json'));
assert(cold.recovery.workflow_outcome==='FAILED'&&cold.recovery.replayed_calls===0&&demo.fresh_UI_execution===false
  &&demo.results.filter(r=>r.execution_status==='COMPLETED').length===3&&demo.results[3].execution_status==='FAILED'
  &&demo.results[3].data_status==='UNKNOWN'&&demo.timeline.length===18,'PRESENTATION_OR_RECOVERY');
assert(demo.research.complete_answer_support==='ABSTAIN'&&demo.research.independently_reviewed_rules===0,'RESEARCH_GATE');
const html=(await read(join(native,'demo.html'))).toString();assert(!/<script|fetch\(|onclick=|src=/i.test(html),'EXECUTABLE_PRESENTATION');
let links=0;
for(const p of [...governance,'docs/N16_MASTER_CONTRACT.md','docs/N16_MASTER_COMPLETION_REPORT.md']){
  const text=(await read(p)).toString();
  for(const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
    if(/^(?:https?:|mailto:|#)/.test(m[1]))continue;
    const target=decodeURIComponent(m[1].split('#')[0]);if(!target)continue;
    const path=target.startsWith('/')?target:fileURLToPath(new URL(target,new URL(p,'file://'+project)));
    await lstat(path);links++;
  }
}
for(const [p,n] of [['qa-deterministic-completion.txt',247],['qa-regressions-01.txt',272]]){
  const s=(await read(join(out,p))).toString();assert(s.includes('ℹ pass '+n+'\n')&&s.includes('ℹ fail 0\n')&&s.includes('ℹ skipped 0\n'),'FINAL_QA');
}
assert((await read(join(out,'qa-syntax-completion.txt'))).toString().includes('0 errors.'),'FINAL_SYNTAX');
await atomicRecord(native,'mission-closed.json',{task:'N16_MASTER',status:'CLOSED_PARTIAL',reason:'UNAUTHORIZED_SQL',
  actual_startups:5,unused_startups_expired:7,source_permission_expired:true,resource_permission_expired:true,additional_startups_authorized:0});
const currentFiles=[...Object.keys(plan.code_pins)];
await atomicRecord(out,'current-code-overlay.json',{scope:'POSTCAMPAIGN_QA_ONLY',native_authority:false,
  reconstructed_executed_files:reconstructed,current_pins:Object.fromEntries(await Promise.all(currentFiles.map(async p=>[p,sha(await read(p))])))});
// Broader closing charge includes every frozen participating input at current
// allocation, all new mission outputs, temp root and required governance inputs.
const paths=Object.keys(plan.fixed_storage).filter(p=>!p.startsWith('artifacts/n16-master-20261029/'));
paths.push(out,'/tmp/astra-n16-master-20261029',...governance,'docs/N16_MASTER_CONTRACT.md','docs/N16_MASTER_COMPLETION_REPORT.md');
const unique=[...new Set(paths)].sort((a,b)=>a.length-b.length),charged=[];
for(const p of unique){const full=p.startsWith('/')?p:join(project,p);if(!charged.some(x=>full===x||full.startsWith(x+'/')))charged.push(full);}
let closing=0;for(const p of charged)closing+=await allocated(p);assert(closing<67108864,'CLOSING_STORAGE_LIMIT');
await atomicRecord(out,'final-validation.json',{outcome:'PASS_FOR_EVIDENCE_VALIDATION_ONLY',mission_result:'PARTIAL',
  protected_files:Object.keys(before.files).length,unchanged_protected_files:Object.keys(before.files).length-changed.length,
  intentional_old_files_changed:changed,table_row_changes:tableChanges.length,other_table_rows_preserved:Object.values(before.tables).reduce((n,a)=>n+a.length,0)-tableChanges.length,
  native_startups:5,readOnly_connections:5,fixed_SELECT_attempts:5,successful_SELECTs:3,failed_SELECT_attempts:2,
  tools_qualified:3,coordinator:'FAILED_WITH_THREE_COMMITTED_RESULTS',fresh_retry_replayed_calls:0,
  unique_resource_journals:5,unique_sample_rows:samplesTotal,unique_event_rows:eventsTotal,total_unique_rows:rowsTotal,
  calls,max_observed_process_RSS:maxRSS,max_successful_worker_kernel_RSS:kernelSuccessful,max_runtime_counted_bytes:maxDisk,
  closing_counted_bytes:closing,remaining_owned_processes:remaining.length,observed_PID_birth_pairs:seenPids.size,
  network_or_model_executions:0,source_hash:demo.results[0].provenance.source_sha256,source_before_after_unchanged:true,
  historical_G:'INCONCLUSIVE_UNCHANGED',deterministic_tests:247,focused_regression_tests:272,final_tests_passed:519,final_tests_failed:0,
  local_document_links_resolved:links,
  native_campaign_halted:true,unused_authority_expired:true,exact_failed_native_times:'NOT_RECORDED',
  executed_revision_reconstructed_and_hash_matched:reconstructed});
const inventory={};
for(const p of [...currentFiles,...governance,'docs/N16_MASTER_CONTRACT.md','docs/N16_MASTER_COMPLETION_REPORT.md'])inventory[p]=sha(await read(p));
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);assert(!entry.isSymbolicLink(),'UNEXPECTED_ARTIFACT_SYMLINK');
  if(entry.isDirectory())await scan(p);else if(entry.name!=='evidence-manifest.json')inventory[p.slice(project.length)]=sha(await readFile(p));
}}
await scan(out);
await atomicRecord(out,'evidence-manifest.json',{task:'N16_MASTER',mission_result:'PARTIAL',files:inventory,
  notice:'Hashes bind technical evidence, not independent scientific or clinical approval.'});
console.log(JSON.stringify({mission:'PARTIAL',qualified_tools:3,native_starts:5,tests_passed:519,tests_failed:0,
  preserved_files:Object.keys(before.files).length-changed.length,closing_storage:closing,authority:'CLOSED',source:'UNCHANGED'}));
