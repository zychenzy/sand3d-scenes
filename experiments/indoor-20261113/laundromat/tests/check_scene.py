#!/usr/bin/env python3
"""Layout, asset, and circulation checks for the neighbourhood laundromat."""

import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
HTML = (ROOT / "index.html").read_text()
JS = (ROOT / "laundromat.js").read_text()
LIB = (ROOT / "scene_lib.js").read_text()

errors = []


def fail(msg):
    errors.append(msg)


room = LAYOUT["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
zones = LAYOUT["zones"]
dry = zones["dryers"]
wash = zones["washers"]
std = wash["standards"]
big = wash["larges"]
fold = zones["fold"]
sort = zones["sort"]

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
    if ROOT.resolve() in path.parents or path.parent == ROOT.resolve():
        fail(f"glb should be referenced from the repo, not copied here: {glb}")
    if REPO.resolve() not in path.parents and path != REPO.resolve():
        fail(f"glb resolves outside the repo: {glb}")

for inst in LAYOUT["instances"] + LAYOUT["props"]:
    x, y, z = inst["position"]
    if abs(x) > W / 2 + 0.05 or abs(z) > D / 2 + 0.05:
        fail(f"{inst['id']} outside room {inst['position']}")
    if y < -0.01 or y > H:
        fail(f"{inst['id']} bad height {y}")
    if inst in LAYOUT["instances"] and inst["kind"] not in LAYOUT["assets"]:
        fail(f"{inst['id']} unknown kind {inst['kind']}")

front_z = dry["wallZ"] + dry["depth"]
if abs(front_z - zones["clearance"][0]["z0"]) > 0.02:
    fail("dryer aisle does not start at the dryer face")
aisle = fold["backZ"] - front_z
if aisle < 1.45:
    fail(f"dryer service aisle {aisle:.2f}m is under 1.45m")
if not (0.88 <= fold["h"] <= 0.94):
    fail("folding counter is not a standing work height")
if abs(sort["h"] - fold["h"]) > 0.02:
    fail("sort counter should match folding work height")

std_face = wash["wallX"] + std["depth"]
big_face = wash["wallX"] + big["depth"]
washer_aisle = sort["x0"] - big_face
if washer_aisle < 1.35:
    fail(f"washer aisle {washer_aisle:.2f}m is under 1.35m")
if dry["h"] < std["h"] + 0.6:
    fail("dryer columns should read much taller than the washers")
if big["h"] <= std["h"]:
    fail("large washers should be taller than the standard bank")
if dry["count"] < 6 or std["count"] + big["count"] < 5:
    fail("banks are too short to read as a laundry")
if not (0 < dry["openIndex"] < dry["count"]):
    fail("dryer open door index is out of range")
if not (0 <= std["openIndex"] < std["count"]):
    fail("washer open door index is out of range")
span = dry["count"] * dry["colW"]
if span > W - 2:
    fail("dryer bank is wider than the back wall allows")

std_end = std["z0"] + std["count"] * std["w"] + (std["count"] - 1) * std["gap"]
if big["z0"] < std_end + 0.08:
    fail("large washers collide with the standard bank")
big_end = big["z0"] + big["count"] * big["w"] + (big["count"] - 1) * big["gap"]
if big_end > D / 2 - 0.7:
    fail("large washers run into the storefront")


def facing(rot):
    return math.sin(rot), math.cos(rot)


chairs = [i for i in LAYOUT["instances"] if i["kind"] == "simple_chair"]
if len(chairs) < 4:
    fail("expected at least four waiting chairs")
for inst in chairs:
    fx, fz = facing(inst.get("rotationY") or 0)
    dot = fx * 0 + fz * -1
    if dot < 0.9:
        fail(f"{inst['id']} does not face the machines (dot {dot:.2f})")

centers = [(c["position"][0], c["position"][2]) for c in chairs]
for i, a in enumerate(centers):
    for b in centers[i + 1 :]:
        if math.hypot(a[0] - b[0], a[1] - b[1]) < 0.75:
            fail(f"chairs closer than 0.75m: {a} {b}")

bench = next(i for i in LAYOUT["instances"] if i["kind"] == "bench")
if abs((bench.get("rotationY") or 0) - math.pi / 2) > 0.2:
    fail("window bench long axis should run along the storefront")


def rot_aabb(x, z, w, d, rot):
    c, s = math.cos(rot), math.sin(rot)
    xs, zs = [], []
    for lx, lz in ((w / 2, d / 2), (w / 2, -d / 2), (-w / 2, d / 2), (-w / 2, -d / 2)):
        xs.append(x + c * lx + s * lz)
        zs.append(z - s * lx + c * lz)
    return min(xs), max(xs), min(zs), max(zs)


def hits(box, rect):
    ax0, ax1, az0, az1 = box
    return not (ax1 < rect["x0"] - 0.02 or ax0 > rect["x1"] + 0.02 or az1 < rect["z0"] - 0.02 or az0 > rect["z1"] + 0.02)


# Chair footprint from the baked bounds, scaled to targetHeight.
chair_h = LAYOUT["assets"]["simple_chair"]["targetHeight"]
chair_w = chair_h * (475.21 / 450.19)
chair_d = chair_h * (448.08 / 450.19)
bench_h = LAYOUT["assets"]["bench"]["targetHeight"]
bench_x = bench_h * (418 / 380)
bench_z = bench_h * (1500 / 380)
table_h = LAYOUT["assets"]["side_table"]["targetHeight"]
table_d = table_h * (448 / 312)

footprints = []
for inst in LAYOUT["instances"]:
    rot = inst.get("rotationY") or 0
    x, _, z = inst["position"]
    if inst["kind"] == "simple_chair":
        footprints.append((inst["id"], rot_aabb(x, z, chair_w, chair_d, rot)))
    elif inst["kind"] == "bench":
        footprints.append((inst["id"], rot_aabb(x, z, bench_x, bench_z, rot)))
    elif inst["kind"] == "side_table":
        footprints.append((inst["id"], rot_aabb(x, z, table_d, table_d, rot)))
for spec in LAYOUT["props"]:
    x, _, z = spec["position"]
    fw, fd = spec["foot"]
    footprints.append((spec["id"], rot_aabb(x, z, fw, fd, spec.get("rotationY") or 0)))

for name, box in footprints:
    for rect in zones["clearance"]:
        if hits(box, rect):
            fail(f"{name} blocks {rect['id']}")

if "MeshToonMaterial" not in LIB or "MeshBasicMaterial" not in LIB:
    fail("scene_lib should implement toon and true unlit materials")
if "PCFHardShadowMap" not in LIB:
    fail("hard shadows should be the default")
if "http://" in HTML or "https://" in HTML:
    fail("index.html should not load a CDN")
if "three.module.js" not in HTML:
    fail("import map should point at the vendored three build")
vendor = (ROOT / "../../../workshop/vendor/three.module.js").resolve()
if not vendor.exists():
    fail("vendored three.module.js is missing")
if "layout.zones" not in JS and "zones" not in JS:
    fail("laundromat.js should build the banks from layout zones")
if "makeShell" not in JS or "makeProcedural" not in JS:
    fail("scene should build a shell and the laundry fixtures")

# Folding surface must not sit inside the dryer aisle.
fold_box = (fold["x0"], fold["x1"], fold["backZ"], fold["backZ"] + fold["depth"])
dryer_rect = zones["clearance"][0]
if not (fold_box[3] <= dryer_rect["z1"] + 0.02 or fold_box[2] >= dryer_rect["z1"] - 0.02):
    pass
if fold["backZ"] < dryer_rect["z1"] - 0.03:
    fail("folding counter overlaps the dryer aisle")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(
    f"ok — {len(LAYOUT['instances'])} instances, {len(LAYOUT['assets'])} assets, "
    f"dryer aisle {aisle:.2f}m, washer aisle {washer_aisle:.2f}m, "
    f"{dry['count']} dryer columns, {std['count'] + big['count']} washers"
)
