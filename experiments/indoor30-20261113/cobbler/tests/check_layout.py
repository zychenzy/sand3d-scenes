#!/usr/bin/env python3
"""Path, proportion, facing, and passage checks for the cobbler workshop."""

import json
import math
import sys
from pathlib import Path

SCENE = Path(__file__).resolve().parents[1]
ROOT = SCENE.parents[2]
LAYOUT_PATH = SCENE / "layout.json"

REQUIRED_IDS = [
    "chair_repair",
    "chair_stitch",
    "chair_finisher",
    "waiting_bench",
    "lamp_bench",
    "pend_stitch",
    "pend_counter",
    "jar_wax",
    "jar_polish",
    "jar_pegs",
    "mug",
    "till",
    "plant",
]

REQUIRED_ZONES = [
    "repair",
    "stitch",
    "finisher",
    "counter",
    "lasts",
    "tickets",
    "rail",
    "foreground",
    "window",
]

HEIGHTS = {
    "dining_chair": (0.84, 0.92),
    "museum_bench": (0.42, 0.5),
    "library_lamp": (0.36, 0.48),
    "pendant_lamp": (0.38, 0.52),
    "jam_jar": (0.08, 0.14),
    "cup_mug": (0.07, 0.11),
    "cash_register": (0.24, 0.36),
    "flowerpot": (0.22, 0.34),
}


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
    if not (9.0 <= room["width"] <= 12.0 and 7.0 <= room["depth"] <= 9.0 and 2.8 <= room["height"] <= 3.4):
        errors.append(f"unexpected room {room}")

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
    half_w = room["width"] / 2 - 0.2
    half_d = room["depth"] / 2 - 0.15
    for inst in layout["instances"]:
        x, y, z = inst["position"]
        if abs(x) > half_w or abs(z) > half_d or y < -0.02 or y > room["height"] - 0.2:
            errors.append(f"{inst['id']} outside room {inst['position']}")

    for inst in layout["instances"]:
        zone_name = inst.get("faces")
        if not zone_name:
            continue
        zone = zones[zone_name]
        dot, dist = face_dot(inst, (zone["x"], zone["z"]))
        if dot < 0.85:
            errors.append(f"{inst['id']} faces away from {zone_name} (dot {dot:.2f})")
        if not (0.6 <= dist <= 1.45):
            errors.append(f"{inst['id']} distance to {zone_name} is {dist:.2f}")

    repair = zones["repair"]
    stitch = zones["stitch"]
    finisher = zones["finisher"]
    counter = zones["counter"]
    if not (0.74 <= repair["h"] <= 0.82):
        errors.append("repair bench is not dining-chair height")
    if not (0.72 <= stitch["h"] <= 0.82):
        errors.append("stitch horse is not dining-chair height")
    if not (1.0 <= counter["h"] <= 1.1):
        errors.append("handoff counter is not standing height")
    if not (1.05 <= finisher["h"] <= 1.3):
        errors.append("finisher is not a compact standing machine")

    # Chair fronts use about 0.22 m of the 0.88 m chair toward the station.
    repair_front = repair["z"] + repair["d"] / 2
    if by_id["chair_repair"]["position"][2] - 0.22 < repair_front + 0.12:
        errors.append("repair chair collides with the bench")
    stitch_front = stitch["z"] + stitch["d"] / 2
    if by_id["chair_stitch"]["position"][2] - 0.22 < stitch_front + 0.12:
        errors.append("stitch chair collides with the horse")
    finisher_face = finisher["x"] + finisher["w"] / 2
    if by_id["chair_finisher"]["position"][0] - 0.22 < finisher_face + 0.15:
        errors.append("finisher chair collides with the machine")

    stitch_chair_back = by_id["chair_stitch"]["position"][2] + 0.22
    counter_shop = counter["z"] - counter["d"] / 2
    if counter_shop - stitch_chair_back < 0.9:
        errors.append(f"aisle behind the counter is {counter_shop - stitch_chair_back:.2f} m")

    finisher_chair_x = by_id["chair_finisher"]["position"][0] + 0.2
    if stitch["x"] - stitch["w"] / 2 - finisher_chair_x < 0.9:
        errors.append("aisle between finisher and stitch horse is under 0.9 m")

    customer_apron = room["depth"] / 2 - (counter["z"] + counter["d"] / 2)
    if customer_apron < 0.9:
        errors.append(f"customer apron is {customer_apron:.2f} m")

    bench = by_id["waiting_bench"]
    # Museum bench length runs along local Z; yaw pi/2 lays that length on X.
    if abs(abs(bench["rotationY"]) - math.pi / 2) > 0.05:
        errors.append("waiting bench long axis is not along X")
    if bench["position"][0] - 0.95 < counter["x"] + counter["w"] / 2 + 0.7:
        errors.append("waiting bench crowds the counter")

    if abs(by_id["lamp_bench"]["rotationY"]) < 2.5:
        errors.append("bench lamp shade does not face the cobbler")
    if abs(by_id["till"]["rotationY"]) > 0.2:
        errors.append("till does not face the customer")
    if by_id["lamp_bench"]["position"][1] < repair["h"] - 0.01:
        errors.append("bench lamp is below the bench top")
    if by_id["till"]["position"][1] < counter["h"] - 0.01:
        errors.append("till is below the counter top")
    if by_id["mug"]["position"][1] > 0.45:
        errors.append("mug sits on a work surface")

    for key, spec in layout["assets"].items():
        path = (SCENE / spec["glb"]).resolve()
        if not path.exists():
            errors.append(f"missing GLB for {key}: {path}")
        if ".." not in spec["glb"].replace("\\", "/"):
            errors.append(f"{key} should reference a shared GLB")
        if SCENE.as_posix() in path.as_posix():
            errors.append(f"{key} resolves inside the cobbler folder")
        if not str(path).startswith(str(ROOT)):
            errors.append(f"{key} escapes the repo: {path}")
        lo, hi = HEIGHTS[key]
        if not (lo <= spec["targetHeight"] <= hi):
            errors.append(f"{key} targetHeight {spec['targetHeight']} outside {lo}-{hi}")

    lib = (SCENE / "scene_lib.js").read_text()
    if "new THREE.MeshBasicMaterial" not in lib:
        errors.append("unlit path is not MeshBasicMaterial")
    if "new THREE.MeshToonMaterial" not in lib:
        errors.append("default path is not MeshToonMaterial")
    if "NearestFilter" not in lib:
        errors.append("toon gradient is not hard-stepped")
    if "0.32" not in lib:
        errors.append("toon shadow step is missing")

    vendor = SCENE / "vendor"
    assets = SCENE / "assets"
    if vendor.exists() or assets.exists():
        errors.append("scene folder must not copy vendor or GLBs")

    cams = layout.get("cameraPresets") or {}
    for name in ("corner", "close"):
        if name not in cams:
            errors.append(f"missing camera {name}")
    for name, cam in {"default": layout["camera"], **cams}.items():
        x, y, z = cam["position"]
        if x < -room["width"] / 2 + 0.3 or z < -room["depth"] / 2 + 0.3:
            errors.append(f"{name} camera sits inside a wall")
        if y < 0.8 or y > 4.2:
            errors.append(f"{name} camera height {y}")

    if "points" not in layout.get("lights", {}) or len(layout["lights"]["points"]) < 3:
        errors.append("expected task point lights")

    rots = {round(by_id[i]["rotationY"], 3) for i in ("chair_repair", "chair_stitch", "chair_finisher")}
    if len(rots) < 3:
        errors.append("work chairs collapsed to one facing")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"ok — {len(ids)} instances, {len(layout['assets'])} shared GLBs, passages hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
