# OSD-1 — reviewable metadata card and proposed split policy

**Study:** Expression data from drosophila melanogaster. **Identity:**OSD-1 / GLDS-1. **Organism:**Drosophila melanogaster (fruit fly),not human. The official study-level aggregate describes a NASA STS-121 spaceflight experiment comparing whole-organism transcriptional context across spaceflight and infection conditions. It references Affymetrix DNA microarrays. Those are the source's measurement/technology labels;ASTRA downloaded no expression values,images,sample tables or raw omics.

- [Official study](https://osdr.nasa.gov/bio/repo/data/studies/OSD-1)
- [Exact metadata endpoint](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-1/)
- [Official API documentation](https://visualization.osdr.nasa.gov/biodata/api/)
- [Dataset-specific NASA catalogue/access/use record](https://data.nasa.gov/dataset/expression-data-from-drosophila-melanogaster-a0600)
- [NASA Science data-license policy](https://science.data.nasa.gov/about/license)
- [Government-works guidance referenced by the catalogue](https://www.usa.gov/government-copyright)
- [OSDR citation/acknowledgement guidance](https://science.nasa.gov/reference/osdr-faq/)

The catalogue explicitly lists public access and `https://www.usa.gov/government-works` in its license field,and links to this OSD-1 study. It does not explicitly label this selected API response CC0. NASA's data-license policy describes its default for unrestricted NASA-led mission data and the precedence of source-specific notices;USAGov also warns that government hosting does not waive third-party,endorsement or international-rights restrictions. The approval preserves the actual catalogue statement,review date,policy references and limitations with `license_id: null`. No blanket CC0 license is fabricated. Raw-file and linked-publication redistribution permissions are outside this metadata-only review and must be checked independently before acquisition.

Credit:Data are courtesy of the NASA Open Science Data Repository. Cite OSD-1/GLDS-1,*Expression data from drosophila melanogaster*,and the named investigators/publication authors recorded in the original metadata. No NASA endorsement or medical validation is implied. Contact/author text is reference metadata,not a patient dataset. All embedded protocol text and links are inert and never become advice,executable instructions or crawled resources.

The original compact JSON is **8,054bytes**,SHA-256:

```text
cfe7d81c59efc3b01b4407db0854b4224b51bfcb9d8b4f590fc8467ededa6d64
```

Workflow receipt:2026-10-23T14:42:42.359Z through14:42:44.379Z,one full GET,no ETag. The content-addressed cache preserves exact bytes,manifest and receipt. [Approval](../osdr-osd-1.approval.json),[dataset card](OSD-1.dataset-card.json),[split policy](OSD-1.split-policy.json). Derived documents bind their source SHA,approval fingerprint and receipt time. The SHA is a local review pin from official HTTPS bytes,not a publisher signature. Source-provided study release-version/modification fields are unavailable;the snapshot fingerprint identifies the acquired representation rather than an invented release number.

The card includes source paths for study title,organism,mission,measurement,technology,platform,release time and factors. Mission dates are2006-07-04–2006-07-17;the source's distinct public-release timestamp converts to2013-12-11T00:00:00.000Z. Neither is a paper publication date or an individual sample's observation time. Sample/subject/biological/technical counts and pooling/vial/hardware/batch identities are explicitly null. Protocol prose mentions counts for other procedures;none were treated as microarray sample counts. The source's combined investigator-name fields were not turned into sample identities.

The split document is **a proposed policy,not an executed split**. Proposed independence is a verified biological experimental unit,possibly a fly pool or vial,with shared flight/hardware/run and technical derivatives kept together. Actual IDs/counts are unknown. Random rows or gene/probe rows are not independent subjects. Fit preprocessing/feature selection on training groups only,tune on disjoint biological validation groups,and require an independent mission/study/cohort for a mission-generalization test after duplicate checks. This single study cannot demonstrate such independence. Ratios,seed,target labels and all split counts are null;assignments are empty and `executed:false`. Additional authorized metadata and scientific review are required before allocation.

Important limits:one nonhuman mission/platform and whole-organism measurements cannot establish astronaut diagnosis,medical thresholds or causal gravity effects. Infection,strain,handling,launch/re-entry,radiation/environment and batch effects can confound interpretation;their effects are not estimated here. No quality assessment,expression preprocessing,statistical analysis,training or score is performed. The compact endpoint provides aggregate context,not verified raw-file availability or complete sample design.

From the repository root:

```bash
node scripts/scientific-acquire.mjs verify --source=nasa-osdr-osd-1
node scripts/osdr-study.mjs verify
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs
```

Verification is offline. `scientific-acquire.mjs` still defaults to the unchanged NTRS source;only the explicit second source ID selects OSDR. The existing one-request/15s/65536byte/four-attempt and range/hash/cache safeguards remain. No broader study/sample/file wildcard or query is allowed. `osdr-study.mjs prepare` creates the two deterministic documentation files from a verified original and refuses differing existing files;it does not execute a split. Further downloads or implementation require new approval after delivery.
