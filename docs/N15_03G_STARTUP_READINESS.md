# N15-03G — final bounded security and notice review

Date: **2026-10-27 Asia/Karachi**. Decision: **A. READY FOR SEPARATE STARTUP APPROVAL**.

This recommendation covers **one private, isolated, nonclinical, no-model llama-completion --version test**, using the existing 17-file subset and fixed zlib. It is not permission to execute, a complete current vulnerability inventory, binary security certification, redistribution qualification, model/inference readiness or N15 completion. **N15/N16 remain Not Started**; all other statuses and original review/dependency gates remain unchanged.

## Authority, method and limits

Owner authorized one final metadata-only review under [DE-N14-N15-01](DE_N14_N15_01.md), including a distinction between private execution and future redistribution. This records the resulting bounded engineering assessment; it does not grant new scope/resource authority or convert unknown security evidence into a pass. Earlier reports remain unchanged historical evidence.

Reused [N15-03F qualification](N15_03F_ZLIB_QUALIFICATION.md), [loading plan](N15_03F_LIBRARY_LOADING_PLAN.md), preserved E/F component/advisory/license records and their exact identities. No archive/package/hash/ABI investigations were repeated. No downloads, installations, acquired-native loading, models, inference, application/QA changes or storage renewal.

External collection is closed: one optional GNU GPL FAQ lookup timed out, without a usable body; no retry or mirror. Observed clock window **19:57:22–19:57:27 UTC on 2026-10-26**, approximately five seconds at one-second clock granularity, below 180 seconds. Actual transport bytes are not exposed by the tool. This missing explanatory FAQ is not required evidence: the full GPL/LGPL/Apache/MIT texts are already preserved. No new current-CVE clearance is claimed. [Source register](../artifacts/n15-03g-20261027/source-register.json).

## Exact 17-file assessment

All file paths, hashes and DT_NEEDED identities are reused from the [F static closure](../artifacts/n15-03f-20261027/static-dependency-closure.json), not remeasured. [G assessment](../artifacts/n15-03g-20261027/assessment.json) binds each row to that record. Dates for reused security evidence are 2026-10-26/27, not a new live snapshot.

| File | Exact component identity | Security assessment and limitation |
|---|---|---|
| llama-completion | llama.cpp v0.7.0 / b11669 | 13 source-fix ancestries confirmed; binary/startup not certified. |
| libggml-cpu-haswell.so | Same archive/commit | Same source evidence; CPU kernel execution untested. |
| libllama-completion-impl.so | Same archive/commit | Same source evidence; input restricted to fixed version flag. |
| libc.so.6 | glibc 2.43-2ubuntu2.4 | Matches preserved signed security-pocket version; complete current CVE status unresolved. |
| libggml-base.so.0 | ggml 0.27.0, same archive/commit | Same source evidence; not independent native certification. |
| libgomp.so.1 | gcc-16 16-20260322-1ubuntu1, staged approved package | Prior ABI/bindings pass; complete current CVE status unresolved. |
| libstdc++.so.6 | gcc-16 16-20260322-1ubuntu1 | Complete current CVE status unresolved. |
| libm.so.6 | glibc 2.43-2ubuntu2.4 | Same glibc assessment. |
| libgcc_s.so.1 | gcc-16 16-20260322-1ubuntu1 | Same GCC assessment. |
| ld-linux-x86-64.so.2 | glibc 2.43-2ubuntu2.4 | Same glibc assessment; actual isolated loader behavior untested. |
| libllama-common.so.0 | llama.cpp 0.7.0, same archive/commit | Embedded component assessments below; no networking or arbitrary subprocess input permitted. |
| libllama.so.0 | llama.cpp 0.7.0, same archive/commit | Source fixes confirmed; model paths outside proposed test. |
| libssl.so.3 | openssl 3.5.5-1ubuntu3.7 | Matches preserved signed security-pocket version; complete current CVE status unresolved. |
| libcrypto.so.3 | openssl 3.5.5-1ubuntu3.7 | Same OpenSSL assessment; no TLS/untrusted input permitted. |
| libggml.so.0 | ggml 0.27.0, same archive/commit | Same source evidence. |
| libz.so.1 | zlib1g 1:1.3.dfsg+really1.3.1-1ubuntu3.2, staged fixed package | CVE-2026-85091 publisher fix confirmed for this exact package; complete current CVE inventory unresolved. |
| libzstd.so.1 | libzstd 1.5.7+dfsg-3 | Complete current CVE status unresolved; absence from one security index is not clearance. |

All runtime rows use immutable source commit **620d2225cc436ab0b001e3200e590e3b286ef9ab**, archive SHA-256 **cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac**. These are existing provenance records, not a reproducible source-to-binary proof.

The old host zlib ubuntu3.1 **remains vulnerable by the named publisher version finding and remains unchanged**. Its exclusion is mandatory; staged ubuntu3.2 is the assessed candidate. Both have upstream version 1.3.1 and SONAME libz.so.1, so a version string alone cannot establish fixed-provider loading.

## Advisory disposition

The [13-row source matrix](../artifacts/n15-03e-20261026/llama-advisory-matrix.json) supplies exact CVEs, published ranges, fix commits, ancestry proofs and preserved range discrepancies. G retains every row in its assessment. Eight are core GGUF/tokenizer/vocabulary cases; five are server/RPC profile cases. **All 13 fixes are confirmed in the pinned source ancestry**. Server/RPC executables are excluded from the proposed subset. No model/tokenizer/vocabulary input is permitted. These are scope restrictions, not measured code-reachability or binary-fix proofs.

Embedded **cpp-httplib 0.61.0** is outside the affected ranges of all **23 preserved publisher advisories**; [range matrix](../artifacts/n15-03e-20261026/httplib-advisory-matrix.json). Independent vendor-fix/binary verification remains absent. **nlohmann JSON 3.12.0** includes a local vendor patch; **sheredom/subprocess.h** is the unversioned pinned blob 67420c10356bcdad03b89d04700a598ac0c768df. Their empty saved GHSA feeds do not establish safety; current comprehensive status stays unresolved. These are embedded components, not extra whitelist files.

[F known-history review](../artifacts/n15-03f-20261027/other-security-review.json) retains:

- **CVE-2026-85091 / USN-8954-1:** exact staged ubuntu3.2 fix attested by publisher and package changelog; no executable fix/exploit test.
- **CVE-2026-27171:** earlier ubuntu3.1 crc32 negative-length checks recorded in package history.
- **CVE-2023-45853:** historical minizip patch; no minizip library in the acquired zlib1g payload, not a blanket core-zlib clearance.
- **CVE-2024-3094:** historical no-change rebuild context, not a finding against core zlib.

Incomplete current Ubuntu responses were rejected and are not reused as complete inventories. Signed security-pocket matches identify published versions, not absence of vulnerabilities. No newly confirmed unresolved vulnerability in the staged 17 files is established by the reviewed records; **this is not a claim that none exists**.

## Private execution versus redistribution

The [notice matrix](../artifacts/n15-03g-20261027/notices.json) identifies the preserved full or explicitly labeled-derived texts. Preserve that packet with future private copies; no notice gap may be hidden by calling everything MIT.

| Components | Required for the intended private run | Additional obligations before future distribution |
|---|---|---|
| llama.cpp/ggml and cpp-httplib, MIT | Retain copyright, permission and disclaimer; MIT notice condition applies to private copies too. Preserve the source-header and publisher-license attributions. | Include all notices with conveyed copies; review any newly included vendors. |
| JSON, MIT; Sheredom, Unlicense | Preserve pinned attribution, labeled derived JSON MIT text and verbatim Sheredom dedication/disclaimer. No invented publisher-original license record. | Resolve precise vendored/modification provenance and notice packet before conveying. |
| GCC runtime libraries, GPL-3.0-or-later + Runtime Library Exception 3.1 | Full GPL/exception notices preserved. GPLv3 section 2 permits making/running/propagating covered works without conveying; no private-run external source offer is triggered. | Assess corresponding-source/conveying duties and exact exception conditions; do not assume eligible compilation or blanket exception coverage. |
| glibc/libm/loader, LGPL-2.1-or-later plus file terms | Full library/file-specific texts retained. LGPL section 0 does not restrict running a program using the library. | Meet applicable source/modification/relinking or replacement duties and file-specific notices. |
| OpenSSL, Apache-2.0 | Section 2 grant supports private use/copy; retain existing texts. Section 4 recipient/NOTICE conditions concern redistribution. Upstream NOTICE completeness remains explicitly unknown. | Resolve upstream NOTICE contents, attribution, license and modification obligations before conveying. |
| Fixed zlib, Zlib | Preserve full package notice and unaltered attribution; private execution permitted. | Preserve required source notices, mark altered sources and avoid misattribution. |
| zstd, BSD-3-Clause or GPL-2 plus file terms | Preserve full package/file notices; documented permissive option supports private use. | Establish selected license path; satisfy binary/source attribution/disclaimer/non-endorsement and file-specific or chosen GPL duties. |

Private isolated execution here excludes transferring packaged binaries, public distribution or a service. Distribution source-offer/relinking/NOTICE work remains open for future use; it is **not a newly triggered condition for this private unmodified run**. Optional server/RPC/multimodal/other-backend libraries are excluded. Any broader subset requires reassessment.

## Why A, and what must still happen before execution

The concrete named dependency obstacle has an authenticated staged remedy; preserved source/range assessments and private-use license grants support proposing one input-free, contained startup check. Complete current feeds remain unknown. For this narrow engineering test, retaining that uncertainty while forbidding model, network, corpus, clinical and other external inputs is justified. **This is a recommendation for an explicit owner decision, not inferred risk acceptance or a waiver of general runtime/release gates.**

Mandatory requirements for the **separately approved** future task:

1. Fresh explicit scope and resource/storage authorization; **G renews none**. Reuse exact artifacts, zero acquisition, no substitution/retry.
2. Exactly one llama-completion --version command; proposed maximum **10-second native wall deadline**. No model, prompts, corpus, URLs, help batch, server/RPC or arbitrary arguments.
3. Fresh identity checks and exact read-only 17-file native layout, plus notice files. Clear inherited loader/provider/backend variables. Exclude whole host library directories/cache and every vulnerable zlib alias. Stop on identity changes, additional dependencies or a new applicable serious finding.
4. Unprivileged private filesystem/PID/network isolation, no host routes/capabilities, no ASTRA/home/user/database/credential access, null stdin and owned empty writable HOME/TMP/output. Fail before acquired code if containment or monitoring cannot be established.
5. Explicit child-local loader paths/cache inhibition and **only the fixed qualified libz provider visible**. Require resolved-object link-map/init evidence bound to its prehashed read-only file. Search-attempt lines or upstream version strings alone do not pass. Private process maps may corroborate if obtainable; do not fabricate them.
6. Continuous bounded RSS/storage/time/output and owned-child cleanup with durable failure evidence. No global settings changes, installs or network access. Stop at the first failure; no retry/fallback.

The [F loading plan](N15_03F_LIBRARY_LOADING_PLAN.md) remains prospective. A successful version run would cover only observed loader/startup behavior, not Haswell kernels, model/GGUF compatibility, generation performance, scientific/clinical validity or comprehensive security.

## Remaining risks and one next task

[Decision and risk register](../artifacts/n15-03g-20261027/decision.json) retain: incomplete current advisory coverage; source-versus-binary uncertainty; old-host-zlib fallback risk; unexecuted isolation/loading proof; limited CPU/model coverage; derived/redistribution notice gaps; expired task-specific resource authority. All have explicit dispositions, none is silently marked cleared.

**Exactly one next proposed task:** separately authorize one isolated, zero-network, no-model **--version** startup using unchanged 17 files and the fixed zlib, with fresh explicit resource/storage policy, resolved-provider evidence and first-failure stop. No model acquisition/inference is proposed by this review.

Validation is limited to these new review records, references, unchanged status/gate wording and preservation checks. No runtime, ABI, full regression or browser tests. The record verifies 17 rows, 13 reused ancestry mappings, nine notice groups, seven risks and preservation of 512 source/package-file and 5,777 historical artifact size/mtime records. This is not a fresh hash proof. [Validation record](../artifacts/n15-03g-20261027/review-validation.json).

**STOP. N15/N16 Not Started; all other module statuses unchanged. No executable or model was run.**
