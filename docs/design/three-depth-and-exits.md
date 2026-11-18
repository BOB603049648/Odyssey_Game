# Third pass: movement depth and scenic exits

Feedback: the lighting-only prototype did not communicate enough 2.5D depth, and scene-exit labels felt detached from the paintings.

The painting now uses a subdivided image-relief mesh. Scene-specific weights distinguish distant scenery, intermediate structures, the registered gameplay stage and outer foreground. Traveler movement and a small desktop pointer look drive a smoothed, bounded offset. Distant areas and the outer foreground move in opposite directions. This is image-based 2.5D relief; it does not recover hidden surfaces or enable free camera rotation.

All current interaction points and travel thresholds have zero relief weight. Shore landmarks and the bridge centerline are explicitly protected. Cutout meshes use the same weight field and refined triangles to keep their sampled image aligned with the background. Paused/background states hold the offset; reduced motion returns to the neutral image.

`ScenicExit` replaces live-game floating exit dots/rectangular labels. Side routes use weathered wood direction signs, the shore/hall route uses a threshold/door frame, and north/south routes use ground-facing chevrons. Destination names are part of signs; ground-arrow names appear only nearby or on keyboard focus. Native buttons retain the original accessible destination name and pass the unchanged gate to the movement controller. The route menu remains available. Travel/exit status messages remain screen-reader announcements, while blocked-ground feedback remains visible.

Verification: production build and 106 targeted tests across eight files passed. Tests protect all prop/exit registrations, relief direction/bounds, accessible scenic-button activation, navigation, puzzles and content. The managed Sites environment lacks its `cua_repl.js` browser tool, so no fresh browser screenshot or visual-acceptance claim is made for this pass. Existing Playwright scripts are retained for a compatible environment and have not been executed for this pass.

The existing owner-private Site is updated without changing its audience. The hosted source is a compiled static snapshot of the local game branch; its manifest, source commit and deployment result are retained separately from the original repository.
