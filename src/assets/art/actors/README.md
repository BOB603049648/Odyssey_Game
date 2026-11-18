# Runtime painted characters

Seven WebP assets from model-authored PNG sources in `docs/assets/actors-v15/`. Full provenance and the reproduction command are documented there. `registration.json` is measured against exact source alpha. Native sheet dimensions are retained, including non-divisible grid widths; each cell has integer bounds and half-texel-safe sampling.

The playable traveler exclusively uses these idle, walk, action and settle sheets. The playable companion uses cat, cat-performance and cat-leap. Historical images remain for provenance and legacy fixtures. Existing villagers supply the visual reference and use the same scene lighting and stature system. See `src/content/paintedActors.ts` and `src/content/sceneScale.ts`.
