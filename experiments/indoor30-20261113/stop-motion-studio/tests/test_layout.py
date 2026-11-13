"""Layout contracts for the stop-motion studio. No browser required."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
SCENE = "experiments/indoor30-20261113/stop-motion-studio"


def forward(ry):
    """Local +Z after a Y rotation. Dining-chair seats face local +Z."""
    return math.sin(ry), math.cos(ry)


def screen_normal(ry):
    """Monitor glass sits on local -Z, so the screen faces the opposite way."""
    fx, fz = forward(ry)
    return -fx, -fz


def by_id(name):
    return {i["id"]: i for i in LAYOUT["instances"]}[name]


def test_assets_are_relative_symlinks():
    for spec in LAYOUT["assets"].values():
        glb = ROOT / spec["glb"]
        assert glb.is_symlink(), spec["glb"]
        assert not Path(spec["glb"]).is_absolute()
        target = glb.resolve()
        assert target.is_file(), target
        assert SCENE not in str(target)
    vendor = ROOT / "vendor"
    assert vendor.is_symlink()
    assert (vendor / "three.module.js").resolve().is_file()
    assert "workshop/vendor" in str(vendor.resolve())


def test_scale_and_facing():
    room = LAYOUT["meta"]["room"]
    half_w = room["width"] / 2
    half_d = room["depth"] / 2
    for inst in LAYOUT["instances"]:
        x, y, z = inst["position"]
        assert abs(x) < half_w - 0.05, inst["id"]
        assert abs(z) < half_d - 0.05, inst["id"]
        assert -0.01 <= y < room["height"] - 0.2, inst["id"]

    studio = LAYOUT["studio"]
    chair_h = LAYOUT["assets"]["dining_chair"]["targetHeight"]
    assert studio["puppet"]["h"] / chair_h < 0.25
    assert studio["puppet"]["h"] < studio["tallestBuilding"] < 0.5
    assert 0.9 <= studio["table"]["top"] <= 1.15
    assert 0.14 <= studio["pencil"]["len"] <= 0.22

    desk = by_id("frame_desk")
    chair = by_id("frame_chair")
    mon = by_id("frame_monitor")
    fx, fz = forward(chair["rotationY"])
    dx = desk["position"][0] - chair["position"][0]
    dz = desk["position"][2] - chair["position"][2]
    assert fx * dx + fz * dz > 0.25
    assert chair["position"][0] > desk["position"][0] + 0.3
    sx, sz = screen_normal(mon["rotationY"])
    cx = chair["position"][0] - mon["position"][0]
    cz = chair["position"][2] - mon["position"][2]
    assert sx * cx + sz * cz > 0.25

    fab = by_id("fab_table")
    fab_chair = by_id("fab_chair")
    fx, fz = forward(fab_chair["rotationY"])
    dx = fab["position"][0] - fab_chair["position"][0]
    dz = fab["position"][2] - fab_chair["position"][2]
    assert fx * dx + fz * dz > 0.25
    assert fab_chair["position"][2] > fab["position"][2] + 0.6

    stage = studio["table"]
    stool = by_id("animator_stool")
    fx, fz = forward(stool["rotationY"])
    dx = stage["x"] - stool["position"][0]
    dz = stage["z"] - stool["position"][2]
    assert fx * dx + fz * dz > 0.25
    assert fab["position"][0] > stage["x"] + stage["w"] / 2 + 0.4

    shelf = by_id("supply_shelf")
    assert shelf["position"][1] > 1.0
    assert shelf["position"][2] < -3.7

    for inst in LAYOUT["instances"]:
        x, _, z = inst["position"]
        assert not (abs(x) < 1.2 and z > 1.6), inst["id"]


def test_cameras_cover_the_zones():
    cam = LAYOUT["camera"]
    stage = LAYOUT["studio"]["table"]
    desk = by_id("frame_desk")
    fab = by_id("fab_table")
    assert cam["position"][2] > stage["z"] + 2
    assert stage["x"] < cam["target"][0] < fab["position"][0]
    corner = LAYOUT["cameraPresets"]["corner"]
    assert corner["target"][0] < desk["position"][0] + 0.5
    assert corner["position"][0] > desk["position"][0]
    detail = LAYOUT["cameraPresets"]["detail"]
    assert detail["position"][2] > stage["z"] + 0.4
    assert detail["position"][1] > stage["top"]


def test_sources_are_offline_and_distinct():
    for name in ("index.html", "studio.js", "scene_lib.js"):
        text = (ROOT / name).read_text()
        assert "http://" not in text
        assert "https://" not in text
    js = (ROOT / "studio.js").read_text()
    for token in ("buildTable", "buildMiniature", "buildRig", "buildArmatureRack"):
        assert token in js
    for banned in ("cyclorama", "softbox", "dressForm"):
        assert banned not in js
    lib = (ROOT / "scene_lib.js").read_text()
    for token in ("0.32", "MeshBasicMaterial", "PCFHardShadowMap", "NoToneMapping"):
        assert token in lib


def test_shots_exist():
    for name in ("toon_default.png", "toon_corner.png", "toon_detail.png", "unlit_default.png"):
        shot = ROOT / "shots" / name
        assert shot.is_file(), name
        assert shot.stat().st_size > 100_000, name


if __name__ == "__main__":
    test_assets_are_relative_symlinks()
    test_scale_and_facing()
    test_cameras_cover_the_zones()
    test_sources_are_offline_and_distinct()
    test_shots_exist()
    print("ok")
