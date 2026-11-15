# N16-01 — four real fixture-read tools and durable traces delivered

2026-10-28. **PASS within the fixture-only research/demo scope.** [Contract](N16_01_CONTRACT.md), [versioned schemas](N16_01_TOOL_SCHEMAS.json), [activated exception](DE_N16_READONLY_01.md). N16 **In Progress**, not Complete. N15/N14/N13/N07 and other statuses/gates remain unchanged; the N15-11 factual rule is unreviewed/inactive.

## Scope and exact files

New implementation files:

- [read-contract.mjs](../services/agent/read-contract.mjs): four-name allowlist, schemas, limits, bounded duplicate-safe JSON and argument validation.
- [read-context.mjs](../services/agent/read-context.mjs): pinned synthetic fixtures, opaque caller context, source/freshness checks and anchored read-only file capabilities.
- [read-tools.mjs](../services/agent/read-tools.mjs): trusted authorization, four deterministic read operations, worker deadlines/cancellation and result validation.
- [read-tool-worker.mjs](../services/agent/read-tool-worker.mjs): actual bounded fixture read/hash verification and scoped projection; no operational imports.
- [execution-trace.mjs](../services/agent/execution-trace.mjs): fsynced log, atomic result/checkpoint persistence, integrity/lifecycle checks and read-only recovery.
- [n16-readonly-demo.mjs](../scripts/n16-readonly-demo.mjs): fixed local synthetic principal, four sequential calls or cold recovery.
- [n16-readonly.test.mjs](../tests/n16-readonly.test.mjs): focused positive/negative tests.

New data: four authored [fixture profiles plus manifest](../tests/fixtures/n16-readonly/manifest.json). New documentation: this report, contract and schema JSON; activation/plan/roadmap/priority/decisions/audit/tracker/handoff/AGENTS updates. No existing application, detector, case-template, N14/N15 research code, scientific source, package/dependency or historical acceptance file was changed.

## Governance preflight and fixture trust

The owner explicitly activated DE-N16-READONLY-01 and approved N16-01. No substantive contradiction was found: prior unapproved/inactive statements were the planning checkpoint; exclusions and original full-module gates remain binding. Actual implementation/fixture authoring began before marking N16 In Progress. Neither N10/N12/N14 nor conditional N15/transitive dependencies were declared satisfied or removed.

Fixture manifest SHA-256: `3b4e8aea6bafe5c0bec619266985407fb095bf302637cb177d2d14c35c5a7a13`. Edition n16-fixture-v1, four profiles/107,563 original fixture bytes, six fictional crew and HR/RR/SpO₂. Profiles are **authored schema fixtures**, not a newly executed simulator, detector or real mission dataset. Baseline records explicitly identify authored references, not learned personal archives. Selected file hashes/byte counts are verified at preflight and every actual handler read.

CLI role is fixed Demo administrator supplied by trusted code; tool arguments cannot alter identity, role, adapter, fixture path or output directory. Library QA verifies existing viewer-read/astronaut-self restrictions and denial of system-admin implicit telemetry access. These fixture principals are not production authentication. Import/source ownership, malformed or unsafe paths, symlinks, unexpected files and hash substitutions fail closed. No operational DB/API/Store/Engine/server is opened/constructed.

## Actual CLI demonstration and cold recovery

Exactly one CLI demonstration, exit0:

```sh
node scripts/n16-readonly-demo.mjs --fixture=elevated --crew=CREW-03
```

Run: `9392250d-93a4-45d4-a871-0dd590190774`. [Raw output](../artifacts/n16-01-20261028/demo-stdout.json), [summary](../artifacts/n16-01-20261028/demo-summary.json), [actual trace](../artifacts/n16-01-executions/9392250d-93a4-45d4-a871-0dd590190774/trace.jsonl).

| Tool | Execution | Data | Actual read | Call duration |
|---|---|---|---|---:|
| get_current_vitals | COMPLETED | KNOWN; HR103/min | One verified fixture file |231.478ms|
| get_data_quality | COMPLETED | KNOWN; fresh/good fixture metadata | One verified fixture file |188.261ms|
| get_personal_baseline | COMPLETED | KNOWN authored reference; HR center68/min | One verified fixture file |173.631ms|
| get_open_risk_events | COMPLETED | **UNKNOWN**; no verified N02 record supplied | One verified fixture file |181.208ms|

No alert is inferred from HR103. No existing open alert or all-clear is fabricated. This edition's alert coverage/origin is unavailable/unknown. That is a valid data outcome, distinct from a tool failure.

Elevated source SHA `7ee532bcf759f051ad0cd0f4932493770802e19df1b4dc67c052433f85da3774`. Four handler fixture opens/108,784 handler-read bytes; separate preflight verification also reads the manifest and selected fixture.18events,6trace files/26,933 total bytes. Trace-start-to-end host timestamp interval1,050ms; individual durations include trace/start/worker overhead, not a benchmark or independently measured system latency percentile. Bounds were not exceeded.

Cold recovery used a fresh Node process, exit0:

```sh
node scripts/n16-readonly-demo.mjs --recover=9392250d-93a4-45d4-a871-0dd590190774
```

[Recovery output](../artifacts/n16-01-20261028/recovery-stdout.json): COMPLETE ledger, four verified committed results, **zero replayed calls**. This is inspection/recovery, not automatic resume or another execution. Inputs/results are hash-bound; no hardcoded UI steps are treated as executed work.

## Focused QA and durability

**48/48 PASS; zero failures/skips** in the final focused suite. [Final output](../artifacts/n16-01-20261028/qa-final-stdout.txt). Initial46controls passed; two additional controls address actual approved trace-filesystem durability and worker startup/crash/cleanup failures. Initial and final logs are retained. Seven new JS files pass focused syntax checks; no broad regression/browser run.

Controls cover actual source reads/all six crew, elevated/missing/stale/poor or invalid quality, missing baseline projection, UNKNOWN risks, source timestamps, role/self denial before worker creation, invalid schema/tools/metrics/roles/limits, duplicate/escaped JSON keys, malformed data/getters, fixture/manifest tampering, source and trace path traversal/symlinks, pinned-directory replacement, timeout/cancellation/late results, startup/crash/cleanup failure, trace/log/checkpoint/result persistence errors, quotas, interruption/corrupt result/lifecycle and no replay. A static result without actual read proof fails; denied requests never start handlers. Trusted mock worker/fault injection controls are clearly separated from real worker and real-filesystem positives.

Each success requires durable start/result/end records and checkpoint. Atomic result/checkpoint replacement is fsynced with directory metadata. Mid-record or uncommitted state remains INCOMPLETE; actual recovery does not silently repair or rerun. A genuine cleanup or persistence failure stops the workflow and reports failure, not success. Process/storage fault controls are software evidence, not physical power-loss certification or tamper-proof auditing.

A separate zero-tool QA trace tested the approved trace filesystem before the demo; it is explicitly labeled QA storage preflight and is not another tool demonstration. All other focused test traces/altered copies were isolated under task-owned temporary directories.

## Preservation, limits and remaining acceptance

[Preservation](../artifacts/n16-01-20261028/preservation.json) records preimplementation hash comparisons for existing source/data/packages, N04 accepted documentation and frozen N15-11 packet. Operational SQLite files were not opened. Fixtures were not modified during execution. No dependencies, models, network, LLM, monitoring thresholds, Scenario Lab, Mission Overview, scientific approvals or support rules changed. Existing Health Agent remains a deterministic template with correctly labeled workflow-reference steps; it is not wired to this dispatcher.

Limits: Linux/WSL fd-based read isolation; operator/trusted code are trusted, not an arbitrary-code sandbox. Local demo roles are not authenticated production identities. Four profiles/three metrics only; authored baselines and no verified N02 event. No live storage, trends/environment tools, forecasting, cognition, retrieval, diagnosis/treatment, autonomous writes or generated research claims. Recovery inspects committed records but does not auto-resume. Full N16 prerequisite, scientific review, broader tool/selection/escalation metrics, recovery and actual browser/operational integration gates remain open. N16 is not Complete.

## One smallest next recommendation

Separately approve a **small read-only display of these recorded fixture execution traces in the existing Health Agent**, explicitly labeled research/demo tool execution, with no live data, LLM, action controls or change to operational case workflow. This requires an explicit exception scope extension and bounded UI implementation approval; it is **not authorized now**. Do not substitute static template steps for actual trace records or imply the full agent is integrated.

N15/N14/N13/N07/N09 remain In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. **STOP after N16-01.**
