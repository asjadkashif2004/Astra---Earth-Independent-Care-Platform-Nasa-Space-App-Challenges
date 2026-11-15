# N15-08B — VM bindings completed; frozen diagnostic fails combined relevance criterion

Date: **2026-10-27 Asia/Karachi**. **PARTIAL: QA and both native executions PASS; the two-case discrimination success criterion FAILS.** The model selects the canonical passage for both questions. The supported selection is relevant and canonically bound; the unsupported selection is a false positive. No retries, prompt revisions, output repairs or additional generations.

N15 **In Progress**, N16 **Not Started**, all other statuses and review/full-module gates unchanged. [Plan](N15_08B_PLAN.md), [assessment](../artifacts/n15-08b-20261027/assessment.json).

## VM defect, complete audit and exact corrections

The prior timer repair exposed the missing Node `Buffer` binding. This task audited the complete external-name set of the pinned controller: **25names**. The fixture now explicitly imports authentic `Buffer` from `node:buffer` and authentic monotonic `performance` from `node:perf_hooks`, replacing its earlier counter clock. Authentic Node AbortController is retained; Error/JSON/Math/Promise remain genuine VM language intrinsics. The audit is bound to a normalized controller-function hash; changed controller source requires a new dependency audit. Missing bindings fail by name before controller execution.

The sole project source change is [tests/n15-prompt-controller.test.mjs](../tests/n15-prompt-controller.test.mjs). All eight existing test bodies/assertions are byte-identical; three new tests verify genuine binding identity/completeness, missing-binding rejection and restricted API exposure. The separate task controller remains byte-identical except task metadata labels; no production timeout, resource threshold or process-control behavior changed. QA admission now requires all119checks, including the new binding controls.

**Reported test doubles:** controlled timer handle/cancellation, two process metric methods, memory-only filesystem functions, and mocked native execution remain intentional. There is no blanket copy of host globals. The VM has no exposed require/module/fetch/worker APIs or process environment/exit/kill/cwd/module-loading APIs. It compiles only pinned trusted controller source, never scientific text/model output. This test VM is not claimed to secure arbitrary untrusted JavaScript; actual model execution uses the separate OS sandbox. [Binding inventory and hashes](../artifacts/n15-08b-20261027/control/vm-binding-audit.json).

## Mandatory QA

**119/119 PASS, zero skipped, zero failures.**

| Group | Passed |
|---|---:|
| Controller, original assertions, timers and new binding audit |11/11|
| Frozen prompt, strict selection, GBNF and canonical N14 contract |78/78|
| Observer startup/shutdown, cleanup and accounting |20/20|
| Static runtime pins, containment and execution policy |10/10|

The four previously failing controller checks now execute their intended mock paths and pass. Positive full quotation binding, abstention, unsupported/invalid selections, memory cancellation, persistence failures and timeout/missing-model mocks are covered. Reject-everything and accept-everything controls fail their QA as intended. No assertions were weakened or skipped. New fixture and staged-driver syntax checks pass. [Full output](../artifacts/n15-08b-20261027/qa-results.json).

One automatic permission-review timeout occurred **before** the QA staging process started. The tool permitted one retry; it completed. This was not a safety rejection, failed mandatory test or native/model retry. [Record](../artifacts/n15-08b-20261027/review-timeout.json).

## Exact frozen experiment and actual outputs

The admitted overlay references unchanged N15-08 candidate SHA `eeaa137cdf237561a1de8a3fd28859955204841b852b20915538ae061709f401`. Prompt policy **astra.n15-08.prompt.v1**, system SHA `ce7dcbc0ca55c768e9f53de39fb9dbde9d737af33f4141b9fd483e43ba4a60d7`. Supported/unsupported prompts1239/1257bytes, SHA respectively `c03a377f7777dce0aa1f1737d50dc31051c87c2a5f4f57d552bbd7b3611949cd` / `e2db3f509d2dc491ac8722406f0517d9137d54b5c8bbaaaa9949b2cad1aa65a9`.

Questions, complete user-message payload/evidence order/IDs/roles, metadata-rich lexical top1 baseline, strict parser, N14-02 contract, scoring and native parameters remain unchanged. Grammar remains183bytes/SHA `d6e32d1a74bf8526a6e48ad05e2025c9ef2c7a96425631e890db7bf7ee22f09e`. The new overlay/source/QA hashes were frozen before either generation. [Admitted overlay](../artifacts/n15-08b-20261027/control/experiment-overlay.json).

Artifacts: Qwen2.5-0.5B-Instruct Q4_K_M, revision `9217f5db79a29953eb74d5343926648285ec7e67`,491,400,032bytes/SHA `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`; llama.cpp v0.7.0/b11669/commit `620d2225cc436ab0b001e3200e590e3b286ef9ab`, archive SHA `cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`. No acquisition, substitution or runtime installation.

Both actual model-generated JSON bodies are exactly:

```json
{"decision":"SELECT","evidence_ids":["window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84"]}
```

The known pinned CLI suffix ` [end of text]\n\n\n` is preserved in raw stdout; only the unchanged parser's permitted transport handling removes it. [Supported stdout](../artifacts/n15-08b-20261027/supported/runtime/generation/native.stdout), [unsupported stdout](../artifacts/n15-08b-20261027/unsupported/runtime/generation/native.stdout).

| Case | Question | Frozen scoring result |
|---|---|---|
| Supported | What environmental accommodations must a spacecraft system provide for crew sleep? |**supported_selection**; relevant complete canonical quotation, N14 ACCEPT.|
| Unsupported | What numeric vibration limit in hertz is specified by NASA's system sleep-accommodation requirement? |**false_positive**; selected related text with no requested numeric Hz value. Correct outcome required ABSTAIN.|

No numeric answer or medical conclusion was generated. The failure is evidence relevance/abstention, not fabricated source identity. The unsupported answer is withheld by the diagnostic scorer: final status ABSTAIN,0supporting quotations/citations. This is **not model-selected abstention**.

## Verified quotation and scope

For the supported case, trusted N14 code assembled the complete source quotation after the model selected its ID. A readability preview is:

> [V2 7070] The system shall provide volume, restraint, accommodations, environmental control (e.g., vibration, lighting, noise, and temperature), and degree of privacy for sleep for each crewmember, to support overall crew health and performance.

The exact canonical string, encoding/spacing, complete assessment and citation remain in the [supported result](../artifacts/n15-08b-20261027/control/supported-result.json). Preview wrapping is not substituted into the verified record.

Citation: NASA Office of the Chief Health and Medical Officer, **NASA-STD-3001 Volume2 RevisionF**, approved2026-07-14; section7.9.1/V2 7070, physical PDF page index134, UTF-16 span1248–1499. Role `formal_requirement`; source-research-only scope, system-design shall statement, no ASTRA compliance or personal medical threshold claim. Original publication SHA `a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f`, text SHA `64c1af1ee12fb4398813fcaac40a883a603d4359e95807f51775180b011f92e1`, source chunk `chunk-f44e1fdc0cad3332ef682ee0ade70dc3f213c6f546440ed495f5e5ace8ce549b`.

**One positive live quotation-attribution case is now demonstrated. The combined relevance/abstention gate remains OPEN.** N14 also ACCEPTs literal attribution of the same source text for the unsupported selection; it does not assess whether that text answers the numeric question. The diagnostic's predefined expectation identified the false positive and withheld its answer. No general semantic entailment/relevance detector was implemented or validated.

## Seen-data comparison

| Case | N15-07B baseline | N15-08B frozen prompt v1 |
|---|---|---|
| Supported |ABSTAIN / conservative miss|SELECT / correct relevant binding|
| Unsupported |ABSTAIN / correct abstention|SELECT / false-positive relevance|

Supported selection improved on this one seen example, while unsupported behavior regressed. Both required outcomes did not occur, so **discrimination is not demonstrated** and the policy does not satisfy the approved success criterion. This is not fresh-held-out evidence, independent scientific/medical validation, a performance benchmark or a proven causal diagnosis of model behavior. Do not promote the policy based on a successful positive example.

## Native measurements and isolation

| Measurement | Supported | Unsupported |
|---|---:|---:|
| Native exit / timeout |0 / false|0 / false|
| Native wall including loading/generation |4.591664107s|4.324290929s|
| Load counter |1987.05ms|1917.52ms|
| Prompt evaluation |293tokens /1985.83ms /147.55tokens/s|300tokens /1916.34ms /156.55tokens/s|
| Decode evaluation |68runs /1487.22ms /45.72runs/s|68runs /1349.73ms /50.38runs/s|
| Sampled native VmHWM peak |616,198,144bytes (~587.65MiB)|616,169,472bytes (~587.63MiB)|
| Kernel command-tree RSS |615,841,792bytes|615,759,872bytes|
| Runtime phase counted allocated storage |618,536,960bytes|618,864,640bytes|
| Whole controller duration, including preflight |52.241467s|53.131598s|
| Observer completed / owned processes remaining |true /0|true /0|
| Accounting failures / network / downloads |0 /0 /0|0 /0 /0|

Load/prompt counters can overlap.68decode runs are runtime evaluation steps, not an independent count of visible/EOS output tokens. Command-tree RSS includes wrapper/pre-exec; native VmHWM is sampled separately.32periodic supervisor observations per case plus the initial sample; maximum gaps3.373123s/3.782362s. Native RSS189/174rows, maximum gaps0.038699s/0.122218s. Existing hard2GB address-space guard/RSS precaution/headroom and native120s timeout retained; no breach. Storage is monitored, not a hard quota; final conservative delivery totals are separate.

Before each native release, actual blocked-child checks proved17native files+14notices+the model read-only, private PID/mount/network namespaces, proc onlyPID1, no host routes, no ASTRA/source/database/telemetry/credentials/user/home/host-library/cache view, and seccomp network denial. No server, GPU or operational tools. Haswell backend FILE was initialized; fixed zlib SHA `27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de` and staged libgomp SHA `645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3` matched actual loader init traces, with no old host fallback. Native/provider manifests remain pinned.

Both observers completed within the unchanged five-second join, discarded interrupted partial scans, and verified final complete accounting. Native wrappers reaped/privatePID1 absent; supervisors and driver exit0. Exactly two sequential native attempts; no safety stop, retries or additional generation. [Supported runtime report](../artifacts/n15-08b-20261027/supported/runtime/report.json), [unsupported runtime report](../artifacts/n15-08b-20261027/unsupported/runtime/report.json).

## Preservation, limits and one next action

605existing source/data/package files and6,215historical artifacts retain sizes/mtimes.30previously protected hashes and four original model/runtime/provider hashes remain unchanged; the one intentionally corrected QA fixture has its new approved hash recorded. This is whole-set metadata preservation plus targeted hashing, not a full-tree content-hash claim. [Preservation](../artifacts/n15-08b-20261027/preservation.json). No production/source implementation, model/prompt/grammar/evidence/index/vector/ranking/contract or previous results changed. No packages, downloads, network, graphics, monitoring/telemetry/scenario or N16 work.

Preserve control `/var/tmp/astra-n15-06-n15-08b-control-91uxdosx`, supported `/var/tmp/astra-n15-06-G5c20a`, unsupported `/var/tmp/astra-n15-06-TWO5nB`, the cached originals and all earlier evidence. Raw standalone research answers preserve literal-attribution results; the diagnostic's unsupported result is explicitly false_positive with its final answer withheld. Keep this distinction for future reviewers.

N15 In Progress/N16 Not Started, N07/N13/N14 independent reviews/full gates, N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified and every other status remain unchanged. No clinical/generalization or comprehensive security certification; prior current-advisory/redistribution uncertainties remain.

**One recommended next action:** keep prompt v1 unpromoted and separately approve a **non-generative relevance/abstention contract review** using the saved outputs and existing review packet before further model experiments or integration. That review must distinguish literal source attribution from question support and preserve actual independent-human-review requirements. No N14 contract change or new review approval is implied here.

Documentation: this report, N15_08B_PLAN, AGENTS, MODULE_TRACKER, MASTER_PLAN, SESSION_HANDOFF, DECISIONS (ADR-060), FEATURE_AUDIT, CORE_AI_PRIORITY and DE_N14_N15_01. **STOP: both requests consumed; N15-08B-only resources expire at delivery. No further generation or automatic module work.**
