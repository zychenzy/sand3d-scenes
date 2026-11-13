#!/usr/bin/env python3
"""Dimensions, paths, facing, and customer route for the bicycle repair shop."""

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
LAYOUT = json.loads((ROOT / "layout.json").read_text())

BAKED = {
    "assets/mountain_bike__a4c57cc4d44f.glb",
    "assets/mountain_bike__e3cd36c670cd.glb",
    "assets/bicycle_wheel__bc0bc9de84b9.glb",
    "assets/floor_pump__0fa79af038a3.glb",
}


def forward_visual(yaw):
    """Dining-chair seat faces local +Z (back_post is local -Z)."""
    return (math.sin(yaw), math.cos(yaw))


def test_files_and_paths():
    assert not (ROOT / "vendor").exists(), "reuse workshop/vendor via the import map"
    html = (ROOT / "index.html").read_text()
    lib = (ROOT / "scene_lib.js").read_text()
    assert "workshop/vendor/three.module.js" in html
    assert "./vendor/three.module.js" not in html
    assert "workshop/vendor/controls/OrbitControls.js" in lib
    assert "workshop/vendor/loaders/GLTFLoader.js" in lib
    glbs = list(ROOT.rglob("*.glb"))
    assert glbs, "baked shop GLBs should live in this folder"
    for path in glbs:
        rel = path.relative_to(ROOT).as_posix()
        assert rel in BAKED, rel
        assert not path.is_symlink()
        data = path.read_bytes()[:20]
        assert data[:4] == b"glTF", rel
        assert struct.unpack_from("<I", data, 16)[0] == 0x4E4F534A  # JSON chunk
    for spec in LAYOUT["assets"].values():
        path = (ROOT / spec["glb"]).resolve()
        assert path.is_file(), spec["glb"]
        if spec["glb"].startswith(".."):
            assert ROOT not in path.parents, spec["glb"]
            assert path.is_relative_to(REPO)


def test_adult_proportions():
    assets = LAYOUT["assets"]
    assert 0.95 <= assets["bike_stand"]["targetHeight"] <= 1.15
    assert 0.95 <= assets["bike_parked"]["targetHeight"] <= 1.15
    assert 0.66 <= assets["wheel"]["targetHeight"] <= 0.74
    assert 0.55 <= assets["pump"]["targetHeight"] <= 0.75
    room = LAYOUT["meta"]["room"]
    assert room["width"] >= 8 and room["depth"] >= 7 and 2.8 <= room["height"] <= 3.6


def test_instances_inside():
    room = LAYOUT["meta"]["room"]
    ids = []
    for inst in LAYOUT["instances"]:
        ids.append(inst["id"])
        assert inst["kind"] in LAYOUT["assets"]
        x, y, z = inst["position"]
        assert abs(x) < room["width"] / 2 - 0.2, inst["id"]
        assert abs(z) < room["depth"] / 2 - 0.15, inst["id"]
        assert 0 <= y < room["height"], inst["id"]
    assert len(ids) == len(set(ids))
    for req in (
        "bike_stand",
        "bike_parked",
        "wheel_truing",
        "wheel_rack_a",
        "pump",
        "chair_wait_a",
        "chair_wait_b",
        "register",
    ):
        assert req in ids


def test_seats_face_the_work():
    by_id = {i["id"]: i for i in LAYOUT["instances"]}
    for chair_id in ("chair_wait_a", "chair_wait_b"):
        chair = by_id[chair_id]
        yaw = chair["rotationY"]
        assert abs(yaw - math.pi / 2) < 0.05, chair_id
        tx, tz = chair["faces"]
        x, _, z = chair["position"]
        dx, dz = tx - x, tz - z
        fx, fz = forward_visual(yaw)
        dot = (fx * dx + fz * dz) / math.hypot(dx, dz)
        assert dot > 0.7, (chair_id, round(dot, 3))
    # Shop stool is the staff perch at the counter return, off the customer runner.
    counter = LAYOUT["anchors"]["counter"]
    stool = LAYOUT["anchors"]["stool"]
    assert stool[0] < counter["x"] - 0.8
    assert abs(stool[2] - counter["z"]) < 0.8
    assert counter["x"] > by_id["chair_wait_a"]["position"][0] + 1.5


def test_customer_route():
    route = LAYOUT["route"]
    assert route["width"] >= 1.0
    (x0, z0), (x1, z1) = route["points"]
    assert abs(x0 - x1) < 0.05
    assert z0 > z1
    runner = LAYOUT["anchors"]["runner"]
    mat = LAYOUT["anchors"]["mat"]
    assert runner["z0"] >= mat["z1"] - 0.05, "work mat must not cover the customer runner"
    assert runner["x0"] <= x0 <= runner["x1"]
    assert runner["z0"] <= z1 and z0 <= runner["z1"]
    half = route["width"] / 2
    blocked = [(inst["id"], inst["position"]) for inst in LAYOUT["instances"]]
    blocked.append(("stool_staff", LAYOUT["anchors"]["stool"]))
    for name, pos in blocked:
        x, _, z = pos
        if z1 - 0.3 <= z <= z0 + 0.2 and abs(x - x0) < half:
            raise AssertionError(f"{name} sits in the customer route")
    stand = LAYOUT["anchors"]["stand"]
    clamp = LAYOUT["anchors"]["clamp"]
    assert abs(stand["x"] - x0) > 1.4
    bike = next(i for i in LAYOUT["instances"] if i["id"] == "bike_stand")
    # Short boom from the aisle side of the seatpost. It stays off the rear wheel's plane.
    assert stand["z"] > bike["position"][2] + 0.2
    assert abs(stand["x"] - clamp["x"]) < 0.15
    assert abs(clamp["x"] - (bike["position"][0] - 0.22)) < 0.08
    assert abs(clamp["z"] - bike["position"][2]) < 0.08
    assert 0.9 <= clamp["y"] <= 1.08
    reach = math.hypot(stand["x"] - clamp["x"], stand["z"] - clamp["z"])
    assert 0.22 < reach < 0.55


def test_cameras_and_shots():
    assert len(LAYOUT["camera"]["position"]) == 3
    for key in ("corner", "close"):
        assert key in LAYOUT["cameraPresets"]
    shots = ROOT / "shots"
    for name in ("toon_default.png", "toon_corner.png", "toon_close.png", "unlit_default.png"):
        path = shots / name
        assert path.is_file() and path.stat().st_size > 20_000, name


if __name__ == "__main__":
    test_files_and_paths()
    test_adult_proportions()
    test_instances_inside()
    test_seats_face_the_work()
    test_customer_route()
    test_cameras_and_shots()
    print(f"ok — {len(LAYOUT['instances'])} instances, route clear, baked GLBs only")
