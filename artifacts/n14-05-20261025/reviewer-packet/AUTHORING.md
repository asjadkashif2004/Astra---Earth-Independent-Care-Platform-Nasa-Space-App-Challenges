# Neutral question-authoring guide — version 1

Work only from the supplied eligible excerpts and their original-page context. Read the publications before creating wording. Do not paraphrase an earlier evaluation or use model-generated rankings, answers or query suggestions. Do not ask the engineering agent that saw prior questions to author new test questions. Record any prior exposure truthfully.

Create research questions in your own words, using realistic but general information needs within the supplied evidence. Vary wording and source-role distinctions without copying source wording merely to favor a particular search technique. Group related paraphrases under one `family`; families must be accounted for before any future split. Do not manufacture a patient, clinical label, numerical table interpretation, prevalence estimate or treatment recommendation.

For each case, use `case.template.json`:

- Assign a new `q-...` identifier and family. Fill your actual `author_id`, UTC `authored_at`, question, category, scope notes and coverage rationale. Record when the proposed wording was finalized; later edits require new version hashes and renewed decisions.
- `supported`: the eligible source text addresses the research question within its qualifiers. Expected response is `research_evidence_only`. Supply the minimal sufficient canonical references; do not pad with unrelated passages.
- `unsupported`: the eligible corpus cannot establish the requested answer. Expected response is `abstain`, with an empty expected-evidence list and a reason describing the missing information or excluded scope. Lack of support in this packet is not proof of a universal scientific negative.
- `ambiguous`: limitations, partial coverage, contradictory context or unresolved interpretation prevent an unqualified answer. Expected response is `abstain_or_state_limitations`. Record relevant references if available and explain the uncertainty; do not count these as ordinary positive recall cases.
- Copy each reference's complete `binding` from `evidence.json`. Add `relevance_rationale`, a nonempty `required_qualifiers` list, and `original_page_checked`. Do not invent identifiers, shorten canonical scope, or edit role/page/span metadata. Numerical table interpretations and individual diagnosis/prediction/treatment are excluded.
- Keep actual review decisions pending. Authors cannot approve their own labels. Submit finalized wording and expectations to the custodian without requesting any retrieval output.

Use `participant.template.json` for actual identity, role, affiliation and relevant qualifications. `exposure.old_questions` and `exposure.rankings_or_outputs` mean whether you have seen those materials, not whether you believe they influenced you. Unknown remains null. Sign-off references/hashes refer to actual retained records; do not invent signatures. Do not send personal secrets or medical information. This is scientific relevance review, not clinical validation.
