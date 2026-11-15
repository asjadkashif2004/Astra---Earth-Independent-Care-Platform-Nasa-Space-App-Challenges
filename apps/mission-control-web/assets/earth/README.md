# Earth visual assets

NASA Earth Observatory / NASA Goddard Space Flight Center. Blue Marble Next Generation August2004 surface: Reto Stöckli. Blue Marble2002 cloud composite: Reto Stöckli; compositing enhancements credited to Robert Simmon. These are historical composites, not live imagery or current weather.

Sources: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/ and https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/ . Reuse follows https://www.nasa.gov/nasa-brand-center/images-and-media/ for educational/informational imagery; NASA credit retained, no endorsement implied. The selected source records identify NASA imagery without a separate third-party copyright restriction. No NASA logo or astronaut likeness is included.

manifest.json records exact source URLs, source/output SHA-256, dimensions, bytes, build transformation and acquisition date. scripts/prepare-earth-assets.mjs resizes locally with an existing Chromium Canvas2D decoder; it makes no network requests or geography alterations. Originals are acquisition inputs outside the served application. All four texture variants together must stay within4,000,000bytes. Compressed JPEG size is not decoded GPU memory;2048×1024 RGBA is8MiB before mipmaps,1024×512 RGBA is2MiB before mipmaps.
