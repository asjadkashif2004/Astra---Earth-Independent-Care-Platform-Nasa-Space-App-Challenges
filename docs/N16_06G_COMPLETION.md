# N16-06G — one get_data_quality read; resource evidence inconclusive

2026-10-29. **Overall INCONCLUSIVE; exactly ONE native startup/connection/SELECT, exit0; STOP.** The real SQL read, source integrity and committed-result trace passed. Postflight found an unreconciled resource-journal count: the controller reports seven samples, but only five resource rows are preserved. No code correction, retry, fallback or further tool execution followed that finding.

The original [controller outcome](../artifacts/n16-06g-20261029/outcome.json) reports PASS and remains unchanged. The authoritative task assessment is the separate [audited outcome](../artifacts/n16-06g-20261029/audited-outcome.json), INCONCLUSIVE. Do not present G as fully qualified or overwrite valid SQL evidence because a different component remains unresolved.

## Implementation and preflight

The owner's fresh G authorization under [DE-N16-DESIGNATED-READ-01](DE_N16_DESIGNATED_READ_01.md) permits only one quality read on the same sealed synthetic source, with512MiB process memory/64MiB monitored storage and no network/acquisition. [G contract](N16_06G_CONTRACT.md) retains F's exact-source safety case and stronger containment controls. Original module/scientific prerequisites remain open.

| File | Exact bounded change |
|---|---|
| [single-select-contract.mjs](../services/agent/single-select-contract.mjs) | Four policy-selection edits let a trusted internal caller select mode/authorization; default F vitals behavior, SQL, connection, authorizer, source/mount/ACK and receipt validation remain unchanged. |
| [single-select-runtime.mjs](../services/agent/single-select-runtime.mjs) | Lazy dispatch of the explicit G request schema to its fixed quality policy; F requests use the original executor. |
| [n16-single-select.test.mjs](../tests/n16-single-select.test.mjs) | Two QA-output paths redirected into G. All original assertions unchanged; historical F evidence receives no new traces. |
| [single-quality-contract.mjs](../services/agent/single-quality-contract.mjs) | New quality-only authorization and downgrade-only metadata/freshness assessment, using the same executor and canonical projection. |
| [n16-quality-qualification.mjs](../scripts/n16-quality-qualification.mjs) | New task-only controller, fixed CREW-03/heart_rate request, fresh output/reservation and stricter participating-artifact accounting; no extra SQL. |
| [n16-single-quality.test.mjs](../tests/n16-single-quality.test.mjs) | New deterministic quality, scope, preservation, failure and mock-trace controls. |

[Complete implementation diff](../artifacts/n16-06g-20261029/implementation.diff.txt) and saved originals identify all changes. The worker, old multi-statement block, parent worker pin, F qualifier, source verifier, schema and SQL templates remain byte-identical to F. The native worker uses its existing F single-SELECT-family entry; request schema `n16-06g-single-quality-v1` selects the G policy and the actual receipt/tool identifies `get_data_quality`. No vitals or other tool is dispatched in this task.

The shared executor's optional policy is supplied only by fixed trusted code, never tool JSON. G rejects alternate tools, arbitrary SQL/paths, extra arguments, cross-crew requests, invalid roles and clocks. Its projection keeps canonical quality flags/provenance and a raw canonical audit, with `value:null`. Missing/malformed quality, suspect/missing/artifact flags, stale/future/untrusted context or an already UNKNOWN result cannot be upgraded. SQL COMPLETED and quality UNKNOWN remain separate states. No confidence threshold, healthy-status inference, N02 event or scientific approval is introduced.

## Deterministic QA

[Mandatory results](../artifacts/n16-06g-20261029/mandatory-qa.json): **140/140 PASS**, zero failures/skips:32Gquality controls,31complete F vitals regressions,45diagnostic controls and32pin controls. Seven syntax checks passed. Code, mode and one metric were frozen in the [22-file plan](../artifacts/n16-06g-20261029/code-plan.json) before QA/native execution.

Controls cover one exact prepare/get; correct scope; alternate-tool/SQL/path/role rejection; schema/source enforcement; missing/tampered/stale/future quality; no automatic good quality from SQL success; mount/ACK failures; first-failure admission; accept-all/reject-all and always-good/always-UNKNOWN mutants; unchanged F defaults/legacy code; and durable mock recovery of COMPLETED execution with UNKNOWN quality. No worker, source database read or SQLite connection occurred in QA. Mock traces are separate from the actual run.

[Runtime preflight](../artifacts/n16-06g-20261029/preflight.json) then verified current code, authoritative registration/owner/manifest/schema pins, full source hash/instance/header/inventory, trusted authorization, trace persistence and resource admission. Exclusive invocation/startup records and a monotonic failure latch admitted one worker only. No retuning or post-execution code change occurred.

## Genuine read and returned metadata

Actual controller command:

```text
node scripts/n16-quality-qualification.mjs
```

Exactly one genuine read-only SQLite connection executed the unchanged frozen statement:

```sql
SELECT crew_id,metric,json,sha256 FROM observations WHERE crew_id=? AND metric=?
```

Bound parameters: `CREW-03`, `heart_rate`. Actual authorizer evidence records one SELECT and six allowed main.observations READ actions. No application PRAGMA, BEGIN/ROLLBACK, metadata query or other tool statement was issued. This instrumentation does not comprehensively trace SQLite engine/constructor internals before authorizer installation.

| Returned field | Actual value |
|---|---|
| Tool / execution |get_data_quality / COMPLETED. |
| Crew / metric |CREW-03 / heart_rate. |
| Data status |KNOWN at the archived mission as_of only. |
| Declared quality |status good, confidence0.99, artifactfalse. |
| Measurement value |null; no vital value exposed by the quality tool. |
| Observation / receipt |Both `2026-11-14T11:00:00.000Z`. |
| Freshness |fresh, age0ms in mission archive context, not host-current telemetry. |
| Source / event |simulator `SQL-FIXTURE-CREW-03`; `N16SQL:elevated:CREW-03:heart_rate:g0`. |
| Provenance |synthetic elevated generation0, seed42017, `astra.n16.scratch-sqlite.v1`. |
| Currency / monitoring / Earth |NOT_LIVE_ARCHIVE / UNKNOWN / null. |
| Inference / clinical support |false /false. |

These flags are authored synthetic metadata, not proof of a real sensor, healthy crew or clinical reliability. Actual result/provenance and canonical quality audit are preserved in the [outcome](../artifacts/n16-06g-20261029/outcome.json).

## Source, containment and durable result

Before and after execution, parent/child full-byte checks agree on65,536bytes and SHA-256 `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73`. Source device/inode/birth/change identity,0400/0500 sealing and main-only inventory match; no sidecars or new source were created. Schema/spec/manifest provenance remains pinned. No donor or operational database was accessed.

Independent source/root ro mounts and stable namespace evidence passed before actual denials and were rechecked around the SQL read. Root/directory open attempts returned EROFS(-30), source-file O_RDWR EACCES(-13); EACCES alone was never sufficient and EPERM remains rejected. The [durable diagnostic](../artifacts/n16-06g-20261029/diagnostic.json) binds digest `d2501a2fea7ccdbcf5c69ed3c994203cb30a511b6c4e8356e410c2d0c4141073`, source and call before acknowledgement. Private network/mount namespaces and six forbidden host-prefix exclusions passed; routing table header only and network requests0.

Actual trace **`592cefe1-a29c-4129-95db-6ca1ab29a8db`** contains [six committed events](../artifacts/n16-06g-20261029/traces/592cefe1-a29c-4129-95db-6ca1ab29a8db/trace.jsonl) and [one committed result](../artifacts/n16-06g-20261029/traces/592cefe1-a29c-4129-95db-6ca1ab29a8db/call-01.json). [Fresh-process file-only recovery](../artifacts/n16-06g-20261029/independent-recovery.json) returns COMPLETE, one completed call, zero replay, no uncommitted tail and no SQLite execution. The valid result trace is distinct from the incomplete resource-accounting evidence.

## Resource discrepancy and remaining uncertainty

| Measurement | Preserved observation |
|---|---|
| Native startups / connection / SELECT / exit |1 /1 /1 /0. |
| Native duration |502.927857ms, below inherited one-second deadline. |
| DB open/read/close section |1.016058ms; not a standalone SQL-stepping benchmark. |
| Child-reported kernel maximum RSS |57,696,256bytes =55.0234375MiB. |
| Reported maximum monitored process RSS |75,382,784bytes =71.890625MiB; also present in persisted rows. |
| Reported maximum counted storage |6,580,155bytes =6.275325MiB; also present in persisted rows. |
| Reported samples |7. |
| Persisted resource rows / worker-event rows |5 /3, eight valid JSON journal rows total; expected ten if all reported samples persisted. |
| Cleanup |Owned/observers/batch queued/running0; postflight matching processes empty. |
| Observed ceiling breach / network/acquisition |No breach observed; network/download/install0. |

The [raw resource journal](../artifacts/n16-06g-20261029/resources.jsonl) and [byte-identical preserved copy](../artifacts/n16-06g-20261029/resources-preserved.jsonl.txt) have SHA-256 `a75aa2268516135262a82fdd22ea06a7648bf2ce88c271cbb18f37a87a482a05`. All eight rows parse; all three worker events are present. **The two-sample count gap cannot be reconciled from saved records.** No logging exception was reported. It does not establish a ceiling breach, but prevents a clean resource-evidence qualification.

Static inspection shows per-call append handles and potentially overlapping foreground/interval samples; the exact missing-record mechanism is **unconfirmed**, not a demonstrated filesystem race. No helper correction, test rerun, native retry or source replay followed discovery. Existing20ms monitoring, heap64MiB/CPU1s/wall1s and process cleanup remain recorded; storage is monitored rather than quota-enforced and RSS is sampled/child-reported. Do not replace the audited INCONCLUSIVE result with the raw controller PASS or infer complete lifetime evidence from maxima alone.

## Preservation and one next task

All526unmodified protected old hashes remain unchanged; the three intended existing-file edits have saved originals/diffs. F evidence, qualified worker/old SQL/default-mode behavior and source bytes remain preserved. [Final validation](../artifacts/n16-06g-20261029/final-validation.json) records exact table/history preservation, code/result/trace integrity and the unresolved journal gap. Governance/tracker/handoff record INCONCLUSIVE, not module completion. No model, operational API/Store/Engine/createApp, N02, telemetry, Scenario Lab or Health Agent action occurred.

N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. All other statuses, original direct/transitive/scientific/medical/full/release gates and inactive/unreviewed N15 rule remain unchanged. No scientific or clinical validation is claimed. G's single startup is consumed and its source/resource authority expires; remaining tools stay unexecuted.

**Exactly one next proposed task:** a QA-only resource-journal serialization and sample-count reconciliation repair, with deterministic concurrent-write, short/failed-write, fsync, flush, interruption and final-count controls. Preserve the original G records and fail closed when durable counts disagree; do not add worker/SQL/source/model execution or renew resources in that task. Root-cause analysis belongs within that bounded repair; no actual G replay is implied. STOP after N16-06G.
