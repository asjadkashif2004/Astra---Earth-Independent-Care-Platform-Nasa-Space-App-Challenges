# N15-03B — offline runtime qualification continuation

Date: 2026-10-25. **Outcome: BLOCKED — required `libgomp.so.1` cannot be resolved from the archive or allowed host libraries.** Stopped at that first failed dependency gate, before acquired-runtime execution. No retry, download, dependency installation, compilation, version substitution, model loading or inference. **N15/N16 remain Not Started; all other statuses unchanged.**

## Authority, corrected accounting and isolation

Owner authorized one N15-03B continuation under activated DE-N14-N15-01, explicitly renewing Choice B **for N15-03B only**: monitored1,500,000,000-byte counted storage/1,350,000,000-byte stop, acknowledged transient-overshoot risk;2,000,000,000-byte process RSS maximum, CPU only. Acquisition ceiling150MB but actual new acquisition must be zero; no network authorized. This superseded expired resource permission for this task only; it did not approve missing-library acquisition, models or N16.

Focused accounting preflight **30/30 tests PASS**,0.064s. Used unchanged `scripts/n15_probe_accounting.py`, including shared scan/atomic lock, directory fsync, sticky fail-closed handling and synchronized owned-child registration. The temporary offline-only supervisor has no network/download functions and was run once with an attempt marker. No accounting errors occurred.

Fresh scratch: **`/var/tmp/astra-n15-03b-njtvtecv`**, verified writable disk-backed ext4 `/dev/sdd`. Writes to process HOME/TMPDIR/cache/output are directed to owned scratch. Accounting includes fresh scratch, **the entire reused `/var/tmp/astra-n15-03-swuxjpfe` input tree** (archive, prior extraction and raw logs), symlink/root metadata, controller source, preflight log and attempt marker. No duplicate archive or extraction was created. Bytecode caching disabled. Ordinary small unittest fixtures were removed by their tests before the runtime supervisor began; they were not runtime/model caches.

Fresh Bubblewrap system-tool preflight passed: clean environment/capabilities dropped/private PID-mount-network namespaces, only read-only system tools/libraries and owned disk-backed temporary storage. No routes; loopback only; private network namespace differed from host. ASTRA path, reused input root, private canary and `/home`/`/root`/`/mnt` were absent inside. Hard2GB address-space limit observed in the child. This verifies the tested isolation layout, **not acquired-runtime loading or model behavior**. Zero acquired-code commands ran.

## Archive identity and extraction — PASS

| Field | Verified result |
|---|---|
| Project/version/build | llama.cpp v0.7.0 / b11669 |
| Immutable source association | `620d2225cc436ab0b001e3200e590e3b286ef9ab`, reused N15-02 evidence |
| Local original | `/var/tmp/astra-n15-03-swuxjpfe/llama-b11669-bin-ubuntu-x64.tar.gz` |
| Complete bytes rehashed | **17,851,611** |
| Actual SHA-256 | **`cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`** |
| Publisher-pin match | PASS; no acquisition or source-build substitution |
| Tar safety | **61 members** rechecked for traversal/absolute paths, duplicate names, unsafe types/links and privileged modes |
| Reused extraction identity | All **50 regular-file hashes**,10 relative symlinks and1directory checked against preserved inventory;46,118,030 regular bytes |

No acquired file was executed or loaded, permissions promoted, payload moved or re-extracted. Historical N15-03/A evidence remains unchanged. New archive/member proof is in `archive-reverification.json`.

## Actual dependency failure and ELF findings

Three relevant files were inspected with trusted system **readelf**, not ldd or the acquired loader: `llama-completion`, `libllama-completion-impl.so`, `libggml-base.so.0`. Their available headers identify ELF64 AMD x86-64; saved RUNPATH is `$ORIGIN`. Completion requests `/lib64/ld-linux-x86-64.so.2`. These facts alone do not certify full CPU instruction compatibility, symbol closure or successful native loading.

| Needed component | Recorded resolution |
|---|---|
| Completion implementation, llama-common, llama, ggml-base | Present in verified archive extraction |
| libc | `/usr/lib/x86_64-linux-gnu/libc.so.6` |
| libstdc++ | `/usr/lib/x86_64-linux-gnu/libstdc++.so.6.0.35` |
| libgcc | `/usr/lib/x86_64-linux-gnu/libgcc_s.so.1` |
| **libgomp.so.1** | **UNAVAILABLE** in archive, x86-64 system loader cache and allowed conventional directories |

The base library's **DT_NEEDED includes `libgomp.so.1`**. Its recorded symbol requirements include **GOMP_1.0/GOMP_4.0/GOMP_4.5**, as well as GLIBC/CXXABI/GLIBCXX versions including GLIBCXX_3.4.29. No matching libgomp entry exists in the saved `ldconfig -p` output. Checked conventional paths:

- `/usr/lib/x86_64-linux-gnu/libgomp.so.1`
- `/lib/x86_64-linux-gnu/libgomp.so.1`
- `/usr/lib64/libgomp.so.1`
- `/lib64/libgomp.so.1`

This is a precise failure to resolve from **allowed** host libraries, not a claim that the file is absent everywhere on the machine. No unrelated project/probe/library bundle was searched or borrowed. Other dependency closure, exported-symbol matching, backend selection and native CPU compatibility remain incomplete. No automatic package install or fallback was attempted.

## License and security status

The previously preserved standalone archive MIT text remains covered by member-hash revalidation. Complete embedded/vendor notices, exact transitive component versions, redistribution obligations and applicable bundled-library advisories were **not completed**, because the required library failed first. They are not marked passed or waived. No external security/legal metadata request was permitted or made.

N15-02's13 source-fix ancestry mappings are reused as source-history evidence only. They do not prove binary reproducibility, complete native dependency safety, libgomp security or a clean installed-library audit. No relevant unresolved issue was ignored to permit execution. Root MIT and source ancestry cannot substitute for the missing gates.

## Native startup and resources

**Native startup: NOT EXECUTED / INELIGIBLE.** Version/help, loader behavior and CPU backend execution were not attempted. There is no acquired-runtime exit code, loader-error result, model-compatibility or generation-performance evidence. Existing trusted Python/Bubblewrap/readelf/ldconfig/findmnt were used only for preflight/static inspection; all owned children terminated, observer stopped,0remaining children.

| Actual observation | Value |
|---|---|
| New acquisition / network | **0 bytes /0 seconds**; no network requests |
| Supervisor execution | **1.524412 seconds**; separate preflight unittest0.064s |
| Storage scope | Fresh scratch plus entire reused input tree and explicit control files, not merely new output |
| Final measured apparent / allocated storage | **64,780,640 /65,347,584 bytes** before final report replacement |
| Maximum sampled apparent / allocated |64,780,439 /65,347,584 bytes |
| Supervisor observed `/proc` peak |23,015,424 RSS bytes |
| Supervisor kernel lifetime peak |**628,428,800 bytes**, retained separately from current-image sampled RSS |
| Maximum tool-child kernel peak |**14,405,632 bytes**, no acquired-runtime process |
| Resources |8observations including initial observation;7retained periodic JSONL rows; accounting errors **0** |
| Polling cadence |Configured250ms; observed maximum journal gap **253.378ms**, including scheduler/I/O jitter; no hard realtime250ms bound certified |
| Host headroom |Lowest recorded MemAvailable6,269,263,872bytes, above planning floor |
| Ceilings |No observed storage/RSS breach; hard process address-space cap2GB and1.8GB RSS precaution retained. Short tools are not fully captured by periodic RSS sampling; kernel counters retained |

No native/model RSS or performance claim follows. Monitored storage remains an observation/stop policy, not a hard quota or proof against transient overshoot. Raw journal/phase records were durably persisted with the corrected helper. Approximately100KB of small evidence was later copied into ASTRA; no runtime payload copied into application dependencies/assets. Copies are report delivery, outside the measured supervisor interval.

## Evidence, preservation and stop

[Stopped report](../artifacts/n15-03b-20261025/report.json), [dependency resolution](../artifacts/n15-03b-20261025/dependency-results.json), [resource journal](../artifacts/n15-03b-20261025/resources.jsonl), [resource summary](../artifacts/n15-03b-20261025/resource-summary.json), [preflight QA](../artifacts/n15-03b-20261025/focused-tests.txt), [evidence hashes](../artifacts/n15-03b-20261025/evidence-manifest.json). Readelf/cache output, archive proof, isolation output and offline controller text are preserved in the same new directory. Original input/evidence directories were not edited. No operational/QA source, package files, monitoring, telemetry, corpus, rankings, UI or anatomy changed. No browser/full-suite/model benchmark or scientific-review action. Final preservation counts are recorded with the evidence.

Final offline validation **PASS**:975 original source/data/evidence SHA-256 records unchanged;5,403 historical artifact size/mtime records unchanged;22 new evidence hashes verified;6 Markdown documents/327 local links and all26 module IDs/status boundaries checked.30 focused tests pass; archive/member/isolation/dependency-block evidence corroborated,0accounting errors/owned children/native commands/network or acquisition bytes. `artifacts/n15-03b-20261025/preservation-verification.json` records actual counts. This does not convert the blocked runtime qualification to a native/security/clinical pass. Only six report/governance Markdown files changed plus new small text evidence; existing application/QA/package files stayed unchanged.

**A separately approved Qwen GGUF acquisition/first-inference probe is not justified.** Resolve the required native dependency and all remaining CPU/symbol/license/security/isolation gates, then obtain genuine runtime startup evidence first. Model/GGUF/tokenizer/chat-template compatibility remains entirely untested.

**Exactly one smallest next task:** separately approve **metadata-only qualification of an official provider of `libgomp.so.1`** compatible with the host and required GOMP symbols: exact distribution/release/package/version/architecture, immutable identity/hash/size, license/runtime-exception notices and known advisories, plus a bounded isolated acquisition proposal if needed. No package acquisition/system installation or renewed probe follows automatically; no arbitrary local library borrowing or different llama.cpp build.

**N15-03B Choice B expires with this blocked delivery.** Fresh continuation/resource approval is required after dependency resolution. N15/N16 remain Not Started, all other module statuses unchanged. **STOP.**
