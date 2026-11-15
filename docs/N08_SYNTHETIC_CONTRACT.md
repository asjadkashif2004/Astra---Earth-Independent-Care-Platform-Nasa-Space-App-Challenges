# N08 synthetic engineering contract —v1 /2026-10-30

Authority: activated DE-N08-SYNTHETIC-01 and owner consolidated mission. The original W1–W10 matrix remains unchanged as historical/full acceptance. This contract qualifies its synthetic engineering branches, including genuine inactive timestamp/provenance interfaces for W8; actual public waveform and N06 anatomical-twin execution remain BLOCKED, never silently passed.

## Fixed input and clocks

Only astra.n08.input.v1 authored_synthetic sources, fictional six-crew scope, bounded IDs, explicit generator/version/seed, canonical UTC milliseconds, exact channel/unit pairs ECG/mV, PPG/arbitrary_unit, RESP/arbitrary_unit. Shared sample rate is one of50,100,125,250,500Hz. No resampling or unit conversion; original and float32-normalized hashes remain distinct. Duration is an integer1–60seconds and every sample lies on the exact time grid. End time is exclusive and cannot exceed mission now. Source and server-owned mission knowledge timestamps plus separate host submission are preserved.

ASTRAWV1 binary:8-byte ASCII magic, uint16LE version1, endian marker1, encoding marker1 (IEEE754float32LE), uint32LE metadata length; canonical UTF-8 JSON metadata <=8KiB, followed by interleaved frames in declared channel order. Total input <=256,000bytes. No compressed/archive/EDF/general waveform format claim. Finite samples only, plus canonical float32 quiet NaN0x7fc00000 for explicit missing data; infinity or other NaN encodings reject. SHA256 is verified separately from the bytes/header before commitment.

CSV variant: literal first line # ASTRA-WAVEFORM-CSV-V1, second # metadata:<canonical JSON>, exact timestamp and channel[unit] columns. UTF-8/no BOM, fixed unquoted dialect, strict decimal numbers, empty cell means missing. Quotes/formulas/unknown columns, invalid/off-grid/duplicate/reordered timestamps and wrong row count reject the whole recording with bounded row/column reason. Raw source bytes are retained; rejected data never partly commits.

## Persistence, scope and replay

Additive schema5 only: append-only waveform_sources original BLOB/metadata and waveform_chunks float32 channel BLOBs/hashes in the same existing transaction/audit. No N02 table or threshold changes. Chunks are1–5seconds, fixed5seconds except a shorter integer-second tail. Source revisions append; supersedes_sha256 must bind the current owned prior revision. Exact duplicate source hash returns the prior committed source only for the same actor/crew. Changed same-version/foreign-owner/source conflicts reject. Every read rechecks original and chunk hashes/length/metadata; no repair, checkpoint, regeneration or result persistence on read.

Finite retention: retain at most64total source revisions and8MiB of original+normalized chunk payload per crew. Reject new writes at capacity instead of deleting audit/corrections or silently evicting evidence. No unbounded import, implicit TTL or operational retention policy change. Supported inputs are deliberately small; no entire large waveform is accepted into memory. Bounded original memory plus <=5second chunk buffers; decimated transport is chart bins, never a JSON object for every raw waveform sample. Raw chunk reads remain binary.

Demo-only session authorization: Demo Administrator and self-scoped Astronaut may author fictional records; those roles plus Mission Control/Flight Surgeon may read within scope. Viewer/Researcher/System Administrator do not inherit waveform raw-data permission. No real source or patient input, arbitrary server URL/path/SQL, N16 source or external request. Earth received view cannot fetch onboard-only waveforms. No waveform output is written into N01 scalar observations, N02 alerts, personal baselines or communication queues.

List/history apply source end and known_at <= cutoff before latest revision selection. A window uses explicit from_ms/until_ms bounded by the recording and knowledge cutoff; only sample times before until are returned/analyzed. Playback source time is independent of host playback controls. Pause/resume/seek and cancellation do not change sources. Decimation preserves bin extrema and reports gaps; drawing does not connect across a missing bin. Empty/missing/quality-poor data remains UNKNOWN/PARTIAL.

## Derived values and gated integration

Experimental positive ECG peak controls: local maxima above0.8mV separated by>=250ms, source-bound frame/time/hash records; no morphology or clinical accuracy claim. A descriptive rate requires at least3candidate peaks, complete valid coverage and good declared source quality. Missing/poor/insufficient data withholds that rate. Min/max/mean/RMS describe only observed samples. BP is always UNKNOWN without an approved source; no PPG-to-BP inference. Quality distinguishes engineering format validity, source declaration/coverage and clinical validation (never supplied).

W8 engineering interface returns actual verified peak frame/source timestamps with recording/hash/revision and status INACTIVE_N06_GATE. It does not activate animation or certify full twin synchronization. N09/N10/N11/N12/N16 descriptors likewise remain inactive; N07 public sources are metadata compatibility evidence only, not real waveform ingestion. N13/N14/N15 review/answer gates stay unchanged.

## Verification bounds

Fresh artifacts/n08-engineering-20261030 and OS temp synthetic DB/profile/file roots only. No expired resource/startup allowance. Node QA batches <=180s; browser workflow <=15minutes/launch using installed tooling, with at most four planned ordinary-fix launches for this campaign. No retry after genuine source/authorization/integrity/resource failure. Runtime measurements are sampled/kernel observations, not hard RSS/disk quotas. Tests must distinguish all ten synthetic branches from public-source/N06 external gates, exercise actual binary and CSV API/UI/persistence/replay/cold recovery and prove N02/other modules unchanged. STOP after delivery.
