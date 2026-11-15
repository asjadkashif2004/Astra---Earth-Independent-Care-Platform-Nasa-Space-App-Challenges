# N15-03 — isolated CPU runtime probe

Date: 2026-10-25. **Outcome: BLOCKED before acquired-runtime execution.** The approved archive was acquired completely, its exact hash verified, safe extraction completed and the system-tool isolation preflight passed. A temporary disk-accounting scanner then failed during static inspection. The single probe stopped; no acquisition, inspection or native-probe retry followed. **N15/N16 remain Not Started; all other statuses and scientific/medical review gates are unchanged.**

## Approval and isolation

Owner explicitly approved this exact runtime under [DE-N14-N15-01](DE_N14_N15_01.md), with **N15-03-only Choice B**: monitored1,500,000,000-byte counted storage,1,350,000,000-byte stop watermark, acknowledged possible transient overshoot;150,000,000-byte runtime acquisition,900-second network ceiling,2,000,000,000-byte per-process RSS ceiling, CPU only/no model. The older smaller proposed probe budgets were not silently substituted. No global settings, package-manager installation or source compilation occurred.

Owned scratch directory: **`/var/tmp/astra-n15-03-swuxjpfe`**. Actual mount: ext4 `/dev/sdd`, disk-backed and writable during the approved execution, not a package/cache tmpfs. The supervisor wrote durable JSONL events/resource samples and atomic checkpoints outside the child. The original archive/extraction/raw logs remain there; no cleanup or overwrite.

Before acquisition, Bubblewrap using existing system Python passed a fresh user/PID/mount/network namespace preflight with capabilities dropped, clean environment, no inherited application file descriptors, and only read-only system tools/libraries plus owned temporary storage. Sandbox network namespace `net:[4026532233]` differs from host `net:[4026531833]`; only loopback, no routes. Checked ASTRA project path, owned private canary, `/home`, `/mnt` and `/root` were absent. A 2,000,000,000-byte hard address-space limit was observed inside; core dumps disabled. This was a **system-tool isolation check**, not an acquired runtime or model load. No formal proof of every isolation property is claimed.

## Acquired identity — PASS

| Field | Actual result |
|---|---|
| Runtime | llama.cpp v0.7.0 / b11669 |
| Preserved source association | `620d2225cc436ab0b001e3200e590e3b286ef9ab`, as verified in N15-02 |
| Original filename | `llama-b11669-bin-ubuntu-x64.tar.gz` |
| Exact official URL | `https://github.com/ggml-org/llama.cpp/releases/download/b11669/llama-b11669-bin-ubuntu-x64.tar.gz` |
| Publisher redirect | HTTPS `release-assets.githubusercontent.com`; controlled release-asset path, no model/package/source download |
| Complete actual bytes | **17,851,611**, matching Content-Length and pinned publisher size |
| Actual SHA-256 | **`cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`**, matching the approved pin |
| Transfer | **6.819083 seconds**, one attempt, no retry |

The digest establishes equality with the pinned publisher artifact. It is not a signed-build attestation, proof of reproducible compilation or model compatibility. No model weights were requested.

## Archive and saved static findings

- **61 members:**50 regular files,10 relative symbolic links,1 directory; **46,118,030 uncompressed regular-file bytes**. Path/type/link/privileged-mode and expansion checks completed before extraction. No absolute/traversal paths, escaping links, hardlinks, devices or FIFOs accepted. Regular files were extracted non-executable with owner-only access. Full member identities/hashes are preserved.
- Archive contains CPU libraries and expected extra server/RPC/multimodal/utility tools from the upstream build. None was launched. Complete per-file content classification was interrupted, so the no-unexpected-executable-content gate is **not fully certified**.
- **143 completed readelf commands**, all recorded exit0;29 ELF headers/dynamic outputs,28 complete five-output records. Available headers identify ELF64 AMD x86-64. No `ldd` or acquired loader/executable was run. Remaining archive members/ELF records were not inspected after failure.
- Saved `llama-completion` metadata requests interpreter **`/lib64/ld-linux-x86-64.so.2`**, RUNPATH **`$ORIGIN`**, and needs `libllama-completion-impl.so` plus libc. Its implementation library additionally needs llama-common, llama, ggml-base, libstdc++, libgcc and libc. Required symbols in the inspected closure include **GLIBCXX_3.4.29**, GLIBC and CXXABI versions.
- Saved ggml-base and Haswell CPU metadata require **`libgomp.so.1`**, which is not included in the archive inventory. Earlier host inspection did not find it at the common system path; actual system resolution/symbol compatibility was **not completed**, so this remains a dependency blocker to resolve, not a certified missing-system-package diagnosis or permission to install it.
- CPU variants include x64/SSE4.2/Haswell and newer AVX512-capable variants. Some saved GNU notes advertise x86-64-baseline; that does not prove every compiled plugin instruction is supported. Ryzen/AVX2 host metadata is reused from N15-02. No plugin selection, CPU backend loading or native compatibility result was obtained.

These are **offline summaries of already saved output**, not resumed ELF commands or a replacement probe. The uncompleted static stage was not rerun.

## Licensing and security — incomplete, not cleared

The archive has one standalone notice file, `llama-b11669/LICENSE`, containing the MIT notice for the ggml authors,2023–2026. Its original bytes are preserved. There were no additional standalone notice/COPYING files in the member inventory. This does **not** establish that embedded vendor notices are absent or that root MIT covers all dependencies: complete embedded notices, exact bundled third-party versions and redistribution obligations were not verified.

N15-02's source-fix ancestry evidence for the13 identified upstream advisories is preserved and reused, not repeated. **The binary/bundled-dependency security audit was not completed.** Exact vendor/native-library identities, applicable advisories and any unresolved high-severity findings remain unverified; no clean audit or implied exception to those gates. There were no new security-database requests after the tooling failure. No native execution or redistribution can rely on the single root license or incomplete security inventory.

## Exact stopping reason

At **2026-10-25T17:24:54.127907Z**, elapsed **8.614 seconds**, the main-thread resource check raised:

`FileNotFoundError: /var/tmp/astra-n15-03-swuxjpfe/resources-latest.json.new`

The temporary helper's `disk()` iterates `root.rglob('*')` then calls `lstat()`. Concurrent observer `atomic()` creates `resources-latest.json.new` and renames it with `os.replace()`. A scan can enumerate that temporary name before it is renamed and then fail to stat it. This is an owned QA disk-accounting race, **not evidence of a runtime crash, model incompatibility, storage exhaustion or namespace failure**. The recorded observer-failure list is empty; the main-thread scan failed. No scanner correction or automatic retry was made during this probe.

The final report and existing measurements survived. **Zero acquired-runtime commands:** version/help, shared-library loading and model execution were not attempted. Trusted existing Bubblewrap/system Python/readelf were used for preparation and static inspection only.

## Actual resource evidence

| Measurement | Recorded result and limits |
|---|---|
| Archive payload / network time |17,851,611 bytes /6.819083 seconds; HTTP/TLS overhead not measured |
| Whole probe execution |8.615830 seconds to stopped final report; excludes subsequent documentation/evidence copying |
| Storage samples |18 durable samples; highest sampled apparent64,646,025 bytes / allocated65,163,264 bytes |
| Final scratch measurement |**64,646,533 apparent /65,167,360 allocated bytes**, before final report replacement; archive, extraction and raw logs included |
| Supervisor `/proc` observed high-water RSS |31,965,184 bytes |
| Supervisor kernel `getrusage` peak |**628,428,800 bytes**; retained distinctly from sampled current-image RSS, not model memory |
| Maximum child kernel `getrusage` peak |**20,635,648 bytes**, existing system tools/preflight only |
| Sampled simultaneous aggregate RSS |31,965,184 bytes maximum;0.5-second sampling misses short readelf processes, so this is **not a complete aggregate peak** |
| Guard status |Hard per-process address-space cap2GB/core-dump guard; no measured ceiling breach. Accounting scan failed, so future/full-trial resource enforcement is not certified |

The larger kernel lifetime peak and smaller sampled `/proc` values are reported separately; no unsupported explanation or native-LLM memory claim. Small report/static-log copies initially total703,388 bytes plus their manifest in ASTRA; no runtime binary was copied into application assets/dependencies. Task scratch, copies and temporary management files remain far below the storage watermark in recorded measurements; monitoring does not guarantee against transient overshoot, as the owner acknowledged.

## Evidence and preservation

[Raw stopped report](../artifacts/n15-03-20261025/report.json), [offline summary](../artifacts/n15-03-20261025/offline-summary.json), [events](../artifacts/n15-03-20261025/events.jsonl), [resource samples](../artifacts/n15-03-20261025/resources.jsonl), [archive inventory](../artifacts/n15-03-20261025/archive-inventory.json), [small evidence manifest](../artifacts/n15-03-20261025/evidence-manifest.json). Available readelf output and the exact temporary helper source are preserved in the same directory. The complete archive and extraction remain outside ASTRA; historical evidence is not replaced.

Post-failure actions were limited to reading existing output, copying small evidence and documentation/preservation checks. The default evidence-copy command hit a read-only workspace mount before creating its destination; supported escalation allowed that **copy only**, not probe execution/retry. No package, source, dependency, ranking, monitoring, telemetry, scenario, UI or anatomical code changed. No broad tests/browser collections were run. Final preservation/check results are recorded with the evidence.

Final offline validation **PASS**: **807 original source/data/prior-evidence SHA-256 values**, **5,237 historical artifact size/mtime records**, **156 copied-evidence hashes**, **9 Markdown documents /499 local links**, all26 module IDs and unchanged status boundaries. A temporary link-validator selector was corrected to decode existing percent-encoded PDF paths; no project link/source was changed to fit validation. Machine record: `artifacts/n15-03-20261025/preservation-verification.json`. These checks do not turn the blocked runtime result into a compatibility/security pass. Nine governance/report Markdown files changed; application/package/QA source unchanged.

## Remaining gates and next decision

**A Qwen acquisition/inference probe is not technically justified yet.** Archive integrity/isolation preflight alone do not establish native shared-library compatibility, complete licensing or dependency security. Tokenization/chat-template/GGUF/model loading, CPU inference, memory and generation behavior remain entirely untested.

The smallest proposed next task is a separately approved correction and focused non-native test of the temporary accounting scanner, followed only if separately authorized by continuation of the outstanding gates using the **existing verified archive**. No redownload, native retry or model permission is inferred here. Dependency/library acquisition, if needed, requires its own explicit approval; never install automatically. Preserve the original failure/measurements.

**N15-03 Choice B expires with this blocked delivery.** A future continuation needs its own explicit resource authorization. DE-N14-N15-01 remains activated for narrow sequencing eligibility, not a clinical/integration or indefinite execution grant. N15/N16 remain Not Started; all other module statuses unchanged. **STOP.**
