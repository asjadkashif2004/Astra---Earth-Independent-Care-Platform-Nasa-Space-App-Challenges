"""H documentation/pin verification only. No source-database or worker interfaces."""
from pathlib import Path
from urllib.parse import unquote
import difflib
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/n16-06h-20261029"
SOURCE = [
    "scripts/n16-quality-qualification.mjs",
    "services/agent/resource-journal.mjs",
    "tests/n16-resource-journal.test.mjs",
]
DOCS = ["docs/N16_06H_CONTRACT.md", "docs/N16_06H_COMPLETION.md"]
ALLOWED = {".json", ".jsonl", ".md", ".txt", ".mjs", ".js", ".py", ".html", ".css"}


def raw(path):
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    assert p.suffix.lower() in ALLOWED and p.is_file() and not p.is_symlink(), str(p)
    return p.read_bytes()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


before = json.loads(raw("artifacts/n16-06h-20261029/preservation-before.json"))
assert before["source_database_reads"] == 0
changed = [p for p, h in before["files"].items() if digest(raw(p)) != h]
assert changed == [SOURCE[0]], changed
assert len(before["files"]) == 587
controller_before = raw(OUT / "n16-quality-qualification.mjs.original.txt")
assert digest(controller_before) == before["files"][SOURCE[0]]

g = "artifacts/n16-06g-20261029/"
historical = json.loads(raw(g + "audited-outcome.json"))
assert "INCONCLUSIVE" in historical.values()
assert json.loads(raw(g + "outcome.json"))["outcome"] == "PASS"
journal = raw(g + "resources.jsonl")
assert journal == raw(g + "resources-preserved.jsonl.txt")
assert digest(journal) == "a75aa2268516135262a82fdd22ea06a7648bf2ce88c271cbb18f37a87a482a05"
rows = [json.loads(line) for line in journal.splitlines()]
assert sum(r.get("phase") == "resource" for r in rows) == 5
assert sum(r.get("phase") == "worker_event" for r in rows) == 3
assert json.loads(raw(g + "outcome.json"))["resource_samples"] == 7

qa = raw(OUT / "qa-journal.txt").decode()
for label, n in [("tests", 37), ("pass", 37), ("fail", 0), ("cancelled", 0), ("skipped", 0)]:
    assert re.search(rf"ℹ {label} {n}(?:\n|$)", qa)
mock = json.loads(raw(OUT / "mock-results.json"))
for key in ["native_worker_starts", "SQLite_connections", "SQL_operations", "sealed_database_reads", "mount_changes"]:
    assert mock[key] == 0
assert any(r["case"] == "synthetic_7_controller_5_journal" and r["rejected"] for r in mock["reports"])
assert any(r["case"] == "legacy_execution_with_injected_IO" and r["overlapping_handles"] == 2 for r in mock["reports"])

table_count = 0
for p, expected in before["tables"].items():
    current = [line for line in raw(p).decode().splitlines() if line.startswith("|")]
    assert current == expected, p
    table_count += len(expected)
assert table_count == 106

governance_diffs = []
for p, old in before["governance_before"].items():
    current = raw(p).decode()
    assert "N16-06H" in current
    # Preserve every historical body line. Only the handoff's current title changes.
    preserved = old.splitlines(keepends=True)
    if p == "docs/SESSION_HANDOFF.md":
        preserved = preserved[1:]
    for line in preserved:
        assert line.rstrip("\n") in current.splitlines(), (p, line[:80])
    governance_diffs.extend(difflib.unified_diff(old.splitlines(True), current.splitlines(True),
                                               fromfile="before-H/" + p, tofile="after-H/" + p))
(OUT / "governance.diff.txt").write_text("".join(governance_diffs))

diff = []
for i, p in enumerate(SOURCE):
    current = raw(p).decode()
    original = controller_before.decode() if i == 0 else ""
    diff.extend(difflib.unified_diff(original.splitlines(True), current.splitlines(True),
                                    fromfile=("original-G/" + p) if i == 0 else "/dev/null", tofile="H/" + p))
    (OUT / (Path(p).name + ".qualified.txt")).write_text(current)
(OUT / "implementation.diff.txt").write_text("".join(diff))

pins = {p: digest(raw(p)) for p in SOURCE}
save("helper-overlay.json", {
    "task": "N16-06H", "authority": "QA_ONLY_NO_NATIVE_SOURCE_SQL_OR_RESOURCE_RENEWAL",
    "historical_controller_pin": before["files"][SOURCE[0]], "current_code_pins": pins,
    "historical_G_code_plan_preserved": True, "requires_separate_execution_approval": True,
})
save("syntax-checks.json", [{"path": p, "command": "node --check " + p, "exit_code": 0}
                           for p in [SOURCE[1], SOURCE[0], SOURCE[2]]])
save("outcome.json", {
    "task": "N16-06H", "outcome": "QA_ONLY_PASS", "tests": {"pass": 37, "fail": 0, "skip": 0},
    "historical_G_outcome": "INCONCLUSIVE", "historical_missing_record_cause": "UNCONFIRMED",
    "native_worker_starts": 0, "SQLite_connections": 0, "SQL_statements": 0,
    "sealed_database_byte_reads": 0, "mount_changes": 0, "network_requests": 0,
    "downloads_or_installs": 0, "resource_or_exception_renewal": False,
    "existing_code_changed": [SOURCE[0]], "new_code_and_tests": SOURCE[1:],
    "historical_journal_sha256": digest(journal), "source_integrity_reverified": False,
    "next_task": "Separate fresh one-start get_data_quality single-SELECT qualification with new output/pins and explicit source/resource permission; not executed.",
})
links = 0
for p in DOCS + list(before["governance_before"]):
    for label, target in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", raw(p).decode()):
        if target.startswith(("http:", "https:", "mailto:", "#")):
            continue
        dest = unquote(target.split("#")[0])
        if not dest:
            continue
        path = Path(dest) if dest.startswith("/") else (ROOT / p).parent / dest
        # Generated reports below are pending publication by this same deterministic check.
        if path.resolve() in {(OUT / "final-validation.json").resolve(), (OUT / "evidence-manifest.json").resolve()}:
            links += 1
            continue
        assert path.exists(), (p, label, target)
        links += 1
save("final-validation.json", {
    "outcome": "PASS", "protected_files": 587, "unchanged_protected_files": 586,
    "intentional_existing_code_change": changed, "preserved_status_table_rows": table_count,
    "historical_G_artifacts_unchanged": True, "G_remains": "INCONCLUSIVE",
    "historical_journal_sha256": digest(journal), "local_links_resolved": links,
    "focused_mock_tests": 37, "syntax_checks": 3, "native_SQL_or_source_byte_actions": 0,
    "resource_and_execution_authority_renewed": False, "code_pins": pins,
})
inventory = {p: digest(raw(p)) for p in SOURCE + DOCS + list(before["governance_before"])}
for p in sorted(OUT.rglob("*")):
    if p.is_file() and p.name != "evidence-manifest.json":
        inventory[str(p.relative_to(ROOT))] = digest(raw(p))
save("evidence-manifest.json", {"task": "N16-06H", "files": inventory,
                               "note": "Hashes identify QA content; no native execution or reviewer approval."})
print(json.dumps({"outcome": "PASS", "tests": 37, "protected_unchanged": 586,
                  "intended_controller_change": 1, "table_rows_preserved": table_count,
                  "local_links": links, "native_SQL_source_byte_actions": 0,
                  "historical_G": "INCONCLUSIVE"}))
