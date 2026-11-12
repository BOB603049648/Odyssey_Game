#!/usr/bin/env python3
"""Repair the two mid-air guide frames (leap-01 / leap-02).

Two defects, both engine-visible because the leap plays against bright fog:

1. A baked elliptical contact shadow sits under the body although the cat is
   airborne. The engine already fades its own contact shadow with lift, so the
   painted one left a dark disc floating in mid-air. Any shadow-coloured blob
   that is a separate connected component in the lower band is removed.
2. The body is delivered far darker than the landings it connects (median
   luminance ~15-19 vs ~40 on the shore), so the hop reads as a black cutout.
   A gamma lift, a small gain and a touch of warmth bring it into the same
   tonal family without touching the silhouette.

Feet and the opaque silhouette are otherwise left as delivered.

Usage:
  python3 scripts/fix_leap_frames.py [--dry-run]
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

FRAMES = [
    ROOT / "src/assets/companion/nanaicha/traj/leap-01.png",
    ROOT / "src/assets/companion/nanaicha/traj/leap-02.png",
]

GAMMA = 0.82
GAIN = 1.12
WARM = np.array([-2.0, 0.0, 4.0])  # slight cool-out: landings read warm-dark
SHADOW_BAND = 0.80  # only look below this fraction of the canvas height
SHADOW_MIN_PX = 2500
SHADOW_MAX_LUM = 70.0


def components(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    h, w = mask.shape
    seen = np.zeros_like(mask)
    found: list[list[tuple[int, int]]] = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            seen[y, x] = True
            dq = deque([(y, x)])
            pixels: list[tuple[int, int]] = []
            while dq:
                cy, cx = dq.popleft()
                pixels.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            dq.append((ny, nx))
            found.append(pixels)
    return found


def strip_baked_shadow(array: np.ndarray) -> int:
    alpha = array[..., 3]
    rgb = array[..., :3].astype(np.float64)
    h = array.shape[0]
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    band_top = int(h * SHADOW_BAND)
    removed = 0
    for pixels in components(alpha > 16):
        if len(pixels) < SHADOW_MIN_PX:
            continue
        ys = [p[0] for p in pixels]
        # Only a blob that lives entirely in the lower band can be the baked disc;
        # the body always reaches further up and stays.
        if min(ys) < band_top:
            continue
        if float(np.median(lum[[p[0] for p in pixels], [p[1] for p in pixels]])) > SHADOW_MAX_LUM:
            continue
        for y, x in pixels:
            array[y, x, 3] = 0
        removed += len(pixels)
    return removed


def strip_wide_runs(array: np.ndarray) -> int:
    """leap-02 carries a shadow disc fused to nothing but its own shadow.

    It is a wide, shallow ellipse at the very bottom: rows 1050-1143 hold a
    single opaque run about 227 px wide, while every paw run stays under 70 px.
    Remove opaque runs that are both wide and near the bottom; grouped, they
    must still look like a disc (wide and short) so no leg is ever taken.
    """
    alpha = array[..., 3]
    h, w = alpha.shape
    band_top = int(h * 0.88)
    taken = np.zeros_like(alpha, dtype=bool)
    for y in range(band_top, h):
        row = alpha[y] > 16
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            start = x
            while x < w and row[x]:
                x += 1
            if x - start >= 120:
                taken[y, start:x] = True
    removed = 0
    for pixels in components(taken):
        ys = [p[0] for p in pixels]
        xs = [p[1] for p in pixels]
        if (max(xs) - min(xs)) < 120 or (max(ys) - min(ys)) > 140:
            continue
        for y, x in pixels:
            array[y, x, 3] = 0
        removed += len(pixels)
    return removed


def lift(array: np.ndarray) -> None:
    alpha = array[..., 3]
    body = alpha > 16
    rgb = array[..., :3].astype(np.float64) / 255.0
    lifted = np.power(np.clip(rgb, 0, 1), GAMMA) * GAIN * 255.0 + WARM
    array[..., :3] = np.where(body[..., None], np.clip(lifted, 0, 255), array[..., :3]).astype(np.uint8)


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    for frame in FRAMES:
        image = Image.open(frame).convert("RGBA")
        array = np.array(image)
        removed = strip_baked_shadow(array) + strip_wide_runs(array)
        lift(array)
        # Soften the fresh cut edge left where the shadow disc was.
        if removed:
            soft = Image.fromarray(array[..., 3]).filter(ImageFilter.GaussianBlur(0.6))
            array[..., 3] = np.minimum(array[..., 3], np.array(soft))
        if not dry_run:
            Image.fromarray(array).save(frame)
        print(f"{frame.relative_to(ROOT)}: removed {removed} shadow px, lifted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
