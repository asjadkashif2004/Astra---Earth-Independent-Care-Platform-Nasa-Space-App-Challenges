# N07 — Bounded Sleep-EDF acquisition implementation

2026-10-24. **Acquisition BLOCKED; implementation foundation delivered; N07 In Progress; STOP.** One approved PSG transfer reached its300-second deadline incomplete. No retry,annotation request,accepted pair,dataset card,model or medical integration followed. N01/N02/N04 Complete;N03 Partial;N05 In Progress — Deferred;N06 Not Started — Deferred;AC-20 Open / Unverified. RadLab remains Blocked and was not queried.

## Authorized source and verified rights

The user approved only Sleep-EDF Expanded1.0.0 `SC4001E0-PSG.edf`(48,338,048bytes) and `SC4001EC-Hypnogram.edf`(4,620bytes),plus necessary small supporting metadata. Source-specific limits:50,000,000total payload bytes,300sPSG,15sper small resource,360soverall network time,no automatic retry. All previous sources keep65,536bytes/15s and their existing protocols. No whole-dataset archive or other record is allowed.

Exact official URLs:

```text
https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001E0-PSG.edf
https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001EC-Hypnogram.edf
https://physionet.org/files/sleep-edfx/1.0.0/SHA256SUMS.txt
```

[Official dataset documentation](https://physionet.org/content/sleep-edfx/1.0.0/sleep-cassette/) identifies Bob Kemp,DOI10.13026/C2X676,public access and EDF/EDF+ recording/annotation pairs. [Source-specific ODC-By1.0](https://physionet.org/content/sleep-edfx/view-license/1.0.0/) permits database reuse/redistribution subject to attribution,license URI and notices;privacy,personality and other independent rights are not waived. Approval retains those conditions and source-requested citations. Original bytes/notices are not rewritten;no re-identification,clinical endorsement or astronaut validity is implied. Source dates/age/sex/channel facts remain unverified in the incomplete original. [Source notes](../data/scientific/sleep-edf/README.md),[exact approval](../data/scientific/sleep-edf-sc4001.approval.json).

## Actual network evidence and integrity outcome

| Resource | Actual evidence | Acceptance |
|---|---|---|
| Publisher `SHA256SUMS.txt` | One full GET,39,799bytes;SHA256`1bc88e19e2e921f7851d7cf61e31ceb8f6d670211ca546a323e9db5a77525edf`;HTTP200,text/plain;13,575.973ms,conservatively charged13,576ms | Complete supporting metadata;both exact expected hashes parsed/pinned |
| `SC4001E0-PSG.edf` | One GET;**1,146,508 of48,338,048bytes** received;deadline abort at2026-10-24T06:46:29.671Z;incomplete prefix retained | **BLOCKED**,not a complete original |
| `SC4001EC-Hypnogram.edf` | **Not requested** after the first-file failure | Unverified/not acquired |

The partial PSG prefix hashes to `2f55853bf13fb5fdf322fc6099bedfca3dff14a93b3eb1e5cf9cd276cae10fc9`. This was rechecked offline against the saved checkpoint. **It is not the complete PSG SHA and cannot be compared as if it were the publisher's whole-file checksum.** Actual full-original hashes are unavailable for both files.

Publisher expected whole-file hashes,not successful downloaded-file hashes:

```text
SC4001E0-PSG.edf
2b40a18adf76af69a42d6db1f30f31d26b369f6d27ca0050ef30147ef892b131
SC4001EC-Hypnogram.edf
a4cf67694ade1b52a0ddd06d5817fd45d2d3e8bac5302f640f3e9cfbbf12a996
```

Recorded application payload totals **1,186,307bytes** including publisher metadata. Conservatively recorded transfer-phase time totals **313,594ms**,including the earlier metadata request. The PSG timer was configured for300,000ms;its recorded phase is300,018ms including cancellation/cleanup. No manual deadline extension occurred;this is not a hard real-time timing certificate or a passed complete-file timing gate. Overall accounting is cumulative request/transfer time,not the intervening coding time. Physical TCP/TLS traffic and infrastructure root cause were not measured. The observed fact is failure to complete before the timer;no specific provider throttling or laptop fault is established.

Partial directory:

```text
data/scientific/cache/.physionet-sleep-edfx-sc4001-1bc88e19e2e921f7851d7cf61e31ceb8f6d670211ca546a323e9db5a77525edf.partial/
```

The original filename,prefix bytes/hash,complete publisher metadata,receipt and failure checkpoint are retained. `complete:false`,`response_complete:false`;no final entry/manifest was promoted. The owned response/file/lock were closed/released;partial evidence was not deleted. Annotation request count0. Reinvocation refuses the existing partial rather than silently resuming,overwriting or promoting it. New transfer/resume work requires explicit approval. [Attempt record](../artifacts/n07-sleep-edf-20261024/attempt.json).

## Narrow implementation and structural verification

New `sleep-edf-source.mjs` pins the two original filenames/URLs/sizes/publisher hashes,one metadata snapshot,ODC-By conditions and exact source-specific budgets. The existing small-source validator gains only those three exact URLs;its source approval rules remain unchanged and cannot accept Sleep-EDF through the small-file path. Generic cache behavior is unchanged except exporting existing secure primitives for reuse.

New `sleep-edf-cache.mjs` reuses that HTTPS transport and secure directory/no-follow/exclusive-write/checkpoint/abort primitives. It streams chunks and hashes incrementally without concatenating or repeatedly hashing a48MB buffer;syncs prefix checkpoints at1MB and failure/completion;enforces MIME/encoding/status/length/hash,per-file and aggregate budgets. It serializes the two fixed files,stops on first failure,keeps rejected partials,and promotes a pair only after byte/hash/EDF/pair checks. An isolated bundle manifest is needed for two originals and supporting receipt;no prior manifest/schema/database migration occurs. Successful-cache verification rehashes both originals offline before issuing a private verified-context marker;JSON summaries or partials cannot generate an accepted card/split.

New `edf.mjs` performs bounded ASCII header/calibration/sample-count/record-length/local-clock checks;parses annotation-only continuous EDF+ TALs with literal source labels;checks clock/montage/time-bound pairing. Timezone stays unknown. Unsupported discontinuous EDF+ and unknown layouts fail closed. These are bounded checks for the approved source,not a general clinical EDF certification,physiological model or waveform-replay implementation.

**Actual original EDF structure/pair validation was not reached.** Synthetic fixture tests pass,but they do not establish the downloaded PSG's channel set,record duration,subject demographics or source annotation values. The accepted dataset card and verified split manifest were therefore not produced. A separate [proposed split policy](../data/scientific/sleep-edf/SC4001.proposed-split-policy.json) is explicitly blocked/unexecuted,uses source-filename subject00/night1 only,and contains no actual counts/assignments. Related nights/windows/channels must remain together;independent subject partitioning is not established.

## Files and focused checks

Added code:`services/acquisition/sleep-edf-source.mjs`,`edf.mjs`,`sleep-edf-cache.mjs`,`scripts/sleep-edf-acquire.mjs`,`tests/sleep-edf-acquisition.test.mjs`. Modified only two existing code files:`services/acquisition/source.mjs` (fixed URLs) and `cache.mjs` (secure helper exports). Added approval,publisher source-review originals,proposed split policy,source notes and rejected partial state. Only Sleep-EDF catalogue status/current scientific/planning/traceability documentation updated. No new dependencies,production monitoring,graphics,AI,SQLite fixtures,RadLab or browser work. Exact inventory:[verification.json](../artifacts/n07-sleep-edf-20261024/verification.json).

Executed Linux/WSL2 Node24.21.0:

- **53/53 prior acquisition/OSDR/BIDMC compatibility tests PASS**,0skips/failures.
- **19/20 Sleep-EDF focused checks PASS,1explicit skip,0failures.** Skipped:verification of complete real originals/manifest/card/split,because no accepted pair exists.
- Combined **72passes,1skip**,not73passes and not acquisition acceptance.
- **94-file syntax/import check PASS**,0errors.
- Direct offline NTRS,OSDR and BIDMC original checks PASS. Publisher metadata and saved partial-prefix SHA rechecked independently.

The initial unit log retains one fixture error:an invalid-header test changed a legal reserved field. It was corrected to target the numeric samples-per-record field;no runtime validation was weakened. Final tests cover exact sources/caps,publication/receipt integrity,incremental streaming,budget/deadline/cancellation,wrong MIME/status/encoding/size/hash,late EOF,partial retention/lock cleanup/no retry,EDF fixtures/malformed headers/TALs/pair mismatch,offline hash detection and refusal to build accepted documents from unverified summaries. No broad/full suite,medical/model evaluation,Windows/real range-resume,power-loss or browser certification. Logs and original failure evidence remain separate and unchanged. Git commit unavailable in this checkout.

```bash
node --test --test-isolation=none tests/sleep-edf-acquisition.test.mjs
node --test --test-isolation=none tests/scientific-acquisition.test.mjs tests/osdr-metadata.test.mjs tests/bidmc-acquisition.test.mjs
npm run check
```

These are local non-browser checks. `node scripts/sleep-edf-acquire.mjs verify` cannot pass until complete originals exist;do not present that pending gate as executed successfully. Do not rerun acquisition under this exhausted approval.

Final preservation/document checks:506existing source/asset/QA/scientific/research/dependency/evidence files fingerprinted;502unchanged. Only two intended prior acquisition code files and the scientific README/Sleep-EDF catalogue entry changed;14new code/data/partial paths recorded. Prior N07 originals/receipts/all historical artifacts and N04 evidence remain untouched.13Markdown files/273relative links,0missing;fences balanced,all26module IDs retained;blocked split nonexecution and absent promotion/annotation/owned lock verified. No new transfer or broader testing follows these checks.

## Remaining gates and smallest next task

Sleep-EDF physiological acquisition is **Blocked**;complete byte/hash/EDF pairing/card/verified partition evidence remains pending. BIDMC's bounded numerics and the NTRS/OSDR originals remain intact. PTT,named OSD-575/656 provenance,blocked RadLab,remaining cards and applicable actual subject/time split verification still prevent full N07 closure. No original requirement is waived or replaced with annotation/header/partial data. N13 eligibility is unchanged:full N07 and separate approval,or a separately approved precise subgate exception,required.

Smallest independent next proposal,not authorized:a short read-only exact-source/terms/size feasibility review of one required PTT sample,with no download or source cycling. Keep Sleep-EDF blocked rather than repeat this transfer. Resuming this saved PSG would instead need a separately approved recovery design and explicit new budget;the current adapter deliberately refuses automatic resume and the original failed partial must be preserved. **STOP after this report.**
