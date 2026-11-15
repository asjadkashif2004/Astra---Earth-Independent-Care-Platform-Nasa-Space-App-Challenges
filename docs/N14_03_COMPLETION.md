# N14-03 — matched-input retrieval diagnostic

Delivered2026-10-25 under explicit experiment approval and the separately renewed Choice B for this task only. **N14 remains In Progress; this bounded task is delivered and STOPPED.** N07/N13 In Progress,N04 Complete,N05/N06 Deferred,N03 Partial,AC-20 Open / Unverified. No hybrid ranking,N15/N16 or application integration.

## Frozen experiment and integrity

[Plan](N14_03_PLAN.md), [machine specification](../data/research/n14-03/spec.json) and [input/code freeze](../artifacts/n14-03-20261025/input-freeze.json) precede inference. Canonical specification SHA256 `29009fb291878af7147add3471fa3bf9d54c6bab8d6fdd3e9056d67b9743b4fc`; raw specification SHA `39ddbfc2396e1ee9aa9e9d90e003376e1674557b521fc2da8b51fa22dbffb89b`. One representation, query order and ranking policy; no post-result tuning.

Both methods receive the **same exact full span text**,34spans/33unchanged curated NASA units. Keys, titles, source context, roles, limitations, version and expected answers are absent from scoring inputs. Metadata remains attached only for identity/provenance. Lexical uses the existing distinct lowercase-term/stop-list preprocessing and one point per matching term; semantic uses the unchanged pinned MiniLM/WordPiece/mask-pooling/L2 encoder and cosine. Both rank all windows without score cutoffs, break ties by window ID and deduplicate by maximum unit score. Raw zero/negative candidates are diagnostic, not support.

Existing span-only document vectors were reused: **0document embeddings generated**. The same40existing question strings run in fixed ID order; all are explicitly **seen/tuning**, including the formerly held-out16. Two fixed sentences warm the encoder;39questions are encoded, while the existing safety guard blocks U05identically for both methods. No question/expectation relabeling. Source text windows remain whole; queries have11–23tokens, below the unchanged256limit.

The local preflight reverified30cached package SRIs, exact versions and **992installed members**, plus all7model/support originals totaling23,918,447bytes. Runtime ORT1.21.0/common1.21.0/tokenizers0.2.0 and exact MiniLM revision751bff37182d3f1213fa05d7196b954e230abad9 remain unchanged. No downloads, install, model substitution or fresh network advisory lookup; prior security/license findings remain point-in-time. All research/model notices and attribution remain preserved.

## Recall results — seen questions only

Macro recall averages the unchanged expected evidence-unit sets over32supported/partial provisional cases;8unsupported cases have no fabricated positive recall denominator. None of these expectations has gained independent scientific/medical approval.

| Pipeline / same32positive seen cases | Recall3 | Recall5 |
|---|---:|---:|
| Original asymmetric lexical: metadata+text |83.33%|94.27%|
| Original asymmetric MiniLM: text only |78.65%|81.25%|
| Matched span-only lexical |64.58%|74.48%|
| Matched span-only MiniLM |78.65%|81.25%|

Semantic scores higher than text-only lexical on this fixed diagnostic, but **the original metadata-rich lexical baseline remains stronger than semantic**. This does not establish superiority over the operational baseline or unseen generalization. The historical comparison also changes cutoff policy (old lexical≥3/semantic≥0, new raw top-k); it is **not a pure causal metadata ablation**. The result supports complementary retrieval behavior, not automatic deployment or hybrid adoption.

The83.33%/94.27%historical figures belong to N14-01's same33-excerpt research lexical adapter. They are not a fresh measurement of the application's separate prototype lexical retriever, which was not run or changed in this task.

All40semantic top-five unit rankings match the original run exactly. Minor last-bit floating-point aggregate differences arise from summing in the new fixed question order, not changed ranks. The formerly held-out16are now seen: original lexical79.49%/94.87%,matched lexical66.67%/74.36%,semantic75.64%/79.49%. These are historical-cohort descriptions, never a fresh holdout.

At3:semantic wins7cases,lexical wins4,ties21. At5:6wins each,ties20. At3,semantic retrieves useful expected units missed by text-only lexical for S04(flight-inertia gap),S08(performance-measurement limits),S09(ground sleep-performance),S10(inertia definition),S14(workload definition),S17(measurement agenda),P01(sleep observation). Lexical does better on P04,P05,P08,S19. P02,P07,S22can recover different relevant fragments despite tied recall, showing complementarity without executing a fusion algorithm.

Persistent misses include P03's formal sleep-accommodation requirement and S02's sleep observation for **both** methods. P08's multi-evidence nap/inertia scope is incompletely covered; S19still misses the formal requirement semantically. Numerical ranking relevance does not validate an answer, its qualifiers or clinical applicability. There are17zero-score lexical candidates among195returned lexical candidates; these arbitrary tie-ranked candidates must not be presented as supported findings.

[Full results](../artifacts/n14-03-20261025/results.json), [readable unit-key diagnostics](../artifacts/n14-03-20261025/named-diagnostics.json), [raw query inputs/encodings/vectors/ranks](../artifacts/n14-03-20261025/raw-queries.jsonl). **N14-01's original benefit gate remains NOT MET.** No held-out improvement or clinical claim is made.

## Measured execution and resources

Named host:AMD Ryzen5 7430U with Radeon Graphics,Linux x64 WSL2,Node24.21.0,glibc2.43. Native inference CPU-only/two intra-op threads,sequential. One run,not a statistical latency study or judge-hardware certificate.

| Measurement | Actual |
|---|---:|
| New model/runtime/network acquisition |0bytes;0msnetwork |
| Local integrity preflight |1366ms |
| First model-session load |212.92ms;filesystem cache warmed by verification |
| Native worker elapsed |850.57ms |
| Evaluation phase incl persistence/checks |368.76ms |
| Supervised preflight+experiment elapsed |3607ms |
| Warm lexical p50/p95 |0.22/0.90ms |
| Warm semantic incl query embedding p50/p95 |3.03/5.76ms |
| Both methods+candidate checks p50/p95 |3.96/9.05ms |
| Native worker peak RSS |192,090,112bytes |
| Local preflight peak RSS |21,680,128bytes |
| Separate aggregate cgroup peak |523,374,592bytes |
| External observer /proc high-water RSS |14,626,816bytes |
| Observer getrusage high-water counter |628,428,800bytes;retained separately,not model RSS |
| Maximum sampled counted storage at run end |436,043,776bytesallocated |

Latency uses39encoded queries and excludes the blocked query and raw-record fsync latency from per-query percentiles; aggregate evaluation time includes persistence/checks. It is not telemetry-to-UI,physical-display or clinical-response latency. Semantic maximum16.67ms,combined maximum21.11ms. No phase deadline/resource ceiling was reached.

Fresh disk-backed scratch `/var/tmp/astra-n14-03-j5nz1ApE` was the only writable sandbox directory. ASTRA and reused runtime/model directories were read-only. Kernel network namespace had no external route; JS network attempts0. External observer sampled storage/process RSS at500ms and maintained a heartbeat;6durable samples retained. Counted resources include scratch,reused runtime/cache/archives,old model-task directory,corpus/research inputs,N14evidence and retrieval code. An additional900MBaggregate cgroup guard and zero swap were separate from1GBprocess RSS. Choice B monitors1.5GBwith1.35GBstop and acknowledged possible overshoot; **not a hard quota**. Final materialized copies are counted separately in closure evidence. No prior task's expired policy was silently reused; this renewal expires with N14-03delivery.

## QA, files and preservation

**66focused tests PASS**,0fail/skip:11new matched-input tests plus55existing claim/retrieval checks. They cover fixed policy rejection, identical text views, metadata invariance, hash/row corruption,40seen-question identity, distinct-term scoring, raw zero/negative scores, deterministic ties, best-window unit deduplication, common safety guards, macro metrics and failure diagnostics. **125JavaScript files checked,0errors.** Three isolated Python scripts parsed before execution. No browser/full application suite.

Offline validation of immutable outputs passes:40raw records,39finite normalized384-dimensional query vectors,390recorded scores independently recomputed from saved vectors/text,390valid candidate citation checks,0invalid; frozen inputs and implementation hashes match. This recomputation generated no new embeddings or rankings and is not independent model parity. **MiniLM numerical parity remains UNVERIFIED.** N14-02claim support/paraphrase behavior was not invoked or modified; its original16/16legacy metric remains non-diagnostic.

New implementation files only: `services/research-retrieval/matched-experiment.mjs`, `scripts/n14-matched-experiment.mjs`, `tests/matched-retrieval.test.mjs`; plus frozen `data/research/n14-03/spec.json`, isolated supervision/preflight scripts saved in evidence and relevant docs. No application/package/lock/old CLI/ranking/claim-contract modification. [Preservation](../artifacts/n14-03-20261025/preservation-after.json):539existing file contents/group membership match,including original corpus/index/vectors,N14-01/02evidence,all old services,app/packages/knowledge,old scripts/tests and N14-02contract. No runtime database or protected Git/config modification; no usable Git commit mount. Historical N04evidence is untouched; no fresh browser-certification claim.

Safe non-inference verification from the project:

```bash
node --test --test-isolation=none tests/matched-retrieval.test.mjs tests/claim-assessment.test.mjs tests/research-retrieval.test.mjs
```

Results/specification/raw evidence can be inspected offline. The native runner requires its supervisor and separately approved resource policy; do not automatically rerun inference or overwrite outputs. Original model/index/evidence were never rewritten.

## Decision and next recommendation

Keep the original lexical-first baseline. Complementary cases justify a **separately approved read-only hybrid-design/evaluation plan**, not automatic hybrid implementation. Such a plan must predeclare candidate/ranking rules and genuinely fresh evaluation policy before any new promotion claim; it cannot recycle the now-seen40as untouched. Independent numerical parity,scientific/medical review and full N07/N13/N14/integration/release requirements remain open. No N15/N16 or Health Agent integration. **STOP and wait for owner approval.**
