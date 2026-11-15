# N14-02 — claim assessment contract and QA correction

Delivered2026-10-25 under explicit owner approval and the task-specific DE-N13-N14-01 continuation. **N14 remains In Progress; this slice is delivered and STOPPED.** N07/N13 In Progress, N04 Complete, N05/N06 Deferred, N03 Partial, AC-20 Open / Unverified. No N15/N16 or application integration.

## Corrected contract

[Input/output contract](N14_02_CONTRACT.md): `astra.claim-assessment.v2` requires source identity, full original-bound citation/window/unit/section IDs and hashes/range, explicit role, canonical research scope/limitations and typed proposed text. Missing/null role is explicitly rejected. The checker resolves the window from the verified index, validates it against authoritative unchanged evidence, then compares source, complete citation, role and scope. Identical words in another source do not excuse a wrong binding. No client similarity score or role assertion creates support.

Only `literal_quote` with complete exact indexed source-span text, correct canonical binding and bounded-source readiness receives **ACCEPT / verified_literal_support**. This verifies quotation attribution, not scientific truth or clinical applicability. A changed quote or unverified `assertion` receives **REJECT / unsupported_assertion**; this means support was not established, not that the assertion is scientifically false. A bound `paraphrase` receives **ABSTAIN / paraphrase_unverified**. Citation/source/role/scope mismatch, malformed input and recognized injected instructions have explicit separate rejection reasons. Location-only context abstains. Canonical original/page/span/chunk provenance is retained for valid-binding failures; only accepted literals produce supporting citations.

Input shapes, depth and sizes are bounded; unknown fields, accessors, functions, cycles and malformed metadata reject without executing content. Source text remains untrusted data. Recognized injection patterns reject; the filter is not a general-purpose malicious-language classifier. No tools, model inference, network or medical action are invoked by assessment.

## Evaluator correction and historical result

**The N14-01 16/16 rejection metric is non-diagnostic:** the evaluator supplied unbound text without its required role, so it could not establish claim discrimination. Those40legacy questions/claims lack explicit v2 bindings; do not manufacture citations from expected answers. Their claim-assessment portion now reports **NOT_ASSESSED**, with unassessed counts and null/non-diagnostic claim-accuracy metrics. Literal/adversarial controls use the actual bound contract. A dedicated control evaluator requires both positive and negative cases; reject-everything and accept-everything substitutes fail QA.

No40-case retrieval evaluation was rerun. Its saved results, rankings and all original labels remain unchanged, including the pending status of all40scientific/medical reviews. The future evaluator's version2output explicitly notes the old claim-contract defect and exposed holdout. Retrieval scoring/ranking algorithms are untouched. No held-out improvement is claimed; lexical remains the baseline and independent MiniLM numerical parity remains unverified.

## Executed verification

| Verification | Actual result |
|---|---|
| Independent fictional deterministic controls |20:1ACCEPT,18REJECT,1ABSTAIN; all expected outcomes pass |
| Actual frozen NASA-index controls |199:33ACCEPT,132REJECT,34ABSTAIN; all expected outcomes pass |
| Literal positives |34/34accepted across both control groups; the NASA33cover all five canonical roles |
| Negative/uncertain controls |185/185not accepted;0incorrectly accepted |
| Reject-everything /accept-everything mutations |Both fail the QA gate |
| New contract tests |33/33pass |
| Existing retrieval regressions adapted to v2 |22/22pass |
| Combined focused run |55pass,0fail,0skip;741.27ms |
| Syntax/import check |122JavaScript files,0errors; no TypeScript compilation claim |
| Actual offline CLI checks |ACCEPT literal,REJECT edited quote,ABSTAIN paraphrase; old bare-text invocation exits1explicitly |
| Native inference/downloads/browser/full suite |Not run; none needed or authorized |

The fictional fixture requests and expected outcomes are independently constructed without the implementation's request builder/checker. Two fixture sources contain identical text to test exact attribution. Additional tests cover canonical-source substitution, null/missing role, corrupt original/page/range/chunk/section metadata, qualifier/scope expansion, an unsupported clinical assertion with real binding, literal versus paraphrase intent, malformed/oversized/cyclic/accessor input and injected instructions in original research text. The NASA catalog checks are literal/citation integration controls, not medical validation or a fresh holdout.

[QA results](../artifacts/n14-02-20261025/qa.json), [summary](../artifacts/n14-02-20261025/summary.json), [focused tests](../artifacts/n14-02-20261025/focused-tests.json), [CLI checks](../artifacts/n14-02-20261025/cli-summary.json). CLI peak RSS~103MB; no native inference and zero attempted networking in those checks. QA records are small local JSON; no previous model-task storage/acquisition exception was reused.

## Changed files and preservation

Four existing implementation/QA files changed: `services/research-retrieval/retrieval.mjs` (claim section only), `services/research-retrieval/evaluation.mjs` (claim contract/metrics), `scripts/n14-research.mjs` (bound JSON claim input), `tests/research-retrieval.test.mjs` (v2 callers). Three new files: `tests/fixtures/n14-claim-fixtures.mjs`, `tests/claim-assessment.test.mjs`, `scripts/n14-claim-qa.mjs`. No dependencies added or package/lock changes. New contract/completion/evidence records and relevant governance/tracker/handoff/plan/audit/README clarification accompany the change.

[Preservation](../artifacts/n14-02-20261025/preservation-after.json):485existing file contents/group membership match across original corpus, N14-01 data/index/evidence, app/packages/knowledge, package manifests and untouched encoder/contract/numerical/offline/experiment files. The retrieval prefix containing index build/verification, lexical/semantic scoring and query safeguards is byte-identical. Three old index files still total161361bytes; vectors and stored evaluations are unchanged. No N01/N02, Scenario Lab, graphics, runtime database or historical N04 evidence was modified. This is not a new all-history/browser certification. Protected Git/config directories were not touched; no usable Git commit mount is available.

## Run locally

The following checks require no model/runtime installation or network:

```bash
node --test --test-isolation=none tests/claim-assessment.test.mjs tests/research-retrieval.test.mjs
node scripts/n14-research.mjs claim --index=data/research/n14-01/index --request=artifacts/n14-02-20261025/example-literal-request.json
node scripts/n14-research.mjs claim --index=data/research/n14-01/index --request=artifacts/n14-02-20261025/example-rejected-request.json
node scripts/n14-research.mjs claim --index=data/research/n14-01/index --request=artifacts/n14-02-20261025/example-paraphrase-request.json
```

Expected decisions in order:ACCEPT,REJECT,ABSTAIN. Every result remains research-only/clinical_support:false. Legacy `claim --text=... --role=...` is intentionally unsupported; it must not silently omit provenance. To produce another bounded QA packet after appropriate approval, `node scripts/n14-claim-qa.mjs --output=new-directory` refuses overwrites. Query/build/index algorithms are unchanged; no query or model run is needed for these claim checks.

## Remaining limits and next task

Exact full-span/whitespace matching is deliberate; excerpts with extraction line breaks must be copied exactly. One bound span is assessed at a time. No paraphrase entailment, cross-source contradiction resolution, disease inference, treatment decisions or scientific/medical approval exists. Source-context strings/limitations are equality-checked; they are not automatically interpreted as clinical reasoning. A literal source quotation cannot establish astronaut-specific applicability.

Full N14 remains open: unmet semantic benefit gate, independent numerical parity, useful independently evaluated support/conflict handling, full N13/prerequisite approval and future separately approved integration/release gates. All unfinished N07/N13 obligations and N10/N12/N15/N16 prerequisites remain.

Smallest next proposed task: a separately approved **tuning-only matched-input retrieval experiment** using existing evidence/model, with the same approved source context exposed to both methods and a frozen protocol. Preserve old index/holdout, keep lexical as baseline, and require separately approved fresh evaluation before any generalization/improvement claim. No such follow-up, new storage policy, inference or N15/N16 action is authorized by this delivery. **STOP for owner approval.**
