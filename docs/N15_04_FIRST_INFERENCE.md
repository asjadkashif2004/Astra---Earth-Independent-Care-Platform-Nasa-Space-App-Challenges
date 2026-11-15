# N15-04 — first offline Qwen inference attempt

Date: **2026-10-27 Asia/Karachi**. **Outcome: BLOCKED during acquisition; no native model execution.**

The one authorized acquisition attempt encountered a publisher redirect outside the client allowlist. It stopped before following that destination or receiving any model bytes. No retry, allowlist expansion, alternate URL/model/runtime, inference or missing-model native check occurred.

**N15/N16 remain Not Started.** The task stopped in acquisition qualification before first-model implementation/execution. N07/N13/N14 remain In Progress; N09 In Progress, N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified and all other statuses/review/dependency gates unchanged.

## Authority and verified metadata

Owner explicitly approved one exact-model acquisition and conditional isolated first-inference probe under [DE-N14-N15-01](DE_N14_N15_01.md), reusing [N15-03H](N15_03H_NATIVE_STARTUP.md). N15-04-only monitored Choice B: counted1,500,000,000bytes/precaution1,350,000,000bytes, model/support550,000,000bytes, total network900s, process RSS2,000,000,000bytes, CPU-only. No new runtime acquisition. The native request would be limited to120s; no native timer was started because the acquisition gate failed. The stricter planned720s single-model network bound was not reached.

Preserved publisher metadata was rechecked offline rather than reacquired:

| Field | Qualification result |
|---|---|
| Repository | Qwen/Qwen2.5-0.5B-Instruct-GGUF |
| Exact artifact | qwen2.5-0.5b-instruct-q4_k_m.gguf |
| Immutable revision | 9217f5db79a29953eb74d5343926648285ec7e67 |
| Publisher size |491,400,032bytes|
| Expected SHA-256 |74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db|
| Actual model SHA-256 |**Unavailable: no model bytes acquired.**|
| License |Apache-2.0, preserved pinned LICENSE SHA832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e|

Revision identity, tree LFS size/hash and original LFS pointer agree. Git blob checks for the pinned pointer, LICENSE and README match the preserved tree. Exact original metadata/card/license copied into owned scratch; no linked documents acquired. This supports the expected hash and rights association, not integrity of an unacquired model. [Original qualification](N15_01_QUALIFICATION.md), [rechecked metadata](../artifacts/n15-04-20261027/model-qualification.json), [preserved license](../artifacts/n15-04-20261027/model-license.original).

## Confirmed failure and diagnostic limitation

One canonical request:

    https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf

Exact rejection: **Redirect host outside strict publisher/CDN allowlist**.

The guard allowed only the exact publisher resolve path, cas-bridge.xethub.hf.co under /xet-bridge-us/, cdn-lfs.huggingface.co and cdn-lfs-us-1.huggingface.co, with HTTPS/443/no credentials and bounded redirects/bodies. The returned hostname did not match that set, so the destination was **not followed**. No claim is made that the destination was malicious or unrelated to the publisher.

**Diagnostic gap:** the guard raised before retaining the rejected hostname and redirect status. Those facts cannot be recovered from these saved records. Do not guess a particular CDN or repeat a request to discover it under this exhausted task. This is an allowlist/client stop, not evidence of model corruption, runtime incompatibility, publisher outage, timeout or resource exhaustion.

[Receipt](../artifacts/n15-04-20261027/download-receipt.json), [raw progress](../artifacts/n15-04-20261027/download-progress.jsonl), [download source](../artifacts/n15-04-20261027/download-source.txt).

## Execution and validation status

| Requirement | Actual result |
|---|---|
| Complete model acquisition/hash |**Not achieved;0model bytes**, no full or partial GGUF file created. |
| Safe GGUF inspector |Six focused string/byte-fixture controls PASS: valid file, bad magic, truncation, unsupported version, missing tensor payload, oversized count. |
| Real-model GGUF architecture/tensors/tokenizer |**Not inspected**; fixtures are not a real-model validation. |
| Runtime/dependency changes |None; H artifact and startup evidence preserved, not rerun. |
| Native inference command/exit/output/tokens |**Not run / unavailable.** No generated response or token count. |
| Prompt |Planned only: “In one sentence, explain why adequate sleep matters for concentration.” |
| Native policy |Planned1,024context/64output tokens/two CPU threads; no native command was frozen or launched. |
| Model load/prompt/decode timing/speed/RSS |**Not measured.** |
| New native isolation/provider-loading evidence |**Not collected**; H remains historical no-model proof, not model-execution proof. |
| Missing-model failure check |**Not run** because conditional native phase was never entered. |
| Scientific/clinical/citation validation |None claimed; no evidence or approval status changed. |

Four disposable Python controller/parser sources passed syntax checks; no dependencies installed or project application/QA code changed. The controller reused the corrected accounting helper and H's audited supervision functions without importing/rerunning H's main body. The helper and previous H30/30 QA evidence were reused unchanged, not repeated. Planned native execution was conditional on successful acquisition/static/security/isolation gates and therefore did not proceed.

## Resources, cleanup and preservation

Fresh scratch **/var/tmp/astra-n15-04-6bwyckdq**, disk-backed ext4/dev/sdd. One owned download process; no automatic retries. Process limits include hard2GB address space, sampled1.8GB RSS precaution,1.5GB available-memory floor and resource-failure termination. Whole reused runtime/libgomp/zlib/H scratch, source notices/metadata, cache/temp/partial/output/control inputs are counted.

| Measurement | Actual |
|---|---:|
| Acquisition attempts / followed redirects / retries |1 /0 /0|
| Worker request-to-failure |0.583512s|
| Whole download subprocess interval |1.575690s|
| Whole acquisition qualification interval |25.421760s|
| Received model / redirect body bytes |0 /0|
| TLS/HTTP header traffic |Unmeasured; not claimed zero. |
| Final qualification apparent / allocated storage |83,166,019 /84,537,344bytes|
| Resource observations / durable periodic rows |62 /61|
| Requested sampling / maximum observed gap |250ms /0.825304s|
| Download-worker sampled peak RSS |25,493,504bytes|
| Kernel maximum reaped-child RSS |25,509,888bytes, acquisition/trusted tools only. |
| Supervisor sampled / kernel lifetime RSS peaks |25,042,944 /663,040,000bytes; not model memory. |
| Owned processes remaining / observer alive |0 /false|
| Accounting errors / native commands |0 /0|

All recorded values are below applicable limits; resource exhaustion did not cause the failure. No actual model loading or generation memory was measured. Storage is monitored, not a hard quota. New small documentation/evidence delivery is counted separately in final validation.

**583source/data/package files and5,807historical artifacts preserved by size/mtime comparison** with before-task snapshots; not a new full-tree content-hash proof. Existing runtime/libgomp/fixed-zlib originals, N04 evidence, corpus/indexes, monitoring/telemetry/scenario/UI and previous H records unchanged. [Assessment](../artifacts/n15-04-20261027/assessment.json), [raw report](../artifacts/n15-04-20261027/report.json), [resources](../artifacts/n15-04-20261027/resources.jsonl), [final preservation/consistency](../artifacts/n15-04-20261027/preservation-validation.json).

## One next separately approvable task

**Bounded metadata-only qualification of the exact publisher redirect:** retain the unfollowed Location hostname and status, verify official destination provenance and define the exact source guard. No model-body transfer, runtime execution, broad/wildcard allowlist or automatic acquisition retry in that task. A later acquisition/inference attempt still needs separate owner authorization and fresh resource/storage authority.

First generation and subsequent citation-grounded research generation remain blocked behind acquisition. No response, token counts, model timing or scientific validation is invented. N15-03G residual security/redistribution uncertainties and all original module/human-review gates remain open.

**STOP. N15-04 resource authority expires at blocked delivery; no automatic continuation.**
