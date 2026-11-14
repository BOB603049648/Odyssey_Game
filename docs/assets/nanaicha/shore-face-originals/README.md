# Shore face regression originals

These three WebP files are unmodified assets from commit
`b57f27b` in this repository, under `src/assets/companion/nanaicha/traj/`.
They preserve the pre-restoration face holes used by
`scripts/test_shore_cat_face_alpha.py` to check face opacity, existing opaque
pixels, blue eyes and foot anchors. They are test fixtures, not runtime assets.

Keeping the originals in Git makes the comparison work in a fresh clone,
including shallow CI checkouts, without the original artist's workspace.
