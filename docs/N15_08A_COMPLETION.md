# N15-08A — timer repaired; conditional diagnostic blocked by further QA failure

Date: **2026-10-27 Asia/Karachi**. **BLOCKED before inference.** The timer fixture correction removed the `.unref()` error. Mandatory QA then exposed an additional VM fixture dependency gap: `Buffer` is not supplied. **112/116 checks passed;4failed.** Under the explicit stop condition, neither live case ran; no additional fixture correction or test retry followed the mandatory failure.

N15 **In Progress**, N16 **Not Started**; all other statuses and full independent-review/security/dependency gates unchanged. [Plan](N15_08A_PLAN.md), [full QA output](../artifacts/n15-08a-20261027/qa-results.json), [read-only dependency diagnosis](../artifacts/n15-08a-20261027/dependency-diagnosis.json).

## Exact correction and preservation

Added [tests/n15-prompt-controller.test.mjs](../tests/n15-prompt-controller.test.mjs), copied from the preserved failed fixture. The numeric `setInterval:()=>1` is replaced by a Node-like handle with `unref()` returning itself. The fixture records unref calls, callback/interval, cancellation and the exact handle supplied to `clearInterval`; cancelled callbacks cannot fire. The original six assertion bodies are byte-identical, with no skips or weaker expectations. Two additional controls cover same-handle cancellation and memory-triggered active-execution abort.

The test can inspect the staged controller through `ASTRA_N15_QA_DRIVER`; its default source is the preserved N15-08 controller, so it no longer depends on a transient old pointer. Native execution remains mocked. The fresh controller's function body is byte-identical to the preserved controller except task-label metadata changing N15-08 to N15-08A. No timeout, resource threshold, cancellation, process-control or production behavior changed. The fresh QA admission wrapper requires all116controls, rather than the old incomplete78-only check. [Correction proof](../artifacts/n15-08a-20261027/control/correction.json).

The historical failed fixture, N15-08 blocked candidate and N15-07B baseline remain unchanged. No model, runtime, grammar, parser, prompt, scoring or N14 source was changed.

## Mandatory QA results

| Group | Passed / attempted | Result |
|---|---:|---|
| Original six controller controls |3/6|Positive selection, actual mock abstention execution, and timeout/missing-model execution controls failed.|
| Two added timer controls |1/2|Same-handle unref/cancellation passed; periodic active-abort control failed because mock execution was never reached.|
| Frozen prompt/selection/grammar/N14 controls |78/78|Passed; full literal positive and invalid/unsupported negative controls retained.|
| Observer lifecycle |20/20|Passed; shutdown/startup/crash/owned-child/persistence controls.|
| Static runtime |10/10|Passed; pinned containment definitions and unchanged execution limits.|
| **Total** |**112/116**|**Mandatory gate FAILED; no inference.**|

Commands:

```
ASTRA_N15_QA_DRIVER=/var/tmp/astra-n15-06-n15-08a-control-fj8cf0y9/driver.mjs node --test --test-isolation=none tests/n15-prompt-controller.test.mjs tests/research-prompt-experiment.test.mjs tests/research-answer.test.mjs tests/research-grammar.test.mjs tests/claim-assessment.test.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'n15_observer_lifecycle_test.py' -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'n15_research_runtime_test.py' -v
```

New fixture and staged driver syntax checks passed. No broad suite, browser, downloads or installs.

## Remaining failure: missing VM Node global

All four failing controls record mock execution count0 or an unexpected ABSTAIN. The staged controller constructs `sha256(Buffer.from(prepared.prompt))` before calling `executeLocal`. The fixture's `vm.runInNewContext` context supplies timers/process/AbortController and imported functions, but **omits Buffer**. Node's VM does not automatically provide that host global. A separate read-only isolated expression returned `typeof Buffer === 'undefined'` and `ReferenceError: Buffer is not defined`.

This confirms an additional fixture gap consistent with the observed pre-execution failures; it is not a captured model error or comprehensive proof that no other QA issues remain. The controller catches early callback errors as abstention, so the positive controls' demand for an actual execution/quotation prevents a reject-everything path from passing. Some negative assertions passed without establishing every intended execution path; the failed overall gate is not waived.

**No Buffer binding was added, no assertions were changed and no failed test was rerun after this result.** This task's conditional inference authority was not admitted. The QA-only read-only diagnosis did not execute the controller again or load any model/native library.

## Frozen experiment and absent live results

The original candidate SHA remains `eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401`. Policy **astra.n15-08.prompt.v1**, system SHA `ce7dcbc0ca55c768e9f53de39fb9dbde9d737af33f4141b9fd483e43ba4a60d7` unchanged. Supported/unsupported prompt bytes1239/1257, hashes respectively `c03a377f7777dce0aa1f1737d50dc31051c87c2a5f4f57d552bbd7b3611949cd` / `e2db3f509d2dc491ac8722406f0517d9137d54b5c8bbaaaa9949b2cad1aa65a9`; both original questions, evidence order/text/IDs, exact183-byte grammar, N14 ranking/binding, native settings and scoring are preserved.

| Case | Live output | Quotation/citation outcome |
|---|---|---|
| Supported |**NOT RUN**|No model-selected ID or returned quotation/citation.|
| Unsupported |**NOT RUN**|No new abstention or false-positive result.|

Zero model loading/native commands/live generations. Native timings, tokens, throughput, RSS, actual new sandbox/loader/cleanup measurements are **NOT MEASURED**. Do not reuse earlier N15-07B measurements as this task's evidence. No run/case reservation or admitted live overlay was created. Discrimination and the positive live quotation gate remain open; the prompt's effect is unknown. No scientific/clinical/generalization or production-readiness claim.

## Resources and preservation

Fresh N15-08A-only monitored Choice B1.5GB/1.35GB stop,2GB model RSS/native120s/CPU-only, network/downloads/installations0 was approved. Cached four original packages/model,17native files and14notice identities were statically reverified, but no actual native sandbox was started. Preserve scratch `/var/tmp/astra-n15-06-n15-08a-control-fj8cf0y9`, all old scratch/model/evidence and [new records](../artifacts/n15-08a-20261027).

The only added project QA source is the new test fixture; no existing source/QA/production file was changed. The staged driver alters only necessary QA admission/provenance and task metadata. Preservation and conservative static disk totals are recorded separately from unavailable native measurements. All original N07/N13/N14 reviews/full-module gates, N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified and other statuses remain intact.

Documentation updated: this report, N15_08A_PLAN, AGENTS, MODULE_TRACKER, MASTER_PLAN, SESSION_HANDOFF, DECISIONS (ADR-059), FEATURE_AUDIT, CORE_AI_PRIORITY and DE_N14_N15_01. Prior task reports and outcomes remain historical.

## One next action

Separately approve completing the test VM's explicit standard-Node dependency bindings, starting with **Buffer**, while keeping controller behavior/assertions and the frozen candidate unchanged. Audit the remaining controller dependencies, rerun the full mandatory suite, and permit the same two cases only conditionally under fresh explicit resources. Do not weaken positive controls, infer model incompatibility or change the prompt based on fixture failures.

**STOP. N15-08A is blocked at mandatory QA; its task/resource authority expires at delivery. Neither unused generation is automatic continuation permission.**
