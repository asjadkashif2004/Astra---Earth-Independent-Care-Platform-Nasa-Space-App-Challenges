# N02 monitoring, Tier A and enrichment contracts

**Sleep producer compatibility note2026-10-23:** [SLEEP_SESSION_CONTRACT](SLEEP_SESSION_CONTRACT.md) replaces per-tick sleep noise with held completed-session observations and explicit correction revisions. N02 detector source,thresholds,windows,quality gates and human acknowledgement safeguards are unchanged. Repeated snapshots retain the same sleep event ID/time and cannot accrue fresh persistence evidence. A daily record uses the existing declared-cadence freshness rule;old completion bounds freshness even if correction observation time is newer. Missing/poor-quality sleep stays unavailable. This repair does not introduce sleep-specific clinical or cumulative-deficit inference. Newly executed focused monitoring/ownership/ack regressions and boundaries are in [SLEEP_LIFECYCLE_COMPLETION](SLEEP_LIFECYCLE_COMPLETION.md);original N02 results below remain historical.

Approved scope: F01/F06/F10; research R14/R24/R37/R64 monitoring portions. Native Node 24/SQLite architecture retained. No frontend, forecast, semantic retrieval, advanced model or full agent implementation. These are software heuristics for fictional synthetic telemetry, not clinically validated limits or flight-qualified monitoring.

## Tier A — robust-personal-v2

Inputs are quality-checked scalar values, personal baseline center/scale/version, activity and actual observation timestamps. No scenario labels, seeds, diagnoses, retrieval results or language models drive classification. Baselines remain the existing frozen median / (1.4826 × MAD with scale floor); their supposed 30-day archive remains a simulator limitation for N09.

`z = (value − personal median) / personal robust scale`, rounded to nine decimal places for stable threshold comparisons; rate comparison allows1e-9 arithmetic tolerance. These numerical tolerances are far below source precision, not new clinical thresholds. Both directions are considered for HR, HRV, SpO₂, respiratory rate, temperature, sleep duration, fatigue and reaction time. Exercise and radiation retain their existing separate treatment; this module introduces no environmental/illness classifier.

| Rule | Threshold and window | Output |
|---|---|---|
| Multisignal | At least two distinct metrics continuously at absolute z ≥2 for ≥90 observation seconds | Amber, human review |
| Single signal | One metric continuously at absolute z ≥4 for ≥120 observation seconds | Amber, human review |
| Multisignal high priority | At least two metrics each continuously at absolute z ≥4 for ≥180 observation seconds | Red, high-priority human review |
| Single high priority | One metric continuously at absolute z ≥6 for ≥180 observation seconds | Red, high-priority human review |
| Rate | Absolute endpoint slope ≥3 robust-scale units/minute, persisting ≥60 observation seconds with a consistent slope direction | Amber, human review; rate alone never Red |

Rate needs at least three distinct observations in a bounded 120s history. The starting endpoint is the most recent observation at least 60s before the current one, hence a 60–120s window. Slope is `(z_end − z_start) × 60 / elapsed_seconds`. History is coalesced to roughly one point per second (retaining endpoints), capped at256 entries/channel. Sparse streams without sufficient rate evidence abstain from that rule; deviation rules still apply. An isolated spike or plateau must not accrue a persistent rapid trend.

Each magnitude has its own continuous timer. Falling below its threshold, changing sign, source/device change, baseline version change, context exclusion, backwards observation time or an excessive observation gap resets the relevant history. N01 canonical streams allow gaps up to max(5s, three declared sampling periods); standalone simulator evaluation without canonical observations uses90s. Detector-v1 pending timers are discarded on upgrade. Re-evaluating held samples cannot advance persistence or rate history. Source quality/provenance/timestamps remain unchanged.

Any missing/non-finite/out-of-range required scalar, invalid/missing baseline, aggregate confidence below0.7, missing/suspect/artifact quality, unverified canonical source or stale/future/invalid observation produces Gray, no medical review event, and cleared pending history. Canonical per-channel quality also gates inference. Exercise/recovery excludes HR/HRV/RR resting rules, including their rate history; other measured domains remain eligible. There is no learned sensor-fusion model.

Green means no qualified review rule at this evaluation. A deviation still accumulating persistence says “Deviation observed — review persistence threshold not yet met”; it does not claim the observation is normal. Nominal readings use “Within expected personal pattern.” Gray is never healthy. Red is a priority in this research simulation, never a disease conclusion.

Evidence includes metric/unit/value, baseline center/scale/version, signed deviation, direction, matching rule names, separate persistence durations, rate/window/persistence, detector version and uncertainty. Engine persistence adds N01 canonical event/time/source/provenance; rate evidence also resolves the start event's value/unit/source/provenance/quality from raw telemetry. No scenario label participates in detection. Risk `diagnosis` remains null. Evidence strength remains `min(0.92, 0.65 + 0.045 × contributing evidence count)` for a qualified review, null otherwise: **uncalibrated heuristic, not medical probability**.

## Critical transaction and optional worker

The existing critical SQLite transaction still commits scalar observations, ownership/order/provenance, detector state, original risk, durable enrichment job, history, immutable sequenced Earth packet, comms state and audit/checkpoint together. Any critical write/queue/audit failure still rolls the entire operation back, including in-memory state and scheduler position. Enrichment runs only after this commit and has no database handle or acknowledgement token passed to it.

Schema version2 additively creates `enrichment_jobs`: risk ID primary/foreign key, status, due host timestamp and JSON metadata. Existing tables/records are preserved. Startup backfills jobs for legacy risks lacking both case and job, without a capped1000-row search. Recovered telemetry is re-evaluated without manufacturing observations or advancing mission time. Risk deduplication uses the current crew/run query without the old1000-record cap.

Job states are `pending`, `failed`, `complete`. Metadata persists attempt count, last attempt, bounded public error code, next attempt and completion timestamps. Dispatch is persisted before optional work, with a2s retry lease. A crash during work leaves a durable pending job. One local engine processes at most six due jobs per pass, serially; concurrent dispatch requests share one promise. This is a single-process local scheduler, not a distributed lease protocol.

Default case construction executes in a Node worker thread, with a2s wall-clock timeout, 64MiB old-generation limit and4MiB stack limit. Error, early exit, invalid output or timeout becomes `CASE_ENRICHMENT_FAILED`; raw exceptions, secrets and stacks are not stored/exposed. Each task uses a fresh worker, trading cold-start overhead for simple fault recovery and refreshed corpus loading. Node API reference: [worker_threads](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html). Worker resource limits are not an operating-system security sandbox or a guarantee against every process-level failure.

Completed case/job/audit commit in a separate transaction. Partial optional writes roll back; original telemetry/risk remain committed. Storage failures leave the durable job retryable and mark enrichment degraded. Retry delay after a recorded failure is1,2,4,8,16,32,60 seconds, then60s, using host time. Retries continue at that bounded cadence; no fabricated successful case/citations are substituted. The automatic1s server timer dispatches work at startup/after ticks; successful API imports also request dispatch without awaiting enrichment. Shutdown cancels the active worker and leaves unfinished work for restart. A direct domain Engine consumer must call/await `enrichPending()` after committed ticks/imports, then `close()` before closing its store.

Case identity remains `CASE-<risk-id>` with a UNIQUE risk relationship. Existing cases, acknowledgements and report IDs are never overwritten by retry. Optional output cannot set human acknowledgement, message identity, or transmission state. Escalation creates a distinct risk/job/case and requires a new human acknowledgement. No job automatically sends a report.

Acknowledgement while case enrichment is unavailable returns409 `CASE_ENRICHMENT_PENDING`, leaving the original alert open. After recovery, existing human acknowledgement and idempotent report queuing apply. This conservative policy avoids acknowledging a case the person could not review. It is not a new agent workflow or resend implementation.

## API and health contract

- `POST /v1/agent/cases` preserves200 with the existing case when ready. If an authorized existing risk has no case yet, it returns202 `{risk_event_id, case:null, enrichment:<durable job>}`. Missing/invented detector events retain422. Existing role/self restrictions apply.
- `POST /v1/rag/query` preserves its existing lexical supported/abstained/redirected answers. Resource exceptions return503 `KNOWLEDGE_UNAVAILABLE`, with a bounded review message. This is failure handling, not a new retrieval algorithm. Missing/corrupt source files no longer prevent core startup; failed corpus initialization and metadata synchronization are retried. No invented citations.
- `GET /v1/health` is public and has no crew IDs, measurements, private check-ins, raw exception text or credentials. It performs a current DB read probe and reports recent successful critical monitoring work, not a hardcoded readiness claim. It does not advance simulation to probe health.

Health response fields:

| Field | Meaning |
|---|---|
| `live:true` | This process handled this request. A dead/hung process requires an external watchdog; it cannot answer health. |
| `ready` | DB readable and monitoring `running` or explicitly `manual` |
| `status` | `ok`; `degraded` if monitoring ready but optional knowledge/enrichment unavailable or pending; `unavailable` if critical readiness fails |
| `database` | `ready` or `unavailable`, based on an actual current query; recent successful critical writes are represented by monitoring progress |
| `monitoring.status` | `starting`, `running`, `manual`, `failed`, `stale`, or `unavailable` |
| `monitoring.automatic` | Whether the1s automatic timer is enabled; `autoTick:false` is explicit manual/test mode |
| `monitoring.last_success_at`, `last_failure_at` | Host UTC timestamps; no crew medical data. Startup evaluates recovered detector/store state; later ticks refresh success. |
| `monitoring.failure_count`, `consecutive_failure` | Cumulative failed attempts in this process and active-failure boolean. A successful critical tick clears the boolean, retaining count/time. |
| `monitoring.age_ms`, `stale_after_ms` | Host elapsed age of last success; automatic monitoring becomes stale above5000ms, regardless of mission acceleration |
| `enrichment.status`, `pending`, `failed` | Aggregate optional-work status/counts; complete means template construction committed, not expert-approved evidence or a full executed tool graph |

HTTP200 applies when critical monitoring is ready, including optional degradation. HTTP503 applies to starting/failed/stale/unavailable critical monitoring. Storage/monitor failures cannot be cleared by a successful optional retrieval. An ingestion storage error also marks core failure; rejected invalid/replayed inputs do not. A later successful critical tick restores core readiness. Manual mode reports its actual age and does not claim an active automatic scheduler. Health is service readiness, not a claim that every crew measurement is fresh/good; stale measurements independently become Gray.

## Deferred boundaries

N03 browser/UI health text and pending-case presentation are unchanged; use API response/health for the new contracts. F09 static agent steps remain N16. Forecasting N12, advanced anomaly evaluation N11, semantic/full-corpus/local-LLM N13–N15, communication resend N18, renderer recovery N06 and physical offline/browser proof N17 remain separate. Tests are software/synthetic evidence only. This module does not make the full research system complete.
