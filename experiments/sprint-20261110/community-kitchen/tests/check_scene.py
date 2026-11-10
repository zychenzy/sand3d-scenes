#!/usr/bin/env python3
"""Layout checks for the community kitchen. No browser required."""

import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
HTML = (ROOT / "index.html").read_text()
JS = (ROOT / "kitchen.js").read_text()

errors = []


def fail(msg):
    errors.append(msg)


room = LAYOUT["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
zones = LAYOUT["zones"]
island = zones["island"]
counter = zones["counter"]
tasting = zones["tasting"]

ids = [i["id"] for i in LAYOUT["instances"]]
if len(ids) != len(set(ids)):
    fail("duplicate instance ids")

for spec in LAYOUT["assets"].values():
    glb = spec["glb"]
    if glb.startswith("http"):
        fail(f"asset path must stay local: {glb}")
    path = (ROOT / glb).resolve()
    if not path.exists():
        fail(f"missing glb {glb}")
    if "experiments/sprint-20261110/community-kitchen" in str(path):
        fail(f"bulk glb should be referenced, not copied: {glb}")

for inst in LAYOUT["instances"]:
    x, y, z = inst["position"]
    if abs(x) > W / 2 + 0.05 or abs(z) > D / 2 + 0.05:
        fail(f"{inst['id']} outside room {inst['position']}")
    if y < -0.01 or y > H:
        fail(f"{inst['id']} bad height {y}")
    if inst["kind"] not in LAYOUT["assets"]:
        fail(f"{inst['id']} unknown kind {inst['kind']}")


def facing(rot):
    return math.sin(rot), math.cos(rot)


def dot_toward(inst, tx, tz):
    fx, fz = facing(inst.get("rotationY") or 0)
    dx, dz = tx - inst["position"][0], tz - inst["position"][2]
    n = math.hypot(dx, dz) or 1
    return (fx * dx + fz * dz) / n


def face_dot(inst, tx, tz):
    fx, fz = facing(inst.get("rotationY") or 0)
    return fx * tx + fz * tz


south_edge = island["z"] + island["d"] / 2
west_edge = island["x"] - island["w"] / 2
east_edge = island["x"] + island["w"] / 2
for inst in LAYOUT["instances"]:
    if inst["kind"] == "bar_stool":
        x, _, z = inst["position"]
        # Sitters look across the near edge, not at the island centroid.
        if z > south_edge - 0.15:
            d = face_dot(inst, 0, -1)
            side = "south"
        elif x < west_edge + 0.15:
            d = face_dot(inst, 1, 0)
            side = "west"
        elif x > east_edge - 0.15:
            d = face_dot(inst, -1, 0)
            side = "east"
        else:
            d = dot_toward(inst, island["x"], island["z"])
            side = "near"
        if d < 0.9:
            fail(f"{inst['id']} ({side}) does not face the island (dot {d:.2f})")
    if inst["kind"] == "dining_chair":
        d = dot_toward(inst, tasting["x"], tasting["z"])
        if d < 0.75:
            fail(f"{inst['id']} does not face the tasting table (dot {d:.2f})")

stools = [i for i in LAYOUT["instances"] if i["kind"] == "bar_stool"]
if len(stools) < 5:
    fail("expected at least five island stools")
south = island["z"] + island["d"] / 2
for inst in stools:
    if abs(inst["position"][2] - island["z"]) < abs(inst["position"][0] - island["x"]):
        # end stool
        continue
    gap = inst["position"][2] - south
    if gap < -0.05 or gap > 0.45:
        fail(f"{inst['id']} south gap {gap:.2f} is not tucked to the island")

xs = sorted(i["position"][0] for i in stools if i["position"][2] > island["z"])
gaps = [round(b - a, 3) for a, b in zip(xs, xs[1:])]
if len(gaps) >= 2 and max(gaps) - min(gaps) < 0.02:
    fail(f"south stools are a uniform grid: {gaps}")

aisle = (island["z"] - island["d"] / 2) - counter["zFront"]
if aisle < 1.05:
    fail(f"cook aisle {aisle:.2f}m is tighter than 1.05m")
if not (0.9 <= counter["h"] <= 0.96):
    fail("counter is not a standing work height")
if not (1.0 <= island["h"] <= 1.08):
    fail("island is not bar height for the stools")

pendants = [i for i in LAYOUT["instances"] if i["kind"] == "pendant_lamp"]
lights = LAYOUT["lights"]["points"]
for p in pendants:
    if not any(abs(p["position"][0] - L["position"][0]) < 0.08 and abs(p["position"][2] - L["position"][2]) < 0.08 for L in lights):
        fail(f"{p['id']} has no matching pendant light")

for key in ("island", "counter", "tasting", "fridge", "range", "sink", "windows"):
    if key not in zones:
        fail(f"missing zone {key}")

if "layout.zones" not in JS:
    fail("kitchen.js should build from layout.zones")
if "http://" in HTML or "https://" in HTML:
    fail("index.html should not load a CDN")
if "three.module.js" not in HTML:
    fail("import map should point at the vendored three build")

# Entry path and the cook aisle are not inside the island or the counter slab.
samples = [(0.05, 1.15), (0.0, -2.55), (1.2, -2.4), (-1.0, -2.45)]
ix0, ix1 = island["x"] - island["w"] / 2, island["x"] + island["w"] / 2
iz0, iz1 = island["z"] - island["d"] / 2, island["z"] + island["d"] / 2
cx0, cx1 = counter["x0"], counter["x1"]
cz1 = counter["zFront"]
cz0 = cz1 - counter["depth"]
for x, z in samples:
    if ix0 <= x <= ix1 and iz0 <= z <= iz1:
        fail(f"circulation sample {(x, z)} sits inside the island")
    if cx0 <= x <= cx1 and cz0 <= z <= cz1:
        fail(f"circulation sample {(x, z)} sits inside the counter")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok — {len(LAYOUT['instances'])} instances, aisle {aisle:.2f}m, {len(LAYOUT['assets'])} assets")
