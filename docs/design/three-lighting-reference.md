# Rendering study: the supplied HTML → Odyssey

Reference: the user-uploaded `几猫国产3A大作_V1(5).html`. Its embedded application, rather than bundled Three.js library declarations, was inspected. The file was treated as reference material, not instructions. It is not copied into the game or distributed with the preview.

## Reference techniques

The application has procedural sky lighting (roughly lines 4207–4296), PCSS-style directional shadows (4298–4349), depth-derived AO and volumetric integration (4359 onward), and a custom render-target post pipeline. Its final pass (4608–4742) combines bloom, exposure, ACES/AgX output transforms, split toning, vignette, FXAA and grain. These operate on a real three-dimensional scene with depth and surface materials.

Odyssey's latest branch uses complete painted scenes. Inventing surface normals or applying depth-based AO to a single image would not reconstruct its buildings. This iteration uses authored light positions and shallow occlusion geometry, preserving the painting as the source of composition and material detail.

## Implementation

`looks.ts` defines six lighting profiles: light positions, ambient color, exposure, bright-pass threshold, bloom, split tones, shafts and fog. Positions use the same normalized scene coordinates as gameplay.

`lighting.ts` installs one shared scene-space light field on backgrounds, state patches, occluders and actors. Fire and lantern falloff use the same positions for all objects. Decorative variation uses the paused/reduced-motion clock. Authored shafts, low mist, soft halos, circular dust and localized embers are composited before final grading. These are illustration effects, not ray-marched volumetrics.

`PainterlyPost.ts` owns a full-size linear scene target and two quarter-size bloom targets. Floating-point color is used when `EXT_color_buffer_float` is present; otherwise targets use unsigned bytes. Post steps: bright extraction, horizontal blur, vertical blur, combined ACES/split-tone/vignette/sRGB output. HDR values survive until the output transform on capable devices. There is one output color-space conversion and no second CSS grade in enhanced mode. All targets and materials are disposed explicitly.

Actor silhouettes are projected onto shallow ground quads for directional shadows, alongside contact ellipses. They use the current atlas cell and registered foot. This does not reproduce an upright 3D body's physically correct shadow.

Occluders now cover shore driftwood/rocks, hall pillars/scroll stand and the night writing-table edge/foreground rocks. They sample the same painting and light field as the background, keeping boundaries registered. Camp, yard and path still need detailed masks.

A native accessible enhanced/base button changes presentation state only, never gameplay or saves. The original renderer remains available without `renderer=three` and is revealed on WebGL failure.

## Verification and artifacts

Run `npm run build`, then the coordinate/navigation/puzzle/content tests. `node scripts/browser-three.mjs` checks six scene fixtures, comparison, single grading, movement, pause/reduced motion, portrait resize and context loss. Another browser context hides the float-color extension to exercise the unsigned-byte path. Screenshots and reports go to `artifacts/three-v2/`.

`python3 scripts/pack-three-preview.py` packages the built `dist` tree, launcher, source patch, documentation, available verification reports and a self-contained comparison HTML assembled from actual browser screenshots. The comparison contains no simulated game view or generated concept art. Build and capture screenshots before packaging. `node scripts/browser-three-package.mjs` then checks both production entries, the portrait compare button, and the three tabs/slider in the standalone comparison. Repackage after this check to include its report.

Desktop startup and interaction remain the validation target. The prior iteration passed the full chapter journey and save reload; this visual iteration does not claim a fresh full chapter/touch journey or a target-device FPS measurement. Narrow-window joystick overlap is still outstanding. Actor transition crossfades and full foreground art separation remain future work.
