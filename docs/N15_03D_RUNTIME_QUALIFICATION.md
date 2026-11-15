# N15-03D — libgomp acquisition and conditional runtime qualification

Date: **2026-10-26. Outcome: BLOCKED at authoritative current-provider security.** The exact approved package was acquired once, authenticated, safely unpacked and statically checked. The required Ubuntu CVE request timed out. **No acquired runtime or library was executed/loaded; no version/help, model or inference command ran. No retry.** N15/N16 **Not Started**, all other module statuses unchanged.

## Authority, scope and accounting

Owner approved one continuation under activated [DE-N14-N15-01](DE_N14_N15_01.md), with **N15-03D-only Choice B**: monitored counted storage1,500,000,000bytes/precautionary stop1,350,000,000bytes, acknowledged possible temporary overshoot; acquisition150MB/network900s/processRSS2GB,CPU-only. This replaced expired permission for this task only. It did not approve an alternate provider/runtime, OS package installation, compilation, model, inference or integration.

Fresh private disk-backed scratch: **`/var/tmp/astra-n15-03d-4s2m9qlg`**, ext4 `/dev/sdd`. HOME/TMPDIR/cache/tool output and package extraction use owned scratch. The unchanged corrected `scripts/n15_probe_accounting.py` was reused, SHA-256 **`6af29d0ff7d12346136f42479e0672a7440ed161997ec04850e1cbebcde23761`**. Its prior30/30 focused QA is reused, **not rerun or counted as new tests**. The isolated new controller parsed successfully; no application/QA source changed.

Accounting includes the entire new scratch (package, data tar, staging, notices, home/cache/tmp/output), entire reused **`/var/tmp/astra-n15-03-swuxjpfe`** archive/extraction/log tree, explicit controller/attempt/baseline files, and symlink/root metadata. It uses the corrected shared lock/atomic fsync persistence,250ms observer, fail-closed child registration/termination,2GB address-space cap and1.8GB RSS precautionary stop. No broad suite, browser, telemetry or SQLite work.

## Exact package and authenticity — PASS

| Field | Actual result |
|---|---|
| Distribution / host | Ubuntu26.04/Resolute, x86_64/amd64, glibc2.43 |
| Package | **libgomp1:amd64=16-20260322-1ubuntu1**, source gcc-16 |
| Exact original | **`libgomp1_16-20260322-1ubuntu1_amd64.deb`** |
| Official source | `https://archive.ubuntu.com/ubuntu/pool/main/g/gcc-16/libgomp1_16-20260322-1ubuntu1_amd64.deb` |
| Acquired complete bytes | **162,278**, HTTP200/Content-Length match, one attempt |
| Actual and authenticated publisher SHA-256 | **`add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314`** |
| Acquisition elapsed | **2.821900s**, no redirect/retry/resume |
| Local retained original | `/var/tmp/astra-n15-03d-4s2m9qlg/libgomp1_16-20260322-1ubuntu1_amd64.deb` |

Reverified the existing Ubuntu resolute InRelease signature with preinstalled archive key **F6ECB3762474EDA9D21B7022871920D1991BC93C**, exit0/VALIDSIG; complete local Packages SHA-256 **92eb335c0ed27983d41a5a0efdf0edce3e67bfa34e8e987af9df260ca72d9bf9** matches the prior authenticated pin and signed release. Exact version/architecture/size/SHA stanza matches acquired control metadata and original bytes. This is the [N15-03C](N15_03C_LIBGOMP_QUALIFICATION.md) chain, not an inferred standalone .deb signature or current-security certification. No apt update, install, sudo, linker-cache or global environment change.

The `.deb` has the expected three ar members. Trusted dpkg-deb was used only to read control metadata/decompress its data tar; no maintainer script or package installation ran. All **9 data members** were checked for paths, duplicates, unsafe types/modes and escaping links before data-only extraction. Actual regular payload **385,208 bytes**; no absolute/traversal/unsafe hardlink extraction. The relative SONAME link stays inside staged data. Original package and data tar remain outside ASTRA; no native payload was copied into application dependencies/assets.

## Actual ELF and symbol results

Staged library: `staged/usr/lib/x86_64-linux-gnu/libgomp.so.1` → `libgomp.so.1.0.0`; **ELF64 AMD x86-64**, **SONAME libgomp.so.1**, actual library SHA-256 **645478cbe100d1465b9d45f7047bca3965358f4d399937e544f55ac7a924d5a3**. Its package ELF note identifies Ubuntu/gcc-16/16-20260322-1ubuntu1/amd64. GNU properties record IBT/SHSTK; these notes alone are not native CPU execution or final backend compatibility proof.

**All four required namespaces are actually exported: GOMP_1.0, GOMP_4.0, GOMP_4.5 and OMP_1.0.** Defined symbol/version pairs matched **11/11 consumer bindings,10 unique pairs**:

- Base: GOMP_atomic_start/end, GOMP_loop_end at GOMP_1.0; GOMP_parallel at GOMP_4.0; GOMP_loop_nonmonotonic_dynamic_start/next at GOMP_4.5.
- Haswell CPU candidate: GOMP_barrier/single_start at GOMP_1.0, GOMP_parallel at GOMP_4.0, omp_get_thread_num/omp_get_num_threads at OMP_1.0.

**Provider DT_NEEDED is libc.so.6 only.** Its10 recorded GLIBC version requirements range from2.2.5 through **2.38**; the host reports glibc2.43. This is consistent with the declared libc minimum, **not a completed per-symbol or native loader test**. No library loading/ldd was used. Full current transitive/per-symbol/plugin/CPU qualification was **not certified** before the security stop. Prior N15-03C's static16-file closure, including standard host libraries/OpenSSL/zlib/zstd, remains historical evidence rather than a newly executed full-closure pass. Do not claim all dependencies were natively resolved.

## Licensing — notices preserved; full runtime review remains open

The package's `usr/share/doc/libgomp1` is a relative link to separately packaged `gcc-16-base`. It contains no standalone copyright file. The already verified exact-source/exact-version GCC copyright was rehashed against **d7815dd2364180835891947d96d808878204dea45b8597602a7952332195fbea** and preserved separately in scratch with full GPL-3 text. It explicitly covers libgomp under **GPL-3.0-or-later WITH GCC Runtime Library Exception3.1**. The official source copyright association is preserved in N15-03C evidence.

No notice permission was fabricated or relabeled MIT. Before any later sandbox distribution, provide the matching documentation target/explicit notices and satisfy applicable corresponding-source obligations. The staged documentation link's target is not populated by this package alone. The exception is not blanket waiver of library redistribution duties. Full llama.cpp embedded/vendor notices, exact dependency security and redistribution qualification were not completed after the failed security gate; the root archive MIT text/source-fix ancestry cannot substitute for them.

## Confirmed first failure — authoritative security unavailable

One bounded exact-source/release query was attempted:

`https://ubuntu.com/security/cves.json?package=gcc-16&version=resolute&limit=20`

It failed with **TimeoutError: The read operation timed out**, **15.530482s**,0response-body bytes recorded and **no complete authoritative CVE result**. This is not zero advisories, patched-package evidence or permission to clear an unresolved high-severity finding. No affected/fixed-version range is inferred. No retry, alternate package, security guard change or continuation to native execution occurred.

The probe stopped immediately at this gate under the owner's rule. Fresh private-filesystem/network isolation testing, full bundled-library/dependency security/notices and final CPU/loader checks were not reached. Earlier Bubblewrap isolation/source-fix results remain historical evidence only. **Acquired-native version/help/startup: NOT EXECUTED.** There is no native exit code, loader success, no-network native execution result, GGUF/model compatibility or generation-performance evidence.

## Actual resources and process shutdown

| Observation | Actual value |
|---|---:|
| Dependency payload acquired | **162,278bytes** |
| New llama.cpp/model payload | **0bytes /0bytes** |
| Measured response bodies |162,278bytes; TLS/HTTP overhead not measured |
| Total network-request elapsed | **18.352381s**, below900s |
| Supervisor elapsed | **22.344505s** |
| Final counted apparent / allocated | **66,747,649 /67,354,624bytes**, before final report replacement |
| Maximum sampled apparent / allocated |66,747,105 /67,354,624bytes |
| Supervisor sampled current-image RSS peak | **50,569,216bytes** |
| Supervisor kernel lifetime peak | **608,796,672bytes**, separate from sampled current-image peak |
| Maximum trusted-tool child kernel RSS peak | **27,447,296bytes** |
| Observations / periodic rows | **91 /90** |
| Configured cadence / largest observed periodic gap |250ms / **261.200ms**, scheduling/I/O jitter retained |
| Accounting failures / remaining owned children | **0 /0**; observer stopped |
| Acquired-runtime commands / inference | **0 /0** |

No measured storage/RSS breach occurred. Monitoring remains a stop policy rather than a hard filesystem quota or guarantee against transient overshoot. Tool processes were bounded and tracked; none was an acquired-runtime/model process. Delivery copies are small report text outside the measured supervisor interval. No scratch/history cleanup or OS changes.

## Evidence, preservation and next approval

[Outcome](../artifacts/n15-03d-20261026/outcome.json), [original stopped report](../artifacts/n15-03d-20261026/report.json), [package receipt](../artifacts/n15-03d-20261026/libgomp1_16-20260322-1ubuntu1_amd64.deb.receipt.json), [security failure receipt](../artifacts/n15-03d-20261026/ubuntu-gcc16-resolute-cves.json.receipt.json), [member inventory](../artifacts/n15-03d-20261026/deb-inventory.json), [ELF inspection](../artifacts/n15-03d-20261026/provider-ELF.stdout), [durable resources](../artifacts/n15-03d-20261026/resources.jsonl), [evidence manifest](../artifacts/n15-03d-20261026/evidence-manifest.json). New isolated controller text, raw static symbol/tool records and preserved license texts accompany these; originals/binaries remain in scratch. Original runtime archive SHA was reverified without downloading, moving or re-extracting it.

No application/QA/helper/package/corpus/ranking/telemetry/monitoring/graphics source changed. The small isolated controller syntax check and static integrity/symbol results are new verification, not a broad regression or new30-test claim. Final source/hash/history/link verification is recorded separately with this evidence.

Final preservation/consistency **PASS**: **923** prior source/data/evidence hashes and **5,487** historical artifact size/mtime records unchanged; **29** new evidence hashes valid; **9** Markdown documents/**528** local links/all **26** module IDs checked. Retained package, original archive and corrected helper hashes match. `artifacts/n15-03d-20261026/preservation-verification.json` preserves the actual counts, blocked security outcome and zero acquired-native commands. This does not convert the overall probe into a runtime/security pass. Nine report/governance Markdown files changed plus new small text evidence; no application/QA code or historical artifact changed.

**Qwen acquisition/first inference: NOT JUSTIFIED.** Current security assessment and full notice/dependency/isolation/CPU/native gates remain unsatisfied. A successful static GOMP check does not justify model loading.

**Exactly one smallest proposed next approval:** a bounded **metadata-only authoritative dependency-security and bundled-notice resolution task**, reusing the acquired package and archive. Obtain a trustworthy current source-package/release advisory snapshot/assessment through an accessible official channel and finish the applicable notice inventory, without repeating the unavailable live API, acquiring another package, running native code or changing versions. Do not infer absence of vulnerabilities from missing records. Any later no-model continuation requires fresh explicit task/resource approval after the mandatory gates are resolvable.

**N15-03D ends BLOCKED; its Choice B/task authority expires. N15/N16 Not Started**, N07/N13/N14/N09 In Progress, N01/N02/N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified. **STOP for separate approval.**
