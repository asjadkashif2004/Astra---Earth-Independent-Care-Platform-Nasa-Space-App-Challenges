# N09-D01 — selected-crew synthetic HR demonstration

Delivered 2026-10-24 under explicit implementation approval, [DE-N09-DEMO-01](DE_N09_DEMO_01.md) and the [approved plan](N09_DEMO_PLAN.md). **This slice is delivered; N09 is In Progress, not Complete. STOP before another task.** No other module or AI capability is implemented.

## Implemented behavior

Existing Scenario Lab now contains one clearly labeled synthetic HR demonstration with a selector for all six fictional crew. Existing nine presets retain their behavior and original CREW-03 targets; there is no duplicate workspace, arbitrary metric editor or new dependency.

| Mission elapsed time | HR offset from ordinary generation |
|---|---|
| 0–30 seconds | Zero; waiting for onset |
| 30–90 seconds | Linear ramp to five existing personal-baseline robust-scale units |
| 90–330 seconds | Five-unit plateau |
| 330–390 seconds | Linear return to zero |
| 390 seconds onward | Zero; profile completed, ordinary nominal HR generation continues |

Values retain existing plausibility bounds. Only selected-crew HR changes. Other metrics/crew retain their generation; the new preset delegates completed-sleep generation to nominal semantics so it does not create unrelated sleep changes. Existing sleep records and revisions are untouched. Profile `controlled-hr-rise` / `demo-hr-v1` is a software demonstration, not a clinically calibrated threshold or guaranteed alert.

The new pure envelope has no alert authority. Measurements pass through existing canonical validation, SQLite ingest/snapshots, freshness/quality derivation and unchanged N02 detection. Scene, anatomy, knowledge/retrieval, case-template, forecast, communications scheduler and detector implementations are unchanged.

## Run identity, ownership and recovery

The run manifest and mission checkpoint preserve selected crew, seed, fixed profile/version/parameters, start tick, UTC start/scheduled end and actual completion/stop/block time. Canonical event IDs already bind run ID, tick, crew and metric; actual source/observation/receipt/seed/scenario/generator metadata remain. Alert status requires a canonical risk matching run and target with HR evidence from that simulator/run. An old alert, another crew's event or an imported source cannot prove detection for a new demonstration.

Only the Demo administrator can start/restart/stop scenarios through the existing server endpoint. The new preset requires a valid target/integer seed, verified simulator-owned resting HR and available personal baseline. Imported/unknown/unverified HR ownership rejects with 409; extra fields, fabricated targets, fractional seeds and arbitrary values reject with 422. Non-resting or unreliable target HR rejects preflight. Other imported channels are preserved and may legitimately keep monitoring Gray. A target HR import during a run blocks further offset application without reclaiming ownership; stored imported observations remain held and eventually stale, not regenerated as fresh.

Scenario transitions and their initial tick now share an existing SQLite transaction. On failure the previous mission/pending state, clock, communication cursor/configuration, run record, observations, snapshots and queue roll back together. This small common-start-path correction adds no schema or scheduler redesign. Restart resumes the persisted target/profile/run; equivalent initial checkpoints, seeds and tick schedules reproduce values. Random run IDs and host receipts are not claimed identical. Full cadence-independent noise generation remains unfinished N09 work.

Stop resumes existing nominal scenario behavior on the next generated observation. It preserves the stopped run, historical telemetry, open alerts, cases, acknowledgement and packet queues; it does not rewind time, delete records, hand back imported ownership or restore blackout. Natural completion is finite; ordinary monitoring continues. The last demonstration is explicitly distinguished from a different current scenario. Stored replay remains historical inspection while the live mission continues; no isolated replay engine is claimed.

## Honest UI and existing response

The existing Scenario Lab shows phase, target, run ID, mission elapsed/source time and actual pending/detected/no-alert/Unknown/stopped status. It records uncertain measurement coverage and never turns unavailable monitoring into a successful healthy result. Detected status displays the real risk ID/severity and case enrichment state, with links to existing target telemetry, template case and Earth queue. A short stopped run can legitimately have no alert.

Selection applies to the next run. Input/selection/focus survive streaming updates and rejected requests. The Earth-received mode withholds onboard demo details and disables the new injection controls; no unreceived alert is substituted. Astronaut-scoped snapshots remove another target's demonstration. The mission remains shared among connected sessions, not isolated per operator.

Health Agent still produces deterministic template reports using the older lexical knowledge summaries, **no LLM or executed tool graph**. Recommendations remain sensor verification, voluntary check-in and qualified medical-officer/protocol review, with no diagnosis/treatment or organ inference. Enrichment failure preserves the alert, reports pending/failed state (202), and blocks acknowledgement (409). Human acknowledgement is still required to queue a case report; delayed telemetry can independently carry alerts. The existing scheduler preserves blackout and actual observation/transmission/receipt ordering.

## Changed files

| Area | Files |
|---|---|
| Shared/simulation | `packages/contracts.mjs`; `services/telemetry-simulator/simulator.mjs`; new `services/telemetry-simulator/demo-profile.mjs` |
| Backend integration | `services/api/engine.mjs`; `services/api/server.mjs` |
| Existing frontend | `apps/mission-control-web/app.mjs`; `apps/mission-control-web/styles.css` |
| Bounded QA | New `tests/scenario-demo.test.mjs`; new `scripts/browser-n09-d01.mjs`; one import/dispatch branch in `scripts/browser-acceptance.mjs` |
| Documentation | AGENTS, MASTER_PLAN, MODULE_TRACKER, SESSION_HANDOFF, CORE_AI_PRIORITY, FEATURE_AUDIT, REQUIREMENTS, ARCHITECTURE, TESTING, DECISIONS, dated implementation notes in the exception/plan, and this report |

No package/lock changes, external dependencies, new services, runtime asset or historical evidence edits. Normal runtime database and personal browser profiles were not used. The protected unusable Git mount remains untouched; no commit is available.

[Preservation audit](../artifacts/n09-d01-20261024/preservation.json): 554 baseline source/data/reference paths, 547 unchanged and only the seven approved existing code files changed; three new code/QA files are separately inventoried. Detector, canonical telemetry helper, sleep ledger, agent/retrieval, forecast, scheduler, graphics/assets, package manifests, scientific/corpus originals and protected earlier dependency decisions remain unchanged. All 26 module IDs/full N09 prerequisites are retained; documentation links/fences pass. This is a preservation check, not a re-execution of historical N04 acceptance.

## Actual verification

[Machine-readable summary](../artifacts/n09-d01-20261024/verification.json).

| Executed check | Result |
|---|---|
| [Full `npm test`](../artifacts/n09-d01-20261024/regression.txt) | **368 tests: 367 pass, 0 fail, 1 existing skip** for unavailable complete-real Sleep-EDF pair; includes 20 new N09-D01 tests |
| [Final focused regressions](../artifacts/n09-d01-20261024/focused-final.txt) after the scoped mobile markup/CSS correction | **49/49 pass**, 20 new scenario + 29 existing frontend; 0 skip/fail |
| [Final `npm run check`](../artifacts/n09-d01-20261024/syntax-check.txt) | **110 JavaScript files**, 0 syntax/import errors; not TypeScript compilation |
| [Real browser flow](../artifacts/n09-d01-20261024/browser/report.json) | **3/3 groups pass**, Windows headless Chrome **155.0.8059.86**, six screenshots, zero captured JavaScript errors |
| [Final layout check](../artifacts/n09-d01-20261024/browser-layout-final/report.json) | **1/1 group pass**, three new screenshots, zero JS errors; desktop 1920×1080 and mobile 390×844, no document overflow |

The full suite preceded only a scoped Scenario Lab notice/control layout correction; final 49-test frontend/scenario regression and syntax checks validate that final markup. The earlier complete browser workflow was reused rather than repeated. Initial cramped mobile controls were corrected to one column with a full-width selector and readable context. Original screenshots are preserved; the final layout screenshots are in a separate directory.

All six actual engine pipelines, default seed 42017 and 30-second mission steps, produced their first **warning/Amber at 210 mission seconds**, with **120 seconds of qualifying single-signal persistence**. No forced Red, pre-created case or automatic acknowledgement occurred. HR evidence retained actual simulator/run metadata; baselines and unrelated metrics stayed unchanged. All six targets were engine/API/frontend-harness tested; the real browser end-to-end path used CREW-01, not six repeated browser workloads.

In that real browser path, Crew-01 HR was **89.22 bpm**, baseline center **66.239**, scale **4.609**, deviation **4.987 scale units** at 11:03:30 mission UTC; Overview and Crew Health both rendered rounded **89 bpm**. These are fictional synthetic observations, not medical limits. Evidence strength was 0.695, explicitly heuristic and not a clinical probability. With a configured one-minute delay and zero jitter, the acknowledged report transmitted at 11:04:30, became eligible at 11:05:30.151 and was received at 11:06:00 mission UTC on a later simulation tick; it did not arrive early. Stop retained blackout and the queued report before explicit restoration.

Tests cover all seven roles/anonymous requests, input rejection, imported/unknown ownership and mid-run handoff, suspect/stale channels, resting context, actual N02 persistence, no-alert/Unknown, rollback/start/completion, disk recovery, run isolation/history, pending cases/202/409, acknowledgement deduplication, queue delay/blackout and Earth-view isolation. Existing N01/N02 regressions passed unchanged. The only recorded HTTP error in each browser startup is the expected unauthenticated `/v1/auth/me` 401 before login.

Screenshots actually inspected include the detected state and final desktop/mobile layouts: [desktop](../artifacts/n09-d01-20261024/browser-layout-final/scenario-1920x1080.png), [mobile controls](../artifacts/n09-d01-20261024/browser-layout-final/scenario-controls-mobile.png), [actual detected evidence](../artifacts/n09-d01-20261024/browser/scenario-detected.png). Browser runs used an owned disposable profile/database and real HTTP/rendering, with manual engine advancement for bounded checks. They are not physical-display latency/FPS, minimum-machine, full accessibility or new N04 acceptance certification. No long trial matrix, new model evaluation or scientific download ran.

## Presentation instructions and limits

From the project root in WSL, choose a previously unused disposable path so existing imported channels/history are not confused with this run:

```bash
ASTRA_DB=/tmp/astra-n09-demo-01.sqlite npm start
```

Open `http://localhost:3000`, enter as **Demo administrator**, choose **Scenario Lab → Spacecraft**, select a crew member and press **Start selected-crew HR demo**. Existing files resume their state; use another unused filename for a fresh mission rather than deleting records. No secrets or AI service are needed. Keep a single operator controlling this shared mission.

Show the profile/seed and pending status, then inspect real detector evidence in Crew Health and synchronized Overview. For this tested seed/cadence the warning occurred at 210 mission seconds; do not promise a guaranteed result under different quality/ownership/context. Default 30× mission time makes 390 simulated seconds roughly 13 host seconds before scheduling/network overhead; that is a configured conversion, not a measured wall-time guarantee.

Review the deterministic template, explain its generic next checks without collecting real participant measurements, and acknowledge only after review. Show the Communications queue and configured one-way mission-time delay. To demonstrate blackout, enable it there, acknowledge/queue, then restore explicitly and wait for actual reception. Use Earth-received views to show delayed knowledge; the current Earth mode is a projection in the local app, not a separate ground service or future N18 round-trip review. Stop or let the HR profile finish, then show retained history/replay and the last-run label.

Preflight can reject exercise recovery, unreliable HR, missing baseline or protected source ownership. Other imported signals may hold monitoring Gray. A new run does not clear earlier open alerts, reports or link settings; identify the displayed run/target. Templates are not AI diagnosis; this is a rule-based synthetic demonstration. No full human-subject or medical validation, new tablet/zoom acceptance, assistive-technology certification, continuous-animation performance or AC-20 claim is made.

## Remaining full N09 and stop

Still open: dated longitudinal baselines; actual 24-hour circadian/sleep/activity schedules and multiday deficit/drift; independent artifact labels; full cadence invariance; broader scenario/baseline archive and manifest contracts; true multiday evidence; time/crew/scenario-disjoint evaluation and no label leakage. Full N07/N08 prerequisites and all their public source/waveform/card/split/twin gates are retained. N09-D01 is not a substitute for those requirements or downstream N10–N12/N16 eligibility.

N01/N02/N04 remain Complete; **N09 In Progress and inactive after this slice**; N07/N13 In Progress and inactive; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. N13 independent decisions remain pending; no N14/N15/N16, further N09, anatomy or acquisition approval is inferred. **STOP and await separate approval.**
