# Cue viewport-only implementation plan
> Explicit parent-approved narrow scope; execute inline with executing-plans/TDD. No confirmation/commit/deployment.

**Goal:** reduce dominant mobile rings and joystick overlap, retaining anchored cues, hitboxes and input.
**Architecture:** candidate shore only. A small pure rectangle policy plus DOM measurement hook. Existing cue stays its child of the same scene-slot; translateX(-50%) kept and uniformly scale around its center. Never mutate entity/hotspot styles or world/camera. Existing opacity-only breathing/reduced-motion remain.
**Tech Stack:** existing React/TypeScript/CSS, no dependency/network/storage changes.

## Alternatives / decision
1 CSS-only vmax: smallest but cannot reliably compare actual joystick and cue rects or safe-area insets. Rejected for overlap requirement.
2 Selected: measure existing cue/scene-slot/viewport/joystick DOMRects; pure sizing+intersection; two small scoped rules for marker/focus. No new screen-space layer or portal.
3 New clamped overlay cue system: unnecessary depth/target-mapping risk, rejected.

## Evidence / initial thresholds (proposal for later real-image review, not measured acceptance)
Personally read 390x844 current Cw6 freeze screenshot2cc55… and older844x390 screenshot45188… (old shoes, not current). Fixed52/64/72px rings dominate phone; joystick real CSS112px, but read actual rect rather than assume x/y. Existing mobile breakpoint width<=960 OR height<=540 retained using measured viewport.
Phone max visual widths=6%/7%/8% of viewport short edge for far/glance/near, also <=75% of measured scene-slot width and never enlarge existing cue.390 short edge gives23.4/27.3/31.2px, preserves state hierarchy. Uniform scale preserves center/aspect. Desktop remains1. Bounds are design thresholds, not claims of optimum; browser QA needed. Overlap uses scaled ring AABB vs actual visible joystick rect expanded8CSSpx; ignores zero-size desktop-hidden joystick. Shrink only ring/glow; retain4px visible-center dot when overlapping, never hide entire cue or accessible target. Small-screen glow reduced, no filter/world changes. Keyboard focus outline on actual original button, outline only (no layout/hitbox change).

## Global constraints
Only isolated workspace. Do not change assets/shoes/FramePicture/retry/identity/sole/cat/gate/depth/camera/foot/world scale/saved data/hotspot position, size, radius or callbacks. Ordinary builds/baseline and other scenes keep prior behavior. No production/SSH/browser/git actions in this task.

## Tasks / red-green
- [x] Freeze source hashes, read actual screenshots/source (done).
- [x] RED integration: inject measured DOMRects at390x844/844x390/1920x1072; render real WalkLayer. Expect bounded ring scale, actual joystick rect8px exclusion, retained cue dot and immutable entity/button styles. Existing keyboard E/click callbacks remain. Resize/camera update cleanup coverage. Static CSS contract verifies reduced-motion and candidate-only focus outline, not real rendering.
- [x] GREEN: add pure cueViewportPolicy + hook, one WalkLayer hook call + nonfunctional viewport attribute via hook, candidate-only CSS. No Plate/WalkStick/spotViews edits required.
- [x] Pure policy tests include measured off-origin viewport, hidden joystick, desktop no resize, repeated scaled DOMRects idempotence, overlap moving out of safe rect. Integration tests mock DOMRects because jsdom has no layout; NOT real screenshots/touch acceptance.
- [x] Full ordinary and deployment-origin suites separately; content:check; ordinary build and deployment build. Save logs/artifacts/hash diffs, verify protected hashes. Stop for independent review; no publish.

Commands: npm test; VITE_SHORE_DEPLOY_ORIGIN=http://47.252.94.138 npm test; npm run content:check; npm run build; VITE_SHORE_DEPLOY_ORIGIN=http://47.252.94.138 npm run build. Fixture URLs unchanged until separate authorization. Future real QA:390x844,844x390,1920x1072 spawn/south and dynamic target approach; real keyboard/touch/reduced motion, no loss/misassociation of cue/hitbox.
