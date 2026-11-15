# N02 completion — Independent monitoring and Tier A rules

Date: 2026-10-17. Explicit approval covered N02 only. **Complete within the approved backend/software verification boundary; STOP. N03 and all later modules are unapproved and unstarted.** The full advanced research system remains incomplete.

## Delivered repairs

| Finding / research mapping | Implemented and verified behavior |
|---|---|
| F01 / R14,R37 | Detector `robust-personal-v2`: explainable persistent isolated deviations, two-sided single/multisignal rules, separate severity timers, persistent observed-time rate detection. Exercise, personal baselines and conservative quality gating preserved. Held samples, gaps, sign/source/context changes cannot manufacture continuous evidence. |
| F10 / R64 | Original risk and durable enrichment job commit atomically with critical telemetry/history/queue/checkpoint/audit. Optional case construction runs in a bounded worker after commit. Retrieval errors, missing/corrupt corpus, worker crash/hang and optional write failure cannot erase the original alert. |
| F10 recovery / R14,R64 | Additive schema v2, persisted dispatch/failure/attempt/backoff, pending and failed disk restart, legacy missing-case backfill, risk-keyed case uniqueness and one local dispatcher. Recovery creates a case without inheriting acknowledgement or transmitting automatically. |
| F06 / R24,R64 | Current DB probe, host-clock monitoring failure/staleness/recovery and optional degradation. Core failure gives503; healthy core with unavailable optional enrichment gives200/degraded. Public output has aggregate status/counts, no crew/check-in data or raw errors. |
| N01 preservation | All existing tests pass: source ownership/order/immutable provenance, stale Gray, atomic import/queue/audit rollback, private check-in scope, history/SSE, sequenced delayed Earth delivery, escalation and human acknowledgement. Rate evidence traces both canonical endpoints. |

Chosen heuristic thresholds, separate timers, rates, quality/freshness gates, retry/worker limits, API responses and health field meanings are specified in [N02_CONTRACTS.md](N02_CONTRACTS.md). Single-signal Amber is absolute robust z≥4 for120 observation seconds; single Red≥6 for180s; multisignal Amber≥2 for90s and Red≥4 for180s; sustained rate≥3 robust-scale units/minute over a60–120s window for60s independently requests Amber. These are fictional software thresholds, not clinical limits. No diagnosis, calibrated medical probability, new model training or real astronaut data.

Case construction is now asynchronous. The original alert remains visible while knowledge is unavailable; authorized case lookup returns202 with durable pending/failed status, and acknowledgement returns409 `CASE_ENRICHMENT_PENDING` until a case can be reviewed. After recovery, existing acknowledgement and idempotent report queuing apply. Every escalation needs a fresh acknowledgement. Case completion means the existing template was built, not that an executed tool graph or expert-approved protocol was produced.

## Files and scope preservation

Runtime: `packages/contracts.mjs`; `services/anomaly/detector.mjs`; `services/api/engine.mjs`, `store.mjs`, `server.mjs`; new `services/api/enrichment.mjs`, `monitoring.mjs`, `services/agent/enrichment-worker.mjs`. `services/rag/retrieval.mjs` changes only failure-safe artifact loading/recovery; lexical matching/answers are preserved, with bounded unavailable responses at the API boundary.

Tests: new `tests/monitoring-integrity.test.mjs` (27 tests). Existing Mission Day/escalation/API tests explicitly await asynchronous enrichment. Foundation test now evaluates its sample at its actual observation time; its old timestamp was30s before the sample. No frozen scenario labels, forecast thresholds or calibration were changed to obtain a pass. Benchmark retains detector history to measure stateful rate logic. Audit probes distinguish N01/N02 fixes from open findings.

Hash comparison against the N01 manifest, before refresh: only contracts, detector, engine, server, store and retrieval changed among previously manifested runtime files. Forecast implementation/calibration, original agent-template logic, communications scheduler and every frontend/renderer source remain unchanged. No new dependencies/framework/credentials/services were introduced. Research originals and actual runtime database were not edited. Git still reports no repository; protected metadata was preserved and no commit could be made.

Documentation: FEATURE_AUDIT/E12, MASTER_PLAN, MODULE_TRACKER, SESSION_HANDOFF, AGENTS, architecture/ADR-012, model card, setup/testing/verification/limitations/runbook and this report. Full R14/R24/R37/R64 remain Partial wherever UI, baseline archives, advanced evaluation, production or physical offline gates remain open.

## Actual verification

| Command / gate | Executed result |
|---|---|
| `npm test` | **72 passed;0 failed/cancelled/skipped**,8.98s. Original45 plus27 new N02 tests. Log: `artifacts/n02-tests.txt`. |
| `npm run check` | **34 JavaScript files**,0 syntax/import errors. This is not TypeScript compilation, lint, formatting or a framework build. Those scripts/toolchains are absent. |
| `npm run evaluate` |30 frozen synthetic runs: TP10/FP0/TN20/FN0; primary drift220,230,210,220,230 mission seconds, within300s. Existing forecast regression unchanged:25 nominal synthetic windows, MAE2.167bpm, coverage96%. Not clinical/model generalization evidence. |
| `npm run benchmark` | Stateful six-crew detector p95 **0.972ms** (<50ms target); raw60-point ingest p95 **1.349ms**, approx80,775 observations/s; integrated tick p95 **26.516ms**. In-memory/in-process, nominal workload only. Valid DB/audit chain. JSON: `artifacts/n02-benchmark.json`. |
| `node docs/audit/probes.mjs` | Exit0: N01 fixes plus F01/F06/F10 repaired checks pass. F07 failed resend still reproduces; F08/F09 remain source-confirmed open findings. Not full product acceptance. |
| `ASTRA_DB=:memory: timeout 5s npm start` | Exit1: loopback listener denied `EPERM`; graceful cleanup. No server left running. |

New regressions include actual `retrieve` exception injection; corrupted corpus in an isolated project copy; real worker success/crash/timeout/busy behavior; pending/failed temporary SQLite restart; backfill; optional transaction rollback; critical job/telemetry rollback; dedup/ack safeguards; direct RAG unavailable/recovery; health startup/manual/failure/stale/DB/recovery; sparse/held/rate/direction/context/quality/baseline boundaries; canonical rate endpoint provenance. The twelve nominal synthetic crew-days and existing frozen scenario behavior still pass.

The benchmark changed from stateless fresh detector calls to retained rate history; it is not directly comparable with the old0.025ms detector baseline. It does not measure disk, HTTP/UI latency, worker cold-start latency, concurrent dashboards or FPS. Backend tests call the actual HTTP handler using the existing socket-free transport. Nine frontend workspaces still pass the unchanged stub-DOM harness; **no real browser/layout/keyboard/PWA/FPS verification occurred**. No browser automation tool is available, and the environment still denies loopback listening.

## User verification in normal WSL

Requires Node24.21+ in the Node24 line. No npm install/build/API key required.

```bash
cd '/mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI'
npm run check
node --test --test-isolation=none tests/monitoring-integrity.test.mjs
node --test --test-isolation=none tests/telemetry-integrity.test.mjs
npm test
npm run evaluate
npm run benchmark
node docs/audit/probes.mjs
```

The N02 tests exercise retrieval/crash/restart failures automatically in memory or disposable temporary copies; do not rename/delete the actual corpus/database to reproduce faults.

For an isolated manual instance, retain the directory variable in that terminal:

```bash
astra_n02_dir=$(mktemp -d /tmp/astra-n02-demo.XXXXXX)
ASTRA_DB="$astra_n02_dir/astra.sqlite" PORT=3100 npm start
```

Open **http://localhost:3100**. In a second WSL terminal:

```bash
curl --silent --show-error --include http://127.0.0.1:3100/v1/health
```

Expected healthy automatic service: HTTP200, `ready:true`, `monitoring.status:"running"`, recent host `last_success_at`, DB ready. A temporarily pending enrichment job may legitimately make overall `status:"degraded"`; after it completes, status returns`ok`. Health service readiness does not assert that every crew measurement is good.

Manual scenario:

1. Enter the local demo, select Scenario Lab → **Sleep debt + cardiac drift**. Within the documented300 mission seconds, CREW-03 should request review. Inspect detector version, signals, persistence and source evidence.
2. Let the asynchronous case appear before acknowledgement. Inspect citations/uncertainty, acknowledge once, and confirm one outbound report. Repeating acknowledgement must not create another report. Static agent-step labels remain an N16 limitation.
3. Run **Sensor dropout** and **Contradictory sensors**: crew status should become Gray. **Post-exercise recovery** should preserve cardiac context. Actual layout/controls/browser behavior still needs your verification.
4. Stop with Ctrl+C, then rerun the identical `ASTRA_DB="$astra_n02_dir/astra.sqlite" PORT=3100 npm start` command. The same database/mission resumes; pending jobs recover once due, and recovered cases still require a human acknowledgement.
5. Use the focused automated N02 suite for exact isolated-signal, rate, health failure and retrieval fault injection; Scenario Lab has no new N02 control buttons. Broader browser checklist remains in AUDIT_RUNBOOK.

The ordinary existing instance remains `npm start` at http://localhost:3000, with its preserved default database. No destructive reset is required.

## Remaining limits and approval boundary

N02 introduces no frontend health/pending-case presentation changes. F08 Earth badge and F13 stale UI remain N03; actual renderer recovery is N06. F09 executed agent tools are N16; communications resend/ground response N18; long-run retention N17/N22; dated baselines N09; advanced models N11; forecast repairs N12; full corpus/semantic retrieval/local LLM N13–N15. Production identity/privacy/security and physical offline/deployment validation remain separately tracked. Single-process durable retries are not a distributed scheduler; worker limits are not flight certification or protection against every OS/process failure.

**STOPPED after N02. No N03 or other module will begin without new explicit approval.**
