#!/usr/bin/env python3
"""Fill closed interior alpha holes in the 奈奈茶 (nanaicha) cutouts.

The delivered shore cat lost the muzzle/face fur and a strip of the cloak
flank: those pixels are fully transparent but unreachable from the canvas
border, so the character composites with a hole where the face should be.
That is the "transparent body / black silhouette" defect.

Rules kept from the existing art contract:
  * only closed interiors (never border-reachable background)
  * only components at least MIN_HOLE_PX large, so slits between paws and
    under the belly still show the scene through
  * opaque pixels, exterior transparency, eyes and the foot anchor are untouched

Colour: the hole is grown inward from its rim (frontier mean), then blended
toward the lit fur sampled just above the hole, with a vertical falloff so the
top stays in hood shadow and the muzzle catches the same light as the head.

Usage:
  python3 scripts/restore_cat_interior_alpha.py [--dry-run]
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

MIN_HOLE_PX = 800
HOLE_ALPHA = 16
SEED = 11

TARGETS = [
    ROOT / "src/assets/art/slots/art.shore.prop.nanaicha.png",
]


def border_reachable(transparent: np.ndarray) -> np.ndarray:
    """Flood the transparent area from the canvas border (8-connected)."""
    h, w = transparent.shape
    outside = np.zeros((h, w), dtype=bool)
    dq: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if transparent[y, x] and not outside[y, x]:
                outside[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if transparent[y, x] and not outside[y, x]:
                outside[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not outside[ny, nx]:
                    outside[ny, nx] = True
                    dq.append((ny, nx))
    return outside


def large_closed_holes(alpha: np.ndarray, min_px: int) -> np.ndarray:
    holes = (alpha < HOLE_ALPHA) & ~border_reachable(alpha < HOLE_ALPHA)
    h, w = holes.shape
    keep = np.zeros_like(holes)
    seen = np.zeros_like(holes)
    for y in range(h):
        for x in range(w):
            if not holes[y, x] or seen[y, x]:
                continue
            dq = deque([(y, x)])
            seen[y, x] = True
            pixels: list[tuple[int, int]] = []
            while dq:
                cy, cx = dq.popleft()
                pixels.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and holes[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        dq.append((ny, nx))
            if len(pixels) >= min_px:
                for cy, cx in pixels:
                    keep[cy, cx] = True
    return keep


def grow_inward(rgb: np.ndarray, hole: np.ndarray) -> np.ndarray:
    """Frontier-mean fill: each new layer takes the mean of its known neighbours."""
    out = rgb.astype(np.float64).copy()
    known = ~hole
    pending = hole.copy()
    while pending.any():
        acc = np.zeros_like(out)
        count = np.zeros(out.shape[:2])
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shifted_known = np.roll(known, (dy, dx), axis=(0, 1))
            shifted_rgb = np.roll(out, (dy, dx), axis=(0, 1))
            take = pending & shifted_known
            acc = np.where(take[..., None], acc + shifted_rgb, acc)
            count += take
        fillable = pending & (count > 0)
        out = np.where(fillable[..., None], acc / np.maximum(count, 1)[..., None], out)
        known |= fillable
        pending &= ~fillable
        if not fillable.any():
            break
    return out


def restore(path: Path, dry_run: bool) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    array = np.array(image)
    alpha = array[..., 3]
    rgb = array[..., :3].astype(np.float64)
    hole = large_closed_holes(alpha, MIN_HOLE_PX)
    filled = int(hole.sum())
    if filled == 0:
        return {"path": str(path.relative_to(ROOT)), "filled": 0}

    ys, xs = np.nonzero(hole)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()

    known = ~hole
    ring = np.zeros_like(known)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
        ring |= np.roll(hole, (dy, dx), axis=(0, 1))
    ring &= known
    rim_colour = np.median(rgb[ring], axis=0)

    # Lit fur: the brightest opaque pixels in the band just above the hole.
    band_y0 = max(0, top - 70)
    band_x0 = max(0, left - 25)
    band_rgb = rgb[band_y0:top, band_x0:min(rgb.shape[1], right + 25)]
    band_alpha = alpha[band_y0:top, band_x0:min(rgb.shape[1], right + 25)]
    opaque = band_alpha > 200
    if opaque.any():
        lum = 0.299 * band_rgb[..., 0] + 0.587 * band_rgb[..., 1] + 0.114 * band_rgb[..., 2]
        lit = band_rgb[opaque & (lum > np.percentile(lum[opaque], 75))]
        fur = np.median(lit, axis=0) if lit.size else rim_colour
    else:
        fur = rim_colour

    grown = grow_inward(rgb, hole) * 0.35 + rim_colour * 0.65
    grad = np.clip((np.arange(rgb.shape[0])[:, None] - top) / max(1, bottom - top), 0, 1)
    mix = (0.30 + 0.45 * grad)[..., None]
    target = rim_colour * (1 - mix) + fur * mix
    patch = np.where(hole[..., None], grown * 0.35 + target * 0.65, grown)
    patch = patch + np.random.default_rng(SEED).normal(0, 3.5, patch.shape)
    patch = np.array(
        Image.fromarray(np.clip(patch, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    ).astype(np.float64)

    out = array.copy()
    out[..., :3] = np.where(hole[..., None], patch, array[..., :3])
    rim = Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
    out[..., 3] = np.where(hole, 255, np.maximum(alpha, np.array(rim)))

    if not dry_run:
        Image.fromarray(out).save(path)
    return {"path": str(path.relative_to(ROOT)), "filled": filled}


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    for target in TARGETS:
        if not target.exists():
            print(f"missing {target}")
            continue
        result = restore(target, dry_run)
        print(f"{result['path']}: filled {result['filled']} px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
