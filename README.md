# ASTRA Command

**Current presentation:** use [verified startup and demo instructions](docs/ASTRA_FINAL_DEMO_READINESS.md) and the [short checklist](docs/demo/PRESENTATION_CHECKLIST.md). N01/N02/N04 are formally Complete. N03 remains Partial / AC-20 Open. N05/N06 synthetic engineering is complete, with anatomical fidelity and release review still pending. Scientific and native-execution gates remain open; see the [tracker](docs/MODULE_TRACKER.md).

Earth-independent crew health intelligence: a local research simulation that connects telemetry, personalized detection, a visual health twin, cited research, human review and delayed Earth communications.

**Research and simulation prototype. Not a medical device. Not NASA-certified or flight-qualified. Synthetic telemetry is clearly identified. Review support does not replace qualified medical judgment.**

The [feature audit](docs/FEATURE_AUDIT.md) tracks the full advanced system. N01/N02 safeguards remain verified. N04 adds fresh Windows/Linux functional, native200% and bounded accessibility evidence;exact test totals,source freshness,performance limitations and status are in its report. N03's earlier evidence is preserved [separately](docs/N03_BROWSER_ACCEPTANCE.md). Development remains one module at a time. [Tracker](docs/MODULE_TRACKER.md) · [Handoff](docs/SESSION_HANDOFF.md).

## Run locally

Node.js 24.21+ (Node 24 line) is the only runtime prerequisite. No package download or API key is required.

One Node process serves both the API and frontend. Use a **new disposable database** for presentation; omitting `ASTRA_DB` opens the owner's saved runtime database.

```bash
demo_dir=$(mktemp -d /tmp/astra-presentation-XXXXXXXX)
export ASTRA_DB="$demo_dir/astra.sqlite"
export HOST=127.0.0.1 PORT=3000 ASTRA_SPEED=1
node services/api/server.mjs
```

Open **http://127.0.0.1:3000**, select **Demo administrator** and enter the simulation. Stop with **Ctrl+C**. Restart the Node command in the same terminal with the same `ASTRA_DB` to recover. The [presentation guide](docs/ASTRA_FINAL_DEMO_READINESS.md) includes Windows PowerShell commands, the five-minute script, troubleshooting and backups.

Do not run the blanket `npm test` command for presentation preparation: its wildcard includes native campaigns requiring separate permission. Use `node scripts/check.mjs` and the focused regression commands in the guide. No model, browser or dataset download is needed.

## Implemented local edition

- Six fictional crew, ten seeded scalar metrics, personal synthetic calibration samples, persistent telemetry/history and qualified versioned N09 scenarios with dated source-time histories. Authentic scientific validation remains incomplete.
- Imported synthetic channels retain canonical observations/source ownership through ticks, scenarios and restart; strict metadata/order checks, stale Gray status and transactional history/SSE/delayed Earth delivery. The N01 report documents the producer contract.
- Quality-gated median/MAD detection with observed-time single/multisignal and rate persistence, exercise context, canonical evidence and explicit heuristic uncertainty. Durable optional worker enrichment preserves alerts through retrieval failures/restart; health reports monitoring readiness and degradation.
- Cinematic native mission interface, locally NASA-textured WebGL2 Earth/clouds/day-night/orbit/schematic spacecraft and the licensed N05/N06 Three.js anatomy viewer. Source-time synthetic HR/RR motion, exact crew binding, text fallback, independent reduced-motion and quality controls; no disease localization.
- Ten research-source summaries, citation hashes, local lexical retrieval/abstention and template case reports with human acknowledgement. Displayed agent steps are not an executed tool graph. Local Qwen assets and historical demonstrations exist, but fresh inference and unreviewed factual-support activation are not authorized for this presentation.
- Durable priority queue with latency, jitter, bandwidth, loss/retry and blackout; independent delivered-Earth snapshots and observation/transmission/receipt times.
- Seven local demo roles, HttpOnly sessions, server permissions, astronaut self scoping, append-only hash-chained audit and restricted report export.
- Exploratory trend forecasts with narrowly scoped synthetic calibration and abstention during deviations; environment context, voluntary reaction/fatigue check-ins, history replay, source/dataset catalogue and model cards.
- Service worker shell-cache code; last synthetic snapshot is designed to become Gray/read-only if the API disappears. The server requires no external Internet. N02 verifies retrieval/case failure isolation; physical network-off/browser testing remains pending.

## Research and architecture

The supplied full research is preserved at [research/ASTRA_Deep_Research.md](research/ASTRA_Deep_Research.md) and [research/ASTRA_Deep_Research.pdf](research/ASTRA_Deep_Research.pdf). Root originals are untouched. The PDF content audit covers 38 pages; selected vector diagrams/tables were reconstructed with installed system libraries for inspection.

[Master plan](docs/MASTER_PLAN.md) · [Architecture](docs/ARCHITECTURE.md) · [68-group requirement map](docs/REQUIREMENTS.md) · [Current module tracker](docs/MODULE_TRACKER.md) · [Decisions](docs/DECISIONS.md) · [Environment audit](docs/ENVIRONMENT.md)

The offline-capable edition uses native Node HTTP/SQLite, browser ES modules and WebGL2 following the original package-registry failure; the core remains dependency-free. The research's larger recommended React/FastAPI/Postgres and vector/LLM stack remains explicitly tracked; this is not an undisclosed substitute for those services.

## Verification and deployment

```bash
npm run check       # JavaScript syntax/import/document checks; not a TS compiler
npm test            # domain, API-handler, safety, offline queue and restart tests
npm run benchmark   # synthetic CPU and in-memory storage measurements
npm run evaluate    # held-out synthetic scenarios and forecast coverage
npm run manifest    # SHA-256 source artifact manifest
```

[Setup](docs/SETUP.md) · [Testing](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md) · [Verification evidence](docs/VERIFICATION.md) · [Known limitations and remaining work](docs/LIMITATIONS.md)

Runtime records live in ignored `data/runtime/astra.sqlite`. Default access is loopback only. Local role selection is a fictional-demo convenience, not production identity verification. Keep the server private until production authentication/TLS are implemented. No real health records should be added.

Voluntary task check-ins are actual user measurements, stored separately from synthetic telemetry. N01 denies raw reads to Viewer/Researcher/System Administrator, limits Astronaut to own crew and Demo Administrator to the same demo actor's entries, and preserves authorized mission review. Local role selection remains fictional identity; production authentication/privacy is future work.

## Scientific sources and licenses

The source manifest is [knowledge/sources.json](knowledge/sources.json); the public dataset catalogue is [data/public-metadata/catalogue.json](data/public-metadata/catalogue.json). Sources include [NASA HRP](https://www.nasa.gov/hrp/hazards/), [ExMC](https://ntrs.nasa.gov/citations/20220017869), [EIMO](https://ntrs.nasa.gov/citations/20240000914), [xEHR](https://ntrs.nasa.gov/citations/20230003216), [OSDR](https://science.nasa.gov/biological-physical/data/osdr/) and [PhysioNet BIDMC](https://physionet.org/content/bidmc/1.0.0/).

No public physiological dataset files have been downloaded or used to calibrate these fictional crew. BIDMC's ODC Attribution license requires preservation of its dataset attribution when acquired. OSDR study metadata/licensing must be checked individually. Sleep-EDF,PTT-PPG and RadLab acquisition is pending. NASA references imply no endorsement. N04 uses historical NASA Earth Observatory/Goddard day and cloud images;[sources,credits,usage terms and transformations](apps/mission-control-web/assets/earth/README.md) and [hash manifest](apps/mission-control-web/assets/earth/manifest.json) are local. Spacecraft/interface geometry includes authored schematics. N05/N06 anatomy uses immutable BodyParts3D 4.3 reference assets; licenses, hashes and fidelity limitations are in the local anatomy attribution manifest. No project-wide open-source license has been chosen on the user's behalf.

## Governed research backups

Use the existing `node scripts/n14-offline.mjs verify` and `node scripts/n14-offline.mjs query --policy=rich_lexical --top_k=3 --query="light circadian sleep"` for verified offline evidence. Exact citation/quotation attribution is not independent factual relevance or medical approval. The app Research Library is an older, separate summary collection.

Open [verified research backup](artifacts/presentation-readiness-20261109/research-backup.html) for an exact source quotation and an explicitly archived N12 forecast. Fresh N12 Compute repeats calibration/evaluation and stays inactive in this mission. Open the [recorded N16 demo](artifacts/n16-final-20261030/native/demo.html) separately; it performs no live worker calls. Qwen, unreviewed N15 rules and operational N16 integration stay inactive.
