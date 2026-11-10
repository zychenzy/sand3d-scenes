#!/usr/bin/env python3
"""Layout invariants for the prior-upgrade rehearsal hall. No browser required."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())


def fail(msg):
    print("FAIL", msg)
    return 1


def main():
    errors = 0
    room = LAYOUT["meta"]["room"]
    arch = LAYOUT["architecture"]
    W, D, H = room["width"], room["depth"], room["height"]
    if not (9.5 <= W <= 13.0 and 7.0 <= D <= 10.0 and 3.1 <= H <= 4.2):
        errors += fail(f"room scale looks wrong: {W} x {D} x {H}")

    hx, hz = W / 2, D / 2
    ids = []
    for inst in LAYOUT["instances"]:
        ids.append(inst["id"])
        x, y, z = inst["position"]
        if abs(x) > hx - 0.04 or abs(z) > hz - 0.04:
            errors += fail(f"{inst['id']} outside room ({x}, {z})")
        if y < -0.01 or y > H - 0.05:
            errors += fail(f"{inst['id']} y out of range: {y}")
        kind = inst["kind"]
        spec = LAYOUT["assets"].get(kind)
        if not spec:
            errors += fail(f"{inst['id']} missing asset {kind}")
            continue
        glb = ROOT / spec["glb"]
        if not glb.exists():
            errors += fail(f"missing glb {glb}")
    if len(ids) != len(set(ids)):
        errors += fail("duplicate instance ids")

    required = {
        "amp_guitar", "amp_marshall", "speaker_l", "speaker_r", "piano_bench",
        "aud_l0", "aud_l1", "aud_r0", "aud_r1", "coach_chair",
        "pendant_practice", "pendant_left", "pendant_right",
        "score_stand", "score_shelf", "coach_lamp", "coach_mug", "pot_door",
    }
    missing = required - set(ids)
    if missing:
        errors += fail(f"missing instances {sorted(missing)}")

    dais = arch["dais"]
    if not (dais["z0"] < dais["z1"] < 0):
        errors += fail("dais is not on the back (-Z) wall")
    if not (0.08 <= dais["h"] <= 0.22):
        errors += fail(f"dais height {dais['h']} is not a shallow practice riser")
    px, pz = arch["piano"]["x"], arch["piano"]["z"]
    if not (dais["x0"] < px < dais["x1"] and dais["z0"] < pz < dais["z1"]):
        errors += fail("piano is not on the practice dais")
    bx, bz = arch["pianoBench"]["x"], arch["pianoBench"]["z"]
    if abs(bx - px) > 0.15:
        errors += fail("piano bench is not aligned with the keyboard")
    if not (pz < bz < dais["z1"] + 0.4):
        errors += fail("piano bench is not on the keyboard (+Z) side")

    listen = arch["listening"]
    aisle = listen["aisleX0"], listen["aisleX1"]
    if aisle[1] - aisle[0] < 1.2:
        errors += fail("centre aisle is too narrow")
    for ch in listen["chairs"]:
        rot = ch["rotationY"]
        # occupant faces -Z when rotationY ~ pi (native chair faces +Z at 0)
        delta = abs((rot % (2 * math.pi)) - math.pi)
        if delta > 0.35:
            errors += fail(f"{ch['id']} does not face the practice wall (rot={rot})")
        if aisle[0] < ch["x"] < aisle[1]:
            errors += fail(f"{ch['id']} sits in the centre aisle")
        inst = next(i for i in LAYOUT["instances"] if i["id"] == ch["id"])
        if abs(inst["position"][2] - listen["z"]) > 0.02:
            errors += fail(f"{ch['id']} z does not match listening row")
        if abs(inst["rotationY"] - rot) > 0.01:
            errors += fail(f"{ch['id']} rotation does not match architecture")

    coach = next(i for i in LAYOUT["instances"] if i["id"] == "coach_chair")
    # coach sits to the right, turned toward the dais (negative Y rotation toward -Z/-X)
    if coach["position"][0] < 2.4:
        errors += fail("coach chair is not in the side coaching zone")
    if coach["position"][2] > listen["z"] - 0.4:
        errors += fail("coach chair is not forward of the listening row")

    clear = arch["clearPractice"]
    aisle_box = arch["centreAisle"]
    for inst in LAYOUT["instances"]:
        x, y, z = inst["position"]
        if inst["kind"] == "pendant_lamp":
            continue
        inside_clear = clear["x0"] <= x <= clear["x1"] and clear["z0"] <= z <= clear["z1"]
        if inside_clear:
            errors += fail(f"{inst['id']} sits in the clear practice floor")
        in_aisle = aisle_box["x0"] < x < aisle_box["x1"] and aisle_box["z0"] < z < aisle_box["z1"]
        if in_aisle and inst["kind"] not in ("pendant_lamp",):
            errors += fail(f"{inst['id']} blocks the centre aisle")

    for key, spec in arch["speakers"].items():
        inst = next(i for i in LAYOUT["instances"] if i["id"] == f"speaker_{key[0]}")
        if abs(inst["position"][0] - spec["x"]) > 0.02 or abs(inst["position"][2] - spec["z"]) > 0.02:
            errors += fail(f"speaker_{key[0]} does not match architecture")
        if abs(inst["position"][1] - spec["y"]) > 0.02 or inst["position"][1] < 0.7:
            errors += fail(f"speaker_{key[0]} is not on its stand")

    for amp_id in ("amp_guitar", "amp_marshall"):
        inst = next(i for i in LAYOUT["instances"] if i["id"] == amp_id)
        if not (dais["x0"] < inst["position"][0] < dais["x1"]):
            errors += fail(f"{amp_id} is not on the dais")
        if inst["position"][1] < dais["h"] - 0.02:
            errors += fail(f"{amp_id} is not sitting on the dais")

    vendor = ROOT / "vendor" / "three.module.js"
    if not vendor.exists():
        errors += fail("vendored three.js symlink is broken")

    if errors:
        print(f"{errors} layout check(s) failed")
        return 1
    print("layout ok", len(ids), "instances")
    return 0


if __name__ == "__main__":
    sys.exit(main())
