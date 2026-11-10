#!/usr/bin/env python3
"""Layout invariants for the dance rehearsal studio. No browser required."""

import json
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
    if not (10.0 <= W <= 14.0 and 7.5 <= D <= 11.0 and 3.4 <= H <= 4.6):
        errors += fail(f"room scale looks wrong: {W} x {D} x {H}")

    hx, hz = W / 2, D / 2
    ids = []
    for inst in LAYOUT["instances"]:
        ids.append(inst["id"])
        x, y, z = inst["position"]
        if abs(x) > hx - 0.05 or abs(z) > hz - 0.05:
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
        "speaker_l", "speaker_r", "bench_change", "shelf_change", "piano_bench",
        "pendant_a", "pendant_b", "pendant_c", "mug_deck", "mug_cubby", "pot_change",
    }
    missing = required - set(ids)
    if missing:
        errors += fail(f"missing instances {sorted(missing)}")

    mir = arch["mirror"]
    barre = arch["barre"]
    z_inner = -D / 2 + 0.08
    if not (z_inner - 0.02 <= mir["z"] <= z_inner + 0.08):
        errors += fail("mirror is not on the inner face of the back wall")
    if not (0.18 <= barre["z"] - mir["z"] <= 0.55):
        errors += fail("barre is not standing just in front of the mirror")
    if barre["x0"] < mir["x0"] - 0.4 or barre["x1"] > mir["x1"] + 0.4:
        errors += fail("barre does not follow the mirror")
    for h in barre["heights"]:
        if not (0.7 <= h <= 1.25):
            errors += fail(f"barre height {h} is not a studio rail")

    side = arch["sideBarre"]
    if side["z0"] <= arch["piano"]["z"] + 0.66:
        errors += fail("side barre overlaps the piano niche")
    if side["z1"] > arch["storage"]["z0"] - 0.02:
        errors += fail("side barre runs into the cubbies")
    store_end = arch["storage"]["z0"] + sum(arch["storage"]["widths"])
    if store_end > arch["changing"]["zBack"] - 0.08:
        errors += fail("cubbies collide with the changing bay")
    ch = arch["changing"]
    if not (ch["zBack"] < ch["doorZ0"] < ch["doorZ1"] < ch["zFront"]):
        errors += fail("changing door is not inside the bay")
    if not (mir["x1"] - 0.3 < arch["sprungCutX"] < hx - 0.2):
        errors += fail("sprung cut is not the open right edge")

    clear = arch["clearRehearsal"]
    for inst in LAYOUT["instances"]:
        x, _, z = inst["position"]
        inside = clear["x0"] <= x <= clear["x1"] and clear["z0"] <= z <= clear["z1"]
        if inside and inst["kind"] != "pendant_lamp":
            errors += fail(f"{inst['id']} sits in the clear rehearsal floor")

    for key, spec in arch["speakers"].items():
        inst = next(i for i in LAYOUT["instances"] if i["id"] == f"speaker_{key[0]}")
        if abs(inst["position"][0] - spec["x"]) > 0.02 or abs(inst["position"][2] - spec["z"]) > 0.02:
            errors += fail(f"speaker_{key[0]} does not match architecture")
        if abs(inst["position"][1] - spec["y"]) > 0.02:
            errors += fail(f"speaker_{key[0]} is not on its stand")

    for name in ("camera",):
        pos = LAYOUT[name]["position"]
        if pos[1] < 0.4:
            errors += fail("default camera is inside the floor")
    for preset, cam in LAYOUT["cameraPresets"].items():
        if cam["position"][1] < 0.4:
            errors += fail(f"{preset} camera is inside the floor")

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
