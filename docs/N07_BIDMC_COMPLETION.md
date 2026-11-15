# N07 — One BIDMC physiological numerics sample

Delivered2026-10-23; **N07 In Progress; STOP**. This is the user-approved bounded physiological-sample task,not a new module or permission to finish N07. N01/N02/N04 Complete; N03 Partial; N05 In Progress — Deferred; N06 Not Started — Deferred; AC-20 Open / Unverified. RadLab remains Blocked and was not queried.

## Selection,requirements and rights

The original N07 row in [MASTER_PLAN](MASTER_PLAN.md) requires small public BIDMC/Sleep-EDF/PTT samples,source manifests/cache,cards and subject/time splits. Research's dataset matrix distinguishes hospital waveform/numerics pipeline tests,terrestrial sleep processing and healthy-participant wearable/activity tests;none establishes astronaut clinical norms. BIDMC is first in the required list and the first eligible source reviewed here. Sleep-EDF and PTT were not fetched or substituted. N01 is Complete;exact resource/public access/rights/format/size verification preceded implementation. [Earlier gap matrix](N07_03_REVIEW.md) remains unchanged historical evidence.

Selected **BIDMC PPG and Respiration Dataset1.0.0,record01,`bidmc_csv/bidmc_01_Numerics.csv`**. [Official source](https://physionet.org/content/bidmc/1.0.0/) explicitly distributes numerics CSVs and permits public access under [ODC-By1.0](https://physionet.org/content/bidmc/view-license/1.0.0/). Database extraction/redistribution is allowed subject to license URI,notices and attribution;privacy/trademark/independent-content rights are not waived. The accompanying LICENSE points to the [legacy copying policy](https://archive.physionet.org/copying.shtml#data),which also permits verbatim redistribution and specifies notices/naming for modified copies. Both are retained,not treated as alternative permission to discard notices. The original939-byte notice is preserved and hash-checked. This task redistributes one unmodified public numerical file,not private/live records;no patient linkage/re-identification occurs. No legal ambiguity is concealed by a CC0 label. Full attribution and citations:[source README](../data/scientific/bidmc/README.md).

## Original and provenance

| Evidence | Actual result |
|---|---|
| Exact resource | `https://physionet.org/files/bidmc/1.0.0/bidmc_csv/bidmc_01_Numerics.csv` |
| Bytes / HTTP MIME | **7,644**;`text/plain; charset=utf-8`,containing CSV |
| SHA-256 | `27d43794cf2e7150db10e8bfe61d2bfdb26873a8f1629ffc5fbee5c9a4eb6ef5` |
| Release / original identity | Dataset1.0.0,2018-06-20;record01 numerics;DOI10.13026/C2208R |
| Guarded workflow receipt | Start2026-10-23T15:32:16.439Z;completion2026-10-23T15:32:23.482Z;one GET;ETag`"5b2a8bbd-1ddc"` |
| Source-review receipt | One earlier complete same-file GET2026-10-23T15:26:40.660305+00:00–15:26:49.030133+00:00,establishing the review pin |
| Local cache | [Original/manifest/completed progress](../data/scientific/cache/physionet-bidmc-01-numerics-27d43794cf2e7150db10e8bfe61d2bfdb26873a8f1629ffc5fbee5c9a4eb6ef5/) |
| Supporting rights file | 939-byte release LICENSE,SHA`76576a17b505dce71773415a18e965982bc8c0c9a60da71f1adb9df7644332a0` |
| Publisher-checksum limitation | Exact official SHA256SUMS metadata review hit15seconds during reading;no saved partial/retry. No publisher-checksum/signature match claimed. |

One sample is stored,not two:the review and guarded acquisition fetched the same original. The supporting license/checksum-metadata review is not another physiological sample. No waveform,annotation,demographic file,other subject,archive or raw radiation payload was fetched. Full original bytes are kept unchanged;no truncation,resampling or synthetic substitute. Review details:[source-review.json](../artifacts/n07-bidmc-01-20261023/source-review.json).

## Implementation and data semantics

New fixed `bidmc.mjs` validates release/publication,explicit rights/legacy-notice SHA,patient-derived nonclinical scope,exact file/MIME and immutable7,644-byte/SHA pin. Only one exact URL/CLI source ID is added. It parses only the fixed numeric CSV dialect,requires five known columns,all481ordered seconds0–480 and valid UTF-8;rejects HTML,formulas,unknown fields,nonfinite values and incomplete excerpts. Literal NaN becomes null only in offline parsed summaries;original bytes remain untouched. Thirteen PULSE and thirteen SpO2 values are missing;HR/RESP have zero literal NaN,which does not imply clinically reliable measurements.

Minimal cache changes select `approval.resource.file` and approved MIME/Accept rather than hardcoded JSON strings. Existing NTRS/OSDR validators still require `original.json`/application-json;BIDMC alone permits `original.csv`/text-plain. No arbitrary filename/type/host path is accepted. Byte ceiling65,536,deadline15,000ms,one request/invocation,four persisted attempts/partial,Range/If-Range,prefix/full SHA,exclusive locks,transaction-like promotion and rejection semantics remain unchanged. The new MIME support does not execute CSV/HTML or create a crawler. Existing receipt schema is reused without migration.

[Card](../data/scientific/bidmc/BIDMC-01.dataset-card.json) records hospital population/conditions,monitor channels/units,unknown clinical quality,download inventory,rights/domain shift and actual receipt. The source filename documents local subject number01 and recording`bidmc_01`;real patient/stay/global cross-archive identities,absolute recording dates,selected age/sex and treatment context remain unknown. The481observations are not independent subjects. Repository retrieval is not source-observation or Earth-reception time;there is no API,telemetry,N01/N02,forecast,AI or fictional-crew integration.

[Split policy](../data/scientific/bidmc/BIDMC-01.split-policy.json) remains **blocked and unexecuted**,with zero assignments. Real patient/stay grouping,linked BIDMC/MIMIC duplicate checks,chronology,overlap/window handling and train-only preprocessing precede future allocation. No random-row split,ratio,seed,label or independent-validation claim is invented. One selected record cannot supply independent train/validation/test patient groups. No split/model training executes.

## Exact implementation/data changes and verification

Added code:`services/acquisition/bidmc.mjs`,`scripts/bidmc-sample.mjs`,`tests/bidmc-acquisition.test.mjs`. Modified existing acquisition code only:`source.mjs`,`cache.mjs`,`scientific-acquire.mjs`. New approval,one cache entry (original/manifest/progress),card,split-policy,source README and retained license notice. Updated parent source README,only BIDMC's catalogue entry,and current planning/traceability/architecture/testing/decision/handoff records. No dependency or production medical/graphics/UI change. Exact preservation/file inventory:[verification.json](../artifacts/n07-bidmc-01-20261023/verification.json).

Executed Linux/WSL2 Node24.21.0 **53/53 focused tests PASS**,0 failures/skips/cancellations (39existing acquisition/OSDR+14new BIDMC tests),1000.762794ms. **89JavaScript files/import checks**,0errors. Actual full acquisition and direct offline CLI verification of BIDMC/NTRS/OSDR plus BIDMC card/split/notice all pass. Existing-source compatibility is freshly tested;historical browser/medical/N04 evidence is reused,not rerun. Injected tests cover source/rights/cross-source/type/hash rejection,CSV malformed/order/missingness,atomic persistence,interrupted exact-range resume,late disconnect,corrupt completed files,receipt/card tampering and fabricated split claims. Real source partial-range/power-loss/Windows/clinical verification was not executed. No broad/full regression suite,browser,SQLite fixture,telemetry,AI/model evaluation or RadLab check. Restricted acquisition/generated-file writes used supported escalation;no OS/package/credential change. No usable Git commit.

```bash
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs tests/bidmc-acquisition.test.mjs
npm run check
node scripts/scientific-acquire.mjs verify --source=physionet-bidmc-01-numerics
node scripts/bidmc-sample.mjs verify
```

## Current N07 acceptance delta and next task

| Original item | Current result / smallest remaining action |
|---|---|
| Small BIDMC physiological sample | **Satisfied for one complete numerics sample.** Waveform acquisition/replay and R36/R53 integration are not claimed;full waveform pipeline remains N08. |
| Allowlist/source/license/hash/cache foundation | Extended and verified for the third exact source,with both rights notices retained and unchanged safeguards. |
| Source cards and provenance | BIDMC card/receipt complete for this bounded sample;other outstanding sources still need their own verified originals/cards. |
| Subject/time split readiness | **Partial.** Real local record/time/row evidence recorded;global patient linkage and sufficient independent groups unverified;policy blocked/unexecuted. |
| Sleep-EDF/PTT samples | **Unverified / not acquired.** Separate exact-file/rights/budget review required. No new requests made here. |
| Generic OSDR / named OSD-575/656 | OSD-1 metadata evidence retained;named records remain unacquired. No substitution or raw omics required here. |
| RadLab | **Blocked**,previous oversized response/HTTP500 evidence unchanged;no request in this task. |
| Multi-source reproducibility/full N07 | Partial:three actual source originals verify offline;remaining required acquisitions/cards/split evidence keep N07 In Progress. |

The numerics sample advances the explicit N07 sample requirement;it does not silently waive later waveform/medical validation or the remaining original gates. **N13 eligibility is unchanged:**full N07 and separate approval,or a separately approved precise exception,required. DE-AC20-01 is unchanged and does not waive acquisition prerequisites.

Final preservation/documentation checks:493existing source/asset/QA/scientific/research/dependency/evidence paths fingerprinted;488unchanged,only the three intended acquisition code files plus scientific README/BIDMC catalogue changed,11new implementation/data paths. Existing N07-01/02/03 originals,receipts,policies and artifacts unchanged;no N04 evidence rewritten.13Markdown files/258relative links,0missing,balanced fences and all26module IDs retained. New QA evidence contains the exact source-review record,53-test log and verification inventory,not a browser/clinical certificate.

Smallest proposed next task,not authorized:a read-only exact-file/terms/size review of the next required source,Sleep-EDF,to determine whether a genuine useful original fits existing safeguards;acquire at most one only if it does. Do not silently raise the cap,claim an annotation/header-only file is a complete polysomnogram,cycle to PTT on failure or retry RadLab. If the smallest useful physiological recording exceeds the cap,stop with its documented size and request a specific bounded budget decision.

**STOP after this delivery. No further N07 source,N13 or other module is authorized.**
