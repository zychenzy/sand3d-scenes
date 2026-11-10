#!/usr/bin/env python3
"""Layout checks for the weaving / sewing studio. No browser required."""

import json
import math
import sys
from pathlib import Path

SCENE = Path(__file__).resolve().parents[1]
LAYOUT_PATH = SCENE / "layout.json"

REQUIRED_IDS = [
    "weave_bench",
    "loom_chair",
    "cut_chair",
    "sew_chair_a",
    "sew_chair_b",
    "notions_table",
    "sample_bench",
    "plant",
    "mug",
    "pend_cut",
    "pend_weave",
    "pend_sew",
    "lamp_a",
    "lamp_b",
]

REQUIRED_ZONES = [
    "heroLoom",
    "tableLoom",
    "cutting",
    "sewA",
    "sewB",
    "iron",
    "folds",
    "threadFloor",
    "samples",
]


def forward(rot):
    return math.sin(rot), math.cos(rot)


def face_dot(inst, target):
    fx, fz = forward(inst["rotationY"])
    dx = target[0] - inst["position"][0]
    dz = target[1] - inst["position"][2]
    dist = math.hypot(dx, dz)
    if dist < 1e-6:
        return 0.0, 0.0
    return (fx * dx + fz * dz) / dist, dist


def main():
    errors = []
    layout = json.loads(LAYOUT_PATH.read_text())
    room = layout["meta"]["room"]
    if not (9.0 <= room["width"] <= 14.0 and 7.0 <= room["depth"] <= 12.0):
        errors.append(f"unexpected room size {room}")

    zones = layout.get("zones") or {}
    for key in REQUIRED_ZONES:
        if key not in zones:
            errors.append(f"missing zone {key}")

    ids = [i["id"] for i in layout["instances"]]
    if len(ids) != len(set(ids)):
        errors.append("duplicate instance ids")
    for req in REQUIRED_IDS:
        if req not in ids:
            errors.append(f"missing instance {req}")

    by_id = {i["id"]: i for i in layout["instances"]}
    half_w = room["width"] / 2 + 0.4
    half_d = room["depth"] / 2 + 0.4
    for inst in layout["instances"]:
        x, y, z = inst["position"]
        if abs(x) > half_w or abs(z) > half_d or y < -0.05 or y > room["height"]:
            errors.append(f"{inst['id']} outside room {inst['position']}")
        if any(isinstance(n, float) and math.isnan(n) for n in inst["position"]):
            errors.append(f"{inst['id']} has NaN")

    for inst in layout["instances"]:
        zone_name = inst.get("faces")
        if not zone_name:
            continue
        zone = zones[zone_name]
        dot, dist = face_dot(inst, (zone["x"], zone["z"]))
        if dot < 0.8:
            errors.append(f"{inst['id']} faces away from {zone_name} (dot {dot:.2f})")
        if not (0.55 <= dist <= 1.7):
            errors.append(f"{inst['id']} distance to {zone_name} is {dist:.2f}")

    bench = by_id["weave_bench"]
    hero = zones["heroLoom"]
    if bench["position"][2] < hero["z"] + 0.65:
        errors.append("weaver bench is not in front of the floor loom")

    for key, spec in layout["assets"].items():
        path = (SCENE / spec["glb"]).resolve()
        if not path.exists():
            errors.append(f"missing GLB for {key}: {path}")
        if ".." not in spec["glb"]:
            errors.append(f"{key} should reference a shared GLB, not a local copy")

    cams = layout.get("cameraPresets") or {}
    for name in ("corner", "close"):
        if name not in cams:
            errors.append(f"missing camera preset {name}")
    if "points" not in layout.get("lights", {}) or len(layout["lights"]["points"]) < 3:
        errors.append("expected pendant/task point lights")

    # Chairs must not share one rotation — sewing B is angled on purpose.
    rots = {by_id[i]["rotationY"] for i in ("cut_chair", "sew_chair_a", "sew_chair_b", "loom_chair")}
    if len(rots) < 3:
        errors.append("work chairs collapsed to one facing")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"ok — {len(ids)} instances, {len(layout['assets'])} shared GLBs, zones {', '.join(REQUIRED_ZONES)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
