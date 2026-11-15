# N16-05 — proposed designated synthetic read source

2026-10-29. **DOCUMENTATION ONLY / PROPOSED / INACTIVE.** No database has been opened, copied, created or queried for this task. This specification does not approve a runtime path or activate access. [Machine-readable proposal](N16_05_SOURCE_SPEC.json); [proposed exception](DE_N16_DESIGNATED_READ_01.md); [completion](N16_05_COMPLETION.md).

## One source and its owner

Select an **independently authored, closed synthetic archive**, prepared in a future task by making one verified byte-identical copy of N16-04's elevated original. This gives a precisely bounded four-tool source without accessing the active application. It is not an export of operational state, not a live sensor source and not newly acquired N02 output. A copy of a closed, hash-pinned fixture is the intended snapshot; copying an active database or its WAL is outside this proposal.

| Designation | Proposed value |
|---|---|
| Logical source ID / version | `astra.n16.designated-synthetic.elevated.v1`; proposal `astra.n16-05.source-proposal.v1`. |
| Owner / future custodian | ASTRA project owner / owner-controlled offline fixture publisher. No reviewer, publisher appointment, signature or approval is invented. |
| Donor provenance | N16-04 final qualification, frozen original `elevated`, generation 0. Historical location `/var/tmp/astra-n16-04-gJ6VxS/originals/elevated/source.sqlite` is a donor locator, **not an active operational DB or an approved reader path**. |
| Exact bytes | 65,536 bytes; SHA-256 `4b1a3d8d9bdb832ae54b35a43e4412f18914756984893f8cb181b37955caff73`. |
| Frozen row digest | `414e60b782176a34c297c1d55da519f1892332a9684e41a93be98fc6fd1d0e0e`. |
| Source schema | `astra.n16.scratch-sqlite.v1`; metadata keys `schema_version`, `profile`, `generation` must equal that edition, `elevated`, `0`. Four approved tables and risk-scope index are defined in the preserved [SQL contract](N16_04_SQL_CONTRACT.json). |
| Mission / crew | `MARS-DEMO-01`; fictional `CREW-01` through `CREW-06`; each read must further satisfy trusted caller scope. |
| Recorded time / origin | `2026-11-14T11:00:00.000Z`, mission simulation clock; generator `astra.n16.scratch-sqlite.v1`, scenario `n16-sql-elevated`, seed `42017`, simulator device `SQL-FIXTURE-<crew_id>`. |
| Eligible categories | HR/RR/SpO₂ canonical observations and their signal quality; authored reference baselines; existing authored open-risk schema records. No other categories. |
| Currency / risk authority | `NOT_LIVE_ARCHIVE`; MonitoringHealth UNKNOWN; `actual_N02_event:false`, N02 provenance UNKNOWN. |

These pins come from the saved [N16-04 manifest](../artifacts/n16-04-20261028/fixtures-manifest.json) and [completion](N16_04_COMPLETION.md). N16-05 reads report/source text only; donor existence, current bytes and future staging remain **unverified in this task**. Future preflight must reverify the full file. If the donor is absent, changed or not sealed, stop; do not regenerate it, substitute a WAL test copy, select another profile or open an operational file. Any replacement edition needs separate designation and approval.

## Preparation, consistency and SQLite sidecars

Only after separate exception activation and implementation approval, a trusted preparer may copy the exact closed donor into one fresh disk-backed `/var/tmp/astra-n16-designated-*` root. Source subdirectory contains only `source.sqlite`; registration metadata and trace directories are separate. No SQL schema creation, INSERT, UPDATE, export, backup, writer, checkpoint or application constructor is needed or proposed. Byte copies and deliberately damaged negative-test copies are the only source-file writes in that future task; the donor remains untouched.

Verify donor and copy size/full hash, regular-file/link properties, ownership, canonical location, directory/file instance identity and absence of sidecars before registration. The policy pins the expected digest **outside the source manifest**; editing a local manifest cannot authorize new bytes. A controller-created opaque capability binds the single approved alias, directory/file identity and expected manifest digest. No client path, URI, VFS, journal option, symlink, hardlink, alias or environment override is accepted. Actual resolved paths/inode/birth/change metadata and read-only descriptors are recorded during future qualification, never invented now.

**WAL and SHM are forbidden in the designated source.** Any sidecar, hot journal, unexpected member, source mutation or recovery requirement makes the source UNAVAILABLE before dispatch. Do not delete sidecars, checkpoint, set `immutable=1`/`nolock=1`, repair or fall back to the main file. This source is closed and writer-free; N16-04's controlled WAL experiments are historical evidence, not authorization for a new writer or live WAL connection.

Each call uses a short genuine read-only connection/snapshot and closes it promptly. Match source inventory/hash before and after every read and after the four-call workflow. Same immutable source hash/edition makes the calls coherent archive reads; do not describe separate transactions as one live atomic transaction or a capture of current ASTRA state. A changed/partial copy must never produce a successful result.

## Trusted authorization and exactly four tools

Retain [N16-01 argument schemas](../services/agent/read-contract.mjs), `astra.n16.read-tools.v1`, existing `requirePermission(read, crew_id)` and the source mission/crew intersection. Tools cannot grant permissions. A trusted launcher issues an opaque, task-limited caller capability outside request JSON: actor identifier, approved role, authorized crew set, self crew when applicable, source ID/version/digest, archive-only view, policy version, expiry, cancellation and budget. A plain caller-supplied principal object, `--role`, cookie, unsigned identity file or environment value is not authentication.

The future local demo CLI uses a fixed owner-controlled demo principal; deterministic QA can issue scoped test principals. Existing read roles remain subject to that context and source scope; astronaut self-only applies, anonymous/unknown roles and system_admin without read permission deny. No role gains scenario, alert, acknowledgement, source-preparation or application privilege. This local trusted-launcher boundary is not production multiuser identity qualification. Server/session integration would require another approval.

| Tool | Fixed data query and projection |
|---|---|
| `get_current_vitals` | Observation SELECT by bound crew and each of 1–3 allowed metric names; return eligible archived values, units, original observation/receipt times, quality and source IDs. Never claim host-current vitals. |
| `get_data_quality` | Same observation SELECT; return stored quality and independently reported mission age/freshness/integrity. Good quality is not a healthy-crew conclusion. |
| `get_personal_baseline` | Baseline SELECT by bound crew/metric; preserve authored center/scale/unit/method/version, null sample count/window and synthetic-reference limitation. No recalibration or longitudinal claim. |
| `get_open_risk_events` | Existing selected-crew `open` rows, ordered by ID, limit 1–20 plus one sentinel; expose bounded records/coverage/truncation. Authored example remains `actual_N02_event:false`; no new alert or verified detector output. |

Reuse the exact parameterized `metadata`, `observation`, `baseline` and `risks` templates in [source metadata](N16_05_SOURCE_SPEC.json) and [N16-04 SQL contract](N16_04_SQL_CONTRACT.json). Metadata parameters are the three fixed keys above; risk status is fixed `open`, not client-selected. No SQL strings, identifiers, arbitrary tables/paths, ATTACH, extensions or function definitions can cross the request boundary. Raw source file is never exposed to UI, model or untrusted code. Reuse the read-only child and pure contracts only; do not call the scratch runner's builder-launching `createQualification`, Store, Engine or createApp.

## Provenance, freshness and UNKNOWN

Proposed result wrapper `astra.n16.designated-result.v1` distinguishes this new source registration from old `scratch_sqlite` executions and JSON fixtures. Preserve the original `astra.n16.sqlite-result.v1` projection/provenance in internal audit; never relabel historical traces. Public data must clearly say **SYNTHETIC / ARCHIVED DESIGNATED SOURCE** and carry tool/call/run ID, trusted scope, source alias/schema/edition/hash, snapshot/profile/generation, selected row hashes, event/record IDs, source time/quality, read timestamp and query-template identities. No credentials or unnecessary personal fields are logged.

`get_current_vitals` means current **at the archive's recorded mission as_of**, not current on the laptop or onboard now. Default trusted replay time is that as_of. Apply the existing scalar mission-age rule `max(5000,3000/sampling_hz)` ms, schema/unit/quality/source checks and explicit future-time handling; stale, malformed, missing, future or untrusted observations produce UNKNOWN with withheld usable values. For the stale QA control only, a trusted test context advances replay time by 20,000 ms without changing source bytes. A new parent eligibility check must withhold stale values even if the reused child reports freshness at its original fixed as_of; the child's original receipt stays audit evidence, not overriding authority. Clients cannot set replay time.

Copy/verification/read times are never observation or host-receipt times. Host currency and current MonitoringHealth remain UNKNOWN/NOT_LIVE_ARCHIVE; requests requiring actual-current or Earth-delivered data are unsupported. This archive therefore does not consume N16-03's proposed 5-second live-host currency limit. Baseline reference validity, recorded risk age, mission freshness and host currency remain separate. Missing row => valid execution with UNKNOWN data; absent/corrupt/untrusted source => failed/unavailable execution, no partial verified values. Empty risk results mean only no matching authored records at the archived scope/cutoff, never all-clear.

## Isolation, traces and cancellation

Future qualification must reproduce the N16-04 private mount/PID/network boundary with dropped capabilities/cleared environment: only approved reader code/runtime/libraries, the sealed source mounted read-only and essential isolated paths are visible. No project tree, operational databases/sidecars, home, credentials, user directories or running APIs. Close inherited directory descriptors before reader startup. No network and no write-capable tool mode. Parent-only trace/metadata writes never grant child filesystem access. Reject weakened containment; no installation or environment change as a fallback.

Use genuine `readOnly:true`, disabled extensions, defensive mode, query-only/trusted-schema safeguards and deny-by-default authorizer for the fixed reads. No migration, checkpoint, journal/locking changes or repair. Read-only SQL alone is not filesystem immutability: prove source-directory creation and database O_RDWR denial, no sidecars and unchanged inventory/hashes. BUSY/LOCKED, unexpected schema/version, bad row identity/hash or unresolved isolation fails closed with no retry.

External atomic/fsynced traces must durably record request, authorization/validated arguments and start before any SQL. Record actual query-template IDs/count, execution/data states, source verification, selected-row/result digest, timing, error/timeout/cancellation and cleanup; persist result/checkpoint before completion. Source reads and trace failures remain separate; lost mandatory trace durability withholds success and stops the workflow. A denied request must never open a source. Recovery verifies committed results only, marks interrupted calls incomplete and never silently re-executes SQL or invents a completed step.

Use one owned subprocess at a time, bounded deadlines, cancellation, birth-checked descendant termination and exit confirmation. Proposed future ceilings are in the source JSON: 1 MiB DB (actual required 65,536 bytes), zero source sidecars, 64 MiB monitored counted storage, 512 MiB process RSS, 1-second read / 10-second four-call workflow, 250-ms transaction target/escalation, busy timeout 0, 64 KiB result. Count donor/retained participating N16 roots, new copies/temp/output/traces and disclose sampling/open-unlinked limitations. These are proposals requiring fresh task approval, not current resource or execution permission; no hard quota, complete lifetime-peak or uninterruptible-IO guarantee is asserted.

## Focused acceptance for a later task

| Required positive / negative control | Future acceptance condition |
|---|---|
| Designation and closed copy | Exact source ID/schema/65,536-byte hash/row digest verified from approved pins; copy coherent, no sidecars, donor unchanged. |
| Actual four-tool reads / all six crew | Real bounded SQL receipts and correct records, not constants/static steps or universal UNKNOWN. Elevated archived HR 103/min and authored baseline 68/min are traceable examples, not risk assessment. |
| Scope / role / request injection | Astronaut self-read succeeds; other crew, wrong/unknown role, client principal/source/SQL/path/as_of and invalid tool/metric/limit reject before DB open. |
| Source tampering / substitution | Changed bytes/manifest/schema, identical-file replacement, symlink/hardlink/traversal and unexpected alias fail closed; local manifest edits cannot approve new source bytes. |
| Snapshot and sidecar safety | Half-copy, changed file, WAL/SHM/journal appearance or missing DB reject without repair/creation. No concurrent writer is authorized; controlled test-file damage is distinct from SQL writer testing. |
| Freshness / missing data | Trusted +20-second replay control yields stale UNKNOWN; genuine missing-row/quality failure projection fixtures produce UNKNOWN. Current-host requests remain unsupported; original timestamps preserved. |
| Risk semantics | Authored example remains not N02; no matching authored row stays UNKNOWN coverage/no all-clear; no new risk, acknowledgement or communication action. |
| Noninterference / filesystem | Reader cannot write source/sidecars or access unrelated paths; full donor/copy inventory/hash unchanged before/after. Operational DBs never used as test targets. |
| Trace durability / restart | Completed results verified after cold restart without SQL replay. Tampered result/trace, persistence failure and incomplete call never become completed success. |
| Cancellation / timeout / resource failure | Stop only owned processes; confirm observer/descendant cleanup, durable failure evidence and no successful publication. Positive and negative controls both work. |

Missing-row/projection negatives may use existing deterministic non-SQL fixtures or mocks; source-corruption controls use disposable byte copies only. They do not authorize SQL INSERT/UPDATE or changing the canonical donor. Runtime assertions and production integration are not demonstrated by this documentation. No new inference, retrieval, UI or scientific review follows from source qualification.

## One next separately approvable implementation slice

Explicitly activate **DE-N16-DESIGNATED-READ-01** and approve **one isolated designated-source four-tool qualification** with the above ceilings and tests: reverify donor, prepare one sealed copy, register it through a trusted launcher, execute the four fixed reads with external traces, run focused noninterference/failure QA and stop. Add only a narrow designated-source controller/CLI entry and focused tests; reuse existing read-only child, schemas, authorization and ledger without builder/writer/app integration. No active operational DB, export, API, Health Agent, LLM or medical capability is included. This is the next proposed task, not current approval.

N16/N15/N14/N13/N07 remain In Progress; N02 authority, N10/N12 and all transitive/scientific/full/release gates remain open. N15-11 rule stays unreviewed/inactive and prompt unpromoted. **STOP after N16-05 documentation.**
