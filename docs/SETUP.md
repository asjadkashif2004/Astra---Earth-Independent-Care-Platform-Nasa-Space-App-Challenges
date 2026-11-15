# Setup and startup

For the current presentation use [the isolated Windows/WSL launch guide](ASTRA_FINAL_DEMO_READINESS.md). It keeps the owner's saved runtime database untouched and avoids the blanket native-test wildcard. Source-acquisition commands below are historical documentation, not new download authorization.

N07-02 adds a second explicit scientific source without changing normal startup or dependencies. Offline checks:`node scripts/scientific-acquire.mjs verify --source=nasa-osdr-osd-1` and `node scripts/osdr-study.mjs verify`. The default source remains N07-01 NTRS. `osdr-study.mjs prepare` derives the card and unexecuted split policy from a verified local original;it refuses to overwrite differing files and performs no network/model/split operation. [OSD-1 source/card notes](../data/scientific/osdr/README.md),[completion](N07_02_COMPLETION.md). No raw/clinical/AI integration;N07 In Progress and subsequent work needs separate approval.

N07-01 adds an isolated scientific-source CLI;normal `npm start`,database and app remain unchanged. No new dependency or API key. The bundled single NASA NTRS metadata snapshot can be checked offline with `node scripts/scientific-acquire.mjs verify`. An explicit acquisition/resume to a separate directory uses `node scripts/scientific-acquire.mjs acquire --cache=/tmp/astra-n07-cache`;it is bounded to the one reviewed/pinned resource and needs supported network/filesystem permission where restricted. Do not update the pin when the live API changes without another source review/approval. [Source/attribution](../data/scientific/README.md),[N07-01 completion](N07_01_COMPLETION.md). N07 In Progress;no N13/AI activation or further acquisition is authorized after delivery.

Last Sleep note2026-10-23:normal startup still uses the same Node/SQLite setup. The approved repair adds the append-only schema3 sleep ledger automatically without rewriting old snapshots. Current synthetic Last Sleep remains stable until a daily07:00UTC mission completion or a traceable source correction;scalar-only imports/history say Sleep observation/session unverified. Sleep forecast is explicitly unavailable. See [contract](SLEEP_SESSION_CONTRACT.md) and [completion/self-test](SLEEP_LIFECYCLE_COMPLETION.md). Do not reset/delete the database to obtain a new sleep value. No additional package,credential or graphical change is required.

N05-01 note2026-10-23: N04 is Complete. Crew Health now offers generic reference anatomy and the retained data-linked schematic. All runtime rendering modules/GLBs are served locally; normal `npm start` still needs no package install or Internet. Only the approved slice is delivered; N05 remains In Progress; N03 Partial/AC-20 Open. See [N05_01_COMPLETION](N05_01_COMPLETION.md) for usage/evidence and remaining gates. Earlier unapproved-N05 wording below is historical.

To rebuild the pinned rendering modules only: `npm ci --ignore-scripts --no-audit --no-fund` (network required if not cached), then `node scripts/build-anatomy-runtime.mjs`. Three.js is exactly0.186.1. Existing source geometry is preserved under packages/three-assets/bodyparts3d-4.3; `python3 scripts/build-anatomy.py` rebuilds plain GLBs offline using the Python standard library. Source reacquisition requires reviewing the pinned release/notice and network permission; never replace geometry from an unverified mirror. Keep source/derived attribution and hashes together.

N04 Cinematic Mission Control is Complete. Native shell,Landing,local textured Earth and six-crew Overview remain preserved;[N04_COMPLETION](N04_COMPLETION.md) and [N04_ACCEPTANCE](N04_ACCEPTANCE.md) record its closure evidence. Only N05-01 received separate anatomy implementation approval;remaining N05/N06+ work is unapproved. N03 remains Partial;AC-20 Open / Unverified. N01/N02 safeguards and normal runtime records are preserved;automation uses separate disposable DBs/profiles.

Requires Node.js 24.21 or later in the Node 24 line (native `node:sqlite`). No npm install, database server, API key, Python package, or Internet is required.

```bash
cd /mnt/c/Users/basim/OneDrive/Desktop/ASTRA-Space-Medical-AI
npm run check
npm test
npm start
```

Open `http://localhost:3000`. Select **Enter simulation** for the local demo administrator; alternate demo roles are available in the sign-in screen. These are fictional local identities, not production login accounts. Stop with Ctrl+C. The simulation automatically checkpoints in `data/runtime/astra.sqlite`; restart resumes its clock/queue.

Environment settings: `PORT` (default 3000), `ASTRA_DB` (default project runtime database), `ASTRA_SPEED` (default 30 simulation seconds per real second), `ASTRA_DEMO` (default true), `HOST` (must remain loopback for demo). Real host time and accelerated mission time are distinct. Do not expose the local role-selecting demo to a network.

For an independent temporary instance, run `astra_n03_dir=$(mktemp -d /tmp/astra-n03-demo.XXXXXX)` then `ASTRA_DB="$astra_n03_dir/astra.sqlite" PORT=3100 npm start`. Open http://localhost:3100. Never commit runtime databases. Do not delete a database to reset a scenario: use Scenario Lab's nominal scenario or stop its active scenario; previous cases/audit and imported ownership remain available.

Optional Linux automation uses an existing Chrome/Chromium: `ASTRA_BROWSER_BIN=/usr/bin/chromium npm run test:browser`. It creates its own temporary server/profile; no installation or normal-database access is needed. See N03_COMPLETION for its exit codes, evidence and manual acceptance checklist.

Container commands and network deployment requirements are in `DEPLOYMENT.md`. Package-based framework migration is an optional follow-up and is not required to use the working local edition.

Approved portable Windows automation is also available through scripts/windows-browser-acceptance.mjs and the ignored artifacts/n03-windows-tools/node.exe. It starts its own server, disk DB and personal-profile-free Chrome instance, then removes its temporary DB/profile. Exact command, dependency hashes and execution evidence: N03_BROWSER_ACCEPTANCE. No npm/system installation is required for core startup.
