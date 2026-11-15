# N15-01 metadata qualification — 2026-10-25

**Result: PARTIAL / RUNTIME ACQUISITION BLOCKED.** [DE-N14-N15-01](DE_N14_N15_01.md) was validly activated by the owner's explicit instruction, with no substantive scope/authority contradiction found. Earlier inactive statements are historical; the original proposal already required later adoption and separate bounded approval. This activation authorizes research sequencing and the single metadata task, not model/runtime acquisition, installation, inference, benchmark or integration. **N15/N16 remain Not Started; N07/N13/N14 remain In Progress.** All unrelated statuses and independent-review gates are unchanged.

## Metadata collected and limitations

One bounded public HTTPS metadata run preserved **14 complete records**, attempted 15 logical resources, acquired **378,905 body bytes** and ended after **14.462 seconds**. Largest body 151,912 bytes. Per-resource 262,144-byte/15-second and overall 2,000,000-byte/120-second bounds were enforced; pointer reads were additionally capped at 512 bytes. Bytes here exclude HTTP/TLS overhead; redirects are not additional retries. Raw originals, SHA-256 receipts and the failure are in [artifacts/n15-metadata-20261025](../artifacts/n15-metadata-20261025/receipts.json).

The last request, for the second runtime, stopped at `GitHub metadata repo outside scope` in the redirect guard. Its redirected target was not recorded, so no new owner/path is inferred. This was an intentional metadata-client source boundary, not proof of runtime incompatibility or a denied sandbox approval. No allowlist expansion, automatic retry, alternative-source fetch or subsequent network collection occurred. Remaining analysis used saved records only. All 14 completed raw-record lengths/hashes were checked offline.

**Zero model/runtime binaries transferred; zero installs, native execution or inference.** `/raw/...gguf` returned a 134-byte textual Git LFS pointer, not GGUF weights. No `/resolve/` weight, `/releases/download/` asset, installer or package endpoint was fetched. Saved workflow/README code is untrusted source metadata and was never executed.

## Exact model proposed pin — metadata verified

| Field | Verified publisher metadata |
|---|---|
| Repository | `Qwen/Qwen2.5-0.5B-Instruct-GGUF` |
| Immutable revision | `9217f5db79a29953eb74d5343926648285ec7e67` |
| Artifact | `qwen2.5-0.5b-instruct-q4_k_m.gguf` |
| Size | **491,400,032 bytes** |
| Expected weight SHA-256 | `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db` |
| Format | Publisher GGUF/Q4_K_M file identity; repository GGUF architecture `qwen2`; actual binary header/tensors not inspected |
| Access | Publisher revision metadata reports public, ungated, not disabled |
| Declared training/type | Pinned card explicitly describes an instruction-tuned causal language model and pretraining/post-training; no ASTRA generation or safety result follows |
| Rights | Exact revision LICENSE is Apache-2.0; original text preserved |

Primary records: [revision API](https://huggingface.co/api/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/revision/9217f5db79a29953eb74d5343926648285ec7e67), [revision tree](https://huggingface.co/api/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/tree/9217f5db79a29953eb74d5343926648285ec7e67?recursive=false&expand=false), [pinned LFS pointer](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/raw/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf), [pinned LICENSE](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/raw/9217f5db79a29953eb74d5343926648285ec7e67/LICENSE), [pinned card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/raw/9217f5db79a29953eb74d5343926648285ec7e67/README.md).

The revision response SHA, tree LFS size/hash and textual pointer agree. Git blob SHA-1 checks independently match the pinned tree for LICENSE (`6634c8cc3133b3848ec74b9f275acaaa1ea618ab`), README (`6c5b52e47b307cc84626fe22508f95e1cf617488`) and pointer (`a0ee18ee2bcb22c2b6c95360b292c2c40a2d7a03`). These establish metadata association, **not a hash check of unacquired weight bytes**. LICENSE text SHA-256 is `832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e`.

Apache-2.0 permits use/redistribution subject to its conditions: preserve the license and applicable notices, retain relevant NOTICE attribution if supplied, identify modifications and respect its other terms. No separate NOTICE file is listed in the returned unpaginated revision root. Retain the publisher card/attribution; this is not public-domain status, clinical validation or NASA endorsement. Future distribution must also retain runtime/component notices. Linked publications and runtime dependencies are not relicensed by this model license.

### Tokenizer, template and context

The revision API supplies a Qwen-style chat template with `<|im_start|>` / `<|im_end|>`, BOS string `<|endoftext|>` and EOS string `<|im_end|>`. The template includes an optional tools branch; the proposed research profile supplies **no tools** and must use a fixed audited tool-free format. Qwen tokenizer behavior must come from the actual GGUF/runtime, not MiniLM WordPiece. Numeric token IDs, merge tables, actual Q4_K_M metadata and byte-to-token parity remain unverified without the binary; no range request or partial binary inspection was performed.

Pinned card says 32,768 context tokens, while repository aggregate GGUF metadata says **8,192**, including for this 0.5B repository. Neither proves the selected Q4_K_M header's actual limit. Retain **2,048 total / 1,536 prompt / 512 generated** as the proposed restricted policy; verify the actual header/tokenization before inference. No scaling or silently truncated quotations. Instruction tuning and publisher-directed llama.cpp use support technical candidacy, not a claim of adequate answer quality, accurate quotation copying or safety.

## CPU runtime comparison — at most two

| Candidate | Exact version evidence | Outcome |
|---|---|---|
| Preferred source candidate: **llama.cpp** | Official stable `v0.7.0`, published 2026-10-15; full commit **`620d2225cc436ab0b001e3200e590e3b286ef9ab`**. Annotated tag object `757cad021b357f417065ddbc41a6e8f87c1f8136` resolves to that commit and agrees with release target. | Source/version pin established. **No CPU binary qualified**: this stable release lists only `nightly-tag.txt`, 7 bytes, with digest `sha256:0bbf7c261e41e777ad8d70f2c83f8d7dd2ae4d7e41a9b6f26926fbc902209c70`. This is not a runtime archive or its digest; pointer contents were not downloaded. |
| Alternative: **llamafile** | Request to `https://api.github.com/repos/Mozilla-Ocho/llamafile/releases/latest` hit the path-allowlist redirect guard before body acquisition. | **Unqualified**: no release, checksum, CPU dependencies, license or security status established in this task. No retry or fallback. |

**Recommendation:** retain llama.cpp `v0.7.0@620d2225…` as the source candidate for a bounded follow-up, not as an approved/fully qualified executable. No binary version/asset is ready for acquisition. Do not substitute the latest nightly, infer its build number, use the seven-byte pointer digest for a CPU archive or silently build from source.

Source records: [stable release metadata](https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/v0.7.0), [tag binding](https://api.github.com/repos/ggml-org/llama.cpp/git/ref/tags/v0.7.0), [annotated tag](https://api.github.com/repos/ggml-org/llama.cpp/git/tags/757cad021b357f417065ddbc41a6e8f87c1f8136), [pinned license](https://raw.githubusercontent.com/ggml-org/llama.cpp/620d2225cc436ab0b001e3200e590e3b286ef9ab/LICENSE), [pinned CPU release workflow](https://raw.githubusercontent.com/ggml-org/llama.cpp/620d2225cc436ab0b001e3200e590e3b286ef9ab/.github/workflows/release.yml), [pinned completion documentation](https://raw.githubusercontent.com/ggml-org/llama.cpp/620d2225cc436ab0b001e3200e590e3b286ef9ab/tools/completion/README.md). The saved release request used `/releases/latest` once, then resolved its immutable source binding; that discovery URL is not a future acquisition pin.

The tag's recorded signature verification is **false / unsigned**. HTTPS publisher metadata was collected; no signed-tag authentication is claimed. Root runtime license is MIT; preserve its copyright/permission text. Prebuilt transitive notices and exact redistributed libraries remain unknown without an actual asset manifest/archive.

### Compatibility evidence versus unperformed native checks

- Host metadata confirms Linux x64/glibc 2.43 with SSE4.2, AVX, AVX2, FMA and F16C; AVX512F is absent. This is not a performance test.
- Pinned workflow's CPU x64 job uses Ubuntu 22.04, `GGML_NATIVE=OFF`, `GGML_CPU_ALL_VARIANTS=ON` and dynamically loaded backends. This supports a runtime-dispatched CPU approach, not a claim that every packaged variant can run on this host. Never force an AVX512-only variant.
- Workflow build prerequisites include build-essential/libssl-dev. They do not establish an eventual executable's exact ELF/SONAME dependencies. libstdc++/OpenSSL/OpenMP/backend library identity, expanded disk size and actual native loading remain unverified. Higher glibc alone is insufficient proof of ABI compatibility; no packages were installed.
- Pinned completion docs expose local model path, offline mode, thread/batch-thread/context/output limits, single-turn mode and grammar controls. They support the proposed standalone subprocess interface with Node 24, avoiding Node native-addon ABI coupling; no Node integration or native flag execution was tested.
- Offline flags must be combined with OS-level network denial and no model-hub/URL/RPC/server options. Caller-owned deadlines and process-group termination provide the planned cancellation boundary; cancellation response/cleanup still needs a later approved probe. Do not alter the existing enrichment worker.
- Common release workflow enables server and RPC builds. A CPU-target archive is therefore **not** proof of a minimal, RPC-free or security-cleared executable. Do not launch bundled server/RPC tools or claim network isolation fixes parser bugs.

## Security review — metadata inventory, not clearance

Official [public advisory feed](https://api.github.com/repos/ggml-org/llama.cpp/security-advisories?per_page=30) returned **13 published records**, no next-page link: 6 high, 2 critical, 4 medium, 1 low. These records include GGUF/tokenizer/memory-safety problems relevant even to offline model loading, plus RPC/server issues. **Applicability/fix ancestry has not been mapped to the proposed commit; no clean audit or known-fixed assertion is made.** A later date or semver tag cannot substitute for that mapping.

| Advisory / CVE | Severity | Publisher affected / patch metadata |
|---|---|---|
| GHSA-3p4r-fq3f-q74v / CVE-2026-27940 | High | ≤ b8145 / ≥ b8146 |
| GHSA-j8rj-fmpv-wcxw / CVE-2026-34159 | Critical | ≤ b7991; patched-version field empty |
| GHSA-96jg-mvhq-q7q7 / CVE-2026-33298 | High | < b7437 / b7824; preserve this nonidentical range, do not guess |
| GHSA-8947-pfff-2f3c / CVE-2026-21869 | Low | ≤ 55d4206c8 / ≥ c78fb90 |
| GHSA-vgg9-87g3-85w8 / CVE-2025-53630 | High | < 26a48ad / 26a48ad |
| GHSA-7rxv-5jhh-j6xx / CVE-2025-52566 | High | < b5721 / b5721 |
| GHSA-g4cc-763q-h9h6 | Medium | c33fe8b8 listed in both fields; unresolved applicability |
| GHSA-8wwf-w4qm-gpqr / CVE-2025-49847 | High | All versions before patch / ≥ b5662 |
| GHSA-wcr5-566p-9cwj / CVE-2024-42479 | Critical | < b3561 / ≥ b3561 |
| GHSA-5vm9-p64x-gqw9 / CVE-2024-42478 | Medium | < b3561 / ≥ b3561 |
| GHSA-mqp6-7pv6-fqjf / CVE-2024-42477 | Medium | < b3561 / ≥ b3561 |
| GHSA-49q7-2jmh-92fp / CVE-2024-41130 | Medium | ≤ b3426 / b3427 |
| GHSA-p5mv-gjc5-mwqv / CVE-2024-32878 | High | b2715 / b2740 |

Individual advisory URLs and original descriptions/version fields are preserved in [the raw feed](../artifacts/n15-metadata-20261025/llama-cpp-advisories.txt). This is not an installed/transitive dependency audit and does not establish absence of unpublished or vendor-library vulnerabilities. Unmapped serious advisories block acquisition clearance; no source/network bypass is used to dismiss them.

## Resource feasibility and retained safety contract

| Target, not approved consumption | What can be established now |
|---|---|
| Model/support ≤550 MB | Weight metadata 491,400,032 bytes leaves about 58.6 MB for support. Model-side metadata acquired here totals 26,679 bytes. Complete weight-byte integrity/native loading still require later acquisition. |
| Runtime acquisition ≤150 MB | **Unverified**: no CPU archive size/hash identified; seven-byte tag pointer is not evidence of runtime size. |
| Network ≤900 s | No binary-transfer throughput measured. The metadata run used 14.462 s; this cannot predict completion time for 491 MB. |
| Native peak RSS ≤2 GB | **Estimated only**: prior 0.8–1.6 GiB planning envelope for short-context 0.5B; no native load/generation. Actual buffers/allocator/cache and hard guard remain unqualified. |
| Counted disk ≤1.5 GB | Plausible only with one model copy and a suitably small runtime. Archive expansion/cache/input accounting is unknown; no available hard quota was established. No expired N14 monitored-storage approval is inherited. |

The existing proposed two-thread, 2,048-context, bounded-output/time/cancellation controls remain proposals. Budgets and storage/RSS enforcement require explicit owner approval; metadata completion does not adopt them. Retain default hard-storage policy unless a new task-specific monitored alternative is expressly accepted. No new model/runtime acquisition consumes these targets here.

The [prototype contract](N15_01_PLAN.md) is unchanged: general questions over existing NASA publication evidence only; canonical complete quotations or abstention; no arbitrary paraphrase verification, live crew records, diagnosis/treatment, N02 authority, N16 tools/Health Agent integration or independent-review claims. Offline execution must have no external network dependency. Exact attribution is not proof of scientific/clinical truth or answer relevance.

## Blockers, next action and smallest probe

1. Identify one exact official CPU archive corresponding to an accepted source commit, with publisher size/digest, expanded dependencies/notices and ABI requirements. The current stable asset list does not provide it.
2. Map published security fixes/affected builds to that source/binary pin; unresolved serious applicability cannot be called safe.
3. Obtain explicit approval of exact model/runtime pins and resource/enforcement design before any transfer or execution. Isolation/native/tokenizer/header checks remain later work, not missing facts that metadata can magically prove.

**Smallest next decision:** separately authorize a bounded llama.cpp-only metadata follow-up resolving the stable release's exact seven-byte text pointer (if needed) and matching official release/asset metadata plus advisory fix ancestry. The present client forbids `/releases/download/` even for that text pointer; any exact metadata-route exception must be explicit, not a broad binary-download allowlist. Do not retry llamafile or switch runtime/model automatically.

**Smallest later acquisition/compatibility probe, only after those blockers are resolved:** one exact verified CPU runtime archive, ≤150 MB, in fresh disk-backed disposable storage outside ASTRA; inspect integrity, extraction bounds, licenses, ELF dependencies and bounded offline `--version`/`--help`/CPU loading without a model. No weight download, generation, application integration or benchmark in that first probe. It needs explicit storage/RSS/isolation approval and first-failure stop. Model acquisition and genuine generation need their own later approval; no acquisition probe is ready to run now.

## Final offline validation

The interrupted validation completed successfully and its existing result was recovered on resumption; no metadata requests or checks were repeated. **PASS:** all 722 tracked source/data/prior-evidence files and group memberships preserved; 11 Markdown documents checked with 508 local links resolving and all 26 module IDs retained. All 14 completed metadata records passed length/SHA-256 verification, three model Git blob bindings matched, and the runtime release/tag/commit binding matched. Recorded metadata bounds and unchanged activation/status contracts passed. These are documentation, integrity and preservation checks, not native compatibility, security clearance or application tests.

The metadata task is closed at this report. Activated sequencing remains a recorded owner decision, but this task's operational authority is exhausted. **STOP.** N15/N16 remain Not Started; no source/test/ranking/monitoring/scientific-review changes or native verification occurred. Governance/tracker/handoff record the exact partial outcome.
