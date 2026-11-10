#!/usr/bin/env python3
"""Layout checks for the makerspace scene. No browser, no network."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())

REQUIRED = [
    "board",
    "elec_desk_a",
    "elec_chair_a",
    "elec_mon_a",
    "elec_lamp_a",
    "elec_desk_b",
    "elec_chair_b",
    "elec_mon_b",
    "assembly",
    "asm_s",
    "asm_n",
    "asm_e",
    "asm_w",
    "stool",
    "pend_a",
    "pend_b",
    "shelf_a",
    "plant",
]


def forward(yaw):
    return math.sin(yaw), math.cos(yaw)


def test_files():
    assert not list(ROOT.glob("**/*.glb")), "do not copy GLBs into the scene folder"
    assert not (ROOT / "vendor").exists(), "reuse workshop/vendor via the import map"
    html = (ROOT / "index.html").read_text()
    assert "workshop/vendor/three.module.js" in html
    assert "./vendor/three.module.js" not in html
    for spec in LAYOUT["assets"].values():
        path = (ROOT / spec["glb"]).resolve()
        assert path.is_file(), spec["glb"]
        assert path.suffix == ".glb"


def test_instances():
    ids = [i["id"] for i in LAYOUT["instances"]]
    assert len(ids) == len(set(ids))
    for req in REQUIRED:
        assert req in ids, req
    kinds = set(LAYOUT["assets"])
    room = LAYOUT["meta"]["room"]
    half_w = room["width"] / 2
    half_d = room["depth"] / 2
    for inst in LAYOUT["instances"]:
        assert inst["kind"] in kinds, inst["id"]
        x, y, z = inst["position"]
        assert -half_w + 0.05 < x < half_w - 0.05, inst["id"]
        assert -half_d + 0.05 < z < half_d - 0.05, inst["id"]
        assert 0 <= y < room["height"], inst["id"]


def test_facing():
    for inst in LAYOUT["instances"]:
        if "faces" not in inst:
            continue
        tx, tz = inst["faces"]
        x, _, z = inst["position"]
        dx, dz = tx - x, tz - z
        dist = math.hypot(dx, dz)
        assert dist > 0.2, inst["id"]
        fx, fz = forward(inst.get("rotationY", 0))
        dot = fx * dx / dist + fz * dz / dist
        assert dot > 0.7, (inst["id"], round(dot, 3))


def test_assembly_chairs():
    table = next(i for i in LAYOUT["instances"] if i["id"] == "assembly")
    tx, _, tz = table["position"]
    chairs = [i for i in LAYOUT["instances"] if i["id"].startswith("asm_")]
    assert len(chairs) == 4
    dists = []
    for chair in chairs:
        x, _, z = chair["position"]
        dists.append(math.hypot(x - tx, z - tz))
    assert min(dists) > 0.6
    assert max(dists) < 1.15
    # The north chair is the one pulled off the tucked radius.
    tucked = sorted(dists)
    assert tucked[-1] - tucked[0] > 0.08


def test_anchors():
    room = LAYOUT["meta"]["room"]
    anchors = LAYOUT["meta"]["anchors"]
    for name in ("bench", "chest", "board", "bins", "printer", "cart", "assembly"):
        assert name in anchors, name
        x, z = anchors[name]
        assert abs(x) < room["width"] / 2 - 0.2, name
        assert abs(z) < room["depth"] / 2 - 0.15, name
    # Tool wall, assembly, and printer should not pile on one point.
    def dist(a, b):
        return math.hypot(anchors[a][0] - anchors[b][0], anchors[a][1] - anchors[b][1])

    assert dist("bench", "assembly") > 2.5
    assert dist("printer", "bins") > 0.8
    assert dist("assembly", "cart") > 1.2
    assert dist("bench", "chest") > 1.2


def test_cameras_and_lights():
    assert "position" in LAYOUT["camera"] and "target" in LAYOUT["camera"]
    for key in ("corner", "close"):
        assert key in LAYOUT["cameraPresets"]
    points = {p["id"] for p in LAYOUT["lights"]["points"]}
    for key in ("pend_a", "pend_b", "shop", "task_a", "task_b", "bed", "window"):
        assert key in points


def main():
    test_files()
    test_instances()
    test_facing()
    test_assembly_chairs()
    test_anchors()
    test_cameras_and_lights()
    print(f"ok — {len(LAYOUT['instances'])} instances, {len(LAYOUT['assets'])} assets")


if __name__ == "__main__":
    main()
