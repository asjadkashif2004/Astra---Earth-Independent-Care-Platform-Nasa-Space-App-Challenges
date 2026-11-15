# NASA Space Apps 2026 — Project Page text (ready to paste)

**Project name:** ASTRA — Earth-Independent Crew Health
**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions
**Team:** [your team name]

---

## 1. High-Level Summary

ASTRA is an offline health-monitoring system for long-duration missions such as a trip to Mars, where help from Earth can take 12 minutes or more each way and sometimes cannot arrive at all. It gathers health indicators for each astronaut — heart rate, heart-rate variability, oxygen saturation, breathing, temperature, sleep, fatigue, reaction time, exercise and cabin radiation/CO₂ — and compares every reading with that person's own normal, not a population average.

Each astronaut gets a "My health" view that answers three questions in plain words: Am I OK? What changed? What can I do now? Because sensors cannot feel a headache or low mood, astronauts can also file a private symptom report linked to NASA's human-spaceflight risks. When a change persists, ASTRA records an evidence-based review event, a person acknowledges it, and only then is a report queued for Earth with a realistic communication delay. Missing or unreliable data is shown as "Unknown", never as healthy.

ASTRA turns NASA's five spaceflight hazards and 17 health risks into a working tool that helps a crew notice, understand and act on changes in their own health when Earth is far away.

---

## 2. Project Demo

[Upload the 7-slide deck or link the 30-second video here.]

**7-slide outline**
1. The problem — Mars crews are minutes to hours from help; astronauts must spot changes in themselves.
2. ASTRA in one line — offline, personal-baseline health monitoring with a self-view for every astronaut.
3. Mission overview — six crew members, live indicators and NASA's five hazards with honest coverage.
4. My health — "Am I OK?", what changed versus your own normal, and safe next steps.
5. Symptom self-report — 13 symptoms linked to NASA HRP risks; private and onboard.
6. Act and communicate — evidence → human acknowledgement → delayed, durable report to Earth; works through blackouts.
7. Trust and next steps — synthetic data, tests, offline research library; future: real wearables, radiation dose, bone and eye tracking.

**30-second video script**
- 0–5 s: "On Mars, help from Earth is at least 12 minutes away. ASTRA keeps crew health onboard."
- 5–12 s: Mission overview with crew cards and the five NASA hazards.
- 12–20 s: Scenario lab triggers a synthetic heart/breathing change → My health shows "Needs a check" and what changed.
- 20–26 s: The astronaut reports a headache, then acknowledges the event; the report queues for Earth with the delay.
- 26–30 s: "Personal baselines, honest unknowns, humans in charge — Earth-independent care."

---

## 3. Final Project Link

https://github.com/basim-x/NASAstra
(Public repository with source code, run instructions, documentation, tests and a Roman Urdu demo guide.)

---

## 4. Project Details

**What it does**
- **Mission overview:** six fictional crew members with live synthetic indicators, a 3D Earth and spacecraft link, monitoring status, and a panel showing NASA's five spaceflight hazards (radiation, isolation and confinement, distance from Earth, gravity fields, closed environment). Each hazard lists what ASTRA tracks and, honestly, what it does not.
- **My health (astronaut self-view):** a plain-language "Am I OK?" verdict (Within your usual range / Needs a check / Can't tell right now), a list of what changed versus the person's own baseline, and general next steps (review the evidence, tell the crew medical officer, do a check-in, acknowledge and send a report, read the research). It never diagnoses or prescribes.
- **Symptom self-report:** 13 symptoms (for example headache, vision changes, nausea, back pain, low mood, tension with crewmates), each with mild/moderate/severe and an optional note, each linked to a NASA Human Research Program risk. Reports stay private and onboard and never change alerts or sensor data; a severe symptom puts "Tell your crew medical officer now" first.
- **Detection:** quality-gated personal baselines (median and MAD from 720 calibration samples per metric), persistence over observation time, multi-signal and rate-of-change rules, with exercise context. Only this deterministic detector can create a review event.
- **Act and communicate:** every event becomes a cited case report; a person must acknowledge it before it is queued. A store-and-forward link simulates one-way delay (12 minutes by default), jitter, bandwidth, packet loss and blackout; reports survive restarts, and the Earth view shows only what has actually arrived, with observation, transmission and receipt times.
- **Crew health:** personal trend charts, detector evidence, a licensed 3D reference anatomy (BodyParts3D) and a data-linked schematic twin whose heart and lung motion follow the measured heart and breathing rates.
- **Sleep and resilience, signal archive, cognitive check-in:** sleep records, synthetic waveform replay, and a reaction-time plus fatigue check-in stored separately from sensor data.
- **Onboard research library:** 29 curated, cited summaries of NASA HRP risks, hazards and research, CSA, NTRS, PhysioNet and NIST sources, searched offline; it refuses unsafe questions and says when the sources do not cover a question.
- **Scenario lab:** reproducible synthetic stories (sleep debt, multi-signal deviation, post-exercise recovery, radiation spike, sensor dropout, contradictory sensors, Earth-link blackout) for demonstrations and testing.
- **Trust and security:** seven demo roles with server-side permissions, astronauts limited to their own records, a hash-chained audit log, and a provenance page listing every source.

**How it works and tools used**
- Node.js 24 single-process server with built-in HTTP and SQLite; no cloud services, external API keys or internet connection needed at runtime.
- Browser front end in plain JavaScript modules, custom WebGL2 shaders for the Earth and schematic twin, and Three.js for the reference anatomy.
- NASA Earth Observatory imagery and BodyParts3D anatomy are stored locally with credits and licences.
- More than 580 automated tests (Node test runner) cover detection, privacy, communication delay, recovery, user interface and research search, plus real-browser checks in Chrome.

**Our goals**
Help astronauts notice and act on changes in their own health without waiting for Earth; keep humans in charge of decisions; and be honest about uncertainty, so missing data is never shown as "fine".

**Limitations**
All crew and telemetry are synthetic and fictional; ASTRA is a research prototype, not a medical device and not NASA-certified. Review levels are illustrative, not NASA exposure limits. Not yet tracked: total radiation dose, neutron dose, bone density, muscle strength, balance, eye changes and immune markers — the next step is connecting real wearables and these measurements.

---

## 5. Use of AI and NASA Data

**NASA data and resources used**
- **NASA Human Research Program — Hazards, Risks and Ongoing Research pages:** the basis of the five-hazard panel, the symptom-to-risk mapping and 19 research-library entries (for example SANS, bone loss, immune changes, sensorimotor changes, sleep and teamwork).
- **NASA HRP evidence report** "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload" (NTRS 20160003864) and **NASA-STD-3001 Volume 2** (Human Factors, Habitability and Environmental Health): stored offline as a cited research corpus with page-level citations.
- **NASA Earth Observatory Blue Marble imagery** (Blue Marble Next Generation and the Blue Marble cloud composite): the textures for the 3D Earth.
- **NTRS public records:** Exploration Medical Capability CDSS architecture, Earth Independent Medical Operations (EIMO) and the Exploration Electronic Health Record (xEHR), which shaped ASTRA's architecture.
- **NASA Open Science Data Repository (OSDR)** and **NASA-STD-3001 Volume 1** as research context.
- Partner data: **Canadian Space Agency** pages on neutron-radiation monitoring (CANS) and the Earth benefits of space research.

The crew telemetry itself is synthetic, because real astronaut health data is not public; every synthetic reading is labelled with its seed, scenario and generator version.

**Use of AI**
- An AI coding assistant (Claude by Anthropic) was used to help write code, tests and documentation; the team directed and reviewed the work.
- Inside the application, no generative AI makes health decisions. Alerts come only from deterministic, testable statistics; case reports are templates; the research library uses keyword search with citations and no language model. A small local language model was explored in separate research experiments but is switched off in the demo.

---

## 6. References

**NASA**
- NASA Human Research Program — Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program — Human Health Risks: https://www.nasa.gov/hrp/risks/ (and the linked individual risk pages)
- NASA Human Research Program — Ongoing Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- HRP evidence report on sleep loss, circadian desynchronization and work overload (NTRS 20160003864): https://ntrs.nasa.gov/citations/20160003864
- NASA-STD-3001 Volume 1: https://www.nasa.gov/reference/nasa-std-3001v1/ and Volume 2: https://www.nasa.gov/reference/nasa-std-3001v2/
- Exploration Medical Capability CDSS Architecture: https://ntrs.nasa.gov/citations/20220017869
- Earth Independent Medical Operations Datascope: https://ntrs.nasa.gov/citations/20240000914
- Exploration Electronic Health Record (xEHR): https://ntrs.nasa.gov/citations/20230003216
- NASA Open Science Data Repository: https://science.nasa.gov/biological-physical/data/osdr/
- NASA Earth Observatory Blue Marble: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/ and https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/

**Partners and other sources**
- Canadian Space Agency — Monitoring radiation for astronaut health (CANS): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency — Why science experiments are done in space: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- PhysioNet BIDMC PPG and Respiration Dataset: https://physionet.org/content/bidmc/1.0.0/
- NIST AI Risk Management Framework 1.0: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10

**Tools and open-source materials**
- Node.js 24 (built-in HTTP server and SQLite) — https://nodejs.org/
- Three.js 0.186.1 (MIT licence) — https://threejs.org/
- BodyParts3D 4.3, © The Database Center for Life Science, CC BY-SA 2.1 Japan — https://lifesciencedb.jp/bp3d/
- WebGL2 (browser graphics standard)
- Claude by Anthropic (AI coding assistant used during development)
