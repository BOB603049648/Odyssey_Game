# Shore common-depth + sole Implementation Plan (D1 local candidate BLOCKED; not deployable)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and test-driven-development after gate-reference review. No deployment without parent scheduling.

**Goal:** One actual sibling stacking root for shore props, traveler, cat composite and their contact copies, so one world ground-foot ordering controls all opaque fragments; no contact copy may leap above an occluder.

**Architecture:** A candidate-only `GroundDepth` render branch contains stable, full-world-sized `DepthUnit` wrappers. Every grounded render unit is a direct sibling, sorted by explicit semantic world-foot y + deterministic tie key. The actor and its own sole/contact img live INSIDE the same DepthUnit. World-camera translation is inherited ONCE; contact positions change from viewport-relative to world-relative. Baseline and other scenes keep the exact legacy three Plate passes/sole overlay until separately reviewed.

**Tech Stack:** Existing React/DOM/TS, Vitest, no new engine, image generation, alpha edit or storage mutation.

## Confirmed current defects / boundary
- Plate.tsx includeSlot/drawsInFront is against traveler feet only; back and near live under separate `.plate-stack` z=0/7 parents. Cat is sorted separately using `cat.y > feetY + .012`, z4/6. Near props are above BOTH even when they should be behind cat. Tweaking child z cannot cross these stacking parents.
- WalkLayer.tsx has sole-layer outside world-root, z7 in viewport; world-root z1 and grade z6. Thus even a correctly hidden body can retain a frontmost sole. Rendering a sortable list but leaving this layer in place is NOT a fix.
- Current contact RAF uses `imageRect - viewportRect`. Reparenting without changing coordinate space double-counts camera translation. No CSS offset patch allowed.
- Cat S0/S1/S2 are indivisible composites with attached wood/gourd/pole/rope. Do not infer a body bbox, delete apparent duplicate objects, or auto-slice alpha. Whole-composite depth can be consistent, but cannot solve different intra-composite object depths.
- Gate is one image including pillars/roof/deep doorway haze, with no verified independent occlusion masks. Whole-image sorting is NOT independent pillar/roof occlusion.

## Decisions / tradeoffs
1. Recommended: one physical world-depth root, then existing scene ambient/grade above it. Actor and sole obey all occluders. The existing sole filter/crop stays byte-identical, but sole now passes through grade instead of bypassing it: visible contact tone MAY change and needs its own A/B. Do not secretly add stronger shadow to compensate.
2. Rejected: leave sole above grade and merely give it numeric entity z. Different parents still contradict depth. Alpha-based occluder masks on a high sole could simulate this but add render/readback/asset-mask complexity and are not this minimal DOM repair.
3. Rejected: migrate renderer/3D now. Common depth is repairable in existing DOM; geometry/art contracts remain necessary in every engine.

## Proposed files / contracts
- New `src/core/groundDepth.ts`: `type DepthItem = { id:string; footY:number; kind:'prop'|'traveler'|'cat' }`; `sortGroundDepth(items:readonly DepthItem[]):DepthItem[]`. Sort finite footY ascending, then stable id; reject nonfinite, never silently use sprite bbox. Inputs are semantic anchors already used by gameplay. Same-foot precedence is fixed (stable id), not frame alternation. Do not introduce a quantized bucket that makes close feet compare equal.
- New `src/core/groundDepth.test.ts`: pure front/back/tie/jitter matrix below.
- New `src/ui/GroundDepth.tsx`: accepts stable keyed nodes and their footY; outputs `<div className="ground-depth-root"><div className="depth-unit" data-depth-id=... data-depth-y=... style={{zIndex:rank}}>{node}</div>...</div>`. Each depth-unit is `position:absolute;inset:0;pointer-events:none`, NO transform/opacity/filter, so percent coordinates and world CSS px remain unchanged. Root absolute/inset0/z2/pointer-events:none. Only same-parent rank affects entity depth. Props noninteractive as today; companion button must explicitly remain pointer-events:auto.
- `src/ui/Plate.tsx`: factor grounded `SlotPiece` into reusable same-module export or `SceneSlotPiece.tsx` without changing its `useAssetSrc` API/keys. Add a candidate back mode that omits placed props (and only those whole building units explicitly approved); render those exactly once in GroundDepth, not both near/back. Sky/far/ground/ShoreTread remain in back z0; fg remains z8. Avoid Plate assemblies with transform/opacity/animation grouping supposedly sortable children. During980ms previous-scene crossfade, render previous grounded slots as separate units keyed `previousScene:slotId:leaving`, carrying per-unit fade rather than one shared fade parent; current units remain keyed `currentScene:slotId`. Include transition tests for shore→camp and camp→shore, resource recovery and final old-unit removal. Never fade/move the entire shared root to simulate a previous plate.
- `src/ui/WalkLayer.tsx`: candidate shore only: gather active prop units from the SAME kit/spotIds as today; one traveler unit, one cat unit. Render each actor + its own contact img under the same full-world depth-unit; no per-actor sizing wrapper transform. Existing TravelerMark and companion-anchor keep all sizes/anchors/frames and presentationFrozen behavior. Do not recreate these components when crossing a prop y threshold (stable key/parent).
- `src/ui/soleCoordinates.ts`: `worldContactBox(imageRect:{left:number;top:number;width:number;height:number},worldRect:{left:number;top:number},feather:number)` returns left=image.left-world.left; top=image.top-world.top; width=image.width; height=image.height+feather; fit=image.height/(image.height+feather). Legacy branch still subtracts viewportRect. World size is numeric layout, not CSS scale; no extra WORLD_SCALE factor. Read worldRect and source imageRect from the same RAF before writes. Preserve current mirror/crop readiness/error logic.
- `src/styles.css`: append only candidate-specific root/unit/hit-plane rules. Hotspots z9 and fg z8 remain above the root as now; path-exit z6 remains usable. Keep world-grade overlays z6 above root. CSS pointer-events inheritance must be checked with real hit testing, not only event dispatch. Scope all new selectors to candidate shore.

## Semantic depth anchors — no silent foot retuning
Traveler depth uses existing `feetY`; props use authored ground y; cat initially uses existing logical `cat.y`. If a whole shore building is later admitted as a ground-depth unit, its foot MUST come from `shoreBuildingFoot` in `core/shoreBuildingPlacement.ts`, not the old `.6` slot foot or a separate CSS-only number. Drawing anchors do not change. Existing cat `companionFoot=.993 canvas` and contact `companionSole(S0/S1)=.847 canvas` are NOT the same point. Therefore phase one guarantees a consistent logical anchor order, not that visible paw tips already define physically correct contact. Record both projected values in fixture diagnostics before choosing a future contact-depth migration. Leap sorting follows logical ground trajectory, not the airborne silhouette. Any switch to measured visible paw depth needs explicit behavior tests and A/B, not bbox-based auto-correction.

## Historical boot investigation — completed/superseded by reviewed Y-only + cue baseline
Boot exterior masks, content identity/build guard, bounded recovery, progressive raw/lastReady display and Y-only support registration are already implemented/reviewed. Do NOT rerun the old shoe-mask investigation or re-anchor X. Current local/published named cue baseline is yRTUEfGQ/Mg058yQh; formal root remains DF2, old boot=BTAP and sole=Cw6. Human support uses actual shown URL, not desired animation frame. Current/outgoing have separate transforms; preserve both.


## Required TDD sequence, failure must precede implementation
### A. Pure order matrix
```ts
const rows = [
  {id:'prop-driftwood',footY:.72,kind:'prop'},
  {id:'traveler',footY:.68,kind:'traveler'},
  {id:'cat',footY:.74,kind:'cat'},
] as const;
expect(sortGroundDepth(rows).map(x=>x.id)).toEqual(['traveler','prop-driftwood','cat']);
expect(sortGroundDepth([...rows].reverse()).map(x=>x.id)).toEqual(['traveler','prop-driftwood','cat']);
```
For each prop y=.56,.66,.68,.70,.72 cross traveler y=prop±.02 and cat y=prop±.02 (4 combinations, 20 rows). Verify each actor's sole is inseparable from its body rank. Add equal-foot permutation invariance, .7200001 vs .72 ordering, no mutation, finite-input rejection. First DOM assertion on current renderer must fail because prop/body/sole do not share a depth-unit parent.

### B. Real DOM parent/identity contract
Render candidate WalkLayer with real SlotPiece/Traveler/Companion modules. Assert all depth units have the same direct `ground-depth-root` parent, each prop appears once, actor and sole `.closest('[data-depth-id]')` are identical, and the old viewport `.sole-layer` has no candidate contact imgs. Rerender/move traveler across a prop threshold; assert actor/prop DOM identities stable and no image-recovery reload counter increment. Baseline and camp remain byte-for-byte DOM projections except existing approved presentation changes.

### C. Coordinate and actual production RAF path
Pure sample: imageRect left300/top400/width80/height110, worldRect left-200/top-100, feather14 → left500/top500,width80,height124,fit110/124. Move BOTH rects by camera delta(-150,-40), expect identical world-contact geometry. Change viewport rect without world rect, expect no geometry change. Production MODE RAF harness (not test-mode skipped RAF) mocks source/world getBoundingClientRect, advances several seconds and proves real soleRef receives those coordinates; mirror and frozen fixture frame remain correct. Unready clipped image must retain previous valid contact or hide according to existing logic; do not open new fetch loops.

### D. Contract/interaction/real acceptance
Ordinary and pinned-production full suites/content check/both builds; hash locks for assets/loading/mask/world size/stores. Verify existing E/click/onAsk/exit callback routes; browser adds actual pointer/keyboard/mobile hit tests, not jsdom pretend-touch. Fixtures need front/back variants, not only current overlap-left/center/right: use six pairs for three props, human/cat swapped both sides, stable same-camera metadata and no localStorage reads/writes.

## Gate pillars / roof / cat attached parts are explicitly separate
No valid independent source mask currently established by this audit. Keep gate in scenic back for first shared-prop-depth step and state gate occlusion remains incomplete, rather than sort the full opaque deep doorway as a fake solid pillar. To include pillars: require reviewed original-resolution mask coordinates in asset-local UV, per-part ground anchors and a separate always-overhead roof rule; original alpha must be multiplied, never replaced. Current alpha bounds (nonzero90,54..978,708; >=12899,59..971,693 on1280x720) locate the silhouette only, not door geometry, so they are NOT enough to cut columns. Cat composites similarly stay whole pending valid semantic part masks; no alpha surgery.

## Review/rollout boundary
This is an executable next-knife design, not a claim the renderer is already migrated. Gate/boot/cue reviews are already complete within their stated acceptance bounds. Do not implement A–D until the following cat-bearing decision and updated display-metadata contracts are reviewed; later use a separate source snapshot/diff. Its deliberate sole-under-grade change requires new actual A/B and may be rejected on contact-tone grounds. Do not bundle a new filter, scale retune, gate cutout or art edit into that same acceptance.


## 2026-11-11 21:14 Asia/Shanghai — latest read-only review, NO implementation authorization this round

### Actual evidence / separate root causes
- Personally read `/workspace/shore-game-walk-left.webp` and `/workspace/shore-game-driftwood-attempt.webp`: BOTH1920×1200 native files including Chrome/system UI, NOT1280×800 (inline preview) and not an independently measured CSS viewport. Browser address is named cue preview. Cat and human are separated; apparent lifted/curled legs remain, so mutual occlusion cannot explain all of this. Source silhouette matches S1 gourd, but neither still includes DOM clip/guide/currentSrc; exact state, hop phase and duration are NOT established.
- Read all3 actual864×1152WebP landings, plus `/workspace/playtest/visual-independent-20261111/S1-CUE-NEXT-REVIEW.md`, `S1-source-paw-contract-native.png`, `cue-landscape-stick-native.png`. Each source already includes wood/cup/pole/rope; global alpha bbox is NOT cat height or support. Do not remove attached props as presumed duplicates.
- `companionPost.ts:6–38` fixes plant row1144; sole table givesS0/S1=976,S2=1117. These are distinct by168/27source rows. By formula only, declared S0/S1 sole is14.5833% of rendered cat-canvas height above logical plant (S2=2.34375%). At an ASSUMED1072CSSpx viewport, S1 formula gives37.844px; this is NOT a measured screenshot gap and976 is NOT a proven paw tip.
- Independently sampled S1 local furROI x350..509, alpha>=228 excluding the exact existing cat-contact color criterion: row976 has146solid non-contact pixels(x350..495); row1020=55(x356..410);1025=33(x370..402);1030=15(x384..398);1035/1040=0. NarrowROI x380..499 agrees. This verifies976 lies inside visible fur and free end is around1030 with soft-edge uncertainty. The109–124source-row gap from free end1020–1035 to1144 is9.46–10.76% of rendered canvas height; it does NOT prove that rounded curled fur is weight-bearing. Source pose is forward-leaning/tucked, no clear flat planted support. Do not mechanically setpivot1030/1040 or lift another asset based on its full bbox.
- RGB contact matching is not a semantic mask: S1 has>=10matching pixels on rows421…1055, including unrelated dark artwork. `soleClip.ts:51–52,84–175` selects by color/band/column heuristic, not an anatomical contract. Local source semantics need review before any source-support table.
- `styles.css:650–654` hides shore radial/AO; actual readable copy is `.cat-sole` at viewportz7, while body is in world-rootz1 (styles483–487/2093–2125; WalkLayer492–528/718–744/824–846). This IS separate stacking, but is not proof the copy failed to load or that sorting alone can un-tuck paws. `nanaicha-hop` can additionally lift the whole source7% while traveling+land (896,2265–2267); stills cannot determine whether it contributed.
- Display-identity hazard independent of depth: `Companion.tsx:30–40,56–64` can retain old `src` for one render after desired frame/figure changes; blob loads later. WalkLayer currently chooses `--sole-y` from desired catSprite, but extracts contact from actual `catImg.currentSrc`. S1→S2 could apply1117 to an oldS1 image. Candidate future support/contact metadata MUST follow the actual visible URL (original+blob aliases), not `data-frame` or beat alone. This is source-confirmed risk, not a reproduced screenshot cause.

### Minimal next knife / choices — parent decides, no source edits now
1. RECOMMENDED firstD0: establish S1 stationary-land bearing semantics and actual-source metadata. In an explicitly opted-in in-memory diagnostic, report actual img source/frame identity, original/blob/fallback status, guide/clip/hop, source support and projected world foot; capture static land + real moving→hold transitions. Check existing same-series assets for a genuinely planted pose ONLY if review can establish it; this review has not approved a substitute. If no genuine support is distinguishable, report the asset/pose contract gap; no guessed pivot, source edit, silhouette cut, size change or new shadow. A Y-only display adjustment is a later candidate ONLY after one real supporting surface is approved, and must keep horizontal body axis/mirror/logic foot/scale fixed. No standalone frame976 “fix.”
2. Depth-first is valid only as an OCCLUSION fix; explicitly does not promise S1 grounding. Do not combine cat contact calibration, whole-image hop behavior and grade/depth migration into one visually untraceable patch.
3. A renderer/3D rewrite cannot repair a tucked source/support contract; reject for this knife.

### Current cue acceptance / independent control risk
The new rings' size/hierarchy are locally accepted in two responsive images; do NOT keep shrinking cues. The native landscape crop shows joystick disk crossing the independent driftwood entity; the small point persists. Decoration-only avoidance is NOT whole-control/entity safe-area acceptance. Treat as separateDUI after S1 contract, or parallel only as an independent patch: use actual control/entity rects to compare a bounded control-layout alternative, not world movement/scaling/hitbox shrinking, and require real pointer/mobile QA. Screenshot source notes native1688×780/780×1688; do not infer DPR without metadata. No control change authorized/implemented here. Reach attempt says “still too far”; reach pose remains unverified. Parent-reported fresh-session left/right walk and character visibility are limited observations, not all-direction/transition/recovery pass.

### Shared-depth plan remains structurally valid, but must preserve latest contracts
- D1 scope afterD0 review: FIVE actual authored props(.56mural,.66gourd,.68east-gap,.70shard,.72wood), human, whole cat composite + their contacts. Gate stays scenic back until verified pillar/roof masks exist. No new bodyBBox, depthScale, paw/foot retune or cat-part slicing. Existing painter's order changes only through sibling rank.
- `DepthUnit` must be a real SAME-PARENT sibling under one world-sized `ground-depth-root`. Each actor and ITS contact are direct children of its unit; no candidate contact left in viewport `.sole-layer`. Local bodyz0/contactz1 may preserve old copy-over-body ordering, but neither may escape unit rank. Root z2 and whole units retain stable keys. Rank cannot be a numeric decoration under different `.plate-stack` parents. No grouping transform/opacity/filter on root; per-unit scene fade only.
- Human metadata = actual shown URL→approved file/supportY/processed-or-raw identity, independently for current and outgoing frames. Keep Xtranslation0, existing mirror and progressive/lastReady recovery. `imageRect` already includes its per-frame Y transform: subtract worldRect ONCE; do NOT add supportY translation again. Contact mode must follow actual URL, not desired frame. Unknown reach/lie remains explicit legacy/unverified; no invented coordinates. Preserve all19source+mask identity guards and retry behavior.
- Cat metadata should similarly bind ACTUAL displayed original/blob/fallback to a known frame/support record; unknown fallback stays legacy, never guessed to desiredS1/S2. On frame holding/delayed blob/decode, body, support, contact crop and mirror remain one display identity. Registry must not introduce duplicate downloads or erase existing raw-ready fallback. Source/cache changes require their own red-green/recovery/unmount tests.
- Contact geometry must use same-RAF `sourceImageRect - worldRootRect` (same camera) plus existing14human/16cat feather; no extra WORLD_SCALE, viewport offset or support correction. Preserve mirror from actual displayed wrapper. The relative geometry must be invariant to shared camera translation and viewport-origin change.
- Factored SlotPiece must preserve `data-shore-visual=candidate` ancestor, `.scene-slot > .prop-cue` ownership, data-spot/cue/activeSpots, actual `useAssetSrc` lifecycle. Otherwise newly extracted cues silently lose the approved size/safe-area rules. Do not remount actors/props when foot order changes; pointer-events:none units require the existing companion button pointer-events:auto. Hotspots and exits stay original hit targets.
- Candidate contacts newly pass through scene ambient/world-post/grade: deliberate visible-tone difference, NOT authorization for filter/shadow changes. Parent/independent A/B must judge it. Shore↔camp980ms crossfade and previous-unit lifetime need explicit design/tests beforeD1; no root reparent/remount flicker or duplicate old props, no broad rewrite of other scenes. Current plan is not permission to bypass this transition risk.

### Expected20 front/back matrix — planned, NOT executed
H=human, C=whole cat, P=one actual prop. Order back→front by semanticfootY; equal H/C deterministic stable-id tie C beforeH. No .012 deadband or silhouette/bbox comparator. Every listed body/contact pair must share unit/rank. 

| case | prop | P.y | H.y | C.y | expected back→front |
|---|---|---:|---:|---:|---|
| 01 | mural-wall | 0.56 | 0.54 | 0.54 | C → H → P |
| 02 | mural-wall | 0.56 | 0.54 | 0.58 | H → P → C |
| 03 | mural-wall | 0.56 | 0.58 | 0.54 | C → P → H |
| 04 | mural-wall | 0.56 | 0.58 | 0.58 | P → C → H |
| 05 | gourd | 0.66 | 0.64 | 0.64 | C → H → P |
| 06 | gourd | 0.66 | 0.64 | 0.68 | H → P → C |
| 07 | gourd | 0.66 | 0.68 | 0.64 | C → P → H |
| 08 | gourd | 0.66 | 0.68 | 0.68 | P → C → H |
| 09 | east-gap | 0.68 | 0.66 | 0.66 | C → H → P |
| 10 | east-gap | 0.68 | 0.66 | 0.70 | H → P → C |
| 11 | east-gap | 0.68 | 0.70 | 0.66 | C → P → H |
| 12 | east-gap | 0.68 | 0.70 | 0.70 | P → C → H |
| 13 | break-shard | 0.70 | 0.68 | 0.68 | C → H → P |
| 14 | break-shard | 0.70 | 0.68 | 0.72 | H → P → C |
| 15 | break-shard | 0.70 | 0.72 | 0.68 | C → P → H |
| 16 | break-shard | 0.70 | 0.72 | 0.72 | P → C → H |
| 17 | driftwood | 0.72 | 0.70 | 0.70 | C → H → P |
| 18 | driftwood | 0.72 | 0.70 | 0.74 | H → P → C |
| 19 | driftwood | 0.72 | 0.74 | 0.70 | C → P → H |
| 20 | driftwood | 0.72 | 0.74 | 0.74 | P → C → H |

Additional guards: same-foot input permutation, .7200001 vs.72, no mutation/nonfinite rejection, actual-image raw→clean/lastReady/outgoing, original/blob cat alias and held-frame mismatch, mirror, repeated camera/viewport shifts, real production RAF (test-mode shortcut is insufficient), ready/unready contact, frame freeze and transition unmount. Normal+production suites/content/both builds followed by independent review and actual390×844/844×390/desktop20-pair/same-camera A/B. Existing322tests are baseline evidence, no new tests/build/GUI/server executed in this read-only round.


### D0 implementation boundary (implemented/reviewed14TSEi5o; historical proposal below)
Candidate files: `src/ui/Companion.tsx`(render actual display identity), `src/ui/catImage.ts`(alias notification only, preserve public loading/recovery), `src/ui/WalkLayer.tsx`(read actual cat display metadata for diagnostics/contact, not desiredcatSprite), proposed new `src/ui/catDisplay.ts`(lookup/alias registry, no fetch/Canvas), explicit local fixture metadata/tests. No source art changes or `SHORE_CAT_HEIGHT`/depthScale/logicalpost/companionFoot retuning in metadata stage.
Proposed contract: `type CatDisplay = { frameId:string; originalUrl:string; shownUrl:string; sourceWidth:number; sourceHeight:number; supportY:number|null; supportStatus:'legacy-declared'|'reviewed-bearing'|'unknown' }`. Existing976/1117 may be exposed ONLY as `legacy-declared`, not reviewed-bearing. `lookupCatDisplay(shownUrl:string):CatDisplay|null`; `registerCatAlias(originalUrl:string,blobUrl:string):void`. Initial raw identity derives from exact asset URL lookup via existing `trajAssetUrl(knownFrameId)`/asset map, NEVER current `frame` prop, which can be ahead of shownUrl. Fallback unknownURL has no fabricated support. Alias registration carries original record to blob on the existing successful request, no additional requests/cache invalidations. If visible image temporarily remains the previous frame, report previous record and keep its support/contact band; no new pose's976/1117 on an old bitmap. A later approved bearing record is not an automatic vertical translation; change displayY only in its own A/B after anatomical semantic review.
Red tests: desiredS2/actualrawS1 and actualblobS1 stayS1+legacy976; alias success preserves identity; unknownfallback staysunknown; promise pending/reject/recovery does not hide readycat or label fallback as processed; unmount late success safe; actual-image metadata/contact same source. SourceRGBA local-ROI metrics above lock source identity, not a body-height estimator. Real diagnostics must additionally record live DOM `img.currentSrc`, natural dimensions, rect, mirror, guide/clip/hop and logical projected foot together. This separates support-contract, animation phase and contact-layer hypotheses without retuning scale/shadow/depth.


## Latest D1 local execution — BLOCKED, not deployed

- D0 approved14TSEi5o and cue/Y-only snapshot frozen before D1 under `audit/ground-depth-20261111/before-source-manifest.json`.
- IMPORTANT correction to historical S1 pose inference: personally read `CAT-gourd-RAW-vs-ALPHA.png`; intact black fur leg/paw exists in softfix JPG but is missing from current RGBA. Earlier “original pose tucked/no planted leg” explanation is superseded. Alpha restoration is a separate scratch knife; this D1 changes NO asset, pivot, height, logical foot or shadow. D0 legacy976/1117 still are NOT reviewed-bearing coordinates.
- Local A–C implementation: actual full-world same-parent seven units, five shore props once, stable semantic Y/id ranks, actor+contact in unit, same-RAF imageRect-worldRect once, scenic gate remains back. During shore↔camp980ms bridge current/previous placed props are separate units; steady nonshore returns exact legacy branch. Contact filters/masks remain byte-identical, but contacts now pass through existing ambient/grade (deliberate visible tone change needing actual A/B).
- Tests cover20pure+20DOM matrix, ties/subpixel/no mutation/nonfinite rejection, productionRAF camera/viewport-origin invariance, within-scene threshold crossing DOM identity/no new cat request, E/click/ask and real production exit route, pending/unmatched contact recovery, per-unit transition counts/lifetime and reduced motion.12memory fixtures =3props×4human/cat front/back combinations; `depth-{gourd|east-gap|driftwood}-{bb|bf|fb|ff}`, fixed spawn-reference camera, only explicit freeze. East-gap human probe x.63/cat.65 respects existing SHORE_MARKER; opaque overlap still needs GUI proof. Explicit fixture-only `depth=legacy` gives D0 same-art/cue/Y-only comparison; normal play ignores it.
- BLOCKER reproduced using real production Traveler/FramePicture, decode-ready original, optional punch Promise pending: camp→shore→camp is visible until979ms, but at980ms removing shared root reparents/remounts Traveler and destroys its lastReady; no `.traveler-figure` remains. Same exact test with fixture-only D0 depth=legacy PASSES. See `transition-pending.txt`. Existing DOM count tests alone were insufficient to guarantee ready-image continuity. No assertion was removed/relaxed; this red test remains a release gate.
- Stop implementation per plan's structural-blocker rule. Do NOT publish this candidate or mix alpha/DUI. Recommended next scoped design: lift persistent presentation/FramePicture current/outgoing/lastReady and cat src state above the conditional depth DOM, so stateless view may reparent without losing asynchronous state; keep legacy DOM/layout and one load chain. This touches Traveler/Companion presentation ownership and needs a separately reviewed minimal plan + red→green proof. Alternative persistent depth host across nonshore would loosen the explicit legacy-DOM boundary and is NOT silently adopted. Delay980ms, blanket filters, first-frame hiding, or pretending cached processing is always instant are rejected.


## D1 persistent presentation local follow-up — test/build green, pending independent review

- Parent authorized persistent-owner correction at22:14 Asia/Shanghai. Pre-fix real production980ms red and unchanged legacy control preserved under `audit/persistent-presentation-20261111/`; no release of prior blocked `ye8z9NJF`.
- WalkLayer unconditionally owns both presentation hooks; Traveler owner includes motion/first-ready, absolute crossfade deadline, two independent complete resource/processing/lastReady/retry/live slots; Companion owner holds unchanged src/loading effect. Only pure Views enter legacy/depth conditional DOM. No new cache/extra actor owner/globalraw bypass/all-scene host/delay980.
- View reparent does not restart resource effect, online listener, motion RAF or fade deadline. New outgoing DOM gets one mount-only negative animation delay. Logical new frame transition may start its own token/deadline as before; owner is never keyed by scene/sharedDepth.
- Final verification: ordinary and fixed-origin production suites each62files415tests0fail; content check and both guarded builds exit0. Test logs include red→green transition, both-direction/980-before quickreturn, pending current/outgoing, rejection/5sretry/online recovery, stale and unmountlate, catactual/unknown/freeze. 138assets and262original files unchanged. Only3business files changed since blockedD1, plus6-test file; hashes/diffs/manifests in audit folder. Normal DOM boundary remains legacy outside shore bridge.
- Production local package `index-BNHq1dML.js`, `index-6mFlvVh9.css`, `WalkLayer-B4EwhfXi.js`. Not deployed; independent review and actual browser A/B still required. No claim about visible improvement/absence of browser flicker. Alpha-restoration source correction remains separate and frozen here.


## Candidate hearth pool ownership follow-up — scoped design before implementation

The real BNH gourd-bf/legacy stills show the near stone/cue warmer. Verified cause: .68>.64 legacy prop near z7 above original exit pool z6; D1 root z2 traps all prop ranks below that pool. No grade/shoe/alpha change is justified. Minimal plan in audit/hearth-light-depth-20261111/DESIGN.md: preserve seven real sibling units, clone only decorative emitter into existing full-world traveler unit at unchanged gate coordinates, suppress only the candidate-world direct button pseudo; keep original exit hitbox/UI, warm CSS, owner/loading/980 untouched. Restore old strict > human-foot property ownership through existing rank, no new host/cache/mask. Red tests then local full regressions/builds; no deployment.


### Hearth ownership integration — local green, pending independent review

- Conflict retained under audit/hearth-light-depth-20261111/conflict-snapshot-2316 with metadata/SHA and unassigned origin explicitly noted; no mechanical rollback. Parent renewed sole writer23:16 Asia/Shanghai. Stable observation and each-stage307-source hash guards saw no new drift.
- Retained candidate-only emitter/CSS boundary fix. Corrected only its gate source: always-on hearthLightGate/hearthLightAt, not original near-only name gate. Original name logic, warm-field geometry/gradient/blur, button hit/UI and seven sibling depth units unchanged. Pool is above human/sole inside its existing full-world unit, below front props by rank; no shade/grade compensation.
- Both existing red suites retained, extra near-name contract. Target77pass; final ordinary/production each64files438pass0fail (count includes two overlapping test files retained for provenance). content and both guarded builds pass. 138assets/262original unchanged; original980ms regression and persistent owners still pass.
- Local reviewed-candidate build only: index-CyrwyMw_.js, index-B6MC2xmq.css, WalkLayer-BQdkCuLP.js; all manifests/diffs/logs in audit/hearth-light-depth-20261111. No publishing/server/browser/git/cloud action. Source/DOM contracts are not actual visual acceptance; pending independent review then authorized A/B only.
