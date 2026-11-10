#!/usr/bin/env python3
"""Pose and asset checks for the jeweler atelier. No browser required."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
anchors = layout["anchors"]
by_id = {item["id"]: item for item in layout["instances"]}

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"


def rot(item_id):
    return by_id[item_id].get("rotationY", 0.0)


def near(a, b, tol=0.08):
    if abs(a - b) > tol:
        raise AssertionError(f"{a} != {b} (tol {tol})")


half_w = room["width"] / 2
half_d = room["depth"] / 2
for item in layout["instances"]:
    x, y, z = item["position"]
    assert abs(x) < half_w - 0.15, item["id"]
    assert -0.01 <= y < room["height"], item["id"]
    assert abs(z) < half_d - 0.15, item["id"]
    glb = ROOT / layout["assets"][item["kind"]]["glb"]
    assert glb.is_file(), glb

for item_id in ("chair_bench_a", "chair_bench_b", "chair_client_l", "chair_client_r", "chair_salon_n"):
    near(abs(rot(item_id)), math.pi, 0.02)

for item_id in ("chair_jeweler", "chair_salon_s"):
    near(rot(item_id), 0.0, 0.02)

near(rot("gem_case"), -math.pi / 2, 0.02)
near(rot("wall_shelf"), -math.pi / 2, 0.02)

for lamp_id, bench in (("lamp_bench_a", anchors["benchA"]), ("lamp_bench_b", anchors["benchB"])):
    x, y, z = by_id[lamp_id]["position"]
    near(y, anchors["benchTop"], 0.001)
    assert abs(x - bench["x"]) < bench["w"] / 2 - 0.05, lamp_id
    assert abs(z - bench["z"]) < bench["d"] / 2 - 0.02, lamp_id
    near(abs(rot(lamp_id)), math.pi, 0.02)

# Bench chairs sit on the room side of the bench and face it (-Z).
for chair_id, bench in (("chair_bench_a", anchors["benchA"]), ("chair_bench_b", anchors["benchB"])):
    x, _, z = by_id[chair_id]["position"]
    assert z > bench["z"] + bench["d"] / 2 - 0.05, chair_id
    assert abs(x - bench["x"]) < bench["w"] / 2, chair_id

counter = anchors["counter"]
for chair_id in ("chair_client_l", "chair_client_r"):
    _, _, z = by_id[chair_id]["position"]
    assert z > counter["z"] + counter["d"] / 2, chair_id

_, _, jeweler_z = by_id["chair_jeweler"]["position"]
assert jeweler_z < counter["z"] - counter["d"] / 2

table = anchors["table"]
_, _, south_z = by_id["chair_salon_s"]["position"]
_, _, north_z = by_id["chair_salon_n"]["position"]
assert south_z < table["z"] < north_z

# Aisle between bench chairs and the jeweler's chair stays walkable.
_, _, bench_chair_z = by_id["chair_bench_a"]["position"]
assert jeweler_z - bench_chair_z > 1.4

print(f"ok — {len(by_id)} instances, assets resolve, chairs face the work")
