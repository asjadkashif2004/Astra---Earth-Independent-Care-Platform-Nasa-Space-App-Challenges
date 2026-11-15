# N14-01 — offline MiniLM research retrieval

**Subsequent N14-02 clarification,2026-10-25:** [N14_02_COMPLETION](N14_02_COMPLETION.md) corrects the claim input contract/QA only. The old16/16rejection figure below is **non-diagnostic** because required binding/role was absent; it is not scientific support discrimination. Historical retrieval/model/evaluation artifacts are unchanged. Current claim CLI uses explicit `--request=bound.json`; the bare-text claim example below is historical and now fails explicitly. No semantic improvement or medical review is newly established.

Delivered 2026-10-25 under DE-N13-N14-01 and explicit implementation/Choice B approval. **N14 In Progress; this bounded task is delivered and STOPPED. No demonstrated semantic retrieval benefit; no application promotion.** N07/N13 remain In Progress, N04 Complete, N05/N06 Deferred, N03 Partial, AC-20 Open / Unverified. No N15/N16 authorization.

## Implementation and isolation

Native CPU inference uses `onnxruntime-node@1.21.0`, common1.21.0 and `@huggingface/tokenizers@0.2.0`. No Transformers.js/Sharp, npm install, application dependency/startup/API/UI change or model training. The previous successful runtime is reused read-only at `/var/tmp/astra-n14-direct-choice-b-EKjLmaoj/payload/work/node_modules`. All30original npm archive SRIs, lock pins and installed archive members were reverified; the fresh registry advisory response is `{}`. Audit results are point-in-time, not proof of absence of native vulnerabilities.

Acquisition/native testing used fresh disk-backed `/var/tmp/astra-n14-01-oEWmeAl8`. Bubblewrap made ASTRA read-only; only owned scratch was writable. Native inference and CLI smoke tests ran in a separate network namespace with no external route. JS networking attempts are rejected and recorded; actual inference attempts: **0**. A durable external observer sampled disk/process high-water RSS/aggregate cgroup memory at500ms, with an observer heartbeat check during acquisition. An extra900MB aggregate cgroup limit, CPU quota200% and zero swap were separate safeguards, not a relabeling of the1GB process RSS ceiling. This is a disposable local research installation, not a packaged application runtime.

## Exact model and licensing

`Xenova/all-MiniLM-L6-v2`, revision **751bff37182d3f1213fa05d7196b954e230abad9**; official [revision metadata](https://huggingface.co/api/models/Xenova/all-MiniLM-L6-v2/revision/751bff37182d3f1213fa05d7196b954e230abad9?blobs=true) and [model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2/blob/751bff37182d3f1213fa05d7196b954e230abad9/README.md). The card declares Apache-2.0; the exact publisher listing has no separate LICENSE/NOTICE file. The official Apache license text is preserved as supporting terms, without inventing a publisher NOTICE or relicensing NASA publications.

| Complete original | Bytes | SHA-256 |
|---|---:|---|
| onnx/model_quantized.onnx | 22,972,370 | afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1 |
| tokenizer.json | 711,661 | da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0 |
| tokenizer_config.json | 366 | 9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3 |
| special_tokens_map.json | 125 | b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3 |
| config.json | 650 | 7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7 |
| vocab.txt | 231,508 | 07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3 |
| README.md | 1,767 | 63ea99bf681a2e9eda4f6a537d5ed8fda95d1677111656da37e9cfd080c3af02 |

Seven originals total **23,918,447bytes**. Support files also match publisher Git blob identities; weight bytes match the publisher SHA-256. Receipts preserve canonical sources, response sizes, hashes and revision-bound redirects without signed query parameters. No binary request was repeated. Originals remain in the external task's `model/` directory, unchanged.

MIT ONNX Runtime, Apache-2.0 tokenizer/model and all30transitive SPDX records/notices are recorded in [components](../data/research/n14-01/components.json) and [runtime licenses](../artifacts/n14-01-20261025/runtime-licenses.json). Full official ONNX1.21.0 MIT license and ThirdPartyNotices, tokenizer license and model Apache text are [preserved locally](../artifacts/n14-01-20261025/notices/onnxruntime-ThirdPartyNotices.txt). Native redistribution has mixed third-party obligations; preserve all applicable notices before packaging. Local research use is not a redistribution clearance or medical endorsement.

One preflight reader error accessed an HTTPResponse after automatic EOF closure. Its complete5650-byte publisher JSON was independently checked offline and preserved, with [failure](../artifacts/n14-01-20261025/preflight-failure.json) and [recovery](../artifacts/n14-01-20261025/metadata-offline-recovery.json). That metadata request was not repeated; only previously unattempted preflight resources proceeded. No partial model was accepted. All substantive preflight checks then passed.

## Tokenization, tensors and numerical checks

Verified actual graph: `input_ids`, `attention_mask`, `token_type_ids` int64 `[batch,sequence]`; `last_hidden_state` float32 `[batch,sequence,384]`. A bounded protobuf reader checks graph metadata before inference; actual session names/output types/shapes are also checked. CPU provider only, two intra-op threads, sequential execution. No automatic aliases, casts or provider fallback.

The exact tokenizer's BERT normalization/WordPiece and special tokens are used. Encode whole text with CLS/SEP,1for every real token,0for PAD, segment IDs0. Explicitly reject >256total tokens; no silent truncation. The saved tokenizer JSON advertises128-token truncation/padding and config512capacity; a derived in-memory configuration disables saved padding/truncation and applies the approved256policy without editing originals. Tests verify254content+2specials accepted,255content rejected, whitespace rejected and padding masks correct.

All34reviewed spans fit whole: **17–176tokens including specials**. Exact original UTF-16 span offsets are therefore retained without token-offset reconstruction, decoded-string searches or crossing gaps. No larger-corpus windowing is implemented; overlength inputs fail explicitly. The standalone tokenizer exposes no token offsets.

Eight fixed normalization/WordPiece fixtures cover case, accents, combining characters, CJK, punctuation, repeated text, literal specials, whitespace/controls and subwords. They agree with a separately written in-repository BERT/WordPiece fixture oracle using the publisher vocabulary. This is bounded algorithm checking, **not independent Hugging Face runtime parity**. An independent arithmetic fixture verifies attention-mask-aware mean pooling, inclusion of non-PAD specials and PAD invariance before L2 normalization.384finite float32 outputs; sample norm0.999999999465157; repeated-vector maximum difference0; two deterministic index builds have identical vector bytes and metadata. [Numerical evidence](../artifacts/n14-01-20261025/numerical-verification.json), [rebuild](../artifacts/n14-01-20261025/rebuild-verification.json).

**End-to-end parity against an independently executed identical quantized graph remains UNVERIFIED.** No self-generated vector is called a golden reference. Current results satisfy local execution/engineering checks, not equivalence or clinical validation.

## Index, citations and claim safeguards

[Derived index](../data/research/n14-01/index/manifest.json):33units,34whole-span windows,384dimensions, little-endian float32 matrix. Actual three-file payload **161,361bytes**; the original build report counted161,360because it omitted the manifest's final newline. The byte counter was corrected and tested; original evidence stays unchanged. No embedding/ranking/holdout change resulted.

Each stable window ID binds policy, unit ID, original hash, physical page, UTF-16 range and text hash. Source title/version/rights, section, chunk citations, role and limitations accompany results. Loads validate frozen corpus/curation/packet/original hashes and every window; corrupted/missing data fail closed. Exact cosine scan deduplicates by unit. Same33eligible units feed the lexical baseline, retaining its3-point topic/1-point content scoring and minimum3; lexical metadata/context are searchable while semantic vectors encode literal spans. This is a bounded retriever comparison, not an isolated claim about every representation choice.

Claim checking admits **only complete literal original quotations with an explicitly matching source role**, retaining qualifiers; location-only table context is never claim support. Other claims abstain. No invented partial/conflict entailment, clinical classification, treatment recommendation or alert. Arbitrary paraphrase support/conflict detection is **unimplemented**, even where source research might support a paraphrase. Queries/documents remain untrusted strings: bounded inputs, no tools/network/URL execution, command/markup/Unicode injection rejection, escaped CLI JSON and exact source validation. Input filters are bounded defenses, not a complete malicious-language classifier; isolation and lack of executable tools enforce the main boundary.

## One frozen evaluation — negative benefit result

[Frozen plan](../data/research/n14-01/evaluation-plan.json):10whole question families,24tuning/16holdout, no shared positive evidence unit across splits. Singleton predeclared parameters; no tuning search or holdout-driven change. This is held-out questions over the same documents, not unseen-document/population validation.40expectations remain provisional, with0independent approvals.32supported/partial cases enter recall;8unsupported cases enter abstention.

| Set / method | Recall@1 | Recall@3 | Recall@5 | MRR |
|---|---:|---:|---:|---:|
| Tuning lexical,19positive cases | 70.18% | 85.96% | 93.86% | 0.9342 |
| Tuning semantic,19positive cases | 56.14% | 80.70% | 82.46% | 0.7912 |
| Holdout lexical,13positive cases | 71.79% | 79.49% | 94.87% | 0.8846 |
| Holdout semantic,13positive cases | 56.41% | 75.64% | 79.49% | 0.7821 |

**Benefit gate NOT MET. Retain lexical baseline; do not promote semantic retrieval or retune against this now-observed holdout.** Any later experiment must disclose this exposure and obtain approval for its evaluation design. [Immutable results/per-question ranks](../artifacts/n14-01-20261025/evaluation.json), [raw incremental cases](../artifacts/n14-01-20261025/evaluation-cases.jsonl).

349/349returned citation checks valid,0invalid. All16unsupported claims rejected;8/8unsupported questions abstained. All32provisionally supported paraphrases also abstained. Thus provisional-claim abstention recall100%, precision33.33% (16/48); this does **not** demonstrate useful paraphrase entailment. Separately,33/33eligible complete literal quotations match; role-mismatched, altered, partial and location-only claims reject. Six adversarial evaluation inputs abstained; focused tests additionally verify fabricated/corrupted anchors, absent evidence and networking denial.

## Actual measurements

Named host: AMD Ryzen5 7430U with Radeon Graphics; Linux x64 WSL2, Node24.21.0, glibc2.43; CPU inference only. These are this host's bounded research measurements, not judge-machine/release certification or browser/FPS evidence.

| Measurement | Observed |
|---|---:|
| Model/support acquisition incl metadata/license | 23,935,455bytes /30MB |
| New runtime notices/audit acquisition | 328,546bytes /300MB; prior archives reused, not redownloaded |
| Total new response-body bytes | 24,264,001 |
| Sum sequential network-request elapsed | 14.216s /480s; not a physical-wire byte/time capture |
| Cold native/model load | 268.97ms |
| Initial index build | 203.22ms |
| Fixed40-query evaluation | 257.94ms |
| Warm query p50 /p95 /max | 3.22 /4.15 /5.65ms |
| Native experiment process peak RSS | 221,429,760bytes /1GB |
| External observer OS-reported RSS high water | 620,953,600bytes; separate from model RSS |
| Sampled experiment aggregate cgroup peak | 177,033,216bytes; not process RSS |
| Post-materialization counted storage | 413,915,286apparent /419,041,280allocated bytes |

Storage includes retained prior runtime/cache/original archives, new scratch/model/reports and materialized index/evidence/tool modules; subsequent small documentation/log additions are checked at closure. **Monitored Choice B, not a hard quota**;1.35GB precautionary stop and1.5GB ceiling were not reached. The task's overshoot risk approval does not carry to future tasks. Resource logs, phase guards and preserved failure state are under [new evidence](../artifacts/n14-01-20261025/experiment-supervisor.json); old histories are untouched. Network counters are response bodies, not TLS/physical wire totals.

## Files and verification

New isolated modules: `services/research-retrieval/{contract,encoder,retrieval,evaluation,numerics,offline}.mjs`; CLI `scripts/n14-research.mjs`; bounded experiment `scripts/n14-experiment.mjs`; `tests/research-retrieval.test.mjs`; `tools/n14-research/README.md`; additive `data/research/n14-01/{evaluation-plan.json,components.json,index/}`. New report/evidence plus updates to AGENTS, plan/exception, decisions, tracker, master plan, priority, audit and handoff. Application package.json/lock/node_modules and all live modules remain unchanged.

**22/22final new tests pass**,0skip; **46related N13-02/03 checks pass and are reused**:68distinct current checks. An earlier combined67/67run preceded the final watchdog test and serialized-byte accounting correction; final22tests cover those changes. Tests cover frozen sources/citations/roles, IDs, pooling, masks/boundaries, graph corruption, index roundtrip/size/corruption, unsafe/absent evidence, split leakage, benefit gating, CLI validation, network denial and watchdog termination. Syntax/import check: **119JSfiles,0errors**. Actual offline native verification and CLI verify/query/claim smoke checks pass. No browser, full application suite, N04 collections or clinical validation was run. Prior test-fixture issues were corrected; no ranking parameter changed after evaluation.

Preservation:521existing source/corpus/package file hashes match the prior probe baseline; fresh preflight30package/corpus hashes match;5,019historical artifact files retain size/mtime. This is not a fresh byte-hash audit of every old screenshot. Protected Git/config subtrees were not traversed; no commit is possible on the supplied protected unusable Git mount.

## Local use and remaining work

From the ASTRA project in WSL, offline verification:

```bash
node scripts/n14-research.mjs verify --index=data/research/n14-01/index
```

One local research query using the preserved external runtime/model:

```bash
node scripts/n14-research.mjs query \
  --runtime=/var/tmp/astra-n14-direct-choice-b-EKjLmaoj/payload/work/node_modules \
  --model=/var/tmp/astra-n14-01-oEWmeAl8/model \
  --index=data/research/n14-01/index \
  --text='How does light influence the circadian clock?'
```

Expected: research candidate quotes with exact anchors and pending-review labels. `claim --index=data/research/n14-01/index --text='Diagnose sleep apnea'` must abstain. `build` can reproduce a **new** empty output directory using the same verified inputs; it refuses overwrites. Acquisition is not automatic; neither the CLI nor these instructions authorize further downloads/evaluation. Keep the external directory/model receipt together; no silent download fallback if removed. Focused tests: `node --test --test-isolation=none tests/research-retrieval.test.mjs`.

Full N14 remains open: unmet benefit gate, independent same-graph numerical parity, meaningful bounded paraphrase/conflict support beyond literal quotes, independent evidence review/full N13 dependency and later approved integration/offline/release checks. N07 obligations, N10/N12/N16 prerequisites and AC-20 are not waived. Smallest next proposed task: a separately approved numerical-parity/reference and tuning-only error-review plan; do not present reused holdout results as untouched or install a new reference runtime automatically. **STOP; no N15/N16 or follow-up implementation without explicit approval.**
