# Prospective independent retrieval evaluation — version 1

Version: `astra.n14.prospective.v1`, prepared 2026-10-25 by N14-05. **Readiness only; no independent evaluation has been conducted or authorized.** N14 remains In Progress. This supersedes the proposed process details in N14-04 for the prospective experiment only; it does not revise old results, evidence or full-module acceptance.

## Frozen scope and policies

The [policy manifest](../data/research/n14-05/policies.json) freezes three existing policies. The append-only policy is the single primary candidate required by the earlier fresh-evaluation proposal; weighted fusion is a predeclared diagnostic comparator, not an alternative that can be selected after seeing results.

| Policy | Existing behavior frozen without execution |
|---|---|
| Rich lexical baseline | Existing `rank(mode=lexical,k=5,lexical_minimum=3)`. Distinct query-term matches score 3 in key/source context, otherwise 1 in source title/text. Existing query guard, tokenizer/stop list, score cutoff, window-ID ties and best-window unit deduplication remain. |
| Weighted RRF comparator | Existing `hybridRank`: `2/(60+rLex)+1/(60+rSem)`, missing contribution zero; existing lexical/semantic/ID ties; depth 5. Protects every lexical top-five unit but may reorder them. |
| Append-only conservative candidate | Existing `hybridRank`: preserve lexical prefix/order and fill vacancies with semantic-only units, depth 5. No replacement. |

Both hybrids consume that same rich lexical top five and the existing N14-03 span-only semantic top five: cosine, no score cutoff, existing window-ID ties/unit deduplication. No new query preprocessing, encoder, vector, index or ranking code is introduced. Exact code/index/vector/source hashes are pinned. MiniLM revision/weight are recorded without loading them; independent numerical parity remains **Unverified**.

| Content-addressed record | Frozen ID |
|---|---|
| Three policies | `policies-d6009366d291c462b1060e5405c122c2c44f867ea09e5f89f49389afe447c393` |
| Machine protocol | `protocol-2ad5d7c134092059eb9f038ca9909cba5cda13691abe77362fc2d6022d84f9e0` |
| Eligible evidence | `evidence-b1fc5c5e6d9bbf3cb4265fb37b38ffee3941a7c84946d631bef444e00e2269ab` |
| Isolated distribution | `bundle-261bacc5e81e41b2f346120e5bba985f74e50e9bef0203ae1748b67ae0c41c7c` |

Only the unchanged 33 NASA evidence units/34 canonical spans from the two preserved publications are eligible. General source findings, formal requirements, recommendations, caveats and background remain distinct. Numerical tables and other N13 exclusions remain excluded. No clinical approval, current-consensus claim or astronaut-specific inference is supplied by citation validity.

## Blinded workflow and actual human gates

1. **Owner appoints actual people.** Identify a custodian, unexposed author(s), qualified independent scientific reviewer(s), and an independent adjudicator if disagreement occurs. Record qualifications, affiliations, exposure declarations and real dated sign-off evidence. The implementation agent/evaluator that saw the old benchmark cannot manufacture independent authorship or review. Do not contact anyone automatically.
2. **Custodian distributes only the isolated packet.** Use [START_HERE](../artifacts/n14-05-20261025/reviewer-packet/START_HERE.md) and the eight files listed by its distribution manifest, not the repository, internal policy/protocol documents, previous question sets, results, rankings or model outputs. Supply the two already-preserved original PDFs separately, retaining their hashes/notices; this task does not copy or download them. The neutral packet contains no policy descriptions or historical performance. A separate folder is not an ACL: use an independent workspace/account or offline transfer, control access procedurally, record recipients and attestations. If a person already knows the old material, disclose it and replace them for an unexposed evaluation claim.
3. **Actual authors write new questions from source evidence.** Do not supply the inspected 40 questions or generate new ones with the exposed engineering agent. Draft independent wording, families, categories, minimal evidence sets and explicit qualifiers. No retrieved outputs are available during authoring. The proposed cohort is 40 questions: 24 supported, 8 unsupported, 8 ambiguous; the owner must accept these counts before actual authorship/freeze. If the owner changes the plan, create a new protocol version before results, not a silent edit.
4. **Independent scientific reviewers check final payloads.** Review source identity/version, original pages, complete anchors, role, relevance and scope/qualifiers. At least one actual independent scientific approval per included case is required. Objections remain recorded; a distinct qualified adjudicator must resolve disagreements before freeze. No self-review, convenient passage relabeling or post-result exclusion. Unresolved metadata errors need separate controlled corpus work, not silent correction here.
5. **Custodian authenticates records and checks contamination.** Verify people/qualifications/actual signed records externally. A separate leakage reviewer or custodian may compare drafts to the old 40 without disclosing their wording to authors/reviewers/adjudicators. Check near-paraphrases and recycled answer templates, not just identical strings. Record exclusions and reasons. Such a reviewer is necessarily exposed and cannot also serve as a blind author/scientific reviewer/adjudicator. Software cannot prove blinding, originality or competence.
6. **Owner accepts hashes and separately approves execution.** Freeze the finalized cohort, labels, protocol, distribution and code hashes before opening any retrieval outputs. Authenticate human decisions, preserve raw records, then request separate execution/resource approval. This task grants none. Authors and adjudicators must finalize their work before any rankings/results are disclosed. Later changes create new versions; exposed questions cannot become a fresh holdout by relabeling them.

All these human actions are **pending**. Zero authors, reviewers, signatures, fresh questions or labels were created in N14-05. Existing 40 provisional expectations remain pending; their approval status is unchanged. New independent relevance judgments would cover the new cases only and would not automatically close N13 or establish clinical validity.

## Template, citation and version contract

[Blank labels](../data/research/n14-05/labels.template.json), [case](../data/research/n14-05/case.template.json) and [participant](../data/research/n14-05/participant.template.json) templates contain no real cases or people. Copy them to a new owner-approved review workspace. Copy each expected reference's complete `binding` from the exported evidence; add `relevance_rationale`, nonempty `required_qualifiers`, and actual `original_page_checked`. Bindings match N14-02 source/citation/role/scope metadata exactly, including original, page, section, UTF-16 range, text hash and base chunks. Do not assign new meanings to a role or omit canonical limitations.

Supported cases require nonempty expected evidence and `research_evidence_only`; unsupported cases require an empty expected-evidence list, a scope/coverage rationale and `abstain`. Ambiguous cases may reference relevant evidence but require `abstain_or_state_limitations`, not an invented definitive answer. Supported recall uses unique unit IDs; multi-span requirements remain explicit for evidence review and do not imply that unit recall validates a full answer.

Every finalized case receives `casePayloadHash`: SHA-256 of canonical sorted JSON excluding only `reviews` and `adjudication`. Question, author/time, family, category, expected bindings, qualifiers and scope therefore affect the hash. Reviewer/adjudicator records must bind to it; any edit invalidates old decisions. Record real UTC timestamps and an externally retained sign-off record/reference/hash. The validator checks sequence, fields and hashes, not signatures or identity authenticity.

The complete labels object receives `labels-<canonical SHA-256>` and carries the policy/protocol/evidence IDs and a positive revision. Current empty draft ID is `labels-f3feaba5120ac3034c631a01e762ebdb2e439097b4ff2f716d525e492ae1b3c9`, **not a benchmark**. Future finalized labels should be preserved as a new `labels-<hash>.json` plus a custodian release record referencing the ID; retain earlier revisions. SHA-256 gives content identity/tamper detection, not filesystem immutability or a digital signature. The prepare tool refuses existing destinations; it never overwrites old packets.

## Prospective pass/fail and regression rules

No results have been generated. The [machine protocol](../data/research/n14-05/protocol.json) records criteria before the new cohort exists:

- Invalid citation, source, role or changed frozen input/policy invalidates the run. Report failures rather than omit them.
- Primary append-only candidate must lose **zero expected top-five units on every positive question**, with macro Recall@5 no lower and macro Recall@3 no lower than rich lexical. Report every per-question top-three loss even if aggregate rises. Violating structural prefix/top-five protection is an implementation failure.
- Claim a prospective retrieval improvement only with a **strict Recall@3 gain**, no Recall@5 regression and the other integrity/regression conditions met. Equality is no demonstrated improvement. Report paired wins/losses/ties, exact gained/lost IDs, denominators and the limited sample; this does not show clinical or unseen-document/population generalization.
- Weighted RRF is diagnostic only; report all regressions. Do not switch primary candidate or thresholds after its result. No automatic production promotion follows from either result.
- Unsupported/ambiguous cases stay outside the positive recall denominator. Report their candidate behavior and agreed abstention requirements separately. Candidate presence is not a claim; absence is not proof of health or safety.
- If a later approved evaluation includes claims, use actual source/role/scope-bound N14-02 positive and negative controls. Invalid binding/altered assertions reject, unverified paraphrases abstain, and unsupported clinical assertions must not be accepted. Missing-input rejection is not accuracy. Retrieval-only results cannot supply an unsupported-claim acceptance or abstention metric for an unexecuted claim layer.
- Measure future live inference/end-to-end latency and resources separately from replay cost. Numerical parity remains unverified until separately supported. Original N14 requirements, N07/N13 gates and release restrictions are not weakened.

## Deterministic tooling and current checks

```bash
node scripts/n14-evaluation-readiness.mjs validate --labels=data/research/n14-05/labels.template.json --stage=draft --bundle=artifacts/n14-05-20261025/reviewer-packet
node scripts/n14-evaluation-readiness.mjs validate --labels=data/research/n14-05/labels.template.json --stage=reviewed --bundle=artifacts/n14-05-20261025/reviewer-packet
```

The first exits 0 for a valid empty draft, explicitly not review-complete. The second correctly exits 1: no human oversight/final cohort/distribution attestation exists. For a real case, `hash-case --case=PATH.json` prints the case payload hash without reviewing it. `prepare --output=NEW-EMPTY-PACKET-PATH --records=NEW-EMPTY-RECORD-PATH` reproduces the export with pinned inputs; future writes need applicable task/filesystem approval. No `evaluate`, inference or model mode exists.

Draft and reviewed validation are deterministic and bounded. Unknown fields, malformed citations/roles/scopes, stale decisions, duplicate cases/people, author self-review, exposed/unknown blind participants, invalid dates, incomplete checks, unresolved objections, missing distribution authentication records and mismatched proposed counts fail appropriate checks. A structurally complete fixture still returns `signatures_authenticated:false`, `clinical_validation:false`, `evaluation_authorized:false` and `evaluation_executed:false`.

The 66 focused software checks include fictional in-memory schema fixtures only. They are not independent scientific cases or professional approvals. **N14-05 stops at readiness; a genuine prospective evaluation remains blocked on actual human work and new explicit execution approval.**
