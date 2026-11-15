# N04-P01 — read-only latency review

**Historical pre-repair review.** The user subsequently approved N04-P01 reproduction/profiling and a minimal necessity-proven correction;current evidence is [N04_P01.md](N04_P01.md). The source mechanism and unapproved-work statements below describe the original read-only review and unchanged scheduler at that time. They are not a current prohibition on the narrow later authorization or a description of repaired code. Original measurements/hypotheses are preserved. N04/N03 Partial and AC-20 Open remain unchanged while mandatory acceptance evidence is incomplete.

Date:2026-10-18. Limited N04 refinement authorization permits investigation only. **No backend,SQLite,transport,monitoring or scheduling code changed. N04 Partial;N03 Partial;AC-20 Open / Unverified.** This is a diagnosis and proposed verification plan,not permission to implement N18/N22.

## What the retained measurements establish

The unchanged [original assessment](../artifacts/n04/performance-assessment.json) links both raw report/trace sets. At1× mission time,Overview standard trials had HR DOM p95 of424/499/550ms and ingestion→next complete compositor-feedback p95 of474.264/559.537/619.470ms. Performance-quality trials followed on the same growing queue:603/659/768ms DOM and641.116/693.161/807.352ms feedback. Host tick p95 rose422→765ms;broadcast p95 stayed≤2.93ms. Complete compositor feedback remained60/s in these Overview trials. The500ms latency failure is real within the recorded HR instrumentation;graphics cadence passing does not erase it.

Default30× Overview trials,also1Hz with nominal60 scalar observations/real second,had DOM p9547–50ms and next-feedback82.083–118.254ms. Those bounded successes do not waive1× stress or certify all text pixels. Quality modes ran sequentially;the higher later performance-mode latency cannot be attributed to reduced graphics quality because queue age also increased. There was no randomized crossover or exclusive CPU subfunction profile.

## Source-level mechanism and confidence

Read-only inspection of [Engine.tick/advance](../services/api/engine.mjs:147),[Comms.step](../services/comms/scheduler.mjs:21) and [Store.put](../services/api/store.mjs:69) establishes:

1. Each synchronous tick records host ingestion time,ingests/detects/snapshots,queues and processes communications,checkpoints and returns a projected snapshot inside the outer SQLite transaction. Browser broadcast follows completion.
2. Every communications step selects up to10,000 queued/in-transit JSON packets ordered by priority/rowid,parses each,and unconditionally calls Store.put even when an in-flight packet is unchanged and not due. Store.put serializes the whole record/payload and executes an UPSERT.
3. The configured one-way delay is12 mission minutes. Slower mission time retains more packets while real-time tick cadence stays1Hz. Ignoring serialization/jitter/loss,the steady in-transit residence alone suggests roughly720 ticks at1× versus24 at30×. **These are explanatory estimates,not measured queue counts.** Bandwidth serialization and queued packets can increase them.

The measured dominant delay occurs inside the server tick before UI delivery. Repeated queue scans/full-payload writes are a strong candidate for its growth. SQLite disk cost,JSON cost,detector/history work and scheduling contributions have not been individually timed;an exclusive root cause is not proven. Broadcast timing is server serialization/write-call duration,not transport receipt latency. No wire timestamp split or network trace proves zero transport delay. Existing graphics cadence and small broadcast cost argue against a dominant rendering/transport explanation but do not exclude all frontend/OS scheduling work.

## Measurement limitations and all-metric paint gap

- The historical performance-delivery driver slept1s **after** tick work;it underloaded the intended cadence. Corrected performance-clocked uses fixed host deadlines,records tick start lateness and retains the failed results. The latter is the stress evidence used above.
- METRIC_PROBE matches all six HR texts and source observation times to verified ingestion event IDs. Mutation timing measures DOM availability. A subsequent same-renderer Commit plus complete compositor feedback bounds the next committed frame;it does not prove that the particular changed text was painted. Offscreen crew can update DOM without visible paint.
- SpO2,sleep and the other scalar metrics were not performance-instrumented. Existing Overview contains HR/SpO2/sleep;Crew Health exposes its existing six metric tiles and four selectable histories. A source event unavailable in an existing workspace cannot be certified by pretending that a hidden DOM node or fabricated screen exists.
- Screenshot completion includes capture/encoding/CDP overhead. A correctly sourced visible text capture completed within500ms can provide a conservative upper bound for that sample;if capture exceeds500ms,it alone cannot locate the presentation failure. The earlier2345ms capture p95 is not a text-presentation measurement.
- This refinement preserves renderer lifecycle,animation cadence,assets and backend bytes. The retained stress traces predate every refinement. Therefore the refinement cannot have caused that historical overrun. Fresh reference trials separately assess current graphics/HR behavior;they do not repair or close the old stress gate.

## Smallest safe next steps — approval boundaries

Fresh post-refinement12 warmed reference trials are recorded in [N04_REFINEMENT.md](N04_REFINEMENT.md) and its new assessment. Default30× Overview HR DOM p9547–54ms and next-feedback101.281–120.350ms remain bounded below500ms,with host tick p95 approximately40.4–43.3ms. The performance-quality next-feedback sample is15–22ms slower than the earlier default30× set;non-randomized sequential runs cannot establish causation. The old1× failing traces predate this pass;they remain the outstanding stress evidence. No all-metric/text-specific paint certificate or backend repair resulted from the new graphics trials.

| Work | Scope / authorization |
|---|---|
| Reanalyse retained traces;compare current DOM/canvas/card counts and fresh named-device graphics trials | Evidence-only or authorized N04 QA. Preserve raw failures,clock rate,visibility,source hashes and all samples. No backend edit needed. |
| Extend isolated browser instrumentation to each **actually displayed** metric/event ID,record SSE receipt→DOM→visible geometry and text capture/paint correlation | N04 evidence work can be separately requested without application/backend changes. Establish observation-time/quality/role expectations first;do not conflate10 produced metrics with10 displayed tiles. Use separate viewport/crew trials so all tested texts are genuinely visible. Current pass does not claim this certificate. |
| Profile bounded queue workloads at1× and30× on identical disposable disk DBs;record queue counts/bytes and per-phase server timings | Backend profiling/measurement instrumentation should be explicitly approved,proposed N22/N18 ownership. Keep uninstrumented reference comparison;no normal runtime DB. |
| Skip persistence of unchanged in-flight packets;write only actual send/retry/failure/delivery state transitions | Smallest candidate backend repair,**not implemented or authorized by this pass**. Preserve atomic outer transaction,rollback of scheduler cursor,ordering/priority,bandwidth,jitter/loss,dedup,delivery timestamps and human-ack safeguards. Verify rather than assume equivalence. |
| Due-work queries/indexes or transport/scheduling redesign | Consider only if profiling after the minimal repair still requires it;separate documented decision/approval. Never downsample,drop alerts,shorten mission delay or relax thresholds to pass. |

After any approved backend repair,run N01 imported ownership/out-of-order/privacy/rollback tests,N02 independent alert/enrichment/restart/dedup tests and communication priority/bandwidth/loss/blackout/reopen/ack/received-only tests. Repeat three warmed60s Overview trials per active graphics profile at1920×1080 for both1× stress and default30×;record nominal60 scalar observations/real second and exact backlog history. Require telemetry-to-UI p95<500ms with a stated visible text-evidence definition,API p95<200ms and no cadence/health regression. Minimum judge designation and N06/N26 AC-20 evidence remain separate mandatory gates.

The roadmap and dependency ordering are unchanged. A proposed N22/N18 repair cannot begin from this review;the user must approve its scope and any earlier dependency scheduling explicitly.
