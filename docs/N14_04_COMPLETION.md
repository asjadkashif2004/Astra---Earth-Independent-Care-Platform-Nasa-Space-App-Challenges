# N14-04 — lexical-first hybrid diagnostic

Delivered 2026-10-25 under the owner's explicit bounded research approval and the recorded [DE-N13-N14-01 continuation](DE_N13_N14_01.md). **This task is delivered and stopped; N14 remains In Progress, not Complete.** N07/N13/N09 remain In Progress, N04 Complete, N05/N06 Deferred, N03 Partial and AC-20 Open / Unverified. No production ranking or N14-02 claim behavior changed.

## Frozen experiment and reproducibility

The [plan](N14_04_PLAN.md), [machine specification](../data/research/n14-04/spec.json) and [input/code freeze](../artifacts/n14-04-20261025/replay/input-freeze.json) preceded hybrid scoring. Raw specification SHA-256 `2a7bfd4910fcdb79bfc8cd75f5a17bf9dc402e0a96a35f60ae77121e9daec64b`; canonical specification SHA-256 `504bec475aa5530eefd1f656765a3126c843c8ce2501ba48d23a191d6016ca8c`. Two policies, one execution, no parameter search or post-result policy edits:

1. **Lexical-weighted reciprocal-rank fusion:** `2/(60+rLex) + 1/(60+rSem)`, absent-list contribution zero. Ties use lexical rank, semantic rank, then unit ID. Since `2/65 > 1/61`, every saved lexical top-five unit survives; fusion can reorder these units.
2. **Append-only semantic rescue:** preserve the entire lexical prefix/order, append unseen semantic IDs until five results. Existing baseline top-three and top-five evidence cannot be displaced.

Only saved top-five lists from unchanged N14-01 rich lexical and N14-03 MiniLM are available. Unknown tails/scores are not invented; this is not full-depth fusion. All 40 questions are seen/tuning data; their 40 independent scientific/medical decisions remain pending. No fresh holdout or clinical performance is claimed. The rich lexical figures describe the existing **33-excerpt research comparator**, not a new measurement of the running application's separate prototype retriever.

## Results and regression analysis

Macro recall averages exact unchanged provisional expected-unit sets over 32 supported/partial cases. Eight unsupported cases have no fabricated positive recall denominator. Wins/losses/ties compare each question with rich lexical; tied recall can hide exchanged evidence, so exact gained/lost IDs are separately recorded.

| Pipeline | Recall@3 | Recall@5 | @3 wins / losses / ties | @5 wins / losses / ties |
|---|---:|---:|---:|---:|
| Saved rich lexical baseline | 83.33% | 94.27% | — | — |
| Saved matched MiniLM, historical comparison | 78.65% | 81.25% | See N14-03 | See N14-03 |
| Frozen lexical-weighted RRF | **91.67%** | **95.31%** | 5 / 2 / 25 | 1 / 0 / 31 |
| Frozen append-only rescue | **84.38%** | **95.31%** | 1 / 0 / 31 | 1 / 0 / 31 |

Both hybrids satisfy the bounded **zero per-question top-five expected-unit loss** diagnostic. Neither establishes unseen generalization or satisfies the original held-out semantic-benefit gate. Both top-five gains are the same P08 vacancy rescue; no alternative passage was promoted to an expected answer.

| Case | Weighted fusion @3 versus lexical | Exact expected unit gained/lost |
|---|---|---|
| P01 | Improved 1/2 → 2/2 | Gains `sleep-causation-limit` |
| P02 | Improved 0/2 → 1/2 | Gains `phase-measurement-gap` |
| P07 | Regressed 3/3 → 2/3 | Loses `circadian-light-requirement` from top three; retained at five |
| P08 | Improved 1/3 → 2/3 | Gains `scheduling-research`; also the only @5 gain for both hybrids |
| S09 | Improved 0/1 → 1/1 | Gains `ground-sleep-performance` |
| S10 | Improved 0/1 → 1/1 | Gains `inertia-definition` |
| S22 | Regressed 3/3 → 2/3 | Loses `lighting-agenda` from top three; retained at five |

All other 25 positive cases tie weighted fusion at three; append-only ties 31 and improves P08 only. All cases, rankings and exact identifiers are in [raw per-question records](../artifacts/n14-04-20261025/replay/raw-rows.jsonl) and [results](../artifacts/n14-04-20261025/replay/results.json). No oracle selection is used by either ranker.

Remaining top-five misses for both hybrids: P04 `flight-performance-limit`, P05 `personalization-agenda`, P08 `inertia-variability`, S08 `performance-measurement-limit`. P04's desired semantic result is too deep to fit the available vacancies; P05/P08 miss expected evidence in both saved lists; S08's full lexical list prevents replacing a lower-value lexical candidate. This illustrates the deliberate tradeoff in baseline protection. P07/S22 show role/qualifier-sensitive top-three losses despite valid citations. These are errors relative to provisional expectations, not proof that all differently ranked passages lack relevance; rejudging them requires actual independent review.

Unsupported U02/U03/U04/U06 gain candidates; notably U04's drug/dose/treatment request changes from zero lexical candidates to five hybrid candidates. This is **not accepted treatment support**. U05 remains blocked/empty in both saved lists. Candidate generation does not perform medical assessment; no unsupported-claim acceptance rate or new abstention accuracy is claimed here. The unchanged N14-02 contract accepts only complete, canonically bound literals, rejects invalid bindings/altered assertions and abstains on unverified paraphrases. Old N14-01 16/16 claim rejection remains non-diagnostic.

## Citations, QA and measured resources

All 33 canonical units/34 original-bound spans validate. Across both outputs, **390 unit/role bindings and 398 span references pass, zero invalid**. Source hashes, page/section/chunk/range IDs and canonical roles remain attached through a shared catalogue. Rich lexical's historical winning span was not saved; all canonical spans are retained with that uncertainty explicit. Known semantic winning window IDs are preserved. A location-only table context remains location-only; relevance cannot authorize a numerical or clinical conclusion.

Executed **44/44 focused tests** (11 new hybrid + 33 unchanged claim tests), no skips/failures, plus **128-file syntax/local-import check, zero errors**. QA independently checks arithmetic, malformed/duplicate IDs, fixed-policy hashes, deterministic baseline containment, prefix preservation, vacancies, top-three regressions, tied-recall swaps, denominator handling and canonical bindings. Existing claim positive/negative/abstention and reject-everything/accept-everything controls pass. These tests do not rerun or approve the old provisional claims. [Test log](../artifacts/n14-04-20261025/focused-tests.txt), [syntax log](../artifacts/n14-04-20261025/syntax-check.txt), [independent offline verification](../artifacts/n14-04-20261025/offline-verification.json).

Named host: AMD Ryzen 5 7430U, Linux x64 WSL2 `6.18.33.2-microsoft-standard-WSL2`, Node 24.21.0, glibc 2.43. One bounded offline replay, not a repeated performance benchmark:

| Measurement | Observed |
|---|---:|
| RRF replay-function p50 / p95 | 0.035 / 0.094 ms |
| Append-only replay-function p50 / p95 | 0.010 / 0.055 ms |
| RRF / append-only total ranking time, 40 each | 2.027 / 0.755 ms |
| Input/citation preparation | 182.13 ms |
| Run elapsed before final result serialization | 539.91 ms |
| Node `getrusage` high-water RSS counter | 628,428,800 bytes, below 1 GB; not model-inference memory |
| Five CLI evidence files | 544,190 bytes total; largest 225,326 bytes |
| Model/runtime acquisition, installations, new inference, embeddings/index construction | Zero |

Function timings exclude source loading, citation checking and persistence and **are not live end-to-end query or inference latency**. The resource counter is a high-water counter, not a sampled RSS series or newly observed model memory. No native ONNX/CUDA libraries were mapped. No model/probe directory or expired Choice B policy was used. CLI bounds: 15 seconds, 2 MB/file, 8 MB total and 1 GB process RSS; actual output remains below all limits. No hard storage-quota claim follows from bounded report writes.

Independent offline checks match raw rows, formulas, metric arithmetic, frozen code/inputs and catalogue roles. **565 existing files and original group memberships match their pre-task hashes**: corpus/publications/reviews, N14-01 index/vectors/E31, E32/E33 evidence, application/packages/knowledge, all existing service files, package manifests, old scripts/tests and N14-02 contract. Preservation includes old ranking code. Historical N04 evidence and runtime databases were not accessed or altered; no production dependency or QA browser change. The only service addition is the isolated hybrid diagnostic.

## Files, reproduction and next decision

New implementation: [hybrid-diagnostic.mjs](../services/research-retrieval/hybrid-diagnostic.mjs), [offline CLI](../scripts/n14-hybrid-diagnostic.mjs), [focused tests](../tests/hybrid-retrieval.test.mjs), [frozen specification](../data/research/n14-04/spec.json). New evidence lives only under `artifacts/n14-04-20261025/`; governance/plan/completion/tracker/handoff updates record this bounded delivery. No dependencies added or changed.

[Documentation consistency check](../artifacts/n14-04-20261025/documentation-check.json): 12 updated Markdown files, 473 local links resolved, balanced fences, all 26 original module IDs retained, unchanged frozen specification and no full-module status promotion. Its document list records every planning/governance file changed. Initial checker-only URI/format parsing assertions were corrected before this final pass; no application defect or evidence change was involved.

To inspect accepted diagnostic evidence without inference:

```bash
python3 artifacts/n14-04-20261025/verify.py
node --test --test-isolation=none tests/hybrid-retrieval.test.mjs tests/claim-assessment.test.mjs
```

The CLI is reproducible with `node --max-old-space-size=256 scripts/n14-hybrid-diagnostic.mjs --output=NEW-EMPTY-DIRECTORY`; it refuses evidence overwrites. Future execution still follows task approval and filesystem permissions; this command does not renew any native-runtime permission.

**Recommendation: retain lexical operationally; continue bounded hybrid evaluation only after separate approval.** Prefer append-only as the least disruptive prospective candidate: it preserves lexical order and has no observed per-question regressions, but its gain is just one seen case. RRF's higher seen recall comes with two top-three losses; neither policy is promoted. The [fresh-evaluation protocol](N14_04_FRESH_EVALUATION.md) requires new questions authored without the inspected benchmark, actual independent evidence review, a policy frozen before fresh evaluation, positive and unsupported/ambiguous cases, and explicit execution/resource approval. This task creates no fresh questions or reviewer approvals.

Full N14 gaps remain: full N07/N13 prerequisites and evidence approval, independent numerical parity, fresh frozen evaluation, useful independently verified paraphrase/conflict support, integration/offline/release acceptance and all N15/N16 gates. No clinical support or autonomous recommendations. **STOP for explicit approval; no further experiment or module starts automatically.**
