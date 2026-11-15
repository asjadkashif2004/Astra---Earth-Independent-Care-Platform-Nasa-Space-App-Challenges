# N15-07B — frozen diagnostic replay

Date: **2026-10-27 Asia/Karachi**. **PARTIAL: both executions qualified, but supported/unsupported discrimination was not demonstrated.** Exactly two sequential native generation attempts completed, one per unchanged frozen case. Both returned ABSTAIN. No retries, prompt changes, grammar changes or additional generation.

N15 **In Progress**, N16 **Not Started**. All other statuses, independent scientific/medical reviews and full-module gates remain unchanged. This is previously inspected diagnostic data, not an independent evaluation or clinical validation. [Plan](N15_07B_PLAN.md), [assessment](../artifacts/n15-07b-20261027/assessment.json).

## Cases, exact outputs and interpretation

| Frozen case | Exact question | Model JSON | Outcome |
|---|---|---|---|
| Supported | What environmental accommodations must a spacecraft system provide for crew sleep? | `{"decision":"ABSTAIN","evidence_ids":[]}` | **Conservative miss.** The retrieved complete V2 7070 requirement directly answers the question, but the model selected no evidence. |
| Unsupported | What numeric vibration limit in hertz is specified by NASA's system sleep-accommodation requirement? | `{"decision":"ABSTAIN","evidence_ids":[]}` | **Correct abstention.** No such numerical vibration threshold exists in the eligible 33 curated units/34 spans. Related qualitative vibration text is insufficient. |

Raw stdout also contains the exact known completion-CLI transport suffix ` [end of text]\n\n\n`; original bytes are retained. The unchanged strict parser removes only that permitted suffix. [Supported stdout](../artifacts/n15-07b-20261027/supported/runtime/generation/native.stdout), [unsupported stdout](../artifacts/n15-07b-20261027/unsupported/runtime/generation/native.stdout).

Both outputs passed finite-grammar membership and strict JSON parsing. Both select zero IDs, so **zero returned quotations and zero supporting citations**; no live quotation/citation binding was invoked or accepted. Model-selected abstention is the final answer reason for both. Canonical positive fixture binding passed preflight, which does not count as a model-selected quotation. The positive live quotation gate remains **OPEN**.

The model did not demonstrate selecting supported evidence while declining unsupported evidence. A model that abstains on both cases cannot establish relevance discrimination. No root cause for the repeated abstention is proven by these outputs alone; prompt interpretation, model capability or decoding preferences are hypotheses, not diagnosed defects. Valid JSON is structural correctness, not relevance or entailment.

## Frozen content and additive provenance

The original [N15-07 definition](../artifacts/n15-07-20261027/control/frozen-plan.json) and incomplete results remain unchanged. The new [replay overlay](../artifacts/n15-07b-20261027/control/replay-overlay.json) preserves both complete case records and binds approved N15-07A supervision/post-processing hashes. Each prepared input was reproduced and compared exactly before execution; actual native argv was compared to the preserved command template with only the original case-specific prompt substituted.

- Same pinned Qwen revision `9217f5db79a29953eb74d5343926648285ec7e67`, Q4_K_M original 491,400,032 bytes/SHA-256 `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`.
- Same llama.cpp b11669/v0.7.0/source commit `620d2225cc436ab0b001e3200e590e3b286ef9ab`, archive SHA-256 `cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`; no new runtime acquisition.
- Same canonical retrieved window `window-ac8d6151e692badfd03a7755d10976b91434022f57fb270e7a0e92855eb7eb84`, formal requirement, NASA-STD-3001 Vol2 RevisionF7.9.1/V2 7070, physical PDF index134. Original publication/page/span/role/scope are unchanged. Missing-Hz support is an absence assessment only of the eligible excerpts, not every page or all NASA literature.
- Same 183-byte finite grammar/SHA-256 `d6e32d1a74bf8526a6e48ad05e2025c9ef2c7a96425631e890db7bf7ee22f09e`, strict parser, metadata-rich lexical top1 ranking, N14-02 literal quotation contract and original scoring criteria.
- Same 922/940-byte prepared prompts, context2048/output192/threads2/seed42/temperature0/no warmup, CPU-only, native120s/request, one request at a time.

Internal CLI/runtime labels remain N15-06 because that execution protocol is reused unchanged. Actual authorization and two-request reservation are **N15-07B only**, not transfer of any expired N15-06/07 resource permission. The corrected post-processing function retains its old diagnostic label as provenance; the outer overlay/summary identifies this fresh replay. The control driver was frozen before inference and never changed after responses.

## Mandatory preflight and focused QA

**41/41 tests rerun and passed:** 20 observer lifecycle tests and 21 diagnostic post-processing tests. These cover normal/pending-wait shutdown, startup/crash/timeout/cleanup failures, durable accounting, checked argument lookup, positive canonical quotation acceptance, invalid/missing IDs, unsupported SELECT handling and malformed outputs. Prior N15-07A114-test results are preserved rather than presented as a new114-test run. [Current QA output](../artifacts/n15-07b-20261027/qa-results.json).

Full cached model/runtime/libgomp/fixed-zlib original hashes, all17native file hashes,14notice identities and saved corrected QA-source hashes passed. The separate driver passed syntax validation. Static preflight confirmed ext4 disk-backed scratch and sufficient counted storage. The original cases, exact prompts, grammar, evidence ordering and command parameters were frozen before native release. No source/QA implementation was modified in this task; only new control/evidence files and documentation.

## Native execution and resource measurements

| Measurement | Supported | Unsupported |
|---|---:|---:|
| Native exit / timeout |0 / false|0 / false|
| Native wall, including loading/generation |3.659831512s|3.485719562s|
| Runtime load counter |1965.26ms|1770.62ms|
| Prompt processing |230tokens /1964.19ms /117.10tokens/s|237tokens /1769.48ms /133.94tokens/s|
| Decode evaluation |15runs /338.78ms /44.28runs/s|15runs /381.20ms /39.35runs/s|
| Native sampled VmHWM peak |644,952,064bytes (~615.07MiB)|644,849,664bytes (~614.98MiB)|
| Kernel command-tree RSS maximum |644,358,144bytes|644,497,408bytes|
| Runtime phase counted allocated storage |614,674,432bytes|614,965,248bytes|
| Whole CLI, including integrity/static checks |52.548556s|51.076542s|
| Observer lifecycle / owned processes remaining |completed /0|completed /0|
| Accounting failures / downloads / network requests |0 /0 /0|0 /0 /0|

Load and prompt counters may overlap;15decode runs are the runtime's evaluation-step counter, not an independent visible/EOS token count. Command-tree RSS includes wrappers/pre-exec and is distinct from sampled native VmHWM. Controller lifetime RSS is recorded separately, not represented as native model-only memory. These are two diagnostic timings, not a benchmark or performance-improvement claim.

Each supervisor recorded29 periodic samples plus its initial sample. Maximum periodic sample gaps:3.859169s/3.332978s. Native RSS sampling:130/128rows, maximum gaps0.377537s/0.184746s. Sampling is not continuous hard storage enforcement. Existing native hard2GB address-space guard, RSS precaution/headroom,120s timer and monitored Choice B1.5GB/1.35GB stop policy were retained; no breach or timeout was recorded. End-of-delivery accounting is recorded separately from these runtime-phase totals.

## Actual isolation, loading and cleanup

For **each** request, actual blocked-child inspection passed **before release**: exact17native files+14notices+one approved model read-only; private PID/mount/network namespaces; visible private proc onlyPID1; no ASTRA/source/databases/telemetry/credentials/user/home/host-library/cache paths; no host network routes; seccomp denial of networking and related bypass syscalls. The model had no tool or operational-state authority.

The actual loader traces initialize the selected Haswell backend and both required staged providers:

- Fixed zlib: `/qualified/lib/libz.so.1`, SHA-256 `27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de`.
- libgomp: `/qualified/lib/libgomp.so.1`, SHA-256 `645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3`.

The native backend remains the approved FILE path, not a directory. No older host-zlib fallback was visible. [Supported loader record](../artifacts/n15-07b-20261027/supported/runtime/generation/native-result.json), [unsupported loader record](../artifacts/n15-07b-20261027/unsupported/runtime/generation/native-result.json).

Both corrected observers started and completed, with the unchanged five-second join; interrupted in-progress scans were discarded and final complete accounting verified. Both supervisors report PASS, no accounting exceptions, no remaining owned processes. Native wrappers were reaped and privatePID1 absent; supervisor and driver exit0. Unlike N15-07, the new shutdown qualification succeeded. This does not retroactively qualify the old incomplete run or guarantee behavior under every filesystem failure.

## Preservation and remaining gates

**603 existing source/data/package files and6,087 historical artifact files retained their sizes/mtimes;20 protected hashes and four original model/runtime/provider package hashes match.** This is metadata preservation for the full file sets plus targeted content hashing, not a full-tree content-hash claim. [Preservation](../artifacts/n15-07b-20261027/preservation.json). No model/native payload copies, installs, downloads, corpus/index/vector/QA/production source changes or N04 evidence changes.

Preserve control `/var/tmp/astra-n15-06-n15-07b-control-eswbro55`, supported case `/var/tmp/astra-n15-06-YCETdf`, unsupported case `/var/tmp/astra-n15-06-jrRdQ7`, original cached artifacts and all new [evidence](../artifacts/n15-07b-20261027). Do not clean up or automatically resume. Original N15-07 remains incomplete and its unsupported case historically unrun; this is a distinct replay with fresh evidence.

N15 remains In Progress, N16 Not Started; N07/N13/N14 independent-review and full-module obligations remain open. N03 Partial, N04 Complete, N05/N06 Deferred and AC-20 Open / Unverified are preserved, along with every other module status. No clinical competence, scientific approval, paraphrase entailment, fresh-held-out performance, comprehensive binary security certification or production readiness is established. Prior current-advisory/redistribution uncertainties remain unchanged.

## One recommended next step

Retain lexical retrieval and strict abstention as the baseline. Separately authorize **one bounded, pre-frozen prompt-contract experiment addressing over-abstention**, keeping model/runtime, grammar, parser, N14 attribution gates and research-only scope fixed. Freeze its hypothesis/cases/settings before execution and obtain fresh resources; do not promise an improvement or integrate the selector now. Repeated ABSTAIN alone does not identify the cause, and no such experiment is authorized by N15-07B.

**STOP. N15-07B's two requests are consumed and its task-only resource authority expires at delivery. No further generation, tuning, integration or N16 work.**
