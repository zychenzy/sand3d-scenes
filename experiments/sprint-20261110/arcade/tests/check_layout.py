#!/usr/bin/env python3
"""Footprint and asset checks for the retro arcade layout. No browser required."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
ROOM = LAYOUT["meta"]["room"]
HALF_W = ROOM["width"] / 2
HALF_D = ROOM["depth"] / 2

# GLB bounds after the root millimetre scale, before targetHeight.
NATIVE = {
    "bar_stool": (0.464, 0.536, 0.464),
    "speaker": (0.231, 0.105, 0.081),
    "flowerpot": (0.250, 0.204, 0.250),
}
FLOOR_PROPS = set(NATIVE)
WALL_MOUNT = {"neon", "mural"}
SKIP_OVERLAP = WALL_MOUNT | {"halfwall"}


def aabb(cx, cz, w, d, yaw):
    hw, hd = w / 2, d / 2
    c, s = math.cos(yaw), math.sin(yaw)
    xs, zs = [], []
    for x in (-hw, hw):
        for z in (-hd, hd):
            xs.append(cx + x * c + z * s)
            zs.append(cz - x * s + z * c)
    return min(xs), max(xs), min(zs), max(zs)


def hits(a, b, pad=0.0):
    return not (a[1] < b[0] + pad or b[1] < a[0] + pad or a[3] < b[2] + pad or b[3] < a[2] + pad)


def main():
    errors = []
    blocks = []
    for spec in LAYOUT["blocks"]:
        box = aabb(spec["x"], spec["z"], spec["w"], spec["d"], spec.get("yaw") or 0)
        blocks.append((spec, box))
        if box[0] < -HALF_W + 0.04 or box[1] > HALF_W - 0.04 or box[2] < -HALF_D + 0.04 or box[3] > HALF_D - 0.04:
            errors.append(f"{spec['id']} leaves the room {tuple(round(v, 3) for v in box)}")
        if spec.get("mount") == "wall":
            continue
        for zone in LAYOUT["clear"]:
            zx0, zz0 = zone["min"]
            zx1, zz1 = zone["max"]
            if hits(box, (zx0, zx1, zz0, zz1)):
                errors.append(f"{spec['id']} blocks clear zone {zone['id']}")

    floor = [(s, b) for s, b in blocks if s["kind"] not in SKIP_OVERLAP and s.get("mount") != "wall"]
    for i, (sa, ba) in enumerate(floor):
        for sb, bb in floor[i + 1 :]:
            if hits(ba, bb, pad=0.02):
                errors.append(f"overlap {sa['id']} x {sb['id']}")

    variants = {s["variant"] for s, _ in blocks if s["kind"] == "upright" and s.get("variant")}
    if variants != {"classic", "deluxe", "tall", "candy", "mono"}:
        errors.append(f"upright variants drifted: {sorted(variants)}")
    kinds = {s["kind"] for s, _ in blocks}
    for need in ("pinball", "blaster", "cocktail", "racing", "counter", "neon", "mural"):
        if need not in kinds:
            errors.append(f"missing kind {need}")

    for kind, spec in LAYOUT["assets"].items():
        path = (ROOT / spec["glb"]).resolve()
        if not path.is_file():
            errors.append(f"missing glb for {kind}: {spec['glb']}")

    for inst in LAYOUT["instances"]:
        if inst["kind"] not in FLOOR_PROPS:
            continue
        nx, ny, nz = NATIVE[inst["kind"]]
        scale = LAYOUT["assets"][inst["kind"]]["targetHeight"] / ny
        x, _, z = inst["position"]
        box = aabb(x, z, nx * scale, nz * scale, inst.get("rotationY") or 0)
        if box[0] < -HALF_W + 0.02 or box[1] > HALF_W - 0.02 or box[2] < -HALF_D + 0.02 or box[3] > HALF_D - 0.02:
            errors.append(f"{inst['id']} leaves the room {tuple(round(v, 3) for v in box)}")
        for zone in LAYOUT["clear"]:
            zx0, zz0 = zone["min"]
            zx1, zz1 = zone["max"]
            if hits(box, (zx0, zx1, zz0, zz1), pad=0.02):
                errors.append(f"{inst['id']} blocks clear zone {zone['id']}")

    presets = LAYOUT["cameraPresets"]
    for name in ("corner", "close"):
        if name not in presets:
            errors.append(f"missing camera preset {name}")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"ok — {len(LAYOUT['blocks'])} blocks, {len(LAYOUT['instances'])} instances, aisle clear")
    return 0


if __name__ == "__main__":
    sys.exit(main())
