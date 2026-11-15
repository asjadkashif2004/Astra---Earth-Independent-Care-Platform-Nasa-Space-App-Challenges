# N16-04 — isolated scratch SQLite/WAL qualification

Finalized 2026-10-29 from execution evidence recorded 2026-10-28. **PASS within the tested scratch-only Linux environment; STOP.** No operational database was opened. N16 remains **In Progress**, not Complete.

The owner explicitly activated [DE-N16-SQLITE-FIXTURE-01](DE_N16_SQLITE_FIXTURE_01.md) after the [held preflight](N16_04_PREFLIGHT.md). Activation preserved the original fixture-only exception and all unfinished prerequisites. This one continuation permitted newly authored disposable databases, a separate synthetic writer, controlled WAL/checkpoint experiments, four read-only tools and external traces. Its implementation authority is now exhausted. Neither operational-read access nor Health Agent integration follows from this result.

## Delivered files and source contract

Exactly five new source/test files; no preexisting application or QA source was changed:

- [sqlite-fixture-contract.mjs](../services/agent/sqlite-fixture-contract.mjs): fixture edition, schemas, fixed SELECTs, bounded results and deterministic row validation.
- [sqlite-fixture-process.mjs](../services/agent/sqlite-fixture-process.mjs): separately sandboxed builder, controlled writer and genuinely read-only SQL reader.
- [sqlite-fixture-runner.mjs](../services/agent/sqlite-fixture-runner.mjs): trusted authorization, opaque source capabilities, filesystem isolation, supervision, provenance and external durable traces.
- [n16-sqlite-demo.mjs](../scripts/n16-sqlite-demo.mjs): standalone scratch-only CLI, with fixture/crew options and no arbitrary database, SQL, path or role option.
- [n16-sqlite.test.mjs](../tests/n16-sqlite.test.mjs): focused positive, negative, integrity, WAL and failure controls.

[Contract](N16_04_CONTRACT.md) and [versioned SQL/schema metadata](N16_04_SQL_CONTRACT.json) specify exactly `get_current_vitals`, `get_data_quality`, `get_personal_baseline` and `get_open_risk_events`. Harness builder/writer/negative-control modes are separate capabilities, not additional tools. Supporting documentation changed in AGENTS, the scratch exception, MASTER_PLAN, MODULE_TRACKER, CORE_AI_PRIORITY, DECISIONS, FEATURE_AUDIT and SESSION_HANDOFF. Task artifacts and incremental resource journals are retained separately.

Edition `astra.n16.scratch-sqlite.v1` has six profiles: nominal, elevated, missing, stale, malformed and untrusted. Each frozen original is 65,536 bytes. Six fictional crew, HR/RR/SpO₂, authored reference baselines and explicitly authored risk records are covered. [Final manifest](../artifacts/n16-04-20261028/fixtures-manifest.json) binds database bytes, row digests, child programs, queries and writer plan before reader qualification. Malformed means a sealed but semantically invalid observation; byte tampering is a separate rejection test.

Trusted caller context and crew permissions precede source access. Neither client JSON nor CLI flags can set role, SQL or a source path. Roots/source instances use opaque handles, ownership markers, pinned hashes and device/inode/birth/change metadata plus retained read-only handles. Symlinks, hardlinks, traversal, unexpected members, tampered bytes and byte-identical unauthorized replacement are rejected. Trusted fixture principals are not a production authentication system.

Readers use Node `DatabaseSync` with genuine `readOnly:true`, extensions disabled, defensive configuration, fixed parameterized SELECTs, deny-by-default SQL authorization and short snapshots. Missing, stale, malformed or untrusted values stay UNKNOWN. Authored risk examples explicitly say `actual_N02_event:false`; known test rows do not establish genuine N02 provenance, a new alert or an all-clear. Mission freshness at `2026-11-14T11:00:00Z` remains distinct from host currency, which is `NOT_LIVE_FIXTURE`.

## Qualification results

[Final focused log](../artifacts/n16-04-20261028/qa-release.txt): **35/35 passed, zero failed/skipped**, 12,611.670215 ms. [Five syntax checks](../artifacts/n16-04-20261028/syntax.json) also pass. These were reused at finalization; no SQL or full suite was rerun after the interruption. Node 24.21.0 / SQLite 3.53.4, existing Bubblewrap/Python and Linux namespaces were used without dependency installation.

| Check | Recorded result |
|---|---|
| All six crew / four actual tools | Authorized reads return SQL query receipts; elevated HR 103/min and authored baseline center 68/min. |
| Missing / stale / malformed / untrusted observations | UNKNOWN with explicit reasons, no invented replacement. |
| Authorization / invalid requests | Wrong crew, anonymous/unknown/system-admin roles, invalid names/arguments and identity overrides rejected before any reader starts. Authorized astronaut self-read succeeds. |
| Source and filesystem boundaries | Traversal, symlinks, hardlinks, tampering and identical-file substitution rejected. Reader database O_RDWR and source-directory creation denied; fixed negative UPDATE/CREATE/ATTACH/unapproved-table controls denied. |
| Quiet WAL reader | Database, WAL and SHM hashes/inventory identical before and after the read. |
| Concurrent writer | Reader retains committed HR 103 while separate writer commits generation 1 / HR 104. A later reader sees 104. Held successful transaction: 29.610232 ms. |
| Checkpoint while reader is active | Writer TRUNCATE reports `busy:1, log:4, checkpointed:0`; after reader release, `busy:0, log:0, checkpointed:0`. Reader never checkpoints. |
| Exclusive writer | Actual `SQLITE_BUSY`, message `database is locked`; no repair, retry or fabricated result. |
| Missing sidecars / database | Missing WAL rejected; missing SHM returns UNAVAILABLE / SQLITE_UNAVAILABLE without creating it; missing database rejected without replacement. |
| Timeout / cancellation / trace failure | Fail closed, no successful publication; committed recovery verifies results without SQL replay. All final process measurements report zero remaining owned processes and zero pending observer scans. |

[Detailed results](../artifacts/n16-04-20261028/qualification-results.json) preserve reader receipts, writer events, before/after file hashes and actual namespace/write-denial evidence. They distinguish writer-authorized changes from quiet reader invariance. Tests do not establish cross-platform SQLite guarantees or safety for copying live operational WAL files.

Earlier failures remain preserved: unsupported Bubblewrap `--preserve-fds` stopped before SQL; the supported fd-binding mechanism replaced it and inherited directory descriptors are closed before Node starts. Initial 29/31 checks exposed writer setup defects: readiness preceded actual WAL creation, and hashing through another database fd in the SQLite-owning writer could disturb POSIX locks. A fixed synthetic marker initializes sidecars and hashing now runs only in the non-SQL supervisor. A later 33/34 run exposed queued monitor scans; non-overlapping scans corrected the backlog without changing limits. A 34/35 run exposed inode reuse; source birth/change metadata and retained read-only handles corrected identity checking. Original failing assertions were retained. Intermediate logs, source snapshots and manifests remain in the task artifact directory.

## Actual execution and trace evidence

Final hardened-runner workflow: `d4545898-b985-48d5-bb6c-567c2c52e0cf` under `/var/tmp/astra-n16-04-gJ6VxS`. Four real SQL tools completed, **18 committed events**, cold recovery COMPLETE, **zero replayed calls**. Durable traces/results are outside the fixture under that root's `traces` directory. Completion requires fsynced result/checkpoint persistence; trace failures cannot become completed reads.

The saved standalone invocation was:

```sh
node scripts/n16-sqlite-demo.mjs --fixture=elevated --crew=CREW-03
```

[CLI output](../artifacts/n16-04-20261028/cli-stdout.json) and [CLI qualification](../artifacts/n16-04-20261028/cli-qualification.json) record run `327d178a-8529-4897-a969-4c200bf2e0bc`, four COMPLETED tools and zero-replay recovery. That invocation preceded the final source-instance hardening; the final 35-test suite executes the same four-tool workflow with the hardened runner and checks CLI arguments. No additional CLI/SQL replay was performed merely to refresh this evidence.

## Resource, isolation and preservation evidence

[Resource summary](../artifacts/n16-04-20261028/resource-summary.json) records 41 final-suite subprocess measurements:

| Measurement | Recorded value / boundary |
|---|---|
| Maximum sampled owned-process VmHWM | 55,922,688 bytes; separate child receipt RSS maximum 56,479,744 bytes; ceiling 536,870,912 bytes. |
| Maximum monitored counted storage during final suite | 25,126,553 bytes; ceiling 67,108,864 bytes. |
| Known open-unlinked negative-control fixture allowance | At most two 65,536-byte pinned originals, released on close; conservative monitored maximum plus this bound 25,257,625 bytes. |
| Finalization inventory before summary write | 25,216,665 bytes across ten retained task roots plus task artifacts. Final validation records the later point-in-time inventory. |
| Maximum observer flush | 96.161556 ms; all final observer queues and owned-process sets empty. |
| Network / acquisition / operational access | Zero network requests, downloads, new dependencies, operational database/API calls or model execution. |

Limits also retain 1 MiB main database / 4 MiB WAL, one reader, 1-second read supervision, 10-second workflow/writer bound, 250-ms transaction target and termination escalation. Reader/code/runtime mounts are read-only in private mount/PID/network namespaces with dropped capabilities and cleared environment; project/home are absent, routes zero and write attempts denied. Builder/writer mounts are writable only for their own disposable source. Existing host runtime libraries are read-only. All task processes were absent in the postflight scan.

These are monitored storage and sampled RSS observations, not hard filesystem/cgroup quotas or complete lifetime-peak certificates. Scans do not separately charge open-unlinked source pins; the bounded controlled-test allowance is explicit above. Completed prior task roots are counted at admission and recounted at finalization. No N15 resource exception was inherited. Uninterruptible host IO and a malicious host replacing trusted code are outside the demonstrated guarantees.

[Preservation checks](../artifacts/n16-04-20261028/preservation.json): **247/247 selected preexisting hashes unchanged**, including prior application/QA sources, package files, N16-01 traces/fixtures, N16-02/03/preflight evidence, original fixture exception/contracts, N04 acceptance, N14/N15 contracts and the blank N15-11 review packet. **54/54 frozen originals across nine completed fixture editions** match their preserved manifests; the tenth root failed setup before fixture freeze. Exact original scratch-exception proposal bytes are retained with original SHA-256 `bedf67f22dc25db19186f87b8a809e66ea1065c42fcfc0568e586f47999fac89`. These are selected preservation checks, not a claim to have read or hashed every project or operational database file.

## Remaining gates and one next proposal

No operational source/WAL lifecycle, production identity, live freshness, detector behavior, application UI, model-driven tools or clinical/scientific validation is qualified here. N02 monitoring, acknowledgement and delayed Earth authority remain unchanged. N15 support rule stays unreviewed/inactive and the experimental prompt unpromoted. N16 still depends on N02/N10/N12/N14 and N15 when used, with unfinished N03/N07/N08/N09/N11 and independent scientific/full/release gates retained.

Exactly one recommended next task: **separately approve documentation of a narrow operational-read exception and plan naming one designated synthetic demo source, its trusted identity/crew scope and no-write/WAL controls, without activating access or implementing the reader yet**. This is a proposal only; no operational approval is requested or assumed by N16-04.

N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified; all other statuses unchanged. **STOP after N16-04.**
