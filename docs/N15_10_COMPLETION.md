# N15-10 — separate relevance gate delivered; factual support remains unverified

Authorized 2026-10-27; delivered **2026-10-28 Asia/Karachi**. **PASS within the bounded non-generative contract.** [Contract](N15_10_CONTRACT.md), [authorization](DE_N14_N15_01.md), [evidence directory](../artifacts/n15-10-20261027/). The directory date records task initiation, not a new model run.

N15 remains **In Progress**, N16 **Not Started**. N07/N09/N13/N14 In Progress; N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. No scientific, medical, parity, security, dependency or full-module gate closed.

## Implemented

New pure [relevance module](../services/research-answer/relevance.mjs), separate [saved-output CLI](../scripts/n15-relevance.mjs) and [focused tests](../tests/research-relevance.test.mjs). No dependencies added or changed. The existing N14-02 checker, N15 selection/parser/grammar/prompt/runtime, lexical retrieval, index/vectors and NASA evidence are unchanged. No application hook or production promotion.

Explicit requirements cover subject, relationship, numeric values, units, comparator, conditions and qualifiers. Citation attribution, exact quotation, question relevance and complete-answer support have independent verdicts. The numeric veto rejects identifier-as-measurement proposals and abstains when requested value/unit support is absent. Exact accepted literal bindings carry original-page UTF-16 offsets and hashes, with factual support explicitly unverified.

No reviewed factual-support rule exists. All factual questions—including the technically relevant accommodations positive—ABSTAIN. Explicit canonical source reproduction ACCEPTs attribution only and provides a genuine positive control. No general entailment claim or automatic inference from numeric presence.

## Saved-output demonstration

No new model execution. Only preserved N15-08B `answer.json` files are read. Their canonical window is `window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84`: NASA-STD-3001 Volume 2 Revision F, section7.9.1/V2 7070, page index134, UTF-16 span1248–1499, original SHA `a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f`.

| Assessment | Citation / complete quote | Question support | Outward result |
|---|---|---|---|
| Explicit V2 7070 source reproduction | VALID / VALID | NOT_CLAIMED | ACCEPT, one full canonical quotation and citation. |
| Original environmental-accommodations factual question | VALID / VALID | UNKNOWN; no reviewed rule | ABSTAIN, no answer quotation. |
| Original numeric vibration-limit-in-Hz question | VALID / VALID | INSUFFICIENT_REQUESTED_FACT | ABSTAIN, value/unit not established. |

See [quotation output](../artifacts/n15-10-20261027/explicit-quotation-stdout.json), [factual positive abstention](../artifacts/n15-10-20261027/supported-factual-stdout.json), [numeric veto](../artifacts/n15-10-20261027/unsupported-hz-stdout.json). Decisions use no expected-case flags or frozen diagnostic labels. These are seen-data deterministic demonstrations, not new retrieval evaluation or independent scientific validation. The old raw CLI still reports attribution-only VERIFIED_QUOTATION; its historical output is preserved, not rewritten or requalified.

## Focused verification

**92/92 PASS, zero skips/failures** across the new relevance tests and unchanged N14 claim/N15 selection regressions. [Full log](../artifacts/n15-10-20261027/qa-stdout.txt). Coverage includes source reproduction; missing Hz/dB facts; mixed and vague requests; compliance inference; 7070/metadata exclusion; unrelated numbers/units; correct literal with wrong/unverified subject/comparator/conditions; exact original offsets; invalid source/citation/role/scope/text; paraphrases; injection; malformed inputs; saved citation display metadata; no diagnostic-label authority; and positive/negative control discrimination. Reject-all, abstain-all and accept-all substitutes fail QA.

Initial QA caught an implementation adapter error: serialized supporting citations contain document/role/source fields that are not N14 v2 input fields. The adapter now maps the input schema and independently checks the entire serialized supporting citation against the newly verified one. Original N14 validation and test assertions were not weakened. That initial failed console run was not fully persisted; final corrected QA is preserved. No generation or experiment was involved.

Three new JavaScript files receive focused syntax checks. Preservation verification is recorded separately in [preservation](../artifacts/n15-10-20261027/preservation.json); original source/data/package hashes and historical size/mtime records are compared to the preimplementation baseline. No cached model/runtime paths are opened by the new implementation or its tests. No model/native loading, inference, downloads, installations, network requests, operational database reads, browser collection or storage exception.

## Limits and next task

Numeric presence is not quantity/relationship/condition support. Single-span assessment does not resolve cross-document disagreement, inspect all possible passages or prove that a missing number exists nowhere. All factual answers abstain until a reviewed support mechanism is separately authorized. The CLI is a standalone research path, not integrated into existing operational systems. All prior provisional labels/review statuses remain unchanged, and N15-08 prompt v1 remains unpromoted.

**One next recommendation:** obtain actual independent review of a single bounded accommodations-support rule specification and its source qualifiers/negative cases before separately approving its implementation. This does not require another LLM experiment. No self-certification, automatic rule registration or N16 authorization.

STOP after N15-10. No new model generation, next module or resource renewal is authorized.
