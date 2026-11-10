"""Layout contracts for the photography studio. No browser required."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())


def forward(ry):
    return math.sin(ry), math.cos(ry)


def test_assets_are_relative_symlinks():
    for spec in LAYOUT["assets"].values():
        glb = ROOT / spec["glb"]
        assert glb.is_symlink(), spec["glb"]
        assert not Path(spec["glb"]).is_absolute()
        target = glb.resolve()
        assert target.is_file(), target
        assert "experiments/sprint-20261110/photo-studio" not in str(target)


def test_vendor_is_linked_not_vendored_copy():
    vendor = ROOT / "vendor" / "three.module.js"
    assert vendor.is_symlink() or (ROOT / "vendor").is_symlink()
    assert vendor.resolve().is_file()


def test_instances_inside_room_and_zones():
    room = LAYOUT["meta"]["room"]
    half_w = room["width"] / 2
    half_d = room["depth"] / 2
    by_id = {i["id"]: i for i in LAYOUT["instances"]}
    for inst in LAYOUT["instances"]:
        x, y, z = inst["position"]
        assert abs(x) < half_w - 0.05, inst["id"]
        assert abs(z) < half_d - 0.05, inst["id"]
        assert y >= -0.01
    desk = by_id["edit_desk"]
    chair = by_id["edit_chair"]
    mon = by_id["edit_monitor"]
    bench = by_id["changing_bench"]
    assert desk["position"][0] > 2.4
    assert bench["position"][0] < -half_w + 0.8
    assert bench["position"][2] > 1.2
    fx, fz = forward(chair["rotationY"])
    dx = desk["position"][0] - chair["position"][0]
    dz = desk["position"][2] - chair["position"][2]
    assert fx * dx + fz * dz > 0.25
    mx, mz = forward(mon["rotationY"])
    cx = chair["position"][0] - mon["position"][0]
    cz = chair["position"][2] - mon["position"][2]
    assert mx * cx + mz * cz > 0.25
    assert abs(mon["position"][1] - 0.76) < 0.05


def test_cove_sits_in_the_back_left_of_the_room():
    room = LAYOUT["meta"]["room"]
    studio = LAYOUT["studio"]
    back_z = -room["depth"] / 2 + 0.08
    left_x = -room["width"] / 2 + 0.08
    paper_z = back_z + 0.05
    paper_x = left_x + 0.05
    cx = paper_x + studio["coveRadius"]
    cz = paper_z + studio["coveRadius"]
    assert studio["coveRight"] < room["width"] / 2 - 1.5
    assert studio["coveFront"] < -0.2
    assert cz < studio["coveFront"]
    subject_x = (cx + studio["coveRight"]) / 2
    subject_z = (cz + studio["coveFront"]) / 2
    assert cx < subject_x < studio["coveRight"]
    assert cz < subject_z < studio["coveFront"]
    assert studio["paperTop"] < room["height"] - 0.4


def test_sources_are_offline():
    for name in ("index.html", "studio.js", "scene_lib.js"):
        text = (ROOT / name).read_text()
        assert "http://" not in text
        assert "https://" not in text
    js = (ROOT / "studio.js").read_text()
    for token in ("buildCove", "softboxRect", "buildDolly", "buildRails", "changingCorner"):
        assert token in js


if __name__ == "__main__":
    test_assets_are_relative_symlinks()
    test_vendor_is_linked_not_vendored_copy()
    test_instances_inside_room_and_zones()
    test_cove_sits_in_the_back_left_of_the_room()
    test_sources_are_offline()
    print("ok")
