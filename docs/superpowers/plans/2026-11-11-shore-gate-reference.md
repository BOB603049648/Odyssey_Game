# Shore gate reference-frame repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans; do not deploy/commit this iteration.

**Goal:** Restore the authored spawn gate composition while retaining ground-identical camera motion, without changing size, walk band, foot pivots, alpha or save state.

**Architecture:** Migrate the shore building's old camera-dependent offset into one fixed normalized world foot, calibrated against the existing shore SPAWNS/cameraOffset/lookEast contract. Default/baseline and other scenes do not use the migrated foot. A separate shared-depth design follows; do not combine an unverified grade/sole rewrite into this gate fix.

**Tech Stack:** Existing TS/React DOM, Vitest/testing-library; no new dependency/art.

## Global Constraints
- Only /workspace/odyssey-visual-sample-20261111 writes. Original workspace remains read-only. No cloud/git/deploy/browser UI.
- WORLD_SCALE=1.46; dimensions/anchors/walk bands/asset bytes/load recovery/mask envelope unchanged.
- Exact-origin production flag and ordinary-build baseline behavior remain unchanged.

## Evidence / root cause
Four directly-read native 1920x1072 spawn/south A/B screenshots are recorded in audit/gate-reference-20261111/image-evidence.json. Candidate removes baked ownerless dark patches, but the entire gate shifts up-left. Source: Plate.slotStyle previously adds cam*(1-slot.parallax), with building parallax=.72. Candidate changed this to 1 but kept buildingFoot(.16,.42,.36)=(.16,.60). Thus candidate loses .28*cam, a placement change as well as the intended velocity change.

Screen anchor before: W*F - C + (1-p)*C. Required coplanar form: W*F_new - C.
Choose existing authored shore spawn reference C_ref = lookEast(cameraOffset(SPAWNS.shore, viewport), viewportW, true).
Set F_new = F + (1-p)*C_ref/worldSize. This normalized fixed world coordinate is independent of the CURRENT camera and viewport aspect ratio, because cameraOffset clamps independently per axis. It exactly matches old composition at spawn; away from spawn it intentionally does NOT match the old sliding architecture.
The source helper buildingFoot names a BOX-bottom contract, not a measured opaque pillar contact. Gate image is1280x720; nonzero alpha bounds90,54..978,708 and >=128 bounds99,59..971,693. Existing building object-fit:contain uses center positioning; portrait may letterbox vertically, so restoring old framing is not proof that visible pillar contact is physically correct. Do not alter object-position/alpha/size in this regression repair; require review of actual new pictures, and list this inherited layout limitation separately.

Do not compensate using CURRENT cam or a fixed screenshot pixel offset. Do not revert parallax or shrink the gate. Whole gate cannot be guaranteed visible while moving east/south; offscreen movement consistent with the floor is not itself a regression.

## Task 1 — regression / minimal implementation
Files: create src/ui/shoreBuildingReference.test.tsx; create src/core/shoreBuildingPlacement.ts; modify src/ui/Plate.tsx; update the existing candidate foot assertion in src/ui/shoreVisualSample.test.tsx to the new explicit migration contract, preserving camera/size/default assertions.
- [x] Before implementation render actual PlateStack baseline/candidate, use DOM left/top + transform and world-camera projection; reference must agree on desktop/portrait/landscape. Expected red: lost camera*.28.
- [x] Verify delta invariance against the same ground landmark for spawn/south/left/right camera values; frame dimensions/object-fit and per-pixel image mapping stay identical at reference, not merely box bottom.
- [x] Implement `shoreBuildingFoot(slot:{x:number;y:number;h?:number;parallax:number}):Foot` using existing buildingFoot and unit viewport reference camera normalized by WORLD_SCALE; use only in shoreCandidate placed building branch.
- [x] Green targeted tests; replace the old candidate (.16,.60) assertion with numerically derived normalized fixed world foot, not a removed assertion.
- [x] Complete normal and production-flag full suites, content:check, ordinary and production builds. Save full logs and source diff relative to prechange Bamhrvfj source; confirm protected hashes/original source.

## Task 2 — concrete shared depth/sole design, separate reviewable change
Read current stacking/sole RAF and assets, write exact proposed root/portals/coordinate and grading contracts, front/back matrix and limits (gate apertures and cat attached props). Do not move only z-index across parent contexts or cut alpha without source masks. Keep renderer unchanged until this design is reviewed; gate fix is independently useful and must not wait for a broad rewrite.

## Browser follow-up (parent, after separately scheduled deployment)
Use existing frozen shore-spawn and south A/B and edge-left/right fixtures at identical actual gameRect/DPR/frame. Spawn should match old gate geometry with clean floor. South must follow the same floor translation, not recreate old parallax. Normal movement, touch and recovery remain real-browser gates. No claim of visual passing from unit geometry.
