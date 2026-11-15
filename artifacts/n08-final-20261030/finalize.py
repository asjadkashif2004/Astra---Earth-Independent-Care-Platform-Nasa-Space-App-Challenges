"""File-only audit closure. No N08 feature, database, browser, worker or network."""
from pathlib import Path
import json,hashlib,re,difflib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/n08-final-20261030'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
def save(name,v):(OUT/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
baseline=load(OUT/'preservation-before.json');allowed={'AGENTS.md',*[f'docs/{n}.md' for n in ['MASTER_PLAN','MODULE_TRACKER','CORE_AI_PRIORITY','FEATURE_AUDIT','DECISIONS','SESSION_HANDOFF']]}
changed=[];unchanged=[]
for name,pin in baseline['files'].items():
 p=ROOT/name;assert p.is_file() and not p.is_symlink(),name
 h=sha(p)
 if h==pin:unchanged.append(name)
 else:assert name in allowed,name;changed.append({'path':name,'before_sha256':pin,'after_sha256':h})
assert {r['path'] for r in changed}==allowed
tables={}
for name,rows in baseline['tables'].items():
 current=[l for l in (ROOT/name).read_text().splitlines() if l.startswith('|')]
 keep=lambda x:[l for l in x if not l.startswith('| N08 ')]
 assert keep(rows)==keep(current),name
 tables[name]={'all_non_N08_rows_unchanged':len(keep(rows)),'before_N08':[l for l in rows if l.startswith('| N08 ')],'after_N08':[l for l in current if l.startswith('| N08 ')]}
save('table-preservation.json',tables)
new=[]
for folder in ['services','apps','packages','scripts','tests','docs','data/scientific']:
 for p in (ROOT/folder).rglob('*'):
  if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs','.js','.md','.py','.json','.jsonl','.csv','.txt','.pdf','.bin','.f32','.css','.html'}:
   name=str(p.relative_to(ROOT))
   if name not in baseline['files']:new.append({'path':name,'sha256':sha(p)})
assert {r['path'] for r in new}=={'docs/N08_FINAL_ENGINEERING_COMPLETION.md','docs/DE_N08_SYNTHETIC_01.md'},new
diff=[];snap=OUT/'final-files';snap.mkdir(exist_ok=True)
for row in changed:
 name=row['path'];original=OUT/'originals'/name.replace('/','__');assert sha(original)==row['before_sha256']
 diff.extend(difflib.unified_diff(original.read_text().splitlines(True),(ROOT/name).read_text().splitlines(True),fromfile='before/'+name,tofile='after/'+name))
for row in new:diff.extend(difflib.unified_diff([],(ROOT/row['path']).read_text().splitlines(True),fromfile='/dev/null',tofile='after/'+row['path']))
for row in new+changed:(snap/row['path'].replace('/','__')).write_bytes((ROOT/row['path']).read_bytes())
(OUT/'documentation.diff.txt').write_text(''.join(diff))
save('changed-files.json',{'modified_existing_governance':changed,'new_documents':new,'existing_executable_changes':[],
 'artifact_only_QA':'baseline-controls.test.mjs, qa.py, finalize.py and saved outputs; complete inventory in evidence-manifest.json',
 'implementation':'NONE; N08 remains Not Started','diff':'documentation.diff.txt'})
requirements=[
 ('W1','R08/R12','Binary chunk schema/storage','N01 scalar schema/native Store; no waveform table','1–5s blocks,channel/sample/time/unit metadata,binary objects/hash,index,atomic commit/recovery','Versioned binary ingest/store and original immutable bytes','Inspect source/time/sample/quality/provenance','New clearly authored synthetic waveforms or separately approved complete authentic sources','Chunk schema/hash/order/idempotency/rollback/restart; no per-sample JSON'),
 ('W2','R16/R35','Authorized read and ingest','Existing RBAC/scalar service and explicit501waveform boundary','Binary routes/stream bounds/crew/source ownership and errors','Authenticated binary read/write interfaces','Role/crew-denied and success UI states','Validated fixed-source chunks, trusted caller, explicit permission','Positive and negative API roles,wrong crew,malformed/duplicate/oversize content'),
 ('W3','R36/R53','CSV/public source replay adapters','Approved BIDMC numerics parser; structural EDF/TAL fixtures; inactive N07 descriptor','Actual waveform samples,source clock/channel/unit alignment,permitted CSV/replay adapter','Exact-source bounded read/normalization/replay','Actual source/license display and playback','Complete approved public waveform and canonical source/card; current numerics is not ECG/PPG','Real public input->stored replay with source/hash/time/license proof'),
 ('W4','R28/R36','Waveform history and replay UI','Scalar replay only; no waveform UI','Waveform seek/play/history/source+knowledge-time integration and actual browser','Read-only historical binary projection','Functional waveform pane,crew/source selection,loading/empty/error/UNKNOWN,keyboard/responsive','Persisted source-bound chunks and original/replay clocks','Actual-browser control/time/permission/restart/quality behavior'),
 ('W5','R12/R36','Bounded decimation','Scalar charts only','Time-aligned decimation preserving extrema/gaps and sample provenance','Bounded data window/decimation service','Actual bounded waveform rendering','Verified sample times/rates and quality mask','Deterministic extrema/gap preservation,alignment,boundary inputs,memory/latency'),
 ('W6','R35/R36','Waveform quality and UNKNOWN','N01/N02 scalar quality and EDF structure only','Source-bound waveform quality/coverage/artifact uncertainty','Explicit missing/invalid/suspect processing with abstention','Quality versus availability labels and gaps','Known labeled engineering fixtures; real-source quality evidence where claimed','Missing/stale/corrupt/NaN/gap/quality controls; no healthy substitution'),
 ('W7','R35/R36/R53','R-peaks and derived values; conditional BP','No peak extractor; scalar monitor values not peaks','Traceable peak/sample times and quality-gated derivations; BP UNKNOWN absent verified source','Bounded deterministic extraction/derivation isolated from N02 alert authority','Source-bound experimental markers with limitations','Known fictional peaks plus actual public validation when authorized; no BP inference','Known peak controls,unit/time/gap/noise failure; real-source claims require actual data'),
 ('W8','R28/R31/R36','Beat/twin synchronization','Rate-driven prototype; N06 not implemented/deferred','Actual source beat/twin/replay synchronization under N06 authority','Source/peak-time interface and authorized N06 consumer','Actual measurement-driven animation synchronization','Validated peak timing plus completed/authorized N06 integration','Real beat/source/UI timing and existing N06 integrated acceptance'),
 ('W9','R35/R50/R53','Binary privacy/source integrity','N01 scalar roles/privacy and N07 research provenance','Binary-specific least privilege/minimization/history/source separation','Trusted identity,crew/source/path/hash/version/format checks','Permission/UNKNOWN/source versus fictional crew distinction','Approved identities/sources only; public data never synthetic-astronaut relabeling','Wrong role/crew,tamper,unsafe paths,read-side nonmutation,unverified-source rejection'),
 ('W10','R08/R12/R36','Resources,retention and reliability','Existing memory/temp scalar persistence/failure controls','Actual waveform throughput,retention,cleanup,cancellation,cold recovery and noninterference','Finite chunk/process/disk bounds,atomic recovery,pruning policy','Bounded responsiveness/loading/failure recovery','Representative authorized finite fixtures; no expired resource budget','Measure actual processing/storage/RSS/cleanup/retention; failure injection; N02/N10/N16 preservation')]
matrix=[]
for key,ids,title,existing,missing,backend,frontend,data,tests in requirements:
 matrix.append({'requirement_identifier':ids,'audit_group':key,'audit_group_note':'Local grouping of authoritative N08 clauses, not a new official module/requirement ID',
  'authoritative_requirement':title,'authority':'MASTER_PLAN N08; primary waveform/API/persistence specification; FEATURE_AUDIT rows for these IDs',
  'existing_implementation':existing,'missing_feature':missing,'required_backend':backend,'required_frontend':frontend,'required_data':data,
  'integration_requirements':'N01/N07; N06 for twin; no automatic N09/N10/N11/N12/N16 or monitoring integration',
  'authorization_requirements':'Activate reviewed DE-N08-SYNTHETIC-01 before synthetic implementation; separate authentic-source/N06 permissions where needed',
  'test_criteria':tests,'evidence_requirements':'Actual implementation/API/persistence/replay/source and browser/resource evidence as applicable; baseline501 is not acceptance',
  'dependencies':{'N01':'Complete','N07':'In Progress; full gate open','N06_twin':'Not Started—Deferred'},
  'closure_condition':'Actual original requirement satisfied with legitimate prerequisite/source/review authority; no synthetic replacement for real source or twin acceptance',
  'final_status':'BLOCKED BY SOURCE' if key=='W3' else 'BLOCKED BY AUTHORIZATION',
  'additional_blockers':['No newly authored exception may be activated automatically under current Phase3']+(['Actual waveform source missing'] if key in ['W3','W7'] else [])+(['N06 remains deferred'] if key=='W8' else [])})
save('requirement-matrix.json',matrix)
exceptions=sorted(p.name for p in (ROOT/'docs').glob('DE_*.md'))
assert [n for n in exceptions if 'N08' in n]==['DE_N08_SYNTHETIC_01.md']
save('exception-inventory.json',{'files':exceptions,'preexisting_N08_specific_proposals':[],'new_N08_proposal':'DE_N08_SYNTHETIC_01.md','status':'PROPOSED_INACTIVE',
 'activation':False,'owner_rule':'Current N08 mission Phase3 prohibits activation of an unreviewed newly invented exception',
 'required_permission':'Explicit activation of reviewed DE-N08-SYNTHETIC-01 and consolidated synthetic N08 implementation approval'})
proposal=ROOT/'docs/DE_N08_SYNTHETIC_01.md';(OUT/'proposal.sha256').write_text(sha(proposal)+'  docs/DE_N08_SYNTHETIC_01.md\n')
qa=load(OUT/'qa-summary.json');assert qa['exit_code']==0 and qa['counts']=={'tests':224,'pass':223,'fail':0,'cancelled':0,'skipped':1}
resources=[json.loads(l) for l in (OUT/'resources.jsonl').read_text().splitlines()];assert len(resources)==qa['samples']==62
assert [r['seq'] for r in resources]==list(range(1,len(resources)+1));assert max(r['tree_rss_bytes'] for r in resources)==qa['maximum_sampled_tree_RSS_bytes']
assert qa['scratch_remaining']==[] and list(Path('/tmp/astra-n08-preflight-20261030').iterdir())==[]
assert '212 JavaScript files' in (OUT/'qa-syntax.txt').read_text() and '0 errors.' in (OUT/'qa-syntax.txt').read_text()
historical=[n for n in unchanged if n.startswith(('artifacts/n07-','artifacts/n10-','artifacts/n16-'))]
save('historical-preservation.json',{'count':len(historical),'unchanged':True,'files':{n:baseline['files'][n] for n in historical},'sealed_database':'Not opened or rehashed'})
for doc in [ROOT/r['path'] for r in changed+new]:
 original=OUT/'originals'/str(doc.relative_to(ROOT)).replace('/','__');old=set(re.findall(r'\]\(([^)]+)\)',original.read_text())) if original.exists() else set()
 for link in set(re.findall(r'\]\(([^)]+)\)',doc.read_text()))-old:
  if link.startswith(('http:','https:','#')):continue
  target=link.split('#')[0]
  if target and not (doc.parent/target).exists():assert target.endswith('final-validation.json'),(doc,link)
save('mission-state.json',{'state':'DELIVERED_BLOCKED_STOP','N08_feature_implementation_started':False,'N08_exception_active':False,
 'proposal_sha256':sha(proposal),'new_native_worker_or_source_acquisition_authority':False,'automatic_resume':False})
save('final-validation.json',{'outcome':'BLOCKED','formal_N08':'Not Started; dependency-blocked','official_purpose':'Binary waveform/CSV ingest and replay',
 'full_requirement_groups':10,'implemented_complete_groups':0,'qualified_complete_groups':0,'baseline_passed':223,'baseline_failed':0,'baseline_skipped':1,
 'baseline_controls_note':'Existing behavior/source/security only, not N08 feature qualification','syntax_files':212,'syntax_errors':0,
 'N08_end_to_end':'NOT RUN','N08_browser_acceptance':'NOT RUN','baseline_files':len(baseline['files']),'unchanged_files':len(unchanged),
 'modified_governance_files':len(changed),'existing_executable_changes':0,'new_repository_documents':2,'historical_evidence_files_unchanged':len(historical),
 'all_non_N08_status_rows_unchanged':True,'new_exception_activated':False,'proposal_sha256':sha(proposal),
 'operational_or_sealed_database_access':0,'external_requests_downloads_installs':0,'Qwen_or_N16_worker_calls':0,
 'scope':'Only audit, inactive proposal, artifact-only baseline QA, exact preservation and documentation; no N08 feature code',
 'source_and_dependency_gates':'Full N07 and actual waveform sources remain incomplete; N06 twin scope deferred; all original scientific/release gates retained',
 'cleanup':'Memory/temp baseline instances closed; no scratch entries; no app listener/browser/native N16 worker',
 'manifest':'evidence-manifest.json','self_exclusion':'Manifest excludes itself and its SHA sidecar to avoid circular hashes'})
manifest={str(p.relative_to(OUT)):{'sha256':sha(p),'bytes':p.stat().st_size} for p in OUT.rglob('*') if p.is_file() and not p.is_symlink() and p.name not in {'evidence-manifest.json','evidence-manifest.sha256'}}
save('evidence-manifest.json',manifest);(OUT/'evidence-manifest.sha256').write_text(sha(OUT/'evidence-manifest.json')+'  evidence-manifest.json\n')
print(json.dumps(load(OUT/'final-validation.json'),indent=2))
