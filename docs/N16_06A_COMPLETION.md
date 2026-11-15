# N16-06A — containment diagnostics and fail-fast QA repair

2026-10-29. **QA-only PASS / STOP. N16-06 runtime qualification remains BLOCKED.** No designated worker, SQLite connection/statement, source-byte read, mount change or native qualification replay occurred.

## Confirmed defects and corrections

1. Original containment checks discarded errno/syscall/stage and merged two failed sub-checks into SOURCE_NOT_READONLY. Saved N16-06 records cannot establish the actual errno or root cause. New structured diagnostics identify root/source-directory/source-file or mount-assertion failure and retain sanitized operation/code/errno, expected versus observed property and source identity. No private host paths or raw exception messages are retained.
2. Independent tests issued new callers through a launcher with no batch-level latch. N16-06 made14starts despite the first blocker. A shared monotonic admission gate now stops future starts, cancels queued work, aborts/drains active work, withholds late success and records first failure/attempt count. The initial failing test remains failed; later test callbacks are NOT_RUN/skipped, never passed.

Independent positive read-only mount evidence is mandatory before denial probes can contribute. Denial code alone never proves containment. The designated-only wrapper waits for parent validation and durable diagnostic acknowledgement before SQLite construction; logging failure cannot release that barrier. The final receipt/trace must bind the acknowledged digest and namespace. Details: [contract](N16_06A_CONTRACT.md).

## Exactly six source/test files

| File | Change |
|---|---|
| [containment-diagnostics.mjs](../services/agent/containment-diagnostics.mjs) | New pure injected-IO mount/denial diagnostics, strict record verification, persistence/acknowledgement and receipt binding. |
| [qualification-batch.mjs](../services/agent/qualification-batch.mjs) | New shared latch/serial admission, startup counts, cancellation/drain, explicit failure/not-run records and skip wrapper. |
| [designated-worker.mjs](../services/agent/designated-worker.mjs) | New designated-only diagnostic entry; frozen query block copied byte-for-byte, no builder/writer and no execution in this task. |
| [designated-source.mjs](../services/agent/designated-source.mjs) | Narrow wiring for code pins, diagnostic barrier/audit and shared admission; unchanged source identity/sealing/query semantics. |
| [n16-designated.test.mjs](../tests/n16-designated.test.mjs) | Existing SQL harness wraps callbacks for NOT_RUN after block, drains cleanup and writes unique attempt outputs. All original assertion lines unchanged; **not run**. |
| [n16-containment-qa.test.mjs](../tests/n16-containment-qa.test.mjs) | New deterministic non-SQL guard/persistence/launcher/trace fixtures and integration source checks. |

The complete old `sqlite-fixture-process.mjs` remains SHA-256 `3a7009f7a9eff8591430c6fa01ef10503a18e0bca31887165211ac026d499745`. New entry's full3,145-byte SQL/constructor/authorizer/result block has the identical hash recorded in [query-block evidence](../artifacts/n16-06a-20261029/frozen-query-block.json). [Overlay](../artifacts/n16-06a-20261029/diagnostic-overlay.json) records additive pins only; it grants no execution authority. Original source manifest/schema/contracts, model/retrieval/N02/UI behavior and exception documents remain unchanged.

## Focused non-SQL verification

Command actually run:

```sh
node --test --test-isolation=none tests/n16-containment-qa.test.mjs
```

[Final log](../artifacts/n16-06a-20261029/qa-final.txt): **45/45 tests pass,0fail/0skip**,157.36988ms. Six syntax checks pass; parsing `designated-worker.mjs` does not import/execute it. Earlier40- and43-control runs/logs remain preserved; final additions cover receipt binding and latch timing across pending persistence. No unrelated or SQL suite was run.

Coverage includes EACCES/EROFS/EPERM with independent proof, absent/ambiguous/inconsistent/writable mount evidence, unexpected/missing/mismatched errno, successful write rejection, redaction, record corruption, missing trace, durable receipt/hash checks, failed/pending persistence, acknowledgement failure and exact receipt binding. Positive mock proof/launch controls pass, so universal rejection cannot satisfy the suite. Unsafe proof or log failure cannot produce acknowledgement.

Batch controls cover first failure, pending/late admissions, already-active cleanup, cleanup callbacks, ignored cancellation/late success, cleanup deadline, hung/failed evidence persistence, immutable first failure and explicit executed failure versus NOT_RUN. [Saved mock example](../artifacts/n16-06a-20261029/mock-results.json): **one mocked startup**, first SOURCE_NOT_READONLY retained, queued plus late launches NOT_RUN, running0/queued0. These are simulated results; **actual worker startups0, SQL0, database file opens0, mount changes0**. Node's real globals/timers and injected IO/launch functions were used; no fake runtime model or native source access was substituted.

## Preservation and limitations

[Final validation](../artifacts/n16-06a-20261029/final-validation.json) records384 protected hashes unchanged, including the old frozen worker, contracts, N16-06 saved results/source snapshots, original source manifest, resource journal and54 external trace/checkpoint files. Two intentionally modified adapter/harness files have their originals retained in task evidence; four new files are listed above. Authoritative tables and historical governance text are preserved. No sealing function/permission policy or old assertion line changed.

Recorded database/donor digest `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73` is retained from N16-06. **Neither database was opened, read, rehashed or modified here.** This task preserves the saved integrity records and performs no source writes; it does not claim a fresh database-byte attestation. No source permission relaxation, fixture rebuilding, API/constructor/worker/model execution, downloads/network/installations, monitoring/telemetry/Scenario Lab/Health Agent change or storage-policy renewal occurred.

All mount/errno qualifications here use deterministic fixtures. Actual mountinfo layout, possible overmount ambiguity, real error ordering, guarded acknowledgement, native cancellation and successful four-tool SQL reads remain unverified. Independent scientific/medical decisions, N15 rule approval and original N16 prerequisites are not satisfied by helper QA.

## Exactly one next proposal

Separately approve **one isolated containment-only N16-06 continuation** using the retained sealed source and this pinned diagnostic overlay, with fresh explicit resource/source-access permission, one startup, zero network/acquisition and no SQLite connection/query. Collect actual mount evidence and exact errno, persist it, apply first-failure latch and stop without releasing SQL. No automatic retry, permissions change, new source or follow-on SQL qualification. This is a proposed next task only.

N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified; all other statuses/direct/transitive/scientific/medical/full/release gates unchanged. N15-11 rule remains unreviewed/inactive and prompt unpromoted. **STOP after N16-06A; do not rerun N16-06.**
