# N15-05 — offline research-selection CLI and strict evidence grounding

Date: **2026-10-27 Asia/Karachi**. **Implementation delivered; main demonstration ABSTAIN / positive live quotation gate remains OPEN.** Exactly one real Qwen generation ran, exit0, with verified containment/native loading. It returned the correct-looking retrieved window ID under the **wrong JSON field**. No output repair, schema relaxation or further generation occurred.

**N15 In Progress, not Complete; N16 Not Started.** N07/N13/N14 review obligations and every other module status remain unchanged. This is a research-only CLI, isolated from ASTRA's application/Health Agent/Scenario Lab; no diagnosis, personal health interpretation, medical approval or operational authority.

## Implemented behavior and files

- [selection.mjs](../services/research-answer/selection.mjs): bounded question/scope checks, unchanged rich lexical top1 retrieval, canonical readiness/quotation checks, JSON-data prompt, strict SELECT/ABSTAIN parser, retrieved-set-only ID resolution and canonical quotation assembly through unchanged [N14-02](N14_02_CONTRACT.md). Complete quotes are never truncated; model text never supplies citation/source/role/scope/page/hash values or a verified paraphrase.
- [n15-research-answer.mjs](../scripts/n15-research-answer.mjs): separate offline CLI, preserved request/raw output/result, bounded owned subprocess, cancellation/resource-error propagation and explicit fail-closed ABSTAIN. Imports the existing corpus/index verifier and lexical rank without modifying them.
- [n15_research_runtime.py](../scripts/n15_research_runtime.py): reuse-only CPU runner, one-shot reservation, exact cached model/native hashes and notices, corrected backend FILE, pinned C/H sandbox-function reuse without old setup/main, dynamic-loader identity proof, durable accounting, native120s timer, hard2GB address space and sampled precautions. Source/notice paths may differ only when samefile proves identical inode and all other hash/destination/metadata fields match; no alternate provider accepted.
- [Node tests](../tests/research-answer.test.mjs), [static Python tests](../tests/n15_research_runtime_test.py), [frozen demo cases](../data/research/n15-05/demo-plan.json), [plan](N15_05_PLAN.md) and separate evidence/documentation. **No dependencies or application package changes.**

The output contract is exactly `{ "decision": "SELECT", "evidence_ids": ["<retrieved canonical window ID>"] }`, or ABSTAIN with an empty array. Reject unknown/duplicate fields, prose/fences, malformed/oversized output, absent/fabricated/nonretrieved IDs and altered canonical metadata. Only the exact known pinned completion CLI terminal suffix can be removed; raw stdout is preserved. Every accepted quote must retain original/page/span/base-chunk hashes, source ID, canonical role and complete research scope/qualifiers through the unchanged N14-02 checker. Literal attribution never certifies question relevance, scientific truth or clinical applicability.

## Frozen demonstration and actual result

[Final pre-generation freeze](../artifacts/n15-05-20261027/frozen-spec-final.json) pins the code, question, top1/minimum3 lexical policy, existing33units/34spans and limits. Earlier preparation versions remain preserved. There is no new held-out/generalization claim or relabeling of the existing40provisional expectations.

Question: **What environmental accommodations must a spacecraft system provide for crew sleep?**

The unchanged baseline retrieved `sleep-accommodation-requirement`, window **window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84**. Source input was NASA-STD-3001 Volume2 RevisionF, section7.9.1/V2 7070, physical PDF page index134, role formal_requirement. The input source original SHA is a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f; UTF-16 span1248–1499/full text hash64c1af1ee12fb4398813fcaac40a883a603d4359e95807f51775180b011f92e1. Its scope is a system-design requirement, not ASTRA compliance or a personal medical threshold. **This describes retrieved input provenance, not supporting evidence returned by the rejected main selection.**

Actual generated stdout contained:

    {"decision": "SELECT", "evidence_id": "window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84"} [end of text]

The model used singular **evidence_id** containing a string instead of **evidence_ids** containing an array. Even though the value matches the retrieved ID, the frozen parser rejected it. Final answer: **ABSTAIN — malformed_or_untrusted_model_output**, **zero returned quotations/supporting citations**. This is not missing/corrupt evidence or a native inference failure. No arbitrary generated explanation was exposed as a verified conclusion. [Answer](../artifacts/n15-05-20261027/live/answer.json), [raw completion](../artifacts/n15-05-20261027/live/runtime/generation/native.stdout), [assessment](../artifacts/n15-05-20261027/assessment.json).

One earlier controller invocation failed **before any native process was created**, because the reused sandbox generator needed a missing stdlib struct import. It returned ABSTAIN and was preserved. The import was corrected within the authorized implementation, with a new recursive static global-dependency check/regression before the one actual native generation. Both scratch directories remain counted; no native retry occurred. [Prior failure](../artifacts/n15-05-20261027/pre-native-failure/runtime/report.json). Runtime success is not the same as a successful validated research answer.

## Focused verification

**53/53 Node tests**:20new research workflow controls +33unchanged N14-02 contract controls. **7/7 non-native Python controls**, including frozen-source identity, containment-function/global completeness, exact layout/samefile requirements and resource policy. Source syntax checks pass. Prior unchanged accounting/backend QA is reused. Positive complete-literal controls ACCEPT; reject-everything fails existing N14 QA. Main-schema rejection and conservative negatives do not certify medical safety or generalization.

| Case | Execution and observed result |
|---|---|
| Supported research question | One actual isolated Qwen request, positive decode; ABSTAIN on invalid schema. Live positive quotation gate remains open. |
| Insufficient corpus support | Actual canonical preparation/fixtures, no model; ABSTAIN/no eligible retrieved evidence. |
| Unsupported diagnosis/treatment | Actual canonical preparation/fixtures, no model; ABSTAIN/outside research scope. |
| Injection in retrieved text | Independent fictional source fixture; ABSTAIN before execution. No NASA source changed. |
| Fabricated/nonretrieved ID | Deterministic mocks; ABSTAIN. Canonical IDs never excuse missing bindings/roles/scope. |
| Timeout/malformed output | Mock timeout/process failure plus actual malformed completion; ABSTAIN. Live timeout/missing-model/crash fault injection was not run. |

[Node results](../artifacts/n15-05-20261027/focused-1.txt), [final Python results](../artifacts/n15-05-20261027/focused-python-corrected.txt). No broad suite, browser, acquisition, embedding, ranking or additional model benchmark.

## Model, isolation and resource measurements

Unchanged Qwen2.5-0.5B-Instruct Q4_K_M, revision9217f5db79a29953eb74d5343926648285ec7e67,491,400,032bytes/SHA74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db. Unchanged llama.cpp v0.7.0/b11669/620d2225cc436ab0b001e3200e590e3b286ef9ab,17native-file whitelist/fixed zlib/libgomp/Haswell backend. All3original hashes/full model/native hashes pass. Original model remains outside ASTRA, never recopied or downloaded.

Full argv/prompt/environment are in [frozen execution](../artifacts/n15-05-20261027/live/runtime/generation/frozen-execution.json). Direct approved loader/cache disabled; CPU layers0/two threads/context2048/output192/greedy/no warmup/no context shifting. The prompt was922UTF-8 bytes. No grammar or output-schema repair was applied after seeing the completion.

Actual gated sandbox verified17native+14notice+model read-only identities, private PID/mount/net namespaces, cleared environment/capability drop/null stdin, no operational/source/credential/user/host-library/cache paths, no host routes, seccomp socket/io_uring/x32 denial. Backend and exact fixed-zlib/libgomp initialization pass, no old host fallback. [Containment](../artifacts/n15-05-20261027/live/runtime/generation/containment-preflight.json), [native result](../artifacts/n15-05-20261027/live/runtime/generation/native-result.json).

| Measurement | Actual |
|---|---:|
| Actual native generations / exit |1 /0|
| Native loading+generation command wall time |9.652365192s; no120s timeout|
| Runtime reported load time |3827.21ms|
| Prompt evaluation |3822.26ms /230tokens /60.17tokens/s|
| Decode evaluation |4021.39ms /71runs /17.66tokens/s|
| Observed native VmHWM peak |615,993,344bytes, approximately587.46MiB|
| Kernel command-tree RSS maximum |615,636,992bytes; includes wrapper/pre-exec|
| Corrected runtime phase / whole corrected CLI |149.191159s /150.309440s, including static hashing/containment|
| Prior pre-native controller phase |130.483733s;0native commands|
| Corrected phase final allocated counted storage |608,333,824bytes; includes retained earlier task scratch|
| New downloads / actual network requests |0 /0|
| Accounting errors / owned native processes remaining |0 /0|

Runtime load/prompt counters may overlap; do not add them to infer wall time.71runs prove autoregressive execution, not an independently tokenized visible-text/EOS count. Controller kernel lifetime peak622,874,624bytes is separate from actual model observations. Sampling is not continuous: supervisor max gap13.901338s/native max gap1.264375s,343native samples. Hard2GB address space, sampled1.8GB precaution/headroom guards and independent native timer remained. No hard disk quota or comprehensive resource-performance certification. [Resources](../artifacts/n15-05-20261027/live/runtime/report.json), [cleanup](../artifacts/n15-05-20261027/live/runtime/generation/cleanup.json).

## Preservation, limitations and next approval

Source/data/index/vectors/rankings/original publication and historical-evidence preservation is checked separately against the task baseline. New corpus/curation/embedding/monitoring/alert/scenario/graphics/operational integration changes: **none**. Only the new research CLI/modules/tests/plan, small evidence and governance documentation. Frozen final code/plan hashes still match after inference. Retain both scratch roots and all failed/successful records; no cleanup of historical artifacts.

N14-02 remains literal-only, independent relevance/entailment/scientific/medical review pending. The selected top1 passage and correct-looking ID do not override an invalid output contract. The1-case model selection reliability has not passed; one successful native run is not a cold/warm benchmark, robust cancellation/crash/missing-model proof or production readiness. Known G advisory/source-to-binary/redistribution uncertainties and all original module gates remain.

**One smallest next task, requiring separate approval:** qualify bounded constrained JSON selection for this pinned runtime (for example a minimal supported grammar), preserve the strict parser/N14 semantics, then permit one cached-artifact offline trial under fresh resources. No downloads or application integration. Do not silently change the schema to fit this observed response. N16 additionally remains gated by N10/N12 and the documented prerequisite/review branch; this delivery does not bypass it.

**STOP. N15 In Progress; N16 Not Started. N15-05 resource permission expires at delivery.**
