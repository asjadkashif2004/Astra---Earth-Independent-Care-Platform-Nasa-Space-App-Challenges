# N15 research sequencing/prototype planning delivery — 2026-10-25

**Documentation task delivered; no execution authority granted.** [DE-N14-N15-01](DE_N14_N15_01.md) is **Proposed / Not Activated**. N15/N16 remain Not Started; N07/N13/N14 In Progress, N01/N02/N04 Complete, N03 Partial, N05/N06 Deferred, N09 In Progress and AC-20 Open / Unverified. No full-module prerequisite or scientific-review requirement was closed.

## Documents and decision status

New: [proposed exception](DE_N14_N15_01.md), [prototype plan](N15_01_PLAN.md), [two-candidate comparison](N15_RUNTIME_CANDIDATES.md) and this delivery record. Updated: AGENTS, MASTER_PLAN, MODULE_TRACKER, SESSION_HANDOFF, CORE_AI_PRIORITY, FEATURE_AUDIT and DECISIONS (ADR-039). No source, QA, dependency, data, model or artifact files changed. No new execution-evidence E-number is claimed.

The exception defines one possible separately approved research slice, its rationale, prerequisites, exclusions, acceptance and expiration. It does not activate itself. Owner adoption, a concrete model/runtime decision, new resource/enforcement approval and a bounded acquisition/implementation instruction remain separate decisions. N16's N02/N10/N12/N14(+N15 if used) chain and all transitive gates remain unchanged.

## Feasibility findings and limits

Exactly two pairs were considered: publisher Qwen2.5-0.5B-Instruct Q4_K_M and conditional 1.5B, both with a future qualified standalone CPU llama.cpp artifact. Prefer qualifying only the smaller model first. Official LFS **text** pointers state 491,400,032 and 1,117,320,736 bytes and expected hashes; no GGUF binary was acquired. License declarations, the 0.5B current-license text, configs and runtime documentation were reviewed through official web sources. No inference/security benchmark or native compatibility is claimed.

Full candidate revisions were located, but pinned legal/pointer associations remain partly inaccessible through web tooling. A concrete runtime release/artifact, exact dependency/ABI/security/notices and actual memory/timing remain unqualified. The base/card 32,768-token context conflicts with 1.5B aggregate GGUF metadata 8,192; inspect the exact file after approved acquisition, using a 2,048-token prototype cap. Current-branch metadata is not a complete immutable acquisition manifest. See comparison for exact sources, hashes, limitations and observed access failures.

Proposed first-slice budgets, **not approved**: model/support 550 MB, runtime 150 MB, combined transfer 700 MB, overall network 900 s, counted disk 1.5 GB, process peak RSS 2 GB, two CPU threads, total context 2,048/output 512 tokens, load 60 s/generation 90 s/request 160 s. At most three actual generation checks within 300 s would be proposed later, not executed here. Estimates are not measured fit/performance. The larger alternative is not covered by these first-slice budgets. New hard-storage provision or expressly accepted monitored 1.5 GB/1.35 GB policy is needed; old N14 allowances cannot be reused. Memory enforcement also needs qualification; sampling is not a hard guarantee.

## Prototype/evidence contract

The minimum future proof is actual local autoregressive decoding over a bounded general-publication question and complete source evidence, with verified model/runtime/prompt/output identity. Only structured full quotations from the presented canonical spans or abstention can leave the proposed output gate. N14-02 independently verifies exact strings and complete canonical citation/source/role/scope bindings; no paraphrase repair, guessed citation, cached quote replacement or similarity-as-entailment. Literal attribution never establishes answer relevance, scientific truth or clinical validation.

The planned native child is offline/network-denied with fixed local assets, no operational database/API/credentials or tool authority. No crew interpretation, health advice, N16 execution or Health Agent integration. Missing model, invalid output, cancellation and failure return explicit unavailable/abstention states; they cannot become successful LLM-labeled templates. Current monitoring/enrichment and all protected state remain untouched.

The plan distinguishes future unit controls/stubs from actual generation proof and first/repeated-process timings from warm-resident inference. All tests and resource measurements remain future work requiring approval. Independent human scientific/medical review and N14's fresh evaluation are neither conducted nor manufactured by this proposal.

## Validation performed for this documentation task

Before/after SHA-256/group-membership verification matched **722 existing files**, across 16 source/data/model/research/evidence groups plus four fixed package/contract/protocol files. This preserves code, tests/scripts, native graphics assets/packages, model records, scientific originals/curation/index/vectors, all N14-01–05 task artifacts, package manifests, N14-02 contract and N14-05 protocol. Historical N04 artifacts, runtime databases and protected Git/configuration subtrees were not accessed or modified.

Final documentation checks PASS: **11 Markdown files, 488 local links resolved**, balanced fences, all **26 original module IDs** retained, exactly two candidate pairs, proposed/inactive exception and N15/N16 Not Started preserved. Only documentation checks apply here. No application tests, syntax/runtime checks, browser automation, new retrieval evaluation, model/runtime archive transfer, installation, inference, benchmark, mount/OS change or storage probe occurred. Textual official-source web review was performed; it is not artifact integrity verification. The protected unusable Git mount was left intact; no commit attempted.

## Precise next separately approvable task

Adopt the exception and authorize **one metadata-only qualification** of the preferred 0.5B full revision and one official standalone CPU runtime artifact. Resolve immutable source/rights/digest/byte/ABI/dependency/security pins and the concrete accounting/isolation design, then present an acquisition/execution manifest for owner review. Proposed small metadata bounds are in the plan; no binary transfer, installation, native execution or inference in that task. No automatic alternative, source retry, resource-policy relaxation or broad infrastructure investigation.

Subsequent model/runtime acquisition and the actual prototype require explicit approval after those facts are concrete. **STOP; do not begin N15/N16 or other implementation automatically.**
