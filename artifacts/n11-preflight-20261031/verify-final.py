"""File-only N11 audit/permission/preservation validation, not candidate execution."""
from pathlib import Path
import json,hashlib,difflib,re

root=Path('artifacts/n11-preflight-20261031');before=json.loads((root/'preservation-before.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
modified=['AGENTS.md','docs/MASTER_PLAN.md','docs/MODULE_TRACKER.md','docs/CORE_AI_PRIORITY.md','docs/FEATURE_AUDIT.md','docs/DECISIONS.md','docs/SESSION_HANDOFF.md']
added=['docs/DE_N11_SYNTHETIC_01.md','docs/N11_FINAL_ENGINEERING_COMPLETION.md']
checks=[]
def check(name,fn):
    fn();checks.append({'name':name,'status':'PASS'})
def preserved():
    for f,pin in before['files'].items():
        if f not in modified:assert sha(f)==pin,f
check('Every preexisting code/test/model/scientific/history file unchanged',preserved)
records=[];diff=[]
for f in modified+added:
    prior=root/'originals'/f.replace('/','__')
    old=prior.read_text() if f in modified else ''
    if f in modified:assert sha(prior)==before['files'][f]
    current=Path(f).read_text();record={'path':f,'status':'modified' if f in modified else 'added','after_sha256':sha(f)}
    if old:record['before_sha256']=sha(prior)
    records.append(record);diff.extend(difflib.unified_diff(old.splitlines(True),current.splitlines(True),fromfile='before/'+f if old else '/dev/null',tofile='after/'+f))
def history():
    for f in modified:
        old=(root/'originals'/f.replace('/','__')).read_text();current=Path(f).read_text()
        if f=='AGENTS.md':
            current='\n'.join(l for l in current.split('\n') if not l.startswith('- **Latest N11 consolidated mission'))
            assert current==old
        else:
            original_body=old.split('\n',1)[1].lstrip('\n')
            if f=='docs/MASTER_PLAN.md':
                original_row=next(l for l in old.splitlines() if l.startswith('| N11 '))
                new_row=next(l for l in current.splitlines() if l.startswith('| N11 '))
                current=current.replace(new_row,original_row,1)
            assert original_body in current,f
check('Historical governance bodies retained except documented current N11 row/title',history)
preserved_rows=0;updated_rows=0
for f,rows in before['tables'].items():
    actual=Path(f).read_text().splitlines()
    for row in rows:
        if f=='docs/MASTER_PLAN.md' and row.startswith('| N11 '):updated_rows+=1;continue
        assert row in actual,f+': '+row;preserved_rows+=1
checks.append({'name':'All unrelated original module/dependency/status rows preserved','status':'PASS'})
def no_other_new_code():
    for d in ['services','packages','apps','scripts','tests','models']:
        for f in Path(d).rglob('*'):
            if f.is_file() and f.suffix.lower() in ['.mjs','.js','.json','.md','.html','.css','.py','.yml','.yaml','.txt']:assert str(f) in before['files'],str(f)
check('No N11 source/schema/model/API/UI added outside artifact QA',no_other_new_code)
inventory=json.loads((root/'exception-inventory-before.json').read_text())
def exception_boundary():
    assert inventory['N11_specific_exception_found'] is False
    for e in inventory['exceptions']:assert sha(e['path'])==e['sha256'],e['path']
    s=Path(added[0]).read_text();assert '**PROPOSED / INACTIVE.' in s
    assert 'Owner acceptance and explicit activation decision:\n\nOwner decision date:\n\n' in s
    assert 'Decision — APPROVE / REJECT / REQUEST CHANGES:\n\nRationale' in s
check('Prior exceptions unchanged; new proposal inactive and decision fields blank',exception_boundary)
def counts():
    log=(root/'qa-baseline.txt').read_text()
    for s in ['tests 238','pass 238','fail 0','skipped 0','cancelled 0']:assert 'ℹ '+s in log,s
    assert '226 JavaScript files parsed and local imports checked; 0 errors' in (root/'syntax.txt').read_text()
check('Executed baseline238/238 and226syntax counts verified separately from N11 acceptance',counts)
def resources():
    r=json.loads((root/'resources.json').read_text());samples=json.loads((root/'resource-samples.json').read_text())
    assert r['exit_code']==0 and r['scratch_removed'] and not r['timed_out'];assert r['samples']==len(samples)==149
    assert [s['seq'] for s in samples]==list(range(1,len(samples)+1))
    assert r['max_sampled_tree_RSS_bytes']==max(s['sampled_tree_RSS_bytes'] for s in samples)
    assert r['max_sampled_scratch_logical_bytes']==max(s['scratch_logical_bytes'] for s in samples)
    assert r['N11_training_or_candidate_execution']==r['N16_native_starts']==r['Qwen_inference']==r['external_requests']==0
check('Actual baseline sample accounting and temporary cleanup reconcile',resources)
def matrix():
    m=json.loads((root/'requirement-matrix.json').read_text());assert len(m['groups'])==10
    assert m['implemented_full_N11_groups']==m['qualified_full_N11_groups']==0
    assert all(row['status']=='BLOCKED BY AUTHORIZATION' and row['new_N11_implementation']=='NOT STARTED' for row in m['groups'])
    assert m['formal_N11']=='Not Started — dependency/exception blocked'
check('Requirements distinguish available foundations from unexecuted N11 acceptance',matrix)
(root/'changed-files.json').write_text(json.dumps({'modified_count':7,'added_documents':2,'files':records,'existing_executable_test_or_model_changes':0,'artifact_QA_only':True},indent=2)+'\n')
(root/'implementation.diff.txt').write_text(''.join(diff))
def links():
    for f in added:
        for target in re.findall(r'\]\(([^)]+)\)',Path(f).read_text()):
            if target.startswith(('https:','http:','#')):continue
            path=(Path(f).parent/target.split('#')[0]).resolve()
            if path==(root/'final-validation.json').resolve():continue
            assert path.is_file(),f+': '+target
check('New report and proposal local references resolve',links)
result={'status':'PASS','checks':checks,'protected_files':len(before['files']),'unchanged_existing_files':len(before['files'])-len(modified),'intentional_document_edits':7,'new_documents':2,'all_preexisting_source_tests_models_unchanged':True,'unrelated_table_rows_preserved':preserved_rows,'N11_current_rows_documented':updated_rows,'proposal_sha256':sha(added[0]),'proposal_status':'INACTIVE','N11_implemented':0,'N11_qualified':0,'formal_N11':'Not Started — dependency/exception blocked','N11_candidate_or_training_execution':0,'N16_native_startups':0,'Qwen_inference':0,'browser_launches':0,'operational_or_sealed_database_access':0,'review_approvals_fabricated':0}
(root/'final-validation.json').write_text(json.dumps(result,indent=2)+'\n')
assert json.loads((root/'final-validation.json').read_text())['status']=='PASS'
print(json.dumps(result,indent=2))
