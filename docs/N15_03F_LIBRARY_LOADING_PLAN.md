# N15-03F — prospective fixed-zlib loading evidence

**Documentation only. No command in this plan was executed in N15-03F.** It does not approve native loading, a runtime test, model acquisition or inference. A later task needs separate owner scope/resource authorization and all remaining security/notice gates. Preserve the pinned llama.cpp/libgomp and exact qualified zlib identities.

Static candidate: /var/tmp/astra-n15-03f-bat9chx9/staged/usr/lib/x86_64-linux-gnu/libz.so.1.3.1, ELF SHA-25627fa6c6cb94fb5b099ead61758a300dbc392d1dbf307fff6c16a9b8e57fdc9de. Source package zlib1g:amd64=1:1.3.dfsg+really1.3.1-1ubuntu3.2, original package SHA-25610084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35. These are static file identities, not observed loaded mappings. See [qualification](N15_03F_ZLIB_QUALIFICATION.md).

## Enforce the provider by filesystem construction

Use the existing network/filesystem-isolated subprocess approach with a **minimal read-only file whitelist**. Do not bind the whole host /usr, /lib or /lib64 into the acquired-code sandbox: that would expose the older host zlib and invalidate the intended assurance.

1. Prehash the qualified fixed library using the final N15-03F recorded SHA-256. Mount that exact regular file read-only at a canonical sandbox path such as /qualified/lib/libz.so.1. Its source package and actual SONAME must match the approved record. Hash the original runtime, staged libgomp, loader and every admitted dependency too.
2. Admit only the selected completion executable/implementation, common/llama/ggml libraries, one separately qualified CPU backend, staged libgomp, and the necessary explicitly approved host dependencies. Include notices. Do not admit server/RPC/multimodal tools, arbitrary plugins, unreviewed CPU variants or inherited module/provider directories.
3. Omit the vulnerable host libz real file, its SONAME aliases and copies from **every** sandbox directory. Omit host linker cache and configuration. Verify that no admitted ELF has an absolute dependency or RPATH/RUNPATH that escapes the admitted layout; constrain $ORIGIN to the qualified directories.
4. Use private mount/PID/network namespaces, no host routes, capability drop, private writable output/HOME/TMPDIR/cache and no ASTRA/user/host-proc-root access. Reverify the exact future native layout; old system-tool preflights are not that proof. Stop if unprivileged isolation cannot be established; do not bypass it.

No OS installation, global linker configuration or global environment variable is needed. The host's old package remains untouched. The assurance is **one approved libz provider visible**, not reliance on search order among multiple providers.

Both the old host and fixed backport retain upstream version1.3.1 and SONAME libz.so.1. A zlib version string, filename or SONAME alone cannot distinguish the security backport. Require the exact qualified file SHA-256 and resolved sandbox object identity.

## Explicit subprocess loader path

A future separately approved test may use the admitted trusted ELF loader directly, with an explicit path and cache disabled. For example, after constructing and checking that exact private layout:

    /qualified/ld-linux-x86-64.so.2 --inhibit-cache \
      --library-path /qualified/lib:/qualified/runtime \
      /qualified/runtime/llama-completion --version

This is an illustrative future command, not an executed test or a frozen working sandbox recipe. Final paths/flags must reflect the actual inspected loader and qualified subset. Do not run --list, ldd, LD_TRACE_LOADED_OBJECTS or similar loading checks during N15-03F.

Start with a cleared child environment. Reject inherited LD_PRELOAD/LD_AUDIT/library/plugin/provider variables; permit only the explicit child settings needed by the frozen test. If LD_LIBRARY_PATH is used instead of the loader option, it must be child-local and paired with the same whitelist/cache/RPATH rules. Never export it globally. No URL/hub/model/server/RPC arguments or automatic fetches.

## Prove actual loading and detect fallback

Predeclare all evidence requirements before the next native run:

- Record source hashes, approved bind manifest and the resulting sandbox path set. A trusted read-only preflight should verify that the vulnerable host paths/files and unauthorized aliases are absent from the exact layout.
- For the acquired child only, capture loader diagnostics using a child-local LD_DEBUG=libs,versions,files setting and owned stderr output. Require evidence of the **resolved object**, such as its generated link map or initialization record at /qualified/lib/libz.so.1, with no other libz object. A “trying file” search line alone is not loading proof.
- If the brief process can be observed, capture /proc/PID/maps from the owned/private PID namespace and bind its mapped path/inode to the qualified read-only file. A version command may exit too quickly; do not invent a maps observation, extend the test secretly, start a server/model or add sleep to acquired code. Missing mandatory proof means incomplete evidence.
- Correlate loader evidence with the prehashed mounted file. Reject any resolved host/other libz path, unexpected device/inode, mapping mismatch, missing required trace, dependency/version error or unreviewed plugin. Treat failure as invalid; no automatic fallback/retry.
- Capture actual exit status, stdout/stderr, bounded elapsed time, inclusive storage/RSS and owned-process cleanup. Keep guards active for the complete future test. A successful help/version command would prove only that bounded no-model native startup, not model compatibility, inference performance, clinical safety or comprehensive vulnerability clearance.

The final native acceptance rule must be frozen in its separately approved task. N15-03F supplies static compatibility evidence and this proposed method only. It does not certify isolation enforcement or actual loaded-provider identity.
