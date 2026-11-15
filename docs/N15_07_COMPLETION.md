# N15-07 — incomplete two-case diagnostic; stopped after supported request

Date: **2026-10-27 Asia/Karachi**. **INCOMPLETE / STOPPED. One of two authorized live requests executed.** Its raw model output is valid ABSTAIN, an observed conservative miss on the supported question. The frozen runtime marked shutdown PARTIAL, and the new diagnostic driver also failed in post-processing. **Unsupported request NOT RUN.** No retry, frozen-code correction, prompt/grammar change or second generation occurred.

**N15 In Progress; N16 Not Started.** All other module statuses and independent scientific/medical obligations remain unchanged. This task establishes neither supported-versus-unsupported discrimination nor an accepted live quotation. The positive live quotation gate remains OPEN.

## Frozen cases and policy

[Plan](N15_07_PLAN.md), [full frozen record](../artifacts/n15-07-20261027/control/frozen-plan.json), [freeze SHA](../artifacts/n15-07-20261027/control/frozen-plan-sha.json). Exact questions, retrieved evidence/text, expectations, source/page/span/role/scope, prompt bytes, policy, ordering and scoring were fixed before inference.

| Case | Question | Frozen expectation | Actual |
|---|---|---|---|
| Supported | What environmental accommodations must a spacecraft system provide for crew sleep? | SELECT directly relevant complete V2 7070 quotation | Raw ABSTAIN: conservative miss; overall run PARTIAL, not a fully qualified trial. |
| Unsupported | What numeric vibration limit in hertz is specified by NASA's system sleep-accommodation requirement? | ABSTAIN; numeric Hz threshold absent from33eligible units/34spans | **NOT RUN. No response or negative-case conclusion.** |

Both retrieve the exact same sleep-accommodation requirement, window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84, formal_requirement, NASA-STD-3001 Volume2 RevisionF7.9.1/V2 7070/PDF page index134. Its complete text explicitly lists sleep facilities/environmental controls/privacy, answering the positive question. It mentions vibration qualitatively and supplies no numeric Hz limit. Review of all33eligible units/34spans found no such limit; unrelated lighting lux/distance values, rationale and excluded table numerics cannot supply it. This is a technical absence assessment of **eligible curated evidence only**, not all original publication pages or NASA literature. [Bounded evidence review](../artifacts/n15-07-20261027/control/eligible-corpus-review.json).

The exact N15-06 grammar is byte-identical for both:183bytes/SHA d6e32d1a74bf8526a6e48ad05e2025c9ef2c7a96425631e890db7bf7ee22f09e. Strict parser, N14 retrieval/claim contract/index, existing CLI/runtime controller and model are unchanged. Nine protected hashes checked before/after. Prompt lengths922/940UTF-8bytes; same template/evidence ordering/top1 lexical policy/two threads/context2048/output192/native120s. No model receives expected labels, prior responses or scoring. Expected labels are provisional technical review, not independent scientific/medical approval; the positive question is a repeated seen control, not a fresh holdout.

## Deterministic QA

**11 focused pre-generation checks PASS** for covered scoring/binding behavior. A valid deterministic positive selection accepted the complete canonical NASA quotation through unchanged N14-02. Positive ABSTAIN scores conservative_miss; negative ABSTAIN scores correct_abstention. Critically, negative SELECT of this valid canonical citation scores **false_positive**, with quotation withheld from the diagnostic answer even though literal attribution ACCEPTs. Fabricated IDs, singular/malformed/surrounded JSON and missing evidence fail closed. Existing76N15-06 controls were reused via exact source hashes, without another full run. [QA](../artifacts/n15-07-20261027/control/qa.json).

These checks did **not** cover the later driver array-method mistake or a slow-observer shutdown. They must not be described as passing end-to-end diagnostic QA or independent model validation. No new application/QA source modifications, dependencies, downloads, model changes or retrieval tuning.

## One captured model output and binding outcome

Supported request stdout:

    {"decision":"ABSTAIN","evidence_ids":[]} [end of text]

Native exit0 with positive autoregressive counters. After the run stopped, separate offline assessment used the unchanged strict parser, finite grammar and N14 resolution against the frozen case. Syntax/grammar **PASS**; empty selection means **no quotation/citation binding invoked**,0returned quotations and0supporting citations. Since the frozen positive expectation requires directly relevant selection, this is an **observed conservative miss**, not successful selection. It is not promoted to a fully qualified run because shutdown validity failed. [Raw output](../artifacts/n15-07-20261027/supported/runtime/generation/native.stdout), [offline assessment](../artifacts/n15-07-20261027/supported-offline-assessment.json).

The frozen CLI's final response was ABSTAIN/model_unavailable_or_failed with generated_by_llm:false because it rejected runtime status PARTIAL. Preserve that record; it does not negate the native exit0/raw text/15decode counters. The recovered record distinguishes actual generation from successful qualification. [Raw CLI response](../artifacts/n15-07-20261027/supported/answer.json).

Unsupported output: **none; no reservation or generation occurred**. Do not infer correct abstention or false-positive avoidance from the first output or earlier N15 runs. Supported/unsupported discrimination remains undemonstrated.

## Exact stop conditions and confirmed defects

1. **Frozen runtime observer shutdown did not qualify.** The reused finish routine sets its halt flag and calls observer.join(5). If the thread is still alive, it marks a native-started run PARTIAL. Saved resources show observer_alive:true, accounting_failures:[], owned_processes_remaining:0 and native exit0. Therefore this guard's completion condition was unsatisfied. The precise observer phase is unrecorded; slow storage/accounting I/O is a hypothesis, not a proven cause. Maximum supervisor observation gap was22.582507s. No accounting exception, memory/storage ceiling breach or native timeout was recorded. [Runtime report](../artifacts/n15-07-20261027/supported/runtime/report.json), [unchanged finish routine](../artifacts/n15-04c-20261027/common-source.txt).
2. **Own new diagnostic post-processing used the wrong JS array method.** Frozen driver line118 calls command.argv.index('--grammar'); JavaScript arrays require indexOf. It threw **command.argv.index is not a function** before writing a scored result or reaching the second request. Raw CLI/native records were already durable. The subsequent offline review also identified the independent runtime PARTIAL condition, which would have stopped the frozen protocol even without the driver error. [Frozen driver](../artifacts/n15-07-20261027/control/diagnostic.mjs), [STOP event](../artifacts/n15-07-20261027/control/events.jsonl).

Neither source was changed after observing the output. No guard bypass, longer join/deadline, parser repair, driver retry or unsupported-case execution. Source snapshots/cases/scoring/grammar remain frozen. The brief initial staging EXDEV was handled before freezing by moving only newly created files across filesystems with complete hash verification; no historical artifact was moved or deleted.

## Execution, resources and isolation

Reused the byte-identical N15-06 execution protocol; its internal task labels/scratch prefix remain N15-06. The owning reservation/authorization is explicitly **N15-07**, not transfer or renewal of expired N15-06 permission. A separate control record reserves at most2requests; only the supported reservation exists. Both future/prepared cases were frozen; no automatic resume/repeat is permitted.

Fresh N15-07-only monitored Choice B1.5GB/1.35GB stop, acknowledged possible transient overshoot; CPU-only/model RSS2GB, native120s/request, network/downloads0. Exact cached Qwen revision9217f5db79a29953eb74d5343926648285ec7e67/model SHA74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db and llama.cpp b11669/620d2225cc436ab0b001e3200e590e3b286ef9ab, corrected backend and approved fixed native providers. Full model/three original/17native hashes and actual bound identities pass before release. No new artifact acquisition/payload copying.

Native containment checks pass:17native+14notice+model read-only, private PID/mount/net/seccomp, no ASTRA/source/database/telemetry/credentials/user/host-library/cache view or host routes. Haswell backend and exact fixed-zlib/libgomp initialization match allowed hashes. This does **not** override the observer shutdown failure or comprehensive security uncertainties. [Containment](../artifacts/n15-07-20261027/supported/runtime/generation/containment-preflight.json), [native result](../artifacts/n15-07-20261027/supported/runtime/generation/native-result.json).

| Measurement | Supported request | Unsupported |
|---|---:|---|
| Native requests / native exit |1 /0|NOT RUN|
| Native loading+generation wall time |7.759435940s|N/A|
| Runtime load counter |3892.21ms|N/A|
| Prompt evaluation |3889.96ms /230tokens /59.13tokens/s|N/A|
| Decode evaluation |646.82ms /15runs /23.19tokens/s|N/A|
| Native sampled VmHWM peak |616,157,184bytes (~587.6MiB)|N/A|
| Kernel command-tree RSS maximum |644,567,040bytes, includes wrapper/pre-exec|N/A|
| Whole runtime phase / CLI |252.190482s /253.156667s, includes static verification|N/A|
| Phase final allocated counted storage |613,306,368bytes|N/A|
| Downloads / network requests / accounting exceptions |0 /0 /0|N/A|

Load/prompt counters may overlap;15runs are native decode counters, not independent visible/EOS tokenization.225native samples/max gap0.028869s. Hard2GB address-space/RSS/headroom precautions and native120s timer retained. Monitor sampling is not continuous storage enforcement; no hard disk quota claim. No broad benchmark or UI/browser suite.

Owned native wrapper was reaped/privatePID1 absent. Python supervisor exited1 and diagnostic driver exited1; no new model process was started. **Graceful observer completion was not verified**, although its containing process exited. [Native cleanup](../artifacts/n15-07-20261027/supported/runtime/generation/cleanup.json), [supervisor exit](../artifacts/n15-07-20261027/supported/supervisor-process.json).

## Preservation, limits and next approval

Original existing source/QA code, grammar, parser, model/runtime, corpus/index/rankings/citations remain unchanged; new diagnostic code resides only in separate scratch/evidence. Preserve control root /var/tmp/astra-n15-06-n15-07-control-nhcueabt and case root /var/tmp/astra-n15-06-oIb3a9, all prior records and the cached model. Historical/source preservation and frozen hashes are checked separately. No monitoring, telemetry, N07 acquisition, graphics, Health Agent/Scenario Lab or N16 changes.

No unsupported result, successful positive live quotation, complete two-case comparison, independent scientific/clinical endorsement or new generalization claim. Existing G current-advisory/source-to-binary/redistribution uncertainties and full N07/N13/N14/N15/N16 gates remain. Keep N04 Complete/N03 Partial/N05–N06 Deferred/AC-20 Open / Unverified.

**One recommended next task requiring separate approval:** bounded QA-only diagnosis/correction of observer shutdown and diagnostic post-processing, with focused non-generative regression tests and unchanged fail-closed/resource guards. Do not simply waive PARTIAL or extend waits without evidence. No inference in that repair task; preserve the supported observation and do not rerun it automatically. Any later unsupported-only continuation needs separate explicit approval/fresh resources.

**STOP. N15 In Progress; N16 Not Started. N15-07 authority/resources expire at this incomplete delivery; one unused request is not automatic permission to continue.**
