"""File-only closure. Never opens the sealed database or launches SQL/workers."""
from pathlib import Path
import difflib, hashlib, json, os, re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/n16-final-20261030'
sha = lambda data: hashlib.sha256(data).hexdigest()
load = lambda path: json.loads(Path(path).read_text())
before = load(OUT / 'preservation-before.json')
plan = load(OUT / 'code-plan.json')
execution = load(OUT / 'execution-validation.json')
modified_code = {
    'services/agent/master-contract.mjs',
    'services/agent/master-coordinator.mjs',
    'services/agent/master-storage.mjs',
    'services/agent/master-supervisor.mjs',
    'tests/n16-master.test.mjs',
}
new_code = {
    'services/agent/fixed-select-authorizer.mjs',
    'services/agent/recorded-health-demo.mjs',
    'scripts/n16-final-demo.mjs',
    'tests/n16-authorizer.test.mjs',
    'tests/n16-final-evidence.test.mjs',
    'tests/n16-recorded-demo.test.mjs',
}
new_docs = {'docs/N16_FINAL_DEMO.md', 'docs/N16_FINAL_ENGINEERING_CONTRACT.md'}
governance = set(before['governance'])
report = 'docs/N16_MASTER_COMPLETION_REPORT.md'
allowed_changes = modified_code | governance | {report}

def save(path, obj):
    path = Path(path)
    data = (json.dumps(obj, indent=2, sort_keys=True) + '\n').encode()
    temporary = path.with_name(path.name + '.new')
    with temporary.open('xb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporary, path)
    fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)
    assert path.read_bytes() == data

changed = {}
unchanged = {}
for name, expected in before['files'].items():
    p = ROOT / name
    assert p.is_file() and not p.is_symlink(), ('Missing/unexpected path', name)
    actual = sha(p.read_bytes())
    (changed if actual != expected else unchanged)[name] = actual
assert set(changed) == allowed_changes, ('Unexpected changed files', set(changed) ^ allowed_changes)
assert len(before['files']) == 1178 and len(unchanged) == 1164 and len(changed) == 14
new_files = set()
for base in ['services', 'scripts', 'tests', 'apps', 'packages', 'docs']:
    for p in (ROOT / base).rglob('*'):
        if p.is_file() and not p.is_symlink() and p.suffix in {'.mjs', '.js', '.md', '.json', '.css', '.html', '.py'}:
            name = str(p.relative_to(ROOT))
            if name not in before['files']:
                new_files.add(name)
assert new_files == new_code | new_docs, ('Unexpected new code/document', new_files ^ (new_code | new_docs))

originals = OUT / 'originals'
for p in originals.iterdir():
    name = p.name.replace('__', '/')
    assert sha(p.read_bytes()) == before['files'][name], ('Original changed', name)
original_report = (originals / report.replace('/', '__')).read_text()
assert (ROOT / report).read_text().endswith(original_report), 'Historical report body changed'
historical = {p: h for p, h in unchanged.items() if p.startswith('artifacts/')}
assert len(historical) > 400
assert not any(p.startswith('artifacts/') for p in changed)
old_budget = load(ROOT / 'artifacts/n16-master-20261029/native/startup-budget.json')
assert old_budget['halted'] == 'UNAUTHORIZED_SQL' and len(old_budget['reservations']) == 5
assert load(ROOT / 'artifacts/n16-06g-20261029/audited-outcome.json')['outcome'] == 'INCONCLUSIVE'

for name, expected in plan['code_pins'].items():
    assert sha((ROOT / name).read_bytes()) == expected, ('Executed code drift', name)
    assert sha((OUT / 'executed-code' / name.replace('/', '__')).read_bytes()) == expected
assert len(plan['code_pins']) == 27
assert execution['status'] == 'PASS_FILE_ONLY_EVIDENCE_VALIDATION'
assert execution['task_native_startups'] == execution['explicit_SELECT_statements'] == execution['committed_results'] == 4
assert execution['resource_samples'] == 31 and execution['resource_journal_rows'] == 43
assert execution['authorization_callbacks'] == 39 and execution['replayed_calls'] == 0
assert execution['remaining_owned_processes'] == 0
assert execution['new_native_startups'] == execution['new_SQL_operations'] == 0
closed = load(OUT / 'native/mission-closed.json')
assert closed['additional_startups_authorized'] == 0 and closed['unused_startups_expired'] == 2
assert closed['source_resource_permissions_expired'] is True
assert "mission-closed.json" in (ROOT / 'scripts/n16-final-demo.mjs').read_text()

qa = []
for name, expected in [('qa-deterministic-02.txt', 298), ('qa-regressions.txt', 272), ('qa-postflight.txt', 13)]:
    text = (OUT / name).read_text()
    values = {key: int(re.search(r'ℹ ' + key + r' (\d+)', text).group(1))
              for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped']}
    assert values == {'tests': expected, 'pass': expected, 'fail': 0, 'cancelled': 0, 'skipped': 0}
    qa.append({'path': str((OUT / name).relative_to(ROOT)), 'sha256': sha((OUT / name).read_bytes()), **values})
assert sum(x['pass'] for x in qa) == 583
syntax = (OUT / 'qa-syntax-completion.txt').read_text()
assert '196 JavaScript files parsed and local imports checked; 0 errors.' in syntax
assert 'PASS_FILE_ONLY_EVIDENCE_VALIDATION' in (OUT / 'qa-final-evidence-complete.txt').read_text()

table_changes = []
for name, previous in before['tables'].items():
    current = [line for line in (ROOT / name).read_text().splitlines() if line.startswith('|')]
    assert len(previous) == len(current)
    for old, new in zip(previous, current):
        if old != new:
            assert name in {'docs/MASTER_PLAN.md', 'docs/MODULE_TRACKER.md'} and 'N16 Executed Crew Health Agent' in old and 'In Progress' in new
            if name == 'docs/MASTER_PLAN.md':
                assert old.split('|')[3:] == new.split('|')[3:], 'N16 prerequisite/verification columns changed'
            table_changes.append({'path': name, 'before': old, 'after': new})
assert len(table_changes) == 2

records = []
implementation = []
documentation = []
for name in sorted(allowed_changes | new_files):
    current = (ROOT / name).read_text()
    if name in governance:
        previous = before['governance'][name]
    elif name in allowed_changes:
        previous = (originals / name.replace('/', '__')).read_text()
    else:
        previous = ''
    difference = ''.join(difflib.unified_diff(previous.splitlines(True), current.splitlines(True),
        fromfile=('a/' + name if previous else '/dev/null'), tofile='b/' + name))
    (implementation if name in modified_code | new_code else documentation).append(difference)
    records.append({'path': name, 'operation': 'MODIFIED' if previous else 'ADDED',
        'before_sha256': sha(previous.encode()) if previous else None,
        'after_sha256': sha((ROOT / name).read_bytes())})
(OUT / 'implementation.diff.txt').write_text('\n'.join(implementation))
(OUT / 'governance.diff.txt').write_text('\n'.join(documentation))
save(OUT / 'changed-files.json', {'modified_preexisting': 14, 'new_code_test_docs': 8, 'files': records,
    'new_task_evidence_root': str(OUT.relative_to(ROOT)), 'historical_artifacts_modified': 0})
save(OUT / 'preservation-after.json', {'status': 'PASS', 'previously_pinned': 1178, 'unchanged': 1164,
    'intentional_existing_changes': 14, 'new_source_test_docs': 8, 'unchanged_sha256': unchanged,
    'historical_artifact_files_preserved': len(historical), 'executed_code_pins_verified': 27,
    'non_N16_table_rows_unchanged': True, 'original_N16_dependency_verification_columns_unchanged': True,
    'intentional_N16_table_updates': table_changes, 'source_database_reopened_by_closing_audit': False,
    'old_campaign_latch': old_budget, 'historical_G_status': 'INCONCLUSIVE'})

# Validate newly introduced links, preserving unrelated historical documentation.
link_re = re.compile(r'(?<!!)\[[^\]]*\]\(([^)]+)\)')
pending = {'artifacts/n16-final-20261030/final-validation.json', 'artifacts/n16-final-20261030/evidence-manifest.json'}
links = []
for name in sorted(governance | new_docs | {report}):
    current = (ROOT / name).read_text()
    if name == report:
        current = current.split('## Historical master mission report — retained verbatim')[0]
        old = ''
    else:
        old = before['governance'].get(name, '')
    prior_links = set(link_re.findall(old))
    for link in link_re.findall(current):
        if link in prior_links or link.startswith(('#', 'https://', 'http://', 'mailto:', 'plugin://', 'app://')):
            continue
        target = unquote(link.strip('<>').split('#')[0])
        p = ((ROOT / name).parent / target).resolve()
        relative = str(p.relative_to(ROOT))
        assert p.exists() or relative in pending, ('Broken new local link', name, link)
        links.append({'document': name, 'target': relative})

def counted(path):
    path = Path(path)
    s = path.lstat()
    assert not path.is_symlink(), ('Unexpected accounting symlink', str(path))
    total = max(s.st_size, s.st_blocks * 512)
    if path.is_dir():
        total += sum(counted(p) for p in path.iterdir())
    return total

# Frozen immutable inputs were already fully charged and verified. Rescan all new
# task output and isolated regression scratch, and charge new governance/docs too.
external = {p: size for p, size in plan['fixed_storage'].items()
            if not p.startswith('artifacts/n16-final-20261030')}
extra = {p: counted(ROOT / p) for p in sorted(allowed_changes | new_files) if p not in external}
scratch = Path('/tmp/astra-n16-final-20261030')
ceiling = 64 * 1024 * 1024
storage_base = sum(external.values()) + sum(extra.values()) + plan['fixed_directory_overhead']
storage_scratch = counted(scratch) if scratch.exists() else 0
storage_now = storage_base + counted(OUT) + storage_scratch
assert storage_now + 2 * 1024 * 1024 < ceiling, 'Insufficient closing artifact reserve'
final = {
    'status': 'PASS_EVIDENCE_VALIDATION',
    'engineering_result': 'ENGINEERING COMPLETE',
    'formal_N16_status': 'In Progress',
    'SQL_tools_qualified': 4,
    'coordinator': 'PASS', 'cold_recovery': 'PASS', 'replayed_calls': 0,
    'standalone_recorded_demo': 'PASS', 'operational_Health_Agent_integration': 'NOT AUTHORIZED',
    'native_startups': 4, 'native_budget': 6, 'unused_startups_expired': 2,
    'new_native_startups_in_closing_audit': 0, 'new_SQL_operations_in_closing_audit': 0,
    'tests': {'passed': 583, 'failed': 0, 'skipped': 0, 'suites': qa},
    'syntax': {'JavaScript_files': 196, 'errors': 0},
    'execution_evidence': execution,
    'preservation': {'previously_pinned': 1178, 'unchanged': 1164, 'authorized_existing_changes': 14,
        'new_source_test_docs': 8, 'historical_artifact_hashes_preserved': len(historical),
        'executed_code_pins_verified': 27, 'all_other_module_status_rows_unchanged': True,
        'old_campaign_latch_unchanged': True, 'historical_G': 'INCONCLUSIVE'},
    'new_local_links_verified': len(links),
    'storage': {'ceiling_bytes': ceiling, 'runtime_max_counted_bytes': execution['maximum_runtime_counted_storage_bytes'],
        'closing_counted_bytes': storage_now, 'fixed_input_charge_bytes': sum(external.values()),
        'additional_participating_code_docs_bytes': sum(extra.values()), 'scratch_bytes': storage_scratch,
        'frozen_input_accounting_retained': True, 'hard_filesystem_quota': False},
    'network_requests': 0, 'downloads_or_installs': 0, 'model_executions': 0, 'operational_DB_access': 0,
    'authority': closed,
    'external_gates': ['Operational Health Agent integration authorization', 'Original broader N16 execution graph and metrics',
        'N10/N12/N14 and conditional N15 plus transitive prerequisites', 'Independent scientific/medical reviews and original browser/release gates'],
    'limitations': ['RSS sampling can miss short-lived peaks; no absolute RSS cap certification.',
        'Monitored disk accounting is not a hard quota.',
        'Source timestamp belongs to a synthetic mission clock, not live astronaut data.',
        'Only CREW-03 heart_rate and existing authored risk records have native evidence here.',
        'No scientific, clinical, independent evaluation, WCAG or production-readiness certification.'],
}
save(OUT / 'final-validation.json', final)

def inventory():
    rows = {}
    for p in sorted(OUT.rglob('*')):
        if p.is_file() and not p.is_symlink() and p.name != 'evidence-manifest.json':
            rows[str(p.relative_to(ROOT))] = {'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())}
    for p in sorted(allowed_changes | new_files):
        f = ROOT / p
        rows[p] = {'bytes': f.stat().st_size, 'sha256': sha(f.read_bytes())}
    return rows

save(OUT / 'evidence-manifest.json', {'algorithm': 'SHA-256', 'self_hash_excluded': True, 'files': inventory()})
for link in links:
    assert (ROOT / link['target']).exists()
# Final inventory includes these final bytes; report a separately reserved 64 KiB
# margin for the last manifest/log persistence without claiming a hard quota.
closing = storage_base + counted(OUT) + storage_scratch + 65536
assert closing < ceiling
final['storage']['closing_counted_bytes'] = closing
final['storage']['closing_manifest_log_reserve_bytes'] = 65536
save(OUT / 'final-validation.json', final)
save(OUT / 'evidence-manifest.json', {'algorithm': 'SHA-256', 'self_hash_excluded': True, 'files': inventory()})
for name, record in load(OUT / 'evidence-manifest.json')['files'].items():
    assert sha((ROOT / name).read_bytes()) == record['sha256'], ('Final inventory drift', name)
print(json.dumps({'status': final['status'], 'engineering_result': final['engineering_result'],
    'formal_N16_status': final['formal_N16_status'], 'tests_passed': 583, 'tests_failed': 0,
    'native_startups': 4, 'unchanged_old_hashes': 1164, 'old_artifact_hashes': len(historical),
    'closing_counted_bytes_including_reserve': closing, 'remaining_owned_processes': 0}))
