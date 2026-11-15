# Review scope: sleep-environment accommodations in V2 7070

Status: **proposal only; all human decisions pending**. One rule, one initial exact question wording and one complete source quotation. No general paraphrase classifier or rule implementation exists here.

## Source and exact candidate answer

NASA Office of the Chief Health and Medical Officer, *NASA Spaceflight Human-System Standard, Volume 2: Human Factors, Habitability, and Environmental Health*, **Revision F**, approved **2026-07-14**. Official catalogue reference: https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2 . These are preserved source references, not newly fetched current-version assertions.

Original: `NASA-STD-3001 Vol 2 Rev F.pdf`; SHA-256 `a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f`. Physical PDF ordinal134 (one-based), section7.9.1 / **V2 7070**, canonical UTF-16 code-unit interval **[1248,1499)**. Exact excerpt SHA-256 `64c1af1ee12fb4398813fcaac40a883a603d4359e95807f51775180b011f92e1`. Complete page/span/window/chunk/source hashes and role/scope are in `SOURCE.json`; the base extraction's heading association is not treated as authoritative merely because it has a chunk ID.

Readable rendering of the full candidate quotation:

> [V2 7070] The system shall provide volume, restraint, accommodations, environmental control (e.g., vibration, lighting, noise, and temperature), and degree of privacy for sleep for each crewmember, to support overall crew health and performance.

The exact canonical bytes, including four line breaks and whitespace, are in `CANONICAL_EXCERPT.txt` and `RULE.json`. This rendered paragraph does not replace the canonical string. The future bounded answer would consist solely of that complete canonical quotation and trusted source/citation metadata. No generated scientific explanation or shortened quotation is proposed.

## Proposed positive relationship

Question: **What environmental accommodations must a spacecraft system provide for crew sleep?**

Proposed relationship for independent assessment: the complete requirement directly addresses the requested system sleep accommodations. Initial eligibility is limited to **this exact literal wording**, not automatic semantic matches, normalization, related questions or paraphrases. Different wordings require a revised, re-reviewed specification. Approval of this relationship would be a bounded research relevance judgment, not approval of arbitrary generated answers.

The source role is `formal_requirement`, with source-research-only scope. It is a system-design shall statement; it does not certify ASTRA or establish a personal medical threshold. Preserve every element below:

| Source element | Required handling |
|---|---|
| **The system** | Retain the system-design subject. Do not infer which system has complied. |
| **shall provide** | Preserve normative force. Do not convert it into a recommendation, measurement or completed action. |
| volume, restraint, accommodations, environmental control, degree of privacy | Preserve the complete required provision list; do not reduce it to only the parenthetical examples. |
| **e.g.** vibration, lighting, noise, temperature | Preserve the example qualifier. Do not claim an exhaustive environmental specification or infer numeric thresholds. Do not settle which controls are applicable merely from the list. |
| **for sleep for each crewmember** | Retain sleep context and individual crew-member coverage. Do not turn it into a crew-average allowance. |
| **to support overall crew health and performance** | Preserve the purpose; do not assert guaranteed clinical outcomes or a treatment effect. |

There is no reviewed support for additional facts, units, conditions, populations or personal recommendations. A request containing an excluded or unresolved obligation must abstain as a complete answer, even if part of it overlaps the quotation.

## Boundary examples — proposed judgments for review, not approved labels

| Category | Question | Proposed handling and reason |
|---|---|---|
| Positive | Exact accommodations question above | Complete canonical quotation/citation only, conditional on authentic rule review and later implementation approval. |
| Negative | What numeric vibration limit in hertz is specified by NASA's system sleep-accommodation requirement? | ABSTAIN: this passage gives no numeric frequency, limit comparator or conditions. Requirement7070 is an identifier. |
| Negative | What numeric noise limit in dB is required for sleep? | ABSTAIN: no numeric dB value here. |
| Negative | What quantitative vibration exposure threshold and duration does V2 7070 specify? | ABSTAIN: no quantitative threshold or duration here. |
| Negative | Does ASTRA comply with V2 7070 and already provide these accommodations? | ABSTAIN: no implementation/compliance evidence. |
| Negative | What personalized medical recommendation or treatment does this requirement establish for an astronaut? | ABSTAIN/outside scope: no individual clinical or treatment support. |
| Ambiguous | What is the vibration limit? | ABSTAIN: quantity, unit, conditions and intended source scope unresolved. |
| Ambiguous/mixed | What sleep accommodations and numeric vibration limits must the system provide? | ABSTAIN as a complete answer: do not conceal the unsupported numeric part with a related quote. |
| Ambiguous/broader paraphrase | Does this mean environmental controls guarantee healthy crew performance? | ABSTAIN: normative purpose is not a guarantee or a reviewed broader paraphrase. |

`RULE.json` contains all nine example records. Their status remains pending. They are engineering-proposed scope controls using seen material, not independent evaluation cases or evidence of generalization.

## Why citation validity is insufficient

A source hash, page/span and exact quotation can prove attribution. They do not prove that the quotation supplies the facts requested by a question. This qualitative accommodations requirement remains the same authentic quotation when paired with an unsupported Hz question. The presence of the word vibration cannot create a missing numeric limit; a valid ID or model selection cannot establish relevance. No conclusion about other NASA requirements follows from absence in this span.

N14-02 attribution validation remains mandatory and unchanged. N15-10's numeric veto and unknown-relevance abstention must remain effective. There is no scientific entailment authority in lexical scores, Qwen output, a test expectation or a supplied rule identifier. This packet activates none.

## Questions requiring the reviewer's actual judgment

1. Does the preserved original/version and surrounding section support the quoted text and stated source role? Check the original page rather than only these excerpts.
2. Does the exact positive question ask for the same system provisions addressed by V2 7070, without implying numerical limits, implementation or clinical claims?
3. Is returning the full requirement a direct, appropriately bounded answer to that wording? Identify any ambiguity in “environmental accommodations” versus the complete provision list.
4. Are shall, e.g., the complete provisions, for each crewmember, sleep context and purpose preserved without adding implications?
5. Is any material applicability condition, definition, caveat, cross-reference or surrounding context missing? If so, REQUEST CHANGES; do not silently extend the source span or infer an answer.
6. Are all negative/ambiguous cases correctly excluded for this exact span? Distinguish missing support from a statement being scientifically false.
7. Are the rights/attribution scope and technical-standard versus scientific-finding distinction accurately presented? Report uncertainty.
8. Is the rule narrow enough for literal matching and a canonical-quotation-only answer? Which additional safeguards are needed before implementation?
9. Can you APPROVE this exact relationship and complete response within the stated research-only limits, or should it be REJECTED or CHANGED? Supply a rationale, limitations and authentic dated sign-off.

## Decision, disagreement and ownership procedure

Complete an external copy of `REVIEWER_FORM.json`. APPROVE means the reviewed bounded relationship is acceptable; REJECT means do not implement; REQUEST CHANGES leaves it unapproved. No decision, missing authentication, unresolved question or conditional approval is treated as unconditional approval.

If multiple reviewers disagree, preserve each original signed record and hash, identify the exact conflicting issues and obtain a **distinct independent qualified adjudicator** using `ADJUDICATION_FORM.json`. Do not majority-vote, discard a dissent or let the author self-adjudicate. The adjudicator checks the same source/rule/packet hashes and states the resolution/rationale. Unresolved disagreement blocks owner acceptance. Any changed scope, answer or qualifier requires a new revision/hash and renewed affected reviews; prior approvals do not transfer.

The owner/custodian authenticates identity/competence/independence and sign-off evidence through an agreed channel, verifies all hashes, and records acceptance in an external copy of `OWNER_ACCEPTANCE_FORM.json`. Neither a filled JSON form nor a checksum authenticates a person or professional decision. Keep originals, revisions, disagreements and owner records durably. This process is not clinical or NASA endorsement, and does not close N07/N13/N14 or N15 acceptance requirements.

Only after authentic review, resolved objections and owner acceptance could a **separately approved non-generative implementation** add one finite exact-question rule with pinned source/role/scope and full-quotation output. Unknown wording, all listed exclusions, altered evidence and unresolved numeric/qualifier obligations must still fail closed. No inference, prompt promotion, live Health Agent, telemetry or N16 work is implied.
