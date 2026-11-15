# N16-06 — designated synthetic source qualification

2026-10-29. **BLOCKED at containment; implementation incomplete; STOP.** The exception was validly activated, one sealed source was prepared, and a bounded suite ran. Four successful designated-source SQL tools were **not** demonstrated. N16 remains In Progress, not Complete.

## Authority and delivered work

Owner explicitly activated [DE-N16-DESIGNATED-READ-01](DE_N16_DESIGNATED_READ_01.md) and approved this one qualification under [N16-05 source/pins/limits](N16_05_SOURCE_DESIGNATION.md). Review found no broader or contradictory authority. [Preflight](../artifacts/n16-06-20261029/preflight.json) reverified only the approved authored donor, header, hash, no sidecars and saved schema provenance before implementation. Existing fixture/scratch exceptions and full prerequisites remain unchanged. Original exception proposal bytes are preserved in task evidence. The blocking containment result exhausted this task's execution authority; no correction or rerun followed the suite.

Four new source/test files; no preexisting application, worker, contract or QA source was changed:

- [designated-contract.mjs](../services/agent/designated-contract.mjs): immutable source/code pins, canonical receipt validation, archive-only projection and conservative freshness checks.
- [designated-source.mjs](../services/agent/designated-source.mjs): trusted launcher/caller capabilities, single sealed-source registration, existing worker dispatch, bounded supervision and external atomic traces. **Not qualified for further execution.**
- [n16-designated-demo.mjs](../scripts/n16-designated-demo.mjs): owner-operated CLI entry, fictional crew selector only; blocked workflow, not a working SQL demonstration.
- [n16-designated.test.mjs](../tests/n16-designated.test.mjs): focused integrity, scope, freshness, trace and failure controls. Harness lacks required batch fail-fast behavior; do not rerun without separate approval.

The original pinned N16-04 child and its query/schema/argument contracts were reused unchanged. No builder, writer, Store, Engine, createApp, detector, API, model, downloads or dependency installation was invoked. New documentation is this report; governance updates are AGENTS, exception, MASTER_PLAN, MODULE_TRACKER, CORE_AI_PRIORITY, DECISIONS, FEATURE_AUDIT and SESSION_HANDOFF. Saved source snapshots, logs, qualification/resource records and preservation checks are under `artifacts/n16-06-20261029`.

## Prepared source and provenance

Logical source `astra.n16.designated-synthetic.elevated.v1`, one canonical byte copy at `/var/tmp/astra-n16-designated-2v0ytq/source/source.sqlite`. Donor `/var/tmp/astra-n16-04-gJ6VxS/originals/elevated/source.sqlite` remains unchanged. Both are **65,536 bytes / SHA-256 `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73`** before/after. Source file mode0400 and directory0500, one main file only, no WAL/SHM/journal. Owner-controlled registration is [recorded here](../artifacts/n16-06-20261029/registration.json); source manifest is `/var/tmp/astra-n16-designated-2v0ytq/metadata/manifest.json`, SHA-256 `5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c`.

Schema/data expectation is bound by exact original bytes, N16-04's preserved schema/manifest and deterministic row digest `414e60b782176a34c297c1d55da519f1892332a9684e41a93be98fc6fd1d0e0e`. Static header identifies SQLite format3,4096-byte pages, non-WAL read/write header versions1. No fresh SQL schema enumeration, metadata query or row read occurred; current runtime SQL validation remains unverified. Full-byte identity ties the source to the previously authored six-crew/three-metric archive; no active operational path or export was selected.

Source time remains mission as_of2026-11-14T11:00Z, synthetic scenario `n16-sql-elevated`, seed42017, generator `astra.n16.scratch-sqlite.v1`, generation0. Host currency is not live; authored baselines are not a dated personal archive. Risk example is `authored_synthetic_fixture`, `actual_N02_event:false`, N02 provenance UNKNOWN. No new event, diagnosis or all-clear was generated. Finite additional copies were only deliberately damaged QA byte copies; no SQL construction or update occurred.

## Actual verification and blocking results

Four syntax checks and five non-native contract/CLI controls passed before the suite. [Focused suite log](../artifacts/n16-06-20261029/qa-first.txt): **32 tests,16 pass,16 fail,0 skipped**,8,759.147456ms. This is not a passing qualification. [Detailed qualification](../artifacts/n16-06-20261029/qualification.json) and [outcome](../artifacts/n16-06-20261029/outcome.json) retain the actual failures.

Every one of **14 worker startup attempts exited1 with `SOURCE_NOT_READONLY`**, before `DatabaseSync` construction and SQL statements. No successful tool read, quotation, risk result, four-tool demonstration or committed data result exists. `get_current_vitals`, `get_data_quality`, `get_personal_baseline` and `get_open_risk_events` remain unqualified for the designated source. Positive fixtures did not pass merely because negative inputs were rejected.

Confirmed facts: the existing worker's directory-write guard accepts EROFS only; its database O_RDWR guard accepts EROFS/ENOENT. It now sees a mode0400 file within a mode0500 directory. The returned generic failure did **not** retain the caught errno or which sub-check failed. Permission-denial precedence such as EACCES is a plausible explanation, **not a confirmed root cause**. No evidence establishes an actual writable source mount; likewise the failed guard cannot be treated as proof of read-only containment. No errno was invented, accepted or suppressed, permissions relaxed, frozen worker modified, or alternate execution attempted.

The suite's independent tests continued launching after the first blocking guard result: **13 subsequent attempts occurred in the same batch**. This is a confirmed harness fail-fast defect and did not comply with the exception's first-blocking-failure stop boundary. Each attempt was independently stopped by the worker guard before SQL. Once the batch returned, no new worker/native/SQL execution occurred; only saved-evidence, preservation and documentation checks followed. Future authority must not rely on this harness until fail-fast admission is corrected.

Passing coverage: source byte/manifest pin checks; deterministic positive/negative archive eligibility; forged context/role/crew and invalid request/CLI rejection; ten negative byte-copy/manifest/sidecar/symlink/replacement/missing/extra/hardlink rejections before SQL; already-aborted request creates no worker. Source-instance descriptor pins prevent the previous inode-reuse issue. These do not substitute for successful SQL. Runtime stale-result binding, SQL write-denial control, successful self-read, four-tool completion, cold committed-result recovery, admitted timeout/cancellation and post-read trace failure remain unverified because the containment guard intervened first. The cold-recovery test also encountered a missing-demo-result error; no completed demo existed to recover.

## Traces, isolation and resources

Actual dispatch/failure traces are external to the database under `/var/tmp/astra-n16-designated-2v0ytq/traces`. Non-native postflight verifies **27 saved trace runs /155 events**, every recorded hash chain and checkpoint. **Zero `CALL_COMPLETED` events** and no false successful data result. Interrupted/faulted traces retain incomplete states. These hashes provide reproducible integrity checks, not signatures or independent scientific approval. SQL-result recovery was not demonstrated in this task; N16-04's prior recovery evidence remains historical.

The private wrapper recorded `/mnt`, `/home`, `/project`, `/data`, `/root/.aws` and `/var/tmp` absent in every started worker. Source was requested through a read-only fd bind with inherited directory descriptors closed before Node. No network request, operational path access or application constructor occurred. The failed source-write guard means complete native containment qualification is **not passed**; do not promote partial path evidence into a blanket safety result.

| Recorded observation | Value / limitation |
|---|---|
| Startup measurements |14, all exit1; no SQL loading/query/throughput measurement. |
| Maximum sampled owned-process VmHWM |52,056,064 bytes;512MiB ceiling. Sampling is not a complete lifetime-peak certificate. |
| Maximum monitored counted storage |28,748,713 bytes;64MiB ceiling. Includes retained participating task roots, source/copies/output; open-unlinked pins explicitly charged. Monitoring is not a hard quota. |
| Maximum observer flush |146.433621ms; all recorded pending observers0. |
| Cleanup |Every measurement owned_remaining0; final postflight found no task worker. |
| Acquisition / network / model / operational SQL |Zero. |

Resource journal `/var/tmp/astra-n16-designated-2v0ytq/resources.jsonl` and saved qualification preserve incremental measurements/failures. Canonical source and donor hashes/inventory remain unchanged; no sidecar was created. [Final preservation validation](../artifacts/n16-06-20261029/final-validation.json) records310 selected preexisting hashes and authoritative table consistency. It is a preservation check, not a passing regression suite or whole-filesystem/production certificate.

## Remaining gates and exactly one next proposal

Separately approve **one QA-only containment-diagnostic and fail-fast correction task**: retain sealing/worker history, identify and safely record actual denial reasons, require independent read-only mount evidence before accepting any denial category, latch the first blocking failure across the batch and prove admission/cleanup with deterministic mocks. No SQL/native replay or permissions relaxation should be part of that correction unless explicitly separately authorized. This is a recommendation, not current authority.

The new adapter must not be connected to Health Agent, any active database or Qwen. All original N02/N10/N12/N14 and conditional N15/transitive/scientific/medical/full/release prerequisites remain open. N15 factual rule stays unreviewed/inactive and experimental prompt unpromoted. N16/N15/N14/N13/N07/N09 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified; other statuses unchanged. **STOP after blocked N16-06.**
