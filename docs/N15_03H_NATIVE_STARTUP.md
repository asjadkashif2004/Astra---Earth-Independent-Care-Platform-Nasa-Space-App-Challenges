# N15-03H — first isolated llama.cpp native startup

Date: **2026-10-27 Asia/Karachi**. **Outcome: PASS for the single bounded no-model startup.** N15/N16 remain **Not Started**; all other module statuses, scientific/medical review and dependency gates remain unchanged.

Exactly one approved command was released, after mandatory preflight. It exited **0**. No second command, alternate executable, model, inference, downloads, installation, compilation, operational-state access or application/QA change occurred.

## Authority and exact command

Owner explicitly approved N15-03H under [DE-N14-N15-01](DE_N14_N15_01.md), after [N15-03G](N15_03G_STARTUP_READINESS.md), with H-only monitored **Choice B**: counted storage1,500,000,000bytes/precautionary stop1,350,000,000bytes;2,000,000,000-byte process RSS ceiling; zero acquisition/network connectivity; CPU-only; **10-second native wall deadline**. Monitoring cannot guarantee prevention of transient storage overshoot. This authority expires at H delivery.

Native command, through the approved explicitly admitted loader:

    /qualified/lib/ld-linux-x86-64.so.2 --inhibit-cache \
      --library-path /qualified/lib:/qualified/runtime \
      /qualified/runtime/llama-completion --version

**Exit0; release-to-wrapper-exit0.015842108s (15.842ms)**, including loader/startup/wrapper overhead, not a model benchmark. stdout was empty; version and loader records were on stderr:

    version: 0.7.0-dev (build 11669, commit 620d2225c)

The archive/tag remains **v0.7.0 / b11669**, full pinned commit **620d2225cc436ab0b001e3200e590e3b286ef9ab**. The executable's own “0.7.0-dev” display is recorded literally; no version substitution occurred.

## Preflight and containment

Reverified all three existing originals locally, without reacquisition:

| Artifact | Bytes | Reverified SHA-256 |
|---|---:|---|
| llama-b11669-bin-ubuntu-x64.tar.gz |17,851,611|cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac|
| libgomp1:amd64=16-20260322-1ubuntu1 package |162,278|add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314|
| zlib1g:amd64=1:1.3.dfsg+really1.3.1-1ubuntu3.2 package |61,786|10084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35|

Corrected accounting helper SHA6af29d0ff7d12346136f42479e0672a7440ed161997ec04850e1cbebcde23761 preserved; **30/30 focused non-native tests PASS** in0.194s. No broad suite. Disposable scratch **/var/tmp/astra-n15-03h-0oauyxf2**, disk-backed ext4/dev/sdd. Existing archive/libgomp/zlib trees retained unchanged.

All **17 exact native files** rehashed against F's whitelist; ELF64/x86-64, unchanged DT_NEEDED identities and bounded ORIGIN paths checked. No repeat of the full F namespace/symbol test suite. Host CPU has required AVX/AVX2/FMA/F16C/SSE4.2 features; this is not execution of those kernels.

The **single actual sandbox** was constructed with its native command blocked on a pipe. Before release, the supervisor inspected that same namespace's filesystem via its owned process root:

- Exact17native files plus **13 notice files**, each identity checked, individually read-only bound. Root read-only, private disk-backed writable temporary/home/cache paths; no full host library directory or linker cache admitted.
- ASTRA, home/user paths, credentials, databases/telemetry paths, original scratch roots, host /usr, /lib, /lib64, /mnt, /run and /sys absent. Private procfs exposed only PID1 before release; no host-process-root traversal.
- Distinct mount, PID and network namespaces; capabilities dropped, environment cleared, null stdin, no inherited network descriptors. No server/RPC/multimodal or alternate CPU library admitted.
- No IPv4 routes and only loopback device; retained IPv6 snapshot has loopback/reject entries, not a falsely empty IPv6 table. An x86-64 seccomp filter denies socket/network operations, io_uring and x32 ABI. Successful bubblewrap startup installs it; no extra socket-test command was run.

Identity/layout/isolation checks passed **before** the gate was released. No weaker fallback was used. [Containment evidence](../artifacts/n15-03h-20261027/containment-preflight.json), [frozen command/policy](../artifacts/n15-03h-20261027/frozen-execution.json), [whitelist](../artifacts/n15-03h-20261027/whitelist.json).

## Actual provider loading — PASS

Loader stderr records **calling init** for the exact qualified provider paths:

| Provider | Actual initialized path | SHA-256 bound to the prehashed read-only file |
|---|---|---|
| Fixed zlib |/qualified/lib/libz.so.1|27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de|
| Approved libgomp |/qualified/lib/libgomp.so.1|645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3|

This is actual initialization evidence plus the checked read-only file binding, not just a search-attempt line, SONAME or upstream zlib version string. The older host zlib and aliases were absent. No unexpected initialized object was found. **15 library initialization paths** were observed, all admitted. Process maps were not captured; no memory-image hash or maps observation is invented.

The Haswell CPU backend file was admitted but **was not among initialized libraries**. The version path proves native loader/completion startup and the observed dependency paths on this Linux x64 host. It does not prove backend kernel execution, model-format compatibility or inference.

[Raw stderr](../artifacts/n15-03h-20261027/native.stderr), [provider assessment](../artifacts/n15-03h-20261027/loaded-providers.json), [raw result](../artifacts/n15-03h-20261027/native-result.json).

## Resources and cleanup

| Observation | Recorded result |
|---|---:|
| Whole supervisor interval, including static preflight |55.674609s|
| Single native release to wrapper exit |0.015842108s|
| Native deadline reached |No|
| Final probe counted apparent / allocated storage |96,685,835 /97,976,320bytes|
| Resource observations / persisted periodic rows |109 /108|
| Requested sampling period / largest observed gap |250ms /1.676833s|
| Supervisor sampled RSS peak |33,681,408bytes|
| Supervisor kernel lifetime RSS high-water |663,040,000bytes|
| Maximum reaped-child kernel RSS, including trusted preflight/wrappers |30,081,024bytes|
| Separate native-only peak RSS |**Not measured**|
| Accounting errors / owned wrappers remaining |0 /0|
| Network/model/runtime acquisition |0bytes|

The raw PID sample1,298,432bytes belongs to the **blocked pre-exec bubblewrap image**; it must not be presented as an acquired-runtime peak. The separately labeled [offline assessment](../artifacts/n15-03h-20261027/assessment.json) corrects that interpretation while preserving the raw report. Kernel child maximum includes trusted preflight and wrapper descendants; it is not a precise native-only peak. Supervisor lifetime high-water is not native/model RSS.

Hard inherited **RLIMIT_AS2,000,000,000bytes** bounds process address space throughout; sampled RSS has a1.8GB precautionary stop. CPU/core/output limits also apply. Sampling is not hard realtime and missed the brief native phase. Focused QA fixture creation/deletion was serialized with accounting scans, with before/after accounting and process limits, avoiding a new scan race.

Storage includes whole reused runtime/libgomp/zlib trees, new scratch/logs/temp/cache, notice/metadata/control inputs and admitted host files. The small documentation/evidence delivery is counted separately in final validation; no claim of a hard filesystem quota.

The timer covered native release through completion. Wrapper exit was reaped; isolated PID1 no longer existed; its death terminates namespace descendants. Observer stopped; no owned process remained. No retry or process was left running.

## Preservation, security limits and next boundary

**583 source/data/package-file and5,783 historical artifact size/mtime records unchanged**, compared with pre-execution snapshots. This is a preservation check, not a fresh full-tree content-hash proof. Only this task's new evidence/temporary controller and review/governance documentation changed. N04 acceptance, N13 corpus, N14 indexes/claim contract, monitoring, telemetry, scenarios, UI and original acquired artifacts were preserved.

N15-03G's residual risk register remains applicable: complete current advisory coverage is unresolved; verified source-fix ancestry is not comprehensive binary certification; private-use notice support does not qualify future binary redistribution/source/relinking/NOTICE duties. No scientific/medical approval, release assurance, autonomous agent capability or general security guarantee follows from startup.

**A separately approved exact-Qwen acquisition and first-inference compatibility probe is technically justified as the next bounded step.** It still requires explicit model identity/hash/license and model-input security preflight, fresh resource/storage authorization and isolation/output limits. This run supplies no GGUF compatibility, model-memory, generation-speed, answer-quality or clinical evidence. No model acquisition or inference authority carries forward.

[Raw report](../artifacts/n15-03h-20261027/report.json), [offline interpretation](../artifacts/n15-03h-20261027/assessment.json), [resources](../artifacts/n15-03h-20261027/resources.jsonl), [controller source](../artifacts/n15-03h-20261027/probe-source.txt), [final validation](../artifacts/n15-03h-20261027/preservation-validation.json).

**STOP after N15-03H. Its Choice B expires. N15/N16 Not Started; all other statuses/gates unchanged.**
