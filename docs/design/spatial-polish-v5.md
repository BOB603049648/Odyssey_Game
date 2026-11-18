# Shore and hall spatial polish

The shared `PaintedStage` now reads authored scene configurations. `ShoreStage` remains a compatibility export for earlier inspection tools. Enhanced shore and hall use this spatial renderer; camp, yard, path and night keep their earlier painted/relief view.

## Art and materials

Three OpenAI image-generation edits were added: a registered shore foreground extraction, a clean hall background/floor, and a hall foreground extraction. All source images remain untouched. Original paintings supply prop RGB; the extracted alpha channel alone supplies coverage. This intentionally ignores generated RGB edge colors. The same alpha source and cutoff are applied to the visible material and custom shadow-depth material. Prop masks preserve holes and finer silhouettes within their authored geometry bounds.

Shore gate posts now have solid timber backs and stone feet. Companion airborne presentation lifts above its grounded contact shadow, which softens and expands during the lift.

## Hall

The interior has a horizontal wood floor, a back-wall plane, independently placed near columns, reading stand, symbol rail, hanging knot and threshold. A slightly wider camera composition and modest column placement changes keep the foreground frame visible. Window-direction lighting, a local warm fill, restrained beam surfaces and world-space dust relate to the actual camera. Beam surfaces are illustrative effects rather than physically integrated volumetric lighting.

Reading furniture has finite navigation footprints. The northern aisle remains traversable. Prop clicks approach a reachable front edge, while ordinary ground clicks and keyboard movement respect the same collision predicate. This prevents walking through stands without making inscriptions unreachable.

## Controls and wayfinding

Hall exit chevrons lie on the floor and become clearer nearby. Selected route dashes and destination rings also lie on the real ground. The optional walkable-ground overlay is conservatively generated from the existing collision predicate; cells crossing obstacles are omitted.

Native prop buttons project their world bounding boxes through the live camera and keep a minimum 44-pixel target. Their original width, height, transform and translation are restored on leaving spatial mode. A mutation observer includes buttons replaced by puzzle state changes. Ground picking, visible props, and click controls therefore share the same projection, including the hall's wider view.

## Verification

Production build and 139 targeted tests across fifteen files passed. Checks cover previous navigation/content behavior, furniture collision and routes, front-side interaction, projection/picking, generated-mask ownership, airborne contact, ground guides and control restoration.

Offline geometry exports of shore and hall were rendered in Blender and inspected for structure. The renderer now follows the exported ambient/sun direction and floor-extension rule. Those images omit Three.js post, procedural sign text and shaft shaders; they are not browser screenshots. No fresh browser visual QA was possible because the managed Sites environment has no `cua_repl.js`; no replacement browser server was started.

The new PNG alpha files were checked for matching 1672×941 dimensions and substantial fully transparent background. Full browser playthrough, target-device performance and fine visual acceptance remain outstanding. Four more scenes still require clean plates, spatial props and per-scene floor/entry design.
