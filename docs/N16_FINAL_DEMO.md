# Standalone recorded Health Agent demo

Open [demo.html](../artifacts/n16-final-20261030/native/demo.html) directly in a current browser. No server, network, model or installation is required. The page runs no tools and has no JavaScript.

The recording is for fictional CREW-03 only. Other crew options are unavailable rather than populated with invented values. All readings use the source mission timestamp2026-11-14T11:00:00.000Z; this is not host-current telemetry. Inspect native details controls for exact result/provenance and scroll to the actual execution timeline.

Four real SQL calls are recorded: authored risk records, archived vitals, source quality and authored reference. The risk record is a synthetic schema example with actual_N02_event:false; independently verified N02 event provenance remains UNKNOWN. No medical all-clear, diagnosis or treatment is inferred.

File-only verification/recovery, with Node24.21.0:

    node scripts/n16-final-demo.mjs recover

This reads saved trace/result/resource hashes only and replays no SQL. The machine-readable presentation is [demo.json](../artifacts/n16-final-20261030/native/demo.json).

The run command is mission-gated and refuses execution after delivery. Current native/resource permission expires; no remaining starts may be used without fresh explicit authorization. Operational Health Agent integration, N14/N15 research support and clinical interpretation are outside this artifact.

See [the comprehensive report](N16_MASTER_COMPLETION_REPORT.md) for all measurements, QA, preservation and outstanding formal N16 gates.
