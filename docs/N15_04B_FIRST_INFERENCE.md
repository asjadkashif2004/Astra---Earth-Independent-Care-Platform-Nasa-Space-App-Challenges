# N15-04B — verified Qwen acquisition and first offline inference attempt

Date: **2026-10-27 Asia/Karachi**. **Outcome: PARTIAL — acquisition/static qualification PASS; single inference attempt FAILED before model context creation.**

The complete approved GGUF is now preserved and verified. The isolated native command exited1 with empty stdout and no generated tokens. **No retry, backend correction, second generation, alternate model/runtime or missing-model command was run after that failure.**

**N15 is In Progress**, because actual authorized isolated research implementation and first model-execution attempt began; it is not Complete or integrated. **N16 Not Started**, all other statuses and scientific/medical/dependency gates unchanged.

## Authority and resources

Owner approved one exact-model acquisition through the pinned publisher and **us.aws.cdn.hf.co:443 only**, conditional single CPU inference with a120s combined load/generation deadline, and one bounded non-generative missing-model check if applicable. N15-04B-only monitored Choice B: counted1,500,000,000bytes/precaution1,350,000,000bytes; model/support550,000,000bytes; total network900s; process RSS2,000,000,000bytes. Runtime acquisition0. No hard filesystem quota is claimed; temporary overshoot is possible under monitoring.

Reused [H-qualified runtime](N15_03H_NATIVE_STARTUP.md), [A publisher delegation](N15_04A_REDIRECT_QUALIFICATION.md), corrected accounting helper and existing license/source evidence. Reverified all **three original runtime/libgomp/zlib artifact hashes and17admitted native files** before acquisition, then checked current native files and actual bound identities again before execution. No runtime download, dependency installation, OS/global network/linker change, source build, application/QA/monitoring/index/UI change or N16 work.

## Model acquisition and static inspection — PASS

| Item | Verified result |
|---|---|
| Repository / artifact |Qwen/Qwen2.5-0.5B-Instruct-GGUF / qwen2.5-0.5b-instruct-q4_k_m.gguf|
| Immutable revision |9217f5db79a29953eb74d5343926648285ec7e67|
| Complete original bytes |**491,400,032**|
| Publisher-expected and actual SHA-256 |**74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db**|
| Original location |/var/tmp/astra-n15-04b-0zd6xkaq/acquisition/qwen2.5-0.5b-instruct-q4_k_m.gguf|
| License |Apache-2.0; exact pinned LICENSE/card/metadata preserved; license SHA832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e|
| GGUF / architecture |v3 / qwen2|
| General file type |15, Q4_K_M; mixed actual tensor storage/fallback types, not uniformly four-bit|
| Metadata / tensors |26metadata entries /291tensors|
| Tensor types |13Q8_0,133Q5_0,121F32,12Q6_K,12Q4_K|
| Native header context / layers / embedding width |32,768 /24 /896|
| Tokenizer |GPT2 BPE with qwen2 pretokenizer|
| Special IDs |endoftext151643; im_start151644; im_end/EOS151645|

Preserved publisher API/tree/LFS/rights associations revalidated. One fresh canonical publisher GET supplied302; required revision, linked size, SHA and Xet headers matched the fixed metadata before following. Destination was exactly HTTPS443 **us.aws.cdn.hf.co**, /xet-bridge-us/ with the pinned Xet marker. Standard CA/certificate/hostname validation succeeded for publisher and CDN; CDN returned200/identity/full Content-Length491,400,032. No wildcard, unexpected host, certificate bypass, additional redirect or automatic retry.

Streamed once to a bounded partial file; full byte count/SHA checked in the worker and independently against the complete local original before promotion. No incomplete original was accepted. The safe data-only GGUF inspector verified header, arrays, tensor shapes/types/offsets/alignment, non-overlap and payload bounds. Six retained positive/negative parser controls and six exact-host/header policy controls pass. This does not execute embedded templates/tensors or prove native model compatibility.

Signed URL/query/credential values were never persisted. Receipts retain sanitized identity fields only. All acquisition connections closed and the one-shot worker exited; **CDN permission is inactive**, no persistent global rule/broker installed. Inference has separate OS-enforced network denial. [Receipt](../artifacts/n15-04b-20261027/acquisition/download-receipt.json), [GGUF assessment](../artifacts/n15-04b-20261027/acquisition/gguf-static.json), [retained hashes](../artifacts/n15-04b-20261027/acquisition/retained-hashes.json).

## Single native attempt and confirmed failure

Exact argv and environment are frozen in [execution record](../artifacts/n15-04b-20261027/infer/generation/frozen-execution.json). Executable invocation, with one literal ChatML prompt argument:

    /qualified/lib/ld-linux-x86-64.so.2 --inhibit-cache \
      --library-path /qualified/lib:/qualified/runtime \
      /qualified/runtime/llama-completion \
      --offline --no-conversation --no-display-prompt --simple-io --no-warmup \
      --n-gpu-layers 0 --ctx-size 1024 --threads 2 --threads-batch 2 \
      --batch-size 64 --ubatch-size 64 --no-context-shift \
      --seed 42 --temp 0 --perf \
      --model /qualified/model/qwen2.5-0.5b-instruct-q4_k_m.gguf \
      --n-predict 64 --prompt '<|im_start|>system
    You are a helpful assistant. Answer only the general question in one sentence.<|im_end|>
    <|im_start|>user
    Explain in one sentence why sufficient sleep matters for concentration.<|im_end|>
    <|im_start|>assistant
    '

Invocation used an argv array, not a shell; JSON preserves byte-exact prompt newlines. Context1,024/output64/two threads were frozen before execution; no warmup/model benchmark or question retuning. Embedded Jinja/tool branches were not evaluated. Child OMP_NUM_THREADS/OMP_THREAD_LIMIT both2.

**Controller configuration mistake:** the child environment set **GGML_BACKEND_PATH=/qualified/runtime**, a directory. This runtime attempted to load that value as a shared-library file and reported:

    load_backend: failed to load /qualified/runtime: /qualified/runtime: cannot read file data: Is a directory
    llama_model_load_from_file_impl: no backends are loaded
    llama_completion: error: unable to create context

**Exit1**, release-to-wrapper-exit **0.027075365s**, timeout not reached. The approved Haswell backend file was present/read-only/hash-checked but **was not initialized**. This is a demonstrated sandbox backend-path configuration failure, not evidence of corrupted weights, an unsupported GGUF, a CPU defect or a need for another dependency. It does not guarantee that correcting this setting alone will make every subsequent model stage pass.

The raw progress marker still names the last containment-preflight stage. Saved containment is PASS and native exit1 followed it; the failure must be attributed to **native backend initialization after preflight**, not a failed filesystem guard.

**Generated response: none. Generated output tokens:0.** Model-load/prompt-evaluation/decode timings and throughput are **unavailable**, because a model context/tensors were not loaded. The27ms failed startup must not be presented as model-loading or generation performance. [Raw stderr](../artifacts/n15-04b-20261027/infer/generation/native.stderr), [native result](../artifacts/n15-04b-20261027/infer/generation/native-result.json).

## Containment, loading and failure isolation

Before releasing the one acquired process, the actual blocked sandbox view passed the H-derived checks:

- Exact17native files,14notice files and the one approved read-only GGUF; all bound identities checked. Root/native/model files read-only, only owned temporary/home/cache paths writable.
- ASTRA/source/databases/telemetry/credentials/user/home/host-library directories and old zlib aliases/cache absent. Private procfs showed only PID1; distinct mount/PID/network namespaces.
- Cleared environment, capabilities dropped, null stdin, no inherited network descriptors; no host IPv4 routes and only loopback/reject IPv6 entries.
- Network-denying seccomp rejects socket/network operations, io_uring and x32. No network-acquisition code runs in this native process.

Loader **calling init** evidence binds the actual fixed **libz.so.1** to SHA27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de and **libgomp.so.1** to SHA645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3 through checked read-only mounts.15admitted library initialization paths, no unexpected provider/host-zlib fallback. Haswell backend not initialized.

The failed process was reaped, private PID1 disappeared, namespace descendants terminated and observer stopped. No operational state was exposed or changed. **Separate missing-model check NOT RUN**: the first unexpected inference failure triggered STOP. That missing-model gate is not marked passed. [Containment](../artifacts/n15-04b-20261027/infer/generation/containment-preflight.json), [cleanup](../artifacts/n15-04b-20261027/infer/generation/cleanup.json).

## Actual measurements

| Measurement | Actual |
|---|---:|
| Acquisition attempts / model body bytes |1 /491,400,032|
| Acquisition worker network interval |124.015872s|
| Whole download subprocess interval |125.001013s|
| Whole acquisition qualification phase |164.731962s|
| Whole native qualification phase |17.051910s|
| Failed native release to wrapper exit |0.027075365s|
| Final acquisition / native-phase allocated counted storage |591,048,704 /591,253,504bytes|
| Failed native command process-tree kernel RSS maximum |23,867,392bytes, includes wrapper/pre-exec image|
| Brief post-release PID VmHWM sample |262,144bytes,1sample; not representative model memory|
| Supervisor sampled peaks, acquisition / native phase |32,837,632 /34,131,968bytes|
| Supervisor kernel lifetime high-water |663,040,000bytes, not model RSS|
| Accounting failures / owned processes remaining |0 /0|
| Runtime/dependency acquisition |0bytes|
| Model-load/generation RSS or throughput |**Not measured; model context never created**|

Worker/request timing includes streaming, local fsync and hashing; transport/TLS/header overhead bytes are unmeasured. No claim of precise wire-byte traffic or guaranteed hard-realtime sampling. Inherited hard2GB address space, sampled1.8GB RSS precaution,1.5GB available-memory floor, native CPU/output caps and120s wall cancellation remained active. No resource limit caused the failure.

Counted storage includes the one model copy, complete reused runtime/dependency/cache trees, scratch/control/output and admitted host libraries. Final delivery accounting also includes controller fragments, new text evidence and changed documentation. No model/runtime binary copied into ASTRA. Monitoring is not a hard quota.

## Preservation, limitations and one next approval

**585existing source/data/package files and5,841historical artifacts** checked unchanged by size/mtime; not a fresh whole-tree content-hash proof. Application dependencies, monitoring/alerts, scenarios, research originals/indexes/claim contract, N04 evidence and all previous failed/accepted records preserved. New standalone research controllers/evidence and governance/status documentation only. [Assessment](../artifacts/n15-04b-20261027/assessment.json), [preservation/consistency](../artifacts/n15-04b-20261027/preservation-validation.json).

G's incomplete current-advisory/source-to-binary/redistribution uncertainties remain; official model provenance, full SHA and static inspection are not comprehensive security certification. No successful LLM generation, scientific/citation grounding, medical reasoning, clinical safety, paraphrase entailment, Health Agent/N16 integration or production readiness is claimed.

**One smallest next task, requiring separate approval:** correct only the isolated controller backend-path setting to the exact already-whitelisted Haswell library file, validate that target/hash with focused non-native QA, then permit **one offline inference attempt reusing the verified local model**, under fresh explicit resource/storage limits. No model/runtime download, dependency/version change or automatic retry. Later stages remain unverified until actually tested; N14-citation-grounded generation is not yet eligible to start automatically.

**STOP. N15 In Progress, not Complete; N16 Not Started. All other statuses/gates unchanged. N15-04B resource authority expires at partial delivery.**
