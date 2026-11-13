#!/usr/bin/env python3
"""Static checks for the Tide Lock cipher study. No browser required."""

import json
import math
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
anchors = layout["anchors"]
puzzle = layout["meta"]["puzzle"]
by_id = {item["id"]: item for item in layout["instances"]}

assert len(by_id) == len(layout["instances"]), "duplicate instance ids"
assert layout["meta"]["style"] == "Toon hard"
assert puzzle["digits"] == {"anchor": 4, "gull": 8, "lantern": 2}
assert puzzle["order"] == ["anchor", "gull", "lantern"]


def rot(item_id):
    return by_id[item_id].get("rotationY", 0.0)


def near(a, b, tol=0.02, label=""):
    if abs(a - b) > tol:
        raise AssertionError(f"{label} {a} != {b} (tol {tol})")


def span_of(item):
    spec = layout["assets"][item["kind"]]
    sx, sz = spec["span"]
    yaw = item.get("rotationY", 0.0)
    if abs(abs(yaw) - math.pi / 2) < 0.2 or abs(abs(yaw) - 3 * math.pi / 2) < 0.2:
        sx, sz = sz, sx
    return sx, sz


half_w = room["width"] / 2
half_d = room["depth"] / 2
for item in layout["instances"]:
    x, y, z = item["position"]
    assert abs(x) < half_w - 0.05, item["id"]
    assert -0.01 <= y < room["height"], item["id"]
    assert abs(z) < half_d - 0.08, item["id"]
    glb = ROOT / layout["assets"][item["kind"]]["glb"]
    assert glb.is_file(), glb
    assert glb.is_symlink(), f"{glb} should be a symlink, not a copy"
    real = glb.resolve()
    assert real.is_file() and real.stat().st_size > 500, real
    assert ROOT not in real.parents, f"{item['kind']} resolves inside the experiment"
    assert REPO in real.parents or real == REPO, real

vendor = ROOT / "vendor" / "three.module.js"
assert vendor.is_file() and vendor.stat().st_size > 100_000
assert (ROOT / "vendor").is_symlink()

# Study desk kneehole is local +X. -pi/2 turns it toward the room (+Z).
near(rot("study_desk"), -math.pi / 2, 0.02, "study_desk")
# Seat faces local +Z. Yaw pi turns the sitter toward -Z, into the desk.
near(abs(rot("study_chair")), math.pi, 0.02, "study_chair")
near(abs(rot("school_chair")), math.pi, 0.02, "school_chair")
near(rot("easel"), 0.0, 0.02, "easel")
near(rot("slate"), -math.pi / 2, 0.02, "slate")
near(rot("study_lamp"), 0.0, 0.02, "study_lamp")

desk = by_id["study_desk"]
chair = by_id["study_chair"]
assert chair["position"][2] > desk["position"][2] + 0.45, "study chair must sit on the room side of the desk"
assert abs(chair["position"][0] - desk["position"][0]) < 0.2

school = by_id["school_desk"]
school_chair = by_id["school_chair"]
assert school_chair["position"][2] > school["position"][2] + 0.35
assert abs(school_chair["position"][0] - school["position"][0]) < 0.15

# Lamp sits on the desktop and on the shade side toward the sitter (+Z of the lamp is the desk).
lamp = by_id["study_lamp"]
assert abs(lamp["position"][1] - 0.76) < 0.02
assert lamp["position"][2] < desk["position"][2]

easel = by_id["easel"]
assert easel["position"][2] < desk["position"][2] - 1.0
slate = by_id["slate"]
assert slate["position"][2] < -3.1

bench = by_id["panel_bench"]
assert bench["position"][0] == anchors["panel"]["x"]
assert bench["position"][2] > anchors["panel"]["z"] + 0.6

# Circulation centerline stays outside floor footprints.
routes = [layout["circulation"], layout["branch"]]
for route in routes:
  for px, pz in route:
    for item in layout["instances"]:
        if not item.get("blocksPath"):
            continue
        sx, sz = span_of(item)
        ix, _, iz = item["position"]
        if abs(px - ix) < sx / 2 + 0.28 and abs(pz - iz) < sz / 2 + 0.28:
            raise AssertionError(f"path ({px}, {pz}) hits {item['id']}")

for name in ("corner", "close"):
    assert name in layout["cameraPresets"]
assert layout["lights"]["hemi"]["intensity"] >= 0.7
assert len(layout["lights"]["points"]) >= 4

html = (ROOT / "index.html").read_text()
assert "cdn" not in html.lower()
assert "vendor/three.module.js" in html
scene_lib = (ROOT / "scene_lib.js").read_text()
assert "MeshToonMaterial" in scene_lib
assert "MeshBasicMaterial" in scene_lib
assert "shadingMode = 'toon'" in scene_lib
runtime = (ROOT / "escape-room.js").read_text()
assert "MeshLambert" not in runtime

refs = ROOT / "refs"
assert refs.is_dir()
for banned in refs.rglob("*"):
    if banned.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".venv"}:
        raise AssertionError(f"reference binary in git tree: {banned}")

for name in ("index.html", "escape-room.js", "scene_lib.js", "panels.js", "layout.json", "README.md", "ATTRIBUTIONS.md"):
    assert (ROOT / name).is_file(), name
for name in ("GAP.md", "SOURCES.md", "QA.md"):
    assert (refs / name).is_file(), name

print(f"ok — {len(by_id)} instances, {len(layout['assets'])} linked GLBs, path clear, toon default")
