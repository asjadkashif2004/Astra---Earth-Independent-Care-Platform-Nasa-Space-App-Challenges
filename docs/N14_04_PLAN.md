# N14-04 — frozen lexical-first hybrid replay

Owner approved one bounded research-only diagnostic. [Machine specification](../data/research/n14-04/spec.json) is frozen before candidate scoring. Only the saved N14-01rich lexical and N14-03semantic top-five lists are used. The latter already matches the old semantic ranks for all40questions. No inference, model/native runtime access, embedding/index construction, installation, download or new scratch/probe environment is required. This is bounded ordinary offline JSON replay/QA, as in N14-02; it does not activate or renew an expired monitored-storage exception.

## Exactly two candidates

1. **Lexical-weighted RRF:** `2/(60+rLex)+1/(60+rSem)`, zero contribution for absence from a saved list. Sort by total score descending,then lexical rank,semantic rank,unit ID. Existing lexical units dominate semantic-only additions because2/65>1/61,so every≤5saved lexical unit remains in the output. RRF may reorder lexical units and change top3. It may append semantic-only units when lexical returns fewer than5.
2. **Append-only semantic rescue:** retain the complete lexical prefix unchanged; append previously absent semantic units in saved semantic order until5. No replacement/reordering. Top3/top5baseline units are mathematically protected; semantic additions can only fill vacancies.

No grid search, third candidate, case-specific rules, score thresholds, oracle labels, fresh model calls or post-result revision. These are truncated-list diagnostics,not full-depth RRF or proof of optimal hybrid retrieval. All40questions are seen. Rich lexical refers to the33-excerpt research comparator; the application's separate prototype retriever is untouched.

## Provenance and measurements

Resolve every ID against the unchanged33canonical units/34index spans and retain source,role,limits and exact original/page/range/chunk identities. Old rich-lexical logs saved unit ranks but not the winning span; preserve all canonical spans for each unit and explicitly mark the winning lexical span unknown. Preserve the known semantic matched window. No alternative passage may be relabeled correct; only unchanged provisional expected IDs score recall.

Primary safety criterion:zero per-question expected-unit loss at5versus rich lexical. Report recall3/5,win/loss/tie counts,exact gains/losses,source checks and remaining misses. Replay processing cost is not live model/query/UI latency. Unsupported8questions have no positive recall denominator. Claim ACCEPT/REJECT/ABSTAIN is unchanged and not inferred from ranking scores.

Read sizes/output sizes and execution lifetime are bounded in the specification; new CLI output≤8MB,each file≤2MB. No new installed/cache/model storage exists and no storage-policy requirement is relaxed. If saved lists prove insufficient or model execution/resource exception becomes necessary,STOP for approval. Reuse old evidence;never overwrite it.

Focused QA must independently verify RRF arithmetic,ties,baseline containment,prefix preservation,vacancy rescue,invalid IDs/duplicates,canonical bindings,metric calculations and unchanged claim behavior. Freeze input/code hashes before replay,save per-query records before summary,verify preservation and update handoff. Prospective fresh evaluation is documentation only:see [protocol](N14_04_FRESH_EVALUATION.md). No clinical/generalization approval or N15/N16. Stop after this diagnostic.
