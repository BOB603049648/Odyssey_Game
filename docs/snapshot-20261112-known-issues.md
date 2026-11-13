# Snapshot 2026-11-12 — known issues (not accepted as fixed)

This branch is a source snapshot of the local visual-sample tree at the I2 freeze
(approved 358-file manifest SHA256
`b40de4153c9cc29dc722c4de55bb7e9ab4e3133df5020d7de2627712b22d6b39`).
It is not a production release, not a merge to `main`, and not visual or playable acceptance.

## Addressed in this working tree (2026-11-13)

These were fixed at the source/asset level and are now guarded by tests. They still need a
human visual pass in the running game before they can be called accepted.

- **木经堂 (hall) scale.** The `art.hall.building` pavilion is no longer a full-bleed second
  architecture pasted over the hall; it is placed as the shrine at the end of the aisle
  (`x .5 y .315 w .72 h .47`, feet on the wall line at `.55`). The traveler reads `0.22` of the
  plate height in this scene instead of the shared `0.136`, so a 1.75 m body matches the ~3.7 m
  pillars. Scroll, stamp rail and wrist mural are trimmed to their subject and sized in metres
  on the same body (1.0 m / 0.42 m / 0.44 m at 90.5 px/m). Contract: `docs/art-scale-contract.json`
  → `hall_scale`; enforced by `checkScaleContract`.
- **Giant wrist mural.** The delivered `art.hall.prop.wrist-knot.png` was an opaque 16:9 photo of
  a forearm: it composited a black rectangle 1.6× the traveler. It is now a 512² round cutout with
  the black ground keyed out and a soft rim, hung at mural scale beside the betrayal scroll.
  Original kept at `docs/assets/hall/art.hall.prop.wrist-knot.original.png`.
- **Cat alpha / transparent body (shore cat).** The shore cutout had a 4.5k px hole where the face
  is and a 2.7k px hole along the cloak flank, both closed interiors, so the guide composited with
  a hole for a face. `scripts/restore_cat_interior_alpha.py` fills only closed interiors ≥ 800 px,
  colouring them from the rim plus the lit fur above the hole; opaque pixels and the foot anchor
  are byte-identical. Guard: `scripts/test_cat_interior_alpha.py`.
- **Black-leap art.** Both mid-air frames carried a baked elliptical ground shadow although the
  cat is airborne (leap-02's was fused to a paw), and both were delivered at roughly half the
  landing luminance, so the hop read as a black cutout against the fog. `scripts/fix_leap_frames.py`
  removes the wide bottom discs and lifts the tone into the landing family. Guard:
  `scripts/test_leap_frames.py`.

## Still unfixed / not certified

- Arrival / held stretch is not finished.
- Traveler alternating walk-phase art is still missing. The engine already cycles all four walk
  frames by distance (`clipFrames` / `stepCycleByDistance`); the delivered frames do not alternate
  the legs, so this needs new keyframes rather than an engine change.
- Human visual/playthrough acceptance is still pending; the automated chapter route below passes.
- Cat alpha is only certified for the shore prop; camp/yard props and the trajectory landings keep
  smaller closed slits (between paws, under the belly) that were deliberately left alone.

Display and load recovery work in this tree must not be read as “the picture is complete and normal.”

## Fresh-clone and gameplay repairs (2026-11-13)

- Replaced the absolute imports in `catRecoveryOwnerProduction.test.tsx` with repository-relative imports.
- Checked in the three pre-restoration shore trajectory originals from commit `b57f27b` under
  `docs/assets/nanaicha/shore-face-originals/`. The alpha regression now uses these fixtures,
  preserving its face, foot, opaque-pixel and eye checks. Eye colour arithmetic uses signed
  channels so the blue threshold cannot wrap at 255.
- The optional restoration script takes explicit `--raw-dir` and `--evidence-dir` arguments;
  recreating the restoration still requires the artist's original softfix JPEGs. Tests do not.
- Declared the Python bitmap-test dependencies and installed them in both CI workflows.
  Pull-request CI now runs the production build as well as the tests.
- Yard amount boards can be activated from the ground immediately in front of the facade;
  their art anchors, walk mask and separate interaction radii are preserved. Successful
  "more" feedback now targets the actual `act:dba.word.amount:more` hotspot.
- Storage reads, writes, and access to the browser's storage getter are guarded. Invalid
  saves and quota failures preserve the last valid saved payload. The running session
  continues with a visible save warning and retries persistence on the next action.

The baseline run in this fresh clone reproduced only the absolute-import and missing-fixture
failures (81 files passed, 2 failed). `displayReview.test.tsx`, `hearthDepthLight.test.tsx`, and
`hearthLightDepth.test.tsx` passed here; the earlier report of their failure was not reproduced.

### Verification

- `npm test`: 83 files, 584 tests passed.
- `npm run content:check` and `npm run build`: passed.
- The separate `vite.display-review.config.ts` build passed with its persistent-store exclusion check.
- Chromium against the production build: new game → all 28 words → water → camp sleep →
  yard more/less and wrong/share choices → path stop → night evidence → hall token/tattoo →
  departure and all three memory frames → reload and continue. All expected beats and all
  three island evidence items persisted; no page exceptions or failed HTTP responses.
  This automated traversal uses DOM hotspot activation and keyboard travel, not a human
  assessment of the artwork or every pointer/touch target.
- Chromium mobile checks: 390×844 portrait and 844×390 landscape loaded without horizontal
  page overflow. A context whose `localStorage` getter throws still reached the shore,
  opened/closed the case file and displayed the unsaved-progress warning.

The art and animation limitations above remain open; this repair does not replace keyframes
or certify the entire visual presentation.
