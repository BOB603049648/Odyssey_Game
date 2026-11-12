#!/usr/bin/env python3
"""Guard: mid-air guide frames must not carry a ground shadow or read as black cutouts.

For leap-01 / leap-02, against the delivered originals in docs/assets/nanaicha/:
  * no opaque run 120 px or wider in the bottom 12% band (that was the baked disc)
  * median body luminance at least 24 (they were 15-19 and read as silhouettes)
  * the silhouette keeps at least 92% of the original body area (no limb lost)
  * canvas size unchanged

Prints PASS or the first failure.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ["leap-01", "leap-02"]
MIN_MEDIAN_LUM = 24.0
MAX_BOTTOM_RUN = 120
MIN_AREA_RATIO = 0.92


def wide_bottom_run(alpha: np.ndarray) -> int:
    h, w = alpha.shape
    widest = 0
    for y in range(int(h * 0.88), h):
        row = alpha[y] > 16
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            start = x
            while x < w and row[x]:
                x += 1
            widest = max(widest, x - start)
    return widest


def main() -> int:
    for name in FRAMES:
        cur = np.array(Image.open(ROOT / f"src/assets/companion/nanaicha/traj/{name}.png").convert("RGBA"))
        old = np.array(Image.open(ROOT / f"docs/assets/nanaicha/{name}.original.png").convert("RGBA"))
        if cur.shape != old.shape:
            print(f"FAIL {name} canvas changed")
            return 1
        widest = wide_bottom_run(cur[..., 3])
        if widest > MAX_BOTTOM_RUN:
            print(f"FAIL {name} still has a {widest} px wide shadow run at the bottom")
            return 1
        body = cur[..., 3] > 200
        rgb = cur[..., :3][body].astype(float)
        median = float(np.median(0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]))
        if median < MIN_MEDIAN_LUM:
            print(f"FAIL {name} median luminance {median:.1f} still silhouette-dark")
            return 1
        area_ratio = body.sum() / max(1, int((old[..., 3] > 200).sum()))
        if area_ratio < MIN_AREA_RATIO:
            print(f"FAIL {name} lost {100 * (1 - area_ratio):.1f}% of its body")
            return 1
    print("PASS leap frames carry no ground shadow and keep their body")
    return 0


if __name__ == "__main__":
    sys.exit(main())
