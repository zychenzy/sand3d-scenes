#!/usr/bin/env python3
"""Layout, scale, facing, and asset-link checks for the barbershop. No browser."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())
js = (ROOT / "barbershop.js").read_text()
html = (ROOT / "index.html").read_text()
room = layout["meta"]["room"]
anchors = layout["anchors"]
by_id = {item["id"]: item for item in layout["instances"]}

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"
assert "layout.anchors" in js, "scene must read anchors from layout.json"
assert "shadingMode = 'toon'" in (ROOT / "scene_lib.js").read_text()
assert "MeshBasicMaterial" in (ROOT / "scene_lib.js").read_text()
assert "https://" not in html and "http://" not in html
assert "./vendor/three.module.js" in html

vendor = ROOT / "vendor"
assert vendor.is_symlink(), vendor
assert (vendor.resolve() / "three.module.js").is_file()
assert REPO in vendor.resolve().parents

half_w = room["width"] / 2
half_d = room["depth"] / 2
for item in layout["instances"]:
    x, y, z = item["position"]
    assert abs(x) < half_w - 0.2, item["id"]
    assert -0.01 <= y < room["height"], item["id"]
    assert abs(z) < half_d - 0.2, item["id"]
    spec = layout["assets"][item["kind"]]
    glb = ROOT / spec["glb"]
    assert glb.is_symlink(), glb
    target = glb.resolve()
    assert target.is_file(), target
    assert ROOT not in target.parents or target.parent == ROOT / "assets"
    assert REPO in target.parents
    assert "experiments/indoor-20261113" not in str(target)

# Human scale. Catalog dining chairs were measured at 0.33 m wide and are not used.
heights = {kind: spec["targetHeight"] for kind, spec in layout["assets"].items()}
assert 0.8 <= heights["sofa"] <= 0.92
assert 0.36 <= heights["coffee"] <= 0.45
assert 0.42 <= heights["bench"] <= 0.5
assert 0.32 <= heights["cash"] <= 0.46
assert 0.12 <= heights["jar"] <= 0.2
assert "dining_chair" not in layout["assets"]

seat = anchors["chairSeat"]
assert 0.48 <= seat <= 0.56
assert anchors["mirrorBottom"] < anchors["chairEye"] < anchors["mirrorTop"]
assert 0.84 <= anchors["counterTop"] <= 1.02
assert 0.9 <= anchors["reception"]["top"] <= 1.1

stations = anchors["stations"]
assert len(stations) == 3
xs = [s["x"] for s in stations]
assert xs == sorted(xs)
for a, b in zip(xs, xs[1:]):
    assert b - a >= 1.7, (a, b)
for s in stations:
    assert s["z"] == stations[0]["z"]
gap = (s["z"] - anchors["footReach"]) - anchors["counterFrontZ"]
assert 0.42 <= gap <= 0.7, gap
assert math.isclose(anchors["chairRot"], math.pi, abs_tol=0.01)

wash = anchors["wash"]
assert math.isclose(wash["rot"], math.pi / 2, abs_tol=0.01)
neck_x = wash["x"] - wash["neckReach"]
assert neck_x > wash["basinX"] - 0.05
assert neck_x < wash["basinX"] + 0.7
assert 0.8 <= wash["basinRim"] <= 0.95

# Sofa faces -X (seat front is local +Z). Coffee sits on the room side of that seat.
sofa = by_id["sofa"]
coffee = by_id["coffee"]
assert math.isclose(sofa["rotationY"], -math.pi / 2, abs_tol=0.01)
assert coffee["position"][0] < sofa["position"][0] - 0.6
assert coffee["scale"][1] == 1
assert coffee["scale"][0] < 1 and coffee["scale"][2] < 1
assert by_id["bench"]["position"][0] < -4.4
assert math.isclose(by_id["cash"]["rotationY"], 0.0, abs_tol=0.01)
assert by_id["cash"]["position"][1] == anchors["reception"]["top"]

# Jars sit on a work surface, not the floor.
for jar_id in ("jar_a", "jar_c"):
    assert by_id[jar_id]["position"][1] == anchors["counterTop"]
assert by_id["jar_desk"]["position"][1] == anchors["reception"]["top"]

run = anchors["runner"]
assert run["x1"] - run["x0"] >= 0.9
for item in layout["instances"]:
    x, _, z = item["position"]
    inside = run["x0"] - 0.05 < x < run["x1"] + 0.05 and run["z0"] < z < run["z1"]
    assert not inside, item["id"]
for s in stations:
    inside = run["x0"] < s["x"] < run["x1"] and run["z0"] < s["z"] < run["z1"]
    assert not inside, s["id"]
pole = anchors["pole"]
inside = run["x0"] < pole["x"] < run["x1"] and run["z0"] < pole["z"] < run["z1"]
assert not inside

# Each mirror has a warm practical.
for s in stations:
    assert any(
        abs(p["position"][0] - s["x"]) < 0.25 and p["position"][1] > 1.6 and p["position"][2] < -2.6
        for p in layout["lights"]["points"]
    )

print(f"ok — {len(by_id)} linked assets, 3 chairs face the mirrors, runner is clear, seat {seat:.2f} m")
