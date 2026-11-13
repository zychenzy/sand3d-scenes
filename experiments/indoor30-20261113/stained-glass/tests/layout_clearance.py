#!/usr/bin/env python3
"""Measurable checks for the cold stained-glass workshop. No browser required."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
SCENE = (ROOT / "stained.js").read_text()
LIB = (ROOT / "scene_lib.js").read_text()
HTML = (ROOT / "index.html").read_text()

# World-axis extents in metres, from node-transformed GLB bounds.
NATIVE = {
    "long_dining": (1.8000, 0.7273, 0.9376),
    "piano_bench": (0.9018, 0.4726, 0.4351),
    "study_desk": (0.3691, 0.6490, 1.1000),
    "simple_chair": (0.4752, 0.8500, 0.5010),
    "square_table": (1.2000, 1.1840, 1.2000),
    "wall_shelf": (0.7012, 0.8000, 0.2873),
    "easel": (0.7070, 1.7000, 0.8000),
    "pendant_lamp": (0.2463, 0.4490, 0.2463),
    "library_lamp": (0.3410, 0.4506, 0.3413),
    "jam_jar": (0.0940, 0.1200, 0.0940),
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
    rot = abs(inst.get("rotationY", 0)) % (2 * math.pi)
    if abs(rot - math.pi / 2) < 0.2 or abs(rot - 3 * math.pi / 2) < 0.2:
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


def xz_overlap(a, b, gap=0.0):
    return a[1] + gap > b[0] and b[1] + gap > a[0] and a[3] + gap > b[2] and b[3] + gap > a[2]


# Shared GLBs only. Nothing copied into this folder.
check(not (ROOT / "vendor").exists(), "vendor was copied into the scene folder")
check(not (ROOT / "assets").exists(), "assets were copied into the scene folder")
check("../../../workshop/vendor/three.module.js" in HTML, "import map must use the shared workshop vendor")
check("NearestFilter" in LIB, "toon gradient is not hard-stepped")
check("MeshBasicMaterial" in LIB, "unlit path is missing")
check("ExtrudeGeometry" in SCENE, "coloured glass is not extruded sheet")
check("transparent: true" in SCENE, "coloured glass is opaque")
check(SCENE.count("foil-roll") >= 1 or "foilRoll" in SCENE, "foil rolls missing")
for banned in ("glory", "blowpipe", "lehr", "furnace", "marver"):
    check(banned not in SCENE.lower(), f"hot-shop term {banned} leaked into the cold shop")

for kind, spec in LAYOUT["assets"].items():
    path = (ROOT / spec["glb"]).resolve()
    check(str(path).startswith(str(REPO)), f"{kind} escapes the repo: {path}")
    check(path.is_file(), f"missing GLB for {kind}: {path}")
    check(spec["glb"].startswith("../"), f"{kind} should reference a shared GLB")
    check(kind in NATIVE, f"no measured bounds for {kind}")

room = LAYOUT["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
instances = {i["id"]: i for i in LAYOUT["instances"]}
boxes = {i["id"]: aabb(i["kind"], i) for i in LAYOUT["instances"]}

for iid, box in boxes.items():
    check(box[0] > -W / 2 - 0.08 and box[1] < W / 2 + 0.08, f"{iid} outside room width {box}")
    check(box[4] > -D / 2 - 0.08 and box[5] < D / 2 - 0.02, f"{iid} outside room depth {box}")
    check(box[3] < H + 0.02, f"{iid} pokes through the ceiling {box}")
    check(box[2] > -0.02, f"{iid} is below the floor {box}")

skip_kinds = {("jam_jar", "study_desk"), ("jam_jar", "square_table"), ("jam_jar", "wall_shelf"),
              ("library_lamp", "study_desk")}
ids = list(instances)
for i, a in enumerate(ids):
    for b in ids[i + 1:]:
        kinds = tuple(sorted((instances[a]["kind"], instances[b]["kind"])))
        if kinds in skip_kinds or "pendant_lamp" in kinds:
            continue
        if overlap(boxes[a], boxes[b], pad=-0.02):
            fails.append(f"overlap {a} and {b}")

zones = LAYOUT["zones"]
table = instances["light_table"]
check(abs(table["position"][0] - zones["lightTable"]["x"]) < 0.02, "light table drifted from its zone")
check(abs(table["position"][2] - zones["lightTable"]["z"]) < 0.02, "light table z drifted")
check(abs(LAYOUT["assets"]["long_dining"]["targetHeight"] - zones["lightTable"]["top"]) < 0.01, "light table height")
desk = instances["solder_desk"]
check(abs(desk["position"][0] - zones["solder"]["x"]) < 0.02, "solder desk drifted")
check(abs(zones["vent"]["x"] - zones["solder"]["ironX"]) < 0.15, "vent is not over the iron")
check(abs(zones["vent"]["z"] - zones["solder"]["z"]) < 0.25, "vent is not at the solder bench")

path = zones["path"]
check(path["w"] >= 0.9 and path["d"] >= 0.9, "shared work path is narrower than 0.9 m")
path_box = (path["x"] - path["w"] / 2, path["x"] + path["w"] / 2, path["z"] - path["d"] / 2, path["z"] + path["d"] / 2)
for iid, box in boxes.items():
    if instances[iid]["kind"] == "pendant_lamp":
        continue
    if box[2] > 1.5:
        continue
    xz = (box[0], box[1], box[4], box[5])
    if xz_overlap(xz, path_box, gap=-0.04):
        fails.append(f"{iid} blocks the shared path")

win = zones["window"]
check(win["z"] < -D / 2 + 0.55, "finished window is not on the back wall")
check(win["h"] > 1.1 and win["w"] > 1.0, "finished window is too small to read")
check(len(zones["racks"]) >= 2, "need two sheet racks")
for rk in zones["racks"]:
    check(rk["x"] < -W / 2 + 0.7, f"rack is not against the left wall {rk}")

solder_front = boxes["solder_desk"][5]
cut_back = boxes["cut_table"][4]
check(cut_back - solder_front > 0.9, "cutting bench is inside the solder station")

shots = ["toon_default.png", "toon_corner.png", "toon_detail.png", "unlit_default.png"]
for name in shots:
    shot = ROOT / "shots" / name
    check(shot.is_file() and shot.stat().st_size > 20000, f"missing shot {name}")

if fails:
    print(f"{len(fails)} failed")
    for msg in fails:
        print(" -", msg)
    raise SystemExit(1)
print(f"layout ok — {len(instances)} instances, path {path['w']:.2f}×{path['d']:.2f} m, {len(shots)} shots")
