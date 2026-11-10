#!/usr/bin/env python3
"""Layout checks for the passenger ship salon. No browser required."""

import json
import math
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


def facing(yaw):
    return (math.sin(yaw), math.cos(yaw))


def main():
    with open(os.path.join(ROOT, "layout.json"), encoding="utf-8") as f:
        layout = json.load(f)

    hull = layout["meta"]["hull"]
    profile = hull["profile"]
    assert profile[0][1] < 0.2, "sole should meet the deck"
    assert max(p[1] for p in profile) < 2.9, "crown is too tall for a ship deckhead"
    assert max(p[1] for p in profile) > 2.45, "crown is too low to walk under"
    assert 0.16 <= hull["portholeR"] * 2 <= 0.5
    assert 1.15 <= hull["portholeY"] <= 1.6
    assert 0.42 <= hull["seatY"] <= 0.52
    assert hull["frontX"] > hull["backOuterX"]
    ribs = hull["ribZ"]
    assert ribs == sorted(ribs) and len(ribs) >= 6
    assert all(ribs[i + 1] - ribs[i] > 0.7 for i in range(len(ribs) - 1))

    settees = {s["id"]: s for s in hull["settees"]}
    assert settees["aft"]["z1"] < settees["fore"]["z0"], "settees overlap"
    # standing bay between the two built-ins
    gap = settees["fore"]["z0"] - settees["aft"]["z1"]
    assert 1.2 <= gap <= 2.4, gap

    ids = []
    by_id = {}
    for inst in layout["instances"]:
        assert inst["id"] not in by_id, inst["id"]
        by_id[inst["id"]] = inst
        ids.append(inst["id"])
        x, y, z = inst["position"]
        assert -3.5 <= x <= 1.3, inst["id"]
        assert -5.6 <= z <= 3.4, inst["id"]
        assert 0 <= y <= 2.6, inst["id"]
        spec = layout["assets"][inst["kind"]]
        path = os.path.normpath(os.path.join(ROOT, spec["glb"]))
        assert os.path.isfile(path), path

    for kind, spec in layout["assets"].items():
        h = spec["targetHeight"]
        if "chair" in kind:
            assert 0.8 <= h <= 0.95
        if "table" in kind:
            assert 0.72 <= h <= 0.8
        if kind == "cup_mug":
            assert h < 0.15
        if kind == "bookcase":
            assert 1.6 <= h <= 2.1

    def dot_to(inst, target_xz):
        fx, fz = facing(inst["rotationY"])
        vx = target_xz[0] - inst["position"][0]
        vz = target_xz[1] - inst["position"][2]
        mag = math.hypot(vx, vz) or 1
        return (fx * vx + fz * vz) / mag, mag

    for inst in layout["instances"]:
        look = inst.get("look")
        if not look:
            continue
        if look == "chart":
            fx, fz = facing(inst["rotationY"])
            assert fz < -0.8 and abs(fx) < 0.3, inst["id"]
            continue
        target = by_id[look]
        alignment, dist = dot_to(inst, (target["position"][0], target["position"][2]))
        assert alignment > 0.7, (inst["id"], alignment)
        assert 0.65 <= dist <= 1.45, (inst["id"], dist)

    for inst in layout["instances"]:
        if inst["kind"] != "long_table" and inst["kind"] != "square_table":
            continue
        seat = settees[inst["settee"]]
        tz = inst["position"][2]
        assert seat["z0"] - 0.15 <= tz <= seat["z1"] + 0.15, inst["id"]

    chairs = [i for i in layout["instances"] if i["kind"] == "dining_chair"]
    assert len(chairs) >= 5
    for i, a in enumerate(chairs):
        for b in chairs[i + 1 :]:
            dx = a["position"][0] - b["position"][0]
            dz = a["position"][2] - b["position"][2]
            assert math.hypot(dx, dz) > 0.55, (a["id"], b["id"])

    # Both communal tables and the chart chest are inside the rib run.
    assert min(ribs) < by_id["table_chart"]["position"][2] < max(ribs)
    assert min(ribs) < by_id["table_long"]["position"][2] < max(ribs)
    print(f"ok {len(ids)} instances, {len(ribs)} ribs, {len(chairs)} chairs")


if __name__ == "__main__":
    main()
