# Existing ASTRA application — WSL run and verification

This runbook tests the prototype after approved N03 software delivery. N01/N02 repairs remain verified; N03 repairs F08/F13 software behavior, pending/degraded states and frontend controls.95 tests and39 JS checks pass. Actual browser acceptance remains Blocked here, so N03 is Partial and stopped. Current detail: [N03_COMPLETION](N03_COMPLETION.md), N02_CONTRACTS and FEATURE_AUDIT. N04+ are unapproved.

Current2026-10-18 continuation supersedes that original count:100 tests/39-file checks pass; four additional breadcrumb/history/replay/provenance-panel defects repaired. User Windows Landing/Overview rendering is separate evidence. Actual server/Linux/Windows attempts remain blocked. [N03_BROWSER_ACCEPTANCE](N03_BROWSER_ACCEPTANCE.md) contains exact normal-WSL/installed-browser commands, all-scenario checklist, four-viewport matrix and results required back; [VISUAL_REDESIGN_PROPOSAL](VISUAL_REDESIGN_PROPOSAL.md) is future proposal only. STOP before N04.

## Start in your normal WSL terminal

Requires the installed Node 24.21+ within the Node 24 line. The native app has no npm packages to install and no build step. These commands should run in your normal laptop WSL terminal, outside the agent sandbox that denied socket binding.

```bash
cd '/mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI'
node --version
npm run check
npm test
npm start
```

Keep that terminal running. Expected server line: `ASTRA Command — http://localhost:3000`. In a second WSL terminal:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/v1/health
```

Expected healthy automatic monitoring: HTTP200, `ready:true`, `status:"ok"`, `monitoring.status:"running"`, recent host `last_success_at` and `mode:"local-research-simulation"`. Optional pending/failed enrichment can legitimately produce200/degraded with core readiness true; core failure/staleness gives503. This is inspected service readiness, not browser or clinical verification. See N02_CONTRACTS.

Open **http://localhost:3000** in Windows Chrome/Edge/Firefox. Select **Demo administrator · full simulation**, then **Enter simulation**. No password/API key is required for these explicitly fictional local identities. Windows browser startup was not tested by this audit. Keep the default loopback HOST.

If port 3000 is occupied, stop this instance with Ctrl+C and run `PORT=3001 npm start`, then use port 3001 in curl/browser. Do not kill unrelated processes. If `node:sqlite` is unavailable or the engine version is incompatible, use the documented Node 24.21+ installation; no replacement database/package is needed.

The default database is ignored `data/runtime/astra.sqlite`. Ctrl+C stops cleanly; restart resumes its clock/history/queue. Preserve the database. To try an independent demo without changing existing records:

```bash
astra_audit_dir=$(mktemp -d /tmp/astra-user-demo.XXXXXX)
ASTRA_DB="$astra_audit_dir/astra.sqlite" PORT=3100 npm start
```

Open **http://localhost:3100** and use port 3100 for health checks. The printed shell variable stays available in that terminal for restarting the same independent database. No deletion/reset command is needed. Scenario Lab's **Nominal mission day** starts a new scenario while retaining prior cases/audit. It does not reset blackout; restore the link separately in Communications.

## Manual prototype walkthrough

Record actual failures, browser/version, OS, viewport and console messages; do not treat the checklist as evidence until performed. Existing features may expose the defects listed in FEATURE_AUDIT.

1. At 1920×1080, confirm six fictional crew cards, moving values, mission clock, synthetic labels and link state. Test every workspace: Mission Control, crew twin, agent, knowledge, communications, scenarios, provenance, check-in and replay. Check the browser console for uncaught errors and failed requests.
2. Select **Amara Okafor / CREW-03**. Rotate the schematic twin by dragging, arrow keys and the rotation slider. Select each domain layer and chart metric. Confirm HR/RR, chart and evidence correspond to selected crew. This is currently a schematic surface, not anatomical organs.
3. In **Scenario Lab**, run **Sleep debt + cardiac drift** with seed 42017. At default30× speed, the predefined300 mission-second detection window is about 10 real seconds. Select CREW-03 and inspect persistent signal deviations, detector version, quality and uncertainty. Do not interpret review priority as a diagnosis.
4. Open **Crew health agent** and citations. Its sidebar is labeled a workflow reference, not executed tools (F09 remains N16). Pending/failed enrichment must preserve the alert and show actual availability. Acknowledge only when a case is ready; repeat activation must not duplicate a report. Export JSON only if your role allows it.
5. In **Communications**, simulate blackout. Acknowledge an alert onboard and confirm its report remains queued. Restore link, retain the displayed12-minute one-way delay (about 24 real seconds at 30×, plus serialization/tick rounding). Confirm observed/transmitted/earliest/received times and eventual report delivery. Failed-retry resend is currently incomplete (F07).
6. Switch Mission Control/crew detail to **Earth received**. Confirm delayed values, badge and recorded alerts all use received packets only. Before receipt, show Unknown/Gray; no onboard cases may leak into Earth view. Compare event/receipt times and wait beyond the configured delay during blackout to verify stale Gray. F08 software regression tests pass; actual browser consistency still needs this check.
7. Run **Sensor dropout** and confirm Gray/missing data, then **Post-exercise recovery** and confirm context avoids inappropriate resting escalation. Restore Nominal when done. Run the environment scenario and inspect synthetic, illustrative warning labels.
8. Use **Onboard research library** for “Why monitor sleep and fatigue?” and an unsupported question. Expect short cited summaries or abstention. It is not a complete medical/protocol library or LLM.
9. Check-ins record actual device task timing/fatigue separately from synthetic telemetry. N01 denies raw records to Viewer/Researcher/System Admin; Astronaut is self-only, mission reviewers have explicit access, Demo Admin sees same-actor entries. Use the independent temporary database/test inputs; no real astronaut information is needed. Browser timing/early-click/five-trial verification remains pending.
10. Open **Mission replay**, move the observation slider and compare historical times/values. Current replay is a scalar inspection window, not a complete 3D/waveform playback timeline.
11. Log out/re-enter as Viewer and Astronaut. Viewer must not start scenarios/acknowledge/query protected knowledge/read audit; Astronaut should see CREW-03 only. N01 also denies raw reads to Viewer/Researcher and restricts Demo Admin to the same demo actor.
12. At 390×844, check scrolling/overflow, all controls, readable labels and focus. Use keyboard only for navigation/forms/scene rotation. Enable OS reduced motion, then toggle Performance mode; verify interface remains readable.
13. Leave the local server running; disable **external Wi-Fi/Internet**, not localhost. Run a scenario and a knowledge question: both should continue locally. This physical test has not been performed by the agent.
14. Restore Internet, then separately stop the local server. Readings must become Unknown/Gray, recorded alerts remain labeled, and writes disable. Packet freshness expires after5s, health after7s; disconnect detection may be earlier. Reload only after confirming service-worker control in DevTools. Cached-shell/snapshot behavior is separate from Internet-independent operation. F13 software paths are tested; actual browser behavior is unverified.
15. Restart the same database, reconnect and verify clock/cases/queue recovery. Confirm no duplicate acknowledged report. For performance, measure30 seconds in Performance mode, record actual browser/GPU/viewport and FPS; offscreen shader QA does not satisfy≥30 FPS acceptance.

The present app has no completed anatomical organ inspection, live NASA feed, public waveform replay, local LLM, ground-to-spacecraft review response or production login. Do not expect those controls/integrations until their approved modules are delivered.

## Reproduce the automated audit

```bash
npm run check
npm test
npm run evaluate
npm run benchmark
node docs/audit/probes.mjs
```

The audit probe exits0 when N01/N02 repaired checks and N03 F08/F13 software assertions pass while separately open findings still reproduce. It uses memory-only databases and restores its injected source-object property. N02 tests also use isolated temporary copies/SQLite files for cold-corpus/restart checks. N03 focused regressions: `node --test --test-isolation=none tests/frontend-correctness.test.mjs tests/scenes.test.mjs`. No real runtime records are edited. Optional shader QA needs cached ANGLE/SwiftShader; it is not a normal startup dependency or browser acceptance.

Optional real browser driver: `ASTRA_BROWSER_BIN=/usr/bin/chromium npm run test:browser`, using an installed Linux Chrome/Chromium. It creates a disposable profile/in-memory server and saves evidence only for executed stages. Exit0 passed,1 failed,2 blocked. Current run is blocked with zero browser checks/screenshots. See N03_COMPLETION for exact steps and limits. There are no build/lint/typecheck scripts or verified Docker build. N03 software is delivered, browser acceptance is open, and work is stopped; N04+ require explicit approval.
