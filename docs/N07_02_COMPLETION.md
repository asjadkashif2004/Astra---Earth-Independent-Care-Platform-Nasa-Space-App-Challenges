# N07-02 — NASA OSDR study metadata foundation

Delivered2026-10-23; **N07 In Progress**,not Complete. N01/N02/N04 remain Complete;N03 Partial;N05 In Progress — Deferred;N06 Not Started — Deferred;AC-20 Open / Unverified. This task adds one nonhuman metadata adapter/card/split-policy foundation only. No human/private/raw-omics/image data,AI integration,N13–N16,medical-rule changes or anatomy work.

## Selected source and use review

**OSD-1 / GLDS-1**, *Expression data from drosophila melanogaster*. Exact endpoint:[NASA OSDR BioData v2 study aggregate](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-1/). The [official API documentation](https://visualization.osdr.nasa.gov/biodata/api/) identifies this route pattern as high-level aggregate dataset metadata. The source explicitly identifies fruit fly,Drosophila melanogaster,NASA/STS-121,whole-organism transcription profiling,DNA microarray and Affymetrix. Its child assay/file links are retained as inert original metadata and are never followed.

The [dataset-specific NASA catalogue](https://data.nasa.gov/dataset/expression-data-from-drosophila-melanogaster-a0600) links to the same OSD-1 study and states public access with a government-works license reference. [NASA Science Data Licenses](https://science.data.nasa.gov/about/license) describes default reuse of unrestricted NASA-led mission data and precedence of specific notices. [USAGov's referenced guidance](https://www.usa.gov/government-copyright) retains third-party/endorsement/international-rights limits. The exact anonymous endpoint returned200 without authentication;no patient or controlled endpoint was requested. The selected compact API has no explicit license/access field. We record the actual catalogue use statement and policy basis with no invented study-specific CC0/SPDX label. Raw-file/linked-article rights and availability remain unverified and outside this approval. OSDR and its named study authors are credited under the [official acknowledgement guidance](https://science.nasa.gov/reference/osdr-faq/).

Review requests were bounded:one compact aggregate review (8054bytes),one official full-metadata review which exceeded the existing65536-byte cap and stopped at65537bytes without saving or parsing the larger response,and one guarded acquisition of the compact snapshot. There was no larger retry,crawl,other study,child file or raw measurement download. The size guard was retained rather than increased. One distinct study and one complete metadata representation are stored.

## Original provenance and cache

| Field | Actual evidence |
|---|---|
| Original | One unmodified UTF-8 JSON aggregate,**8,054bytes** |
| SHA-256 | `cfe7d81c59efc3b01b4407db0854b4224b51bfcb9d8b4f590fc8467ededa6d64` |
| Workflow start/completion | `2026-10-23T14:42:42.359Z` / `2026-10-23T14:42:44.379Z` |
| Workflow requests | One full HTTPS GET,no redirect/retry/ETag |
| Source version | BioData API v2 snapshot identified by SHA;study release-version/modification timestamp unavailable |
| Study-public-release time | `2013-12-11T00:00:00.000Z`,converted from source Unix seconds;not paper publication or sample observation time |
| Existing cache safety | One request/invocation,four persisted attempts/partial,15s/65536byte ceilings,strict MIME/range/prefix/full-hash/atomic-completion/lock guards unchanged |

The N07-01 NTRS policy,original,manifest,receipt and saved evidence remain intact. The existing cache/HTTPS implementation is byte-identical;its imported validation dispatcher now recognizes one additional exact URL and dedicated OSDR schema. Source identity,organism,NASA context,child-link shape,authors/title,rights changes and malformed dates/types fail closed. New access/license fields require review;they are not silently ignored as permission. Optional absent scientific fields become null. Raw protocol prose is not interpreted into sample counts or source labels.

## Dataset card and split manifest

[Dataset card](../data/scientific/osdr/OSD-1.dataset-card.json),[split policy](../data/scientific/osdr/OSD-1.split-policy.json),[human-readable source/card notes](../data/scientific/osdr/README.md),[reviewed acquisition approval](../data/scientific/osdr-osd-1.approval.json).

Card coverage:study/accession/legacy ID,fruit-fly organism,mission and experiment context,declared measurement types/platform,actual receipt/URL/approval/original hashes,stated use/citation conditions,download inventory,scientific limitations/biases and exact source-field pointers. No raw or processed measurement values,images or sample tables are downloaded. No paper date,study release version,subject/sample/replicate count,pooling/vial/hardware/processing identity,quality score or clinical conclusion is invented. Source contacts and combined investigator names are not experimental identities. The card is reviewable metadata documentation,not independent expert validation.

The split policy proposes biological experimental units (potential fly pools/vials) with all related technical/assay/repeated derivatives and shared run/hardware kept together. Actual units are unverified. Training-only normalization/feature selection,disjoint biological validation groups,and an independent mission/study/cohort test after cross-archive duplicate checks are required before any future allocation. One selected study cannot establish a mission-generalization holdout. No random row/gene/probe split is permitted. Counts,ratios,seed and label definition are null;assignments empty;executed false;status blocked pending independence/target review. Validators reject fabricated counts,assignments,labels,readiness or leakage-prone policies. No training/split execution tool is added.

Scientific limits include organism/domain shift,whole-organism/platform specificity,one-mission sampling and infection/strain/handling/launch/re-entry/environment/processing confounding. Effects are not estimated and cannot calibrate N02 or support astronaut diagnosis. Protocol references to radiation measurements are not evidence that a radiation payload was acquired or verified available.

## Files and verification

New code:`services/acquisition/validation.mjs` (shared existing validation helpers),`services/acquisition/osdr.mjs` (fixed adapter/card/split contracts),`scripts/osdr-study.mjs` (offline prepare/verify),`tests/osdr-metadata.test.mjs`. Modified only existing acquisition files:`services/acquisition/source.mjs` (fixed source dispatch;NTRS cross-source rejection retained) and `scripts/scientific-acquire.mjs` (strict two-ID selection;NTRS remains default;pure option parser). No external dependencies;no existing app,API,detector,database,telemetry,agent,retrieval,prediction,renderer or cache-scheduler implementation changes.

New data:`data/scientific/osdr-osd-1.approval.json`,one content-addressed OSDR cache entry (`original.json`,`manifest.json`,`progress.json`),two documentation JSON files and `data/scientific/osdr/README.md`. The parent scientific README and authoritative planning/traceability/handoff docs are updated. The exact inventory and actual results are in [verification.json](../artifacts/n07-02-20261023/verification.json),[focused log](../artifacts/n07-02-20261023/focused.log),[syntax log](../artifacts/n07-02-20261023/check.log).

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify --source=nasa-osdr-osd-1
node scripts/osdr-study.mjs verify
node scripts/scientific-acquire.mjs verify
```

Focused coverage includes OSDR parsing/identity/nonhuman enforcement,allowlisting/cross-source binding,malformed/unavailable metadata,new rights fields,optional nulls,hash/receipt/document provenance,403/503 failures,card tampering,unsupported split assignments/counts/leakage and N07-01 cache compatibility. Direct real CLIs verified both original sources and OSDR documentation offline. Injected transports/temporary roots exercise faults;real source-range/power-loss/Windows behavior is not newly certified. No browser,unrelated/full regression suite,N04 collection,model evaluation,training or SQLite fixture work. Supported escalation covered only bounded metadata review/acquisition and new documentation/evidence writes. No OS/security setting,credential or dependency change. No usable Git commit.

Two initial child-process CLI tests received empty stdout even for a print probe,while direct CLI commands succeeded. The final tests exercise the actual exported option parser and cache/document interfaces without spawning children;direct CLI outputs are separate evidence. No source/acceptance guard was relaxed to resolve that harness limitation.

Final actual totals:**39/39 tests PASS**,0 failures/skips/cancellations,1396.756331ms;**86JavaScript files/local imports**,0 errors. Before/after SHA256 inventory confirms467of470existing files unchanged;only the intended acquisition dispatcher,acquisition CLI and parent scientific README changed. Four new code/test files and seven new data/documentation paths were added to that inventory. Existing cache implementation,NTRS policy/original/manifest/receipt and all24historical N04 assessment fingerprints match their retained evidence;no N04 rerun. Documentation checks:14Markdown files,233local links,0 missing,balanced fences and26retained module IDs. Four new QA evidence files total25,559bytes,including the initial failed test log;historical artifacts were not overwritten.

## Remaining N07 gates and N13 decision

N07 is still **In Progress**. One OSDR aggregate card/policy does not supply the originally required lawful BIDMC/Sleep-EDF/PTT samples,RadLab metadata,broad reproducible acquisition/dataset cards,verified independent subject/time/experiment split design or actual signal replay. Existing catalogue entries remain unchanged. Future patient-related or raw-file acquisition needs separate explicit scope/rights approval and must obey the current nonhuman/private-data boundary. OSD-1 release version,complete experimental unit/group identities,labels/target definition and mission-independent evaluation remain unresolved;the larger metadata endpoint was not imported to conceal those gaps.

**N13 cannot begin under the unchanged roadmap gates:**full N07 acceptance is incomplete and no N13 implementation approval has been given. Only a separately approved,explicit dependency/subgate decision could change that sequencing;this task supplies none. N03 Partial/DE-AC20-01,N05/N06 deferral and N06/N26 release-performance obligations remain unchanged.

Await a separately approved bounded next task—for example,a metadata-only release/experimental-unit provenance review using a small exact official OSD-1 representation without increasing safeguards,or another remaining N07 requirement. Do not fetch new endpoints or execute splits automatically. **STOP after the N07-02 report.**
