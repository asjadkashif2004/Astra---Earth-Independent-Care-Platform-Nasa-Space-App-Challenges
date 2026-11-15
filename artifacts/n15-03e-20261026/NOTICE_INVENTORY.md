# N15-03E component/notice inventory

## llama.cpp / ggml / completion/common

Identity: v0.7.0/b11669/620d2225cc436ab0b001e3200e590e3b286ef9ab; actual file hashes/build IDs in inventory

License/notices: MIT; root full text preserved

Security: 13source fix ancestries retained; not comprehensive binary clearance

## CPU backend libraries

Identity: 14actual CPU variants, same archive hash; Haswell is a candidate only

License/notices: llama.cpp/ggml MIT; required OpenMP is separate

Security: CPU/native/plugin selection not executed or frozen

## cpp-httplib

Identity: source0.61.0; same version string exists in actual common binary

License/notices: Pinned full MIT text, copyright2017yhirose; retain source header2026Yuji Hirose notice as well

Security: 23published advisories outside affected ranges at0.61.0; no independent patch ancestry/binary certification

## nlohmann JSON

Identity: source3.12.0; json_abi_v3_12_0 namespace in common; pinned json_fwd blob verified; vendored patch exists

License/notices: MIT/SPDXNiels Lohmann2013-2025; full standard notice assembled and labeled derived

Security: 0returned public GHSA records is not absence of vulnerabilities; modified-vendor/current-CVE coverage incomplete

## sheredom/subprocess.h

Identity: unversioned vendor header blob67420c10356bcdad03b89d04700a598ac0c768df verified

License/notices: Public-domain/Unlicense dedication and disclaimer preserved verbatim

Security: 0returned public GHSA records is not clearance; subprocess capability must be confined by future argument/isolation policy

## libgomp1 / libgcc-s1 / libstdc++6

Identity: gcc-16 source16-20260322-1ubuntu1; libgomp actual package hash pinned

License/notices: GPL-3.0-or-later WITH GCC Runtime Library Exception3.1; exact-source full notice and GPL3 preserved

Security: Current exact-release advisory/patch state unknown

## libc / libm / ELF loader

Identity: glibc2.43-2ubuntu2.4; current paths/hashes equal saved closure

License/notices: LGPL-2.1-or-later and file-specific notices; full package copyright/LGPL text preserved

Security: Current source/release advisory assessment unknown

## libssl.so.3 / libcrypto.so.3

Identity: openssl3.5.5-1ubuntu3.7; current paths/hashes equal saved closure

License/notices: Apache-2.0 for runtime; full package copyright/Apache text preserved; upstream NOTICE presence/completeness not independently established

Security: Current exact-release assessment unknown; do not treat unused network as full library security clearance

## libz.so.1

Identity: zlib1g1:1.3.dfsg+really1.3.1-1ubuntu3.1

License/notices: Zlib; exact package copyright includes full notice

Security: KNOWN_UNREMEDIATED_PACKAGE: USN-8954-1/CVE-2026-85091, installed...ubuntu3.1 below publisher-fixed...ubuntu3.2; no startup-path exploitability claim.

## libzstd.so.1

Identity: libzstd1 1.5.7+dfsg-3

License/notices: BSD-3-Clause or GPL-2 plus file-specific Expat/Zlib notices; full package notice preserved, permissive path needs all included notices

Security: Current exact-release assessment unknown

## server/RPC/CLI/multimodal/other utilities

Identity: Remaining actual archive members enumerated with hashes/DT_NEEDED; server/RPC files physically present

License/notices: Root MIT is not full all-features third-party notice qualification; additional vendor scope not closed

Security: Not proposed for bounded startup; full archive redistribution/integration unqualified; exclusions require later explicit subset isolation

Future distribution must retain applicable copyright/permission/license/disclaimer/NOTICE texts, identify modifications and provide corresponding source/relinking rights where required. Runtime exceptions do not relicense libraries or waive source obligations. No distribution approval or comprehensive legal certification.
