#!/usr/bin/env python3
"""Measurable checks for the glass-studio layout. No browser required."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
GLASS = (ROOT / "glass.js").read_text()

# World-axis extents in metres, measured from the baked GLBs.
NATIVE = {
    "square_table": (1.2, 1.184, 1.2),
    "pendant_lamp": (0.2463, 0.449, 0.2463),
    "museum_bench": (0.418, 0.456, 1.5),
    "wall_shelf": (0.7012, 0.8, 0.2873),
    "jam_jar": (0.094, 0.12, 0.094),
}

fails = []


def check(ok, msg):
    if not ok:
        fails.append(msg)


def scale_of(inst):
    sc = inst.get("scale", 1)
    if isinstance(sc, list):
        if len(sc) == 3:
            return sc
        return [sc[0], sc[0], sc[0]]
    return [sc, sc, sc]


def aabb(kind, inst):
    nx, ny, nz = NATIVE[kind]
    target = LAYOUT["assets"][kind]["targetHeight"]
    s = target / ny
    sx, sy, sz = scale_of(inst)
    wx, wy, wz = nx * s * sx, ny * s * sy, nz * s * sz
    rot = abs(inst.get("rotationY", 0))
    if abs(rot - math.pi / 2) < 0.25 or abs(rot - 3 * math.pi / 2) < 0.25:
        wx, wz = wz, wx
    x, y, z = inst["position"]
    return (x - wx / 2, x + wx / 2, y, y + wy, z - wz / 2, z + wz / 2)


def overlap(a, b, pad=0.0):
    return (
        a[1] + pad > b[0]
        and b[1] + pad > a[0]
        and a[3] + pad > b[2]
        and b[3] + pad > a[2]
        and a[5] + pad > b[4]
        and b[5] + pad > a[4]
    )


def xz(box):
    return (box[0], box[1], box[4], box[5])


def xz_overlap(a, b, gap=0.0):
    return a[1] + gap > b[0] and b[1] + gap > a[0] and a[3] + gap > b[2] and b[3] + gap > a[2]


# Asset files resolve inside the repo and are not duplicated into this folder.
for kind, spec in LAYOUT["assets"].items():
    path = (ROOT / spec["glb"]).resolve()
    check(str(path).startswith(str(REPO)), f"{kind} escapes the repo: {path}")
    check(path.is_file(), f"missing GLB for {kind}: {path}")
    check("assets/" not in spec["glb"] or spec["glb"].startswith(".."), f"{kind} should reference shared GLBs")

check("transparent: true" not in GLASS, "glass.js uses transparent materials; keep glass opaque")
check(GLASS.count("emissive") >= 4, "furnace / gather / lehr emissive markers missing")

room = LAYOUT["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
instances = {i["id"]: i for i in LAYOUT["instances"]}
boxes = {i["id"]: aabb(i["kind"], i) for i in LAYOUT["instances"]}

for iid, box in boxes.items():
    check(box[0] > -W / 2 - 0.05 and box[1] < W / 2 + 0.05, f"{iid} outside room width {box}")
    check(box[4] > -D / 2 - 0.05 and box[5] < D / 2 + 0.05, f"{iid} outside room depth {box}")
    check(box[3] < H + 0.05, f"{iid} pokes through the ceiling {box}")

# Floor furniture must not occupy the same volume. Jars live inside shelf AABBs.
skip_pairs = set()
for a in instances:
    for b in instances:
        if a >= b:
            continue
        kinds = {instances[a]["kind"], instances[b]["kind"]}
        if "jam_jar" in kinds and "wall_shelf" in kinds:
            continue
        if "pendant_lamp" in kinds:
            continue
        if overlap(boxes[a], boxes[b], pad=-0.02):
            fails.append(f"overlap {a} and {b}")

zones = LAYOUT["zones"]
f = zones["furnace"]
check(abs(f["frontZ"] - (f["z"] + f["length"] / 2)) < 0.011, "furnace frontZ is not the drum face")
check(0.9 < f["mouthY"] < 1.45, "glory-hole mouth is outside working height")
gap = zones["bench"]["railTipZ"] - f["frontZ"]
check(gap >= 0.85, f"bench-to-furnace swing gap {gap:.2f} m is under 0.85 m")

# Swing corridor in front of the mouth stays clear of storage and display.
swing = (f["x"] - 0.7, f["x"] + 0.7, f["frontZ"], zones["bench"]["railTipZ"])
# swing stored as (xmin, xmax, z_back, z_front) with z_back < z_front
swing_box = (swing[0], swing[1], swing[2], swing[3])


def blocks_swing(name, xmin, xmax, zmin, zmax):
    box = (xmin, xmax, zmin, zmax)
    # overlap test expects (xmin, xmax, zmin, zmax)
    if xz_overlap((swing_box[0], swing_box[1], swing_box[2], swing_box[3]), box, gap=-0.02):
        fails.append(f"{name} blocks the glory-hole swing aisle")


lehr = zones["lehr"]
blocks_swing("lehr", lehr["x"] - lehr["w"] / 2, lehr["x"] + lehr["w"] / 2, lehr["z"] - lehr["d"] / 2, lehr["z"] + lehr["d"] / 2)
marver = zones["marver"]
blocks_swing("marver", marver["x"] - marver["halfX"], marver["x"] + marver["halfX"], marver["z"] - marver["halfZ"], marver["z"] + marver["halfZ"])
for b in zones["bins"]:
    blocks_swing(b["id"], b["x"] - b["hx"], b["x"] + b["hx"], b["z"] - b["hz"], b["z"] + b["hz"])
cold = zones["cold"]
blocks_swing("cold", cold["x"] - cold["w"] / 2, cold["x"] + cold["w"] / 2, cold["z"] - cold["d"] / 2, cold["z"] + cold["d"] / 2)
rack = zones["pipeRack"]
blocks_swing("pipeRack", rack["x"] - 0.4, rack["x"] + 0.4, rack["z"] - 0.2, rack["z"] + 0.4)

# 0.9 m reach in front of every cullet bin.
clear = zones["clearance"]
obstacles = []
for iid in ("gaffer_bench", "marver"):
    box = boxes[iid]
    obstacles.append((iid, (box[0], box[1], box[4], box[5])))
obstacles.append(("cold", (cold["x"] - cold["w"] / 2, cold["x"] + cold["w"] / 2, cold["z"] - cold["d"] / 2, cold["z"] + cold["d"] / 2)))
for b in zones["bins"]:
    front = b["x"] + b["hx"]
    aisle = (front, front + clear, b["z"] - b["hz"], b["z"] + b["hz"])
    for name, box in obstacles:
        if xz_overlap(aisle, box):
            fails.append(f"{b['id']} reach aisle hits {name}")

check("dining_chair" not in LAYOUT["assets"], "dining chairs do not belong in the hot shop")
check(all(i["kind"] != "dining_chair" for i in LAYOUT["instances"]), "a dining chair is still instanced")
check(lehr["w"] >= 2.2 and lehr["h"] >= 1.05, "lehr should read as a long box")
check("sillY" in lehr, "lehr sill missing")
check(cold["w"] >= 1.4, "cold shop should be one long bench")
bench_zone = zones["bench"]
check(abs(bench_zone["x"] - f["x"]) < 0.02, "gaffer bench is off the furnace axis")
check(abs(bench_zone["z"] - marver["z"]) < 0.02, "marver is not beside the bench at the same depth")
check(marver["x"] > bench_zone["x"] + bench_zone["halfX"], "marver does not sit to the bench's right")
check(abs(instances["marver"]["rotationY"]) < 0.05, "marver is yawed off the furnace axis")

bench_inst = instances["gaffer_bench"]
check(abs(bench_inst["rotationY"] - math.pi / 2) < 0.02, "gaffer bench long axis is not along X")
check(abs(bench_inst["position"][0] - zones["bench"]["x"]) < 0.01, "bench instance drifted from zone")
check(abs(bench_inst["position"][2] - zones["bench"]["z"]) < 0.01, "bench instance z drifted")
bb = boxes["gaffer_bench"]
check(abs((bb[1] - bb[0]) / 2 - zones["bench"]["halfX"]) < 0.03, "bench halfX does not match the GLB scale")
check(abs((bb[5] - bb[4]) / 2 - zones["bench"]["halfZ"]) < 0.03, "bench halfZ does not match the GLB scale")

mb = boxes["marver"]
check(abs(instances["marver"]["position"][0] - marver["x"]) < 0.01, "marver instance drifted")
check(abs((mb[1] - mb[0]) / 2 - marver["halfX"]) < 0.03, "marver halfX drifted")
check(abs((mb[3] - mb[2]) - marver["top"]) < 0.02, "marver top is not the table height")

# Finished pieces sit on a real support, inset by their own radius.
gallery = zones["gallery"]
supports = {
    "gallery": (
        gallery["x"] - gallery["w"] / 2,
        gallery["x"] + gallery["w"] / 2,
        0,
        gallery["top"],
        gallery["z"] - gallery["d"] / 2,
        gallery["z"] + gallery["d"] / 2,
    ),
    "cold": (cold["x"] - cold["w"] / 2, cold["x"] + cold["w"] / 2, 0, cold["h"], cold["z"] - cold["d"] / 2, cold["z"] + cold["d"] / 2),
    "marver": (marver["x"] - marver["halfX"], marver["x"] + marver["halfX"], 0, marver["top"], marver["z"] - marver["halfZ"], marver["z"] + marver["halfZ"]),
}
front = lehr["z"] + lehr["d"] / 2
sill_z = front + 0.22
supports["lehr"] = (
    lehr["x"] - lehr["w"] * 0.31,
    lehr["x"] + lehr["w"] * 0.31,
    0,
    lehr["sillY"] + 0.018,
    sill_z - 0.11,
    sill_z + 0.11,
)
check(sum(1 for p in zones["pieces"] if p["support"] == "gallery") >= 5, "gallery shelf should hold the finished glass")

for piece in zones["pieces"]:
    sup = supports[piece["support"]]
    r = piece["r"]
    check(abs(piece["y"] - sup[3]) < 0.02, f"{piece['glass']} {piece['type']} y {piece['y']} != support top {sup[3]}")
    check(sup[0] + r < piece["x"] < sup[1] - r, f"{piece['glass']} {piece['type']} overhangs support in x")
    check(sup[4] + r < piece["z"] < sup[5] - r, f"{piece['glass']} {piece['type']} overhangs support in z")

# Colour pots sit on the upper board of the batch shelf.
shelf = instances["shelf_batch"]
sy = scale_of(shelf)[1]
upper = shelf["position"][1] + 0.8125 * LAYOUT["assets"]["wall_shelf"]["targetHeight"] * sy
sb = boxes["shelf_batch"]
for iid in ("pot_a", "pot_b", "pot_c"):
    pot = instances[iid]
    check(abs(pot["position"][1] - upper) < 0.01, f"{iid} is not on the upper shelf ({pot['position'][1]} vs {upper})")
    check(sb[0] < pot["position"][0] < sb[1], f"{iid} misses the shelf in x")
    check(sb[4] + 0.06 < pot["position"][2] < sb[5] - 0.06, f"{iid} misses the shelf in z")

check("corner" in LAYOUT["cameraPresets"] and "close" in LAYOUT["cameraPresets"], "camera presets")
check(LAYOUT["camera"]["fov"] >= 40, "default fov")

if fails:
    print(f"{len(fails)} layout check(s) failed:")
    for msg in fails:
        print(" -", msg)
    sys.exit(1)
print(f"ok — {len(LAYOUT['instances'])} instances, {len(zones['pieces'])} glass pieces, swing gap {gap:.2f} m")
