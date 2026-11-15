# N15-04A — Qwen publisher redirect qualification

Date: **2026-10-27 Asia/Karachi**. **Recommendation: PASS for metadata qualification of one future exact-host policy decision.** No allowlist expansion, model acquisition or inference is authorized or performed by this result.

**Actual observed destination: https://us.aws.cdn.hf.co**, default HTTPS port443. The authenticated pinned publisher URL returned **HTTP302**. The destination was **not contacted**. N15/N16 remain **Not Started** and all other module/review/dependency statuses are unchanged.

## Bounded requests and provenance

Exactly two HTTPS requests, both to **huggingface.co**, no retries or redirects followed:

1. **HEAD**, exact approved immutable model URL:

       https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf

2. Optional GET of /docs/hub/en/storage-backends. It also returned302 and was **not followed**; no documentation body was retrieved. Its contents are not used as provenance evidence.

Whole recorded collection **0.709433s**, within declared30s overall/10s per-socket operation/35s outer execution bound.0model or documentation body bytes read; HTTP/TLS/header traffic unmeasured. No request was made to us.aws.cdn.hf.co, other delivery hosts, token-refresh endpoints or a model server. [Request summary](../artifacts/n15-04a-20261027/metadata-summary.json).

The model HEAD used standard CA verification and publisher hostname validation, with no TLS bypass. Sanitized publisher response observed **2026-10-26T21:28:40.001465+00:00**:

| Publisher field | Value / binding |
|---|---|
| HTTP status |302|
| Location scheme / hostname |https / **us.aws.cdn.hf.co**|
| Credentials / fragment in Location |Absent / absent|
| X-Repo-Commit |9217f5db79a29953eb74d5343926648285ec7e67 — exact approved revision|
| X-Linked-Size |491,400,032 — expected complete model size|
| X-Linked-ETag |74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db — previously verified expected GGUF SHA-256|
| X-Xet-Hash |0663b826e09042345d6e2069d9655cd3ae84812d8f39a5894bed7b24fc0e86cc — matches preserved publisher tree|
| Destination path shape |/xet-bridge-us/; contains that same pinned Xet object marker|
| Signed query parameters |Present; **no values retained**|
| Advertised redirect response length |1,118bytes, not read and not the model size|

All four identity-header bindings match [preserved official model metadata](N15_01_QUALIFICATION.md). This is direct **publisher-authorized delivery delegation** for the pinned request. It does not independently prove CDN corporate ownership or validate the destination certificate/response, which would require the prohibited destination contact. No assertion is based on a hostname merely looking plausible. [Sanitized HEAD evidence](../artifacts/n15-04a-20261027/publisher-head.json).

Only the first hop is known. Further redirects are unobserved. This fresh HEAD establishes the currently returned hostname; the exact hostname of the earlier N15-04 GET **remains historically unrecorded**. A current response cannot retroactively recover that missing record.

## Integrity, expiration and rotation

The canonical URL keeps the approved repository/revision/artifact. Publisher headers associate it with the expected size/hash and Xet object. **Those headers are declarations, not a completed model-byte integrity check.** The Xet object marker is not the GGUF SHA-256.

The downloader's hardcoded URL, expected size and expected SHA-256 remain unchanged. A future acquisition must compare **complete received original bytes** to those fixed values before promotion or native loading; neither Location nor a newly supplied header may replace them. A legitimate redirect cannot bypass this check. No current actual model hash/GGUF validation or compatibility result exists.

The signed URL advertises expiry **2026-10-26T22:28:50+00:00**, one hour after the publisher Date21:28:50UTC. The publisher/local observation clocks differ by about10seconds; this is an observed expiry claim, not cryptographic signature verification or a promised usable lifetime. No raw URL, query/signature/access-token/credential value was saved.

A later approved acquisition must obtain a **fresh redirect from the unchanged canonical publisher URL**, rather than reuse this expiring location. One observation does not guarantee stable host/path selection. If a later response selects a different hostname or object, stop under the exact policy; do not introduce a wildcard, alternate mirror, token refresh or retry automatically.

## Diagnostic correction and focused QA

Confirmed cause of the old gap: allowed(newurl) raised before redirects.append or a redirect log event. The final error receipt previously retained only an exception string, not sanitized redirect metadata.

Changes are **reporting only**:

- New [n15_redirect_diagnostics.py](../scripts/n15_redirect_diagnostics.py): public scheme/hostname/status, credential/query/fragment presence flags and safe rejection reason. No raw URL/path/query/userinfo. Unknown exception text is omitted rather than echoed.
- Existing isolated **/tmp/astra-n15-04-download.py**: catch the original validation rejection, log sanitized fields, then re-raise the same exception even if logging fails. Sanitize the final failure receipt too, so it cannot reintroduce sensitive exception text.
- New [focused tests](../tests/n15_redirect_diagnostics_test.py): offline AST-isolated functions/mocked redirects; no downloader main or real network calls.

**18/18 focused tests PASS**. They cover allowed/blocked/malformed/credential-bearing URLs, query/fragment/signature redaction, unsafe exception text, allowed positive controls, original rejection propagation and logging failure. The allowed() AST and pinned URL/hash/size constants are identical before/after. **us.aws.cdn.hf.co remains rejected by the actual unchanged allowlist**, verified offline.

Frozen [original](../artifacts/n15-04a-20261027/downloader-before.txt), [final corrected copy](../artifacts/n15-04a-20261027/downloader-after-final.txt) and [test output](../artifacts/n15-04a-20261027/focused-tests-final.txt) are retained. Earlier N15-04 evidence was not rewritten. These tests validate reporting and policy preservation, not a download or model.

## Minimum policy recommendation — not applied

For **one separately authorized acquisition of this exact model only**, add **us.aws.cdn.hf.co** as an exact hostname, with:

1. HTTPS/443 and no URL credentials; obtain the Location only from the approved publisher resolve URL with the matching pinned commit/size/hash/object headers.
2. Restrict the delivery path to /xet-bridge-us/ and the pinned Xet object marker; never accept an arbitrary caller-supplied CDN URL or another model. The observed path hash is8506100ff64ca027f698f80fcbd4f0905878d92d45302141cb2c296e8c306746 for audit, not a replacement content hash.
3. Preserve TLS validation, bounded source/redirect/body/time/resource controls and sanitized rejected-host reporting. Stop if any later hop needs another unapproved host or the pinned binding changes.
4. Preserve independent final491,400,032-byte/SHA-256 verification before using the original.

No suffix wildcard or general CDN permission is proposed. **The live guard was not expanded.**

## Preservation and next approval

Only two new QA files, the isolated temporary downloader's reporting, new review evidence and governance documents changed. **583 existing source/data/package files and5,827historical artifacts** are checked by size/mtime, not a fresh whole-tree content-hash pass; [preservation/consistency record](../artifacts/n15-04a-20261027/preservation-validation.json) gives the results. Existing runtime/libgomp/fixed-zlib artifacts, model metadata, N04 evidence, corpus/indexes and application/monitoring state were not modified.

No resource/storage authorization was renewed or inherited. No model/runtime/dependency bytes, native llama.cpp execution, inference, installation or application integration occurred. Optional source documentation remained unavailable and is explicitly excluded from proof; all original G/security/distribution/scientific/human/module gates remain.

**One next separately approvable task:** approve the exact-host policy above and **one fresh acquisition of the unchanged pinned model** under fresh explicit resource/storage authority. If desired in the same bounded continuation, approval must also explicitly renew the conditional single first-inference and missing-model-check scope; N15-04A grants neither. Retain prior proposed550MB model/support,900s network,2GB process RSS, CPU-only and monitored1.5GB/1.35GB policy only after a new explicit choice; no automatic retry.

**STOP. N15/N16 Not Started; all other statuses unchanged.**
