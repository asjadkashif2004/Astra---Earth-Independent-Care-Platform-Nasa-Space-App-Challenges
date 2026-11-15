"""Report/preservation finalizer only. No SQL, worker, source DB or network access."""
from pathlib import Path
from urllib.parse import unquote
import difflib
import hashlib
import json
import os
import re

root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
before = json.loads((out / "preservation-before.json").read_text())
native = json.loads((out / "outcome.json").read_text())
audit = json.loads((out / "audited-outcome.json").read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
changed = []
for name, expected in before["files"].items():
    p = Path(name)
    assert p.suffix in {".json", ".jsonl", ".txt", ".mjs", ".js", ".py", ".md", ".html", ".css"}, name
    actual = sha(p)
    if actual != expected:
        changed.append({"file": name, "before": expected, "after": actual})
assert {r["file"] for r in changed} == {
    "services/agent/single-select-contract.mjs",
    "services/agent/single-select-runtime.mjs",
    "tests/n16-single-select.test.mjs",
}
for name, rows in before["tables"].items():
    assert [r for r in Path(name).read_text().splitlines() if r.startswith("|")] == rows, name
for name, old in before["governance_before"].items():
    current = Path(name).read_text()
    if name == "AGENTS.md":
        line = next(r for r in current.splitlines(True) if r.startswith("- **Latest N16-06G"))
        assert current.replace(line, "") == old
    else:
        assert old.split("\n", 1)[1].lstrip("\n") in current, name

plan = json.loads((out / "code-plan.json").read_text())
assert all(sha(Path(n)) == h for n, h in plan["code_pins"].items())
qa = json.loads((out / "mandatory-qa.json").read_text())
assert len(qa) == 4 and sum(r["pass"] for r in qa) == 140 and all(r["verified"] for r in qa)
syntax = json.loads((out / "syntax.json").read_text())
assert len(syntax) == 7 and all(r["exit_code"] == 0 for r in syntax)
assert native["actual_startups"] == native["sql_attempts"] == 1 and native["exit"]["code"] == 0
receipt = native["result"]["read_receipt"]
assert receipt["explicit_statement_count"] == receipt["authorizer_selects"] == 1
assert receipt["mode"] == "n16-06g-single-quality-v1"
assert native["result"]["tool"] == "get_data_quality"
assert native["source_before"] == native["source_after"] == receipt["source_before"] == receipt["source_after"]
assert native["source_after"]["source_sha256"] == "4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73"
assert all(a["action"] in [20, 21] for a in receipt["authorizer_actions"])
assert audit["outcome"] == "INCONCLUSIVE" and native["outcome"] == "PASS"
raw = (out / "resources.jsonl").read_bytes()
assert raw == (out / "resources-preserved.jsonl.txt").read_bytes()
assert sha(out / "resources.jsonl") == audit["journal_sha256"]
resources = [json.loads(r) for r in raw.splitlines()]
assert native["resource_samples"] == 7
assert sum(r["phase"] == "resource" for r in resources) == 5
assert sum(r["phase"] == "worker_event" for r in resources) == 3 and len(resources) == 8

run = out / "traces" / native["trace_id"]
rows = [json.loads(r) for r in (run / "trace.jsonl").read_text().splitlines()]
head = "GENESIS"
for i, row in enumerate(rows, 1):
    body = {k: v for k, v in row.items() if k != "hash"}
    assert row["seq"] == i and row["previous_hash"] == head
    assert hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest() == row["hash"]
    head = row["hash"]
assert len(rows) == 6
ref = next(r for r in rows if r["type"] == "CALL_COMPLETED")["payload"]["result"]
result_bytes = (run / ref["file"]).read_bytes()
assert hashlib.sha256(result_bytes).hexdigest() == ref["sha256"] and len(result_bytes) == ref["bytes"]
checkpoint = json.loads((run / "checkpoint.json").read_text())
assert checkpoint["seq"] == 6 and checkpoint["hash"] == head
cold = json.loads((out / "independent-recovery.json").read_text())
assert cold["new_process"] and cold["recovery"]["status"] == "COMPLETE" and cold["recovery"]["replayed_calls"] == 0

code = [
    "services/agent/single-select-contract.mjs",
    "services/agent/single-select-runtime.mjs",
    "tests/n16-single-select.test.mjs",
    "services/agent/single-quality-contract.mjs",
    "scripts/n16-quality-qualification.mjs",
    "tests/n16-single-quality.test.mjs",
]
snap = out / "source-snapshots"
snap.mkdir(exist_ok=True)
diffs = []
for name in code:
    current = Path(name).read_text()
    (snap / (Path(name).name + ".txt")).write_text(current)
    old = (out / (Path(name).name + ".original.txt")).read_text() if name in {r["file"] for r in changed} else ""
    diffs.extend(difflib.unified_diff(
        old.splitlines(True), current.splitlines(True),
        fromfile=name + " before" if old else "/dev/null", tofile=name + " N16-06G"))
(out / "implementation.diff.txt").write_text("".join(diffs))

record = {
    "task": "N16-06G", "outcome": "INCONCLUSIVE",
    "controller_reported_outcome_preserved": "PASS",
    "native_startups": 1, "readonly_connections": 1, "application_SELECT_statements": 1,
    "functional_SQL_read": "PASS", "source_integrity": "PASS", "committed_result_recovery": "COMPLETE",
    "resource_evidence_qualification": "UNRESOLVED: 7 reported samples, 5 persisted resource rows",
    "resource_rows": 5, "worker_event_rows": 3, "resource_journal_bytes_preserved": True,
    "mock_QA_pass": 140, "mock_QA_fail": 0, "mock_QA_skip": 0, "syntax_pass": 7,
    "frozen_code_pins_verified": len(plan["code_pins"]),
    "returned_tool": "get_data_quality", "returned_crew": "CREW-03", "metric": "heart_rate",
    "quality": {"status": "good", "confidence": 0.99, "artifact": False}, "measurement_value": None,
    "execution_status": "COMPLETED", "data_status": "KNOWN_AT_ARCHIVE_AS_OF",
    "source_full_hash_verified_before_after_execution": True, "source_sidecars_created": 0,
    "finalization_source_accesses": 0, "post_execution_native_or_SQL_retries": 0,
    "post_execution_implementation_changes": 0,
    "trace_id": native["trace_id"], "committed_events": 6, "committed_results": 1, "replayed_calls": 0,
    "native_wall_ms": native["native_wall_ms"], "DB_open_read_close_ms": receipt["sql_elapsed_ms"],
    "child_kernel_max_RSS": audit["worker_kernel_max_RSS"],
    "reported_max_process_RSS": native["max_process_RSS"], "reported_max_storage": native["max_counted_storage"],
    "no_observed_limit_breach": True, "owned_remaining": 0, "observer_pending": 0,
    "network_requests": 0, "downloads_or_installs": 0,
    "old_protected_hashes_checked": len(before["files"]), "old_protected_hashes_unchanged": len(before["files"]) - 3,
    "intentional_existing_changes": changed,
    "new_source_test_files": [n for n in code if n not in {r["file"] for r in changed}],
    "authoritative_table_rows_preserved": sum(len(r) for r in before["tables"].values()),
    "historical_governance_bodies_preserved": True,
    "statuses": "N16/N15/N14/N13/N07/N09 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress - Deferred; N06 Not Started - Deferred; AC-20 Open / Unverified; all other statuses and review gates unchanged.",
    "next_proposal": audit["next_proposal"], "task_authority": "EXHAUSTED / STOP; no additional worker or SQL",
}
(out / "final-validation.json").write_text(json.dumps(record, indent=2) + "\n")
docs = [*before["governance_before"], "docs/N16_06G_CONTRACT.md", "docs/N16_06G_COMPLETION.md"]
links = 0
for name in docs:
    p = Path(name)
    for raw_target in re.findall(r"\]\(([^)]+)\)", p.read_text()):
        target = raw_target.strip("<>").split("#", 1)[0]
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        target = unquote(re.sub(r":\d+$", "", target))
        assert (p.parent / target).exists(), (name, raw_target)
        links += 1
record["local_links_resolved"] = links
(out / "final-validation.json").write_text(json.dumps(record, indent=2) + "\n")
files = {}
for name in [*code, *docs]:
    p = Path(name)
    files[name] = {"bytes": p.stat().st_size, "sha256": sha(p)}
for p in out.rglob("*"):
    if p.is_file() and p.name != "evidence-manifest.json":
        files[str(p.relative_to(root))] = {"bytes": p.stat().st_size, "sha256": sha(p)}
(out / "evidence-manifest.json").write_text(json.dumps({
    "schema_version": "astra.n16-06g.evidence.v1", "outcome": "INCONCLUSIVE_RESOURCE_JOURNAL_GAP",
    "notice": "Original controller PASS/SQL result preserved; task audit INCONCLUSIVE. No retry/repair/new authority; manifest excludes itself.",
    "files": files,
}, indent=2) + "\n")
for p in out.iterdir():
    if p.is_file():
        fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
fd = os.open(out, os.O_RDONLY | os.O_DIRECTORY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
print(json.dumps({
    "outcome": "INCONCLUSIVE", "native_starts": 1, "SQL_SELECTs": 1, "mock_pass": 140,
    "protected_unchanged": record["old_protected_hashes_unchanged"],
    "table_rows_preserved": record["authoritative_table_rows_preserved"],
    "links": links, "evidence_files": len(files), "post_interruption_SQL_or_worker_starts": 0, "STOP": True,
}))
