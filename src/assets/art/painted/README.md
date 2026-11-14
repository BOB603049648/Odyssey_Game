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

## Prologue: After the storm

Four full 1672×941 paintings share the shore's art direction. The tide-line shot uses the actual painted shore as its landscape reference; the companion has housecat proportions. The four canonical `art.pro.*` IDs are mapped to these files in `assetUrls.ts`; existing saves and memory scenes keep their IDs. The dedicated prologue renderer uses `object-fit: contain`, including on phones, and commits each cut only after decoding.

| File | Generation source |
| --- | --- |
| prologue-storm.webp | exec-5f3a6673-a3a5-474a-81f5-4f932998a86a.png |
| prologue-dark.webp | exec-b90aff0a-b5cc-4f3a-ac78-fd919f843574.png |
| prologue-break.webp | exec-711a439b-107f-4b5d-b931-5f859937125f.png |
| prologue-tide.webp | exec-7732c52a-a27f-46fe-b266-a38cf4ed85e9.png |

Generated 2026-11-13 with the image-generation tool, using `shore-scene.webp` as a style/landscape reference. WebP encoding uses the same quality 88 conversion as above. The four files total about 1.36 MB; each next shot preloads only after the current one is ready. They are illustrations, not skeletal animation or video assets. The runtime now adds water/weather/light animation in `PrologueMotion.tsx`; the sound pack and licenses are documented in `../../audio/README.md`.

Portrait compositions (`1024×1536`) are separate generated paintings, not crops of the wide shots:

| File | Generation source |
| --- | --- |
| prologue-storm-portrait.webp | exec-d87c82cb-30f8-4ead-a7b4-55adb0f3c18b.png |
| prologue-dark-portrait.webp | exec-afb1ef32-124d-4439-8bf2-474b9238ffa6.png |
| prologue-break-portrait.webp | exec-dbe70417-b2c0-408d-8a36-785aec794c5a.png |
| prologue-tide-portrait.webp | exec-f758c8ea-232c-4d52-9233-ab5172d85ee2.png |

Each uses its corresponding wide shot as the image-generation reference. `ResizeObserver` selects the composition that fills more of the available stage without cropping. A phone with limited height may therefore use the wide painting. Rotation uses the same decode/retain/retry contract as advancing a shot; it never changes story progress. Only the chosen composition and its next shot are prefetched. The `.portrait` suffix exists only in the asset map, never in save scene IDs.
