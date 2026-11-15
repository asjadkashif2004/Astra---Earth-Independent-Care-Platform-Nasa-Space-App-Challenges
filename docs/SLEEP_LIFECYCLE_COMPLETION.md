# Last Sleep lifecycle repair — delivered 2026-10-23; STOP

The user approved one bounded lifecycle repair. **Implemented and verified with focused automated regressions.** N01/N02/N04 remain Complete; N05 remains In Progress; N03 Partial; AC-20 Open / Unverified. This does not authorize AI, N06, additional anatomy work or N04 retesting.

## Root cause and resulting behavior

`simulate` generated `sleep_duration` through its per-tick Gaussian/sine scalar loop and continuously subtracted scenario drift. The existing label meant the last completed sleep duration. Both screens used the same value, so formatting was not the cause.

The simulator now holds a deterministic per-astronaut completed session. It changes only at a new synthetic completion or a reasoned, sequential correction. Original sessions/revisions persist in a separate append-only SQLite ledger. Source metadata remains stable across ordinary ticks, scenario changes, checkpoint/restart and rollback. No held sleep sample is re-ingested or counted as new N02 evidence. All non-sleep generator draws are still consumed in their original order; a pre-change golden verifies exact unchanged non-sleep values/events.

The complete additive data/update/time/quality/API contract and assumptions are in [SLEEP_SESSION_CONTRACT](SLEEP_SESSION_CONTRACT.md). Important boundaries:

- The illustrative completion time is 07:00 UTC each mission day; this is fictional synthetic data. Bootstrap is explicitly historical, not a random frozen metric or an actual astronaut sleep reconstruction.
- Corrections append revisions; current-session identity, expected revision, source/device, increasing observation time and correction reason are checked. Imported corrections use existing service credentials; internal simulator correction has no public write route.
- A held daily record stays current under the unchanged three-sampling-period freshness policy. Old completion time cannot be refreshed by a later correction timestamp. Missing/poor-quality records remain Gray until legitimate recovery.
- Earth delay/blackout/restart semantics are unchanged. New records have mission knowledge time; retrospective history must be limited by received-packet knowledge, not by the old sleep end time.
- Old snapshots, scalar imports and predictions remain unchanged. Untyped imported/replay values say **Sleep observation — session unverified**. Typed sleep charts deduplicate and display points/steps. Overview/Crew Health use the same projected channel.
- Scenario sleep reductions affect future completed sessions only. Current HR/HRV/fatigue/reaction-time scenario behavior remains intact; no fabricated multi-day sleep evidence is introduced.
- Continuous sleep forecasting is explicitly unavailable because its calibration cannot support session records. HR/HRV forecasting and stored model artifacts are unchanged; no forecast redesign/recalibration was performed.

## Exact changed source files

| Files | Change |
|---|---|
| `services/telemetry-simulator/sleep.mjs` (new) | Deterministic completed-session generator, stable record/observation representation and corrections |
| `services/telemetry-simulator/simulator.mjs` | Hold daily records, generate completions, retain non-sleep RNG/output and canonical per-channel timing |
| `services/api/store.mjs` | Additive schema version 3, append-only session/revision ledger and knowledge-time history |
| `services/api/engine.mjs` | Atomic ingestion/completion/correction/checkpoint/recovery integration, authoritative imported ownership, unsupported sleep forecast |
| `services/api/telemetry.mjs`, `packages/contracts.mjs`, `packages/presentation.mjs` | Optional validated session metadata, truthful retained source times and completion-based freshness; accurate scenario wording |
| `services/api/server.mjs` | Authenticated/self-scoped read-only sleep-history route and API catalogue entry |
| `services/prediction/forecast.mjs` | Abstain from unsupported sleep forecasts |
| `apps/mission-control-web/app.mjs`, `ui.mjs`, `sw.js` | Shared truthful labels/details, discrete history markers/steps, shell-cache version |
| `scripts/calibrate-forecast.mjs`, `scripts/evaluate.mjs` | Explicit actual cadence for canonical observations; calibration excludes unsupported sleep; neither tool executed |
| `tests/foundation.test.mjs` | Correct fixture's declared cadence to its actual 30-second step |
| `tests/sleep-lifecycle.test.mjs` (new) | 15 focused regression tests |

No new dependency, rendering/asset, detector, communications scheduler, authentication policy or acknowledgement code changed. No usable Git repository is available, so no commit was made. Documentation changes are listed in the [verification record](../artifacts/sleep-lifecycle-20261023/verification.json).

## Executed verification

Linux/WSL2, Node **v24.21.0**. Tests use memory or freshly created temporary databases; no normal runtime database, historical fixture or real medical record is accessed.

| Check | Actual result |
|---|---|
| Final focused regression matrix, eight test files | **116/116 pass**, 0 failures/skips/cancellations, 36.417 s |
| New sleep lifecycle tests within that matrix | **15/15 pass** |
| `npm run check` | **78 JavaScript files**, local imports checked, **0 errors** |
| Non-sleep pre-change golden | Exact SHA-256 match across 15 scenario/tick combinations |
| N02 detector | Exact original SHA-256 preserved |
| N05 final graphics inventory | **24/24** files match saved N05 hashes |
| N04 accepted assessment records | **24/24** match their historical fingerprints; no trials rerun |
| Frozen model calibration/model-card artifacts | Both match pre-repair hashes |

The regression matrix covers stability/exact completion, corrections and append-only SQL protection, injected completion/correction rollback, disk restart and schema-2 bootstrap, deterministic replay, unchanged non-sleep values/events, imported ownership and imported-revision disk restart, metadata/order/device/mixed-batch rejection, missing/suspect/stale recovery, no held-sample persistence, blackout/delay/knowledge-time isolation, read permissions, scalar-prune preservation, actual frontend templates/replay agreement and forecast abstention. Existing N01/N02 tests cover private check-ins, service-token authorization, transaction/SSE integrity, monitoring/enrichment recovery and human acknowledgement conflicts. Frontend tests use a lightweight DOM harness, not Chrome.

Logs and small source/preservation inventory: [regression.log](../artifacts/sleep-lifecycle-20261023/regression.log), [check.log](../artifacts/sleep-lifecycle-20261023/check.log), [verification.json](../artifacts/sleep-lifecycle-20261023/verification.json). Intermediate test failures were fixture issues: one fixture declared 1 Hz while stepping 30 seconds; one deterministic comparison included real host receipt time. These were corrected without weakening source/mission-time comparisons or detector rules. Final results above are the executed passing run, not a reused full-suite claim.

No browser, screenshots, performance benchmark, N04 collection, synthetic evaluation or calibration run was performed. Previous browser/acceptance evidence remains historical and is not asserted to certify this repair. Focused regressions were chosen under the user's bounded verification instruction; the full unrelated suite was not rerun.

Documentation consistency check: all194 relative local links across the14 changed documentation files resolve after evidence creation. The new16-file source inventory matches current hashes. Saving the three small evidence files required supported filesystem escalation because the command sandbox exposed the artifacts directory as read-only; no package download, OS change or browser operation was involved.

## Self-test and remaining limitations

Run `npm start`, enter the local synthetic simulation and compare a crew member's Last Sleep on Mission Overview and Crew Health. Its duration and completed timestamp should stay unchanged through ordinary telemetry ticks. A scenario switch should change its stated current non-sleep signals without rewriting that completed sleep. At the next mission-day 07:00 UTC completion, a new record appears. With the default 30× clock, this may take tens of real minutes; do not expect a per-tick change.

For bounded automatic checks use the command in [TESTING](TESTING.md#last-sleep-lifecycle-focused-verification). Restarting the same application database preserves the current record/revision and delayed packets. Existing untyped imported sleep may still say Sleep observation/session unverified; only the owning import producer can supply its session or correction. There is deliberately no manual correction UI.

This repair is not a longitudinal scientific simulator. Individual sleep schedules/stages, dated baseline calibration, cumulative deficit inference, arbitrary historical-session corrections, sleep-specific forecasting and clinical validation remain unimplemented. The fixed schedule and scenario reductions are explicit synthetic assumptions. Other sensors recovering cannot silently repair a missing sleep record. Ledger retention is append-only without a new archival/backup policy; existing scalar/snapshot retention remains unchanged. No rendered-browser or hardware-performance certification is claimed.

**STOP after reporting.** Further work requires a separate explicit approval. Preserve N04 Complete, N05 In Progress, N03 Partial and AC-20 Open / Unverified.
