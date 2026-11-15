# N14-02 — source-bound literal claim assessment contract

Owner-approved2026-10-25, research-only follow-up under the task-specific DE-N13-N14-01 continuation. No model, embedding, ranking, corpus or application change. All40provisional scientific/medical decisions stay pending. This contract verifies attribution of a complete quotation; it does not establish scientific truth or clinical applicability.

## Input v2

One JSON object, schema_version `astra.claim-assessment.v2`:

```json
{
  "schema_version": "astra.claim-assessment.v2",
  "evidence": {
    "source_id": "canonical document_id",
    "citation": {
      "window_id": "canonical window ID",
      "unit_id": "canonical evidence-unit ID",
      "section_id": "canonical curated section ID",
      "original_sha256": "canonical original hash",
      "page_index": 1,
      "page_sha256": "canonical page hash",
      "start": 0,
      "end": 100,
      "offset_unit": "UTF-16 code units",
      "text_sha256": "canonical full-span hash",
      "base_citations": []
    }
  },
  "role": "canonical source role",
  "scope": {
    "usage": "source_research_only",
    "source_context": "canonical context",
    "limitations": "canonical limits"
  },
  "claim": {"kind": "literal_quote", "text": "complete exact source span"}
}
```

The schematic values above are not valid source assertions. Real requests require nonempty unchanged base chunk citations. The three claim kinds are `literal_quote`, `assertion`, `paraphrase`. Source/window IDs select authoritative evidence; client metadata never establishes authority. Resolve the window in the verified index, validate it against unchanged authoritative evidence, then compare every submitted citation field, source, role and scope with canonical values. Never search another source for matching words to excuse a wrong citation. Missing/null role is explicitly invalid; never infer it from expected answers or silently accept it. Unknown/malformed fields reject. Text/request sizes are bounded. No similarity score is accepted as proof.

Canonical scope consists of research-only usage plus the complete source_context and limitations strings. These retain population/time/version/design-versus-clinical qualifiers without attempting natural-language inference. Broader, missing or altered scope rejects. The original publication hash, page/range/text/chunk hashes and section/window/unit IDs accompany every valid-binding assessment, including abstentions/rejections. Invalid client citations never appear as supporting citations. Source-backed review status remains pending.

## Outcomes

| Status | Decision | Meaning |
|---|---|---|
| verified_literal_support | ACCEPT | Complete exact quote, bounded-source readiness, matching canonical citation/source/role/scope. Attribution only; never clinical support. |
| invalid_evidence_binding | REJECT | Missing/incorrect citation/source/role/scope or untrusted altered index record; reason distinguishes the mismatch. |
| invalid_claim_request | REJECT | Missing/schema-invalid/malformed/oversized request or invalid claim kind. |
| unsupported_assertion | REJECT | Changed literal quotation or assertion without an independent support mechanism. This is not proof the assertion is scientifically false. |
| paraphrase_unverified | ABSTAIN | Valid evidence binding, but paraphrase entailment is not independently verified. |
| unverified_evidence_scope | ABSTAIN | Location-only/unreviewed numerical context cannot support a proposition. |
| untrusted_content | REJECT | Recognized injected instructions in request/source text; content remains data, never a tool call. |

`abstained` is true for every non-ACCEPT outcome; `decision` and `status` distinguish rejection from uncertainty. Supporting citations are emitted only for ACCEPT. A separate canonical evidence binding is retained for valid-input failures. Runtime decisions do not read expected labels, invoke models/tools or infer disease/treatment. Exact source text is not a physiological explanation or endorsement.

## Evaluator and CLI

Existing40provisional questions/claims have no explicit v2 binding. Do not manufacture one from expected answer IDs or count missing-role/default rejection as successful unsupported-claim detection. Mark their claim-assessment portion **NOT_ASSESSED**, with non-diagnostic claim metrics; retrieval scoring code remains unchanged and is not rerun in this task. Historical N14-01 evaluation bytes remain immutable. Its16/16rejection figure is non-diagnostic due to the old input-contract defect. Independent bound controls exercise actual positive and negative discrimination without using the observed holdout as new generalization evidence.

The offline CLI claim mode accepts a bounded local `--request=path.json` and verified `--index=path`. Legacy bare `--text/--role` claim invocation must fail explicitly. Other CLI modes/rankings remain unchanged. A builder may copy metadata from an already verified index window for trusted tooling; the checker independently resolves and validates it. QA fixtures must not generate expected outcomes with that builder/checker.

## Verification gate

Independently constructed deterministic toy evidence/requests: accepted literal positive; wrong source/role; missing/null role; altered quote; fabricated/corrupt citation; unsupported clinical assertion with real binding; unverified paraphrase; scope/qualifier mismatch; injected research instructions. Require both ACCEPT and rejection/abstention controls; a reject-everything or accept-everything substitute must fail QA. Additionally verify exact literals against actual frozen NASA windows, including location-only abstention and preserved provenance. No embeddings/inference or40-case retrieval rerun. Preserve N14-01 index/vector/evaluation bytes and all original publications/curation. Report scientific/medical approval as pending and numerical parity as unverified.

Executed delivery: [N14_02_COMPLETION](N14_02_COMPLETION.md) records55focused passes,122-file check,20independent fixture/199NASA-index controls and actual offline CLI outcomes. This task is delivered and stopped; it does not authorize a follow-up.
