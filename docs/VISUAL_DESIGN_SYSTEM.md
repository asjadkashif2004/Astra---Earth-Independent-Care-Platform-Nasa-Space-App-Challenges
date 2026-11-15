# ASTRA visual design system

Status: permanent user design directive, recorded 2026-10-17. Applies to all upcoming frontend and 3D modules. This document records design requirements; it does not claim they are already implemented or visually verified.

N04 implementation note2026-10-18: `mission.css` is the current native token/material/type/layout layer,loaded after `styles.css`;`earth.mjs` provides natural local-texture planetary presentation. Keep clinical Gray/Red/Amber/healthy semantics projection-owned. The quality profile and reduced-motion preference are independent. Actual screenshot review and bounded accessibility evidence are recorded in [N04_ACCEPTANCE.md](N04_ACCEPTANCE.md);this note does not certify premium artistic quality or AC-20. N03 remains Partial;N05+ require separate approval.

## Product identity

ASTRA must feel like a premium cinematic deep-space mission-control application. Every screen belongs to the same coherent mission environment, from crew monitoring and evidence review to communications and anatomical inspection.

Avoid generic AI SaaS dashboards, generic dashboard templates and default component-library aesthetics. Components may be reused for engineering efficiency, but their presentation must follow ASTRA's identity and serve the actual workflow.

## Reference palette

| Token | Color | Intended role |
|---|---|---|
| Void Black | `#050508` | Primary void/background and deepest scene layer |
| Obsidian | `#111116` | Primary interface surfaces and quiet overlays |
| Graphite | `#24242C` | Layered charcoal surfaces, structural separation and refined borders |
| Solar Amber | `#F3A64A` | Restrained accents; caution when explicitly used as a status |
| Nebula Violet | `#9875E8` | Restrained exploratory, spatial and decorative accents |
| Aurora Teal | `#54C9B7` | Restrained accents; healthy states when explicitly labeled |

Near-black, void black, obsidian and graphite dominate the screen. Use solar amber, nebula violet and aurora teal selectively, with occasional warm white highlights. These reference colors do not automatically satisfy every foreground/background contrast requirement; verify each actual pairing during the approved implementation.

Avoid generic blue dashboard treatments, bright blue gradients, excessive cyan glow and repetitive neon cards. Accent color should guide attention rather than fill every panel or compete with evidence and alerts.

## Surfaces, lighting and depth

- Build depth with layered charcoal surfaces, smoky glassmorphism, subtle translucency and refined borders.
- Use cinematic lighting and purposeful foreground/background separation. Preserve text and chart legibility over scenes and glass.
- Use premium spacing, aligned content and a clear visual hierarchy. Dense monitoring information must remain readable and easy to scan.
- Keep shared surface, border, spacing, typography and interaction rules consistent across every screen. Avoid repeating luminous cards as the primary source of visual interest.

## Functional status and scientific integrity

| Meaning | Visual direction |
|---|---|
| Critical warning / high-priority review | Red, with explicit priority text and an identifiable icon |
| Caution / review required | Amber, with readable caution/review labeling |
| Healthy measurement state | Green/teal, only when supported by the actual data/status contract |
| Missing, stale or unreliable measurements | Neutral gray, explicitly identified as unavailable/unreliable |

Decorative color is not a status signal. A violet scene, amber selection or teal accent must not imply a change in astronaut risk. Use labels, icons and consistent placement so semantic status remains recognizable without relying on color alone.

Keep **monitoring service availability**, **measurement quality** and **risk severity** distinguishable. For example, a running service is not proof that all crew readings are healthy; unavailable knowledge does not mean critical monitoring has failed. Approved interface work must reflect the real API contracts, including N02's ready/degraded/unavailable states and asynchronous case availability.

Never invent health readings, display synthetic data as a live NASA feed, or imply that a cinematic twin is a validated physiological model. Clearly label synthetic telemetry. Red means high-priority human review in the simulated system, not an invented diagnosis. Anatomical highlights must remain traceable to measured evidence.

## Typography and layout

Use elegant, futuristic but readable typography, clear hierarchy and premium spacing. Distinguish primary readings, units, timestamps, explanatory text and actions without sacrificing readability for a science-fiction effect.

Prioritize functionality, legibility, accessibility and responsive layouts. Preserve usable navigation, keyboard focus and status visibility across desktop and smaller screens. Reflow panels and controls deliberately; typography and essential evidence must remain readable at narrower widths.

## 3D direction

- Create an immersive rotating Earth with atmospheric glow and realistic lighting.
- Provide interactive astronaut digital twins with holographic anatomical styling and evidence-linked inspection.
- Use purposeful camera composition and premium camera movement to connect mission context, crew selection and detailed inspection.
- Keep the twin a data-linked visualization. Anatomy and animation must not invent disease, unavailable measurements or scientific capabilities.

## Animation and interaction

Use smooth scroll-driven transitions, parallax, subtle particles, depth effects and responsive micro-interactions where they help orientation or communicate an action. Motion must feel controlled and purposeful, with no excessive or distracting animation.

Maintain access to monitoring controls and evidence during transitions. Decorative motion must not obscure warnings or make status appear fresher than its actual observation time.

Reduced-motion support is mandatory. Provide restrained or static alternatives for rotation, parallax, particles, camera travel and scroll-driven effects while preserving information and interaction.

## Performance and fallbacks

Use GPU-efficient rendering, adaptive quality and graceful fallbacks suitable for consumer laptops. Scale visual effects to available resources without sacrificing monitoring functionality, essential evidence or accessibility.

When 3D is unavailable, slow or interrupted, preserve a readable usable interface and meaningful non-3D representation. Quality reduction must not remove the distinction between unavailable measurements, healthy data and critical review.

Verify visual quality and performance in a real browser during the appropriately approved module. Source code, screenshots from substitutes or stub-DOM checks do not establish browser correctness, accessibility, smooth animation or FPS.

## Approval and implementation boundaries

This directive is permanent and supplements the research specification, architecture and product invariants in [AGENTS.md](../AGENTS.md). It does not change the module approval workflow or authorize a broad redesign.

The original directive authorized **only AGENTS.md and this design document**. The user has subsequently explicitly approved **N03 Frontend Correctness**. Apply this design system to N03-touched components within its existing correctness/browser-acceptance scope. This is not approval for a complete cinematic redesign: cinematic scenes, advanced anatomical assets, data-linked twin expansion and other later work remain in separately approved modules. N04 and later modules are unapproved.

Before future approved frontend or 3D work, read this document, apply these constraints to the module's bounded scope, and report actual verification and remaining limitations. Do not treat a visual requirement as permission to begin another module.

## Permanent refinement — 2026-10-18

Scientific sophistication, exploration, medical intelligence, calm precision and immersion must form one coherent identity. Do not use a cluttered game HUD or identical neon cards. Do not equate replacing blue tokens with purple tokens with a redesign. Keep the overall screen predominantly black/charcoal; colors/materials/typography/composition must work together.

Future approved Earth work needs natural planetary colors, credible day/night lighting, licensed local surface/cloud textures, restrained atmospheric rim and stars, thoughtful camera/orbit composition and useful navigation. A historical texture/composite is not live Earth data. Asset attribution/license/hash review precedes integration. Future anatomical inspection requires supporting data/geometry and remains a visualization without clinical validation or organ-level diagnosis.

Use smoky translucent charcoal, bounded backdrop blur where supported, opaque fallbacks, low-contrast borders, directional highlights, controlled shadows and purposeful elevation. Keep text and critical plots on reliably readable surfaces. Typography separates expressive headlines, interface actions, numeric telemetry and supporting metadata; avoid tiny text and excessive uppercase. Refined materials may never hide Gray data-quality states or alter clinical severity to fit decoration.

User-observed Landing/Overview findings and detailed code-specific future layouts/component/asset/motion/performance phases are in [VISUAL_REDESIGN_PROPOSAL.md](VISUAL_REDESIGN_PROPOSAL.md). They are proposed N04/N05/N06 work. The2026-10-18 authorization is ONLY N03 acceptance, necessary correctness and this proposal. No major redesign, advanced new scene or later module implementation is approved. Verify actual four-viewport, keyboard/focus, contrast, reduced-motion and graphics fallback behavior; record unmeasured performance honestly.
