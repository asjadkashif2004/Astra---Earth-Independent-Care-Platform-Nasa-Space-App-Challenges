# N14-03 — frozen matched-input tuning experiment

Executed delivery: [N14_03_COMPLETION](N14_03_COMPLETION.md). One run complete; machine specification remained unchanged. N14 In Progress; task-specific approval exhausted; STOP. Original pre-result plan below is retained.

Owner approved the bounded experiment and separately renewed monitored Choice B for N14-03 only on2026-10-25. [Machine specification](../data/research/n14-03/spec.json) is frozen **before any new query embedding/results**. One policy, no parameter search, model substitution or hybrid ranking. N14 In Progress; no app/clinical/N15/N16 use. The N14-02 claim contract is immutable in this task.

## Identical information

Both methods receive exactly `anchor.text` from each of34whole spans representing33unchanged curated NASA units. Exclude keys, titles, source-context labels, roles, limitations and answers from scoring. Preserve that metadata separately for provenance only. This representation reuses the existing verified span-only document vectors; it needs no document re-embedding/new corpus/index. Inputs fit the unchanged256-token encoder contract; do not silently truncate. The lexical view and semantic-vector row must have the same window ID and exact text hash.

Query inputs are the unchanged40existing questions, listed in fixed ID order in the specification; all are seen/tuning data. Two fixed non-evaluation sentences warm the existing CPU encoder. Existing query guards apply identically. Lexical tokenization retains the existing stop list/lowercase/distinct-term behavior; semantic tokenization/pooling/normalization stay unchanged. Algorithms necessarily encode text differently; neither receives extra contextual fields.

Rank lexical by one point for each query term present in span text; semantic by exact cosine dot product. Both return raw top-k without score cutoffs, break ties by existing window ID and deduplicate by maximum score per unit. Zero lexical overlap or negative semantic similarity is allowed in diagnostic rankings and never implies evidence support. This removes asymmetric relevance thresholds, but means comparison to N14-01 changes both information fields and threshold policy; **not a pure causal ablation of metadata alone**. Production algorithms and N14-01 rankings remain unchanged.

Report macro recall3/5 over the unchanged32positive provisional references, per-case wins/losses/misses and candidate IDs/scores. Unsupported8questions have no positive recall denominator; do not claim clinical answer accuracy. Compare historical saved asymmetric rows without rerunning them. Old24/16cohorts may be shown only as previously defined, now-seen cohorts; no untouched holdout, clinical validity, entailment or generalization claim. Keep independent numerical parity Unverified.

## Execution and resource gates

Fresh disk-backed scratch; reuse approved ORT1.21.0/tokenizers0.2.0 and exact pinned MiniLM revision from preserved local directories. Reverify cached runtime archives/installed members and model/index hashes before inference; stop on mismatch. No network acquisition/install/retry. Namespace-denied networking plus existing JS guard, CPU only/two threads/sequential. Record raw query vectors/encodings/ranks incrementally before summary. Freeze specification, input representations/query set and implementation hashes before inference.

Monitored1.5GB with1.35GBstop, overshoot risk acknowledged for this task only. Count fresh scratch, reused runtime/cache/archive directory, reused model-task directory, existing corpus/research/evidence resources and new code/report copies. External durable observer samples disk and per-process RSS at500ms; preserve failure state. Additional900MBaggregate cgroup guard is separate from1GBper-process RSS. No package/model/temp storage on tmpfs. Reuse existing sandbox mechanisms; request supported escalation for external writes/processes. Guard query5s/evaluation180s/overall300s; no automatic retries after a failed run. Network acquisition remains0; other acquisition ceilings unchanged.

## Focused QA and delivery

Verify identical text-only views, metadata invariance, source/row hashes, stable ties and unit deduplication, zero-score labeling, unchanged provisional expectations, raw-result persistence, metrics and corruption rejection. Run focused existing retrieval/claim regressions and syntax/import checks. No broad browser/full application suite. Preserve complete N14-01/02 evidence, index/vectors, original33units, existing application/ranking and N14-02contract bytes. Update tracker/handoff and report actual results/limitations, then STOP. All other statuses and full gates stay unchanged.
