# Traveler boot contact repair Implementation Plan

> **For agentic workers:** Use executing-plans/TDD. Only local isolated directory. No deployment/git/cloud. Existing DF2 gate stays unchanged.

**Goal:** Remove authored boot-shaped rectangular matte tails and prevent the sole copy from recoloring real leather, while keeping shoe pixels, frame geometry/rhythm, loading/lastReady and cat untouched.

**Architecture:**18 reviewed idle/walk preferred-source frames get explicit offline RLE alpha-only exterior masks, not a broad runtime color threshold. Preserve opaque real shoes in y900..1109 and a2source-pixel AA margin; only footer-connected near-(28,22,16) outside that protection is eligible. Retain inherited-color AO within18source pixels of the shoe bottom, fade tozero instead of tall blocks. Source assets remain byte-identical. `punchHemPixels` gains optional frame identity; default path is byte-identical. `punchHemUrl` caches identity+mode and registers which ACTUAL returned bitmap received cleanup, so lastReady holding an older bitmap cannot apply a new frame's contact metadata to it. Sole copy keeps only the approved contact pixels for recognized processed bitmaps, not leather; candidate human-only CSS bypasses the old SVG morphology/vertical dye mask. Unsupported reach and other frames stay legacy, as do baseline/other scenes.

**Alternatives rejected:**(1) only disable sole copy leaves source rectangles;(2) increase black threshold eats leather;(3) cut all rows below a fixed line eats changing shoe/toe geometry;(4) shared depth rewrite would confound current local contact attribution.

**Evidence:**actual source/hem/native stage images and game-scale CPU SVG approximation in audit/boot-contact-20261111. CPU diagrams are NOT browser/game screenshots; no full-scene grade simulation. Original source already contains rectangles; bootColumns clips only X, and feFuncA/table/morphology strengthen/stretch the copy. There is no independent TravelerMask component in src: actual masks are hemPunch, CSS sole vertical gradient and cloned-column bitmap.

## Task1 — RED actual pixels, then minimal alpha-only contract
- New src/ui/travelerContactPixels.test.ts and __fixtures__/traveler-contact/: SHA-checked real preferred asset RGBA crops y900..1151, gzip-decoded by Node builtin zlib (no new dependency/Python needed in tests).
-18frame failures: optional cleanup must clear far-footer matte, preserve all protected shoe pixels/RGB, and lower alpha only inside approved metadata; default legacy must remain identical. Fail assertions against existing punchHemPixels which ignores optional identity, not absent-import errors.
- Create src/ui/travelerContactMasks.json from proposed reviewed-coordinate masks; src/ui/travelerContact.ts exports hasTravelerContactMask, trimTravelerMat, keepTravelerContactOnly. Loop RLE on alpha only, reject wrong size/unknown frame; no source-file changes.

## Task2 — RED production pixel pipeline / routing, then wire
- Test punchHemUrl→clippedBootUrl with real fixture pixels and simulated Canvas/Image transport; verify actual processed-src identity, cached legacy/candidate isolation and copy with no leather. This is a unit transport harness, not browser rendering.
- hemPunch.ts optional frame identity must preserve default/footer protection and previous cache behavior, maintain returned-bitmap→frame map, and apply explicit masks only after legacy processing.
- soleClip.ts recognized cleaned bitmap uses contact-only mask; legacy and all cat routines unchanged.
- Traveler.tsx optional contactCleanup=false, pass file only in actual production punch branch, preserve lastReady/useEffect cleanup/timing.
- WalkLayer.tsx enables only candidate shore, sets sole.dataset.contact only on successfully generated new clipped src; no RAF scheduling/measurement/camera/input changes.
- Candidate contact-only CSS filter:none and mask-image:none on `.sole-soft[data-contact="contour"]` only. No new color/shadow/ellipse, no cat selector change.

## Task3 — final gates and audit
Normal+production full tests, content check, ordinary+production builds; hash all old assets/original workspace/loading/mask/camera/scale; source diff vs DF2. Preserve original mask metadata/source SHA and list changed exterior pixels perframe. Independent code+mask review then parent/browser real idle/walk front/side/back/turn/interaction/recovery. No deployment this round.

## Boundaries
Source/modeled A/B is not game visual acceptance. Actual grade may affect contact strength. The visible shoe and logical canvas-bottom foot contract are distinct; this knife changes neither actor coordinates nor proportion. Reach assets already lack reliable full shoe contours, so do not auto-mask/reconstruct them; explicit legacy fallback and risk record. Existing sole depth bug is deferred, not solved. Frame changes require source SHA/fixture/mask review rather than silently trusting stale coordinates.
