# N15-03F — fixed zlib acquisition and static qualification

Date: **2026-10-27 Asia/Karachi**; collection timestamps are2026-10-26UTC. **Outcome: PARTIAL.** Exact package acquisition, named-CVE fix attribution, safe extraction, notices and static ABI/dependency checks pass. Complete current advisory status and inherited runtime gates remain open. **No acquired binary/library loading or native execution test occurred.** N15/N16 Not Started; all other module statuses unchanged.

## Authority and accounting

Owner approved one exact fixed-package acquisition/static task under [DE-N14-N15-01](DE_N14_N15_01.md), renewing **Choice B for N15-03F only**: monitored1,500,000,000-byte counted storage/1,350,000,000-byte stop, acknowledged temporary overshoot;150MB acquisition/900s network/2GB process RSS,CPU-only. No OS install/upgrade, global linker/environment change, library-loading test, model/inference/benchmark/build/substitution/integration or N16.

Fresh private disk-backed scratch **/var/tmp/astra-n15-03f-bat9chx9**, ext4/dev/sdd. HOME/TMPDIR/cache/extraction/output use owned scratch. Corrected accounting helper reused unchanged SHA-256 **6af29d0ff7d12346136f42479e0672a7440ed161997ec04850e1cbebcde23761**; prior30-test QA reused, not rerun. Shared-lock atomic/fsynced accounting, sticky failure/owned-child handling,2GB address-space cap and1.8GB RSS precaution retained. A durable /var/tmp marker prevents automatic re-execution.

Storage includes all new scratch, the **entire** reused runtime/libgomp trees, **entire** N15-03E metadata tree, explicit controller/helper/marker/baseline inputs and directory/symlink metadata. Documentation delivery/offline interpretation are separate from the measured interval. This is isolated acquisition/data staging, not a verified acquired-code sandbox.

## Exact package and publisher integrity — PASS

| Field | Verified result |
|---|---|
| Distribution / source / architecture | Ubuntu26.04 Resolute / zlib / amd64 |
| Binary package version | **zlib1g 1:1.3.dfsg+really1.3.1-1ubuntu3.2** |
| Original filename | **zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb** |
| Official exact URL | https://security.ubuntu.com/ubuntu/pool/main/z/zlib/zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb |
| Complete size | **61,786bytes**, HTTP200/Content-Length/actual count match |
| Publisher and actual SHA-256 | **10084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35** |
| Single acquisition | **9.790179s**,0retries/redirects/substitutions |
| Retained original | /var/tmp/astra-n15-03f-bat9chx9/zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb |

The official [USN-8954-1](https://ubuntu.com/security/notices/USN-8954-1) was rechecked. Saved publisher metadata independently reverified: Ubuntu archive key **F6ECB3762474EDA9D21B7022871920D1991BC93C**, gpgv exit0/VALIDSIG; compressed index SHA **c9f4f90adfc5fcb1228e0aea6369c868ffa227b005782a1738ecdbb47fc46d56**, decoded3,192,760bytes/SHA **c69a86813b52e0db2a7820d7a9c54dff5afc7a635fc58812e9928e6299beb2c5**, matching signed2026-10-25release. Exact stanza/control/download identities agree. Authenticity is not comprehensive current-security clearance.

Safe data-only extraction verified **11members /126,404 regular bytes**, rejecting absolute/traversal/duplicate/unsafe types/privileged modes/escaping links before extraction. Trusted ar/dpkg-deb only inspected/decompressed data; no apt/install/maintainer script/linker-cache update. Binary payloads remain outside ASTRA.

## Security fix and notices

The authenticated package's **exact-version changelog** explicitly records CVE-2026-85091: reset the stale input pointer after a compression error in the non-blocking gzwrite path. This agrees with the publisher's fixed-version notice. **Fix attribution PASS at publisher/package level**; no independent source rebuild, exploit or executable regression was run.

The package supplies its full **Zlib** notice, preserved with decoded changelog evidence. Retain attribution/permission/disclaimer and source-notice restrictions; identify altered source versions if redistributed. No blanket relicensing/distribution approval or waiver of inherited GPL/LGPL/Apache/NOTICE/source duties.

| Other known record | Assessment / limit |
|---|---|
| CVE-2026-85091 | Exact staged ubuntu3.2 fix confirmed above; host ubuntu3.1 unchanged. |
| CVE-2026-27171 | Prior ubuntu3.1 history records negative-length checks for crc32-combine functions; retained publisher history, not executable proof. |
| CVE-2023-45853 | Historical minizip patch. No minizip library in this11-member payload; not a comprehensive core-libz determination. |
| CVE-2024-3094 | Historical no-change rebuild context, not evidence of a current core-zlib vulnerability. |
| Complete current zlib status | **Unknown**; incomplete current-source response cannot close it. |

One current Ubuntu source/release query returned HTTP200 but reached its declared **25-second per-request deadline** after **47,070 of132,831 advertised bytes**, elapsed25.069315s. Invalid/incomplete JSON is retained as **rejected evidence**, never promoted to an advisory inventory. Overall900-second network allowance was **not exhausted**. Timing includes resource checks/persistence; publisher outage or a particular network bottleneck is **not established**. No retry or partial-case cherry-picking.

## Static ABI and permitted dependencies — PASS within stated limits

Staged ELF **/var/tmp/astra-n15-03f-bat9chx9/staged/usr/lib/x86_64-linux-gnu/libz.so.1.3.1**, private SONAME link libz.so.1. Actual ELF SHA-256 **27fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de**. ELF64 AMD x86-64; **SONAME libz.so.1**. Both old/fixed backports retain upstream1.3.1/SONAME1; these strings cannot prove the fixed provider was loaded.

Only DT_NEEDED: **libc.so.6**. Required GLIBC_2.2.5/2.3.4/2.4/2.14 namespaces exist in permitted libc; inspected ZLIB exports include namespaces through ZLIB_1.2.12.

A **17-ELF closure** resolves statically from the existing bundle, original staged libgomp, fixed zlib and previously permitted host files. **45/45 required namespace edges pass.** Actual libcrypto requirements **9/9** match: zError, inflateEnd, compress, deflate, deflateInit_, inflate, deflateEnd, inflateInit_ and uncompress.

Stricter offline checks require plain/default exports for unversioned requests and exact pairs for explicit versions. **8/8 independent string controls** pass (4positive/4negative), plus all9actual bindings. These are non-loading checks, not actual relocations, plugin behavior, native CPU or loader success.

Original runtime archive **cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac** and libgomp package **add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314** remain reused/unchanged. Host package versions equal the before-task snapshot; **the older OS zlib was not replaced**.

## Future forced loading — supportable in principle, not tested

[Loading plan](N15_03F_LIBRARY_LOADING_PLAN.md): whitelist exact read-only files in private namespaces; make **only fixed libz visible**, omit vulnerable host aliases/cache, use explicit child-local loader paths/cache inhibition, and capture resolved-object evidence. Prehashed binds plus loader link-map/init diagnostics and, when obtainable, private process maps detect fallback. Search-attempt lines and version strings are not proof.

No loader/ldd/LD_TRACE/LD_DEBUG/--list/version/help or actual sandbox-enforcement test ran. Local loader-manual excerpts support prospective flags, not native qualification. Separate scope/resource approval and remaining security/notices/isolation gates are mandatory.

## Actual resources

| Observation | Actual value |
|---|---:|
| Package acquired | **61,786bytes**, one attempt |
| New runtime/model | **0 /0bytes** |
| Received bodies | **108,856bytes**, including rejected47,070-byte prefix; TLS/HTTP overhead unmeasured |
| Request elapsed | **34.859494s**, includes local checking/persistence; below900s |
| Supervisor elapsed | **667.799458s**, includes retained-input hashes/accounting/static tools; not inference/benchmark timing |
| Final apparent / allocated | **77,804,206 /78,954,496bytes**, before final report replacement |
| Maximum sampled apparent / allocated |77,803,917 /78,954,496bytes |
| Sampled current-image supervisor RSS peak | **49,766,400bytes** |
| Supervisor kernel lifetime RSS peak | **663,040,000bytes**, separate from sampled peak |
| Maximum trusted-child kernel RSS | **38,588,416bytes** |
| Observations / durable periodic rows | **660 /659** |
| Requested cadence / largest observed gap |250ms / **1,652.788ms**; no hard realtime guarantee |
| Accounting errors / owned children left | **0 /0**, observer stopped |
| Acquired-native/loading/model commands | **0** |

No measured storage/RSS breach. Monitoring is not a hard quota; kernel counters supplement sampling. No native/model RSS or performance claim. Original scratch/rejected evidence retained; no historical cleanup.

## Evidence and remaining gates

[Report](../artifacts/n15-03f-20261027/report.json), [offline assessment](../artifacts/n15-03f-20261027/assessment.json), [package receipt](../artifacts/n15-03f-20261027/zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb.receipt.json), [fix/license evidence](../artifacts/n15-03f-20261027/fix-and-license-evidence.json), [static closure](../artifacts/n15-03f-20261027/static-dependency-closure.json), [strict bindings](../artifacts/n15-03f-20261027/strict-zlib-bindings.json), [other-security review](../artifacts/n15-03f-20261027/other-security-review.json), [resources](../artifacts/n15-03f-20261027/resources.jsonl), [manifest](../artifacts/n15-03f-20261027/evidence-manifest.json). Only text/static/rejected-metadata evidence copied; binaries/package/data tar remain outside ASTRA.

The E finding has a verified **staged candidate remedy only**. Remaining gates: complete current zlib/inherited gcc-16/glibc/OpenSSL/zstd source/release security; applicable NOTICE/optional-vendor/source provision for the exact subset; fresh private-filesystem/network/CPU isolation, actual provider binding and native startup. Existing source/range evidence is reused, not comprehensive certification. Qwen/model acquisition/inference remains unjustified.

**Exactly one next proposed task:** a bounded **metadata/security and notice closure review for the exact17-file future whitelist**, reusing N15-03F passes/artifacts. Obtain complete authoritative source/release evidence with verified metadata sizes and sufficient explicit time bounds; preserve failed-prefix history. No binary acquisition, version change, native/model execution or test repetition. Startup approval remains separate.

No production/QA/helper/package/corpus/ranking/monitoring/graphics code changed. No browser/full-suite/model benchmark or scientific/medical acceptance change. Final preservation counts are recorded with evidence.

Final offline preservation/consistency **PASS**: **1,109** prior source/data/evidence hashes, **5,673** historical artifact size/mtime records and all **50** original runtime regular-file hashes unchanged. Original runtime/libgomp, host zlib/package versions and corrected helper preserved. **102** new evidence hashes, **10** Markdown documents/**550** local links/all **26** module IDs verified;17static ELF/45namespace/9strict-binding/8positive-negative controls corroborated. preservation-verification.json records PARTIAL/current-security-Unverified/no-native/Not-Started status. Ten report/governance Markdown files plus new evidence changed only; this is not actual loading or comprehensive security certification.

**N15-03F ends PARTIAL; its Choice B expires. N15/N16 Not Started**, N07/N13/N14/N09 In Progress, N01/N02/N04 Complete, N03 Partial, N05/N06 Deferred, AC-20 Open / Unverified. **STOP; do not execute the runtime.**
