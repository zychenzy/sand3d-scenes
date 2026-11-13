#!/usr/bin/env python3
"""Pose, path, and clearance checks for the luthier workshop. No browser required."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
anchors = layout["anchors"]
by_id = {item["id"]: item for item in layout["instances"]}

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"
assert not any(k in layout["assets"] for k in ("guitar_amp", "speaker", "piano_bench", "marshall_amp"))


def rot(item_id):
    return by_id[item_id].get("rotationY", 0.0)


def near(a, b, tol=0.08):
    if abs(a - b) > tol:
        raise AssertionError(f"{a} != {b} (tol {tol})")


def footprint(box):
    return (
        box["x"] - box["w"] / 2,
        box["x"] + box["w"] / 2,
        box["z"] - box["d"] / 2,
        box["z"] + box["d"] / 2,
    )


half_w = room["width"] / 2
half_d = room["depth"] / 2
for item in layout["instances"]:
    x, y, z = item["position"]
    assert abs(x) < half_w - 0.12, item["id"]
    assert -0.01 <= y < room["height"], item["id"]
    assert abs(z) < half_d - 0.12, item["id"]
    spec = layout["assets"][item["kind"]]
    glb = (ROOT / spec["glb"]).resolve()
    assert glb.is_file(), glb
    assert REPO in glb.parents, glb
    assert ROOT not in glb.parents, f"GLB must stay outside this folder: {glb}"
    assert ".." in spec["glb"], spec["glb"]

vendor = ROOT / "vendor"
assert vendor.is_symlink(), "vendor must be a symlink, not a copy"
for copied in ROOT.rglob("*.glb"):
    raise AssertionError(f"unexpected GLB in the scene folder: {copied}")

near(abs(rot("chair_task")), math.pi, 0.02)
near(rot("chair_luthier"), 0.0, 0.02)
near(rot("chair_customer"), -math.pi / 2, 0.02)
near(rot("neck_cabinet"), math.pi, 0.02)
near(rot("shelf_spirit"), -math.pi / 2, 0.02)
near(rot("shelf_oil"), -math.pi / 2, 0.02)

bench = anchors["bench"]
bx0, bx1, bz0, bz1 = footprint(bench)
task = by_id["chair_task"]["position"]
assert bz1 < task[2], "task chair sits on the room side of the bench"
assert bx0 < task[0] < bx1
for lamp_id in ("lamp_violin", "lamp_guitar"):
    x, y, z = by_id[lamp_id]["position"]
    near(y, bench["h"], 0.001)
    assert bx0 < x < bx1, lamp_id
    assert bz0 < z < bz1, lamp_id
    near(abs(rot(lamp_id)), math.pi, 0.02)

counter = anchors["handoff"]
cx0, cx1, cz0, cz1 = footprint(counter)
customer = by_id["chair_customer"]["position"]
luthier = by_id["chair_luthier"]["position"]
assert customer[0] > cx1 - 0.05
assert cz0 < customer[2] < cz1 + 0.4
assert luthier[0] < cx0
assert luthier[2] < cz0
assert abs(customer[0] - luthier[0]) > 2.2

# Centre aisle from the bench chair to the handoff stays clear of counters.
aisle = (-0.9, 1.15, -2.35, 0.95)
for name, box in anchors.items():
    if "w" not in box:
        continue
    x0, x1, z0, z1 = footprint(box)
    overlap_x = min(x1, aisle[1]) - max(x0, aisle[0])
    overlap_z = min(z1, aisle[3]) - max(z0, aisle[2])
    assert overlap_x < 0.05 and overlap_z < 0.05 or overlap_x <= 0 or overlap_z <= 0, name

assert task[2] < luthier[2]
assert luthier[2] - task[2] > 3.5

forms = anchors["forms"]
assert forms["x"] < bx0 - 0.4
varnish = anchors["varnish"]
assert varnish["x"] < forms["x"] - 0.5

js = (ROOT / "luthier.js").read_text()
lib = (ROOT / "scene_lib.js").read_text()
assert "MeshToonMaterial" in lib
assert "MeshBasicMaterial" in lib
assert "MeshStandardMaterial" not in lib
assert "buildMold" in js and "cradle" in js and "pinch" in js
assert "guitar_amp" not in js

print(f"ok — {len(by_id)} instances, shared GLBs resolve, aisle and facing hold")
