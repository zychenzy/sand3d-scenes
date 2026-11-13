#!/usr/bin/env python3
"""Layout, facing, and circulation checks for the tailor atelier. No browser."""

import json
import math
import sys
from pathlib import Path

SCENE = Path(__file__).resolve().parents[1]
LAYOUT_PATH = SCENE / "layout.json"

REQUIRED_IDS = [
    "sew_chair",
    "alcove_chair",
    "cut_stool",
    "companion_bench",
    "wait_bench",
    "alcove_table",
    "bookcase_a",
    "bookcase_b",
    "lectern",
    "plant",
    "mug",
    "pend_cut",
    "pend_fit",
    "pend_alcove",
    "sew_lamp",
    "notions_shelf",
]

REQUIRED_ZONES = [
    "alcove",
    "mirror",
    "alcoveTable",
    "platform",
    "cutting",
    "sewing",
    "rail",
    "books",
    "lectern",
    "toile",
]

REQUIRED_PATHS = ["entry", "cross", "toSteps", "alcove", "railAisle", "sewingApproach"]


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


def outside(px, pz, box):
    minx, minz = box["min"]
    maxx, maxz = box["max"]
    dx = max(minx - px, 0.0, px - maxx)
    dz = max(minz - pz, 0.0, pz - maxz)
    return math.hypot(dx, dz)


def main():
    errors = []
    layout = json.loads(LAYOUT_PATH.read_text())
    room = layout["meta"]["room"]
    if not (10.5 <= room["width"] <= 13.0 and 7.5 <= room["depth"] <= 10.0 and 3.0 <= room["height"] <= 3.6):
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
    half_w = room["width"] / 2 + 0.35
    half_d = room["depth"] / 2 + 0.35
    for inst in layout["instances"]:
        x, y, z = inst["position"]
        if abs(x) > half_w or abs(z) > half_d or y < -0.05 or y > room["height"] + 0.05:
            errors.append(f"{inst['id']} outside room {inst['position']}")

    for inst in layout["instances"]:
        zone_name = inst.get("faces")
        if not zone_name:
            continue
        zone = zones[zone_name]
        dot, dist = face_dot(inst, (zone["x"], zone["z"]))
        if dot < 0.8:
            errors.append(f"{inst['id']} faces away from {zone_name} (dot {dot:.2f})")
        if not (0.55 <= dist <= 1.45):
            errors.append(f"{inst['id']} distance to {zone_name} is {dist:.2f}")

    cut = zones["cutting"]
    sew = zones["sewing"]
    plat = zones["platform"]
    if not (0.86 <= cut["h"] <= 0.96):
        errors.append(f"cutting table should be standing height, got {cut['h']}")
    if not (0.7 <= sew["h"] <= 0.78):
        errors.append(f"sewing table should be seated height, got {sew['h']}")
    if not (0.14 <= plat["h"] <= 0.24):
        errors.append(f"platform height {plat['h']}")
    if cut["h"] - sew["h"] < 0.12:
        errors.append("cutting and sewing tables collapsed to one height")

    alcove = zones["alcove"]
    door = alcove["z1"] - alcove["doorZ0"]
    if door < 1.0:
        errors.append(f"alcove doorway is {door:.2f} m")
    # Alcove volume must not contain the fitting platform.
    if not (alcove["x1"] < plat["x"] - plat["w"] / 2 and alcove["z0"] > plat["z"] + plat["d"] / 2):
        # x ranges may still be separate; require no AABB overlap
        ax0, ax1 = alcove["x0"], alcove["x1"]
        az0, az1 = alcove["z0"], alcove["z1"]
        px0, px1 = plat["x"] - plat["w"] / 2, plat["x"] + plat["w"] / 2
        pz0, pz1 = plat["z"] - plat["d"] / 2, plat["z"] + plat["d"] / 2
        overlap = ax0 < px1 and ax1 > px0 and az0 < pz1 and az1 > pz0
        if overlap:
            errors.append("fitting alcove overlaps the tailor platform")

    rail = zones["rail"]
    if rail["z1"] - rail["z0"] < 2.2:
        errors.append("suit rail is too short to read as a rail")
    if rail["x"] > -4.5:
        errors.append("suit rail should stay on the rear left wall")
    if len(zones["books"]["xs"]) < 2:
        errors.append("expected two cloth-book cases")

    # Chairs that face a zone must not share one meaningless rotation with the bench.
    rots = {round(by_id[i]["rotationY"], 3) for i in ("sew_chair", "alcove_chair", "companion_bench")}
    if len(rots) < 2:
        errors.append("seated pieces collapsed to one facing")

    for key, spec in layout["assets"].items():
        path = (SCENE / spec["glb"]).resolve()
        if not path.exists():
            errors.append(f"missing GLB for {key}: {path}")
        if ".." not in spec["glb"]:
            errors.append(f"{key} should reference a shared GLB, not a local copy")
        if path.is_symlink():
            errors.append(f"{key} GLB path resolved through a symlink")

    cams = layout.get("cameraPresets") or {}
    for name in ("corner", "close"):
        if name not in cams:
            errors.append(f"missing camera preset {name}")
    if "points" not in layout.get("lights", {}) or len(layout["lights"]["points"]) < 4:
        errors.append("expected layered point lights")

    circ = layout.get("circulation") or {}
    clearance = circ.get("clearance", 0.3)
    obstacles = circ.get("obstacles") or []
    paths = circ.get("paths") or {}
    for name in REQUIRED_PATHS:
        pts = paths.get(name)
        if not pts or len(pts) < 2:
            errors.append(f"missing path {name}")
            continue
        for px, pz in pts:
            if abs(px) > half_w or abs(pz) > half_d:
                errors.append(f"path {name} leaves the room at {(px, pz)}")
            for box in obstacles:
                dist = outside(px, pz, box)
                if dist < clearance:
                    errors.append(f"path {name} at {(px, pz)} is {dist:.2f}m from {box['id']}")

    # Stool is at the end of the cutting table, not in the cross aisle.
    stool = by_id["cut_stool"]
    if abs(stool["position"][2] - cut["z"]) > 0.35:
        errors.append("cutting stool is not at the table end")
    if stool["position"][0] > cut["x"] - cut["w"] / 2:
        errors.append("cutting stool sits on the tabletop instead of the end")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(
        f"ok — {len(ids)} instances, {len(layout['assets'])} shared GLBs, "
        f"{len(paths)} paths, zones {', '.join(REQUIRED_ZONES)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
