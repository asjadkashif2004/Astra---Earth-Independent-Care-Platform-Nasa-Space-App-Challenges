# Four-minute Mission Day demo

Prerequisite: `npm start` in a normal terminal, open `http://localhost:3000`, enter the demo-administrator role. Core demo requires no Internet, pretrained model or downloaded texture. Browser execution is not verified inside the agent sandbox.

1. **0:00–0:35 — Mission overview.** State clearly that telemetry is synthetic and crew are fictional. Point out all six personal streams, mission clock and 30× speed. Rotate Earth. Open the provenance view to show the boundary between source summaries and unacquired public datasets.
2. **0:35–1:10 — Select CREW-03.** Inspect Amara's schematic health twin; rotate it and change layers. Heart animation rate follows the displayed HR; respiratory motion follows RR. These are visual links, not validated organ simulation. Open the personal trend chart.
3. **1:10–1:50 — Inject drift.** In Scenario Lab choose **Sleep debt + cardiac drift**, seed 42017. Return to Amara. Amber is expected within 300 mission seconds (about ten real seconds at 30×). Open baseline SD, persistence, quality and detector version in Evidence & review. No LLM creates this alert.
4. **1:50–2:25 — Inspect agent.** The existing detector event has produced a cited, deterministic case. Explain its quality → baseline → source → review graph. Ask the research library why sleep/fatigue and cardiac trends are tracked; show original URLs and explicit retrieval limitations.
5. **2:25–2:55 — Disconnect Earth.** In Communications choose **Simulate blackout**. Return to the case and acknowledge it. A report is queued, with human actor and original observation time. Local telemetry/detection/knowledge keep running. External Wi-Fi may also be disabled if testing on the same local machine; do not stop the localhost server.
6. **2:55–3:30 — Restore link.** Restore Earth communications. With 12 mission minutes at 30× speed, allow at least 24 real seconds plus queue serialization/jitter. Show the case's queued, transmitted, earliest-delivery and Earth-received times. Switch Mission overview to **Earth received** to see delayed snapshots.
7. **3:30–4:00 — Show evidence.** Open the model cards and hash-chained audit. Explain that forecasting bands are calibrated only for a narrow nominal synthetic setting (and abstain during deviations); no NASA medical feed or disease prediction is claimed. The workflow works without a cloud model.

## Reliability demonstrations
Sensor dropout must become Gray, never Red. Post-exercise recovery must stay contextual. Strong cardiorespiratory drift eventually creates a new high-priority review event after 180 seconds of severe persistence; it requires its own acknowledgement. Previously recorded cases/audit remain when switching scenarios. API restart resumes simulation and queued cases; the automated disk-restart integration test covers that behavior.

## Recording and fallback
AC-25 remains open until an actual working-system video is recorded. Record the browser, visible seed/speed, citations, acknowledgement and receipt timeline. Keep a local capture and this runbook. If GPU rendering fails, use the 2D schematic; if cloud/Internet fails, continue localhost. If the local server fails, the browser marks cached readings Gray and cannot honestly simulate fresh health data by itself.
