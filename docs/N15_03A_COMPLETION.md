# N15-03A — disk-accounting helper correction and focused QA

Date: 2026-10-25. **Delivered: helper-only correction, 30/30 focused non-native tests PASS.** This does not complete or resume N15-03 runtime qualification. **N15/N16 remain Not Started**, all other module statuses unchanged, N03 Partial/AC-20 Open / Unverified. No storage-policy renewal, download, installation, runtime/shared-library loading, inference, native-probe retry or operational ASTRA change.

## Confirmed cause and minimal correction

The preserved N15-03 `disk()` enumerates paths and then calls `lstat()`. Concurrent `atomic()` writes `resources-latest.json.new`, fsyncs it and replaces the committed path. Enumeration could capture the temporary name just before `os.replace()` removed it. The main-thread scan then raised FileNotFoundError. Original failure/helper/evidence remain unchanged in `artifacts/n15-03-20261025/`.

New QA-only module `scripts/n15_probe_accounting.py` supplies three small primitives:

- **`atomic_json` and `disk_usage` share one process-local RLock.** Coordinated scans cannot enumerate an owned atomic file midway through its replacement. There is no blanket ENOENT suppression, scan retry or omitted `.new` data. Orphan/incomplete temporary files remain included in apparent/allocated usage.
- **Atomic commits retain file flush/fsync + replace and add parent-directory fsync.** Same temporary-name convention; private file creation and `O_NOFOLLOW` prevent following a staging symlink. A failed pre-replace write leaves the old committed JSON intact. A directory-fsync failure is raised even if the replacement is visible; durability is not falsely certified.
- **Strict scandir traversal propagates directory/entry errors.** It preserves the prior non-symlink apparent-byte/allocated-block definition, including subdirectories. It does not follow symlinks. Missing roots or genuinely lost entries are errors rather than healthy zero usage. This also avoids rglob's potential suppression of directory traversal errors.
- **`fail_closed` closes the sticky failure gate and sets the stop event, then kills owned children before logging.** Already-exited children are handled; other kill failures are reported without skipping remaining children. Failure-record persistence errors are recorded separately and never reopen the gate or manufacture a healthy checkpoint.
- **Child start/registration and failure handling use the same existing child lock.** The helper rechecks failure/stop under that lock before starting and registering an owned child. Failure cannot close the gate and then miss a later registered child; an in-flight start is registered before the failure handler kills owned children. The subprocess arguments, limits and security configuration are unchanged. Focused controls use a mock start only, never an executable.

The existing temporary supervisor `/tmp/astra-n15-03-phase1.py` now delegates its two I/O functions to that module, uses fail-closed observer handling and serializes the startup gate/owned-child registration. It was **not imported or executed as a probe**. The original attempt marker and exhausted authorization remain; no new launcher or automatic resume was added. The final corrected fixture is preserved at `artifacts/n15-03a-20261025/probe-source-corrected-final.txt`; the earlier correction snapshot is also retained. Focused tests do not depend on `/tmp` surviving.

## Exact changed code and evidence

| File | Change |
|---|---|
| `scripts/n15_probe_accounting.py` | New isolated QA accounting/persistence/failure helper; no runtime/network/model APIs |
| `tests/n15_probe_accounting_test.py` | New stdlib unittest cases over small fixtures, deterministic barriers and mock children |
| `/tmp/astra-n15-03-phase1.py` | Helper import/delegation, observer error handling and child-gate/registration synchronization; no probe invocation |
| `artifacts/n15-03a-20261025/` | Additive corrected source snapshot, focused QA logs and integrity/preservation records |

Documentation: this report, AGENTS.md, N15_01_PLAN.md, DE_N14_N15_01.md, MODULE_TRACKER.md and SESSION_HANDOFF.md. No application/package/operational monitoring or existing QA file changed. Existing test/script sources and all old evidence remain preserved; only the two listed repository Python QA files were added.

## Focused verification

**30 distinct tests PASS** with the final durable fixture. Earlier28-case runs passed before two additional child-start controls were added; these are not cumulative independent-test counts. Four Python sources parsed successfully: new helper, focused test, patched temporary supervisor and preserved corrected text. Syntax validation does not execute/import the full supervisor or load native runtime code.

Controls cover:

- A deterministic reproduction in which the **original scanner fails** after enumerate→rename→stat, plus a barrier-controlled corrected writer/reader proving scanning waits for atomic publication.
- Clean startup, nested apparent/allocated totals, symlink policy and four concurrent writers/reader with valid complete checkpoints.
- Interrupted serialization/replace, orphan-only and corrupted committed state, next explicit commit, file→replace→directory fsync ordering and fsync errors. Recovery checks use only the committed path: no promotion of orphan data or automatic runtime restart.
- Permission failures, missing root, genuine disappearing entry and hostile staging symlink. None becomes a healthy fallback.
- Actual observer function isolated through AST, with injected scan and persistence errors; mock owned-child termination precedes failure logging. Sticky gate, already-exited children, kill denial and unwriteable failure logs remain explicit failures.
- Positive mock-only child startup/completion and a failure inserted between the initial precheck and registration: closed gates prevent a new spawn, while healthy starts still work. Failure and registration synchronization is checked without real subprocesses.
- Original exact runtime identity, URL/hash, all resource limits, watermark boundaries, networking/isolation settings, attempt marker and command configuration verified unchanged through AST comparison. Only intended wrappers/imports, observer exception handling and the explicitly tested child-gate/registration critical section differ.

The initial test run had27passes/1failure caused by the test's own final Barrier.abort racing with workers returning from their last barrier. Normal-completion cleanup was corrected; original and final logs are retained. No runtime or acceptance guard was changed to make tests pass.

Artifacts: [final QA log](../artifacts/n15-03a-20261025/focused-tests-complete.txt), [final corrected helper snapshot](../artifacts/n15-03a-20261025/probe-source-corrected-final.txt), [initial QA log](../artifacts/n15-03a-20261025/focused-tests-initial.txt). Fixtures were small ordinary temporary test files; no large runtime/model storage or expired N15-03 resource exception was used. No broad regression/browser suite or benchmark.

## Integrity and scope

The original external archive was read for SHA-256 only: **17,851,611 bytes**, **`cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`**. It was not executed, loaded, downloaded again, re-extracted, moved or modified. Old N15-03 reports/source/failure/resource records remain immutable. Final original-file/history/document checks and actual counts are recorded in this task's evidence.

Final offline verification **PASS**: **964 original source/data/evidence hashes unchanged**, **5,395 historical artifact size/mtime records unchanged**, **6 Markdown documents /319 local links**, all26 module IDs/status boundaries, archive size/SHA and exact temporary-helper/final-fixture match. Final30-test log, corrected source and QA/evidence hashes are recorded in `artifacts/n15-03a-20261025/verification.json`. Original application/package/test/script sources stayed unchanged; only the two new QA Python files were added. No runtime or probe retry occurred.

The lock coordinates **the supervisor's own threads**, not independent processes. Uncoordinated external deletion or real I/O failure still aborts instead of silently undercounting. Tests inject interruptions and verify fsync calls/order; they are not a physical power-loss test or cross-filesystem durability certification. Child termination is tested with mocks, not a native executable. An OS kill denial cannot be overridden; it stays an explicit error with closed gates. A failed filesystem cannot guarantee a new durable failure record; the prior committed checkpoint and in-memory failure remain, and owned-child termination is attempted first. No resource-overhead/native performance claim.

## Remaining qualification and exact resumption boundary

**N15-03 remains BLOCKED/incomplete.** Outstanding gates: complete ELF/dependency/symbol/CPU closure (including `libgomp.so.1` resolution), full embedded/bundled license notices and dependency-advisory assessment, then conditional network-denied runtime version/help/shared-library checks. No Qwen compatibility or model acquisition/inference approval follows from helper QA.

Smallest next separately approvable continuation: reuse and reverify the existing archive and saved static output; authorize only missing static checks, and native version/help **only if every mandatory pre-execution gate passes**. It needs a fresh explicit storage/resource policy; N15-03 Choice B remains expired. No redownload, packages, source compilation or fallback; stop on first failed gate. No module integration, N16 or model loading.

To rerun only this QA:

```bash
python3 -B -m unittest discover -s tests -p n15_probe_accounting_test.py -v
```

This command runs fixtures/isolated Python functions and mock children only; it does not run the complete supervisor. **STOP after N15-03A; separate owner approval required.**
