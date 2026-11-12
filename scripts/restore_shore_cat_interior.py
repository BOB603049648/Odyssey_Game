#!/usr/bin/env python3
"""Restore closed interior alpha holes in shore cat traj frames.

Source of original face-fur pixels: odyssey-art softfix-raw JPEGs, registered
with a measured integer shift. Only 4-connected closed interiors (not
border-reachable background) are filled. Existing opaque pixels, exterior
transparency, pose, eyes, gourd, and foot anchors are left unchanged.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ROLLBACK = Path("/workspace/playtest/cat-face-restore-20261110/rollback-originals")
EVIDENCE = Path("/workspace/playtest/cat-face-restore-20261110/restored-assets")
# First-paint contract in loadGate.test.ts: shore traj webp < 300KB.
# quality=95 + exact=True keeps alpha bit-identical and stays under that cap.
SHIP_WEBP_QUALITY = 95

FRAMES = {
    "gourd": {
        "cur": ROOT / "src/assets/companion/nanaicha/traj/land-shore-gourd.webp",
        "raw": Path("/workspace/odyssey-art/nanaicha/traj/raw/land-shore-gourd-softfix-raw.jpg"),
        "shift": (-6, 0),  # (dy, dx) applied to the raw with np.roll
        "tight": (612, 514, 734, 600),
    },
    "driftwood": {
        "cur": ROOT / "src/assets/companion/nanaicha/traj/land-shore-driftwood.webp",
        "raw": Path("/workspace/odyssey-art/nanaicha/traj/raw/land-shore-driftwood-softfix-raw.jpg"),
        "shift": (-2, -1),
        "tight": (485, 526, 599, 604),
    },
    "east-gap": {
        "cur": ROOT / "src/assets/companion/nanaicha/traj/land-shore-east-gap.webp",
        "raw": Path("/workspace/odyssey-art/nanaicha/traj/raw/land-shore-east-gap-softfix-raw.jpg"),
        "shift": (-7, 4),
        "tight": (569, 366, 680, 455),
    },
}


def interior_holes(alpha: np.ndarray, thr: int = 16) -> np.ndarray:
    outside = alpha < thr
    vis = np.zeros_like(outside)
    vis[0] = outside[0]
    vis[-1] = outside[-1]
    vis[:, 0] = outside[:, 0]
    vis[:, -1] = outside[:, -1]
    vis &= outside
    changed = True
    steps = 0
    limit = max(alpha.shape)
    while changed and steps < limit:
        steps += 1
        nxt = vis.copy()
        nxt[1:] |= vis[:-1]
        nxt[:-1] |= vis[1:]
        nxt[:, 1:] |= vis[:, :-1]
        nxt[:, :-1] |= vis[:, 1:]
        nxt &= outside
        changed = not np.array_equal(nxt, vis)
        vis = nxt
    return outside & ~vis


def restore(cur: np.ndarray, raw: np.ndarray, dy: int, dx: int) -> tuple[np.ndarray, np.ndarray]:
    holes = interior_holes(cur[:, :, 3])
    shifted = np.roll(np.roll(raw, dy, 0), dx, 1)
    out = cur.copy()
    out[holes, :3] = shifted[holes, :3]
    out[holes, 3] = 255
    if not np.array_equal(out[~holes], cur[~holes]):
        raise RuntimeError("restore mutated pixels outside closed holes")
    return out, holes


def foot_y(arr: np.ndarray) -> int:
    rows = np.where((arr[:, :, 3] >= 16).any(1))[0]
    return int(rows[-1])


def main() -> None:
    evidence = EVIDENCE
    evidence.mkdir(parents=True, exist_ok=True)
    for name, spec in FRAMES.items():
        source = ROLLBACK / spec["cur"].name
        if not source.exists():
            raise FileNotFoundError(f"rollback original missing: {source}")
        cur = np.array(Image.open(source).convert("RGBA"))
        raw = np.array(Image.open(spec["raw"]).convert("RGBA"))
        dy, dx = spec["shift"]
        out, holes = restore(cur, raw, dy, dx)
        if foot_y(out) != foot_y(cur):
            raise RuntimeError(f"{name}: foot Y changed {foot_y(cur)} -> {foot_y(out)}")
        Image.fromarray(out).save(evidence / f"{spec['cur'].stem}-restored-lossless.webp", format="WEBP", lossless=True, exact=True)
        Image.fromarray(out).save(evidence / f"{spec['cur'].stem}-restored.png")
        Image.fromarray(out).save(
            spec["cur"], format="WEBP", quality=SHIP_WEBP_QUALITY, method=6, exact=True
        )
        size = spec["cur"].stat().st_size
        print(f"wrote {spec['cur']} filled={int(holes.sum())} foot={foot_y(out)} bytes={size} q={SHIP_WEBP_QUALITY}")


if __name__ == "__main__":
    main()
