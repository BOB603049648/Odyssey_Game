# Traveler v0.1 action atlas

`action-atlas.png` was generated with the image-generation tool on 2026-11-14, using the project's existing `stride-atlas.png` as a character/style reference. It is original generated artwork, not a downloaded third-party character pack. The delivered transparent 1448 × 1086 source is retained without repainting or resampling.

Four columns × three rows: reaching/offering, drinking from a cup, seated rest. Runtime crops and contact baselines are in `src/content/travelerActionAtlas.ts`; left-facing actions mirror the same three-quarter poses. The atlas is decoded once and all twelve cells become ready together. Movement cancels actions; repeat interactions restart their clips. Seated rest replaces the old rotated standing silhouette.
