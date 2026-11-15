# Environment audit — 2026-10-17

## Browser permission update —2026-10-18

Earlier audit rows below are historical where superseded. Supported require_escalated approvals now work. Approved Linux Chrome-for-Testing155.0.8059.84 with locally unpacked /tmp libraries and installed Windows Chrome155.0.8059.80 driven by official-checksum-verified portable Node24.21.0 each passed23 real browser groups. Real loopback npm start/health also passed. No system packages, PATH/OS configuration or personal browser profiles were changed. Windows AMD/D3D11 normal-mode measurements and remaining acceptance gaps are in N03_BROWSER_ACCEPTANCE. This does not establish physical FPS, WCAG certification or deployment readiness.

## Historical initial environment audit

Read-only checks within the provided WSL environment; this is not an unrestricted audit of Windows or private user files.

| Resource | Observed |
|---|---|
| OS | Ubuntu 26.04 LTS, WSL2 x86_64, Linux 6.18.33.2 |
| CPU | AMD Ryzen 5 7430U, 6 cores / 12 visible logical processors |
| RAM | 6.7 GiB visible to WSL; about 5.7 GiB initially available |
| Swap | 2 GiB |
| Project disk | 123 GiB initially free on Windows C: mount |
| Node / npm | 24.21.0 / 11.19.0 |
| SQLite | Native node:sqlite works; SQLite 3.53.4 |
| Python | 3.14.4; venv module present but ensurepip absent |
| Git | 2.53.0; project `.git` read-only/empty and not a repository |
| Packages | No React, Three, TypeScript, FastAPI, NumPy, pytest, uv, pip, pnpm or Docker available in PATH/cache |
| Package network | npm registry DNS failed EAI_AGAIN; no useful package cache |
| Research browsing | Tool-based authoritative web lookup works separately from shell networking |
| PDF tools | No pdftotext/pdftoppm/pypdf; custom content audit handles this supplied PDF |
| Graphics | No `/dev/dxg`/`/dev/dri` exposed in sandbox; GPU/VRAM not measurable |
| Browsers | Windows Chrome/Edge files visible; no Linux Chromium. Cached Electron cannot start: missing libnspr4.so. Browser QA unverified until a supported runtime exists. Its cached ANGLE/SwiftShader libraries support offscreen GLSL compilation/render checks without a browser. |
| Local sockets | Socket bind rejected EPERM; real server startup and browser preview unavailable inside the agent sandbox |

No system packages installed, no host settings changed, no credential directories inspected. Core runtime needs only the already working Node executable. Optional future prerequisites: working browser for visual QA, TypeScript/lint tooling, Python venv for the original scientific stack, Docker for container verification. Do not install a local LLM on the current RAM allocation without benchmarking.
