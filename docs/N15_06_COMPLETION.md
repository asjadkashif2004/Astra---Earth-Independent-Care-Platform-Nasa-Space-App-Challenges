# N15-06 — constrained JSON selection: structural PASS, research answer ABSTAIN

Date: **2026-10-27 Asia/Karachi**. **One conditional constrained generation completed, exit0. Structural validation PASS; model selected ABSTAIN.** No quotation or supporting citation was returned. The positive live quotation gate remains OPEN. No retry, forced SELECT, JSON repair, parser relaxation or grammar/prompt change followed the output.

**N15 In Progress, not Complete; N16 Not Started.** All other statuses, original dependencies and N07/N13/N14 independent scientific/medical reviews remain unchanged. No application, Health Agent, Scenario Lab, monitoring or telemetry integration.

## Exact mechanism and compatibility evidence

Used the unchanged pinned llama.cpp v0.7.0/b11669/commit620d2225cc436ab0b001e3200e590e3b286ef9ab with **--grammar** and ordinary GBNF, supplied as one argv value. No additional native library, grammar file in the sandbox, JSON-schema converter or llguidance runtime. Native whitelist remains17files plus existing notices/model.

The previously preserved official completion README at that exact commit documents --grammar/--grammar-file. Its original SHA3603dfe848d32bfe6c6566a28cdb18802b5d60c4cc988142eec240da6ad58cb6 matches its acquisition receipt. Static inspection of the admitted common library shows the option/sampler linkage; admitted libllama contains its compiled GBNF parser/sampler and the call to llama_grammar_init_impl. This supported one conditional attempt, not prior native parser execution or comprehensive security certification. The actual one run subsequently accepted the argument, exited0, and produced text in the exact finite language. No separate help/version/grammar probe was executed. [Qualification](../artifacts/n15-06-20261027/static-qualification.json), [symbols](../artifacts/n15-06-20261027/llama-symbols.txt), [call inspection](../artifacts/n15-06-20261027/sampler-disassembly.txt).

The unchanged strict parser requires **decision plus evidence_ids**; those two existing keys are retained. No singular evidence_id alias, new field, arbitrary citation or schema migration. The183-byte concrete grammar allows exactly these two complete ASCII JSON objects:

    {"decision":"SELECT","evidence_ids":["window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84"]}
    {"decision":"ABSTAIN","evidence_ids":[]}

It is one root rule containing two escaped string terminals separated by an alternation. No recursion, repetition, regexes, free-form strings, source instructions or extra whitespace/commentary productions. The ID is derived exclusively from actual bounded canonical retrieval. Grammar SHA-256: **d6e32d1a74bf8526a6e48ad05e2025c9ef2c7a96425631e890db7bf7ee22f09e**. JavaScript and Python independently construct identical bytes; Python binds the ID list to the saved actual retrieval before native execution. The native command's grammar value matches the frozen SHA. [Frozen specification](../artifacts/n15-06-20261027/frozen-spec.json), [grammar](../artifacts/n15-06-20261027/live/selection-grammar.json).

## Minimal implementation and QA

Added [grammar.mjs](../services/research-answer/grammar.mjs), [grammar tests](../tests/research-grammar.test.mjs) and [demo specification](../data/research/n15-06/demo-plan.json). Narrow changes to the existing [CLI](../scripts/n15-research-answer.mjs), [runtime runner](../scripts/n15_research_runtime.py) and [static runner tests](../tests/n15_research_runtime_test.py) add explicit N15-06 mode, task-specific resource records, independent grammar reconstruction, --grammar argument and strict finite-language output check. Original CLI/runner source snapshots retained. No dependencies installed or changed.

**services/research-answer/selection.mjs is byte-for-byte unchanged**, including its strict parser and quotation resolution. N14 retrieval/claim contract/index/vectors remain unchanged. The model still supplies only a selection; canonical source, full quotation, role, scope, original/page/span/base-chunk provenance come only from trusted N14 data. Similarity/grammar validity never establishes entailment or scientific truth.

**76/76 focused non-generative tests PASS:**66Node (13new grammar controls plus53existing workflow/claim controls) and10Python (three added grammar guards plus seven prior runner controls). Syntax checks pass. Controls cover valid selection/empty abstention, singular/unknown/duplicate IDs, extra/duplicate keys, invalid/surrounded JSON, source/grammar injection, exact canonical quotation binding, closed resource gate and mock timeout/missing-model failures. Positive literal controls ACCEPT; reject-everything remains invalid QA. No tests execute the acquired runtime. Independent finite-terminal parsing and Python literal fixtures check grammar structure without claiming to be a second native GBNF implementation. [QA record](../artifacts/n15-06-20261027/focused-tests.json).

## Actual single demonstration

Same seen question as N15-05: **What environmental accommodations must a spacecraft system provide for crew sleep?** Unchanged rich lexical top1/minimum3 retrieves sleep-accommodation-requirement from the existing33units. The922-byte prompt, candidate and snapshot SHA are unchanged; only the constrained-output mechanism is added. No new ranking/evidence/question-label experiment or fresh-held-out claim.

Retrieved input: NASA-STD-3001 Volume2 RevisionF, section7.9.1/V2 7070, physical PDF page index134, formal_requirement; original SHAa09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f. Its scope is system-design guidance, not individual medical advice or ASTRA compliance. These are input provenance details, **not a citation returned by the abstained answer**.

Actual stdout:

    {"decision":"ABSTAIN","evidence_ids":[]} [end of text]

The exact known pinned CLI suffix was removed by the unchanged transport handling. Finite-language membership and the unchanged strict JSON parser both **PASS**. Final answer **ABSTAIN — model_selected_abstention**, **0returned quotations and0supporting citations**. Canonical quotation construction did not run for an empty selection. Its positive path is verified by focused controls, not passed off as this live result. [Answer](../artifacts/n15-06-20261027/live/answer.json), [raw output](../artifacts/n15-06-20261027/live/runtime/generation/native.stdout), [structural verification](../artifacts/n15-06-20261027/live/constrained-output-verification.json), [assessment](../artifacts/n15-06-20261027/assessment.json).

The model abstained on a technically supported question. Its reason and general selection competence were not established. Structural success does not validate relevance, scientific accuracy, paraphrase entailment, clinical safety or autonomous decision-making. No grammar/prompt change or another generation was attempted to obtain a positive answer.

## Integrity, resources and isolation

Reused exact Qwen2.5-0.5B-Instruct Q4_K_M revision9217f5db79a29953eb74d5343926648285ec7e67,491,400,032bytes/SHA74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db, approved llama.cpp archive, staged libgomp/fixed zlib, backend FILE and notices. Full model/three original artifact/17native hashes pass before release; actual read-only bound identities checked again. No model/runtime acquisition or payload copy into ASTRA. Prior G current-advisory/source-to-binary/redistribution uncertainties remain.

Actual H/C-derived private PID/mount/net namespaces, cleared environment/capability drop/null stdin and socket/io_uring/x32-denying seccomp passed. Root/model/native files read-only; only owned temp paths writable. No ASTRA/source/database/telemetry/credential/user/host-library/cache paths exposed, no host routes. Haswell backend plus exact fixed zlib/libgomp initialization verified; no older host fallback. Native wrapper reaped/privatePID1 absent, observers stopped/owned processes0. [Containment](../artifacts/n15-06-20261027/live/runtime/generation/containment-preflight.json), [native result](../artifacts/n15-06-20261027/live/runtime/generation/native-result.json), [cleanup](../artifacts/n15-06-20261027/live/runtime/generation/cleanup.json).

N15-06-only Choice B: monitored1.5GB/1.35GB stop with acknowledged possible transient overshoot, model-processRSS2GB, CPU only/network0/downloads0, one120s native command. Same two threads/context2048/output192/no warmup/no context shifting. [Frozen native command](../artifacts/n15-06-20261027/live/runtime/generation/frozen-execution.json).

| Measurement | Actual |
|---|---:|
| Native requests / exit |1 /0|
| Native loading+generation wall time |7.116744922s;120s not reached|
| Runtime load counter |3799.59ms|
| Prompt evaluation |3797.55ms /230tokens /60.57tokens/s|
| Decode evaluation |656.27ms /15runs /22.86tokens/s|
| Native sampled VmHWM peak |616,169,472bytes, approximately587.6MiB|
| Kernel command-tree RSS maximum |644,726,784bytes; includes wrapper/pre-exec|
| Runtime phase / whole CLI |213.734455s /214.823775s, including static verification|
| Phase final allocated counted storage |610,955,264bytes|
| Downloads / actual network requests |0 /0|
| Accounting failures / owned processes remaining |0 /0|

Runtime load/prompt counters may overlap; do not sum them into command time.15decode runs are native counters, not an independent visible-text/EOS count. Controller kernel lifetimeRSS622,874,624bytes is separate from native measurements. Supervisor observation gaps reached20.467889s because of scanning/I/O; native227post-release samples had a maximum0.027172s gap. No continuous sampling or hard disk quota claim. Hard2GB address-space guard, RSS/headroom precautions and independent native deadline remained. No limits were changed. No live timeout/missing-model fault or robust cold/warm benchmark was conducted.

## Closure limits and one next proposal

Task baseline and protected SHA records distinguish the three authorized existing-file changes (CLI, runner, runner tests) from untouched originals. Historical artifacts, all N04 evidence, research originals/33units/index/vectors/rankings, N14 contract and strict selector/parser are preserved. Frozen final sources/grammar/plan remain unchanged after generation. New evidence is separate; original scratch **/var/tmp/astra-n15-06-yDFTlW** remains intact. Final preservation/accounting records accompany the assessment.

This single run passes structural qualification, not broader selection reliability. Positive live quotation selection, independent scientific/medical approval, N15 full supported-output/failure/performance gates and N16 prerequisites remain open. All other statuses/reviews are unchanged; N04 Complete/N03 Partial/N05–N06 Deferred/AC-20 Open / Unverified.

**Smallest next proposed task, separate approval required:** a tiny predefined selection-relevance/abstention diagnostic over technically reviewed supported and unsupported cases, keeping this grammar mechanism, strict parser and canonical citation contract frozen. Fresh explicit resources; no forced SELECT, new model/download, ranking changes or integration. Do not infer a cause for abstention from these two seen runs. N16 additionally remains gated by N10/N12 and its full dependency/review branch.

**STOP. N15 In Progress; N16 Not Started. N15-06 resource permission expires at delivery.**
