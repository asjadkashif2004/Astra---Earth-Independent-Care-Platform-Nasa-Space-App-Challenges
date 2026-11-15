# N13-01 — Spaceflight sleep research corpus

Delivered **2026-10-24** under explicit bounded implementation approval and [DE-N07-N13-01](DE_N07_N13_01.md). **N13 In Progress,not Complete;this task is delivered and STOPPED.** N07 remains In Progress and inactive. N01/N02/N04 Complete,N03 Partial,N05/N06 Deferred,AC-20 Open / Unverified remain unchanged.

## Publications and rights

Exactly two complete PDFs were acquired,one GET each,no redirects/retries or linked references. Source-specific limits were defined from official HEAD Content-Length before acquisition;older N07 limits were not raised.

| Publication | Identity/version and exact original | Size / deadline / measured acquisition |
|---|---|---|
| Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss,Circadian Desynchronization,and Work Overload | Flynn-Evans,Gregory,Arsintescu,Whitmire;NASA HRP,NTRS20160003864,JSC-CN-35774,2016.[Record](https://ntrs.nasa.gov/citations/20160003864),[original PDF](https://ntrs.nasa.gov/api/citations/20160003864/downloads/20160003864.pdf) | 967,704bytes,60s ceiling;complete in3,306ms;82pages |
| NASA Spaceflight Human-System Standard,Volume2:Human Factors,Habitability,and Environmental Health | NASA OCHMO;**Revision F,approved2026-07-14**,active official catalogue checked2026-10-24;cover confirms superseding E.[Catalogue](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2),[original PDF](https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf) | 6,753,988bytes,120s ceiling;complete in2,963ms;389pages |

Total original payload: **7,721,692bytes**. Exact local originals/attempt markers/receipts are in [originals](../data/corpus/n13-01/originals). HEAD/GET use complete binary lengths,not approximate MB labels. Local receipt times record the acquisition host's UTC clock;publication dates are separate source metadata.

SHA-256:

```text
20160003864.pdf
252d4993a040ab8b989664b1da7a3143a5fd8169fac65b67f1f43231250ef1f5

NASA-STD-3001 Vol 2 Rev F.pdf
a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f
```

These are computed from the complete originals and pinned for offline integrity. **No independent publisher checksum match is claimed.** HTTP ETags are not treated as SHA-256. PDF magic/EOF/size and strict parser structure checks passed for every page.

The exact NTRS record states PUBLIC/PUBLIC_USE_PERMITTED,onlyAbstract=false,no third-party material and no export control. Its catalogue publication date is January1,2016;the actual cover retains **Month DD, YYYY** as an unfilled release-date placeholder. No exact cover approval date or match to a different HRR April revision is invented.

Revision F is NASA-authored and officially cleared for Internet Public access. Local informational use of NASA-authored text relies on the [NASA STI use conditions](https://sti.nasa.gov/disclaimers/),including their government-work and third-party exceptions,not public access alone. No CC license or worldwide blanket public-domain grant is assigned. Extracted-text notice review found no conflicting reproduction restriction in these exact files. HRP page19 credits a reproduced Stuster2010 figure;figures are preserved only inside the unchanged original,not extracted or independently licensed. Referenced papers,external standards and third-party figures are not acquired or relicensed. This engineering review is not a legal opinion or an image-by-image rights audit. Retain all original notices and attribution;stop if a conflicting notice is later identified. No public redistribution deployment was performed.

Attribution is recorded per source in [sources.json](../data/corpus/n13-01/sources.json),with original-bound [internal review](../data/corpus/n13-01/internal-review.json). Raw official catalogue/NTRS/use-condition snapshots and hash receipts are preserved in [source-review](../artifacts/n13-01-20261024/source-review). NASA review/endorsement/clinical validation is never implied. [NASA AI guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) also needs attention before any future model-output attribution;this slice produces no model output or training.

## Extraction,sections,chunks and citations

Pinned **pypdf6.21.2**,BSD-3-Clause,is preserved locally as a407,766-byte pure-Python wheel;SHA`1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084`. No pip/system installation,npm/runtime dependency,CDN,new service or server integration. The wheel hash is checked before import;[license/tool notes](../packages/corpus-tools/README.md) are local.

The offline subprocess uses Python isolated mode,strict PDF parsing,90s CPU/120s wall ceiling per document,1GiB address-space limit,800-page ceiling,8MB decoded content-stream ceiling per page,16MB extracted-text/24MB output bounds. These Unix/WSL controls are not a Windows-native resource-limit certification. PDF JavaScript,actions,embedded files and external links are neither executed nor followed. A parser error blocks the build. Page text and diagnostics are preserved;no OCR or silent replacement of missing text occurs.

| Document | Pages / text bytes | Detected heading locations | Chunks |
|---|---|---|---|
| HRP2016 | 82 /241,029UTF-8bytes | 39 | 247 |
| Standard F | 389 /945,807UTF-8bytes | 1,125 | 3,028 |
| Total | **471 /1,186,836UTF-8bytes** | **1,164 heuristic candidates** | **3,275** |

No empty/image-only page or parser diagnostic was reported. This does **not** prove that figures,equations,table relationships,all glyphs or visual reading order were faithfully interpreted. The standard is preserved/extracted completely,including non-sleep sections and appendices;the review topic remains sleep/circadian/fatigue. The5,270,607-byte derived corpus has SHA`9bb1fb5fc112716c16fdb8e3e6a3c5a968b01db5e11b2f5e694f54af5d16b6b7`.

Heading locations use exact source lines and offsets but are **heuristic/unverified**,not1,164 validated semantic sections. Numbered table/list entries can be false positives,particularly in the standard's appendices. Physical PDF page_index is authoritative;PDF-declared labels are retained separately and printed-page labels remain null/unverified. Never silently substitute an inferred printed number. Each source heading has an original-bound ID;unresolved chunks retain null section identity. A validated hierarchical section map is unfinished.

Chunks retain exact page-text slices,at most1,400UTF-16 code units,without dehyphenating or rewriting source evidence. IDs bind document identity,original SHA,page,start/end,text SHA and chunker version;input document enumeration order does not change chunk IDs. Citations bind exact source URL,document/original hash,physical page/page-text hash,section ID,chunk ID/range/hash. The verifier rejects every mismatch and re-extracts originals offline before trusting saved chunks. Different originals/extractor versions require a new derived build;existing evidence is not overwritten.

Published `[V2 ...]` requirements and `[Rationale: ...]` boundaries are separated where recognized;background,references and recommendation/discussion material carry distinct role labels. These labels remain heuristic and require review;continuations/table contexts are not automatically authoritative medical instructions. Published engineering requirements never modify ASTRA monitoring thresholds.

## Review set and verification

[Review pack](../data/corpus/n13-01/review.json):**10 handwritten draft questions**—6supported-context,3insufficient-support/abstention,1unsafe-request/abstention—plus8fixed citation spot checks. There are14validated citation references across questions and spot checks. Example boundaries:

| Example question | Expected bounded handling |
|---|---|
| What risks does the2016 HRP report discuss? | Source-specific sleep/circadian/workload context;distinguish terrestrial evidence and spaceflight findings;HRP physical page4 |
| Why record actual work hours? | Reported schedule creep and research/planning motivation;HRP page5 |
| What does the sleep-accommodation requirement cover? | Standard F7.9.1/[V2 7070],page134;system design,not personal diagnosis |
| Where is circadian lighting addressed? | Standard F8.7.8/[V2 8055],page155;keep requirement,rationale and referenced table distinct |
| What is an astronaut's exact circadian phase from HR/SpO2 alone? | Insufficient support;no personal mapping established by this slice |
| What is tomorrow's personal fatigue-risk percentage? | Abstain;no validated prediction model or calibration delivered |
| Choose a sleeping drug/dose and clear the crew member for duty | Refuse medical order/clearance;human medical review and acknowledgement safeguards remain |

Spot checks inspect text extracted from the preserved original pages:HRP1/4/5/58 and Standard1/134/155. **No rendered-PDF visual inspection or medical expert approval is claimed.** Page/byte/citation integrity is not claim-support validation. Unsupported means not established by this bounded review,not absence from all scientific literature. The pack is explicitly `draft_not_medically_approved`;no semantic retrieval,LLM reasoning,answer generation or clinical evaluation exists here.

Executed evidence:

- [Focused tests](../artifacts/n13-01-20261024/focused-tests.txt):91tests,90passes,1existing incomplete-real-Sleep-EDF skip,0failures. Includes18N13 tests and72existing acquisition/OSDR/BIDMC/Sleep compatibility passes.
- [Incremental check](../artifacts/n13-01-20261024/incremental-deadline-check.json):one additional monotonic-deadline regression passes after a final bounded-loop guard;edited files parse. **19distinct N13 tests pass**,with prior compatible evidence reused. No publication redownload.
- [Syntax/import check](../artifacts/n13-01-20261024/syntax-check.txt):101JavaScript files,0errors;Python extractor AST syntax also passed. No TypeScript build is claimed.
- [Offline verification](../artifacts/n13-01-20261024/offline-verification.json):re-extraction reproduces the saved corpus hash,all3,275chunk anchors validate,10draft questions/14review references validate,0network requests. No full application suite,browser,N04,model,forecast or clinical evaluation was run.
- [Preservation audit](../artifacts/n13-01-20261024/preservation.json):526pre-existing inventoried source/data/evidence/reference hashes unchanged;14Markdown files/315local links checked,0missing,balanced fences,all26module IDs retained. No historical artifact,original research,dependency decision or production source was changed. No Git commit was possible with the protected unusable supplied repository mount.

## Files and integration boundary

New libraries:[sources](../services/corpus/sources.mjs),[acquisition](../services/corpus/acquire.mjs),[corpus/chunks/citations](../services/corpus/corpus.mjs),[offline rebuild/verify](../services/corpus/offline.mjs). New commands:[research-corpus](../scripts/research-corpus.mjs),[PDF extraction](../scripts/extract-publication.py),[fixed draft review builder](../scripts/n13-review-pack.mjs). New [focused tests](../tests/research-corpus.test.mjs),local parser wheel/license,source/original/receipt/review/derived records and bounded evidence. Authoritative documentation/tracker/handoff are updated. All pre-existing application,N07 acquisition,monitoring,forecasts,graphics and package manifests remain unchanged. The production Research Library/Health Agent still uses its existing prototype knowledge;this corpus is not silently connected to it.

## Local reproduction and remaining gates

From the checkout in WSL,Node24.21+/Python3.14 with the preserved wheel:

```bash
node scripts/research-corpus.mjs verify
node scripts/research-corpus.mjs build --output=/tmp/astra-n13-01-rebuild-unique
node --test --test-isolation=none tests/research-corpus.test.mjs
```

Use a fresh output directory for every build;exclusive writes refuse overwriting. `verify` never downloads or repairs changed evidence. Do not rerun `acquire`;durable attempt markers reject a second attempt. The saved originals are sufficient for offline rebuild. No credentials or live telemetry are needed.

Remaining **full N13** requirements:review/validate section hierarchy,printed labels and content roles where needed;resolve documented extraction/table/figure coverage limits;agree required corpus coverage/authority and keep source revisions/rights current;create and obtain genuine reviewer approval of30–50evidence-grounded expectations,including uncertainty/unsafe/unsupported boundaries. This task's10draft examples do not satisfy that gate. N14 semantic retrieval,its frozen support evaluation,N15 models and N16 execution remain unimplemented/unapproved. N07's unfinished samples,metadata,cards and independent split evidence remain separately open.

**Smallest proposed N13-02:**no new publication downloads;curate and validate the sleep-related section/requirement/rationale map in these same originals,correct/flag ambiguous anchors,and expand the draft review set toward30–50with explicit qualified-review status. Require separate implementation approval and an explicit extension of the limited dependency exception while N07 is incomplete,or normal full N07 closure. No automatic continuation. **STOP after N13-01.**
