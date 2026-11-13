# Painted environment and meaning scenes

Generated for the Odyssey experience rebuild on 2026-11-13 with the image-generation tool. Art direction: gouache storybook illustration, misty teal mountains, warm ochre light, tactile stone and wood, no labels or interface text. These are fictional narrative illustrations, not a claim of historically authentic Dongba writing.

The committed files are WebP encodings of the generated PNG originals, using FFmpeg `libwebp`, quality 88, compression level 6. No cropping, compositing or semantic editing was applied during encoding. The complete images are preserved; the UI selects atlas cells with CSS.

| File | Cells in reading order (3 columns × 2 rows) |
| --- | --- |
| concepts-concrete.webp | sun, moon, water, fire, fish, person |
| concepts-actions.webp | eat, drink, sleep, walk, give, take |
| concepts-relations.webp | me, you, size, amount, danger, unused |
| concepts-bonds.webp | hunger, share, wait, promise, trust, protect |
| concepts-memories.webp | betray, lie, miss, forgive, home, unused |

Each concept atlas is 1536×1024, with square 512×512 cells. `ConceptScene.tsx` owns the cell mapping and narrative descriptions; `conceptChoices.ts` owns the semantic contrasts. Do not use `object-fit: cover` on the atlas, which would crop neighboring cells incorrectly.

`shore-scene.webp` is one complete 16:9 environment. Buildings and props are already painted into it. The renderer adds only actors, interaction cues and feedback. Its canonical loading ID is `art.shore.landscape`; required-image decoding and retry use the existing scene loading pipeline. The matching walk band, waystone collision and five interaction feet live in `core/stage.ts`; the interaction bounds are the corresponding shore slots in `content/islands/dba/scenes.json`. If this image changes composition, recalibrate all three together.

Generation source identifiers, in the same order as the table, followed by the shore:

- `exec-faca9bdb-687d-4715-ae07-9d46ce9b61fb.png`
- `exec-2028b7b0-8d18-4703-9ee3-0f53dc0c2960.png`
- `exec-54f7ca29-59b4-4954-85e7-838cc3a0d07d.png`
- `exec-148499a1-ac99-4265-8582-36fee1024c88.png`
- `exec-6287c5cb-145d-4677-901d-7ec513edf05e.png`
- `exec-5f3f4fed-105b-44b2-81d5-4407f14ed809.png`

The other five exploration environments and character animation assets are separate work; this pack does not replace them.
