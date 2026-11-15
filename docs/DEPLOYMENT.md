# Deployment profiles

## Native laptop — verified domains, live socket pending
Use `npm start` in a normal terminal with Node 24.21+. The default address is `127.0.0.1:3000`, database `data/runtime/astra.sqlite`, speed 30×. This single runtime is the local, offline and dev-lite profile; it requires no external services. Set `ASTRA_SPEED=1` to observe real-time persistence windows instead of accelerated demonstration. No install or build step is needed for the native ES-module app.

The Codex sandbox rejected a local listen with EPERM. Network-bound startup cannot be verified here. The same request handler was tested directly, including static files, authentication, streaming and the integrated mission flow. Do not report this as a running server or deployed service until a normal-terminal readiness check succeeds.

## Optional Linux Docker host
`Dockerfile` and `compose.yaml` are supplied. Docker is absent here, so image creation and Compose are **unverified**.

```bash
docker compose up --build
```

The Compose profile deliberately uses Linux host networking so the application can preserve its loopback-only identity-selection boundary. Use Linux Docker Engine / WSL integration with host networking; Docker Desktop host-network support must be enabled and confirmed. No public port is intentionally exposed. The named `astra-runtime` volume retains records. Do not remove the volume to reset scenarios.

Cache the built image before demonstrating without Internet. Native Node startup remains the low-resource fallback. The image base is a major-version tag for maintenance convenience; pin its verified digest before a reproducible release.

## Judge performance
Use the sidebar **Performance mode** control: lower pixel ratio, 30 FPS render target and reduced motion. The actual FPS label reports runtime frames; the research's ≥30 FPS requirement remains unverified. The schematics are generated in code; there is no large 3D asset download. The detector does not run on the judge's browser.

## Cloud / research profiles — not deployed
Remote/cloud hosting requires real OIDC authentication, TLS/reverse proxy, secret management, encrypted backups, operational retention and a reviewed database migration plan. The supplied demo server refuses a non-loopback HOST. `ASTRA_DEMO=false` disables the local role selector but is **not sufficient to establish production login**. Do not circumvent that boundary by publishing the role-selecting demo. No cloud credentials, paid services or external deployment were used.

The original research profile additionally needs a working Python scientific environment, validated public datasets and optional Postgres/vector/model services. See LIMITATIONS and REQUIREMENTS rather than assuming those services are installed.

## Records, backup and recovery
Gracefully stop the server before making a filesystem backup of the SQLite database and associated WAL/SHM files, or use SQLite's consistent backup API. Runtime records are not encrypted at rest by this prototype; use encrypted host storage before any future sensitive-data deployment. Never copy the database into static assets or a source archive.

Restart resumes the persisted simulation clock, pending persistence counters, cases and communication queue. Host downtime pauses the simulation; it does not pretend to have collected missing real-world measurements. Sessions expire after two wall-clock hours. Source hashes identify the bundled summary version, not a downloaded full paper.
