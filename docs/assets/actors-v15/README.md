# Painted actor sources

OpenAI image generation authored these seven results against the existing island paintings and villagers. PNGs are unmodified copies of the generated outputs, preserved outside the runtime asset glob.

| Source | Original in `/workspace/generated_images/` |
| --- | --- |
| idle.png | exec-37f8e175-721a-4855-a95b-2d5c73000592.png |
| walk.png | exec-7b18f32d-3158-4405-ad35-5396d35b1c81.png |
| action.png | exec-74782211-ad6f-4808-8955-db07d57562be.png |
| settle.png | exec-139b2bbd-cf97-47c4-8852-5d5ae16e4cb8.png |
| cat.png | exec-678de351-4ed0-499e-ab3c-8c750ec0f22e.png |
| cat-performance.png | exec-999e329b-f173-4d00-8113-1452bfe83014.png |
| cat-leap.png | exec-ff3595dc-8d31-4b54-b2aa-2d28a6aa1178.png |

`scripts/pack-painted-actors.py` encodes runtime WebP at Q95 with the BGRA input path, verifies exact alpha and bounded opaque RGB error, and records source/runtime hashes. It also measures frame coordinates, body axes and sole baselines. It does not repaint, blur or recolor the source artwork. Runtime registration adjusts each sheet's presentation scale; short seated poses retain their short height. All characters and costumes are fictional.
