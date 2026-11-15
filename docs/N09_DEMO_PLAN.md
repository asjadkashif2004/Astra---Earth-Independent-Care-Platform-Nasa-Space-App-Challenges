# N09-D01 — selected-crew synthetic HR demonstration plan

Approved plan, 2026-10-24. The owner subsequently explicitly approved implementation under [DE-N09-DEMO-01](DE_N09_DEMO_01.md); [N09_D01_COMPLETION](N09_D01_COMPLETION.md) records delivery. **N09 In Progress, inactive after this slice; not Complete.** The proposed contract below is preserved, and its implementation-approval request at the end is historical/exhausted. Full N07/N08 remain unfinished; no further task is automatically approved. Existing Scenario Lab and application architecture were retained, with no duplicate Demo Console or new runtime dependency.

## Existing foundation and scope

Scenario Lab already offers seeded, administrator-controlled synthetic presets, but health changes are hard-coded to CREW-03. `Engine.advance` validates and stores canonical observations, retains imported ownership, evaluates N02, snapshots state and queues delayed telemetry. N02 persists risks and enrichment jobs before optional template/retrieval work. Crew Health and Mission Overview share snapshot observations. Health Agent explicitly disclaims an executed tool graph/LLM; its current summaries use the old local lexical source pack, not N13.

The proposed task adds only a six-crew selector and **one finite elevated-HR preset**. Existing presets retain their current behavior and default target. No numeric editor for arbitrary HR/RR/SpO₂, changes to sleep sessions, new baseline, medical threshold, forecast or AI tool execution is included.

## Proposed fixed profile and operator controls

These are software demonstration parameters for separate implementation approval, not clinically validated values:

| Field | Proposed value/meaning |
|---|---|
| Preset/version | `controlled-hr-rise` / `demo-hr-v1` |
| Target | One exact existing `CREW-01` … `CREW-06` ID, selected in Scenario Lab; display name/callsign alongside it |
| Onset | 30 mission-simulation seconds after run start |
| Ramp | Linear increase over the next 60 simulation seconds |
| Amplitude | Add 5 existing personal-baseline robust-scale units to generated HR; retain the existing plausibility bounds. This is a synthetic offset, not an absolute medical threshold. |
| Plateau | 240 simulation seconds at the target offset |
| Return | Linear offset reduction over 60 simulation seconds, then ordinary nominal HR generation |
| Total profile | 390 simulation seconds from start: 30 waiting + 60 ramp + 240 plateau + 60 return |
| Other controls | Existing seed, Run/Restart and Stop; parameters shown read-only. No new speed or communication control. |

Compute the envelope from mission elapsed time. Use the existing noise/baseline for the selected crew; leave other signals and the other five profiles' generation unchanged. Do not manufacture good quality, completed sleep records or clinical findings. All six targets must be covered by focused tests. Values can be reproduced from the same initial checkpoint, seed, parameters and tick schedule; random run IDs/host receipts differ. This does **not** certify full N09 clock-cadence invariance or longitudinal realism; the existing noise still depends on tick.

## Minimal contracts and lifecycle

1. **Authorization and validation:** extend the existing scenario endpoint, not the service-token ingest API. Enforce `scenario` permission and explicit Demo-administrator identity on the new control. Validate crew ID/preset/seed/allowed fields; reject malformed, unknown or unsupported parameters before state mutation. Client-disabled controls are not authorization.
2. **Ownership:** require a verified simulator-owned target HR observation and valid baseline before starting. Reject imported, unknown or externally owned target HR channels, including another device. Preserve every other imported channel unchanged. If target ownership changes during a run, stop applying the offset and report blocked; never reclaim it. Unreliable other measurements can keep monitoring Gray: show that truth instead of promising an alert.
3. **Run persistence/provenance:** use existing JSON mission state and `scenario_runs` records; add only needed target/profile/parameter/start-tick/start-time/stop-completion metadata. Retain canonical source, UTC observation/receipt timestamps, seed/scenario/generator provenance and run-linked event IDs. Commit run state/initial observations coherently and recover from checkpoint; reject/rollback failures without partial application. No unrelated schema or transport rewrite.
4. **Monitoring:** feed newly generated HR through existing validation, persistence, `refreshReading`, `detect`, risk/job transaction and snapshot/queue path. The detector receives measurements, source quality/activity and baseline—not the scenario name, expected result or target label. Do not alter `services/anomaly/detector.mjs`, its heuristic thresholds, acknowledgement or deduplication policy.
5. **Finite completion/stop:** phase is waiting, ramp, plateau, return, completed or stopped. On natural completion the offset becomes zero; monitoring continues. Stop ends the offset on the next generated observation and resumes existing nominal scenario behavior, preserving the stopped run's identity/history. It does not erase old samples, pending/durable cases, open alerts, acknowledgements or packet queues, surrender imported ownership, rewind time or restore blackout. Restart creates a new run; it is not an exact mission rollback. Preserve existing detector-persistence reset behavior at scenario boundaries without changing rules.
6. **Shared mission:** one active scenario affects the shared synthetic mission and all connected views. Use a disposable demonstration database, not an operator-isolated illusion or a production/import database. No automatic cleanup of old runs or records.

## Honest status and existing evidence flow

Derive status from stored run phase, actual source/quality/health and canonical risks matching **both target and run ID**. Old-run alerts remain visible as historical records but cannot prove this run detected anything.

- **Pending / no alert yet:** profile active, monitoring available, no matching alert; show actual detector reason/persistence where available. A brief or insufficient deviation can legitimately produce no alert.
- **Detected:** a matching persisted N02 alert exists. Show its actual severity/evidence and link to the existing Crew Health/Health Agent views; never set a color from the preset label.
- **Detected, case pending/failed:** the alert exists but optional enrichment is unavailable; preserve it and existing HTTP 202/409 handling. Do not enable acknowledgement until the report can be reviewed.
- **Completed, no alert recorded:** finite profile ended with no matching persisted alert; show actual monitoring/quality limitations. Do not describe unavailable monitoring or incomplete evidence as a successful healthy result.
- **Blocked / Unknown:** ownership conflict, missing/stale/suspect data, monitoring degradation, API failure or unsupported baseline. Explain the condition and preserve records; no healthy numeric fallback.
- **Stopped:** identify when intervention stopped; any earlier risk remains recorded and still requires its existing human workflow.

Case summaries stay explicitly **deterministic templates, no LLM**. Existing generic next checks are sensor verification, a voluntary crew check-in and qualified medical-officer/protocol review, not disease inference or prescribing. No actual participant check-in is needed for the synthetic presentation. No full organ diagnosis, new evidence-to-organ mapping or automatic action is introduced.

Acknowledgement remains a human action that queues the existing case report. The communications scheduler, delay/blackout rules and Earth-received projection are reused unchanged. Onboard alerts may exist before any report acknowledgement; delivered telemetry can carry those alerts. A case report requires acknowledgement. Earth case-review/return acknowledgements remain future N18 scope; the current Earth mode is a received-data presentation within the local simulator.

## Likely files and reuse

| File/component | Small proposed change |
|---|---|
| `packages/contracts.mjs` | New fixed preset metadata and shared validation constants; preserve existing telemetry contract and roles |
| `services/telemetry-simulator/simulator.mjs` | Apply the bounded elapsed-time HR envelope only to the approved target in the new preset |
| `services/telemetry-simulator/demo-profile.mjs` (only if useful) | Small pure profile/parameter helper; no new service or dependency |
| `services/api/engine.mjs` | Persist/recover target/run parameters, ownership enforcement, finite/stop state and actual run-bound status using existing transactions |
| `services/api/server.mjs` | Validate/authorize the new preset parameters on existing start/stop endpoints |
| `apps/mission-control-web/app.mjs` | Add selector, fixed-profile summary, honest status and links in existing Scenario Lab; preserve input/focus/loading/error handling |
| `apps/mission-control-web/styles.css` (only if necessary) | Small responsive control layout using existing tokens; no redesign |
| `tests/scenario-demo.test.mjs` (proposed) and existing test harnesses | Focused profile/API/engine/frontend regression coverage |

Reuse N01 source/freshness helpers and storage, N02 detector/health/enrichment, shared presentation, existing history charts, case builder, acknowledgement, Comms scheduler and both reception views. Do not edit the detector, knowledge/agent execution, communications scheduler, graphics or N13 review records. A necessary change beyond these bounds requires a separate decision.

## Verification gates for the future task

| Gate | Minimum evidence |
|---|---|
| Roles/input | Demo administrator succeeds; all six other roles, unauthenticated and malformed/unknown crew/preset/seed/parameter requests reject without state changes |
| Ownership | Imported/unverified target HR rejects; mid-run import is preserved and blocks further injection; other imported channels remain intact; no service-token workaround |
| Profile | Every target, exact onset/ramp/plateau/return/completion boundaries, plausibility bounds, no duplicate/held observations; unchanged other metrics/crew for equivalent initial state |
| Monitoring | Actual N02 persistence and quality/exercise gates; a short stopped run can yield no alert; qualified evidence can yield an alert without hard-coded severity; Gray/degraded states cannot imply success |
| Provenance/durability | Canonical timestamps/event/run/profile identity, restart/checkpoint and transaction rollback; equivalent initial checkpoint/seed/tick schedule reproduces profile values |
| Reports | Current-run/crew matching, old-run separation, optional enrichment failure/202, acknowledgement 409/idempotency and no automatic acknowledgement/transmission |
| Reception | Existing onboard/Overview/Crew agreement; no early Earth visibility; blackout, restoration and configured delay retained; stop does not clear queues or restore blackout |
| Frontend | All six selector values, preserved input/focus on updates, loading/error/pending/no-alert/stopped states, role denial, short desktop/mobile keyboard smoke |

Run `npm run check`, new focused tests, relevant existing N01/N02/integration/frontend tests and the repository-required regression gate (`npm test`) after approved implementation. Reuse prior N04/N13 evidence; do not run long N04 performance matrices or retest old assets. Any real browser verification should be a short functional path with an isolated temporary database, using supported permissions as needed, not long acceptance collections. Record executed versus unexecuted checks honestly. No tests, browser or database run accompanies this documentation task.

## Proposed presentation flow

1. In a separate synthetic demo database, enter as Demo administrator; show monitoring readiness, current source ownership and configured mission-time speed/delay. Pick any fictional crew in Scenario Lab.
2. Show the fixed profile's target/onset/ramp/duration and synthetic disclaimer; press Run. Show pending persistence, then matching real detector evidence if it qualifies. Do not promise an instantaneous alert.
3. Open the selected Crew Health and Mission Overview views to compare source-time-aligned values, quality and personal baseline evidence.
4. Review the template case and its generic next-check suggestions; explicitly identify no LLM. If enrichment is pending, show that state rather than skip acknowledgement safeguards.
5. Human-acknowledge, inspect the queued report and switch between onboard and delivered Earth views. If blackout is demonstrated, restore it explicitly; wait for actual delivery and show observation/transmission/reception times.
6. Stop or let the finite profile complete. Show retained history/alerts and stored replay. Explain that this is a synthetic rule-based demonstration, with AI/medical validation and full roadmap work still pending.

## Next approval and stop

Exact proposed authorization: **“I approve N09-D01 implementation under DE-N09-DEMO-01, using docs/N09_DEMO_PLAN.md, including its fixed profile and bounded verification. Implement only this slice and stop afterward.”**

Until that separate instruction, N09 remains Not Started and all implementation unapproved. N07/N08/full N09 gates remain; N13 evidence decisions stay pending; N14–N16 remain unapproved. Preserve N04 Complete, N05/N06 Deferred, N03 Partial and AC-20 Open / Unverified. **STOP after this documentation task.**
