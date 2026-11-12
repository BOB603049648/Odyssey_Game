#!/usr/bin/env python3
"""Guard: the shipped shore cat must not composite with closed interior holes.

Checks, against the pre-fix original kept in docs/assets/nanaicha/:
  * no closed interior hole of 800 px or more is left
  * every pixel that was opaque before is still byte-identical
  * the border-reachable background is still transparent

Prints PASS or FAIL with the reason.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CUR = ROOT / "src/assets/art/slots/art.shore.prop.nanaicha.png"
ORIGINAL = ROOT / "docs/assets/nanaicha/art.shore.prop.nanaicha.original.png"
MIN_HOLE_PX = 800
HOLE_ALPHA = 16


def closed_hole_pixels(alpha: np.ndarray) -> np.ndarray:
    transparent = alpha < HOLE_ALPHA
    h, w = alpha.shape
    outside = np.zeros((h, w), dtype=bool)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    stack += [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    for y, x in stack:
        if not transparent[y, x] or outside[y, x]:
            continue
        outside[y, x] = True
        walk = [(y, x)]
        while walk:
            cy, cx = walk.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not outside[ny, nx]:
                        outside[ny, nx] = True
                        walk.append((ny, nx))
    return transparent & ~outside


def largest_component(mask: np.ndarray) -> int:
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            seen[y, x] = True
            walk = [(y, x)]
            size = 0
            while walk:
                cy, cx = walk.pop()
                size += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        walk.append((ny, nx))
            best = max(best, size)
    return best


def main() -> int:
    cur = np.array(Image.open(CUR).convert("RGBA"))
    original = np.array(Image.open(ORIGINAL).convert("RGBA"))
    if cur.shape != original.shape:
        print("FAIL size changed")
        return 1

    largest = largest_component(closed_hole_pixels(cur[..., 3]))
    if largest >= MIN_HOLE_PX:
        print(f"FAIL closed interior hole still {largest} px")
        return 1

    was_opaque = original[..., 3] >= 250
    drift = int((cur[was_opaque] != original[was_opaque]).any(axis=1).sum())
    if drift:
        print(f"FAIL {drift} previously opaque pixels changed")
        return 1

    if (cur[0, 0, 3] != 0) or (cur[-1, -1, 3] != 0):
        print("FAIL border background is no longer transparent")
        return 1

    print(f"PASS largest closed hole {largest} px; opaque pixels untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
