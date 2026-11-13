#!/usr/bin/env python3
"""Static layout checks for the calligraphy classroom. No browser required."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
html = (ROOT / "index.html").read_text()
scene = (ROOT / "calligraphy.js").read_text()
lib = (ROOT / "scene_lib.js").read_text()

room = layout["meta"]["room"]
arch = layout["architecture"]
instances = layout["instances"]
by_id = {i["id"]: i for i in instances}


def foot(kind):
    spec = layout["assets"][kind]
    sx, sy, sz = spec["nativeSize"]
    scale = spec["targetHeight"] / sy
    return sx * scale, sz * scale


def aabb(inst):
    hx, hz = [v / 2 for v in foot(inst["kind"])]
    rot = abs(inst.get("rotationY", 0.0)) % math.pi
    if abs(rot - math.pi / 2) < 0.25:
        hx, hz = hz, hx
    x, _, z = inst["position"]
    return x - hx, x + hx, z - hz, z + hz


def test_offline_and_symlinks():
    assert "http://" not in html and "https://" not in html
    assert "./vendor/three.module.js" in html
    assert "calligraphy.js" in html
    vendor = ROOT / "vendor"
    assert vendor.is_symlink(), "vendor must be a symlink, not a copy"
    assert (vendor / "three.module.js").is_file()
    for spec in layout["assets"].values():
        path = ROOT / spec["glb"]
        assert path.is_symlink(), spec["glb"]
        assert path.resolve().is_file(), spec["glb"]
        assert path.stat().st_size > 500
        assert not Path(spec["glb"]).is_absolute()


def test_toon_default_and_true_unlit():
    assert "let shadingMode = 'toon'" in lib
    assert "MeshToonMaterial" in lib
    assert "MeshBasicMaterial" in lib
    assert "params.get('mode') === 'unlit'" in lib
    assert "toUnlitMaterial" in lib
    assert layout["lights"]["key"]["intensity"] > layout["lights"]["hemi"]["intensity"] * 3


def test_teacher_table_height_and_desk_proportions():
    table = by_id["demo_table"]
    spec = layout["assets"]["long_dining"]
    top = table["position"][1] + spec["targetHeight"]
    assert abs(top - arch["teacher"]["top"]) < 1e-6
    assert abs(table["position"][1] - arch["platform"]["h"]) < 1e-6
    for desk in arch["desks"]:
        assert desk["w"] >= 1.4
        assert desk["d"] >= 0.65
        assert 0.7 <= desk["h"] <= 0.78


def test_chairs_face_the_teacher():
    teacher = by_id["t_chair"]
    assert teacher["role"] == "teacher"
    assert abs(teacher["rotationY"]) < 1e-6
    students = [i for i in instances if i.get("role") == "student"]
    assert len(students) == 6
    for inst in students:
        assert abs(inst["rotationY"] - math.pi) < 1e-4, inst["id"]
        fx, fz = math.sin(inst["rotationY"]), math.cos(inst["rotationY"])
        # Fronts point at the teaching wall (-Z), not at the teacher's head.
        assert fz < -0.96 and abs(fx) < 0.05, inst["id"]
        assert inst["position"][2] > teacher["position"][2]
    tx, tz = by_id["demo_table"]["position"][0], by_id["demo_table"]["position"][2]
    fx, fz = math.sin(teacher["rotationY"]), math.cos(teacher["rotationY"])
    # Teacher looks toward the front row, which is at a larger z.
    front = next(d for d in arch["desks"] if d["id"] == "d_a1")
    vx, vz = front["x"] - teacher["position"][0], front["z"] - teacher["position"][2]
    dot = (fx * vx + fz * vz) / math.hypot(vx, vz)
    assert dot > 0.9
    assert tx == teacher["position"][0]


def test_elbow_room_and_aisles():
    desks = arch["desks"]
    rows = {}
    for desk in desks:
        rows.setdefault(desk["z"], []).append(desk)
    assert len(rows) == 2
    for row in rows.values():
        row.sort(key=lambda d: d["x"])
        for a, b in zip(row, row[1:]):
            gap = (b["x"] - b["w"] / 2) - (a["x"] + a["w"] / 2)
            assert gap >= 0.55, gap
    chair_hz = arch["seat"]["d"] / 2
    front = [d for d in desks if d["z"] < 0]
    back = [d for d in desks if d["z"] > 0]
    front_chair_back = by_id["s_a0"]["position"][2] + chair_hz
    back_desk_edge = back[0]["z"] - back[0]["d"] / 2
    assert back_desk_edge - front_chair_back >= 1.05
    table_hz = foot("long_dining")[1] / 2
    table_front = by_id["demo_table"]["position"][2] + table_hz
    teaching = (front[0]["z"] - front[0]["d"] / 2) - table_front
    assert teaching >= 1.5
    supply = aabb(by_id["supply_table"])
    desk_left = min(d["x"] - d["w"] / 2 for d in desks)
    assert desk_left - supply[1] >= 0.75
    case = aabb(by_id["paper_case"])
    assert supply[0] - case[1] >= 0.2


def test_knees_tuck_without_hitting_the_wall():
    chair_hz = arch["seat"]["d"] / 2
    for desk in arch["desks"]:
        chair = by_id["s_" + desk["id"].split("_", 1)[1]]
        assert abs(chair["position"][0] - desk["x"]) < 0.02
        knee = chair["position"][2] - chair_hz
        desk_front = desk["z"] + desk["d"] / 2
        tuck = desk_front - knee
        assert 0.0 <= tuck <= 0.12, (desk["id"], tuck)
    wall = -room["depth"] / 2 + 0.07
    teacher_back = by_id["t_chair"]["position"][2] - chair_hz
    assert teacher_back > wall + 0.08
    table_back = by_id["demo_table"]["position"][2] - foot("long_dining")[1] / 2
    teacher_knee = by_id["t_chair"]["position"][2] + chair_hz
    assert table_back - teacher_knee < 0.12


def test_tools_stay_on_the_writing_surface():
    kit = arch["kit"]
    for desk in arch["desks"]:
        for key in ("inkstone", "weight", "brush"):
            dx, dz = kit[key]
            assert abs(dx) < desk["w"] / 2 - 0.08, key
            assert abs(dz) < desk["d"] / 2 - 0.05, key
        px, pz, pw, ph = kit["paper"]
        assert abs(px) + pw / 2 < desk["w"] / 2 - 0.08
        assert abs(pz) + ph / 2 < desk["d"] / 2 - 0.05
    teacher = arch["teacher"]
    hx, hz = [v / 2 for v in foot("long_dining")]
    for key in ("inkstone", "weight", "brush", "lamp"):
        dx, dz = teacher[key]
        assert abs(dx) < hx - 0.08, key
        assert abs(dz) < hz - 0.05, key
    px, pz, pw, ph = teacher["paper"]
    assert abs(px) + pw / 2 < hx - 0.1
    assert abs(pz) + ph / 2 < hz - 0.05
    # Tools sit on the felt, outside the demonstration character.
    assert abs(teacher["weight"][0] - px) + 0.04 < pw / 2 or abs(teacher["weight"][1]) > abs(pz) + ph / 2
    assert abs(teacher["brush"][0]) > abs(px) + pw / 2
    assert "deskLamp" in scene and "copyStand" in scene and "woodSeat" in scene


def test_storage_and_cameras_inside():
    hx, hz = room["width"] / 2 - 0.02, room["depth"] / 2 - 0.02
    for inst in instances:
        x, y, z = inst["position"]
        assert -hx < x < hx, inst["id"]
        assert -hz < z < hz, inst["id"]
        assert 0 <= y < room["height"], inst["id"]
    assert "corner" in layout["cameraPresets"] and "close" in layout["cameraPresets"]
    assert len(layout["lights"]["points"]) >= 4
    kinds = [i["kind"] for i in instances]
    assert kinds.count("wood_seat") == 7
    assert "dining_chair" not in kinds
    assert "library_lamp" not in layout["assets"]
    assert "book_stand" not in layout["assets"]
    assert kinds.count("display_bookcase") == 2
    assert "felt" in scene and "hangingScroll" in scene and "inkstone" in scene


if __name__ == "__main__":
    tests = [
        test_offline_and_symlinks,
        test_toon_default_and_true_unlit,
        test_teacher_table_height_and_desk_proportions,
        test_chairs_face_the_teacher,
        test_elbow_room_and_aisles,
        test_knees_tuck_without_hitting_the_wall,
        test_tools_stay_on_the_writing_surface,
        test_storage_and_cameras_inside,
    ]
    for fn in tests:
        fn()
        print("ok", fn.__name__)
