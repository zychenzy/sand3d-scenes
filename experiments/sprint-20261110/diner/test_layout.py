#!/usr/bin/env python3
"""Geometry checks for the neighborhood diner. No browser required."""
import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
layout = json.loads((ROOT / "layout.json").read_text())
errors = []


def fail(msg):
    errors.append(msg)


def forward(rot):
    return math.sin(rot), math.cos(rot)


room = layout["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
instances = layout["instances"]
by_id = {i["id"]: i for i in instances}
features = layout["features"]

if not features.get("noPartitions"):
    fail("features.noPartitions must be true")

neon = features["neon"]
if not (0.25 <= neon["intensity"] <= 0.55):
    fail(f"neon intensity {neon['intensity']} is outside the subtle band")

for inst in instances:
    kind = inst["kind"]
    if kind not in layout["assets"]:
        fail(f"{inst['id']} uses unknown kind {kind}")
    blob = f"{inst['id']} {kind}".lower()
    for banned in ("partition", "shoji", "divider", "screen"):
        if banned in blob:
            fail(f"{inst['id']} looks like a room divider")
    x, y, z = inst["position"]
    if abs(x) > W / 2 - 0.15 or abs(z) > D / 2 - 0.2:
        fail(f"{inst['id']} sits outside the room at {(x, z)}")
    if y < -0.01 or y > H:
        fail(f"{inst['id']} height {y} is outside the shell")

for rel in layout["assets"].values():
    glb = rel["glb"]
    if glb.startswith(("http://", "https://", "/")):
        fail(f"asset path must be relative: {glb}")
    if ".." not in glb:
        fail(f"asset should reference a shared GLB, not a local copy: {glb}")
    path = (ROOT / glb).resolve()
    if not path.is_file():
        fail(f"missing glb {path}")
    elif ROOT.resolve() in path.parents:
        fail(f"glb was copied into the diner folder: {path}")
    elif path.stat().st_size < 1000:
        fail(f"glb looks empty: {path}")

html = (ROOT / "index.html").read_text()
js = (ROOT / "diner.js").read_text() + (ROOT / "scene_lib.js").read_text()
for banned in ("https://", "http://", "cdn.jsdelivr", "unpkg"):
    if banned in html or banned in js:
        fail(f"offline scene references {banned}")
for banned in ("shoji", "partition", "屏风"):
    if banned in js:
        fail(f"scene script contains {banned}")

booth_fp = layout["footprints"]["diner_booth"]
b_scale = layout["assets"]["diner_booth"]["targetHeight"] / booth_fp["nativeHeight"]
half_d = booth_fp["nativeZ"] * b_scale / 2
half_w = booth_fp["nativeX"] * b_scale / 2

for pair in ("a", "b"):
    west = by_id[f"booth_{pair}_w"]
    east = by_id[f"booth_{pair}_e"]
    if abs(west["position"][2] - east["position"][2]) > 0.02:
        fail(f"booth pair {pair} is not aligned")
    if west["rotationY"] > -1.4 or east["rotationY"] < 1.4:
        fail(f"booth pair {pair} rotations are not opposite ±90°")
    inner_w = west["position"][0] + half_d
    inner_e = east["position"][0] - half_d
    gap = inner_e - inner_w
    if not (0.008 <= gap <= 0.045):
        fail(f"booth pair {pair} back gap is {gap:.4f}m, want about 2cm")

table_fp = layout["footprints"]["dining_table"]
t_scale = layout["assets"]["dining_table"]["targetHeight"] / table_fp["nativeHeight"]

for table_id in ("table_rear", "table_front"):
    table = by_id[table_id]
    sx = table["scale"][0]
    long_m = table_fp["nativeX"] * t_scale * sx
    if long_m < 1.9:
        fail(f"{table_id} is only {long_m:.2f}m long")
    chairs = [i for i in instances if i.get("faces") == table_id]
    if len(chairs) != 6:
        fail(f"{table_id} has {len(chairs)} chairs, want 6")
    tx, tz = table["position"][0], table["position"][2]
    for chair in chairs:
        fx, fz = forward(chair["rotationY"])
        vx, vz = tx - chair["position"][0], tz - chair["position"][2]
        mag = math.hypot(vx, vz) or 1
        dot = (fx * vx + fz * vz) / mag
        if dot < 0.75:
            fail(f"{chair['id']} does not face {table_id} (dot {dot:.2f})")

stools = [i for i in instances if i["kind"] == "bar_stool"]
if len(stools) < 5:
    fail("need at least five counter stools")
face = features["counter"]["xFace"]
z0, z1 = features["counter"]["z0"], features["counter"]["z1"]
for stool in stools:
    fx, fz = forward(stool["rotationY"])
    if fx < 0.8:
        fail(f"{stool['id']} does not face the counter")
    if stool["position"][0] > face - 0.3:
        fail(f"{stool['id']} is under or behind the counter")
    if not (z0 + 0.2 < stool["position"][2] < z1 - 0.2):
        fail(f"{stool['id']} is off the end of the counter")
for i, a in enumerate(stools):
    for b in stools[i + 1 :]:
        d = math.dist(a["position"], b["position"])
        if d < 0.7:
            fail(f"{a['id']} and {b['id']} are only {d:.2f}m apart")


def aabb(inst, hx, hz):
    x, z = inst["position"][0], inst["position"][2]
    return (x - hx, x + hx, z - hz, z + hz)


def hits(box, x, z, pad):
    return box[0] - pad < x < box[1] + pad and box[2] - pad < z < box[3] + pad


booths = [i for i in instances if i["kind"] == "diner_booth"]
chairs = [i for i in instances if i["kind"] == "dining_chair"]
for booth in booths:
    box = aabb(booth, half_d, half_w)
    for chair in chairs:
        if hits(box, chair["position"][0], chair["position"][2], 0.2):
            fail(f"{chair['id']} collides with {booth['id']}")
    for stool in stools:
        if hits(box, stool["position"][0], stool["position"][2], 0.2):
            fail(f"{stool['id']} collides with {booth['id']}")

if len(booths) < 4:
    fail("need four booth units for two back-to-back pairs")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok — {len(instances)} instances, booth gap and facing checks passed")
