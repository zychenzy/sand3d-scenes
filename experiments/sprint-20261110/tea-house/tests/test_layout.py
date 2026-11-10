#!/usr/bin/env python3
"""Static checks for the tea-house layout. No browser required."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
html = (ROOT / "index.html").read_text()
scene = (ROOT / "tea-house.js").read_text()

room = layout["meta"]["room"]
arch = layout["architecture"]
instances = layout["instances"]
by_id = {i["id"]: i for i in instances}


def test_offline_entry():
    assert "http://" not in html and "https://" not in html
    assert "./vendor/three.module.js" in html
    assert "tea-house.js" in html
    assert (ROOT / "vendor" / "three.module.js").exists()


def test_assets_resolve():
    for kind, spec in layout["assets"].items():
        path = (ROOT / spec["glb"]).resolve()
        assert path.is_file(), f"{kind} missing {spec['glb']}"
        assert spec["targetHeight"] > 0.05


def test_zones_and_focal_pieces():
    assert "tasting" in layout["meta"]["zones"]
    assert "preparation" in layout["meta"]["zones"]
    kinds = [i["kind"] for i in instances]
    assert kinds.count("dining_table") == 1
    assert kinds.count("bar_counter") == 1
    assert kinds.count("dining_chair") >= 6
    assert "screenPanel" in scene and "teapot" in scene and "teaBowl" in scene and "andon" in scene
    assert "library_lamp" not in layout["assets"]
    scale = by_id["prep_counter"].get("scale")
    assert scale and scale[2] <= 0.5


def test_inside_room():
    hx, hz = room["width"] / 2 + 0.15, room["depth"] / 2 + 0.15
    for inst in instances:
        x, y, z = inst["position"]
        assert -hx < x < hx, inst["id"]
        assert -hz < z < hz, inst["id"]
        assert -0.01 <= y < room["height"], inst["id"]


def test_chairs_face_table():
    table = by_id["tasting_table"]["position"]
    for inst in instances:
        if inst["kind"] != "dining_chair":
            continue
        x, _, z = inst["position"]
        ry = inst.get("rotationY", 0.0)
        fx, fz = math.sin(ry), math.cos(ry)
        vx, vz = table[0] - x, table[2] - z
        length = math.hypot(vx, vz)
        assert length > 0.4, inst["id"]
        dot = (fx * vx + fz * vz) / length
        assert dot > 0.75, f"{inst['id']} faces away from the table (dot {dot:.2f})"


def test_stool_faces_counter():
    stool = by_id["maker_stool"]
    counter = by_id["prep_counter"]["position"]
    x, _, z = stool["position"]
    ry = stool["rotationY"]
    fx, fz = math.sin(ry), math.cos(ry)
    vx, vz = counter[0] - x, counter[2] - z
    dot = (fx * vx + fz * vz) / math.hypot(vx, vz)
    assert dot > 0.5


def test_seating_on_dais():
    dais = arch["dais"]
    x1, z1 = dais["x"] + dais["w"], dais["z"] + dais["d"]
    for inst in instances:
        if inst["kind"] not in ("dining_table", "dining_chair"):
            continue
        x, y, z = inst["position"]
        assert dais["x"] + 0.15 < x < x1 - 0.15, inst["id"]
        assert dais["z"] + 0.12 < z < z1 - 0.12, inst["id"]
        assert abs(y - dais["h"]) < 1e-6


def test_tabletop_props_land_on_table():
    table = by_id["tasting_table"]["position"]
    top = arch["tableTop"]
    assert abs(top - (table[1] + layout["assets"]["dining_table"]["targetHeight"])) < 1e-6
    half_x, half_z = 0.9, 0.46
    ids = ["thermos_t", "jar_t1", "jar_t2", "straw_t", "cup_t1", "cup_t2", "cup_t3"]
    for iid in ids:
        inst = by_id[iid]
        x, y, z = inst["position"]
        assert abs(y - top) < 1e-6, iid
        assert abs(x - table[0]) < half_x, iid
        assert abs(z - table[2]) < half_z, iid


def test_cameras_and_lights():
    assert "position" in layout["camera"] and "target" in layout["camera"]
    for name in ("corner", "close"):
        assert name in layout["cameraPresets"]
        assert len(layout["cameraPresets"][name]["position"]) == 3
    assert layout["lights"]["key"]["intensity"] > 0
    assert len(layout["lights"]["points"]) >= 4


if __name__ == "__main__":
    for fn in (
        test_offline_entry,
        test_assets_resolve,
        test_zones_and_focal_pieces,
        test_inside_room,
        test_chairs_face_table,
        test_stool_faces_counter,
        test_seating_on_dais,
        test_tabletop_props_land_on_table,
        test_cameras_and_lights,
    ):
        fn()
        print("ok", fn.__name__)
