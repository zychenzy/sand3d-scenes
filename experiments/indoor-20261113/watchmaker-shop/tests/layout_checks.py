#!/usr/bin/env python3
"""Clearance, asset, and proportion checks for the watchmaker shop. No browser."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
by_id = {item["id"]: item for item in layout["instances"]}
props = layout["proportions"]
anchors = layout["anchors"]

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"
assert (ROOT / "vendor" / "three.module.js").is_file()
assert (ROOT / "vendor" / "controls" / "OrbitControls.js").is_file()
assert (ROOT / "vendor" / "loaders" / "GLTFLoader.js").is_file()
html = (ROOT / "index.html").read_text()
assert "./vendor/three.module.js" in html
lib = (ROOT / "scene_lib.js").read_text()
assert "MeshToonMaterial" in lib and "MeshBasicMaterial" in lib
assert "PCFHardShadowMap" in lib
assert "gradientMap: (src && src.gradientMap)" in lib

NATIVE = {
    "bar_stool": (0.464, 0.750, 0.464),
    "simple_chair": (0.475, 0.850, 0.501),
    "library_lamp": (0.341, 0.451, 0.341),
    "pendant_lamp": (0.246, 0.449, 0.246),
    "square_table": (1.2, 1.184, 1.2),
    "cash_register": (0.241, 0.452, 0.356),
    "display_bookcase": (0.834, 2.0, 0.408),
    "wall_shelf": (0.701, 0.8, 0.287),
    "museum_bench": (0.418, 0.456, 1.5),
    "museum_vitrine": (0.812, 0.9, 0.812),
    "jam_jar": (0.094, 0.110, 0.094),
    "cup_mug": (0.075, 0.076, 0.075),
    "flowerpot": (0.250, 0.204, 0.250),
}

FLOOR = {
    "bar_stool", "simple_chair", "square_table", "display_bookcase",
    "wall_shelf", "museum_bench", "museum_vitrine", "flowerpot",
}
half_w = room["width"] / 2
half_d = room["depth"] / 2


def fail(msg):
    raise AssertionError(msg)


def near(a, b, tol, msg):
    if abs(a - b) > tol:
        fail(f"{msg}: {a} != {b} (tol {tol})")


def scale_of(inst):
    sc = inst.get("scale", 1)
    if isinstance(sc, list):
        if len(sc) == 3:
            return sc
        return [sc[0], sc[0], sc[0]]
    return [sc, sc, sc]


def aabb(inst):
    kind = inst["kind"]
    nx, ny, nz = NATIVE[kind]
    target = layout["assets"][kind]["targetHeight"]
    s = target / ny
    sx, sy, sz = scale_of(inst)
    wx, wy, wz = nx * s * sx, ny * s * sy, nz * s * sz
    rot = abs(inst.get("rotationY", 0.0))
    if abs(rot - math.pi / 2) < 0.2 or abs(rot - 3 * math.pi / 2) < 0.2:
        wx, wz = wz, wx
    x, y, z = inst["position"]
    return (x - wx / 2, x + wx / 2, y, y + wy, z - wz / 2, z + wz / 2)


def xz_overlap(a, b):
    return a[1] > b[0] and b[1] > a[0] and a[3] > b[2] and b[3] > a[2]


def overlap_depth(a, b):
    ox = min(a[1], b[1]) - max(a[0], b[0])
    oz = min(a[3], b[3]) - max(a[2], b[2])
    if ox <= 0 or oz <= 0:
        return 0.0
    return min(ox, oz)


def dist_point(px, pz, box):
    cx = min(max(px, box[0]), box[1])
    cz = min(max(pz, box[2]), box[3])
    return math.hypot(px - cx, pz - cz)


for inst in layout["instances"]:
    x, y, z = inst["position"]
    box = aabb(inst)
    if box[1] > half_w - 0.05 or box[0] < -half_w + 0.05:
        fail(f"{inst['id']} leaves the room in x {box}")
    if box[5] > half_d - 0.08 or box[4] < -half_d + 0.05:
        fail(f"{inst['id']} leaves the room in z {box}")
    if y < -0.001 or y > room["height"]:
        fail(inst["id"])
    glb = (ROOT / layout["assets"][inst["kind"]]["glb"]).resolve()
    if not str(glb).startswith(str(REPO)):
        fail(f"{inst['kind']} escapes the repo: {glb}")
    if not glb.is_file():
        fail(f"missing {glb}")

vendor = (ROOT / "vendor" / "three.module.js").resolve()
if not str(vendor).startswith(str(REPO)):
    fail(f"vendor escapes the repo: {vendor}")

# Floor footprints, allowing a chair to tuck 8 cm under the waiting table.
allowed = {frozenset(("chair_wait_s", "wait_table")), frozenset(("chair_wait_n", "wait_table"))}
floor_boxes = []
for inst in layout["instances"]:
    if inst["kind"] not in FLOOR:
        continue
    box = aabb(inst)
    floor_boxes.append((inst["id"], (box[0], box[1], box[4], box[5])))

for i, (ida, ba) in enumerate(floor_boxes):
    for idb, bb in floor_boxes[i + 1:]:
        depth = overlap_depth(ba, bb)
        if depth <= 0:
            continue
        pair = frozenset((ida, idb))
        if pair in allowed and depth <= 0.08:
            continue
        fail(f"{ida} overlaps {idb} by {depth:.3f} m")

blockers = [(b["id"], (b["x0"], b["x1"], b["z0"], b["z1"])) for b in layout["blockers"]]
for ida, ba in floor_boxes:
    for idb, bb in blockers:
        depth = overlap_depth(ba, bb)
        if depth > 0.02:
            fail(f"{ida} overlaps blocker {idb} by {depth:.3f} m")

# Walk from the open front, around the counter, and along the bench aisle.
solids = [bb for _, bb in floor_boxes] + [bb for _, bb in blockers]
for name, path in layout["paths"].items():
    samples = []
    for (x0, z0), (x1, z1) in zip(path, path[1:]):
        steps = max(2, int(math.hypot(x1 - x0, z1 - z0) / 0.25))
        for i in range(steps + 1):
            t = i / steps
            samples.append((x0 + (x1 - x0) * t, z0 + (z1 - z0) * t))
    for px, pz in samples:
        nearest = min(dist_point(px, pz, box) for box in solids)
        if nearest < 0.38:
            fail(f"path {name} at ({px:.2f},{pz:.2f}) is only {nearest:.2f} m from a solid")

# Lamps, jars, and the register stay on their work surfaces.
bench_a = anchors["benchA"]
bench_b = anchors["benchB"]


def on_rect(inst_id, rect, y, margin=0.0):
    box = aabb(by_id[inst_id])
    x0, x1 = rect["x"] - rect["w"] / 2 + margin, rect["x"] + rect["w"] / 2 - margin
    z0, z1 = rect["z"] - rect["d"] / 2 + margin, rect["z"] + rect["d"] / 2 - margin
    if box[0] < x0 or box[1] > x1 or box[4] < z0 or box[5] > z1:
        fail(f"{inst_id} is not on the surface {box}")
    near(by_id[inst_id]["position"][1], y, 0.001, inst_id + " height")


on_rect("lamp_a", bench_a, props["benchTop"])
on_rect("lamp_b", bench_b, props["benchTop"])
on_rect("jar_oil", bench_a, props["benchTop"])
on_rect("jar_rinse", bench_b, props["benchTop"])
on_rect("mug_bench", bench_a, props["benchTop"])

counter = anchors["counter"]
reg = aabb(by_id["register"])
if reg[0] < counter["solidX"] or reg[1] > counter["x"] + counter["w"] / 2:
    fail(f"register misses the solid counter end {reg}")
if reg[4] < counter["z"] - counter["d"] / 2 or reg[5] > counter["z"] + counter["d"] / 2:
    fail("register misses the counter depth")
near(by_id["register"]["position"][1], counter["h"], 0.001, "register")

shelf = aabb(by_id["parts_shelf"])
for jar_id, top in zip(("jar_shelf_a", "jar_shelf_b", "jar_shelf_c"), (anchors["shelfTops"][0], anchors["shelfTops"][0], anchors["shelfTops"][1])):
    box = aabb(by_id[jar_id])
    if box[0] < shelf[0] or box[1] > shelf[1] or box[4] < shelf[4] or box[5] > shelf[5]:
        fail(f"{jar_id} misses the parts shelf")
    near(by_id[jar_id]["position"][1], top, 0.001, jar_id)

table = anchors["table"]
mug = aabb(by_id["mug_wait"])
half_table = 1.2 * (props["tableTarget"] / NATIVE["square_table"][1]) / 2
if abs(by_id["mug_wait"]["position"][0] - table["x"]) > half_table:
    fail("mug misses the waiting table")
if abs(by_id["mug_wait"]["position"][2] - table["z"]) > half_table:
    fail("mug misses the waiting table")
near(by_id["mug_wait"]["position"][1], props["tableTarget"], 0.001, "mug_wait")

print(f"ok — {len(by_id)} instances, assets inside the repo, aisle clear")
