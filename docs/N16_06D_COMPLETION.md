# N16-06D — single containment-only probe

2026-10-29. **PASS for this one containment probe; exactly ONE isolated startup, exit 0; STOP.** No database-byte read, successful database-file open, SQLite connection, SQL/PRAGMA, model, network request or four-tool qualification occurred. This result does not establish SQLite readability, WAL noninterference, tool execution or production readiness.

## Scope, preflight and exact execution

The owner provided fresh N16-06D-only authorization under [DE-N16-DESIGNATED-READ-01](DE_N16_DESIGNATED_READ_01.md), limited to the existing sealed synthetic source, metadata/mount/denial checks, one startup,512MiB process memory ceiling and64MiB monitored counted storage. No prior startup permission carried forward, and no broader exception or unfinished prerequisite was waived. Current permission expires with this report.

Reviewed N16-06/A/B/C reports and authoritative governance. Required [diagnostic QA](../artifacts/n16-06d-20261029/preflight-qa.txt) passed45/45; [pin QA](../artifacts/n16-06d-20261029/pin-qa.txt) passed32/32, zero failures/skips. Two syntax-only checks passed. Corrected resolver verified the two immutable changed/preserved inventories and actual dependency hashes; all eight task code pins match. Registration, owner/manifest hashes, source identity, size,0400file/0500directory and main-file-only inventory validated without opening source contents. Node24.21.0/Linuxx64 and metadata-only source checks passed.

Only one new source file was authored: [n16-containment-probe-d.mjs](../scripts/n16-containment-probe-d.mjs), a task-specific copy of the pinned corrected controller. The [exact diff](../artifacts/n16-06d-20261029/task-runner.diff.txt) changes only task labels, output directory, code-plan and controller-path literals. The [fresh eight-file plan](../artifacts/n16-06d-20261029/probe-code-plan.json) binds its parent controller/plan digests; historical B/C evidence and existing code remain unchanged. The SQL-free worker, containment guards, corrected resolver and first-failure latch were reused unchanged.

The [complete controller preflight](../artifacts/n16-06d-20261029/preflight.json) passed, including memory/storage admission and an atomically persisted, fsynced/read-back diagnostic-persistence check before reservation. The exclusive controller-invocation and startup reservations, one static spawn site and shared monotonic batch latch admit at most one attempt. No fallback/retry exists. Fresh output is confined to `artifacts/n16-06d-20261029`; no B/C output was repurposed.

Actual controller command:

```text
node scripts/n16-containment-probe-d.mjs
```

It admitted one Bubblewrap child and the existing SQL-free Node worker, with the source directory bound read-only through a directory descriptor. The wrapper closes inherited descriptors before Node starts. Private PID/mount/network namespaces, capability drop, clear environment, read-only root and exact staged helper/contract files isolate the worker. ASTRA application source/databases, home/user files and credentials are not mounted. Approved runtime helper files alone are staged as code; no Store/Engine/application or SQLite module is imported.

## Actual guard result and independent evidence

The [durable diagnostic](../artifacts/n16-06d-20261029/diagnostic.json) has SHA-256 `265998d1e807ff844fca0755fd24b9a4c6b634819034be1b5b67261c9989c300`. Stage `containment`, qualified `true`, failed sub-check `null`, namespace stable `true`, mount error `null`.

| Sub-check | Attempted operation | Actual syscall | Actual errno | Result |
|---|---|---|---|---|
| `root` | `create_root_file` | `open` | `EROFS`, -30 | Write denied; accepted with independent mount proof. |
| `source_directory` | `create_source_file` | `open` | `EROFS`, -30 | Write denied; accepted with independent mount proof. |
| `source_file` | `open_source_readwrite` | `open` | `EACCES`, -13 | Read/write open denied; accepted with independent mount proof. No descriptor/data access succeeded. |

Before these denial attempts, `/proc/self/mountinfo` independently established `/` as mount368 and `/fixture` as mount379, both with per-mount `ro,nosuid,nodev,relatime` and no `rw`. The source file resolves to the same `/fixture` mount, not an overriding writable mount. Namespace `mnt:[4026532224]` and complete mountinfo digest `76d0ae03e35ca0c9a5d6d141446da5aa2ce180c4508ac9db13cdaf38ba7173b3` remained stable across checks. Denial errno alone was never accepted as mount proof. The retained evidence contains parsed mount targets/options and the full mountinfo hash, not a saved full raw mount table.

**The original legacy file guard would reject this run's EACCES**, because it accepted only EROFS/ENOENT for that sub-check. This is now a real observation for the retained source in this probe. Historical N16-06's14errors still have no saved errno; this result does not retroactively establish their individual syscall outcomes or qualify that old run.

The parent validated and atomically/fsynced the diagnostic before sending its exact digest acknowledgement. The worker's final `CONTAINMENT_PROBE_PASS` references that digest, and only follows the acknowledgement. No SQLite release path exists in the worker. [Result](../artifacts/n16-06d-20261029/result.json) records one admitted/attempted/actual startup, exit0, no first failure, no queued/running work and no persistence error.

## Resources, network and cleanup

| Measurement | Observed result |
|---|---|
| Containment command elapsed |216.227228ms; inherited one-second native deadline retained. |
| Worker-reported kernel maximum RSS |53,182,464bytes =50.71875MiB. |
| Maximum sampled owned-child VmHWM |51,818,496bytes. |
| Maximum monitored/reported process RSS including controller |74,080,256bytes =70.6484375MiB; below512MiB. |
| Maximum runtime counted storage |4,914,099bytes =4.68645MiB; below64MiB. |
| Durable resource records |Five samples plus three worker events; eight fsynced journal entries. |
| Cleanup |Owned remaining0; observer pending0; batch running/queued0; postflight matching processes0. |
| Network/download/install/model/SQL |Zero. |

[Resource journal](../artifacts/n16-06d-20261029/resources.jsonl) and [postflight](../artifacts/n16-06d-20261029/postflight.json) preserve the measurements. Non-overlapping20ms monitoring fails closed on unknown measurements/limit breaches; Node heap64MiB, kernel CPU1s, wall1s, termination escalation and parent-death binding supplement it. Reported RSS is sampled/self-reported kernel evidence, not a continuous all-process lifetime certificate. Monitored storage is not a hard quota; temporary overshoot cannot be guaranteed impossible. Limits were not expanded.

Worker net namespace `net:[4026532229]` differs from the saved host namespace. The private routing table had only its header, and no network operation is in the worker. Actual checks found `/mnt`, `/home`, `/project`, `/data`, `/root/.aws` and `/var/tmp` absent. No host directory capability remains in Node. No further worker or native command ran after completion.

## Preservation and limits

Logical source `astra.n16.designated-synthetic.elevated.v1` retains expected size65,536bytes and recorded digest `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73`. The authoritative JSON manifests/registration were hash-verified. Source file/directory device+inode, birth/change time, sealed modes and inventory remained unchanged; no sidecars appeared. The source's database bytes and donor were not opened or rehashed, as required. Thus this is a current metadata-preservation check, not a fresh source-byte digest attestation.

All444protected pre-existing code/evidence hashes match, including original workers/queries, B/C plans, manifests, traces and diagnostic tests. Governance changes add this result and preserve historical bodies/authoritative tables. No existing application/N02/telemetry/Scenario Lab/Health Agent/retrieval/model code changed; no scientific or clinical review was performed. [Final validation](../artifacts/n16-06d-20261029/final-validation.json) and the task evidence manifest record exact preservation.

N16/N15/N14/N13/N07/N09 stay In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. Other statuses, original direct/transitive/scientific/medical/full/release gates and N15 inactive/unreviewed support rule remain unchanged. The experimental N15 prompt remains unpromoted. Historical N16-06 remains an unsuccessful qualification; designated-source SQL functionality has not yet been established.

**Exactly one smallest next proposal:** separately authorize one bounded `get_current_vitals` read-only SQL qualification against this same sealed synthetic source, with fresh explicit SQL/resource authority, trusted role/crew scope, unchanged canonical provenance, mount-proof/durable-ack gate, external trace/recovery and immediate fail-fast behavior. No operational database, automatic four-tool replay, Health Agent, Qwen or medical authority is included. STOP after N16-06D; do not execute that proposal automatically.
