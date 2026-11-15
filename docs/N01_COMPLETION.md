# N01 — Telemetry and Personal-Data Integrity

**Approved additive contract note2026-10-23:** the separate Last Sleep repair adds optional strictly validated `sleep_session` metadata and an append-only schema3 ledger. Existing required telemetry fields,import/device ownership,ordering,transaction boundaries,privacy and original N01 evidence remain unchanged. Stable held sessions retain original observation/quality;freshness uses the earlier of completion and observation under the same three-sampling-period rule. Scalar-only imports remain valid observations with unverified session identity. See [SLEEP_SESSION_CONTRACT](SLEEP_SESSION_CONTRACT.md) and [completion](SLEEP_LIFECYCLE_COMPLETION.md) for corrections,restart/rollback,knowledge-time history,legacy handling and newly executed focused regressions. This is an explicit additive contract extension,not a silent replacement of N01 guarantees.

Status: implemented and verified within the local backend/handler test boundary. Only N01 was approved. **STOP after this module; N02 and later work require new explicit approval.** Full ASTRA research completion is not claimed.

## Delivered behavior and repaired defects

| Audit defect | Change | Executed regression evidence |
|---|---|---|
| F02 Import continuity/preservation | Each crew metric retains its accepted observation and owning source. Simulator ticks update only simulator-owned channels. Imports persist through ticks, scenario changes and disk restart; they enter history, authenticated SSE and the durable delayed-Earth queue atomically. | Preservation/no fabricated scalar samples; full API→history→SSE→blackout→disk restart→Earth test; same-clock packet ordering; rollback after queue and audit faults. |
| F03 Out-of-order events | Check ordering against the latest accepted observation for each crew/metric, including earlier entries in the same batch. Reject older/equal imported updates with 409; all-or-nothing rollback. Different channels can advance independently without moving aggregate crew time backwards. | Reversed batch rejected; chronological batch accepted; slower-channel update accepted; equal timestamp/duplicate IDs rejected; state/SQLite/history/queue/audit unchanged on failure. |
| F04 Unauthorized private check-in reads | Explicit check-in read permissions replace generic telemetry read. Viewer, Researcher and System Administrator cannot read raw check-ins. Astronaut reads own crew; Mission Control/Flight Surgeon read authorized mission records. Demo Administrator reads only records submitted by the same demo actor. | All seven roles, anonymous 401, denied 403 even with query parameters, astronaut cross-crew denial, demo actor filter, authorized reads, no check-in payload in telemetry/provenance endpoints. Stub-DOM Viewer/Researcher navigation handles denial without fetching raw history. |
| F05 Malformed Origin | Empty, invalid, opaque, credential-bearing or path/query Origin values return bounded 400/INVALID_ORIGIN without applying writes. Well-formed cross-origin writes remain 403; same-origin writes work. | Six malformed values, no configuration change or credential echo; cross-/same-origin regression. |
| F11 Incomplete provenance | Validate UTC calendar/time relationships, required received time, supported source/device/rate, synthetic flag, bounded seed/scenario and generator version. Reject unsupported fields and prototype-like/array metric names. External ingest cannot impersonate the internal simulator. | Invalid-field matrix through validator and real API handler; missing/invalid/future/inverted timestamps; incomplete generator/source; invalid rates/IDs; unsupported source fields; service-token and simulator-spoof denials; forged server receipt rejected. |

New `tests/telemetry-integrity.test.mjs` has 21 tests. One additional Viewer/Researcher UI regression in `tests/web.test.mjs` makes **22 new tests**, with all original 23 preserved: **45 total passing**. The existing mixed-quality fixture now supplies the newly required provenance fields; its quality assertions remain intact.

## Integration contract and deliberate policies

The local edition still accepts **synthetic scalar observations only**. It does not ingest actual astronaut data, public waveforms or user check-ins through the telemetry endpoint. Public replay/gateway/FHIR expansion remains separately scoped.

- Supply `schema_version`, unique `event_id`, known mission/crew, UTC `ts` and `received_ts`, coded metric/value/unit, quality, source and provenance. Unknown fields are rejected with 422 rather than silently carried into public telemetry.
- Source requires `kind=synthetic-import`, bounded `device_id` and `sampling_hz` between 1/86400 and 1000 Hz. Optional `runtime_hz` must be finite/positive and≤1000. Optional `clock` must be `mission_simulation`. All event/gateway timestamps use **mission simulation time**, not the laptop clock. The current mission time is supplied in authenticated state/SSE.
- UTC timestamps accept seconds or exactly three millisecond digits and `Z`; storage normalizes to milliseconds. Observations may be at most 24 mission hours old, cannot be in the future, and gateway receipt must be between observation and current mission time. This intentionally tightens the old incomplete input contract: producers must update their metadata/time handling.
- Provenance requires `synthetic=true`, integer seed 0–2147483647, scenario ID and generator version. IDs/version strings are bounded identifiers. No unknown/public/real source is relabeled synthetic by the server.
- First import may replace the simulator's same-time sample. Thereafter that metric belongs to that import device: its observation time must strictly increase. A different device gets 409/SOURCE_CONFLICT. Ownership is retained across restart and scenario selection. No automatic simulator fallback or device-handoff/reset endpoint was added. Use an independent demo database to demonstrate unmodified simulator behavior; do not delete existing records.
- `crew.metric_observations[metric]` retains canonical event fields, original quality and provenance. Server-owned `ingestion` records mission receipt, host receipt and principal separately; clients cannot forge it. `integrity` distinguishes verified records from incomplete legacy records. These annotations are returned/stored metadata, not accepted client fields.
- Derived `metric_quality` marks a channel stale after `max(5 seconds, three sampling periods)` in mission time. Cached values and original observation times remain preserved; the aggregate becomes Gray and the existing quality gate excludes it from healthy/review inference. Other good signals cannot clear a suspect/stale channel. A fresh valid observation from the same owner restores that channel's quality.
- History `ts` remains the aggregate snapshot time. Individual observation/gateway times are preserved per metric. Holding a value does not insert fake new scalar samples. Mission activity context and existing detector rules are unchanged.
- Committed import batches queue immutable full mission snapshots with a persistent monotonically increasing sequence. This distinguishes multiple updates at one mission-clock time and prevents later received imports being discarded on timestamp equality. The existing communications scheduler still controls delay, jitter, serialization, loss and blackout; legacy packets retain their timestamp fallback until a sequenced packet has arrived.
- Newly created risk evidence carries the exact contributing event ID, observation/gateway time, source and generator provenance. Mixed-source events say `mixed`/null at the aggregate level instead of assigning a simulator seed to imported evidence. Existing recorded risks are preserved.

Transactions include scalar insertion, ownership, derived crew state, risk/history, queued packets, receive processing, ingestion audit and checkpoint. A failure rolls SQLite plus in-memory state/packet sequence/scheduler time back together. API success/SSE publication occur after commit. The pre-existing retrieval-failure transaction behavior remains deliberately unfixed for N02.

## Personal-data access policy

| Identity | Raw check-in read |
|---|---|
| Anonymous |401 |
| Viewer / Researcher / System Administrator |403; no raw or purportedly anonymized replacement |
| Astronaut | Own crew only; other crew 403 |
| Mission Control / Flight Surgeon | Authorized mission review records |
| Demo Administrator | Only records whose stored actor matches the current demo actor; other actors' records are excluded |

Filtering happens in a parameterized database query before applying the requested limit. User measurements remain `source=user_checkin`, `synthetic=false` and separate from sensor state/baselines/reports. Demo roles remain selectable fictional identities; the actor ID is shared by sessions of the same demo role. This is not real-person identity proof or production privacy. OIDC, full de-identification/consent/retention/encryption and research aggregates belong to N21 and related modules. The safe N01 behavior for researchers is denial of raw measurements.

## Storage compatibility

No database replacement, destructive migration or new database service. Per-metric metadata and packet sequence are additive JSON fields. Existing checkpoints without metadata recover the latest stored observation for each metric. Incomplete legacy observations remain archived and labeled `legacy-unverified`/Gray; missing generator/receipt fields are never invented. A subsequent complete newer observation can restore that channel. Current metadata survives raw-retention pruning via the checkpoint. The existing 24-hour raw/history retention policy is unchanged; long-run retention and backup/restore remain later work.

## Verification results

| Command/check | Result and boundary |
|---|---|
| `npm run check` |30 JS files parsed/import-checked, zero errors. No TypeScript/lint/build claim. |
| `npm test` |45 passed,0 failed/skipped; about 4.21 s. Includes all original tests plus 22 N01 regressions. |
| `npm run evaluate` | Existing frozen 30 synthetic runs unchanged: TP10/FP0/TN20/FN0; main drift 210–230 mission seconds. Nominal forecast 25 overlapping windows MAE 2.167 bpm, coverage 96%. No model changes or medical validation. |
| `npm run benchmark` | In-memory p95 detector 0.025 ms,60-point raw ingest 1.026 ms, complete tick 26.172 ms. Tick was 6.715 ms in A00; retaining/copying full per-metric provenance adds CPU/payload cost. Not HTTP/disk/UI/FPS timing or sustained-load proof. |
| `node docs/audit/probes.mjs` | Repaired F02/F03/F04/F05/F11 checks pass; F01/F06/F07/F10 still reproduce, F08/F09 source assertions remain. Exit0 is not full-system acceptance. |
| Scope hash comparison before refreshing manifest | Forecasting, retrieval, agent logic, detector rules, communications scheduler, forecast calibration and scene renderer unchanged from A00. |
| `npm run manifest` | Refreshed 29 selected runtime/source/model hashes, including the new helper. Excludes runtime databases/secrets; unsigned. |
| Runtime/browser | Agent environment previously denies loopback listener with EPERM and lacks a usable browser. Current startup retry recorded in VERIFICATION. No real socket, browser layout/keyboard/PWA/FPS or production deployment verification claimed. |

## Run and test yourself

Use the normal WSL terminal with installed Node 24.21+ within Node 24:

```bash
cd '/mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI'
npm run check
node --test --test-isolation=none tests/telemetry-integrity.test.mjs
npm test
node docs/audit/probes.mjs
```

Expect 21 N01 telemetry/access tests and 45 total tests to pass. The N01 integration tests exercise actual handler/SSE/SQLite/queue behavior using a socket-free transport and temporary databases; they are reproducible in the restricted environment. The probes explicitly distinguish N01 repairs from still-open findings.

For browser/manual checks without changing existing records, start an independent demo:

```bash
astra_n01_dir=$(mktemp -d /tmp/astra-n01-demo.XXXXXX)
ASTRA_DB="$astra_n01_dir/astra.sqlite" PORT=3100 npm start
```

In another WSL terminal, run `curl --fail --silent --show-error http://127.0.0.1:3100/v1/health`; open `http://localhost:3100` in the Windows browser. Health currently establishes listener response only, not detector readiness (F06).

1. Sign in as Astronaut. Navigate to `/v1/crew/CREW-03/checkins` in the same browser:200 JSON (possibly empty). `/v1/crew/CREW-01/checkins` must return 403. Return to the app and log out.
2. Sign in as Viewer, then Researcher. Each GET of `/v1/crew/CREW-03/checkins` must return 403. The check-in workspace should show a permission notice; telemetry pages should still work. Use the app's existing sidebar/navigation to return from raw JSON.
3. If testing recorded task data, use only test inputs in this independent database. Mission Control/Flight Surgeon can review mission check-ins; Demo Administrator sees its own demo actor's saved entries. No real personal/astronaut record is needed to verify permissions.
4. Sign in as Demo Administrator and run the existing sleep-debt/drift→evidence→ack→blackout/reconnect flow. Default clock 30× and Earth delay 12 mission minutes remain. This checks the unchanged main demonstration; see AUDIT_RUNBOOK for the broader checklist.
5. For imported telemetry specifically, the focused N01 integration tests provide controlled source/time samples and verify exact provenance, retention, same-clock packets, stale quality and delayed delivery. Live producers require a server-side `ASTRA_INGEST_TOKEN` and the complete contract above; do not place that token in frontend code, URLs or source files.

Stop with Ctrl+C. No `npm install`, paid service, external credentials or database deletion is needed. No Git commit was possible in the protected, non-repository `.git` environment.

## Still incomplete and next approval boundary

N01's stated backend/access gates pass. The application still has separately tracked defects: F01 single-signal/rate rules, F06 truthful monitoring health and F10 retrieval-failure isolation (N02); F08/F13 broader UI/renderer correctness (N03/N06); F07 resend/ground review (N18); F09 actual agent execution (N16); F12 long-duration retention and F14 scientific simulator realism. Forecasting/general calibration and advanced capabilities remain untouched under their own roadmap modules. Current forecast bands do not establish accuracy for arbitrary imported generators.

Recommend **N02 — Independent monitoring and Tier A rules** next because failure of retrieval must not erase detector evidence, health must report real readiness, and single-signal/rate rules remain mandatory research requirements. **N02 has not been started. STOP and wait for explicit approval.**
