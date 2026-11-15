# BIDMC-01 public historical numerics sample

One complete,unmodified file from **BIDMC PPG and Respiration Dataset v1.0.0**, PhysioNet, DOI [10.13026/C2208R](https://doi.org/10.13026/C2208R), released2018-06-20. Authors:Marco Pimentel,Alistair Johnson,Peter Charlton,David Clifton. [Official source/description](https://physionet.org/content/bidmc/1.0.0/).

Original identity:`bidmc_csv/bidmc_01_Numerics.csv` at `https://physionet.org/files/bidmc/1.0.0/bidmc_csv/bidmc_01_Numerics.csv`. Original bytes: **7,644**. SHA-256:

```text
27d43794cf2e7150db10e8bfe61d2bfdb26873a8f1629ffc5fbee5c9a4eb6ef5
```

The content-addressed [cache entry](../cache/physionet-bidmc-01-numerics-27d43794cf2e7150db10e8bfe61d2bfdb26873a8f1629ffc5fbee5c9a4eb6ef5/) contains unchanged `original.csv`,manifest and completed receipt. [Approval](../bidmc-01-numerics.approval.json),[dataset card](BIDMC-01.dataset-card.json),[split policy](BIDMC-01.split-policy.json),[completion](../../../docs/N07_BIDMC_COMPLETION.md).

## Rights and attribution

Contains information from the BIDMC PPG and Respiration Dataset v1.0.0,available under the [Open Data Commons Attribution License v1.0](https://physionet.org/content/bidmc/view-license/1.0.0/). Retain that license URI,authors/source attribution and notices when conveying these bytes/documentation. ODC-By covers database rights,not all independent privacy,trademark or content rights;it is not permission to identify patients or imply clinical endorsement.

The release also includes a [legacy LICENSE notice](source-notices/LICENSE),preserved verbatim (939bytes,SHA256 `76576a17b505dce71773415a18e965982bc8c0c9a60da71f1adb9df7644332a0`),describing prior MIMIC-II extraction,Matlab conversion,annotations and exports. Its referenced [official archived copying policy](https://archive.physionet.org/copying.shtml#data) permits verbatim copying/redistribution and requires distinct names/source/modification notices for later modified data. Both references are retained;no conflicting blanket CC0 label is assigned. ASTRA makes no changes to the original CSV and exports no modified signal file. Card/split JSON is ASTRA's derived documentation,not original physiological measurements. Preserve both current and legacy notices.

Source-requested publication citation:Pimentel,M.A.F.,et al.,*Towards a Robust Estimation of Respiratory Rate from Pulse Oximeters*,[DOI10.1109/TBME.2016.2613124](https://doi.org/10.1109/TBME.2016.2613124). PhysioNet resource citation listed on the current source:Pollard,T.,et al.(2026),*PhysioNet as a global platform for biomedical research*,[DOI10.1038/s44360-026-00096-z](https://doi.org/10.1038/s44360-026-00096-z). These are attribution references,not additional acquired publications or medical recommendations.

## What the sample supports

There are481rows at1Hz,elapsed seconds0through480inclusive. Columns:Time[s],HR,PULSE,RESP,SpO2. Source descriptions identify monitor ECG-derived HR,PPG-derived pulse,impedance-derived respiration and oxygen saturation;HR and pulse are distinct. NaN occurs13times in PULSE and13times in SpO2;it remains missing,never zero or a healthy fallback. HR/RESP contain no literal NaN in this record;that does not certify measurement quality. No waveform,breath annotation,demographic file or other recording is acquired.

Population:historical critically ill hospital patients at BIDMC,Boston,derived from MIMIC-II. This supports bounded scalar-format,ordering,missingness and future replay-pipeline tests. It cannot set astronaut normal ranges,validate medical predictions,establish monitoring thresholds or represent live NASA/ASTRA crew readings. The original contains no direct identifying columns;independent anonymization/clinical-quality certification is not claimed.

The source filename provides local subject number01/record`bidmc_01`. Actual MIMIC patient/stay/recording linkage and absolute dates are unavailable in this selected CSV. Retrieval completion2026-10-23T15:32:23.482Z is a repository receipt,not observation time. Do not attach it to the fictional crew or Earth-reception timeline.

**Split status:blocked,unexecuted.** All channels/windows/duplicate source derivatives must stay within a verified patient/stay group;future temporal tasks require chronological policies and justified gap handling. One local recording and481rows cannot supply481independent subjects or subject-disjoint train/validation/test sets. Assignments remain empty;ratios,seed,targets and verified independent subject counts remain unknown. No model training occurs.

## Offline checks

```bash
node scripts/scientific-acquire.mjs verify --source=physionet-bidmc-01-numerics
node scripts/bidmc-sample.mjs verify
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs tests/bidmc-acquisition.test.mjs
```

One source-review GET and one guarded cache-acquisition GET fetched the same single sample;one supporting939-byte license notice was retrieved. The optional40KB publisher checksum-list review hit the15-second deadline and was not retried or saved partially. The pinned sample SHA is computed from the complete official HTTPS review response and verified independently by the cache workflow,**not matched to the unavailable publisher checksum list or a signature**. No RadLab request was made. Existing65,536-byte,15-second,one-request-per-invocation and strict range/hash/receipt guards remain unchanged;real partial-range support was not tested.
