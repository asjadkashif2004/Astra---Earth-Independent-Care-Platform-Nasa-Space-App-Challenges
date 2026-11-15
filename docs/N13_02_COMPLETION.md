# N13-02 — Scientific evidence curation and review

Delivered2026-10-24 under the owner's explicit bounded approval. **N13 remains In Progress;this task is delivered and STOPPED.** N07 In Progress/inactive,N04 Complete,N05/N06 Deferred,N03 Partial,AC-20 Open / Unverified remain unchanged. No N14–N16 work is approved or implemented.

## Governance and prerequisite result

The documentation-only [DE-N07-N13-01 N13-02 extension](DE_N07_N13_01_N13_02.md) was recorded and validated **before source implementation**. Eight governance documents/230local links,exact original sizes/SHA,frozen corpus and local parser pins passed. Existing lawful-source/receipt and reproducible-extraction evidence was reused;no new download or entire471-page rebuild occurred. At validation no N13-02 code/data directory existed. Only after the PASS was recorded in the extension and handoff did the explicitly approved implementation begin. ADR-028 records the decision;the original dependency decision retains its old text plus the dated addendum.

The extension covers this one no-download curation/review task only. It does not close N07/full N13,approve retrieval/LLM/agent work or confer independent medical approval. No concurrent N07 work occurred. All original N07 sample/provenance/card/split obligations and DE-AC20-01/N06/N26 release gates remain.

## Implemented scope and source preservation

Only the preserved originals from [N13-01](N13_01_COMPLETION.md) were used:

| Source | Exact original SHA-256 |
|---|---|
| NASA HRP,NTRS20160003864/JSC-CN-35774,2016;967,704bytes/82pages | `252d4993a040ab8b989664b1da7a3143a5fd8169fac65b67f1f43231250ef1f5` |
| NASA-STD-3001Volume2RevisionF,2026-07-14;6,753,988bytes/389pages | `a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f` |

N13-01's metadata,rights/notices,receipts,PDF bytes,471-page extraction,3,275chunks,review pack and historical evidence remain unchanged. The immutable base corpus SHA remains `9bb1fb5fc112716c16fdb8e3e6a3c5a968b01db5e11b2f5e694f54af5d16b6b7`. No new dependency or runtime service,source acquisition,browser collection,telemetry/monitoring/forecast/graphics/API/SQLite change.

An additive versioned overlay holds exact source ranges,curated source-context labels,content roles,revision/correction records,unresolved evidence and review expectations. The409,408-byte overlay has SHA`ed88677753bbef136ecdc35bb6b13d7bc9ce933727989f4c261f2200bf84ff9f`. It does not rewrite the first corpus or reclassify every old chunk. New section/unit IDs bind original/page/range/text identity and remain deterministic across reviewed-input enumeration order. Old base section labels are explicitly **not authoritative** for the reviewed spans.

## Reviewed section boundaries

**19leaf section boundaries** were source-text reviewed and validated against exact physical page/text anchors. The table gives start and following-heading boundary pages;the following heading itself is excluded. Labels are curator-normalized display labels;exact source wording,including typos/duplicate numbering,is preserved in anchor records. This is targeted engineering/source-text curation,not an independent clinical or rendered-page review of all content in those sections.

| Source section | Start / next-boundary page |
|---|---|
| HRP II Executive summary | 4 /6 |
| HRP IV.A.1 Sleep loss during spaceflight | 10 /13 |
| HRP IV.A.2 Sleep inertia during spaceflight | 13 /13 |
| HRP IV.A.3 Circadian desynchronization during spaceflight | 13 /16 |
| HRP IV.A.4 Work overload during spaceflight | 16 /17 |
| HRP IV.A source-numbered6 Alertness/performance | 19 /22 |
| HRP IV.B.1 Ground sleep loss | 24 /30 |
| HRP IV.B.2 Ground sleep inertia | 30 /31 |
| HRP IV.B.3 Ground circadian desynchronization | 31 /34 |
| HRP IV.B.4 Ground workload | 34 /35 |
| HRP Ground countermeasures,C Scheduling | 49 /51 |
| HRP VII Gaps | 57 /58 |
| HRP VIII Conclusion | 58 /60 |
| Standard7.9.1 Sleep Accommodation | 134 /134 |
| Standard7.9.2 Behavioral Health and Privacy | 134 /135 |
| Standard7.9.3 Partial-g Sleeping | 135 /135 |
| Standard8.6.3 Window Light Blocking | 151 /151 |
| Standard8.7.2 Environmental Lighting Attenuation | 152 /153 |
| Standard8.7.8 Physiological Effects of Light | 155 /156 |

Thirty-four HRP and seven standard pages—**41selected physical pages**—were re-extracted directly from unchanged originals using the already pinned pypdf6.21.2. All page-text SHA/lengths matched the frozen corpus. The helper is offline,strict,and bounded to48selected pages/document,30CPU seconds/60wall seconds/document,1GiB address space and8MB decoded stream/page. It never executes PDF actions,follows links or downloads files. Source-text printed header labels matched all41physical indices;the original N13-01 null printed labels were not overwritten. This is text-header verification,**not rendered glyph/visual certification**.

## Role and deterministic mapping corrections

**33bounded evidence units** carry explicit scope and limitations:

| Source role | Units |
|---|---:|
| Formal requirement | 6 |
| Scientific finding | 5 |
| Recommendation/research agenda | 3 |
| Caveat | 8 |
| Background/rationale/table-location context | 11 |

Formal standard `[V2 ...]` shall statements are separate from rationale. Research recommendations are not clinical instructions;ground findings are not astronaut-specific validation. General evidence,dated research gaps and engineering requirements cannot generate personal diagnosis,treatment,fitness clearance,forecast values or monitoring thresholds.

Nine false heading candidates were rejected with original-bound correction records:three HRP study/sample-count entries(pages11/25/32),and six numbered lighting-table notes/references(page156). The overlay supplies117exact overlap mappings,including **33span associations previously inherited from those false headings**. Only reviewed overlaps are corrected;cross-boundary chunks are not globally reassigned. Flight/ground subsections with similar names retain distinct contexts. The repeated source number6 is retained and flagged,not silently renumbered.

Three explicit limitations remain:lighting-table numeric row/column interpretation,flight-performance table semantics,and duplicate source numbering/uncurated neighboring scope. Ambiguous selectors cannot support claims;table location alone is insufficient scientific/quantitative evidence. Unreviewed locations return unknown section/role rather than inheriting old heuristic labels. During drafting,one ambiguous sex-summary selector and one missing ground-evidence end marker were rejected,then corrected from source text before promotion;no guessed anchor was accepted.

## Evidence expectations and review status

The [human-readable review pack](../data/corpus/n13-02/derived/REVIEW.md) contains **40reviewable expectations** with exact evidence units,source context,allowable claims,unsupported clauses and required behavior:

| Category | Count | Required behavior |
|---|---:|---|
| Supported within specified source context | 24 | State only bounded,dated source claims |
| Partially supported | 8 | Explain supported context,explicitly abstain/refuse unsupported clauses |
| Unsupported | 8 | Abstain,including2unsafe-request refusal cases;no manufactured supporting citations |

Examples include separating flight/ground sleep evidence,retaining workload/sampling caveats,distinguishing light requirements from rationale,declining personal phase/fatigue predictions,and refusing individual prescribing or automatic duty clearance/acknowledgement. Lack of support in this bounded review is not proof of absence from all literature. Safety/authorization examples are identified as ASTRA boundaries,not invented NASA orders.

**Review status:**AI-assisted engineering/source-text review completed;independent human review,owner approval of the expectations as evidence-approved,and any qualified medical review remain **pending**. Automated schema/hash/anchor tests do not establish scientific claim entailment or independent medical approval. No model answers,retrieval recall,supportedness accuracy or clinical validation were evaluated. Forty reviewable expectations do **not** satisfy the full N13 gate of30–50genuinely approved-evidence expectations merely by their count.

## Verification actually executed

- [Focused tests](../artifacts/n13-02-20261024/focused-tests.txt):**43/43PASS**,0failures/0skips—24new curation tests plus19existing N13-01 tests. Coverage includes citation/source/hash/range integrity,all roles,known false headings,overlap/ambiguity/missing evidence,partial/unsupported behavior,independent-review status,determinism,altered outputs and preservation.
- [Syntax/import check](../artifacts/n13-02-20261024/syntax-check.txt):**104JavaScript files,0errors**;targeted Python AST syntax passed. This is not a TypeScript compilation.
- [Offline verification](../artifacts/n13-02-20261024/verification.json):saved overlay/plans/review/proof match deterministic rebuild;original/frozen hashes rechecked;0network requests. It reuses the recorded41-page proof rather than re-extracting the PDFs again.
- [Citation check](../artifacts/n13-02-20261024/citation-check.json):**131anchored spans,201validated base-citation references,127unique base chunks**;41printed text headers,0unresolved selected headers. These counts describe integrity,not expert approval or answer-quality scores.
- [Preservation audit](../artifacts/n13-02-20261024/preservation.json):566pre-task source/data/evidence/reference files inventoried;565unchanged,the sole changed baseline file is the approved dependency-decision append with its original text SHA retained. All N13-01 originals/derived evidence and prior application/N07/package/research files remain unchanged.15Markdown documents/351local links checked,0missing,balanced fences,all26module IDs retained. No Git commit available because the protected supplied .git is not a usable repository.

Existing N13-01 acquisition/full-rebuild and N07 compatibility evidence was reused. No unrelated full suite,N04/browser,model,forecast or long performance run. The runtime Research Library and Health Agent remain on their existing prototype knowledge;this overlay is not silently connected to them.

## Changed files and reproduction

New implementation files:

- [services/corpus/curation.mjs](../services/corpus/curation.mjs):pure exact-span/section/role/expectation validation and additive mapping.
- [scripts/curate-research.mjs](../scripts/curate-research.mjs):offline build/verify,original integrity,selected-page proof and review export;no acquisition command.
- [scripts/verify-curated-pages.py](../scripts/verify-curated-pages.py):bounded selected-page original re-extraction using the existing wheel.
- [tests/research-curation.test.mjs](../tests/research-curation.test.mjs):24focused tests.
- [sections](../data/corpus/n13-02/sections.json),[evidence units](../data/corpus/n13-02/evidence-units.json),[expectations](../data/corpus/n13-02/expectations.json),their versioned derived overlay/manifest/page proof/review pack,and new bounded evidence.

Governance/planning,audit,architecture/testing,tracker and handoff documents were updated. No existing application,N13-01 implementation,N07 source policy,package manifest,original publication or historical artifact changed. The original dependency decision has only its approved dated extension appended. No new dependency or installation.

```bash
node scripts/curate-research.mjs verify
node --test --test-isolation=none tests/research-curation.test.mjs
```

These commands use local originals,plans,overlay and recorded proof. For a separately needed fresh targeted rebuild,use `node scripts/curate-research.mjs build --output=/tmp/astra-n13-02-rebuild-unique` with a new output directory. Exclusive writes preserve evidence;do not rerun acquisition or overwrite N13-01. Node24.21+/Python3.14/WSL and the existing wheel are sufficient;no app server,SQLite,credentials or network.

## Remaining gates and N14 eligibility

N13 remains In Progress. Remaining closure decisions/evidence:independent review and actual approval of the40expectations;explicit agreement on accepted topic/source/section coverage;restricting future claims to approved units or separately reviewing additional areas;resolving or explicitly excluding unsupported table/figure/semantic interpretation;retaining rights/version/provenance and reproducibility. This task does not demand unnecessary restructuring of unrelated sections,but it also does not make the rest of the corpus reviewed. The original full N07→N13 prerequisite remains;these two bounded exceptions do not authorize full N13 closure while that gate is unmet. All N07 dataset/provenance/split requirements remain open.

**N14 is not currently eligible or approved.** After legitimate N13 closure and separate N14 approval,the smallest proposed N14-01 would select justified licensed local embedding/index resources,implement bounded offline semantic retrieval over approved units,compare against the lexical baseline,and evaluate frozen recall@k,citation correctness,support/abstention and malicious-input behavior. No model/index/library is selected or installed here;N15/N16 remain separately gated. **STOP after N13-02;no automatic continuation.**
