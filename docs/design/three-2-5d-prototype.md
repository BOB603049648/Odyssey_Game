# Three.js 2.5D rendering prototype

Historical note: this describes the first integration pass. For the current lighting iteration, see [the reference study](three-lighting-reference.md) and [current preview instructions](../../THREE-PREVIEW.md).

Based on `fix/snapshot-portability-and-gameplay`, commit `e9499c900ec287b778130e6bb5b0189b4394e33d` (v0.1.10). Local working branch: `prototype/three-2-5d`.

## Run and compare

```bash
npm ci
npm run dev
```

Open the Vite URL with `?renderer=three` to enter the prototype. Without that parameter the existing renderer runs. Both use the existing local save; use separate browser profiles when comparing different playthroughs. No deployment or remote branch update is required.

The optional renderer is lazy-loaded. Its current production chunk is approximately 130 KB gzip. `WalkLayer` supplies camera, actor presentations and world state; it continues to own inputs, collision, interaction and simulation time. The Three.js view never writes gameplay state or saves.

## Implemented

- Orthographic WebGL view registered to the original normalized coordinates and camera window. Existing HTML controls, touch joystick and accessible buttons remain interactive.
- The six current painted backgrounds, traveler and companion render in one WebGL context. UV regions reuse the existing walk/action/settle atlases and source-specific foot registration. The character costume correction is applied in the material shader.
- Shore: traced driftwood, waystone and lower foreground rocks write depth using the existing art. A character passing behind them is occluded; walking in front remains visible. This is a shallow depth model, not a reconstruction of the entire landscape.
- Subtle animated mist, particles, lake distortion and distant-focus softening. Water animation is confined to an authored lake region. Near art and gameplay anchors are stable.
- Water/food patches read `worldState(save)` and render at their original locations with feathered boundaries. The existing local spring, fire and dust SVG effects remain part of the presentation.
- Pixel ratio is capped at 1.5. Paused/background/reduced-motion states freeze decorative motion. Resources are disposed on unmount. WebGL failure/context loss reveals the existing DOM view.

## Important boundaries

This version proves integration and visual feasibility. It does not replace the complete world with 3D models. The camera remains aligned to the authored paintings; free rotation and large parallax would expose missing image content. Only the shore currently has hand-traced environment occluders. The other five scenes have GPU actors/backgrounds/atmosphere but still need authored foreground masks and individual depth tuning.

Animation uses the original frames. This first adapter presents the current frame without the DOM renderer's outgoing-frame crossfade. A dedicated GPU transition pass and target-device profiling belong in the next iteration. Draw-call counts are not an FPS benchmark; automated browser checks here use software WebGL.

## What the latest branch changes about the migration

The production view now uses complete painted landscapes (`Plate.tsx` → `PaintedEnvironment`); historical slot art is retained for review. Loading old slots into Three.js would recreate the old visual style. The current painted files must remain the visual reference.

Pure logic in `core/puzzles.ts`, `core/bridge.ts`, `core/expedition.ts`, `core/navigation.ts` and `core/reduce.ts` is reusable. `WalkLayer.tsx` combines navigation, camera, actor presentation, interaction and HTML output; a full migration should extract a render snapshot from it before extending the renderer further.

## Next art and interaction pass

| Scene | Visual work | Interaction direction |
| --- | --- | --- |
| Shore | Clean foreground masks; separate lake/shore/mountain layers; spring highlights | Look at the ladle, carry it to the spring, fill and drink with a closer inspection view |
| Camp | Bed and porch occlusion; warm fire response on characters | Approach, lower into rest, then return control without a forced slide |
| Yard | Separate baskets/bowls; preserve food state across views | Bring the existing four-piece distribution into a scene-aligned close-up |
| Hall | Pillar and scroll depth; window light and dust | Move closer to one inscription and reveal its related meaning scene |
| Path | Bridge rails, posts, near foliage and mist layers | Preserve the observation → symbol reasoning → response sequence; camera emphasis follows the observation |
| Night | Table/scroll occlusion; fire and ember depth | Inspect the painted-over layer, then transition into the memory |

Each finished scene needs a master composition, walkable ground, occlusion silhouettes, interaction anchors, material/atmosphere settings and state variants. A new foreground or a larger camera movement also needs clean art behind it; the current combined painting cannot supply hidden surfaces.

## Verification

```bash
npm run build
npm test
node scripts/browser-three.mjs
node scripts/browser-three.mjs --journey
```

The custom browser runner requires Chromium (`CHROMIUM_PATH`, default `/usr/bin/chromium`) and local port 8793. It uses isolated browser contexts, captures six scenes and portrait layout, verifies movement, pause, reduced motion and actual WebGL context loss, and records a short shore clip. `--journey` additionally runs the existing real-click chapter journey with Three.js readiness assertions. It starts and stops its own local Vite server. Artifacts are under `artifacts/three/` and are not committed.

Validated in this workspace: production build; 97 targeted unit/content tests; six-scene browser fixtures; the full desktop chapter journey including reload; and both original/Three.js entries served from the production build. No browser page or asset errors occurred. The full unit run passed 831 tests but eight existing image-test files were blocked by the sandbox's Python subprocess pipe `EPERM` error, so the entire suite is not certified.

Desktop is the recommended preview target. Portrait rendering was checked, but a full touch playthrough remains outstanding. A 960×600 run encountered a joystick covering the center of the food-basket hotspot. The successful chapter run used 1440×900 with a 60-second navigation timeout to accommodate software WebGL.
