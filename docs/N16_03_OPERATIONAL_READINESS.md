# N16-03 — operational read-only adapter readiness and authorization review

2026-10-28. **Planning delivered; operational access is neither authorized nor qualified.** This is source inspection and documentation only. No database was opened, SQL executed, ASTRA API called, constructor/tool/model run, dependency installed or binary acquired. N16/N15/N14/N13/N07 remain In Progress; all other statuses and review gates are preserved.

## 1. Authority and prerequisite disposition

[DE-N16-READONLY-01](DE_N16_READONLY_01.md) authorized the delivered N16-01 four-tool JSON-fixture CLI and N16-02 read-only presentation of one saved fixture run. Both bounded implementation authorities are exhausted. It grants no operational database connection, live API/tool dispatch, arbitrary source/path substitution, Health Agent execution, LLM, acknowledgement or medical authority. This review **does not modify or extend that exception**. Existing [N16-01](N16_01_CONTRACT.md) and [N16-02](N16_02_CONTRACT.md) contracts remain unchanged.

A future task-only operational-read exception is permissible to **propose** under the owner's sequencing authority: reading already stored synthetic scalar records needs neither a cognitive assessment nor prediction/research generation. Such a proposal must explicitly limit source, tools, identity, data, trace writes, resources, expiry and QA, retain every full-module gate, and receive separate owner activation/implementation approval. Nothing here adopts it or reserves a competing exception ID. A synthetic SQLite test qualification also needs explicit new task/test-scope authorization; old JSON-fixture permission is not silently broadened.

| Gate / original dependencies | Verified status and unfinished work | Treatment for a potential non-generative read slice |
|---|---|---|
| N02 ← N01 | Complete; canonical monitoring/durable alerts/human acknowledgement | Preserve authority and contracts. Reading is not new detection, acknowledgement or recalibration. |
| N10 ← N01,N03,N07,N09 | Not Started as a controlled module; stages/schedules/cognition/consent/countermeasure acceptance incomplete | Explicit task-only sequencing decision required for early N16. Omit all cognition, sleep interpretation and recommendations. |
| N12 ← N09,N11 | Not Started; evaluated horizons/calibration/registry/prediction acceptance incomplete | Explicit task-only decision required; no forecasts or inferred risk. Existing limited prediction code is not N12 completion. |
| N14 ← N13 | In Progress; numerical parity, independent prospective retrieval review/evaluation and full support/safety gates open | Explicit task-only decision required. No retrieval or answer generation in a raw-read slice; no N14 closure/promotion. |
| N15 ← N14, when an LLM is used | In Progress; research inference exists, combined relevance/abstention/full safety gates incomplete | No LLM proposed. Its conditional gate remains for any future use; no N15 execution permission transfers. |
| N03 | Partial; AC-20 Open / Unverified | DE-AC20-01 covers N04/N05 only, not N10 or all N16 transitive prerequisites. No scope transfer/release waiver. |
| N07 ← N01 | In Progress; Sleep-EDF complete recording, PTT, RadLab, named OSD-575/656 provenance, cards and independent splits remain open | Earlier acquisition/research exceptions do not close this gate. No acquisition work proposed here. |
| N08 ← N01,N07; N06 for twin | Not Started; waveform/CSV/replay and twin obligations incomplete | Keep full gate, including N06 twin-specific requirement; scalar-only scope cannot declare it satisfied. |
| N09 ← N01,N02,N07,N08 | In Progress; N09-D01 delivered; dated multiday baselines/longitudinal acceptance incomplete | Existing HR demo and baseline records can be inspected as limited synthetic data, not full longitudinal evidence. |
| N11 ← N02,N07–N10 | Not Started; independent advanced anomaly/model evaluation incomplete | No new model or detection claim. Remains in N12's prerequisite chain. |
| N13 ← N07 | In Progress; 40 technical expectations, independent decisions/coverage acceptance and full N07 gate open | No scientific-review closure or new corpus work. |
| N05/N06 | In Progress — Deferred / Not Started — Deferred | Preserve assets and acceptance; no anatomy work. N06's transitive twin obligation remains. |
| N16 full acceptance | In Progress; fixture dispatch/viewer only | Broader tools/workflow, selection/escalation/safety metrics, recovery/human/browser/operational gates remain. |

N21 identity/security and N22 release engineering are not newly invented direct N16 prerequisites. Their production obligations are also not satisfied by this local demo proposal. The N15-11 factual-support rule remains **unreviewed/inactive**; actual qualified human review, owner acceptance and separate implementation approval are still required. Scientific relevance, raw telemetry attribution and clinical validity are separate decisions.

## 2. Exact existing surfaces and side effects

References below identify inspected source, not interfaces called during this review.

| Surface | Actual behavior | Read-adapter consequence |
|---|---|---|
| [Store.constructor](../services/api/store.mjs), lines9–43 | Creates directory/file as needed; opens writable SQLite; sets WAL/foreign keys/busy timeout; creates schema/indexes/triggers and inserts schema versions | Never construct it, including with an existing path or `autoTick:false` elsewhere. Read helpers do not make its constructor safe. |
| Store.get/latestTelemetry/history/list/record | Fixed SELECTs and JSON parsing; no direct write in these method bodies | Useful query semantics, but require an already constructed Store. No standalone read-only capability exists; do not pass a Store or borrow its general API into tools. |
| [Engine.constructor](../services/api/engine.mjs), lines15–59 | Upserts mission/crew/baselines; restores/mutates state, seeds history and tick if absent; detects/checkpoints recovered state and creates missing enrichment jobs | Never construct it for reads. Creating a fresh Engine is not recovery inspection. |
| Engine.snapshot / demoSummary | No explicit write in these bodies; reads risk/case/job/communications data and returns references to in-memory crew/environment | Requires a write-capable Engine, returns overbroad/mutable data and capped risk lists. Not an independent isolated reader or stable committed snapshot. |
| Engine.tick/advance/applyIngest/detect/recordRisk/checkpoint | Ingests, evaluates, persists risk/jobs/snapshots, queues communication and updates state | Exclude entirely. No read tool may invoke these to make missing data appear. |
| Engine.predictions, lines381–395 | Can persist prediction records | Exclude even though exposed by a GET route. GET alone does not establish absence of writes. |
| [createApp](../services/api/server.mjs) | Constructs Store/Engine, writes knowledge records; starts tick/enrichment when enabled | Do not construct/start it for a reader or inspection tests. `autoTick:false` still constructs/writes. |
| Existing GET `/v1/crew/{id}` | Existing session/read/self checks, then returns current Engine crew object | Reusable policy/data shape; not an independent constructor-free data source. No request made. |
| GET `/v1/state`, `/v1/alerts` | Existing scoped Engine.snapshot; risk list capped100 before scope filtering | Reusable product context only; cannot prove complete crew/run risk coverage or synthetic ownership of every field. |
| [getIdentity / createSession](../services/api/auth.mjs) | getIdentity SELECTs existing unexpired session; createSession inserts/audits | Future trusted parent may use existing authentication through separately approved integration. Do not create sessions, read credentials in the worker, or treat client role JSON as trusted. |
| [retainObservation / refreshReading](../services/api/telemetry.mjs) | First clones/canonicalizes and derives integrity; second mutates its argument and derives freshness | Reuse semantics, not operational references. A reader checks canonical fields without promoting legacy integrity or calling mutation on shared state. |
| [Comms](../services/comms/scheduler.mjs) | Constructor reads config/cursor; summary SELECTs counts. control/enqueue/step write | No reason to construct it for four tools. No transmission, queue, blackout or acknowledgement authority. |

The four source categories already exist, but there is **no qualified independent operational read-only adapter today**:

- Current committed vitals/quality: `state` row `mission_state`, selected crew's `metric_observations`; corroborate selected event IDs against `telemetry_points` when required. Do not use bare `values` as authoritative, or silently select an older simulator row over the current imported channel.
- Baselines: `state` row `baselines` and `health_baselines` keyed by crew. Engine initializes both. Require coherent selected values; conflict is UNKNOWN, never repaired. [createBaselines](../services/telemetry-simulator/simulator.mjs), lines12–23, produces720 synthetic median/MAD values per metric. Its declared30-day window is not a dated personal archive.
- Persisted alerts: `risk_events` contains N02 record JSON, crew, created_at and ID. [recordRisk](../services/api/engine.mjs), lines110–139, links evidence and queues a job; acknowledgement later updates status. The top-level synthetic flag is not enough: corroborate evidence source, crew, run and observation provenance. No detector re-execution.
- Source context: committed `mission_state.now/runId/scenario/seed/tick` and canonical observation/ingestion metadata. Mission state does **not** persist MonitoringHealth's current host-clock success/readiness; database access does not prove service health or live sensor connectivity.

## 3. Proposed trust and four-tool contract

Proposed architecture: trusted authenticated parent → closed deterministic dispatcher → **separate trusted read-only connector process** → bounded canonical result → parent validation and separate durable trace. No LLM or arbitrary code is admitted at any boundary. Do not give models, UI clients or general tool plugins a SQLite connection, SQL builder, filesystem path or principal setter.

Only the existing four names, existing strict crew/metric/limit argument shapes, and HR/RR/SpO₂ are proposed. No new trend, environment, sleep, prediction, check-in, research, report or communication tool. Introduce an explicitly versioned operational-source context/adapter under future approval; do not replace fixture contexts or reinterpret historical traces.

| Tool | Bounded operation | Data/result rule |
|---|---|---|
| get_current_vitals | Read selected current canonical observations for1–3 requested metrics | Emit eligible values only after source, integrity, schema, unit/time/quality and currency checks. Other requested values UNKNOWN. |
| get_data_quality | Read those same canonical observations; derive freshness without rewriting source quality | Separate original status/confidence/artifact, integrity, mission age and host currency. UNKNOWN is not a health alert. |
| get_personal_baseline | Read selected persisted synthetic baseline and check its coherent duplicate | Return center/scale/unit/method/count/window/version as stored, plus explicit synthetic/calibration limitation. No regeneration or claim of personal longitudinal validity. |
| get_open_risk_events | Read only existing selected-crew/current-run `open` records, bounded20 plus one sentinel | Preserve risk IDs, detector/version/evidence, status and human-ack requirement. Report scope/cutoff/truncation/exclusions. Empty scoped results never mean clinically healthy. |

Trusted context must bind authenticated actor, role, permitted crew/mission, source alias, source ownership policy, onboard view, policy version, expiry/cancellation and budgets. Existing `requirePermission(read,crew)` applies before opening the source; astronaut self-only, no system-admin implicit read. Local test principals are not production identities. The later operational entry point must obtain actual trusted identity from the existing server/session boundary or an explicitly approved owner-operated capability; a standalone `--role` switch cannot provide that trust. No session cookie/token is passed to connector code or trace output.

Initially propose **simulator-owned synthetic channels only**. Check canonical source/device/generator/run bindings per record. Imported, unknown or conflicting ownership yields UNKNOWN; never overwrite, backfill, reassign or fall back to an old synthetic row. Risk evidence with unavailable/unsupported source bindings remains unverified rather than manufactured as N02 evidence. Exclude voluntary check-ins, cases, sessions, audit/communications payloads and private data from query/result permissions.

A SQLite file contains many tables. OS permission on the whole file is not per-crew/table isolation. The connector remains trusted code; SQL authorizer/closed queries enforce its scope, and only minimized DTOs leave it. If that trust or synthetic-only source assurance cannot be established, deny connection. Never expose the database file to an LLM/untrusted worker or claim that SQL read-only mode supplies row-level privacy.

## 4. SQLite/WAL feasibility and restrictions

Official Node24.21 documentation supports `DatabaseSync` readOnly, zero busy timeout, disabled extensions, defensive mode and an authorizer. APIs are synchronous; a JS timeout on the same thread cannot reliably preempt a blocked native call. These are API/source findings, not a test of the installed binary. [Versioned Node documentation](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/sqlite.md). The same-tag [open implementation](https://raw.githubusercontent.com/nodejs/node/v24.21.0/src/node_sqlite.cc) combines read-only flags with URI support; internal path construction therefore must reject client URI/query/VFS/locking overrides.

SQLite permits read-only WAL access with suitable existing readable sidecars; otherwise opening may need to create them. Read transactions can delay checkpoint progress, and WAL access can still return BUSY. The WAL is part of committed database state; copying only the main file can miss data. SQLite also documents a WAL-reset issue, fixed in3.51.3 and specified backports, involving concurrent write/checkpoint connections. Installed engine identity/fix applicability was not measured; this review gives no database security clearance. [Official WAL guidance](https://www.sqlite.org/wal.html). `immutable=1` disables locking/change detection and is unsafe for a changing live database; `nolock=1` is not an acceptable workaround. [Official URI semantics](https://www.sqlite.org/uri.html).

**Engineering proposal, not qualified behavior:**

1. Use a new connection in the isolated connector, never Store, the monitoring connection or an app constructor. Explicit readOnly; no create/fallback/in-memory substitute; no migrations, repair, recovery attempt, checkpoint, journal-mode/locking changes, vacuum, backup or sidecar deletion. Failure to open cleanly is UNAVAILABLE.
2. Enforce OS-level denial of writes to the source database, sidecars and source directory. Node readOnly/query-only alone is insufficient evidence of zero filesystem writes. Existing main/WAL/SHM identities and lifecycle must be qualified together; never create a private replacement SHM for a live source. Do not repurpose the JSON-fixture `/proc/self/fd/<file>` path as a SQLite filename without proving companion-file resolution. A narrowly controlled filesystem view must preserve the real files/locks and deny other ASTRA/user paths.
3. Use only private-cache, normal-locking, fixed source configuration. Ban caller paths, symlinks/traversal, ATTACH/DETACH, extensions, arbitrary functions, writes and schema changes. A deny-by-default authorizer permits only exact main-database table/column/query operations and explicitly needed metadata/transaction operations. Local defensive/query-only/trusted-schema controls are layered checks, not a substitute for filesystem isolation.
4. Read expected schema metadata without changing it. Unknown schema, views in place of approved tables, corrupt JSON, mismatched row keys/JSON identities, unexpected record sizes or source replacement fail closed. Bind values in fixed statements; never concatenate user identifiers or execute SQL from documents/model output.
5. Use short deferred read snapshots per call, not BEGIN IMMEDIATE/exclusive locks and not a long transaction across UI/model waits. Fully materialize bounded output, end transaction and close promptly. Do not hold a reader open to preserve consistency across four calls. Different call snapshots retain separate timestamps/digests; do not call them one atomic mission snapshot.
6. BUSY/LOCKED/recovery-required/missing sidecars/source changes return UNAVAILABLE; no retry loop, permissions change, writer shutdown or configuration adjustment. Limit attempts and outstanding readers; instrument short read duration and writer progress in an isolated WAL test before any operational connection. Zero interference cannot be promised from documentation.

`LIMIT21` bounds returned risk rows, not rows scanned: current risk schema has no dedicated crew/run/open-status index. Before a live source is eligible, qualify query cost or restrict a fixed global recent-candidate budget and report PARTIAL/UNKNOWN coverage after crew/run filtering. Do not add an index/migration or claim complete absence to hide the gap. The small scratch database proposed below bounds qualification cost; it does not establish performance on an unknown operational database size.

A frozen, coherently produced snapshot can support archive reads, but a casual live DB/WAL file copy is not such a snapshot. Export/backup would itself require separate authorization and snapshot provenance. Existing GETs avoid a new reader connection but retain application lifecycle, broad response and synchronous-query limits. Neither alternative is silently selected as a workaround if qualification fails.

## 5. Freshness, provenance and failure isolation

Use original observation `ts`, mission `received_ts`, ingestion `mission_received_at` and `host_received_at` separately. At the committed mission as_of, reuse N01 scalar freshness `max(5000,3000/sampling_hz)`, schema/unit/plausibility checks and good/non-artifact quality. Require existing verified integrity; do not recanonicalize an unverified record into trust. Missing/null/stale/future/corrupt or source-conflicting values remain UNKNOWN; raw audit context must not be exposed as a current eligible value. No Last Sleep measurement event or forecasting is introduced.

**Mission freshness is not host currency.** A stopped simulation can leave age0 forever. Proposed adapter eligibility additionally requires trustworthy same-host ingestion/capture timing; a conservative5,000ms host receipt-age ceiling is a **new proposed adapter limit needing approval**, not a change to N01/N02 thresholds. Missing/skewed/old host timing makes current-vitals currency UNKNOWN. Capture time cannot replace receipt time. Persisted state alone cannot assert MonitoringHealth readiness: report monitoring availability UNKNOWN unless a separately authorized trusted health source is provided. Do not infer an active detector or sensor connection from recent rows.

Baseline timestamp/independence evidence that is absent remains absent; a valid baseline record is a synthetic calibration reference, not a fresh observation. Historical risk creation time is not a newly detected or current-health measurement. Risk coverage is explicitly selected crew/run/status at the call's read cutoff, with truncation/verification gaps; unverified absence never becomes all-clear. Initial view is onboard-only; reject Earth requests rather than reading current ship state as delivered Earth evidence. Human acknowledgement and queue/delivery remain exclusively in existing authorized workflows.

Persist traces in a **new task-approved output root**, never the source database/directory or N16-01 archive. Require durable REQUESTED/validated-authorization/start records before source access; atomically persist bounded result/hash before completion. Log call/run ID, trusted sanitized scope, source alias, schema/adapter/policy versions, mission/run, read start/end, query-template IDs, row/event/record hashes, source time/quality/currency, coverage, result status, cancellation/error and cleanup. Do not hash a changing whole database and label it an immutable source; use hashes of exact selected row bytes plus canonical projection, and distinguish an adapter capture ID from a database commit identifier.

Keep execution COMPLETED/FAILED/TIMEOUT/CANCELLED/DENIED separate from KNOWN/PARTIAL/UNKNOWN data. A failed/untrusted source cannot produce a successful current value. Trace failure before reading prevents dispatch; failure after a read withholds success and stops the workflow. A completed source read cannot be undone by a logging failure. Recovery inspects only committed results, never silently replays a live read.

Use an owned subprocess, not the N02/event-loop thread, for synchronous SQLite. Parent cancellation/deadline must terminate only its process group, with bounded escalation and exit confirmation; do not assume Worker.terminate interrupts every native query. No network or child-process creation in connector code; source files read-only, bounded private temporary state, no credentials/ASTRA code/other user files exposed. Only trusted projected data crosses IPC. Preserve failure evidence outside the dying process. The prior llama.cpp sandbox is not automatically a qualified Node/SQLite/WAL sandbox.

If host/kernel IO prevents confirmed termination, report cleanup failure and stop; neither a JavaScript timer nor a signal is an absolute guarantee against an uninterruptible OS operation. No successful cancellation, resource or non-interference claim is permitted without measured evidence.

Future operational results require a distinct source/context version and label **ASTRA synthetic demo database read**, never fixture/LLM/real-astronaut telemetry. N16-02's fixed archived run and its hashes remain unchanged and cannot receive live values. Any operational UI presentation needs its own explicit scope approval.

## 6. Required focused QA before an operational read

These are proposed acceptance checks, **not tests run by N16-03**:

| Control | Required later evidence |
|---|---|
| Actual source and scope | All four tools perform traceable reads, all six crew in deterministic synthetic tests; unauthorized role/self/mission requests cause zero source opens. Client cannot change trusted context, path, SQL, query policy or tool names. |
| Ownership/provenance | Simulator-positive, imported/unknown/conflicting ownership, mismatched row/JSON identity/unit/run/hash and duplicate data. No fallback, source repair or invented N02 producer claim. |
| Data availability | Missing/null/stale/suspect/artifact/future data, stalled mission clock, old/missing host receipts, baseline-copy conflict and risk evidence gaps. UNKNOWN stays distinguishable from tool failure and health. |
| WAL correctness | An isolated writer commits data present only in WAL; reader sees the valid committed version, never dirty/partial updates. Exercise checkpoint/sidecar lifecycle, reader teardown, BUSY/recovery/corruption and bounded concurrent writer progress. No actual operational writer or N02 invocation. |
| No mutation | OS-denied source writes plus instrumentation of open/write/mmap/unlink/rename/checkpoint attempts, directory inventories and immutable control hashes. With a test writer active, global DB hash changes are expected; attribute writes to processes rather than claiming reader preservation from a whole-file hash alone. |
| Resource/cancellation | Startup failure, stuck/busy native call, timeout/abort, descendant cleanup, bounded response/JSON/row count and reader lifetime. Parent/N02 must not wait indefinitely or be terminated. |
| Trace/recovery | Start/end persistence failures, interruption between result/checkpoint, corruption, no unpublished success, no auto-replay. Provenance and scope survive cold recovery. |
| Separation | Existing N16 fixtures/viewer, N14/N15 contracts, N02 detector/acknowledgement/Earth flows and original evidence stay unchanged. No LLM, model, private/check-in rows, live API, tool expansion or diagnostic claims. |

## 7. Precisely one next implementation recommendation — not authorized

Separately approve **one isolated four-tool SQLite connector and authorization/WAL qualification slice against freshly authored scratch databases only**. Reuse the four names and validation/trace concepts; keep the existing JSON fixture CLI/viewer untouched. A test-only harness may create/write its own small synthetic WAL database using the existing Node builtin, without Store/Engine/createApp/detector construction. The candidate reader must be filesystem-read-only and independently cancellable; private test writes are the writer harness's authority, not tool authority. Authored risk-schema fixtures test filtering and rejection; they are not independently preserved N02 events. Without verified N02 origin, risk data remains UNKNOWN.

Proposed bounds for that separate approval: no downloads/network/operational paths; one reader at a time;1MiB main test DB/4MiB WAL cap;64MiB monitored total scratch/output;512MiB per connector-process RSS; existing1s per tool/10s workflow ceilings retained,250ms proposed maximum read-transaction duration, busy timeout0, bounded250ms termination escalation. These are prospective limits, not measurements or inherited N15 resource permission. Stop if isolation/accounting/deadlines cannot be enforced; no environment change or silent limit increase. Approve finite focused tests above, not benchmarks/browser collection. No actual operational file is mounted or opened during this slice.

Success: four genuine bounded source reads/UNKNOWN cases with correct authorization/provenance, demonstrated WAL visibility, zero source mutation by reader, bounded writer progress, deterministic termination and durable fail-closed traces. Failure: unqualified sidecar writes, unexpected source access, schema mismatch, unbounded locking/lifetime, trace loss or failed cleanup. No operational-read readiness claim on failure.

This is the smallest justified implementation because the missing boundary is connection/isolation/authorization, not another prompt or UI. It requires explicit test-scope/governance and implementation approval before starting. Passing it would support a **later separate owner decision** on a narrowly defined synthetic operational-read exception and one designated database/identity/crew/run; it would not authorize that connection, close original modules, connect Qwen or promote a medical agent.

## 8. Review evidence and limits

Local source/contract and authoritative dependency inspection plus a finite set of public SQLite/Node documentation/source page reads only. No model/runtime/data artifacts downloaded or saved from those pages. The generic current Node documentation was not used as a substitute for the retrieved exact24.21.0 source documentation; the versioned-LTS documentation endpoint was unavailable. No installed binary/SQLite version, filesystem lock correctness, read-only-WAL behavior, write denial, latency or cancellation was empirically qualified. Those uncertainties remain explicit. No regression/browser/runtime test suite was run or claimed.

[Planning validation](../artifacts/n16-03-readiness-20261028/validation.json) records documentation links, unchanged authoritative tables, selected protected hashes including the unmodified exception/contracts, source, fixtures/review packets and prior N16 evidence. This records preservation/planning consistency, not live-read or scientific acceptance.

N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; N07/N09/N13/N14/N15/N16 In Progress; N08/N10/N11/N12 and other unstarted modules remain unstarted/unapproved; AC-20 Open / Unverified. **STOP after N16-03 planning.**
