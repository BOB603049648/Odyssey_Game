# Model-authored foreground refinement

Generated with OpenAI image generation, using the existing shore/hall paintings and first-pass transparent selections as references. PNG files here are copies of the unmodified generated results. Production WebP versions only remove transparent canvas padding and use lossless encoding; `scripts/pack-spatial-cutouts.py` verifies visible RGBA and alpha equality and writes the original coordinate rectangles.

| Asset | Generated original under `/workspace/generated_images/` |
| --- | --- |
| shore-atlas.png | exec-94a5d7f8-4dae-4eff-9bf7-c440bc5baeee.png |
| hall-atlas.png | exec-09097e6e-65f2-48b2-8482-fdc069eff890.png |
| gate.png | exec-cbe2f5a1-ffd1-4a34-8480-77e540d25cc9.png |
| mural.png | exec-c9065ef4-87d0-4727-b57a-396d786d21cc.png |
| spring.png | exec-6daf94ae-2f64-4222-b926-db142c266fbd.png |
| spring-empty.png | exec-9e04ad11-6d86-4e76-b7fb-af06ffc266b9.png |
| waystone.png | exec-1385892b-d89b-4f51-a581-6d84179b29f6.png |

An intermediate full-frame empty-spring version, `exec-2f556608-8c66-49b8-920b-b86fc0a94fcd.png`, was used as the reference for the isolated empty basin and is retained in the generation directory. It is not an extra runtime download. Some model outputs differ by one pixel in canvas width; each file retains its own dimensions in the normalized UV registration.

The task was restrained silhouette/texture refinement: preserve the painted art direction, exact composition and object positions, retain original decorative glyphs, use true transparent holes and remove contaminated or fragmented contours. This art remains fictional game imagery; it is not documentation of a historical script.
