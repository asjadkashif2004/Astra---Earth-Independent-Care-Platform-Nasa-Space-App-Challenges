# N16 master engineering mission

Campaign approved2026-10-29; completion recorded2026-10-30 (Asia/Karachi). **N16 ENGINEERING MISSION RESULT: PARTIAL. N16 remains In Progress.**

Three of four designated-source SQL tools are now qualified with reconciled resource evidence. The deterministic coordinator executed the four-call graph, committed three results, stopped on the risk-query failure, and then recovered those three results without replay. The second risk attempt exposed an SQL authorization denial. The mission-wide native latch is permanently closed at **5 of12 startups**, and unused permission expires with this mission.

The standalone [saved demo](../artifacts/n16-master-20261029/native/demo.html) and [structured presentation](../artifacts/n16-master-20261029/native/demo.json) show three completed tools and one FAILED/UNKNOWN tool. They load recorded execution evidence; they neither dispatch tools nor claim live telemetry. The Health Agent application remains unchanged.

## 1. Scope, initial audit and formal closure

[Mission contract/completion matrix](N16_MASTER_CONTRACT.md) maps each requirement to existing implementation, missing work, tests, authorization and external gates. Source review covered the master roadmap/dependency tables, governance/handoff, N16-03 through N16-06H evidence, F/G/H execution/accounting code, N02 monitoring/acknowledgement contracts, N14 attribution and N15 relevance boundaries. The primary research specification requires a larger graph than these four raw read tools.

DE-N16-DESIGNATED-READ-01 remains limited to the designated synthetic archive. The owner's consolidated campaign renews implementation/qualification authority within that scope, not production access or exception expansion. It expressly excludes new Health Agent/UI integration; the isolated saved presentation is the permitted alternative. No LLM authorization, reviewed support rule, scientific approval or prerequisite closure was inferred.

Full N16 requires N02/N10/N12/N14 and conditional N15; actual vitals/trends/baseline/quality/environment/risk/retrieval/check-in/draft execution, resumable traces, uncertainty/escalation and human acknowledgement, selection/unsupported-claim metrics and browser evidence matching actual execution. Those criteria are not all satisfied. N16 cannot be marked Complete.

## 2. Implemented engineering

- A separate fixed owner-operated CLI, scripts/n16-master-demo.mjs, with run, file-only recover and saved present modes; no caller SQL, path, role, source, clock or tool-list options.
- Task-specific four-tool policy and isolated worker, using the original fixed SELECT templates without PRAGMA, BEGIN/ROLLBACK, metadata query, source mutation or alternate database.
- Trusted parent capability, Astronaut/self crew scope, independent child authorization, full source/instance verification, read-only mounts and durable diagnostic/source/call acknowledgement before SQLite opens.
- Sequential deterministic coordinator with actual dispatch, strict result/receipt validation, separate execution/data status, bounded cancellation, NOT RUN behavior, and external atomic/fsynced trace/result commitment.
- H's serialized resource journal with attempted/accepted/appended/durable counters, IDs/hash chain, readback/flush/close reconciliation before each successful committed result.
- Durable mission startup ledger: maximum12total reservations, maximum4for a repeated stage, exclusive active-parent lock, persisted reservations before spawn and irreversible safety halt. Only5reservations/startups were consumed.
- Explicit committed-result recovery without SQL replay. Recovery validates old trace/result hashes and per-call resource journals, preserves original read receipts, and labels recovered results instead of claiming new reads.
- Standalone escaped HTML/JSON with source time/provenance, quality, authored baseline, failed risk state, real timeline, recovery status and research abstention. No model, network, application route or UI tool dispatch.
- Non-generative research-boundary DTO: citation attribution NOT ASSESSED, question relevance UNKNOWN, complete support ABSTAIN, zero independently reviewed rules. It does not substitute for N14/N15 assessment.
- Relevant QA-tool repair: the old syntax checker mistook import-looking source strings in an N16 fixture for real imports. It now uses Node's unlinked SourceTextModule parser; constructing these modules does not evaluate them or load their dependencies.

## 3. Four-tool qualification matrix

All native calls use fictional CREW-03; scalar calls request heart_rate, risk limit5.

| Tool | Genuine native evidence | Actual returned status/result | Qualification |
|---|---|---|---|
| get_current_vitals | One new readOnly connection/one fixed observation SELECT, exit0 | Archive KNOWN:103/min; good/confidence0.99/artifactfalse, original event/time/provenance | PASS for this scope; historical F preserved |
| get_data_quality | One new readOnly connection/one observation SELECT, exit0 | Archive KNOWN quality:good,0.99,false; measurement value null | PASS with **8samples/8durable sample rows**,3event rows; historical G stays INCONCLUSIVE |
| get_personal_baseline | One new readOnly connection/one baseline SELECT, exit0 | Authored center68/min, scale4.5/min, count/window null; explicit synthetic-reference limitation | PASS for authored reference only, not a learned or clinically validated personal baseline |
| get_open_risk_events | Two readOnly connection/fixed risk SELECT attempts, each exit1; no successful result | FAILED, data UNKNOWN; no returned event, new alert, diagnosis, acknowledgement or all-clear | BLOCKED by observed SQL authorization callback |

Original observation/receipt time is2026-11-14T11:00:00.000Z at the fixed synthetic mission clock, not host currency or real astronaut connectivity. Device SQL-FIXTURE-CREW-03 and canonical row hashes remain in results. monitoring_health is UNKNOWN and host_currency NOT_LIVE_ARCHIVE.

## 4. Actual orchestration, failure and mandatory stop

Attempt01 run4e8b9f85-0490-4d85-9385-ba8824e9b139 dispatched all four tools sequentially. Three committed; the risk tool returned generic ERR_SQLITE_ERROR. Its resource/trace evidence was preserved, not reclassified as a successful query. That first error alone did not retain the precise cause.

Within the finite campaign, a diagnostics-only revision preserved SQL stage, SQLite code/message and authorizer actions. Mandatory mocks passed before one instrumented risk attempt. Attempt02 recovered the first three committed results, explicitly recorded COMMITTED_RECOVERY/RECOVERED_COMMITTED_NO_REPLAY, and launched only the risk worker.

The [second risk failure](../artifacts/n16-master-20261029/native/attempt-02/call-04/outcome.json) confirms:

1. Source/root mount proof, root/directory EROFS, source-file EACCES and durable acknowledgement passed.
2. Exactly one fixed risk statement is prepared by the task code.
3. The first SQLITE_SELECT callback and main.risks column reads are permitted.
4. During step, SQLite invokes SQLITE_SELECT again. The current one-callback guard denies it.
5. SQLite returns code23, “authorization denied”; the worker exits1 and publishes no result.

This identifies a compatibility defect in the task-specific callback-count policy. It does **not** demonstrate that a second application SQL statement was issued, an attacker acted, or source integrity failed. SQLite reprepare/recompilation is a possible mechanism; its internal trigger was not independently established. The first attempt's generic error is not retroactively given unrecorded diagnostics.

The explicit authorization-stop rule applies: startup-budget.json now records halted:UNAUTHORIZED_SQL. No latch was reset, authorizer relaxed, query changed or third risk startup attempted. Maximum stage admission was2, below4. This native boundary, rather than a routine mock failure or exhausted12-start allowance, prevents full four-tool qualification.

## 5. Source identity, isolation and provenance

Only astra.n16.designated-synthetic.elevated.v1 was exposed:

- Size65536bytes; SHA-2564b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73.
- Existing authoritative registration, manifest5dab2628827a80b3af1f0a5d37ef64763144aba1510e7b0c7ea653a3f5ac286c, owner pin, schema/source-spec and row/query pins verified.
- File0400, directory0500, expected device/inode/birth/change identity and main-only inventory retained; full-byte hash before/after both workflows matches. No SQLite sidecars.
- No source copy, reconstruction, writer, permission change, live/WAL database, operational path or fallback.
- Same qualified Bubblewrap filesystem/PID/network isolation, read-only fd source bind, capability drop/closed inherited fd, and actual same-context mount checks. Six forbidden host prefixes absent; routing table header only. No network request or hidden model invocation.
- Fixed parameterized observation/baseline/risks queries are unchanged. ReadOnly/defensive/no-extension/timeout0 connection and deny-by-default column/table authorizer remain active.

Author-created risk schema examples are never treated as N02 alerts. The risk SQL failure means no actual risk record was returned here. Existing N02 remains the sole operational detector/alert authority; human acknowledgement and delayed Earth logic are unchanged.

## 6. Durability, accounting and cold recovery

Every successful tool result was committed only after its resource journal closed and reconciled:

| Result | Collected samples | Durable sample rows | Event rows | Total rows |
|---|---:|---:|---:|---:|
| Vitals |10|10|3|13|
| Quality |8|8|3|11|
| Baseline |7|7|3|10|

Each native journal has ordered IDs/hash chain. Failed calls retain error state even when written rows are intact; row consistency cannot turn denied SQL into PASS. Recovered copies preserve original journal identity/rows and are labeled reused evidence, not new observations.

Both workflows have18committed trace events,3CALL_COMPLETED and1CALL_FAILED, then RUN_ENDED/FAILED. COMPLETE cold recovery means the **failed workflow's evidence is complete**, not that four tools succeeded. [Cold process recovery](../artifacts/n16-master-20261029/native/cold-recovery.json) verifies result/checkpoint/resource hashes, replayed_calls0. Three successful reads were reused; neither data quality nor baseline was rerun.

H's original QA-only result and G's original PASS/raw journal plus audited INCONCLUSIVE remain untouched. G is never retroactively passed.

## 7. Measurements and limits

| Measurement | Observed result |
|---|---|
| Native startups / readOnly connections |5 /5;3successful and2failed fixed SELECT attempts |
| Successful native durations | Vitals236.235153ms; quality221.774404ms; baseline216.732670ms |
| Coordinator durations | Attempt01:1714.041253ms; attempt02:1182.061925ms including recovery work |
| Highest reported successful worker kernel RSS |57,761,792bytes /55.085938MiB |
| Highest monitored process RSS across campaign |96,681,984bytes /92.203125MiB, including parent |
| Highest charged runtime sample |20,755,409bytes /19.793900MiB; below64MiB |
| Network/downloads/installations/models |0 |
| Confirmed task-owned PIDs remaining |0;15observed PID/birth pairs checked |

The initial error path omitted exact native-duration fields for failed calls. Those two durations remain unmeasured; graph durations or journal timestamp spans are not substituted for native duration. A QA-only reporting correction now captures the field prospectively; no further native command exercised it.

Worker CPU1s, wall1s, heap64MiB,250ms read/escalation and10s workflow controls remain.512MiB RSS and64MiB storage are actively monitored targets, not a continuous kernel RSS cap or hard filesystem quota. Kernel maxRSS is complete only where reported; failed workers may lack their final high-water report. Sampling can miss short-lived peaks; OS/kernel IO can outlast JavaScript cancellation.

Immutable participating inputs are fully charged at preflight and checked again, while mutable native/temporary outputs are rescanned. Final broader closing-accounting and evidence hashes are in [final verification](../artifacts/n16-master-20261029/final-validation.json). No thresholds, timeouts or monitoring requirements were silently expanded.

## 8. QA and regressions

Final deterministic suite: **247/247 PASS**, no failures/skips/cancellations. Existing focused regressions: **272/272 PASS**. Final total **519passed,0failed**, plus repository syntax/import verification.

Coverage: all four mock tool policies/all six fictional crew; role/crew/capability and SQL/path injection; exact source/schema/instance/sidecar/mount/ACK failures; missing/unknown quality and baseline; no false N02 status; SQL errors; sequential orchestration/cancellation/timeouts/NOT RUN; trace write/checkpoint/result failures and corruption; H journal short writes/flush/ack/counter/sequence/truncation tests; budget12/4 limits; committed recovery without replay; reject-all/accept-all controls; escaped, nonexecuting presentation; observed duplicate SELECT callback failure; mission expiry.

Focused application regressions cover N02 monitoring, isolated persisted observations/restart, human acknowledgement, delayed Earth communication, ownership/telemetry integrity, N09 demo, directly relevant frontend/cinematic contracts, the40-control fixture viewer, and N14/N15 parser/quotation/relevance/grammar safety. Existing Store/Engine/createApp use was confined to their authorized memory/temp regression fixtures; none are imported by the designated adapter.

Earlier240/241staged checks exposed an import-rewrite fixture mistake; it was fixed without altering original assertions, and the failed log/copy is retained. The initial global checker false positive was preexisting and is now resolved with authentic module parsing and three controls. Native failures are reported separately from the passing deterministic suites.

Full npm test was deliberately not invoked: it would replay obsolete native qualification suites and overwrite historical evidence. No browser/performance suite, real UI screenshot, WCAG/FPS certification or independent scientific evaluation is claimed.

## 9. Exact files and preservation

New runtime/demo files:

- services/agent/master-contract.mjs
- services/agent/master-worker.mjs
- services/agent/master-coordinator.mjs
- services/agent/master-storage.mjs
- services/agent/master-supervisor.mjs
- scripts/n16-master-demo.mjs
- tests/n16-master.test.mjs
- tests/n16-checker.test.mjs

The only modified preexisting executable source is scripts/check.mjs, a QA utility. All original designated/F/G/H workers, query/schema/source/authorization/containment/resource helpers, model/grammar, N14 evidence/index, packages and operational application code remain byte-identical.

New N16_MASTER_CONTRACT.md and this report accompany updates to AGENTS, MASTER_PLAN, MODULE_TRACKER, CORE_AI_PRIORITY, DECISIONS, FEATURE_AUDIT, SESSION_HANDOFF and the existing designated-exception task history. No new exception or broader source authority was activated.

[Preservation inventory](../artifacts/n16-master-20261029/preservation-before.json), executed-version source snapshots, code plans, [exact implementation diff](../artifacts/n16-master-20261029/implementation.diff.txt), [governance diff](../artifacts/n16-master-20261029/governance.diff.txt) and [final evidence inventory](../artifacts/n16-master-20261029/evidence-manifest.json) identify all changes. Three executed-version2 files received later QA-only edits; their original bytes were reconstructed from those precise edits and verified against the already frozen version2 hashes. The original checker was likewise recovered against its pre-mission hash. These are verified content recoveries, not fabricated execution or passing results. Source/donor originals and historical N16/F/G/H evidence are retained. No operational DB was inspected for preservation; isolation and focused tests establish noninterference without opening one.

## 10. Remaining work by blocking impact

1. **Risk SQL authorization compatibility:** requires an explicit owner decision on distinguishing one application-issued fixed statement from repeated SQLite compiler authorization callbacks. Any future policy must retain fixed query/parameters, one connection/prepare/invocation, strict table/column/action restrictions, source/mount/ACK/trace safeguards and positive/negative controls. Current campaign stays halted. A separately authorized consolidated continuation can repair/qualify that contract, recover the three committed tools and finish the four-tool graph without replay; fresh resources/startup authority are required.
2. **Health Agent presentation integration:** existing designated-source exception does not permit it. The saved standalone demo is delivered; integrating this recording requires an expressly bounded presentation extension. No live operational tool access follows.
3. **Original full N16 graph and dependencies:** N10/N12 unfinished; N03 Partial, N07/N09 In Progress, N08/N11 unstarted; N13/N14/N15 In Progress with original full prerequisites open. Trends/environment/check-in/draft/ack/transmit orchestration and broader selection/escalation/safety/browser metrics remain outside this four-tool grant.
4. **Scientific/medical gates:** N14 numerical parity and prospective independent retrieval review remain unresolved; N13 labels/coverage and full N07 obligations remain; N15 factual-support rule is unreviewed/inactive and experimental prompt unpromoted. Citation validity is not relevance/entailment. No scientific, clinical or production validation occurred here.

N16/N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress—Deferred; N06 Not Started—Deferred; AC-20 Open/Unverified. All unrelated statuses and direct/transitive/scientific/medical/release gates remain unchanged.

**STOP. No unused mission startup/resource authority survives. Do not start another module or native attempt automatically.**
