from pathlib import Path
import json,hashlib,difflib,re,subprocess
R=Path('artifacts/n12-preflight-20261104');sha=lambda b:hashlib.sha256(b).hexdigest();before=json.loads((R/'preservation-before.json').read_text())
expected={'AGENTS.md',*[f'docs/{n}.md' for n in ['MASTER_PLAN','MODULE_TRACKER','CORE_AI_PRIORITY','FEATURE_AUDIT','DECISIONS','SESSION_HANDOFF']]};changed=[];missing=[]
for name,h in before['files'].items():
 p=Path(name)
 if not p.is_file():missing.append(name)
 elif sha(p.read_bytes())!=h:changed.append(name)
unexpected=sorted(set(changed)-expected);assert not missing and not unexpected,(missing,unexpected);assert set(changed)==expected
for name in expected:assert sha((R/'originals'/name.replace('/','__')).read_bytes())==before['files'][name]
added=['docs/DE_N12_SYNTHETIC_01.md','docs/N12_FINAL_ENGINEERING_COMPLETION.md'];assert all(n not in before['files'] for n in added)
proposal=Path(added[0]).read_text();assert 'PROPOSED / INACTIVE' in proposal and 'does not activate N12' in proposal
inventory=json.loads((R/'exception-inventory-before.json').read_text());assert len(inventory['proposals'])==14 and not inventory['N12_specific_proposals']
tables=[]
for name,oldrows in before['tables'].items():
 newrows=[s for s in Path(name).read_text().splitlines() if s.startswith('|')];removed=[s for s in oldrows if s not in newrows];newonly=[s for s in newrows if s not in oldrows]
 for row in removed:assert name=='docs/MASTER_PLAN.md' and row.startswith('| N12 Prediction and model evidence |') or name=='docs/MODULE_TRACKER.md' and row.startswith('| N12,N17–N26 |'),(name,row)
 for row in newonly:assert row.startswith('| N12 Prediction and model evidence') or name=='docs/MODULE_TRACKER.md' and row.startswith('| N17–N26 | **Awaiting separate approvals**'),(name,row)
 tables.append({'path':name,'unchanged_rows':sum(s in newrows for s in oldrows),'removed_rows':removed,'added_rows':newonly,'other_module_statuses_unchanged':True})
log=(R/'qa-baseline.txt').read_text();assert 'ℹ tests 300' in log and 'ℹ pass 300' in log and 'ℹ fail 0' in log and 'ℹ skipped 0' in log
resources=json.loads((R/'resources.json').read_text());assert resources['exit_code']==0 and not resources['timeout'] and resources['scratch_removed'] and not resources['leftovers_before_cleanup']
syntax=(R/'syntax.txt').read_text();assert '237 JavaScript files' in syntax and '0 errors' in syntax
artifact_checks=[]
for file in ['capture.mjs','boundaries.test.mjs','legacy-diagnostics.mjs']:
 result=subprocess.run(['node','--check',str(R/file)],capture_output=True,text=True,timeout=10);assert result.returncode==0,result.stderr;artifact_checks.append({'path':str(R/file),'status':'PASS'})
(R/'artifact-syntax.json').write_text(json.dumps(artifact_checks,indent=2)+'\n')
api=json.loads((R/'legacy-api-control.json').read_text());assert api['existing_prediction_GET_mutations']==2 and api['N02_noninterference'] is True
diagnostics=json.loads((R/'legacy-validation-gaps.json').read_text());assert any(c.get('nonfinite_available') for c in diagnostics['cases'])
browser={'scope':'File metadata only; no browser startup, version or compatibility qualification','installed_Chrome_path_present':Path('/mnt/c/Program Files/Google/Chrome/Application/chrome.exe').is_file(),'existing_portable_Windows_Node_present':Path('artifacts/n03-windows-tools/node.exe').is_file(),'N12_browser_acceptance':'NOT RUN — module implementation unauthorized'}
(R/'browser-tooling-readiness.json').write_text(json.dumps(browser,indent=2)+'\n')
change={'schema_version':'astra.n12.preflight-changes.v1','modified':[{'path':n,'before':before['files'][n],'after':sha(Path(n).read_bytes())}for n in sorted(expected)],'added_documents':[{'path':n,'sha256':sha(Path(n).read_bytes())}for n in added],'preexisting_executable_test_model_calibration_changes':[],'new_N12_runtime_implementation':False}
(R/'changed-files.json').write_text(json.dumps(change,indent=2)+'\n')
patch=[]
for n in sorted(expected|set(added)):
 old=(R/'originals'/n.replace('/','__')).read_text().splitlines(keepends=True) if n in expected else []
 patch.extend(difflib.unified_diff(old,Path(n).read_text().splitlines(keepends=True),fromfile='before/'+n if old else '/dev/null',tofile='after/'+n))
(R/'documentation.diff').write_text(''.join(patch))
matrix=json.loads((R/'requirement-matrix.json').read_text());assert len(matrix['groups'])==10 and matrix['full_groups_implemented']==matrix['full_groups_qualified']==0
receipt={'status':'PASS — PREFLIGHT PRESERVATION/ACCOUNTING ONLY','mission_result':'BLOCKED BEFORE N12 IMPLEMENTATION','preexisting_files_accounted_for':len(before['files']),'preexisting_unchanged':len(before['files'])-len(changed),'expected_modified':sorted(changed),'unexpected_changed':unexpected,'missing':missing,'all_original_governance_copies_verified':True,'tables':tables,'new_documents':added,'proposal_status':'PROPOSED/INACTIVE','proposal_sha256':sha(Path('docs/DE_N12_SYNTHETIC_01.md').read_bytes()),'owner_activation_recorded':False,'independent_review_fabricated':False,'N12_implemented_groups':0,'N12_qualified_groups':0,'baseline_QA':{'pass':300,'fail':0,'skip':0,'existing_tests':296,'artifact_only_preflight_checks':4,'new_N12_acceptance':False},'repository_syntax_files':237,'artifact_syntax_files':3,'new_N12_candidates':0,'N11_experiments':0,'N16_native_starts':0,'Qwen_inference':0,'external_acquisition':0,'new_browser_launches':0,'operational_or_sealed_database_access':False,'model_binary_preservation_reads':False,'formal_N12':'Not Started — dependency/exception blocked','N11_forest':'REJECTED_FOR_PROMOTION; unchanged','other_statuses_reviews_gates':'UNCHANGED','N15_rule':'INACTIVE','N16_readiness':'N12 full prerequisite UNSATISFIED; no new authority','cleanup':{'scratch_removed':True,'leftovers':[]},'next_authority':'Explicit owner review/activation of the now-existing exact DE-N12-SYNTHETIC-01 for one consolidated synthetic build; scientific/source/hardware/release gates retained.'}
(R/'final-validation.json').write_text(json.dumps(receipt,indent=2)+'\n')
manifest_path=R/'artifact-manifest.json';manifest_path.write_text('{}\n')
for file in ['docs/N12_FINAL_ENGINEERING_COMPLETION.md','docs/DE_N12_SYNTHETIC_01.md']:
 for ref in re.findall(r'\]\(([^)]+)\)',Path(file).read_text()):
  if '://' not in ref and not ref.startswith('#'):assert (Path(file).parent/ref.split('#')[0]).exists(),(file,ref)
manifest={p.relative_to(R).as_posix():{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}for p in sorted(R.rglob('*')) if p.is_file() and p!=manifest_path}
manifest_path.write_text(json.dumps({'schema_version':'astra.n12.preflight-artifact-manifest.v1','files':manifest},indent=2)+'\n')
assert json.loads(manifest_path.read_text())['files']['final-validation.json']['sha256']==sha((R/'final-validation.json').read_bytes())
print(json.dumps({'result':'BLOCKED','preservation':'PASS','old_files':len(before['files']),'unchanged':len(before['files'])-len(changed),'modified_governance':len(changed),'new_documents':2,'new_N12_implementation':False,'baseline_pass':300,'baseline_fail':0,'baseline_skip':0,'proposal_sha256':receipt['proposal_sha256'],'artifact_files':len(manifest)},indent=2))
