#!/usr/bin/env python3
"""Pose, aisle, and asset-link checks. No browser required."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
anchors = layout["anchors"]
by_id = {item["id"]: item for item in layout["instances"]}

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"

half_w = room["width"] / 2
half_d = room["depth"] / 2


def rot(item_id):
    return by_id[item_id].get("rotationY", 0.0)


def near(a, b, tol=0.08):
    if abs(a - b) > tol:
        raise AssertionError(f"{a} != {b} (tol {tol})")


def center(item_id):
    return by_id[item_id]["position"]


for item in layout["instances"]:
    x, y, z = item["position"]
    assert abs(x) < half_w - 0.12, item["id"]
    assert -0.01 <= y < room["height"], item["id"]
    assert abs(z) < half_d - 0.12, item["id"]
    spec = layout["assets"][item["kind"]]
    glb = ROOT / spec["glb"]
    assert glb.is_file(), glb
    # Catalog meshes stay symlinks. Baked meshes live in this folder only.
    if item["kind"] in {"workbench", "soldering_iron", "multimeter"}:
        assert not glb.is_symlink(), glb
        assert glb.stat().st_size < 2_000_000, glb
    else:
        assert glb.is_symlink(), glb
        target = glb.resolve()
        assert ROOT not in target.parents, target

vendor = ROOT / "vendor"
assert vendor.is_symlink(), vendor
assert (vendor / "three.module.js").is_file()

for item_id in ("chair_solder", "chair_test", "chair_customer_l", "chair_customer_r"):
    near(abs(rot(item_id)), math.pi, 0.02)

near(rot("stool_staff"), 0.0, 0.02)
near(rot("bench_solder"), 0.0, 0.02)
near(abs(rot("lamp_solder")), math.pi, 0.02)

solder = anchors["solder"]
test = anchors["test"]
counter = anchors["counter"]
drawers = anchors["drawers"]

sx, _, sz = center("chair_solder")
assert sz > solder["z"] + solder["d"] / 2 - 0.15, "solder chair is not on the room side of the bench"
assert abs(sx - solder["x"]) < solder["w"] / 2

tx, _, tz = center("chair_test")
assert tz > test["z"] + test["d"] / 2 - 0.15, "test chair is not on the room side of the bench"
assert abs(tx - test["x"]) < test["w"] / 2

for item_id in ("chair_customer_l", "chair_customer_r"):
    _, _, z = center(item_id)
    assert z > counter["z"] + counter["d"] / 2 - 0.05, item_id

_, _, staff_z = center("stool_staff")
assert staff_z < counter["z"] - counter["d"] / 2 + 0.05

lx, ly, lz = center("lamp_solder")
near(ly, anchors["benchTop"], 0.02)
assert abs(lx - solder["x"]) < solder["w"] / 2
assert abs(lz - solder["z"]) < solder["d"] / 2

# Main aisle from the counter back to the drawer wall stays clear of furniture centers.
aisle = {"x0": 0.75, "x1": 1.85, "z0": -1.7, "z1": 1.05}
for item in layout["instances"]:
    x, _, z = item["position"]
    inside = aisle["x0"] < x < aisle["x1"] and aisle["z0"] < z < aisle["z1"]
    assert not inside, f"{item['id']} blocks the aisle"

# Gaps a person can walk.
assert drawers["x"] - drawers["w"] / 2 - (solder["x"] + solder["w"] / 2) > 0.55
assert test["x"] - test["w"] / 2 - (drawers["x"] + drawers["w"] / 2) > 0.8
assert staff_z - sz > 1.6

# Counter top is standing height. Benches are seated height.
assert 1.0 <= counter["h"] <= 1.1
assert 0.72 <= anchors["benchTop"] <= 0.78
assert 0.72 <= test["top"] <= 0.8

print(f"ok — {len(by_id)} instances, links resolve, chairs face the work, aisle is open")
