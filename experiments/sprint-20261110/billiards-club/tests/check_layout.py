#!/usr/bin/env python3
"""Layout invariants for the billiards club. No browser required.

Cue clearance is a rectangle grown from the baked pool-table footprint.
Floor furniture must stay outside it. Wall-mounted anchors must sit on a wall.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())


def footprint(layout):
    native = layout["meta"]["table"]["native"]
    nw, nh, nd = native
    target = layout["meta"]["table"]["targetHeight"]
    x, _y, z = layout["meta"]["table"]["position"]
    scale = target / nh
    half_x = nw * scale / 2
    half_z = nd * scale / 2
    clear = layout["meta"]["table"]["cueClearance"]
    return {
        "half_x": half_x,
        "half_z": half_z,
        "min_x": x - half_x - clear,
        "max_x": x + half_x + clear,
        "min_z": z - half_z - clear,
        "max_z": z + half_z + clear,
        "top": target,
    }


def hits(x, z, radius, box):
    cx = min(max(x, box["min_x"]), box["max_x"])
    cz = min(max(z, box["min_z"]), box["max_z"])
    return (x - cx) ** 2 + (z - cz) ** 2 < radius ** 2 - 1e-8


def main():
    errors = []
    box = footprint(LAYOUT)
    room = LAYOUT["meta"]["room"]
    cue = LAYOUT["meta"]["table"]["cueLength"]
    if LAYOUT["meta"]["table"]["cueClearance"] < cue:
        errors.append("cue clearance is shorter than a cue")
    # Stance room: the butt of a cue at the head rail must not meet the back wall.
    back = -room["depth"] / 2
    left = -room["width"] / 2
    if box["min_z"] - back < 0.45:
        errors.append("back wall cuts the cue swing")
    if box["min_x"] - left < 0.8:
        errors.append("left wall cuts the cue swing")

    pool = next(i for i in LAYOUT["instances"] if i["id"] == "pool")
    table_pos = LAYOUT["meta"]["table"]["position"]
    if pool["position"] != table_pos:
        errors.append("pool instance is not on the measured table position")
    if abs(pool.get("rotationY", 0)) > 1e-6:
        errors.append("pool table long axis must stay on Z (rotationY 0)")

    for inst in LAYOUT["instances"]:
        if inst["kind"] == "pool_table":
            continue
        x, y, z = inst["position"]
        if y > 1.5:
            continue
        radius = inst.get("clearRadius", 0.3)
        if hits(x, z, radius, box):
            errors.append(f"{inst['id']} intersects cue clearance")

    anchors = LAYOUT["anchors"]
    wall_ids = {"scoreboard", "rackA", "rackB", "rules", "window"}
    for key, pos in anchors.items():
        x, y, z = pos
        on_left = abs(x - left) < 0.45
        on_back = abs(z - back) < 0.4
        if key in wall_ids:
            if not (on_left or on_back):
                errors.append(f"anchor {key} is not on a wall")
        elif hits(x, z, 0.4, box):
            errors.append(f"anchor {key} intersects cue clearance")

    # Spectator chairs face the side table, not the open cutaway.
    by_id = {i["id"]: i for i in LAYOUT["instances"]}
    side = by_id["side_table"]["position"]
    north = by_id["chair_n"]
    west = by_id["chair_w"]
    if north["position"][2] >= side[2]:
        errors.append("north chair is not north of the side table")
    if abs(north.get("rotationY", 0)) > 0.1:
        errors.append("north chair should face +Z (rotationY 0)")
    if west["position"][0] >= side[0]:
        errors.append("west chair is not west of the side table")
    if abs(west["rotationY"] + 1.5708) > 0.05:
        errors.append("west chair should face +X")
    sofa = by_id["sofa"]
    if abs(sofa["rotationY"] - 1.5708) > 0.05:
        errors.append("sofa should face the table (-X)")
    if sofa["position"][0] < box["max_x"]:
        errors.append("sofa is inside the cue rectangle")

    for spec in LAYOUT["assets"].values():
        path = ROOT / spec["glb"]
        if not path.exists():
            errors.append(f"missing asset {spec['glb']}")

    vendor = ROOT / "vendor" / "three.module.js"
    if not vendor.exists():
        errors.append("vendored three.js is not reachable")

    if errors:
        print("\n".join(errors))
        return 1
    print(
        "ok  clearance "
        f"x[{box['min_x']:.2f},{box['max_x']:.2f}] "
        f"z[{box['min_z']:.2f},{box['max_z']:.2f}]  "
        f"table height {box['top']:.2f} m"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
