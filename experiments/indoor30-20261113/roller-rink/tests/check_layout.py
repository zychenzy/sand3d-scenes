#!/usr/bin/env python3
"""Layout, circulation, and offline-asset checks for the roller rink. No browser required."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
ARCH = LAYOUT["architecture"]
RINK = ARCH["rink"]


def fail(msg):
    print("FAIL", msg)
    return 1


def outside_ellipse(x, z, a, b, margin=1.0):
    return ((x - RINK["cx"]) / a) ** 2 + ((z - RINK["cz"]) / b) ** 2 > margin


def bench_aabb(inst):
    fx, fz = LAYOUT["assets"]["museum_bench"]["footprint"]
    if abs(abs(inst["rotationY"]) - math.pi / 2) < 0.2:
        fx, fz = fz, fx
    x, _, z = inst["position"]
    return (x - fx / 2, x + fx / 2, z - fz / 2, z + fz / 2)


def point_in(aabb, x, z, pad=0.0):
    x0, x1, z0, z1 = aabb
    return x0 - pad <= x <= x1 + pad and z0 - pad <= z <= z1 + pad


def main():
    errors = 0
    room = LAYOUT["meta"]["room"]
    W, D, H = room["width"], room["depth"], room["height"]
    if not (15.5 <= W <= 18.5 and 11.5 <= D <= 14.5 and 4.4 <= H <= 5.6):
        errors += fail(f"room scale {W} x {D} x {H}")

    ids = []
    hx, hz = W / 2, D / 2
    for inst in LAYOUT["instances"]:
        ids.append(inst["id"])
        x, y, z = inst["position"]
        if abs(x) > hx - 0.15 or abs(z) > hz - 0.15:
            errors += fail(f"{inst['id']} outside room ({x:.2f}, {z:.2f})")
        if y < -0.02 or y > H - 0.2:
            errors += fail(f"{inst['id']} y {y}")
        spec = LAYOUT["assets"].get(inst["kind"])
        if not spec:
            errors += fail(f"{inst['id']} missing kind {inst['kind']}")
            continue
        if outside_ellipse(x, z, RINK["railA"], RINK["railB"], 0.98) is False:
            errors += fail(f"{inst['id']} sits inside the safety rail")
        glb = ROOT / spec["glb"]
        if not glb.is_symlink():
            errors += fail(f"{spec['glb']} is not a symlink")
        else:
            real = glb.resolve()
            if "experiments" in real.parts:
                errors += fail(f"{spec['glb']} resolves into experiments: {real}")
            if not real.is_file() or real.stat().st_size < 500:
                errors += fail(f"{spec['glb']} target missing or tiny")
    if len(ids) != len(set(ids)):
        errors += fail("duplicate instance ids")

    required = {
        "bench_lace_a", "bench_lace_b", "bench_spectator",
        "speaker_l", "speaker_r", "dj_stool", "dj_lamp", "dj_mug",
        "register", "pot_entry", "pendant_rental", "pendant_counter", "pendant_entry",
    }
    missing = required - set(ids)
    if missing:
        errors += fail(f"missing instances {sorted(missing)}")

    entry = ARCH["entry"]
    clear = (entry["x1"] - entry["x0"]) - 2 * entry["post"]
    if clear < 1.05:
        errors += fail(f"entry opening {clear:.2f} m is under 1.05 m")
    opening = 2 * RINK["railB"] * math.sin(RINK["gateHalf"])
    if opening < 1.15:
        errors += fail(f"rink gate chord {opening:.2f} m is tight")

    lace = next(i for i in LAYOUT["instances"] if i["id"] == "bench_lace_a")
    if abs(lace["rotationY"]) > 0.2:
        errors += fail("lace bench long axis is not along the rental wall")
    bench_front = lace["position"][0] + LAYOUT["assets"]["museum_bench"]["footprint"][0] / 2
    rail_x = RINK["cx"] - RINK["railA"]
    aisle = rail_x - bench_front
    if aisle < 1.05:
        errors += fail(f"lace aisle {aisle:.2f} m is under 1.05 m")

    spec = next(i for i in LAYOUT["instances"] if i["id"] == "bench_spectator")
    # long axis should run across the front concourse, facing the oval along Z
    if abs(abs(spec["rotationY"]) - math.pi / 2) > 0.2:
        errors += fail("spectator bench is not set along the front")

    center = (RINK["cx"], RINK["cz"])
    for sid in ("speaker_l", "speaker_r"):
        inst = next(i for i in LAYOUT["instances"] if i["id"] == sid)
        dx = center[0] - inst["position"][0]
        dz = center[1] - inst["position"][2]
        length = math.hypot(dx, dz) or 1
        fx, fz = math.sin(inst["rotationY"]), math.cos(inst["rotationY"])
        dot = fx * dx / length + fz * dz / length
        if dot < 0.75:
            errors += fail(f"{sid} grille is not aimed at the oval (dot {dot:.2f})")

    stool = next(i for i in LAYOUT["instances"] if i["id"] == "dj_stool")
    dj = ARCH["dj"]
    sx, _, sz = stool["position"]
    if not (dj["x0"] < sx < dj["x1"] and dj["z0"] < sz < dj["z1"]):
        errors += fail("DJ stool is not inside the booth")
    if abs(stool["position"][1] - dj["rise"]) > 0.05:
        errors += fail("DJ stool is not standing on the booth platform")

    reg = next(i for i in LAYOUT["instances"] if i["id"] == "register")
    counter = ARCH["counter"]
    if not (counter["x0"] <= reg["position"][0] <= counter["x1"] and counter["z0"] <= reg["position"][2] <= counter["z1"]):
        errors += fail("register is not on the rental counter")
    if abs(reg["position"][1] - counter["h"]) > 0.04:
        errors += fail("register is not on the counter top")

    holds = [m["hold"] for m in ARCH["cubbies"]["modules"]]
    if not any(len(h) == 0 for h in holds):
        errors += fail("cubbies have no empty bay")
    if sum(len(h) for h in holds) < 6:
        errors += fail("too few rental skates in the cubbies")
    heights = {m["h"] for m in ARCH["cubbies"]["modules"]}
    if len(heights) < 3:
        errors += fail("cubby wall is one repeated height")

    cubby = ARCH["cubbies"]
    cubby_z1 = cubby["z0"] + sum(m["w"] for m in cubby["modules"])
    solids = [
        ("counter", counter["x0"], counter["x1"], counter["z0"], counter["z1"]),
        ("booth", dj["x0"], dj["x1"], dj["z0"], dj["z1"]),
        ("cubbies", cubby["xBack"], cubby["xBack"] + cubby["depth"], cubby["z0"], cubby_z1),
    ]
    for inst in LAYOUT["instances"]:
        if inst["kind"] == "museum_bench":
            solids.append((inst["id"], *bench_aabb(inst)))
    for i, (x, z) in enumerate(ARCH["path"]):
        for name, x0, x1, z0, z1 in solids:
            if point_in((x0, x1, z0, z1), x, z, 0.05):
                errors += fail(f"path point {i} ({x}, {z}) hits {name}")
        inside_rail = not outside_ellipse(x, z, RINK["railA"], RINK["railB"], 1.0)
        if i < len(ARCH["path"]) - 2 and inside_rail:
            errors += fail(f"path point {i} is on the skate floor before the gate")
    last = ARCH["path"][-1]
    if outside_ellipse(last[0], last[1], RINK["a"], RINK["b"], 0.2):
        errors += fail("path does not end on the maple oval")

    vendor = ROOT / "vendor" / "three.module.js"
    if not vendor.is_symlink() and not (ROOT / "vendor").is_symlink():
        errors += fail("vendor is not a symlink to the shared three.js")
    if not vendor.exists():
        errors += fail("vendored three.js is missing")

    src = (ROOT / "scene_lib.js").read_text()
    for needle in ("MeshToonMaterial", "MeshBasicMaterial", "NearestFilter", "0.38"):
        if needle not in src:
            errors += fail(f"scene_lib missing {needle}")
    html = (ROOT / "index.html").read_text()
    if "http://" in html or "https://" in html:
        errors += fail("index.html is not offline")

    for name in ("toon_default.png", "toon_corner.png", "toon_close.png", "unlit_default.png"):
        shot = ROOT / "shots" / name
        if not shot.exists() or shot.stat().st_size < 40_000:
            errors += fail(f"shot {name} missing or tiny")

    if errors:
        print(f"{errors} check(s) failed")
        return 1
    print("layout ok", len(ids), "instances", f"aisle {aisle:.2f} m", f"gate {opening:.2f} m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
