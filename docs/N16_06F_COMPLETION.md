# N16-06F — single-SELECT execution qualification

2026-10-29. **PASS within this bounded task; exactly ONE native worker, ONE read-only connection and ONE application SELECT; exit0; STOP.** N16 remains In Progress. This is a sealed synthetic archive read, not operational access, a four-tool qualification, monitoring, Health Agent integration or scientific/medical validation.

## Authorization and preserved safety

The owner explicitly authorized a task-specific single-SELECT execution path under [DE-N16-DESIGNATED-READ-01](DE_N16_DESIGNATED_READ_01.md), including the narrowly scoped departure from frozen setup SQL that N16-06E did not authorize. [Contract and safety analysis](N16_06F_CONTRACT.md) identify each omitted statement's guarantee and its replacement. No unrelated module prerequisite or scientific-review requirement was waived.

The original two PRAGMAs provide query-only and trusted-schema safeguards; metadata SELECT verifies edition/profile/generation; BEGIN/ROLLBACK bound the multi-query read snapshot. The new mode uses genuine readOnly opening, disabled extensions/defensive mode, independent ro mounts and a restrictive authorizer. Full-byte/source-instance binding and exact preserved schema provenance replace metadata queries. Only the byte-pinned ordinary-table/index schema is accepted; there is no untrusted schema/function allowance. One SELECT needs no cross-query transaction. This does not claim trusted_schema is disabled or qualify arbitrary databases, live WAL sources or concurrent writers.

The child hashes/binds the exact source before diagnostic acknowledgement, then repeats source/mount verification after acknowledgement before SQLite construction and after closing. The parent also hashes it before admission and after execution. Same-context mount proof and actual denials are required; root/directory must deny with EROFS and source-file with EROFS/EACCES. EPERM is rejected in this mode. A durable acknowledgement binds diagnostic, source-binding and call digests before database opening. No read-only flag or errno alone supplies equivalent safety.

## Exact source/test changes

| File | Change |
|---|---|
| [designated-worker.mjs](../services/agent/designated-worker.mjs) | Existing worker gains explicit `n16-06f-single-select-v1` branch with dynamic import. Entire old workflow and frozen3,145-byte SQL block remain byte-identical for other modes. |
| [designated-source.mjs](../services/agent/designated-source.mjs) | Exactly one current worker-hash pin updated for the intentional additive change; no old caller redirected. |
| [single-select-contract.mjs](../services/agent/single-select-contract.mjs) | New strict scope/source/proof/ack policy and injected single prepare/get execution boundary; no setup/cleanup SQL. |
| [single-select-source.mjs](../services/agent/single-select-source.mjs) | New fixed-path, descriptor-anchored full-byte/source-instance/header/schema-provenance verifier; no SQLite. |
| [single-select-runtime.mjs](../services/agent/single-select-runtime.mjs) | New task-mode adapter binding real IO/mount evidence and genuine DatabaseSync to that policy. |
| [n16-single-select-qualification.mjs](../scripts/n16-single-select-qualification.mjs) | New fixed trusted caller/call, single-start reservations, isolated supervisor, durable diagnostics/resources/trace, receipt validation and recovery. |
| [n16-single-select.test.mjs](../tests/n16-single-select.test.mjs) | New deterministic mocked SQL/IO controls, old-code equality checks and actual file-only mock-trace recovery. |

[Worker diff](../artifacts/n16-06f-20261029/designated-worker.mjs.diff.txt) and [controller pin diff](../artifacts/n16-06f-20261029/designated-source.mjs.diff.txt) preserve exact modifications; originals and [old/new pin overlay](../artifacts/n16-06f-20261029/worker-pin-overlay.json) are retained. No query template, evidence/source bytes, schema, model, retrieval, dependency, operational application or monitoring code changed. Existing-mode preservation is source equality plus deterministic QA, not a new native replay of that workflow.

## Pre-execution QA and actual admission

[Frozen19-file plan](../artifacts/n16-06f-20261029/code-plan.json) records mode, code pins, CREW-03 and `heart_rate` before QA/native execution. [Mandatory QA](../artifacts/n16-06f-20261029/mandatory-qa.json): **108/108 PASS**, zero failures/skips:31new single-mode controls,45diagnostic controls,32pin-resolver controls. Seven syntax checks pass. No SQL/worker/source database access occurred in QA; QA traces are clearly separate mocked executions.

Coverage includes a discriminative actual mock prepare/get positive; forbidden tool/role/crew/SQL/metric counts; missing/tampered source/schema/identity; source substitution; sidecar/mode failures; EACCES/EROFS with/without mount proof; EPERM rejection; forged namespace; writable nested alias; missing/wrong/persistence-failed acknowledgement; SQL error/cleanup; missing row; post-read integrity failure; first-failure latch; and accept-all/reject-all detection. Authorizer mocks deny PRAGMA, transaction, function, schema/other-table reads and second SELECT. Mock completed/failed ledgers recover separately with replay0.

[Runtime preflight](../artifacts/n16-06f-20261029/preflight.json) passed runtime/code pins, authoritative registration/manifest/owner hashes, actual full source hash, exact schema provenance, identity/header/inventory, trusted authorization, memory/storage and atomic/fsynced trace availability. The exclusive invocation/startup reservation and shared first-failure latch admitted exactly one process. No native retry or fallback occurred.

## Actual SQL result

Executed controller:

```text
node scripts/n16-single-select-qualification.mjs
```

Inside the qualified private sandbox, the existing worker entered only the explicit single mode. It opened `/fixture/source.sqlite` with `readOnly:true`, no extensions, defensive settings and no SQL setup/cleanup. It prepared and executed exactly this unchanged template:

```sql
SELECT crew_id,metric,json,sha256 FROM observations WHERE crew_id=? AND metric=?
```

Bound parameters: `CREW-03`, `heart_rate`. Actual authorizer evidence records **one SELECT action and six READ actions**, all for allowed `main.observations` columns. No PRAGMA/transaction/metadata-table action was observed after authorizer installation. No other application SQL call exists in the mode. Instrumentation is not a complete SQLite engine/constructor-internals trace.

| Result field | Actual value |
|---|---|
| Execution / data status | COMPLETED / KNOWN **at archive mission as_of**, not host-current telemetry. |
| Fictional crew / metric | CREW-03 / heart_rate. |
| Value / unit |103 /min. |
| Quality |good, confidence0.99, artifactfalse. |
| Observation / receipt time |Both `2026-11-14T11:00:00.000Z`, preserved. |
| Event / source |`N16SQL:elevated:CREW-03:heart_rate:g0`; simulator `SQL-FIXTURE-CREW-03`, mission_simulation. |
| Provenance |synthetic, elevated generation0, seed42017, `astra.n16.scratch-sqlite.v1`. |
| Host currency / monitoring health |NOT_LIVE_ARCHIVE / UNKNOWN; Earth receipt null. |
| Inference / clinical support |false /false; no alert or medical conclusion generated. |

[Actual outcome and complete returned result](../artifacts/n16-06f-20261029/outcome.json) retain canonical provenance, actual selected-row digest, query/parameter hashes, authorizer actions and source bindings. The parent verifies the returned row/result against canonical evidence; it never substitutes expected values for an unexecuted read.

## Integrity, containment, trace and resources

The exact65,536-byte source has full before/after SHA-256 `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73`. Parent and child verified that digest, instance device/inode/birth/change identity,0400/0500 sealing, closed-rollback header and single-file inventory. No WAL/SHM/journal or new source was created. The source spec digest remains `f28e5829bb4f7354a2ab6c6202efc23a0985d1dcb6ac401522f4716fb62a1669`; schema text digest `21bd7f9b770f67e1d6528daa6bd7e71864095fdababee8435be927826bff082a` is bound through preserved provenance, without schema SQL. Donor was not read or modified.

[Durable diagnostic](../artifacts/n16-06f-20261029/diagnostic.json) binds hash `c60e078c779ccc7dc48acbab98ab511151c4a6f0804f29b165f5c550d4f57244`. Actual root/source mounts are independently ro in stable namespace `mnt:[4026532224]`; root/directory open attempts EROFS(-30), source-file O_RDWR EACCES(-13), all context-bound and acknowledged. Private net namespace `net:[4026532229]`, routing table header only, six forbidden host prefixes absent. Only approved code/runtime/spec and source are staged; no operational database, home, credentials, application tree or network is exposed. No API/Store/Engine/createApp, N02, Qwen, UI or Scenario Lab call occurred.

Actual trace run: **`3b9e1a8b-3887-44da-bd51-eee1142e77f4`**, [six-event ledger](../artifacts/n16-06f-20261029/traces/3b9e1a8b-3887-44da-bd51-eee1142e77f4/trace.jsonl), [committed result](../artifacts/n16-06f-20261029/traces/3b9e1a8b-3887-44da-bd51-eee1142e77f4/call-01.json), checkpoint/hash verified. A [fresh-process file-only recovery](../artifacts/n16-06f-20261029/independent-recovery.json) returns COMPLETE, one completed call, zero replay and no uncommitted tail. QA mock traces remain separate; failed/mock calls are not counted as native results.

| Measurement | Actual result |
|---|---|
| Native startup / exit |1 /0. |
| Native worker duration |329.563770ms. |
| Database open/read/close section |7.919939ms; includes constructor/prepare/get/close, not only SQL stepping. |
| Worker kernel maximum RSS |57,565,184bytes =54.8984375MiB. |
| Maximum monitored process RSS |77,602,816bytes =74.0078125MiB; below512MiB. |
| Maximum runtime counted storage |5,017,153bytes =4.78473MiB; below64MiB. |
| Durable observations |Six resource samples plus three worker events; nine journal rows. |
| Cleanup |Owned/observers/queued/running0; independent process metadata check found no remaining worker/controller. |
| Network / download / installation |0 /0 /0. |

[Postflight](../artifacts/n16-06f-20261029/postflight.json) and [resource journal](../artifacts/n16-06f-20261029/resources.jsonl) retain measurements. Active20ms non-overlapping RSS/storage sampling, heap64MiB, CPU1s/wall1s, cancellation/escalation and parent-death controls remained in place. Monitored storage is not a hard quota and RSS evidence is sampled/child kernel-reported, not a continuous all-process lifetime certificate. No limit was expanded.

## Preservation, open gates and next proposal

All475unmodified protected old code/evidence hashes remain unchanged; the two intended existing-source changes have preserved originals/diffs and new pins. [Final validation](../artifacts/n16-06f-20261029/final-validation.json) records exact status/dependency table and historical governance preservation, frozen-code hashes and source/result/trace integrity. New docs are this completion and the F contract; authoritative governance/tracker/handoff add truthful current scope/results. No historical failure or independent review is reclassified.

N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. Other statuses, original direct/transitive/scientific/medical/full/release gates and inactive/unreviewed N15 support rule remain unchanged; experimental prompt remains unpromoted.

Only this selected crew/metric and tool have native designated-source evidence. The other three tools, broader missing/stale/malformed native data, live/WAL behavior, operational integration, clinical validity and full N16 acceptance remain unqualified. The narrow schema-safety equivalence applies only to the exact pinned sealed archive; arbitrary databases remain prohibited. Current F startup/source/resource authority expires; no second read is implied.

**Exactly one next proposed task:** separately authorize a bounded `get_data_quality` single-SELECT mode and one qualification against the same sealed source/crew/metric, preserving F behavior, canonical provenance, authorization, mount/ack gates and traces, with fresh one-start/resource permission. Do not execute it or the remaining tools automatically; no Health Agent, operational database or LLM integration. STOP after N16-06F.
