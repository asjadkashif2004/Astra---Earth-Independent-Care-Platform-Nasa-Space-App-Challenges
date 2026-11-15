# N15-03E — runtime security and bundled-notice review

Date: **2026-10-26. Decision: BLOCKED. Not qualified for conditional startup.** A required host dependency, zlib1g, is below Ubuntu's published security-fixed version for **USN-8954-1 / CVE-2026-85091**. Other exact-package vulnerability and notice-completeness questions remain unknown. No acquired binary/library was loaded or executed; no package/runtime/model acquisition, installation, compilation, inference or version substitution. **N15/N16 Not Started; all other module statuses unchanged.**

This is a bounded metadata/static assessment under activated [DE-N14-N15-01](DE_N14_N15_01.md), not comprehensive security certification. It reuses [N15-03D](N15_03D_RUNTIME_QUALIFICATION.md), the verified archive/package and prior source-fix proofs. N15-03D's resource permission is exhausted; no storage exception or native authority was renewed. No operational/QA source, corpus, ranking, monitoring, telemetry, graphics or review approval changed.

## Concrete security obstacle

The actual recorded completion dependency chain includes **libllama-common → libcrypto.so.3 → libz.so.1**. Current dependency files match the hashes in N15-03C's static closure. dpkg maps libz to installed **zlib1g:amd64 `1:1.3.dfsg+really1.3.1-1ubuntu3.1`**.

[Ubuntu USN-8954-1](https://ubuntu.com/security/notices/USN-8954-1), published **2026-10-22**, identifies **CVE-2026-85091** and lists **`1:1.3.dfsg+really1.3.1-1ubuntu3.2`** as the corrected Resolute version. The issue concerns non-blocking-write handling and a possible heap buffer overflow with crafted input. The installed version compares lower using trusted dpkg version comparison. The exact fixed version is independently present in the verified current Ubuntu security index.

**Classification: known unremediated package-level dependency finding.** Reachability in a no-model help/version invocation was **not tested or established**; no exploit, crash or native attempt occurred. This report does not claim that help/version itself triggers the issue. The required dependency security gate remains unsatisfied; no silent exception, system update or library replacement was made. Severity/CVSS was not independently established from the inspected notice and is not invented.

| Item | Verified evidence |
|---|---|
| Installed source/binary | zlib / zlib1g:amd64, `1:1.3.dfsg+really1.3.1-1ubuntu3.1` |
| Publisher-fixed package | `zlib1g:amd64=1:1.3.dfsg+really1.3.1-1ubuntu3.2` |
| Official package filename | `pool/main/z/zlib/zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb` |
| Publisher size / installed estimate | **61,786 bytes** /169KiB; not acquired or measured expanded |
| Expected publisher SHA-256 | **`10084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35`** |
| Declared dependency | libc6 (>=2.14) |
| Remediation permission | **None in N15-03E.** Separate approval needed; preserve existing runtime/libgomp pins. |

The official notice was inspected through the web tool. `zlib-security-finding.json` is a reviewer record, **not** an archived publisher-response original or invented publisher hash. The signed package index independently binds fixed package version, filename, size and checksum.

## Exact libgomp/source-package and Ubuntu status assessment

The existing libgomp1 package was rehashed unchanged: **162,278 bytes**, SHA-256 **add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314**. Actual binary control/ELF metadata, host source-package records and the newly retrieved official source descriptor agree on **gcc-16 `16-20260322-1ubuntu1`, amd64**. The source `.dsc` is complete52,875bytes/SHA-256 **64a579a45be2dafef92bf8e0984223dd1c009df061d2890f584fd8c08f41b2f2**; no source archive was acquired. Its uploader signature was not independently verified; do not equate this descriptor with a verified source-to-binary reproducible build.

A fresh official **resolute-security InRelease dated2026-10-25 13:27:49UTC** verified under installed Ubuntu archive key **F6ECB3762474EDA9D21B7022871920D1991BC93C**. Its Packages hash differs from the October19cache. One finite follow-up retrieved only the authenticated compressed metadata index:

- Packages.xz **606,180bytes**, SHA-256 **c9f4f90adfc5fcb1228e0aea6369c868ffa227b005782a1738ecdbb47fc46d56**.
- Complete decoded Packages **3,192,760bytes**, SHA-256 **c69a86813b52e0db2a7820d7a9c54dff5afc7a635fc58812e9928e6299beb2c5**. Bounded decompression verified both signed size/hash; no package content was downloaded.

| Required source/package group | Current recorded identity | Status established / remaining limit |
|---|---|---|
| gcc-16: libgomp1/libgcc-s1/libstdc++6 | 16-20260322-1ubuntu1 | Exact identity established. No entries in this security pocket; **not** vulnerability clearance, a complete source-specific CVE assessment or full -updates status. |
| glibc: libc/libm/loader | 2.43-2ubuntu2.4 | Installed libc matches current signed security publication; full current CVE assessment remains **Unknown**. |
| openssl: libssl/libcrypto | 3.5.5-1ubuntu3.7 | Installed version matches current signed security publication; full current CVE assessment remains **Unknown**. |
| zlib: libz.so.1 | installed…ubuntu3.1; fixed…ubuntu3.2 | **Known unremediated package-level finding**, USN-8954-1/CVE-2026-85091. |
| libzstd: libzstd.so.1 | 1.5.7+dfsg-3 | No entry in this security pocket; current source-specific vulnerability state **Unknown**. |

One known GCC notice, [USN-7700-1](https://lists.ubuntu.com/archives/ubuntu-security-announce/2025-August/009681.html), dated2025-08-19, describes **CVE-2023-4039**, an AArch64 compiler stack-protector issue for older source packages/releases. **Non-applicable to this x86-64/no-compilation startup profile** on architecture/component grounds. This is not a publisher declaration that current gcc-16 is comprehensively fixed.

Two metadata responses exceeded conservative collection caps and were not read: gcc-16 changelog declared840,946bytes, detailed official CVE-2023-4039 JSON declared2,022,201bytes. No truncated original, partial advisory clearance or retry was accepted. The changed security index was instead collected through its exact signed bounded representation. The complete current gcc-16/release vulnerability inventory remains unknown; absence of entries/search results is never used as clearance.

## Prior llama.cpp advisories and bundled-dependency findings

The freshly retrieved public llama.cpp advisory feed is **byte-identical** to the preserved13-record feed. All **13 source-fix ancestries** remain bound to commit **620d2225cc436ab0b001e3200e590e3b286ef9ab** through the existing N15-02 compare/patch/parent evidence:8core issues and5server/RPC-profile exclusions, each with source-fix evidence. Publisher range discrepancies, including the b2740/actual GGUF-initialization fix discrepancy, remain recorded. No source fix is relabeled comprehensive binary security proof.

Full dated assessment matrices, exact ranges and fix hashes: [ADVISORY_MATRIX](../artifacts/n15-03e-20261026/ADVISORY_MATRIX.md), [llama source matrix](../artifacts/n15-03e-20261026/llama-advisory-matrix.json), [cpp-httplib matrix](../artifacts/n15-03e-20261026/httplib-advisory-matrix.json), [Ubuntu/zlib finding](../artifacts/n15-03e-20261026/zlib-security-finding.json).

- **cpp-httplib0.61.0:** exact pinned source header and actual common-library version string agree. All **23** retrieved publisher advisory ranges exclude this source version; published fixed versions run through0.51.0. This is publisher-range evidence, not independent vendor-fix ancestry, exploit testing or complete binary certification. Exact descriptions/dates/ranges stay in the matrix.
- **nlohmann JSON3.12.0:** pinned forward-header blob matches earlier listing; actual common library has the matching ABI namespace. A vendored patch exists; its complete security implications were not established. An empty public publisher-GHSA feed is **not** proof of no vulnerabilities.
- **sheredom/subprocess.h:** exact unversioned vendor blob matches the earlier source listing. No numeric release was fabricated. An empty publisher-GHSA feed is not comprehensive safety evidence; later isolation/argument policy must constrain subprocess features.

No concrete unresolved llama.cpp-source advisory from the known13 is newly established; no vendor/host issue is dismissed solely because networking is intended to be denied. The zlib finding is the concrete current blocker. Complete current source-specific host advisory assessment remains an additional unresolved gate.

## Actual bundle and notice inventory

All **50 regular archive members** were rehashed against the preserved extraction inventory; **49 are ELF**, including **14 CPU variants**. The original archive SHA-256 remains **cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac**. No re-extraction or reacquisition. Static DT_NEEDED/SONAME/build-ID evidence is captured for all49ELF files, including archive-only server/RPC/multimodal tools. Minimal completion candidates are identified separately; no final execution subset/backend or plugin policy was implemented.

[Full actual bundle inventory](../artifacts/n15-03e-20261026/bundle-scope-inventory.json), [component/notice inventory](../artifacts/n15-03e-20261026/NOTICE_INVENTORY.md), [component identity evidence](../artifacts/n15-03e-20261026/component-identities.json), [host package identities](../artifacts/n15-03e-20261026/host-packages.json).

| Component / available identity | Notice evidence and future distribution duties |
|---|---|
| llama.cpp/ggml/core/common; v0.7.0/b11669, core SONAMEs0.7.0/ggml0.27.0 | Full root MIT text preserved. Retain copyright/permission/disclaimer and modifications. Root MIT does not license every dependency. |
| cpp-httplib0.61.0 | Pinned full MIT notice plus source header copyright preserved. |
| nlohmann JSON3.12.0 | Pinned Niels Lohmann2013–2025 copyright/SPDX-MIT declaration. Full standard MIT notice assembled from that declaration and pinned MIT permission text; explicitly labeled **derived**, not a publisher LICENSE.MIT original. |
| sheredom/subprocess exact blob | Public-domain/Unlicense dedication/disclaimer extracted verbatim from the pinned header; retain provenance. |
| libgomp/libgcc/libstdc++, exact gcc-16 source version | Full exact-source GPL-3.0-or-later/GCC Runtime Library Exception3.1 notice plus GPL3 preserved. The exception does not relicense libraries or waive applicable corresponding-source obligations. |
| libc/libm/loader, glibc2.43-2ubuntu2.4 | Full package copyright and LGPL2.1 text preserved; retain file-specific notices, provide corresponding-source/relinking rights where applicable. Manual/build-file license sections are not automatically assigned to runtime code. |
| OpenSSL3.5.5-1ubuntu3.7 | Package copyright and Apache2.0 text preserved. Retain applicable upstream NOTICE if provided; its completeness was not independently established. Build-only Perl license entries are not blanket runtime licenses. |
| zlib…ubuntu3.1 | Full Zlib notice preserved; source/version now fails the security gate. No patched package acquired. |
| zstd1.5.7+dfsg-3 | Full package BSD3/GPL2 alternative and file-specific Expat/Zlib notices preserved. A permissive distribution path must still retain all applicable subcomponent notices. |
| Remaining server/RPC/multimodal/utilities/other CPU variants | Actual member identity recorded; not proposed for bounded startup. Additional optional-vendor/all-archive redistribution closure remains unqualified. |

Do not run `--license` to collect notices in this task: no acquired native execution was authorized. No blanket MIT/Apache assignment, redistribution approval, complete binary SBOM or comprehensive legal certification is claimed. Ordinary full-standard/derived notice preservation is distinct from independent verification of all optional components and corresponding-source provision for future distribution.

## Remaining gates and verification

1. **Concrete dependency security blocker:** current libz package is below Ubuntu's fixed version. N15-03E does not permit replacing it, upgrading the OS or testing an alternate runtime.
2. Complete current exact-source/release vulnerability state for gcc-16 and remaining host libraries; publication matches and empty feeds do not close it.
3. Complete applicable notice/NOTICE/source-provision and optional-vendor boundaries for the exact future staged subset; no full-archive redistribution qualification.
4. Actual final dependency/per-symbol/plugin/CPU/isolation/native startup gates, deliberately unexecuted. Earlier11OpenMP binding checks and static16-file closure remain prior evidence; no fresh native resolution pass.

Finite direct collection: **14 distinct metadata URLs,12 complete originals,1,493,103 response-body bytes,14.525489 active request seconds,0retries**. Thirteen initial requests were followed by one exact signed-index request after its size/hash were verified, still within2MB/180active-second collection bounds. The official zlib notice web inspection/discovery is separate and not counted in those body/time totals. Two oversized responses were rejected before body reads; no failed URL was retried. Runtime/package/model binaries acquired: **0**. Local decoded package metadata is3,192,760bytes, preserved losslessly as the authenticated compressed original; it is metadata, not package payload.

New small metadata/static evidence only under `artifacts/n15-03e-20261026/`; raw source/legal text is untrusted inspection data, never executed. No source archive/build/install/browser/telemetry/SQLite/test-suite work. Relevant checks are artifact hashes, all50member hashes, signature/index/decompression hashes,13source mappings,23range assessments, source-blob bindings, notice provenance and final documentation/preservation consistency. No medical/scientific-review status changed.

Final offline verification **PASS**: **954** prior source/data/evidence hashes and **5,518** historical artifact size/mtime records preserved; **153** new evidence hashes verified; **50** actual member hashes, **49** ELF inventories, **13** source mappings, **23** vendor-range assessments and **2** source-blob bindings checked. Signed release/compressed+decoded index hashes pass. **9** Markdown documents/**536** local links/all **26** module IDs checked. New preservation-verification.json records BLOCKED/Not-Started/zero-native/zero-new-binary status. These are metadata/static checks, not native or comprehensive security certification. Nine report/governance Markdown files changed plus new evidence only; original source/helper/packages/corpus/rankings/history unchanged.

## Exactly one separately approvable next action

Approve one **isolated acquisition/staging and static qualification of the exact Ubuntu-fixed zlib1g:amd64 package** identified above:61,786bytes, SHA-25610084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35, no OS installation, original llama.cpp/libgomp pins retained. Explicit source-specific acquisition and fresh storage authorization are required; no expired Choice B transfers. Check actual integrity, safe extraction, SONAME/ABI/notices and remaining package-specific security evidence. **No native execution/model/inference in that proposed task.** This addresses the concrete blocker only; it does not waive the other unknowns or automatically authorize startup.

Qwen acquisition/inference remains unjustified. **N15/N16 Not Started**, N07/N13/N14/N09 In Progress, N01/N02/N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified. **STOP; no automatic native continuation.**
