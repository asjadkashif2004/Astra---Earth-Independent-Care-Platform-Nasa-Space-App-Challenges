# Interpretation of original browser measurements

The original report is preserved without changing observed measurements. Its graphics caveat used a Linux-era generic template saying "Headless software graphics". For this Windows run, the actual recorded renderer is AMD Radeon Graphics through Direct3D11, not SwiftShader. Read the `renderer` field for attribution. The driver wording is corrected for future runs.

59.8802 draw submissions/s and 16.8 ms rAF p95 are actual headless browser measurements over 30.0099 seconds. They are not physical display FPS, a formal judge-machine certification, or a clinical claim. This distinction and the remaining acceptance gaps are documented in docs/N03_BROWSER_ACCEPTANCE.md.
