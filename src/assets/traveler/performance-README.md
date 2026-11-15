# Character performance art — v0.1.3

Generated on 2026-11-14 with OpenAI image generation, using the existing project characters as references. No external stock artwork or actor likeness was introduced.

Both source atlases are 1536 × 1024 RGBA, four columns by two rows. The original generated PNG files are retained in the repository. Runtime files are lossless WebP; conversion was checked for exact alpha and exact RGBA at every nontransparent pixel. No frame was resized or normalized to its own bounding box.

## Traveler standing / sitting / rising

- Reference: `src/assets/traveler/action-atlas.png`
- Original generated file: `/workspace/generated_images/exec-67aad950-2a07-4923-866c-2f1dfd026250.png`

- `src/assets/traveler/settle-atlas.png`: SHA-256 `c092f2c1ddd40fd21fb0cc8d3778d9a628b52a15b794d53ba222a9dbdce8a512` (1963513 bytes).

- `src/assets/traveler/settle-atlas.webp`: SHA-256 `f2d1e2f293d9e9603e94c385918559b04c5c27d7268e6e8687e72b0fde275a78` (1206878 bytes).

## Companion observation / paw / settling / curl

- Reference: `src/assets/companion/nanaicha/nanaicha-hero.png`
- Original generated file: `/workspace/generated_images/exec-f15b666a-02fd-4d3e-85c8-e3a5a7b4ab0d.png`

- `src/assets/companion/nanaicha/performance-atlas.png`: SHA-256 `25a49c391c616a9b8f9c6783637e1154b16e29d4338ad9cf780e8084ac629cda` (2214297 bytes).

- `src/assets/companion/nanaicha/performance-atlas.webp`: SHA-256 `950fcaa740ce97efa793e59300166015062f5f8cd46812aa9d6744cbdc462e59` (1365000 bytes).


The traveler brief specified the same blond character, dark open coat, boots and pouch, a fixed three-quarter camera, consistent head/body scale, four stages lowering to the ground and four stages rising. The companion brief specified the same hooded blue-eyed Siamese cat and bone clasp, with attentive head turns, a raised/lowered forepaw, settling and curled rest. Both briefs required transparent backgrounds, independent full-body cells and no floor, text or decorative shadows.


Runtime registration lives in `src/content/characterPerformanceAtlas.ts`. Traveler cells use one fixed 360 × 480 crop; companion cells remain 384 × 512. The measured contact baseline is stored separately for each pose. Sitting and curled bodies naturally occupy less height while their heads and paws keep the same scale. New atlases bypass the historical damaged landing art.


The traveler source PNG is excluded from runtime URL globs; the companion source directory is outside trajectory globs. Runtime only imports the WebP files. The source PNG files must be retained for future art work.
