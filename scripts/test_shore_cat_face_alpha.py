#!/usr/bin/env python3
"""Face-window alpha contract for restored shore cat traj frames."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image
import numpy as np

# Reuse helpers
sys.path.insert(0, str(Path(__file__).resolve().parent))
from restore_shore_cat_interior import FRAMES, interior_holes, foot_y

ROLLBACK = Path("/workspace/playtest/cat-face-restore-20261110/rollback-originals")


def load(p):
    return np.array(Image.open(p).convert("RGBA"))


def tight_zero_frac(arr, box):
    x0, y0, x1, y1 = box
    win = arr[y0 : y1 + 1, x0 : x1 + 1, 3]
    return float((win == 0).mean()), float((interior_holes(arr[:, :, 3])[y0 : y1 + 1, x0 : x1 + 1]).mean())


def has_blue_eyes(arr, box):
    x0, y0, x1, y1 = box
    r, g, b, a = [arr[y0 : y1 + 1, x0 : x1 + 1, i] for i in range(4)]
    m = (a >= 16) & (b > 100) & (b > r + 40) & (b > g + 20)
    return int(m.sum())


def main() -> int:
    errors = []
    for name, spec in FRAMES.items():
        cur = load(spec["cur"])
        bak = load(ROLLBACK / spec["cur"].name)
        box = spec["tight"]
        z, h = tight_zero_frac(cur, box)
        zb, hb = tight_zero_frac(bak, box)
        # Backup still has the documented hole (so rollback is the pre-fix asset).
        if zb < 0.5:
            errors.append(f"{name}: rollback tight a==0 is {zb:.3f}, expected a holed original")
        if z > 0.02:
            errors.append(f"{name}: restored tight a==0 is {z:.3f}, expected <=0.02")
        if h > 0.02:
            errors.append(f"{name}: restored tight interior-hole frac is {h:.3f}")
        if foot_y(cur) != foot_y(bak):
            errors.append(f"{name}: foot Y changed {foot_y(bak)} -> {foot_y(cur)}")
        # Originally opaque pixels: alpha must stay bit-identical; RGB may
        # move slightly because the shipped file is quality=95 exact-alpha
        # WebP under the 300KB first-paint cap. A lossless pixel clone is
        # kept next to the rollback originals for independent rollback.
        keep = bak[:, :, 3] >= 16
        if not np.array_equal(cur[keep, 3], bak[keep, 3]):
            errors.append(f"{name}: existing opaque-pixel alpha was modified")
        rgb_mad = np.abs(cur[keep, :3].astype(np.int16) - bak[keep, :3].astype(np.int16)).mean()
        if rgb_mad > 2.0:
            errors.append(f"{name}: existing opaque RGB mean abs diff {rgb_mad:.3f} > 2")
        # Exterior sample: corners must stay transparent.
        corners = cur[0, 0, 3], cur[0, -1, 3], cur[-1, 0, 3], cur[-1, -1, 3]
        if max(corners) != 0:
            errors.append(f"{name}: canvas corners are not transparent: {corners}")
        eyes = has_blue_eyes(cur, box)
        if eyes < 40:
            errors.append(f"{name}: too few blue-eye pixels in tight window ({eyes})")
        print(f"OK-check {name}: tight0={z:.4f} hole={h:.4f} foot={foot_y(cur)} eyes={eyes} rollback_tight0={zb:.3f}")
    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
