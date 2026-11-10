#!/usr/bin/env python3
"""Layout invariants for the chocolatier scene. No browser required."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
errors = []

def fail(msg):
    errors.append(msg)

room = layout["meta"]["room"]
half_w = room["width"] / 2
half_d = room["depth"] / 2
height = room["height"]

ids = [i["id"] for i in layout["instances"]]
if len(ids) != len(set(ids)):
    fail("duplicate instance ids")

for kind, spec in layout["assets"].items():
    glb = (ROOT / spec["glb"]).resolve()
    if not glb.is_file() or glb.stat().st_size < 500:
        fail(f"missing asset {kind}: {spec['glb']}")
    if not (0.05 <= spec["targetHeight"] <= 2.4):
        fail(f"odd targetHeight for {kind}")

for key in ("island", "case", "counter", "temper", "rack", "cart", "crate", "lectern", "sacks"):
    if key not in layout["anchors"]:
        fail(f"missing anchor {key}")

for inst in layout["instances"]:
    if inst["kind"] not in layout["assets"]:
        fail(f"{inst['id']} kind {inst['kind']} has no asset")
    x, y, z = inst["position"]
    if abs(x) > half_w - 0.05 or abs(z) > half_d - 0.05:
        fail(f"{inst['id']} outside room ({x:.2f}, {z:.2f})")
    if y < -0.01 or y > height - 0.05:
        fail(f"{inst['id']} y out of range {y}")
    if "faces" in inst:
        fx, fz = math.sin(inst["rotationY"]), math.cos(inst["rotationY"])
        dx = inst["faces"][0] - x
        dz = inst["faces"][2] - z
        dist = math.hypot(dx, dz)
        if dist < 1e-4:
            fail(f"{inst['id']} faces itself")
            continue
        dot = (fx * dx + fz * dz) / dist
        if dot < 0.75:
            fail(f"{inst['id']} faces away from target (dot {dot:.2f})")
        if not (0.55 <= dist <= 1.4) and inst["kind"] == "dining_chair":
            fail(f"{inst['id']} seat distance {dist:.2f}m is implausible")

for preset in ("corner", "close"):
    if preset not in layout["cameraPresets"]:
        fail(f"missing camera preset {preset}")

required = {
    "bookcase_bulk", "bookcase_spice", "wall_shelf", "task_lamp", "plinth",
    "taste_table", "chair_taste_n", "chair_taste_e", "pack_table", "chair_pack",
    "register", "pos", "pend_island", "pend_case", "stool_island",
}
missing = required - set(ids)
if missing:
    fail(f"missing instances: {sorted(missing)}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok — {len(ids)} instances, {len(layout['assets'])} assets, room {room['width']}x{room['depth']}m")
