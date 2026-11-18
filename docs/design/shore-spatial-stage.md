# Shore: the first reconstructed 2.5D stage

This pass changes scene structure. It replaces the enhanced shore's image-relief mesh with a perspective camera, a horizontal X/Z floor, separate upright prop meshes, three pieces forming an open doorway, billboard actors, a solid direction sign and actual shadow-map projection onto the ground. Other five scenes retain the previous painting/relief implementation.

## Art separation

OpenAI image generation edited the latest shore painting into `src/assets/art/spatial/shore-clean.png`, removing major foreground objects and reconstructing their hidden ground. `shoreProps.ts` traces the original gate roof/posts, mural, driftwood, spring, stone, sign and foreground rocks into independent meshes. The doorway has no opaque painting filling its aperture. A separate spring silhouette removes the ladle when the existing water state changes.

The material source remains a painting. These meshes are shallow cutouts, rather than fully modeled assets with complete backs. The camera is limited to a small lateral/forward dolly so the view remains appropriate for 2.5D art. Source-mask edges and prop proportions still require browser visual acceptance.

## One spatial coordinate system

`ShoreProjection.ts` defines a reference perspective camera that converts normalized authored points onto an actual X/Z floor. The live camera can move independently and uses the existing viewport crop. Ground clicks raycast through the live camera onto that floor, then project back through the reference camera for existing navigation/puzzle logic. HTML hotspot controls are projected through the live camera as well, so their click targets follow their props.

Actors use a fixed world height derived at the spawn, so their apparent size changes through perspective as they approach the camera. Sprite pivots and UV frames still come from the current game. Both actor cutouts and props cast onto the receiving floor. Context loss, scene changes and base-mode switching unregister the spatial picker and restore native control positions.

The hall threshold moved from the left edge to the northward doorway at `(0.17,0.62)`. Existing ground bounds and a normal approach route support crossing it. The camp route keeps its original threshold, with its sign next to that path.

## Verification and rollout

Production build and 131 targeted tests across thirteen files pass, including all previous navigation/content checks, the new doorway crossing, perspective size, and ray-picking after camera movement/cropping. The managed Sites environment lacks `cua_repl.js`, so browser visual QA remains unavailable.

`scripts/export-shore-spatial.ts` exports the actual runtime stage meshes/camera for offline structural inspection. `scripts/render-shore-structure.py` renders those meshes in Blender. Those images validate placement and perspective only: they omit game UI, Three.js post-processing and exact dynamic actor materials. They are not browser screenshots. The environment's Blender build lacks denoising support, so the offline check uses a small un-denoised sample count.

Completion criteria for the next scenes: a clean background, separate foreground props, receiving ground, authored entry/exit planes, shared projection/picking, preserved puzzle states, and visual acceptance of a full approach/interaction/exit sequence. Each scene needs its own art and floor model; applying one global filter does not complete that work.
