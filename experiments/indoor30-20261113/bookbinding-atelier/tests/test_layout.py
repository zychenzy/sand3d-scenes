#!/usr/bin/env python3
"""Paths, proportions, facing, and clearance for the bookbinding atelier."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())

FORBIDDEN = {
    "display_bookcase",
    "book_stand",
    "study_desk",
    "school_desk",
    "square_table",
    "easel",
    "monitor",
    "chalkboard",
    "wall_shelf",
}

SEATS = {
    "chair_sew_a",
    "chair_sew_b",
    "stool_press",
    "stool_cut",
    "chair_forward",
    "chair_pack",
}


def forward(yaw):
    return math.sin(yaw), math.cos(yaw)


def aabb(station):
    hx = station["spanX"] / 2
    hz = station["spanZ"] / 2
    return (
        station["x"] - hx,
        station["x"] + hx,
        station["z"] - hz,
        station["z"] + hz,
    )


def overlaps(a, b, gap=0.0):
    return not (a[1] + gap < b[0] or b[1] + gap < a[0] or a[3] + gap < b[2] or b[3] + gap < a[2])


def inside(box, x, z, pad=0.0):
    return box[0] - pad <= x <= box[1] + pad and box[2] - pad <= z <= box[3] + pad


def test_paths():
    assert not list(ROOT.glob("**/*.glb")), "do not copy GLBs into the scene folder"
    assert not (ROOT / "vendor").exists(), "reuse workshop/vendor via the import map"
    html = (ROOT / "index.html").read_text()
    assert "../../../workshop/vendor/three.module.js" in html
    assert "./vendor/three.module.js" not in html
    js = (ROOT / "scene_lib.js").read_text()
    assert "MeshToonMaterial" in js
    assert "MeshBasicMaterial" in js
    assert "PCFHardShadowMap" in js
    assert "NearestFilter" in js
    for kind, spec in LAYOUT["assets"].items():
        assert kind not in FORBIDDEN, kind
        path = (ROOT / spec["glb"]).resolve()
        assert path.is_file(), spec["glb"]
        assert path.suffix == ".glb"
        assert ROOT not in path.parents, spec["glb"]
        assert REPO in path.parents, spec["glb"]
        assert path.stat().st_size < 2_000_000, spec["glb"]


def test_proportions():
    stations = LAYOUT["meta"]["stations"]
    room = LAYOUT["meta"]["room"]
    assert room["width"] == 10.4 and room["depth"] == 7.6 and room["height"] == 3.15
    assert 0.72 <= stations["sewing"]["top"] <= 0.78
    assert 0.74 <= stations["forward"]["top"] <= 0.78
    assert 0.72 <= stations["packing"]["top"] <= 0.76
    assert 0.88 <= stations["guillotine"]["top"] <= 0.94
    assert 1.6 <= stations["press"]["h"] <= 1.85
    assert 0.98 <= stations["drawers"]["h"] <= 1.15
    assert 1.4 <= stations["rack"]["h"] <= 1.65
    assert stations["guillotine"]["top"] - stations["sewing"]["top"] > 0.12
    assets = LAYOUT["assets"]
    assert 0.84 <= assets["dining_chair"]["targetHeight"] <= 0.96
    assert 0.62 <= assets["bar_stool"]["targetHeight"] <= 0.76
    assert 0.32 <= assets["library_lamp"]["targetHeight"] <= 0.46
    assert assets["pendant_lamp"]["targetHeight"] <= 0.5
    assert assets["jam_jar"]["targetHeight"] < 0.16
    assert assets["cup_mug"]["targetHeight"] < 0.12
    assert assets["thermos"]["targetHeight"] < 0.32
    assert assets["flowerpot"]["targetHeight"] < 0.45
    for spec in assets.values():
        assert spec["targetHeight"] < 1.2


def test_instances_and_facing():
    ids = [i["id"] for i in LAYOUT["instances"]]
    assert len(ids) == len(set(ids))
    for seat in SEATS:
        assert seat in ids, seat
    room = LAYOUT["meta"]["room"]
    half_w = room["width"] / 2
    half_d = room["depth"] / 2
    kinds = set(LAYOUT["assets"])
    for inst in LAYOUT["instances"]:
        assert inst["kind"] in kinds, inst["id"]
        x, y, z = inst["position"]
        assert -half_w + 0.12 < x < half_w - 0.12, inst["id"]
        assert -half_d + 0.15 < z < half_d - 0.15, inst["id"]
        assert 0 <= y < room["height"] - 0.2, inst["id"]
        if "faces" not in inst:
            continue
        tx, tz = inst["faces"]
        dx, dz = tx - x, tz - z
        dist = math.hypot(dx, dz)
        assert 0.55 < dist < 1.6, (inst["id"], round(dist, 3))
        fx, fz = forward(inst.get("rotationY", 0))
        dot = (fx * dx + fz * dz) / dist
        assert dot > 0.85, (inst["id"], round(dot, 3))


def test_clearance():
    stations = LAYOUT["meta"]["stations"]
    floor = {name: aabb(st) for name, st in stations.items() if "on" not in st and "spanX" in st}
    names = list(floor)
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            assert not overlaps(floor[a], floor[b], gap=0.05), (a, b)
    by_id = {i["id"]: i for i in LAYOUT["instances"]}
    seat_boxes = {
        "chair_sew_a": "sewing",
        "chair_sew_b": "sewing",
        "stool_press": "press",
        "stool_cut": "guillotine",
        "chair_forward": "forward",
        "chair_pack": "packing",
    }
    for seat, station in seat_boxes.items():
        x, _, z = by_id[seat]["position"]
        assert not inside(floor[station], x, z, pad=0.05), seat
    drawers = stations["drawers"]
    forward = stations["forward"]
    wet_gap = math.hypot(drawers["x"] - forward["x"], drawers["z"] - forward["z"])
    assert wet_gap > 2.4, wet_gap
    # Sewing is seated, the guillotine bed is standing.
    assert stations["sewing"]["top"] < 0.8
    assert stations["guillotine"]["top"] >= 0.88


def test_cameras_and_lights():
    assert LAYOUT["camera"]["position"][2] > LAYOUT["meta"]["room"]["depth"] / 2
    for key in ("corner", "close", "detail"):
        assert key in LAYOUT["cameraPresets"]
        pos = LAYOUT["cameraPresets"][key]["position"]
        assert pos[1] > 0.4
    points = {p["id"] for p in LAYOUT["lights"]["points"]}
    for key in ("task_sew_a", "task_sew_b", "task_forward", "pend_sew", "pend_cut", "stove"):
        assert key in points, key


def main():
    test_paths()
    test_proportions()
    test_instances_and_facing()
    test_clearance()
    test_cameras_and_lights()
    print(f"ok — {len(LAYOUT['instances'])} instances, {len(LAYOUT['assets'])} assets")


if __name__ == "__main__":
    main()
