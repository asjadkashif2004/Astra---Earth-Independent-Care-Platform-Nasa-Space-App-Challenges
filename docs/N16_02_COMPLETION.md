# N16-02 — read-only Health Agent fixture trace viewer

2026-10-28. **PASS within the presentation-only scope.** [Contract](N16_02_CONTRACT.md), [activated extension](DE_N16_READONLY_01.md). N16 remains **In Progress**, not Complete. N15/N14/N13/N07 and every other module status/review gate are unchanged; the N15-11 rule remains inactive.

## Governance and implemented behavior

The owner's explicit N16-02 instruction validly extends DE-N16-READONLY-01 only for read-only presentation of the previously recorded N16-01 demonstration within Health Agent. Preflight found no substantive contradiction: original no-UI restrictions are superseded only for this separate panel. No operational dispatcher, live-data adapter, LLM, action or medical authority is granted. N02/N10/N12/N14, conditional N15 and all transitive/scientific/release prerequisites remain open as previously recorded.

Health Agent now includes **SYNTHETIC / FIXTURE DEMO · ARCHIVED** below its unchanged operational case/template workflow. Sign in with the existing Demo administrator (or an authorized read role) and open Health Agent. The panel is pinned to CREW-03/run `9392250d-93a4-45d4-a871-0dd590190774`; it has no run/path/crew editor or tool-execution button. It is independent of spacecraft/Earth view and explicitly says onboard archive, not delivered Earth evidence.

| Recorded tool | Execution | Data shown |
|---|---|---|
| get_current_vitals | COMPLETED | KNOWN; HR103/min, RR14/min, SpO₂98.1% at saved mission as_of |
| get_data_quality | COMPLETED | KNOWN; recorded good/fresh fixture metadata |
| get_personal_baseline | COMPLETED | KNOWN; authored reference HR center68/min, explicitly not a learned archive |
| get_open_risk_events | COMPLETED | **UNKNOWN**; coverage unknown/no verified N02 record; no fabricated alert or all-clear |

Call order, start/end times, durations, validated arguments, saved results/read receipts, source event/record hashes, fixture/run/mission identity, quality/freshness and full18-event order are inspectable. Native details controls expose provenance without implying model reasoning. No Qwen/LLM selected these four historical calls. Current Health Agent template/no-LLM/reference labels remain intact.

The new fixed GET route authenticates/scopes the existing session before reading only the approved files. It pins all six original sizes/hashes and validates strict schema, hash chain, terminal checkpoint, event relationships, scope, source identity, result bindings and existing cold recovery. Four committed results,18events, zero replay. Missing, altered, symlinked, incomplete or stale-source evidence returns UNAVAILABLE with no successful partial cards. Runtime failures/cancellations and data UNKNOWN have distinct presentation labels; failure states are tested using renderer-only fixtures, not invented historical events.

## Exact files

New code/QA:

- [fixture-trace-view.mjs](../services/agent/fixture-trace-view.mjs): pinned read-only adapter, validation and fixed-route response.
- [fixture-trace.mjs](../apps/mission-control-web/fixture-trace.mjs): escaped accessible archived-result presentation and guarded loading.
- [n16-trace-view.test.mjs](../tests/n16-trace-view.test.mjs): focused read-only regression controls.

Existing files changed only by additive presentation hooks:

- [server.mjs](../services/api/server.mjs): adapter import and fixed authenticated GET delegation.
- [app.mjs](../apps/mission-control-web/app.mjs): presentation import, separate panel and guarded single-read mount.
- [styles.css](../apps/mission-control-web/styles.css): panel-scoped wrapping, keyboard focus and details/provenance styles.
- [dom-harness.mjs](../tests/dom-harness.mjs): explicit import mapping for the new browser module; original assertions and harness behavior retained.

Documentation: this completion, [contract](N16_02_CONTRACT.md), exception/plan, MASTER_PLAN, MODULE_TRACKER, CORE_AI_PRIORITY, DECISIONS, FEATURE_AUDIT, SESSION_HANDOFF and AGENTS checkpoint. No dependency/package changes.

## Focused verification and preservation

**40/40 focused tests PASS, zero failures/skips**; [test log](../artifacts/n16-02-20261028/qa-first.txt). Six changed/new JavaScript files pass [syntax checks](../artifacts/n16-02-20261028/syntax.json). Tests exercise actual archived reads/recovery, all six tamper controls, rehashed invalid schemas/relationships, source/crew/role mismatch, stale source, absent/incomplete/extra/symlink paths, authorization before IO, fixed route, real render-function hook, escaping, UNKNOWN, failure/status separation, accessible native controls and stale-session/navigation/fetch errors. Positive controls require103/min, four actual saved results and18events; an always-unavailable implementation fails.

QA uses isolated copies under task-owned temporary directories and the existing selective DOM/event harness. It introduces no Store/Engine/app construction, operational SQLite/API/detector calls, model/native execution, downloads or tools. No new N16 tool run is authorized or performed. The real server's small route block and Health Agent render function are executed with isolated trusted dependencies; the production app is not started for QA. Keyboard evidence is native details/summary markup, named focusable regions and DOM focus checks; no real-browser/layout/screen-reader acceptance claim is made. Existing browser suites were not run.

[Preservation](../artifacts/n16-02-20261028/preservation.json):631 preexisting protected hashes checked;627 unchanged. For each of the four intentional additive files, removing exactly the new presentation/style/import additions reproduces its original SHA-256. Thus all existing acknowledgement, case, Earth-delivery, monitoring, Scenario Lab, retrieval and tool behavior is byte-preserved. Retained N16-01 traces/fixtures, scientific originals, N14/N15 contracts/model-related evidence, N15-11 blank review packet and N04 acceptance remain unchanged. No operational database was opened for preservation checks.

## Limits and one next recommendation

This is one saved fictional CREW-03 demonstration. It cannot select another crew/run, execute tools, replay/resume, refresh telemetry, acknowledge/queue a fixture result, or use an LLM. Mission as_of freshness is historical, not wall-clock currency. Hash consistency is not an independent signature or clinical approval. Baseline is authored and risk source UNKNOWN. Full N16 tool/workflow, operational authorization/integration, scientific review, resumability and release acceptance remain incomplete.

One smallest recommended next task: a **separately approved, read-only gap review of the exact prerequisite and authorization requirements for any future operational read adapter**, using source inspection only. Do not implement it, connect Qwen, activate the N15 rule or dispatch additional tools automatically.

N16/N15/N14/N13/N07/N09 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. **STOP after N16-02.**
