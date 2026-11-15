# N07-01 — Scientific Data Acquisition Foundation

Delivered2026-10-23; **N07 In Progress**,not Complete. The user authorized only this bounded task. N01/N02/N04 Complete;N03 Partial;N05 In Progress — Deferred;N06 Not Started — Deferred;AC-20 Open / Unverified. No N13/N14/N15/N16 implementation,medical advice,inference,monitoring change or graphics work was performed.

## Implemented source and manifest

One exact-resource allowlist covers NASA NTRS public metadata record20205008796. It is narrower than a hostname allowlist:only the reviewed HTTPS API URL and its exact canonical/use/harvesting reference URLs are accepted. Unknown IDs,hosts,schemes,credentials,ports,query strings,fragments and arbitrary filenames reject. The sole approved type is UTF-8 `application/json`;PDF/DOCX,archives,HTML and compressed HTTP bodies are deliberately unsupported in this slice. No new external dependency is used;the workflow is an isolated Node24 standard-library CLI/library,not an API/background job.

`approved-sources.json` pins publication title,authors,publisher,canonical URL,source version,date limitation,original byte count/SHA-256,actual stated use conditions,review date,attribution and explicit nonclinical scope. Missing/extra/invalid fields reject. The source supplies no publication date;the manifest uses null and explains why its workshop date is not a publication date. `astra.scientific-source.v1` copies this reviewed metadata and records actual acquisition start/completion,ETag when available,request count,source URL and original bytes/hash. Its approval fingerprint binds all reviewed metadata. Offline verification compares manifest/receipt/approval and rehashes the original;it never fetches or silently repairs corruption.

Source identity/public distribution/rights/version/authors are checked against the original parsed JSON after full hash verification. Downloaded links and instruction-like text remain inert bytes;no crawler,document execution,corpus chunking,embedding,index,model or medical interpretation is connected. No patient/live clinical data is introduced. Public author and repository administrative identifiers remain intact in this bibliographic original.

## Selected source and legal boundary

**Market Survey 2020: Commercial Clinical Decision Support Systems and Wellness Tools**;B. Burian,K. Martin,T. Shaw;NASA Ames Research Center/NASA HRP;NTRS20205008796. The sample is the publication's **metadata/abstract JSON only**,not full source-document ingestion or a physiological dataset.

The [official record](https://ntrs.nasa.gov/citations/20205008796) states *Work of the US Gov. Public Use Permitted.* The [NASA metadata-harvesting policy](https://www.sti.nasa.gov/harvesting-data-from-ntrs/) expressly permits harvesting public metadata and asks that NASA STI Compliance and Distribution Services be cited. [NASA STI use terms](https://www.sti.nasa.gov/disclaimers/) require truthful attribution/no implied endorsement and retain third-party-rights/warranty limitations. No blanket CC0 or Creative Commons grant is invented. The original API's `determinationType`/third-party-content fields and its separate false `belongsToUsGov` boolean are preserved;the explicit metadata-harvesting permission is the independent acquisition basis.

Two other ASTRA-linked NTRS records,20220017869 and20240000914,carry protected-material notices;they were not acquired or substituted. The approved original's linked DOCX/PDF and its vendor sites were not fetched. This historical market-survey abstract does not establish medical guidance,scientific validity of ASTRA or current vendor capabilities. [Local source/attribution README](../data/scientific/README.md) and [reviewed policy](../data/scientific/approved-sources.json) preserve these limits.

## Bounded cache and recovery contract

- One exact HTTPS GET per invocation;no redirects,automatic retries,credentials,cookies or arbitrary URL arguments. The receipt caps explicit network attempts at **four per partial**. An integer **15,000ms maximum deadline** includes request/body acquisition;an abort signal and monotonic stream checks prevent a stalled or empty-chunk stream from bypassing it. Cancellation does not promote an entry. Filesystem operations/OS cleanup are not claimed as hard real-time guarantees.
- Hard sample ceiling **65,536bytes**;the current policy additionally requires **exactly6,995bytes**. Validate MIME/encoding,status,declared length and range before appending;check cumulative raw bytes while streaming. No automatic decompression or document execution.
- An exclusive per-source lock prevents competing acquisitions. Prefix bytes are flushed before an atomic progress checkpoint containing their length/hash,approval fingerprint,validator and receipt times. On explicit resume,the committed prefix is verified first. Only an uncommitted tail in the dedicated partial directory may be truncated. A wrong prefix,changed approval or unsafe/symbolic cache file fails closed.
- Resume requests use exact `Range` and `If-Range` when a strong ETag is available. Require an exact206 continuation;refuse range-ignored200,wrong range or changed/missing established validator. Without an ETag,the final pinned full-object SHA remains mandatory and rejects mixed representations. The actual server supplied no ETag;its real partial-range behavior was not tested.
- Only a completely received,correctly hashed,metadata-validated original and complete manifest are promoted by renaming the partial directory into a content-addressed entry. A full-length partial without confirmed response completion is insufficient. Interrupted post-completion promotion can resume offline. Cached originals are never overwritten/refetched to conceal corruption.
- Rejected evidence is retained. An abrupt process exit can leave a lock requiring operator inspection;there is no stale-lock guessing or automatic cleanup. Dedicated user-owned cache directories are required;this is not a hostile shared-filesystem or signed/tamper-proof storage service. Files are synced and failures are detected;power-loss durability and physical storage failure were not certified. Total retention across future separately approved source revisions remains later N07/N17 work.

## Actual acquisition and reproducibility

| Field | Verified result |
|---|---|
| Exact API resource | `https://ntrs.nasa.gov/api/citations/20205008796` |
| Original type/size | `application/json`; **6,995bytes**,preserved unchanged |
| Original SHA-256 | `3429154f91f4bc5476fc7adb7ee18f5a811b8bed2de7acad0f5c94e530ebb4f0` |
| Workflow start/completion | `2026-10-23T14:14:54.138Z` / `2026-10-23T14:14:56.235Z` |
| Workflow requests | **1** successful full GET;no redirect/retry/linked download |
| Source-review request | One earlier bounded GET of the same record established the SHA/fields;it wrote no sample. Only one distinct scientific sample was acquired. |
| Cache | `data/scientific/cache/nasa-ntrs-20205008796-3429154f91f4bc5476fc7adb7ee18f5a811b8bed2de7acad0f5c94e530ebb4f0/` |
| Offline deterministic command | `node scripts/scientific-acquire.mjs verify` |

The hash is computed from official HTTPS bytes and checked against the review pin,not a publisher signature or independent clinical validation. The live API can change administrative index fields;future changed responses reject until a separately reviewed policy update. Existing original bytes remain usable and verifiable offline. Supported escalation was used for the restricted single-record source review and acquisition/file writes;no OS setting,package install,credential or unrelated personal file was accessed.

## Files and verification

New implementation files:`services/acquisition/source.mjs`,`services/acquisition/cache.mjs`,`scripts/scientific-acquire.mjs`,`tests/scientific-acquisition.test.mjs`. New source files:`data/scientific/approved-sources.json`,`README.md` and the single cache entry's `original.json`,`manifest.json`,`progress.json`. No existing production/QA file,package.json or lockfile changed. Planning/architecture/testing documentation was updated;no database,monitoring,agent,retrieval,prediction or renderer integration was added.

Focused command:

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify
```

Final executed results and source/evidence fingerprints are recorded in [verification.json](../artifacts/n07-01-20261023/verification.json),[focused test log](../artifacts/n07-01-20261023/focused.log) and [syntax/import log](../artifacts/n07-01-20261023/check.log). Tests use synthetic in-process HTTP responses and temporary filesystem roots;only the shipped sample verification reads the actual acquired original. No browser,full regression suite,model evaluation,N04 acceptance collection,live telemetry workload or runtime SQLite fixture is used. Existing application behavior is preserved by unchanged-source checks,not claimed as freshly rerun browser/medical acceptance. Real complete HTTPS acquisition/offline verification are distinct from injected interruption/range/timeout tests. Native Windows execution was not performed;symlink-creation tests explicitly skip on native Windows to avoid requiring OS privileges. No usable Git repository/commit is available.

Actual final totals:**22/22 tests pass**,0 failures/skips/cancellations,1067.048825ms;**82JavaScript files/local imports**,0 errors. Before/after fingerprints confirm460existing source/QA/asset/license/model/research/dependency/catalogue files unchanged;only the four new implementation/test files were added to that inventory. All24 retained N04 assessment fingerprints still match,without rerunning their acceptance. Documentation checks cover13Markdown files,209local links with0 missing,balanced fences and all26original roadmap IDs. The new three-file QA evidence directory totals14,026bytes;no historical evidence is overwritten.

## Remaining N07 and next task

N07 remains **In Progress**. The current sample proves only the bounded acquisition/provenance/cache path. Remaining full-module requirements include release-specific lawful BIDMC/Sleep-EDF/PTT samples and NASA OSDR/RadLab metadata,appropriate additional type/source adapters,dataset cards and subject/time split manifests,reproducible multi-source acquisition and actual source-domain restrictions. Literature metadata has no physiological subjects or train/test labels;none were fabricated. This task's no-patient-data restriction does not authorize clinical datasets later;any proposed acquisition needs its own verified terms,scope and applicable approval. Existing catalogue links are unchanged and are not relabeled as acquired datasets.

**N13 remains blocked on full N07 acceptance and separate implementation approval**,unless the user separately approves a precise dependency/subgate decision. No semantic retrieval or model capability is delivered here. N16's additional dependencies and DE-AC20-01 boundaries remain unchanged.

Proposed **N07-02**,not authorized:select at most one nonhuman NASA OSDR study metadata record;verify its actual study-level access/use terms;extend the exact-resource policy and metadata adapter;add a dataset-card/split-manifest contract distinguishing nonhuman study/cohort/sample/time information from clinical/synthetic telemetry. Verify original/source/version/hash,domain limits,offline cache and controlled/unavailable-source failure using focused tests. No raw omics,patient data,waveform processing,N13 chunks,embeddings or AI integration. Unresolved licenses must block acquisition. Full N07's remaining dataset/split gates stay open after that bounded slice unless actually satisfied.

**STOP after N07-01.** Await explicit approval before N07-02,another module or any model integration. Preserve N04 Complete,N05/N06 Deferred,N03 Partial and AC-20 Open / Unverified.
