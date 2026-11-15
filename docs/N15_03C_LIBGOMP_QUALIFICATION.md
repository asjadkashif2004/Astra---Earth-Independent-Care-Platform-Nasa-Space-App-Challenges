# N15-03C — official libgomp provider metadata qualification

Delivered 2026-10-26 Asia/Karachi; metadata collected 2026-10-25 UTC. **Outcome: PARTIAL.** One matching official Ubuntu provider is pinned and its cached repository authenticity chain verifies. Declared host dependencies match. Actual package bytes, exported symbols, current package-specific vulnerability status and native compatibility remain unverified. No package was downloaded or executed. **N15/N16 remain Not Started; all other module statuses and review gates are unchanged.**

## Authority and preserved runtime

The owner approved metadata/static inspection only under activated [DE-N14-N15-01](DE_N14_N15_01.md). Reused [N15-03B](N15_03B_RUNTIME_QUALIFICATION.md) and [N15-02](N15_02_QUALIFICATION.md), not their exhausted resource permissions. No package installation/download, apt update, source build, new llama.cpp acquisition, native loader/runtime invocation, model, inference, application/QA change or N16 work. Trusted existing readelf, gpgv, apt-cache, dpkg-query and ldconfig performed inspection only; **ldd was not used**.

The existing b11669/v0.7.0 archive, source commit `620d2225cc436ab0b001e3200e590e3b286ef9ab`, was rehashed without extraction or execution: **17,851,611 bytes**, SHA-256 **`cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac`**. It remains outside ASTRA. This task does not alter the runtime or qualify Qwen/model loading.

## Exact provider and host

| Field | Verified metadata |
|---|---|
| Host | Ubuntu **26.04 LTS / Resolute**, WSL2, x86_64/amd64, glibc **2.43** |
| Official binary package | **`libgomp1:amd64=16-20260322-1ubuntu1`** |
| Source package / repository | **gcc-16**, Ubuntu **resolute/main**, `archive.ubuntu.com/ubuntu` |
| Exact filename | `pool/main/g/gcc-16/libgomp1_16-20260322-1ubuntu1_amd64.deb` |
| Publisher index size | **162,278 bytes**; not downloaded |
| Publisher index SHA-256 | **`add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314`** |
| Installed-Size | **406 KiB = 415,744 bytes**, publisher estimate, not measured extracted usage |
| Declared dependencies | `gcc-16-base (= 16-20260322-1ubuntu1)`, `libc6 (>= 2.38)` |
| Installed matching dependencies | gcc-16-base **16-20260322-1ubuntu1**; libc6 **2.43-2ubuntu2.4** |
| Host libgomp resolution | Not installed; no match in x86-64 loader cache or four previously allowed conventional paths |

Local apt metadata and the [official Ubuntu package listing](https://packages.ubuntu.com/resolute/amd64/libgomp1) identify this same version. No package from another Ubuntu release, private bundle, GPU offload package or newer runtime is proposed. Exact future URL, **not fetched**: `https://archive.ubuntu.com/ubuntu/pool/main/g/gcc-16/libgomp1_16-20260322-1ubuntu1_amd64.deb`.

## Authenticity and integrity — cached chain PASS, freshness limited

Three existing InRelease signatures verified with **gpgv exit 0 / VALIDSIG**, using the preinstalled `/usr/share/keyrings/ubuntu-archive-keyring.gpg`: signer **`F6ECB3762474EDA9D21B7022871920D1991BC93C`**, Ubuntu Archive Automatic Signing Key (2018). No keyring/global configuration change or independent trust bootstrap occurred.

| Signed suite | Release Date (UTC) | Main amd64 Packages bytes | Index SHA-256 matches signed record |
|---|---|---:|---|
| resolute | 2026-04-23 17:07:15 | 7,581,722 | PASS |
| resolute-updates | 2026-10-19 07:31:48 | 3,927,230 | PASS |
| resolute-security | 2026-10-19 17:15:56 | 3,180,992 | PASS |

The verified resolute Packages stanza supplies the exact .deb size/SHA-256 above. Its index SHA-256 is **`92eb335c0ed27983d41a5a0efdf0edce3e67bfa34e8e987af9df260ca72d9bf9`**. The inspected update/security main indexes contain no libgomp1 stanza. This establishes the **cached** candidate, not absence of later updates or vulnerabilities. These releases have no Valid-Until field; signature validity does not establish current freshness.

Future integrity method: verify Ubuntu-signed InRelease → its complete Packages hash → exact version/architecture/filename/size/SHA-256 → acquired .deb bytes. No separate .deb signature is asserted. Preserve exact bytes and receipt. Small saved stanzas plus signed releases/hash receipts are **not a self-contained Packages membership proof**: the complete original indexes remain at recorded `/var/lib/apt/lists/` paths and must be rechecked or supplied for independent reproduction. No apt update or package transfer occurred.

## Actual consumer ABI requirements and other dependencies

Static readelf inspection of the unchanged extracted **completion** path and a **Haswell CPU candidate** establishes:

- `libggml-base.so.0`: `GOMP_atomic_start`, `GOMP_atomic_end`, `GOMP_loop_end` at **GOMP_1.0**; `GOMP_parallel` at **GOMP_4.0**; `GOMP_loop_nonmonotonic_dynamic_start/next` at **GOMP_4.5**.
- `libggml-cpu-haswell.so`: `GOMP_single_start`, `GOMP_barrier` at **GOMP_1.0**; `GOMP_parallel` at **GOMP_4.0**; `omp_get_thread_num`, `omp_get_num_threads` at **OMP_1.0**. OMP_1.0 must not be omitted from future provider verification.

The package declares a native amd64 GNU OpenMP provider with compatible host dependencies; **actual SONAME, required exported symbol/version pairs, ISA properties and provider DT_NEEDED cannot be certified without inspecting its payload**. Package version comparison alone is not proof. No acquired library was loaded and no final CPU backend was selected or executed.

Recursive static resolution examined **16 existing ELF files**, with **42/44 required-version-node edges present**, **2 unresolved libgomp provider edges**, and **0 missing-version-node edges among resolved providers**. This checks version nodes, not every symbol binding, dlopen/plugin path or native startup. The raw broad OpenMP filter also captured OpenSSL COMP_* names; the reviewed OpenMP consumer list excludes these unrelated names.

Additional required host closure is **libstdc++.so.6, libgcc_s.so.1, libm.so.6, libc.so.6, ld-linux-x86-64.so.2, libssl.so.3, libcrypto.so.3, libz.so.1 and libzstd.so.1**. These resolve from recorded allowed x86-64 system paths; path/hash/version evidence is retained. The pinned completion's common library links OpenSSL; this host's libcrypto additionally links zlib and zstd. Available package metadata includes libssl3t64 **3.5.5-1ubuntu3.7**, zlib1g **1:1.3.dfsg+really1.3.1-1ubuntu3.1**, libzstd1 **1.5.7+dfsg-3**. Availability is **not security clearance**. No new package is presently identified for these existing paths, but their full isolation, per-symbol, notice and advisory checks remain required.

## Licensing and security

The [official exact-version copyright record](https://changelogs.ubuntu.com/changelogs/pool/main/g/gcc-16/gcc-16_16-20260322-1ubuntu1/copyright) was retrieved completely: **73,896 bytes**, SHA-256 **`d7815dd2364180835891947d96d808878204dea45b8597602a7952332195fbea`**, identical to the installed gcc-16-base copyright. It explicitly places **libgomp under GPL-3.0-or-later WITH GCC Runtime Library Exception 3.1**. Full copyright/exception and GPL-3 texts are preserved as metadata.

The exception permits qualifying independent-module combinations under their own terms; it does not relicense libgomp as MIT or remove all GPL obligations. Preserve copyright, full GPL/exception notices and applicable source identity. Any later binary redistribution must satisfy applicable corresponding-source/provision obligations; mere public download availability is not a blanket redistribution conclusion. Inspect the actual package's documentation/symlink targets and preserve the required exact-version notices inside scratch before runtime distribution. No source package acquisition is authorized here.

**Current package-specific vulnerability/patched status: UNVERIFIED.** The bounded official gcc-16 CVE API request timed out; the notices API request returned **HTTP 422**, which is a rejected query, not zero results. A separate [official notices text search](https://ubuntu.com/security/notices?details=gcc-16&release=resolute) returned no matches in its cached page; textual absence is not an authoritative affected-package/fix assessment. Searches did not establish any specific applicable CVE or fixed-version range; neither an invented advisory nor a zero-advisory assertion is recorded. Signed October 19 indexes cannot fill this freshness gap. Requests/failures are preserved; no retry loop or broad feed acquisition.

Before any acquired-code execution, obtain a reliable current Ubuntu source-package/release advisory assessment, inspect the actual library/dependency inventory and stop on a relevant unresolved high-severity issue. The 13 previously verified llama.cpp source-fix ancestries remain separate evidence and do not certify libgomp, host dependencies or the native artifact. Existing archive vendor/redistribution checks remain open.

## Isolated staging and size feasibility — proposed, not executed

The package can **in principle** be unpacked as data into private disk-backed scratch without package installation or maintainer scripts. First verify package integrity and ar/tar paths, types, modes, safe in-root links and expansion bounds. Verify the actual library exports and documentation; handle any documentation link to gcc-16-base using the already verified exact-version notice rather than permitting an escaping link or assuming the base package is unnecessary. No .deb inventory or extraction has occurred.

Use a read-only private library directory in an explicit subprocess-only loader search path, followed by only the approved runtime/host closure. Preserve process/filesystem/network isolation and environment sanitization; no global LD_LIBRARY_PATH, LD_PRELOAD, ldconfig or OS setting change. Revalidate actual CPU backend and every loader dependency; supplying libgomp alone is not a native compatibility pass. Native checks remain conditional on all static/security/legal/isolation gates.

Expected incremental payload **162,278 bytes** and publisher installed estimate **415,744 bytes** total approximately **578,022 bytes** before receipts/metadata/filesystem overhead. This is far below the **proposed** 150 MB runtime-acquisition and 1.5 GB counted-storage ceilings; it is not a measured extraction size or renewed permission. A future bounded extraction should impose its own small expansion ceiling. Existing archive/extraction, staged host libraries, caches/temp/output and accounting must all remain in the next task's counted scope.

## Evidence, verification and exact next approval

Evidence: [assessment](../artifacts/n15-03c-20261025/report.json), [repository chain](../artifacts/n15-03c-20261025/repository-chain.json), [static closure](../artifacts/n15-03c-20261025/elf-dependency-closure.json), [network receipts](../artifacts/n15-03c-20261025/network-receipts.json), [copyright comparison](../artifacts/n15-03c-20261025/copyright-comparison.json), [archive preservation](../artifacts/n15-03c-20261025/archive-preservation.json), [manifest](../artifacts/n15-03c-20261025/evidence-manifest.json). Raw signatures, signed releases, selected package stanza and static tool records accompany these. Package/runtime/model downloads, installation, acquired-native commands and inference: **all zero**. One complete metadata body was 73,896 bytes; failed-request body bytes are not established. The metadata client elapsed **17.490480 seconds**; this is not native runtime performance or a renewed resource policy.

No application/QA/package/corpus/ranking/status change. No browser/regression suite, storage cleanup or historical-evidence edit. Metadata signatures/hashes, source/evidence preservation and documentation consistency are the relevant checks; final counts are recorded in the new preservation verification record.

Final verification **PASS**: **998** prior source/data/evidence SHA-256 records and **5,427** historical artifact size/mtime records preserved; **58** new evidence hashes verified; **9** Markdown documents/**520** local links/all **26** module IDs checked. Three signed index chains pass; **42** resolved version-node edges pass, with **2** libgomp edges explicitly unresolved. Archive SHA-256 is unchanged. `artifacts/n15-03c-20261025/preservation-verification.json` records these counts. This is metadata/static verification, not a native or security certification; no application/QA tests were run.

**Exactly one recommended next task, requiring separate approval:** acquire **only this exact 162,278-byte .deb once**, authenticate it, safely stage and inspect its exports/notices/dependencies, complete current dependency/security qualification, then **conditionally** run the existing pinned no-model `llama-completion` version/help checks in the isolated sandbox. Proposed small-resource bounds: package bytes exact, supporting official metadata ≤1,000,000 bytes, network ≤30 seconds with no automatic retry; extracted package ≤2,000,000 bytes; native checks ≤10 seconds each; retain ≤2 GB process RSS and CPU-only. The owner must separately approve a fresh storage policy (including explicit 1.5 GB/1.35 GB monitored Choice B if selected), inclusive accounting and the acquisition/conditional execution scope. None is granted here. If fresh security/licensing, export, dependency, accounting or isolation checks remain unresolved, stop before native execution. No different package/runtime, installation, source build, model or inference fallback.

Remaining llama.cpp gates: actual provider integrity/ELF exports and dependency closure; current dependency security and full notices; final isolated loader/CPU checks; real no-model startup. Qwen compatibility/generation is entirely untested and **not ready for approval on this evidence alone**. N15/N16 **Not Started**, N07/N13/N14/N09 In Progress, N01/N02/N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified. **N15-03C ends here; STOP for separate approval.**
