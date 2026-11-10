#!/usr/bin/env python3
"""Layout invariants for the meditation room. Run from anywhere."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def dist_point_rect(px, pz, x, z, w, d):
    dx = max(x - px, 0, px - (x + w))
    dz = max(z - pz, 0, pz - (z + d))
    return math.hypot(dx, dz)


def main():
    room = layout["meta"]["room"]
    assert room["width"] > 6 and room["depth"] > 5 and room["height"] > 2.8

    platform = layout["platform"]
    seats = layout["seats"]
    med = [s for s in seats if s["zone"] == "meditation"]
    tea = [s for s in seats if s["zone"] == "tea"]
    assert len(med) == 3, len(med)
    assert len(tea) == 1, len(tea)

    for i, a in enumerate(med):
        for b in med[i + 1 :]:
            d = dist(a["position"], b["position"])
            assert d >= 1.05, f"{a['id']}–{b['id']} too close: {d:.3f}"

    zs = [s["position"][1] for s in med]
    assert max(zs) - min(zs) >= 0.15, "meditation seats collapsed into one rank"

    inset = 0.42
    for s in med:
        x, z = s["position"]
        assert platform["x"] + inset <= x <= platform["x"] + platform["w"] - inset, s["id"]
        assert platform["z"] + inset <= z <= platform["z"] + platform["d"] - inset, s["id"]
        assert abs(s["rotationY"]) < 0.5, s["id"]

    t = tea[0]
    gap = dist_point_rect(t["position"][0], t["position"][1], platform["x"], platform["z"], platform["w"], platform["d"])
    assert gap >= 0.55, gap
    assert abs(abs(t["rotationY"]) - math.pi / 2) < 0.25
    for s in med:
        assert dist(t["position"], s["position"]) >= 1.5

    sky = layout["architecture"]["skylight"]
    assert platform["x"] < sky["x"] < platform["x"] + platform["w"]
    assert platform["z"] < sky["z"] < min(zs), "skylight should sit over the open meadow, north of the seats"

    ids = [i["id"] for i in layout["instances"]]
    assert ids == ["tea_table", "alcove_pot", "water_flask"], ids
    for inst in layout["instances"]:
        x, y, z = inst["position"]
        assert abs(x) < room["width"] / 2 + 0.2
        assert abs(z) < room["depth"] / 2 + 0.2
        assert y >= 0

    for name, spec in layout["assets"].items():
        path = (ROOT / spec["glb"]).resolve()
        assert path.is_file(), f"{name} missing: {path}"
        assert spec["targetHeight"] < 0.5, name

    table = next(i for i in layout["instances"] if i["id"] == "tea_table")
    flask = next(i for i in layout["instances"] if i["id"] == "water_flask")
    assert abs(flask["position"][1] - (table["position"][1] + layout["assets"]["coffee_table"]["targetHeight"])) < 0.02

    for key in ("corner", "close"):
        assert key in layout["cameraPresets"]
        assert len(layout["cameraPresets"][key]["position"]) == 3

    vendor = (ROOT / "vendor" / "three.module.js").resolve()
    assert vendor.is_file(), vendor
    print("layout checks ok")


if __name__ == "__main__":
    main()
