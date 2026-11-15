# N03 / AC-20 physical acceptance procedure

Original criterion: **3D judge-performance mode sustains ≥30 FPS on the team's designated minimum machine**. [DE-AC20-01](DE_AC20_01.md) retains the approved provisional protocol: three warmed 60-second trials at 1920×1080 for each relevant active scene, six-crew ~60 scalar/s workload, at least 30 presented frames in **every active one-second interval**. Standard 60 FPS is a target. No minimum machine has been designated in the current records; the historical Lenovo reference is not an inferred designation.

1. Owner records the exact designated physical client and decision reference. Record CPU, GPU/driver, usable RAM, OS, browser/version, display, power/thermal conditions, host placement, DPR and native zoom. Use a visible browser and an isolated fictional-data profile/store; no model, operational database or N16 worker is needed.
2. Warm application and scene assets. Select Performance mode with continuous animation; leave reduced motion off for this performance trial. Independently verify reduced motion in the accessibility campaign. Declare all currently relevant active scenes and camera workload; do not omit a costly scene to obtain a pass. N06 integrated scenes require later N06 authority and evidence.
3. Feed the declared six-crew source workload through the existing authorized synthetic path. Record actual received/accepted events and units, source timestamps, presentation timestamps and source/quality correctness. Never suppress an alert, drop clinical source data or reduce source cadence to improve a score.
4. Collect three separate warmed 60-second **physical presentation** traces per scene with the device's browser/OS compositor tooling. Preserve original compact trace references and hashes. Derive consecutive one-second counts from actual presented frames. rAF callbacks, WebGL draw calls, headless timing, a screenshot or GPU-capability flags cannot substitute for physical presentation. Record the derivation/tool/version and interruptions; interrupted trials are not passing trials.
5. Separately collect warm usable-shell ≤3 seconds, simple API p95 <200 ms and telemetry-to-UI p95 <500 ms at that workload. Distinguish DOM mutation from visible paint. Record source correctness, assets transferred versus decoded CPU/GPU memory, repeated-navigation cleanup and device limitations. The current N03 headless burst diagnostics do not satisfy this workload/profile certificate.
6. Generate the blank packet, populate it from genuine records, and validate structure:

   ```sh
   node scripts/validate-ac20.mjs --template > /tmp/ac20-physical.json
   node scripts/validate-ac20.mjs --input=/tmp/ac20-physical.json
   ```

   Each trial needs a stable `id`, declared `scene`, `warmed: true`, `duration_seconds: 60`, original `trace_reference` and `trace_sha256`, plus 60 `seconds` entries `{index: 0..59, active: true, presented_frames: integer}`. No placeholder observation or signature is prefilled. The checker does not launch a browser, read a model or mutate application data.
7. Owner verifies original traces, device designation, actual workload, scene coverage, derivation and limitations, then records acceptance or rejection. The checker returns **STRUCTURALLY_READY_FOR_OWNER_REVIEW**, never physical certification. It cannot authenticate a person or a trace from JSON. A blank packet returns NOT_VERIFIED. Do not edit the tracker to Complete from a schema pass.

Physical acceptance is currently **NOT VERIFIED**. Full N06 integrated evidence and N26 final-system revalidation remain release gates. No protocol relaxation, new scientific approval or authorization for deferred modules is implied.
