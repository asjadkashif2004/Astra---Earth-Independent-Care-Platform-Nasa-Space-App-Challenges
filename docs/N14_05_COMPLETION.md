# N14-05 — independent retrieval evaluation readiness

Delivered 2026-10-25 under explicit documentation/evaluation-tooling approval. **Readiness materials and tooling are delivered; an independent evaluation has not occurred and is not authorized. N14 remains In Progress.** N07/N13/N09 In Progress, N04 Complete, N03 Partial, N05/N06 Deferred and AC-20 Open / Unverified are unchanged.

## Delivered records and reviewer materials

- [Versioned protocol](N14_05_PROTOCOL.md) and [machine protocol](../data/research/n14-05/protocol.json) predeclare the primary append-only candidate, rich lexical baseline and diagnostic weighted-fusion comparator. No selection after fresh results.
- [Frozen policy manifest](../data/research/n14-05/policies.json) records exact existing algorithms, code/index/vector hashes, source scope and unchanged model pins. No ranking, model, index or N14-02 contract change.
- [Reviewer packet](../artifacts/n14-05-20261025/reviewer-packet/START_HERE.md) supplies neutral authoring/review instructions, all 33 eligible evidence units/34 spans, source rights/version/hash context, and blank participant/case/label templates. The two original PDFs are identified for separate custodian supply, not copied or downloaded.
- Distribution is an exact eight-file allowlist plus its hash manifest. The internal policy definitions, old benchmark, model outputs, results and rankings are excluded. The bundle verifier rejects additional files, symlinks, byte changes and rehashed substitutions inconsistent with the canonical export.
- [Deterministic validator](../scripts/n14-evaluation-readiness.mjs) provides `prepare`, `validate` and `hash-case` only. There is no retrieval/evaluate/model mode. Drafts and review-complete records are distinct; all output explicitly denies signature authentication, clinical validation and execution authority.

Frozen identifiers are recorded in the protocol: policies `d6009366…`, protocol `2ad5d7c1…`, evidence `b1fc5c5e…`, distribution `261bacc5…`. IDs use full canonical SHA-256; shortened forms here are navigation aids. Future labels receive `labels-<canonical SHA-256>` plus a revision. Content hashes detect changes; they are not OS immutability or digital signatures. Prepare refuses existing output destinations and never overwrites evidence.

Every case expectation carries the canonical source/citation/role/scope binding used by N14-02, including original/page/text hashes, section, UTF-16 span and base chunk anchors. Required qualifiers and original-page checks are explicit. Case decisions bind to a payload hash; edits invalidate prior reviews. The validator checks missing/duplicate people, own-case self-review, known/unknown exposure, missing records, date sequencing, incomplete checks, disagreements/adjudication, canonical metadata, cohort counts and a verified distribution. It does not decide scientific relevance or authenticate a professional.

## Prospective criteria — no results generated

The proposed cohort is 24 supported, 8 unsupported and 8 ambiguous questions, requiring owner acceptance before actual authorship/freeze. All questions must be newly authored from the same eligible source scope without the inspected benchmark. The primary candidate must have zero per-question loss of expected top-five evidence, no macro Recall@5 regression and no macro Recall@3 regression; strict Recall@3 improvement is required before claiming a retrieval gain. All top-three losses are reported. Invalid citations/roles/policy drift invalidate a run. Weighted fusion remains diagnostic, not a post-result replacement candidate.

Unsupported/ambiguous queries have separate abstention expectations, not invented positive recall labels. Retrieval presence does not establish support. Any later approved claim assessment must use the unchanged N14-02 contract and real positive/negative controls; no accuracy is inferred from missing-input rejection. New questions do not imply unseen-document, population or clinical generalization. Numerical embedding parity remains Unverified and all full-module gates remain open.

## Verification actually executed

| Check | Result |
|---|---|
| Final focused tests | **66/66 PASS**, 0 failures/skips: 22 new readiness + 11 unchanged hybrid + 33 unchanged claim tests |
| Syntax/local imports | **131 files, 0 errors**; not TypeScript compilation |
| Draft CLI with actual exported packet | Exit 0, valid draft; review-complete/authentication/evaluation flags false |
| Reviewed CLI with the same empty template | Expected exit 1: oversight, distribution attestation and final cohort missing |
| Neutral-export leakage check | All 40 historical question strings checked; none present; no policy file exported |
| Original content/group preservation | **580 files match**, including corpus, old index/vectors, ranking/services, packages/app, old scripts/tests, N14-02 contract and N14-01–04 evidence |
| New packet + five frozen records | **162,939 bytes** total; no original PDF/model/runtime copies |
| Actual fresh questions, labels, reviewers or approvals | **Zero** |

[Final test log](../artifacts/n14-05-20261025/focused-tests-final.txt), [syntax log](../artifacts/n14-05-20261025/syntax-check-final.txt), [draft result](../artifacts/n14-05-20261025/draft-validation.json), [expected rejection](../artifacts/n14-05-20261025/reviewed-template-rejection.json), [export check](../artifacts/n14-05-20261025/blind-export-check.json), [preservation/manifests](../artifacts/n14-05-20261025/preservation-and-manifests.json).

Software QA uses explicitly fictional, in-memory structural controls, not research questions or independent sign-offs. Positive controls must pass; reject-everything/accept-everything substitutes fail. Negative controls cover altered source/page/span/chunk/role/scope, stale review hashes, missing checks, exposed participants, objections and non-boolean adjudication fields. This authenticates no person and grants no scientific or medical approval.

No retrieval evaluation, inference, new embedding/index, network acquisition, dependency installation, storage-policy exception, browser/full application suite or runtime-database work occurred. Model numerical parity was not tested or improved. Old N14 tuning results and all 40 pending review statuses are unchanged. No commit was attempted against the protected unusable Git mount.

## Remaining actual human gates

| Needed action | Who must actually perform it |
|---|---|
| Accept cohort/process, appoint people and approve real review work | Owner; no outreach or appointments were made here |
| Distribute only neutral bundle and hash-verified originals; control access | Custodian independent of blind authors/reviewers |
| Write genuinely new questions/expectations without old questions or outputs | Actual unexposed authors; the exposed implementation agent cannot supply independent authorship |
| Inspect original pages, relevance, roles, qualifiers and exclusions; sign final payloads | Qualified independent scientific reviewers, distinct from each case's author |
| Resolve objections without seeing retrieval outputs | Distinct qualified adjudicator if needed |
| Check originality/overlap and authenticate people/qualifications/external records | Exposed custodian/leakage reviewer, who cannot also be a blind scientific reviewer |
| Accept final label/policy hashes and separately approve future execution/resources | Owner, after actual human review |

Scientific relevance review is narrower than medical/clinical validation. Reviewer names, records, professional competence and lack of exposure cannot be established by a JSON schema or hash. The proposed process needs isolated distribution and actual attestations; this shared repository does not enforce blindness by itself. No current or future structural pass alone closes N13/N14, authorizes medical support, or bypasses full N07/N13 and downstream gates.

## Files and manual inspection

New code: [evaluation-readiness.mjs](../services/research-retrieval/evaluation-readiness.mjs), [CLI](../scripts/n14-evaluation-readiness.mjs), [tests](../tests/evaluation-readiness.test.mjs). New data: five records under `data/research/n14-05/`; new neutral guides under `docs/n14-05-reviewer/`; plan/protocol/completion, new task evidence and relevant governance/tracker/handoff updates. **No dependencies changed.**

```bash
node scripts/n14-evaluation-readiness.mjs validate --labels=data/research/n14-05/labels.template.json --stage=draft --bundle=artifacts/n14-05-20261025/reviewer-packet
node --test --test-isolation=none tests/evaluation-readiness.test.mjs tests/hybrid-retrieval.test.mjs tests/claim-assessment.test.mjs
```

The first must report a valid draft with no execution/review authentication; substituting `--stage=reviewed` must fail until actual work is recorded. Full reference commands and field rules are in the versioned protocol. Do not rerun retrieval or regenerate historical evidence.

**Next proposed task:** owner-approved actual independent author/reviewer recruitment and cohort acceptance, followed by blinded source review/question preparation. Evaluation requires a later separate approval after those gates. **STOP; no evaluation, N15/N16 or other module starts automatically.**
