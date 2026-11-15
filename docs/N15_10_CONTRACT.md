# N15-10 — deterministic relevance and abstention contract

Authorized 2026-10-27; delivered 2026-10-28 Asia/Karachi under [DE-N14-N15-01](DE_N14_N15_01.md). Research-only, non-generative outer assessment. [N14-02](N14_02_CONTRACT.md) is unchanged. This does not certify semantic entailment, scientific validity, clinical use or independent review.

## Authority and limits

The owner's N15-09 read-only review identified a gap demonstrated by [N15-08B](N15_08B_COMPLETION.md): both saved CLI outputs have valid literal attribution, including the passage that does not answer the numeric Hz question. Only the diagnostic's expected-label scoring withheld that answer. N15-10 adds a separate assessment over supplied canonical quotations; it never reads diagnostic expected labels or ranks/retrieves evidence.

**No reviewed factual-support rule exists in this version. Every factual answer therefore ABSTAINS.** The accommodations question remains a technically relevant example, but cannot receive a factual-support ACCEPT merely because the engineer or model recognizes its relevance. Explicit source reproduction has an attribution-only positive path. No rule-registration, client-asserted approval or semantic confidence override is exposed.

The original research CLI/selection module remains attribution-only and unchanged. The new gate must be explicitly used; its delivery does not make the old CLI, running application or Health Agent relevance-safe. N15-08 prompt v1 remains unpromoted. No model execution or operational integration is authorized here.

## Request and interpretation

`assessRelevance(request, attribution, index, {evidence})` takes a separate request and an existing N14 v2 attribution request. `assessSavedAnswer` adapts a saved CLI quotation, independently rechecks it and ignores saved assessment verdicts. Source data must come from the existing integrity-checked evidence/index loader.

Request schema `astra.research-relevance-request.v1` has exactly:

| Field | Meaning |
|---|---|
| `mode` | `source_quotation` or `factual_answer`. |
| `question` | Bounded literal question/request; data, never executable instructions. |
| `requested_window_id` | Canonical requested window, or null for a factual request without an explicit citation restriction. |
| `requirements.subject` | Requested subject, or null if unresolved. |
| `requirements.relationship` | Requested fact/relationship, or null. |
| `requirements.numeric` | `required`, `not_requested` or `unknown`. |
| `requirements.unit` | `Hz`, `dB` or null. Only these two numeric veto profiles are implemented. |
| `requirements.comparator` | Declared relationship such as maximum; nullable, never independently trusted. |
| `requirements.conditions`, `qualifiers` | Declared bounded string arrays; null means unresolved. Empty arrays are declarations, not proof that conditions are unnecessary. |
| `numeric_literals` | Optional bounded literal bindings; empty when none are proposed. |

Requirements have **unverified-declaration** authority. This is not a natural-language intent classifier. Explicit Hz/dB wording conflicting with declared requirements abstains. Unrecognized intent cannot gain support by selecting nonnumeric mode, supplying empty qualifiers, choosing a trusted-looking ID or claiming reviewer approval. All factual requests still require a future independently qualified support rule. Unknown fields, malformed data/accessors, altered attribution and unsafe instruction patterns fail closed.

## Independent verdicts

| Output | Meaning |
|---|---|
| `canonical_attribution` | Whether N14 verified source/citation/role/scope binding. |
| `exact_quotation` | Whether the submitted literal matches the canonical complete span. A matching string does not excuse a wrong source/role. |
| `question_relevance` | `UNKNOWN`, `INSUFFICIENT_REQUESTED_FACT`, or `NOT_ASSESSED_QUOTATION_ONLY`. No factual direct-support status is issued in this version. |
| `answer_support` | `ABSTAIN`, `REJECT`, or `NOT_CLAIMED` for source reproduction. Never factual ACCEPT. |
| `decision` | ACCEPT only for explicit quotation reproduction; ABSTAIN for insufficient/unverified support; REJECT for invalid binding/request/literal. |

Every nonpositive answer has an empty outward `quotations` list. Internal `audit` retains request hash, declared requirements, N14 assessment and any independently resolved canonical source/page/span binding. A canonical candidate retained after client rejection does not validate that client's citation. No client/model citation becomes supporting output after rejection.

N14 input citations and serialized supporting citations have different schemas. The saved-output adapter projects the N14 input fields, then compares the **entire serialized supporting citation**, including document/role/source display metadata, against the newly verified citation. Saved ACCEPT flags are ignored; malformed arrays and mismatched selected IDs reject.

## Source reproduction

The positive operation uses the exact finite command:

`Quote the complete source passage window-<64 hexadecimal characters>.`

`requested_window_id` and requirement subject must equal that window; relationship is exactly `reproduce_complete_span`, numeric `not_requested`, unit/comparator null, conditions/qualifiers empty arrays, numeric literals empty. Arbitrary factual questions cannot be relabeled as source reproduction. This explicit structured command avoids claiming general language interpretation.

After N14 ACCEPT, return the **complete unchanged canonical quotation** and citation/role/scope. Overall decision ACCEPT means source reproduction only; `answer_support: NOT_CLAIMED`, relevance not assessed and independent review pending. It never certifies scientific truth, ASTRA compliance or clinical applicability.

## Numeric necessary-condition veto and bindings

Inspect only the verified original excerpt string, never page numbers, source hashes, requirement metadata or question-supplied values. Exclude bracketed identifiers such as `[V2 7070]`, URL/DOI/ID tokens and recognized source/page/section/requirement identifier lines. These are conservative filters, not a general document-layout parser.

For the declared Hz/dB requirement, look for an explicit plain decimal literal and requested unit, with only whitespace between value and unit. `Hz`/`hertz` and `dB`/`decibel(s)` are recognition aliases, not numerical conversions. Missing value, missing unit or missing pair yields `MISSING_REQUESTED_NUMERIC_FACT` and ABSTAIN. Bracketed units, complex notation, tables and unsupported layouts may conservatively fail this narrow check; no reconstruction or broad extraction is attempted.

Presence yields only `NO_DETERMINISTIC_VETO`. It does not validate quantity, comparator, conditions, negation, population, time, conflict resolution or answer relevance. A fictional bench tone at 12 Hz cannot establish a spacecraft vibration limit. Conflicting or ambiguous statements cannot produce a factual ACCEPT. Absence from the supplied span does not prove absence from the corpus or all NASA standards.

Each proposed numeric literal has exact `value`, `unit`, `value_start`, `value_end`, `unit_start`, `unit_end`. Offsets are original-page **UTF-16 code units**, checked against the canonical span; substring/token boundaries, exact unit text, adjacency and identifier exclusion must pass. Returned `LITERAL_BOUND_ONLY` records retain original/page hashes and window ID. Their `fact_support` remains `UNVERIFIED`; no value is promoted into a measured fact or accepted answer. Missing values/units, conversions, arithmetic and inferred conditions are never supplied.

## Running the saved-output inspector

```sh
node scripts/n15-relevance.mjs --request=artifacts/n15-10-20261027/unsupported-hz-request.json --saved-answer=artifacts/n15-08b-20261027/unsupported/answer.json
```

This performs local bounded JSON/original/index integrity reads and deterministic assessment only. No retrieval ranking, embeddings, model/native loading, execution process or evidence write occurs. Networking is denied in the standalone CLI; it exposes no URLs or execution flags. Exit 0 includes intentional ABSTAIN; REJECT exits 2, unavailable inputs exit 1. Decide from explicit verdicts, never exit code alone.

## Review gates and future work

Actual independent relevance/qualifier review, the N13 provisional decisions, prospective N14 scientific evaluation and unresolved numerical parity remain pending. Scientific relevance is distinct from clinical validation. No diagnostic label or automated test supplies a human approval.

One proposed next task: a non-generative, independently reviewed **single factual-support rule specification** for system sleep accommodations, with source-role/scope/qualifier requirements and adversarial examples. Obtain actual reviewer decisions before implementing a positive factual rule; do not hardcode the seen supported label. No generation, corpus expansion or N16 integration follows automatically.
