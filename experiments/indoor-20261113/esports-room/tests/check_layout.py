#!/usr/bin/env python3
"""Layout contract for the North Pit training room. No browser required."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
ROOM = LAYOUT["meta"]["room"]
HALF_W = ROOM["width"] / 2
HALF_D = ROOM["depth"] / 2
BUILD = LAYOUT["build"]
DESK = BUILD["desk"]


def aabb(cx, cz, w, d, yaw=0.0):
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


def inside(box, margin=0.05):
    return box[0] >= -HALF_W + margin and box[1] <= HALF_W - margin and box[2] >= -HALF_D + margin and box[3] <= HALF_D - margin


def forward(yaw):
    return math.sin(yaw), math.cos(yaw)


def main():
    errors = []
    floor = []

    def add(fid, box):
        floor.append((fid, box))
        if not inside(box):
            errors.append(f"{fid} leaves the room {tuple(round(v, 3) for v in box)}")

    for st in BUILD["stations"]:
        add(f"desk_{st['id']}", aabb(st["x"], DESK["z"], DESK["w"], DESK["d"]))
        cz = st["chairZ"] + st.get("chairPull", 0)
        add(f"chair_{st['id']}", aabb(st["x"], cz, BUILD["chairWidth"], BUILD["chairDepth"], st["chairYaw"]))
        fx, fz = forward(st["chairYaw"])
        dx, dz = 0.0, BUILD["monitorZ"] - cz
        dot = fx * dx + fz * dz
        dist = math.hypot(dx, dz)
        if dot < 0.55:
            errors.append(f"chair_{st['id']} front does not face its monitor (dot {dot:.2f})")
        if not 0.45 <= dist <= 1.15:
            errors.append(f"chair_{st['id']} to monitor distance {dist:.2f} m")
        mon = next(i for i in LAYOUT["instances"] if i["id"] == f"mon_{st['id']}")
        if abs(mon["position"][0] - st["x"]) > 0.02 or abs(mon["position"][2] - BUILD["monitorZ"]) > 0.02:
            errors.append(f"mon_{st['id']} is not on the station")
        if abs(abs(mon["rotationY"]) - math.pi) > 0.05:
            errors.append(f"mon_{st['id']} rotation is not π (screen would face the wall)")
        if mon["position"][1] < DESK["top"] - 0.02:
            errors.append(f"mon_{st['id']} is below the desk top")

    coach = BUILD["coach"]
    add("coach_desk", aabb(coach["x"], coach["deskZ"], coach["w"], coach["d"], coach["yaw"]))
    add("coach_chair", aabb(coach["x"], coach["chairZ"], BUILD["chairWidth"], BUILD["chairDepth"], coach["yaw"]))
    cfx, cfz = forward(coach["yaw"])
    cmon = next(i for i in LAYOUT["instances"] if i["id"] == "mon_coach")
    cdot = cfx * (cmon["position"][0] - coach["x"]) + cfz * (cmon["position"][2] - coach["chairZ"])
    if cdot < 0.4:
        errors.append(f"coach chair front does not face the coach monitor (dot {cdot:.2f})")

    bench = BUILD["bench"]
    add("bench", aabb(bench["x"], bench["z"], bench["w"], bench["d"]))
    cred = BUILD["credenza"]
    add("credenza", aabb(cred["x"], cred["z"], cred["w"], cred["d"]))
    pot = BUILD["pot"]
    add("pot", aabb(pot["x"], pot["z"], pot["w"], pot["d"]))

    for i, (ia, ba) in enumerate(floor):
        for ib, bb in floor[i + 1 :]:
            pair = {ia.split("_")[0], ib.split("_")[0]}
            same = ia.split("_")[-1] == ib.split("_")[-1] and pair == {"desk", "chair"}
            if same:
                continue
            if hits(ba, bb, pad=0.04):
                errors.append(f"overlap {ia} x {ib}")

    for zone in LAYOUT["clear"]:
        zx0, zz0 = zone["min"]
        zx1, zz1 = zone["max"]
        zbox = (zx0, zx1, zz0, zz1)
        if (zz1 - zz0) < 1.05 and zone["id"] == "aisle":
            errors.append("aisle is narrower than 1.05 m")
        for fid, box in floor:
            if fid.startswith("chair_") and zone["id"] != "aisle":
                pass
            if hits(box, zbox, pad=0.02):
                errors.append(f"{fid} blocks clear zone {zone['id']}")

    roles = [st["role"] for st in BUILD["stations"]]
    if roles != ["TOP", "JG", "MID", "ADC", "SUP"]:
        errors.append(f"station roles drifted: {roles}")

    for kind, spec in LAYOUT["assets"].items():
        path = (ROOT / spec["glb"]).resolve()
        if not path.is_file():
            errors.append(f"missing glb {kind}: {spec['glb']}")
        elif ROOT in path.parents and path.is_relative_to(ROOT):
            errors.append(f"{kind} GLB is inside the experiment; reuse the repo bake")
        rel = path.relative_to(REPO).as_posix()
        if rel.split("/")[0] not in {"cowork", "cafe", "ktv", "cinema", "library", "music", "workshop"}:
            errors.append(f"{kind} resolved outside known kits: {rel}")

    index = (ROOT / "index.html").read_text()
    lib = (ROOT / "scene_lib.js").read_text()
    if "MeshBasicMaterial" not in lib:
        errors.append("unlit path is not MeshBasicMaterial")
    if "MeshToonMaterial" not in lib:
        errors.append("toon path is missing")
    for label, text, needle in (
        ("import map", index, "../../../cinema/vendor/three.module.js"),
        ("orbit", lib, "../../../cinema/vendor/controls/OrbitControls.js"),
        ("gltf", lib, "../../../cinema/vendor/loaders/GLTFLoader.js"),
    ):
        if needle not in text:
            errors.append(f"{label} does not use the shared vendor ({needle})")
        if not (ROOT / needle).resolve().is_file():
            errors.append(f"vendor file missing for {label}")

    banned = ("study_desk", "dining_chair", "chalkboard", "library_lamp")
    blob = json.dumps(LAYOUT["assets"])
    for name in banned:
        if name in blob:
            errors.append(f"office kit leaked into assets: {name}")

    for img in (ROOT / "refs").glob("*"):
        if img.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            errors.append(f"reference image tracked: {img.name}")

    presets = LAYOUT["cameraPresets"]
    for name in ("corner", "close"):
        if name not in presets:
            errors.append(f"missing camera {name}")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"ok — {len(BUILD['stations'])} stations, aisle clear, {len(LAYOUT['assets'])} shared GLBs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
