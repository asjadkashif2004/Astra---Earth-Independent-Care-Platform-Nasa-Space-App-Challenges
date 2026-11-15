# DE-N16-SQLITE-FIXTURE-01 — activated N16-04 scratch SQLite qualification exception

## Bounded task delivered — 2026-10-29; STOP

[N16-04 completion](N16_04_COMPLETION.md) records 35/35 focused passes, five syntax checks, four actual SQL tools/18 committed trace events/zero-replay recovery, controlled WAL/busy/missing-sidecar outcomes and selected preservation checks. Only new synthetic scratch data and external traces were used. This activation remains a historical governance decision; its one implementation task is delivered and current execution authority is exhausted. No operational-read, further writer/test, model or application authority is active. Original prerequisites/statuses and DE-N16-READONLY-01 remain unchanged. The exact pre-activation proposal is preserved in [task evidence](../artifacts/n16-04-20261028/exception-original-proposal.md.txt); the prior checkpoints below are historical. No automatic continuation.

## Explicit activation and bounded continuation — 2026-10-28

The owner explicitly activated DE-N16-SQLITE-FIXTURE-01 and authorized one N16-04 continuation under its documented scratch-only scope and limits. Preflight finds no conflicting or operational authority: builder/writer permissions apply only to new disposable synthetic scratch data; four tool readers remain read-only, traces external, no application/Store/Engine/N02/API/model or operational paths. The grant below is now **ACTIVE FOR N16-04 ONLY**; its former pending/inactive language records the preceding historical preflight and is superseded only as to activation. All direct/transitive/scientific/release gates and module statuses remain unchanged. No other exception is altered or operational-read authority granted. Stop after bounded qualification and reporting; no automatic integration.

### Historical proposal retained

2026-10-28. **PROPOSED / NOT ACTIVATED. STOP before implementation.** Authority to prepare this document: the owner's N16-04 governance-preflight step3. The owner approved a bounded implementation **conditional on preflight**; that condition requires a separate exception to be documented and returned for approval when the existing scope is insufficient. This document records that proposal, not its adoption or execution permission. No operational-read exception is proposed or activated by it.

## Why separate authority is required

[DE-N16-READONLY-01](DE_N16_READONLY_01.md), under “Proposed eligible scope if separately activated,” states:

> Only demo trace artifacts may be written, in a separate owned output directory.

It also specifies:

> No operational application connection or database initialization.

Its activated implementation was exactly N16-01, now exhausted; N16-02 added only presentation of one archived run. [N16-01's contract](N16_01_CONTRACT.md) seals four JSON profiles and permits trace-only runtime writes. [N16-03](N16_03_OPERATIONAL_READINESS.md) explicitly requires new scratch-test scope and writer authorization.

The new offline SQLite builder creates database/schema files; the controlled concurrent writer deliberately changes a disposable database/WAL and may checkpoint its own test source. Those are distinct capabilities from fixture reads and trace persistence. The broad word “fixture” does not remove the explicit trace-only write boundary. Therefore the existing exception cannot be reused unchanged for these actions. The owner's explicit stop condition applies even though the eventual data would be entirely synthetic.

## Proposed limited grant upon explicit activation

Allow only the already requested **N16-04**, within existing N16: a standalone, non-generative four-tool SQLite adapter and focused qualification using newly authored disposable synthetic databases. No production implementation, live database, running application API or Health Agent connection. Existing DE-N16-READONLY-01, its traces/viewer and previous contracts remain unchanged.

Exactly four tools: `get_current_vitals`, `get_data_quality`, `get_personal_baseline`, `get_open_risk_events`. Reuse existing closed argument schemas where compatible; HR/RR/SpO₂ and six explicitly fictional crew only. Do not add general SQL/filesystem, trend, environment, cognition, prediction, research, action or communication tools.

Separate the capabilities and phases:

1. **Offline construction:** an owner-authorized test-only builder may create small SQLite schema/data under a fresh disposable scratch root, using the already available Node SQLite builtin. No Store/Engine/createApp/N02 construction or invocation. Author nominal, elevated, missing, stale, malformed and unauthorized controls, with synthetic reference baselines and clearly authored risk-schema records. None is an actual N02 event or a clinical conclusion.
2. **Freeze:** preserve original fixture bytes/hashes and versioned manifests, canonical identities, source/observation times, expected results and the finite writer/test plan before adapter qualification. Runtime copies never replace those originals or existing N16 evidence. Malformed/tampered cases are explicit negative controls, not silently accepted new provenance.
3. **Read-only execution:** a separate trusted reader may open only a manifest-bound task-owned SQLite copy in genuine SQLite read-only mode, using fixed parameterized queries and trusted role/crew context. No caller SQL, arbitrary paths, URI options or role/source overrides. Reader cannot initialize schema, checkpoint, repair or alter data/sidecars. Trace output is separate from the database/source directory.
4. **Controlled WAL writer:** a separate test-only process may modify/checkpoint only its designated disposable copy according to the frozen synthetic plan. Never give these capabilities to the four tools. Preserve writer-side receipts separately from reader traces. A changing WAL copy cannot be described as immutable; record phase/commit evidence and actual before/after hashes. Attribute mutations to writer versus reader. Presence of an authored risk row is fixture evidence only; absent/unverified N02 lineage remains explicit.
5. **Qualification/report:** run finite focused positive/negative tests, record resource/failure/isolation evidence, distinguish proven outcomes from unverified limitations, and stop after N16-04. No automatic operational connection, UI integration or model work.

## Source, authorization and trace safeguards

Trusted caller context binds allowed crew/mission/source alias, policy, expiry, cancellation and limits outside request JSON. Existing read/self-scope semantics remain; no system-admin implicit telemetry read or `--role` escalation. Denied requests cause no source access. Test principals are explicitly local synthetic identities, not production authentication.

Constrain runtime source access to task-owned manifest-bound scratch files. Reject operational/application/user paths, symlinks, traversal and source substitutions. Validate schema/row identities, ownership, quality, source times and integrity; missing/stale/corrupt/untrusted values remain UNKNOWN. Keep execution status separate from data availability and recorded risk rows separate from newly inferred alerts. Mission freshness is not host currency or monitoring readiness.

Enforce and measure filesystem read-only boundaries, including SQLite sidecars. A SQL `readOnly` option alone is not proof of zero filesystem writes. BUSY, unavailable sidecars, corrupt sources, cancellation or unqualified isolation fail closed; do not change global permissions/configuration, install a helper, repair the source or broaden access as a workaround. A failure to prove a property is reported as unverified, never general SQLite/WAL clearance.

Before reading, durably record validated scope/start in a separate task trace root. Record actual SQL query-template identity, timestamps, source and selected-row/result hashes, freshness/quality, failures, cancellation/timeout and cleanup. Atomic/fsynced persistence and committed-result recovery must fail closed. Recovery never silently reruns a read or writer action. Reader/controller failure must terminate only owned processes, without access to N02 services. No credentials or unnecessary personal data are logged.

## Proposed bounds for owner approval

Carry forward only the prospective scratch limits from N16-03: zero downloads/network; one reader at a time;1MiB main fixture DB and4MiB WAL cap;64MiB monitored task scratch/output;512MiB connector-process RSS;1s per-tool/10s workflow limits,250ms maximum read-transaction target, busy timeout0 and bounded250ms termination escalation. All fixture copies, sidecars, temporary files and task traces count toward scratch storage. These are proposed limits, not measured guarantees or an inherited N15 storage authorization. Monitoring is not a hard filesystem quota; stop on a resource/isolation breach, and disclose any measurement/termination limitations.

If existing local capabilities cannot enforce required containment/cancellation/resource checks, stop and report rather than install dependencies, raise limits or change the environment. No source build, runtime substitution or operational source fallback is granted.

## Acceptance and retained gates

Required focused QA is the owner's N16-04 list: real authorized SQL reads, elevated/UNKNOWN controls, role/crew/argument/provenance denial, concurrent WAL writer/checkpoint/BUSY/missing-sidecar behavior, reader filesystem-write denial, trace durability/recovery, timeout/cancellation/cleanup, no operational-path access, and positive controls that cannot pass with static results or universal failure. Immutable originals must retain their hashes. Concurrent copies require process-attributed evidence; writer-generated mutations are not reader writes. Any unproven property is explicitly unverified. No cross-platform, production, scientific or clinical guarantee follows from scratch tests.

N02 remains the sole monitoring/alert authority. No alerts, baselines, observations, acknowledgements, queues or medical state in ASTRA may be created/modified by this work. N16 full dependencies remain N02/N10/N12/N14 and N15 when an LLM is used; N10/N12 are incomplete, N14/N15 In Progress. Original transitive N03/N07/N08/N09/N11, N06 twin-specific, independent scientific/medical, security and release obligations remain open. This proposal adds no LLM authority and closes no prerequisite. N15-11's rule stays unreviewed/inactive; the experimental prompt stays unpromoted.

## Activation, ownership and expiry

Owner retains sequencing authority. **Activation: pending.** No reviewer identity, signature or acceptance is fabricated. The next owner decision is whether to activate **DE-N16-SQLITE-FIXTURE-01** and resume the already requested N16-04 under this scratch-only scope and stated limits. Do not ask the owner to approve an operational-read exception for this task.

If activated, authority covers exactly the bounded scratch qualification and expires after delivery/owner stop; it grants no continuation to operational reads, other tools, Qwen, Health Agent or another module. Full statuses remain N16/N15 In Progress and all other statuses unchanged. Until activation, only preflight documentation/preservation checks are permitted. **STOP before implementation.**
