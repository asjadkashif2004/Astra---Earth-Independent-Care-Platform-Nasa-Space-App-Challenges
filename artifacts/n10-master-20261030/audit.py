"""N10 preflight/preservation evidence only; no source DB, network or tool execution."""
from pathlib import Path
import ast, difflib, hashlib, json, os, re, sys
from urllib.parse import unquote
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/n10-master-20261030'
GOV = ['AGENTS.md'] + ['docs/' + n + '.md' for n in [
    'MASTER_PLAN', 'MODULE_TRACKER', 'CORE_AI_PRIORITY', 'SESSION_HANDOFF',
    'DECISIONS', 'FEATURE_AUDIT']]
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def collect():
    files = {}
    for base in ['services', 'apps', 'packages', 'scripts', 'tests', 'docs', 'models', 'knowledge']:
        for p in (ROOT / base).rglob('*'):
            if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs', '.js', '.py', '.json', '.md', '.html', '.css'}:
                files[str(p.relative_to(ROOT))] = digest(p)
    for base in ['data/corpus', 'data/research']:
        for p in (ROOT / base).rglob('*'):
            if p.is_file() and not p.is_symlink():
                files[str(p.relative_to(ROOT))] = digest(p)
    for base in (ROOT / 'artifacts').glob('n16-*'):
        for p in base.rglob('*'):
            if p.is_file() and not p.is_symlink():
                files[str(p.relative_to(ROOT))] = digest(p)
    for name in ['AGENTS.md', 'package.json', 'package-lock.json',
                 'research/ASTRA_Deep_Research.md', 'research/ASTRA_Deep_Research.pdf']:
        p = ROOT / name
        if p.is_file():
            files[name] = digest(p)
    return files
def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, sort_keys=True) + '\n')
if sys.argv[1] == 'before':
    assert not (OUT / 'preservation-before.json').exists()
    files = collect()
    write('preservation-before.json', {
        'files': files, 'governance': {p: (ROOT / p).read_text() for p in GOV},
        'tables': {p: [l for l in (ROOT / p).read_text().splitlines() if l.startswith('|')] for p in GOV},
        'sealed_designated_database_access': 0, 'operational_database_access': 0})
    print(json.dumps({'protected_files': len(files), 'code_changes': 0, 'N10_implementation_started': False}))
elif sys.argv[1] == 'after':
    baseline = json.loads((OUT / 'preservation-before.json').read_text())
    current = collect()
    modified = {p: h for p, h in current.items() if p in baseline['files'] and baseline['files'][p] != h}
    missing = set(baseline['files']) - set(current)
    expected = set(GOV) | {'scripts/frontend-smoke.mjs'}
    assert not missing and set(modified) == expected, (missing, set(modified) ^ expected)
    assert len(baseline['files']) == 1487
    unchanged = {p: h for p, h in baseline['files'].items() if p not in modified}
    assert len(unchanged) == 1479
    assert not any(p.startswith(('apps/', 'services/', 'packages/', 'tests/', 'models/', 'knowledge/', 'data/', 'artifacts/n16-')) for p in modified)
    new_files = set(current) - set(baseline['files'])
    assert new_files == {'docs/DE_N10_SYNTHETIC_01.md', 'docs/N10_MASTER_COMPLETION_REPORT.md'}
    original = OUT / 'frontend-smoke.mjs.original.txt'
    assert digest(original) == baseline['files']['scripts/frontend-smoke.mjs']
    previous = original.read_text()
    actual = (ROOT / 'scripts/frontend-smoke.mjs').read_text()
    addition = ",['./fixture-trace.mjs',new URL('./fixture-trace.mjs',entry)]"
    assert actual.count(addition) == 1 and actual.replace(addition, '') == previous
    (OUT / 'implementation.diff.txt').write_text(''.join(difflib.unified_diff(
        previous.splitlines(True), actual.splitlines(True),
        fromfile='a/scripts/frontend-smoke.mjs', tofile='b/scripts/frontend-smoke.mjs')))
    differences = []
    for name in GOV:
        differences.extend(difflib.unified_diff(baseline['governance'][name].splitlines(True),
            (ROOT / name).read_text().splitlines(True), fromfile='a/'+name, tofile='b/'+name))
    for name in sorted(new_files):
        differences.extend(difflib.unified_diff([], (ROOT / name).read_text().splitlines(True),
            fromfile='/dev/null', tofile='b/'+name))
    (OUT / 'governance.diff.txt').write_text(''.join(differences))
    # Only N10 status is clarified; every original dependency/verification cell stays.
    for name, rows in baseline['tables'].items():
        now = [line for line in (ROOT / name).read_text().splitlines() if line.startswith('|')]
        if name == 'docs/MASTER_PLAN.md':
            assert len(now) == len(rows)
            for old, new in zip(rows, now):
                if old != new:
                    assert 'N10 Sleep, cognition and countermeasures' in old
                    assert old.split('|')[2:] == new.split('|')[2:]
                    assert 'Not Started; dependency-blocked' in new
        elif name == 'docs/MODULE_TRACKER.md':
            assert len(now) == len(rows) + 1
            now = [s for s in now if not s.startswith('| N10 Sleep, cognition and countermeasures |')]
            now = [s.replace('| N08,N11–N12,N17–N26 |', '| N08,N10–N12,N17–N26 |') for s in now]
            assert now == rows
        else:
            assert now == rows, ('Unexpected status table change', name)
    first = json.loads((OUT / 'qa-summary.json').read_text())
    assert first['exit_code'] == 1 and first['counts'] == {'tests':176,'pass':174,'fail':2,'cancelled':0,'skipped':0}
    focused = (OUT / 'qa-focused.txt').read_text()
    counts = {key: int(re.search(r'ℹ '+key+r' (\d+)', focused).group(1))
              for key in ['tests','pass','fail','cancelled','skipped']}
    assert counts == {'tests':47,'pass':47,'fail':0,'cancelled':0,'skipped':0}
    initial_text = (OUT / 'qa-existing.txt').read_text()
    assert 'ERR_UNSUPPORTED_RESOLVE_REQUEST' in initial_text and './fixture-trace.mjs' in initial_text
    assert '196 JavaScript files parsed and local imports checked; 0 errors.' in (OUT / 'qa-syntax.txt').read_text()
    matrix = json.loads((OUT / 'requirement-matrix.json').read_text())
    assert matrix['groups'] == 10 and len(matrix['requirements']) == 10
    assert sum(r['existing_scope_status'] == 'PARTIAL' for r in matrix['requirements']) == 6
    assert sum(r['existing_scope_status'] == 'MISSING' for r in matrix['requirements']) == 4
    assert not any(r['fully_qualified_N10_requirement'] for r in matrix['requirements'])
    required = {'official_requirement','description','existing_implementation','missing_functionality','inputs_outputs',
        'integration_points','security_privacy','deterministic_behavior_and_failure_handling','QA_acceptance',
        'required_authorization','dependencies_external_gates','can_complete_in_current_mission'}
    assert all(required.issubset(r) for r in matrix['requirements'])
    for name in ['audit.py','qa.py','write-matrix.py']:
        ast.parse((OUT/name).read_text(), filename=name)
    proposal = (ROOT / 'docs/DE_N10_SYNTHETIC_01.md').read_text()
    assert '**PROPOSED / INACTIVE.' in proposal
    assert re.search(r'^- Decision \(ACTIVATE / REJECT / REQUEST CHANGES\):$', proposal, re.M)
    assert re.search(r'^- Owner identity:$', proposal, re.M)
    scratch = Path('/tmp/astra-n10-master-20261030')
    assert scratch.is_dir() and not list(scratch.iterdir())
    records = [json.loads(line) for line in (OUT/'qa-resources.jsonl').read_text().splitlines()]
    assert len(records) == first['samples'] == 183
    assert [r['seq'] for r in records] == list(range(1,184))
    owned = {(p['pid'],p['birth']) for r in records for p in r['processes']}
    remaining = []
    for pid, birth in owned:
        try:
            text = Path('/proc',str(pid),'stat').read_text()
        except (FileNotFoundError,ProcessLookupError):
            continue
        if text[text.rfind(')')+2:].split()[19] == birth:
            remaining.append(pid)
    assert not remaining, ('Test-owned process remains', remaining)
    n16 = {p:h for p,h in unchanged.items() if p.startswith('artifacts/n16-')}
    old_final = json.loads((ROOT/'artifacts/n16-final-20261030/native/mission-closed.json').read_text())
    assert old_final['actual_startups'] == 4 and old_final['additional_startups_authorized'] == 0
    assert json.loads((ROOT/'artifacts/n16-master-20261029/native/startup-budget.json').read_text())['halted'] == 'UNAUTHORIZED_SQL'
    assert json.loads((ROOT/'artifacts/n16-06g-20261029/audited-outcome.json').read_text())['outcome'] == 'INCONCLUSIVE'
    link_re = re.compile(r'(?<!!)\[[^\]]*\]\(([^)]+)\)')
    pending = {'artifacts/n10-master-20261030/final-validation.json','artifacts/n10-master-20261030/changed-files.json',
        'artifacts/n10-master-20261030/evidence-manifest.json'}
    new_links = []
    for name in sorted(set(GOV) | new_files):
        prior = set(link_re.findall(baseline['governance'].get(name,'')))
        for link in link_re.findall((ROOT/name).read_text()):
            if link in prior or link.startswith(('#','https://','http://','mailto:','app://','plugin://')):
                continue
            p = ((ROOT/name).parent / unquote(link.strip('<>').split('#')[0])).resolve()
            relative = str(p.relative_to(ROOT))
            assert p.exists() or relative in pending, (name,link)
            new_links.append(relative)
    changes = [{'path':p,'operation':'MODIFIED' if p in modified else 'ADDED',
        'before_sha256':baseline['files'].get(p),'after_sha256':digest(ROOT/p)}
        for p in sorted(set(modified)|new_files)]
    write('changed-files.json', {'files':changes,'existing_executable_changes':['scripts/frontend-smoke.mjs'],
        'application_service_test_changes':0,'new_evidence_root':str(OUT.relative_to(ROOT))})
    write('preservation-after.json', {'status':'PASS','protected_before':1487,'unchanged':1479,
        'authorized_existing_changes':8,'historical_N16_files_preserved':len(n16),'new_N10_docs':2,
        'unchanged_sha256':unchanged,'original_prerequisite_columns_and_other_statuses_preserved':True,
        'sealed_database_opened_or_rehashed':False})
    def disk(p):
        s=p.lstat()
        assert not p.is_symlink()
        return max(s.st_size,s.st_blocks*512)+(sum(disk(c) for c in p.iterdir()) if p.is_dir() else 0)
    result = {'validation':'PASS_AUDIT_QA_AND_PRESERVATION','mission_result':'BLOCKED',
        'formal_N10_status':'Not Started; dependency-blocked','new_N10_feature_implementation':False,
        'fully_qualified_requirement_groups':0,'requirement_groups':10,
        'implementation_blocker':'Explicit N03/N07/N09 prerequisite boundary; no active N10 exception.',
        'proposed_exception':'DE-N10-SYNTHETIC-01','exception_state':'PROPOSED_INACTIVE',
        'proposal_sha256':digest(ROOT/'docs/DE_N10_SYNTHETIC_01.md'),
        'initial_baseline':first,'focused_rerun':counts,'distinct_checks_with_passing_applicable_results':176,
        'unchanged_initial_passes_not_in_focused_rerun':129,'initial_failures_preserved':2,
        'N10_full_acceptance':'NOT_RUN','new_browser_execution':'NOT_RUN',
        'syntax_JS_files':196,'syntax_errors':0,'Python_audit_files_parsed':3,
        'sample_records':183,'observed_process_identities':len(owned),
        'maximum_sampled_process_count':max(len(r['processes']) for r in records),'remaining_owned_processes':0,
        'remaining_scratch_entries':0,'protected_before':1487,'protected_unchanged':1479,
        'authorized_existing_changes':8,'historical_N16_files_preserved':len(n16),
        'source_database_access':0,'operational_database_access':0,'N16_designated_startups':0,'model_executions':0,
        'acquisition_or_dependency_installations':0,'all_other_module_statuses_preserved':True,
        'all_original_review_gates_preserved':True,
        'sealed_source_integrity':'Retained historical pin only; source not opened or rehashed.',
        'new_local_links_verified':len(new_links),'task_artifact_counted_bytes':disk(OUT),
        'resource_limitations':'Sampled existing QA observations only; no N10 resource certification or expired N16 authority used.',
        'next_decision':'Explicit activation of the proposed exception and approval of one consolidated synthetic N10 implementation.'}
    write('final-validation.json', result)
    def manifest():
        paths = [p for p in OUT.rglob('*') if p.is_file() and not p.is_symlink() and p.name!='evidence-manifest.json']
        paths += [ROOT/p for p in set(modified)|new_files]
        return {str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(paths)}
    write('evidence-manifest.json', {'algorithm':'SHA-256','self_hash_excluded':True,'files':manifest()})
    result['task_artifact_counted_bytes'] = disk(OUT)+65536
    result['closing_artifact_reserve_bytes'] = 65536
    write('final-validation.json', result)
    write('evidence-manifest.json', {'algorithm':'SHA-256','self_hash_excluded':True,'files':manifest()})
    for name in new_links:
        assert (ROOT/name).exists()
    for name,row in json.loads((OUT/'evidence-manifest.json').read_text())['files'].items():
        assert digest(ROOT/name) == row['sha256']
    print(json.dumps({k:result[k] for k in ['validation','mission_result','formal_N10_status',
        'distinct_checks_with_passing_applicable_results','protected_unchanged','historical_N16_files_preserved',
        'N16_designated_startups','remaining_owned_processes','task_artifact_counted_bytes']}))
else:
    raise SystemExit('Use before or after.')
