# N15-04C — corrected backend file and first successful offline inference

Date: **2026-10-27 Asia/Karachi**. **PASS for the single isolated execution-feasibility test.** Exactly one native generation request exited0 and produced new text. No additional native command, retry, model download, dependency installation or application integration occurred.

**N15 In Progress, not Complete; N16 Not Started.** All other module statuses and independent scientific/medical/dependency gates remain unchanged. This result establishes local CPU generation only; it does not validate the answer, NASA citation grounding, medical reasoning, paraphrase entailment or production readiness.

## Authority and minimal correction

Owner explicitly approved N15-04C under [DE-N14-N15-01](DE_N14_N15_01.md), reuse-only acquisition0/network0, one120s combined loading/generation attempt, CPU only/process RSS2,000,000,000bytes. Fresh task-only Choice B: monitored counted storage1,500,000,000bytes, precautionary stop1,350,000,000bytes, acknowledged possible temporary overshoot. This permission expires at delivery.

Preserved [N15-04B](N15_04B_FIRST_INFERENCE.md) unchanged. Its controller passed the directory /qualified/runtime to a file loader. Static inspection of the pinned local libggml.so.0 shows getenv followed by ggml_backend_load; the old EISDIR failure independently confirms the file interpretation. The new one-shot controller sets only the child environment's **GGML_BACKEND_PATH=/qualified/runtime/libggml-cpu-haswell.so**. No global environment/linker changes or alternate backend discovery workaround.

The selected file is an existing whitelist member: **SHA-256 aec8dcc1487baeac0914aa3f6ba747beb868b61cd398e10c40c39addd2f80b64**, ELF64/little-endian/x86-64/DYN. Actual seven DT_NEEDED entries match the approved closure; prior namespace/symbol proof is reused against reverified hashes. Current CPU reports AMD Ryzen5 7430U; required SSE4.2/AVX/AVX2/FMA/F16C are present. The unchanged archive remains llama.cpp v0.7.0/b11669/commit620d2225cc436ab0b001e3200e590e3b286ef9ab.

New QA files: [backend configuration validator](../scripts/n15_backend_config.py) and [focused tests](../tests/n15_backend_config_test.py). They require the exact absolute file, trusted digest, regular nonsymlink source, ELF identity and unique whitelist/dependency entries, without executing or loading an ELF. **12/12 tests pass**, including the original directory failure and a valid positive control. Four source AST syntax checks pass. Existing30/30 accounting tests are reused; the unchanged helper digest is checked at import. No broad suite/browser collection.

## Integrity and containment

Before release, reverified the complete local model SHA, all17 native-file hashes and the three original runtime/libgomp/zlib archive/package hashes. Then rehashed actual read-only bound files in the blocked sandbox, including the model. No original was copied, modified or reacquired.

Model: Qwen/Qwen2.5-0.5B-Instruct-GGUF, qwen2.5-0.5b-instruct-q4_k_m.gguf, revision **9217f5db79a29953eb74d5343926648285ec7e67**, **491,400,032bytes**, SHA-256 **74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db**. Original stays at /var/tmp/astra-n15-04b-0zd6xkaq/acquisition/qwen2.5-0.5b-instruct-q4_k_m.gguf. Reused unchanged B static metadata: GGUFv3/qwen2/filetype15 Q4_K_M, mixed tensor storage,291tensors, GPT2-BPE/qwen2 tokenizer, native context32768. Pinned Apache-2.0 license/rights notices retained. Actual model loading and generation now pass for the restricted1024-token context; broader compatibility is untested.

Actual H-derived bwrap sandbox:17native files +14notices +1read-only model, private PID/mount/network namespaces, capabilities dropped/cleared environment/null stdin. No ASTRA/source/database/telemetry/credentials/user/host-library directories or linker cache visible; private procfs contained PID1 only before release. No host routes; only isolated loopback. Network syscall/io_uring/x32 denial retained. No GPU backend or device admitted. Root/native/model bindings read-only; only owned scratch/home/cache writable. See [containment](../artifacts/n15-04c-20261027/infer/generation/containment-preflight.json).

Actual **calling init** traces verify the Haswell backend above and fixed **libz.so.1 SHA27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de** and **libgomp.so.1 SHA645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3**. All16 initialized library paths are admitted; the executable is the17th native file. Older host zlib is absent. [Native result](../artifacts/n15-04c-20261027/infer/generation/native-result.json), [raw loader/runtime stderr](../artifacts/n15-04c-20261027/infer/generation/native.stderr).

## One generation — measured result

Exact argv/environment/prompt are preserved in [frozen execution](../artifacts/n15-04c-20261027/infer/generation/frozen-execution.json). Same direct loader with --inhibit-cache and --library-path /qualified/lib:/qualified/runtime; unchanged llama-completion flags: --offline --no-conversation --no-display-prompt --simple-io --no-warmup --n-gpu-layers0 --ctx-size1024 --threads2 --threads-batch2 --batch-size64 --ubatch-size64 --no-context-shift --seed42 --temp0 --perf; model is the one read-only approved file, --n-predict64. Actual argv separates option names and values. Child OMP thread limits2.

One manually formatted Qwen ChatML request; embedded template/tool code is never evaluated. User prompt: **“Explain in one sentence why sufficient sleep matters for concentration.”** System message requests one sentence about the general question.

Actual stdout (followed by newlines), retained verbatim:

    Sufficient sleep is crucial for maintaining cognitive functions and enhancing concentration. [end of text]

The final marker is runtime output, not an independently verified scientific assertion. No citation was requested or produced; this answer has not undergone scientific/medical approval.

| Measurement | Actual |
|---|---:|
| Native attempts / exit |1 /0|
| Native release to wrapper exit |2.722222277s|
| Runtime model loading |694.83ms|
| Prompt evaluation |693.66ms /40tokens /57.66tokens/s|
| Autoregressive evaluation |546.99ms /13runs /23.77tokens/s|
| Runtime total evaluation counter |53tokens =40prompt +13decode runs|
| First nonempty stdout observation |2.089751s; file observation, not precise token latency|
| Native sampled VmHWM/RSS maximum |601,894,912bytes, approximately574MiB|
| Kernel command-process-tree RSS maximum |601,485,312bytes; includes wrapper/pre-exec|
| Whole static/containment/native qualification phase |125.868585s;120s limit applies to native loading/generation only|
| Final phase apparent / allocated counted storage |591,095,371 /592,658,432bytes|
| New model/runtime bytes / network requests |0 /0|
| Accounting failures / owned processes remaining |0 /0|

Token figures are **the native runtime counters**, proving positive autoregressive execution. The13runs are not an independent count of visible-text/EOS tokens. No extra tokenization, benchmark, determinism repeat or second generation was performed. [Performance](../artifacts/n15-04c-20261027/infer/generation-performance.json), [assessment](../artifacts/n15-04c-20261027/assessment.json).

Monitoring is sampled, not a hard storage quota or continuous RSS proof. Native89post-release samples had a maximum0.591335s gap; requested20ms is not claimed as achieved throughout. Supervisor requested250ms but scanning/fsync produced a maximum9.491290s gap. Inherited hard2GB address-space limit,1.8GB sampled RSS precaution,1.5GB available-memory floor and independent120s termination timer remained. No threshold/deadline was relaxed or hit. Supervisor lifetime RSS622,874,624bytes is separate from model memory. Inclusive delivery accounting additionally records new QA/docs/evidence; it is not a network-download measurement.

Owned wrapper reaped, private PID1 absent and all namespace descendants terminated; observer stopped. No missing-model command was authorized/run in C; B's unexecuted negative check is not retroactively passed. [Cleanup](../artifacts/n15-04c-20261027/infer/generation/cleanup.json).

## Preservation, limits and next approval

Final [preservation validation](../artifacts/n15-04c-20261027/preservation-validation.json) passes: **585existing source/data/package files and5,883historical artifacts unchanged by size/mtime**;10documents/635local links and all26module identities checked. This is not a new whole-tree content-hash proof. Both new QA files are excluded from the preexisting-file set explicitly. Original publications, N14 vectors/rankings/claim contract, N04 evidence, model, runtime and earlier failures remain unchanged. Small new logs/controllers and documentation only. No dependencies, application, monitoring, scenario, graphics, research index or review-approval changes. [Inclusive delivery accounting](../artifacts/n15-04c-20261027/delivery-accounting.json) remains far below the1.35GB precautionary watermark.

Prior G limitations remain: incomplete current advisory inventories, source-to-binary reproducibility/security uncertainty and future redistribution/source/relinking/NOTICE duties are not comprehensively cleared. Private research execution notices retained. A successful harmless sentence is not validation of citation grounding, scientific accuracy, medical competence, clinical safety or production performance; full N07/N13/N14/N15/N16 gates stay open.

**One smallest next task for separate approval:** a bounded offline citation-grounded research-answer experiment over only the existing33curated NASA units, using the unchanged N14 citation/role/scope/full-quotation contract and conservative abstention. Reuse this verified model/runtime, isolate from operational state, reject unsupported paraphrases/invented citations and obtain fresh explicit resources; no downloads, application integration or N16. This report does not authorize that task.

**STOP. N15 In Progress; N16 Not Started. N15-04C resources expire at delivery.**
