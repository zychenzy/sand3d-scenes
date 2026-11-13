#!/usr/bin/env python3
"""Layout, route, and asset-link contract for the bathhouse hall."""
import json
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def circle_hits_aabb(cx, cz, r, box):
    x0, x1, z0, z1 = box
    nx = min(max(cx, x0), x1)
    nz = min(max(cz, z0), z1)
    return (cx - nx) ** 2 + (cz - nz) ** 2 < r * r


def main():
    with open(os.path.join(ROOT, "layout.json"), encoding="utf-8") as f:
        layout = json.load(f)

    room = layout["room"]
    ergo = layout["ergo"]
    lockers = layout["lockers"]
    bench = layout["bench"]
    wash = layout["wash"]
    desk = layout["desk"]
    shoes = layout["shoes"]
    bath = layout["bath"]
    route = layout["route"]

    if "changing" not in layout["meta"]["zones"] or "wash" not in layout["meta"]["zones"]:
        fail("zones")
    if room["h"] < 3 or room["x1"] - room["x0"] < 6 or room["z1"] - room["z0"] < 10:
        fail("room size")

    face = lockers["x1"]
    bench_min_x = face + ergo["kneeGap"]
    bench_max_x = bench_min_x + ergo["benchDepth"]
    if not 0.72 <= ergo["kneeGap"] <= 1.05:
        fail("knee gap")
    if not 0.42 <= ergo["benchSeat"] <= 0.46:
        fail("bench seat")
    if lockers["h"] < 1.7 or lockers["h"] > 2.05:
        fail("locker height")
    if lockers["z1"] <= bench["z"] - bench["length"] / 2 or lockers["z0"] >= bench["z"] + bench["length"] / 2:
        fail("bench does not sit in front of the lockers")

    if not 0.28 <= ergo["stoolHeight"] <= 0.32:
        fail("stool height")
    if not 0.7 <= ergo["faucetHeight"] <= 0.85:
        fail("faucet height")
    gap = ergo["stationPitch"] - ergo["stoolDiameter"]
    if gap < 0.5:
        fail(f"wash pitch leaves {gap:.2f} m between stools")
    span = abs(wash["stationsZ"][0] - wash["stationsZ"][1])
    if abs(span - ergo["stationPitch"]) > 1e-6:
        fail("station pitch does not match stationsZ")

    left_center = wash["x0"] + ergo["stoolToWall"]
    right_center = wash["x1"] - ergo["stoolToWall"]
    aisle = (right_center - ergo["stoolDiameter"] / 2) - (left_center + ergo["stoolDiameter"] / 2)
    if aisle < ergo["aisleMin"]:
        fail(f"wash aisle {aisle:.2f}")
    if not wash["x0"] < left_center - ergo["bucketTowardWall"] < left_center:
        fail("bucket must sit between the stool and the wall")
    reach = ergo["stoolToWall"]
    if not 0.5 <= reach <= 0.7:
        fail("stool-to-wall reach")

    if abs(desk["top"] - ergo["counterHeight"]) > 1e-9:
        fail("counter height")
    reg = next(i for i in layout["instances"] if i["id"] == "bandai_register")
    if abs(reg["position"][1] - desk["top"]) > 0.02:
        fail("register is not on the desk")
    if reg["position"][0] <= desk["x0"] or reg["position"][0] >= desk["x1"]:
        fail("register off the desk in x")
    if reg["position"][2] <= desk["z0"] or reg["position"][2] >= desk["z1"]:
        fail("register off the desk in z")
    facing = (math.sin(reg["rotationY"]), math.cos(reg["rotationY"]))
    if facing[0] < 0.8:
        fail("register should face the customer aisle (+X)")

    shelf = next(i for i in layout["instances"] if i["id"] == "towel_shelf")
    if not room["x0"] < shelf["position"][0] < room["x1"]:
        fail("shelf outside room")
    if shelf["position"][1] < 0.9 or shelf["position"][1] + 0.64 > room["h"]:
        fail("shelf height")

    open_w = bath["openX1"] - bath["openX0"]
    if open_w < 1.2:
        fail("bath opening")
    if bath["head"] < 2.0:
        fail("bath headroom")
    for s in layout["screens"]:
        half_w = s["w"] / 2
        half_d = s["d"] / 2
        ex = abs(math.cos(s["rot"])) * half_w + abs(math.sin(s["rot"])) * half_d
        if s["x"] - ex < bath["openX1"] and s["x"] + ex > bath["openX0"] and abs(s["z"] - bath["zWall"]) < 0.2:
            fail(f"screen crosses the bath opening: {s['x']}")
        if min(abs(s["x"] - bath["openX0"]), abs(s["x"] - bath["openX1"])) > 0.7:
            fail("screens should frame the opening, not stand in the aisle")

    noren = layout["noren"]
    inner = []
    for c in noren["centers"]:
        inner.append(c - math.copysign(noren["panelW"] / 2, c))
    gap = abs(inner[1] - inner[0]) if inner[0] * inner[1] < 0 else min(abs(v) for v in inner) * 2
    if gap < 0.55:
        fail(f"noren gap {gap:.2f}")

    obstacles = [
        (desk["x0"], desk["x1"], desk["z0"], desk["z1"], "desk"),
        (lockers["x0"], lockers["x1"], lockers["z0"], lockers["z1"], "lockers"),
        (bench_min_x, bench_max_x, bench["z"] - bench["length"] / 2, bench["z"] + bench["length"] / 2, "bench"),
        (shoes["x0"], shoes["x1"], shoes["z0"], shoes["z1"], "shoes"),
        (layout["platform"]["x0"], layout["platform"]["x1"], layout["platform"]["z0"], layout["platform"]["z1"], "platform"),
    ]
    r_stool = ergo["stoolDiameter"] / 2
    for z in wash["stationsZ"]:
        for cx, name in ((left_center, "stool-l"), (right_center, "stool-r")):
            obstacles.append((cx - r_stool, cx + r_stool, z - r_stool, z + r_stool, name))
        obstacles.append((
            left_center - ergo["bucketTowardWall"] - ergo["bucketRadius"],
            left_center - ergo["bucketTowardWall"] + ergo["bucketRadius"],
            z + ergo["bucketForward"] - ergo["bucketRadius"],
            z + ergo["bucketForward"] + ergo["bucketRadius"],
            "bucket",
        ))
    for s in layout["screens"]:
        half_w = s["w"] / 2
        half_d = s["d"] / 2
        ex = abs(math.cos(s["rot"])) * half_w + abs(math.sin(s["rot"])) * half_d
        ez = abs(math.sin(s["rot"])) * half_w + abs(math.cos(s["rot"])) * half_d
        obstacles.append((s["x"] - ex, s["x"] + ex, s["z"] - ez, s["z"] + ez, "screen"))

    points = route["points"]
    radius = route["radius"]
    if radius < 0.4:
        fail("route radius")
    samples = []
    for (x0, z0), (x1, z1) in zip(points, points[1:]):
        steps = max(2, int(math.hypot(x1 - x0, z1 - z0) / 0.2))
        for i in range(steps + 1):
            t = i / steps
            samples.append((x0 + (x1 - x0) * t, z0 + (z1 - z0) * t))
    for x, z in samples:
        for box in obstacles:
            if circle_hits_aabb(x, z, radius, box[:4]):
                fail(f"route blocked by {box[4]} at {x:.2f},{z:.2f}")
        if x < room["x0"] + 0.3 or x > room["x1"] - 0.3:
            fail("route outside")
        if z < bath["zWall"] + 0.05 or z > room["z1"] - 0.2:
            fail("route outside depth")

    ids = [i["id"] for i in layout["instances"]]
    if len(ids) != len(set(ids)):
        fail("duplicate ids")
    for inst in layout["instances"]:
        if inst["kind"] not in layout["assets"]:
            fail(inst["kind"])

    for kind, spec in layout["assets"].items():
        glb = os.path.join(ROOT, spec["glb"])
        if not os.path.islink(glb):
            fail(f"{kind} must be a symlink")
        if not os.path.exists(glb):
            fail(f"dangling {glb}")
        real = os.path.realpath(glb)
        if not real.startswith(REPO + os.sep):
            fail(f"glb escapes repo {real}")
        if os.path.getsize(real) < 1000:
            fail(f"glb too small {real}")

    vendor = os.path.join(ROOT, "vendor")
    if not os.path.islink(vendor):
        fail("vendor must be a symlink")
    if not os.path.exists(os.path.join(vendor, "three.module.js")):
        fail("three missing")

    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "bathhouse.js"), encoding="utf-8").read()
    lib = open(os.path.join(ROOT, "scene_lib.js"), encoding="utf-8").read()
    for blob, name in ((html, "html"), (js, "bathhouse.js"), (lib, "scene_lib.js")):
        if "http://" in blob or "https://" in blob:
            fail(f"{name} loads from the network")
    if "MeshToonMaterial" not in lib or "MeshBasicMaterial" not in lib:
        fail("toon/unlit materials")
    if "PCFHardShadowMap" not in lib or "makeToonGradient" not in lib:
        fail("hard toon path")
    if "NearestFilter" not in lib:
        fail("gradient must be stepped")
    if "layout.lockers" not in js or "layout.wash" not in js:
        fail("scene must read the layout")
    for preset in ("corner", "close"):
        p = layout["cameraPresets"][preset]
        if len(p["position"]) != 3 or len(p["target"]) != 3:
            fail(preset)

    print(
        "ok",
        f"aisle {aisle:.2f}m",
        f"knee {ergo['kneeGap']:.2f}m",
        f"stations {len(wash['stationsZ']) * 2}",
        f"route samples {len(samples)}",
    )


if __name__ == "__main__":
    main()
