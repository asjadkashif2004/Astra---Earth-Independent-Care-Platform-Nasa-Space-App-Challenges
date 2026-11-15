# Scientific acquisition sources

## Current bounded Sleep-EDF attempt

[Sleep-EDF notes](sleep-edf/README.md):one complete publisher-checksum snapshot and an unaccepted PSG prefix are preserved. The source-specific two-file streaming exception does not change prior65,536-byte/15s caps. PSG timed out,no annotation request/retry/accepted pair/card. Three earlier accepted originals below remain intact. [Report](../../docs/N07_SLEEP_EDF_COMPLETION.md):72focused passes,1real-pair check skipped,94-file check. N07 In Progress,RadLab/Sleep-EDF Blocked,N13 gated;STOP for separate approval.

## Current BIDMC numerics extension

Three exact sources are supported. [BIDMC-01 source/card/rights notes](bidmc/README.md) document one complete7,644-byte historical hospital numerics CSV,not live patient/NASA telemetry or astronaut norms. Its exact source,ODC-By/legacy notices,original SHA/receipt,NaN missingness and blocked unexecuted split policy are verified offline. No waveform,other subject,training,AI or monitoring connection. Source limits remain65,536bytes/15s;NTRS/OSDR originals and policies below are preserved history. [N07_BIDMC_COMPLETION](../../docs/N07_BIDMC_COMPLETION.md):53focused passes/89-file check. N07 In Progress,RadLab Blocked,N13 gated;STOP for separate approval.

## N07-02 OSDR extension

Two exact reviewed sources are now supported;the original NTRS default/cache/terms below remain preserved. The second is one nonhuman OSD-1 aggregate metadata snapshot,8054bytes,with [source-specific approval](osdr-osd-1.approval.json),[reviewable dataset card and proposed split notes](osdr/README.md). `node scripts/scientific-acquire.mjs verify --source=nasa-osdr-osd-1` and `node scripts/osdr-study.mjs verify` check original/documentation offline. No raw omics,patient data,other studies,AI integration or split execution. [N07_02_COMPLETION](../../docs/N07_02_COMPLETION.md) records source-specific public/government-works use conditions,explicit unknown counts/version/grouping,39 focused tests and remaining N07/N13 gates. No further acquisition is authorized after delivery.

## N07-01 public NTRS metadata — preserved

Exactly one source is currently approved: the **public NTRS metadata JSON** for *Market Survey 2020: Commercial Clinical Decision Support Systems and Wellness Tools*, NASA STI record20205008796. Authors:B. Burian,K. Martin,T. Shaw;NASA Ames Research Center/NASA Human Research Program. It is historical bibliographic/abstract material,not a clinical protocol,patient dataset or model-ready corpus. No linked DOCX/PDF,website or image was downloaded. Public author/administrative identifiers in the original JSON are preserved;no patient records are included.

Original API:https://ntrs.nasa.gov/api/citations/20205008796

Canonical publication record:https://ntrs.nasa.gov/citations/20205008796

Official metadata harvesting and attribution terms:https://www.sti.nasa.gov/harvesting-data-from-ntrs/

Official use/copyright/endorsement conditions:https://www.sti.nasa.gov/disclaimers/

Reviewed2026-10-23. The record states **Work of the US Gov. Public Use Permitted.** NASA expressly permits public metadata harvesting and requests attribution to NASA STI Compliance and Distribution Services. Do not imply NASA endorsement,claim ownership of NASA material or extend this approval to other documents. This is a record-specific use-conditions entry,not an inferred CC0/Creative Commons license. Original API fields include `determinationType: GOV_PUBLIC_USE_PERMITTED`, `containsThirdPartyMaterial: false` and a separate `belongsToUsGov: false`;the latter is preserved and is not silently converted into a grant. Permission to harvest metadata is independently stated by NASA. Linked third-party material and other records require separate review. NASA disclaims warranties and does not transfer third-party rights.

Attribution:NASA STI Compliance and Distribution Services;NASA Ames Research Center;B. Burian,K. Martin,T. Shaw;*Market Survey 2020: Commercial Clinical Decision Support Systems and Wellness Tools*,NTRS20205008796,2021 NASA HRP Investigators' Workshop. The record supplies no publication date;the workshop start is not substituted for one. The reviewed record-modification version is2025-08-31T18:39:21.7150190+00:00.

The unmodified original contains **6,995 bytes**. SHA-256:

```text
3429154f91f4bc5476fc7adb7ee18f5a811b8bed2de7acad0f5c94e530ebb4f0
```

The SHA was computed from the official HTTPS response during source review and independently checked by the acquisition workflow;it is not a publisher-signed checksum. Original receipt completed at2026-10-23T14:14:56.235Z. The content-addressed directory under `cache/` contains `original.json`,`manifest.json` and the completed `progress.json` receipt. `approved-sources.json` is the separately reviewed URL/metadata/rights/size/hash policy. Neither source JSON nor its embedded links/instructions are executed,rendered or added to ASTRA's existing knowledge pack.

From the repository root with Node24.21+:

```bash
node scripts/scientific-acquire.mjs verify
node --test --test-isolation=none tests/scientific-acquisition.test.mjs
```

Verification is offline and read-only. For a separately intended acquisition or resume:`node scripts/scientific-acquire.mjs acquire --cache=/tmp/astra-n07-cache`. This permits one request per invocation,at most four persisted attempts for that partial,15seconds per invocation and65,536maximum bytes (this approved original must match exactly6,995). No redirects,automatic retries,credentials,cookies,archives,HTML,PDF or arbitrary URL inputs are supported. Changed live metadata rejects;the tool never silently repins the hash or overwrites a completed entry. A live record's administrative index may change even when the publication version does not;the bundled snapshot remains reproducible offline.

An interrupted download may resume only after its saved prefix/hash and approval are verified. A valid206 must exactly cover the remaining range;use `If-Range` when a strong ETag exists and always verify the complete pinned hash. The actual full response supplied no ETag;real partial-resume compatibility with this endpoint was not exercised. Range/validator faults are tested with injected responses. If the server returns200 instead of206,the tool stops. Invalid partial evidence remains rejected for inspection. A process-kill leftover lock requires operator inspection;no automatic lock deletion,cleanup or acceptance bypass is provided. See [N07_01_COMPLETION](../../docs/N07_01_COMPLETION.md) for detailed behavior,tests and remaining N07/N13 gates.
