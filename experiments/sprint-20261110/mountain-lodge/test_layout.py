#!/usr/bin/env python3
"""Layout checks for the alpine lodge. No browser required."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LAYOUT = json.loads((ROOT / "layout.json").read_text())


def fail(msg):
    print("FAIL:", msg)
    return 1


def chair_forward(yaw):
    """dining_chair local +Z, Three.js Y rotation."""
    return math.sin(yaw), math.cos(yaw)


def sofa_forward(yaw):
    """sofa_solid local -Z."""
    return -math.sin(yaw), -math.cos(yaw)


def aim_dot(forward, origin, target):
    dx = target[0] - origin[0]
    dz = target[1] - origin[1]
    dist = math.hypot(dx, dz) or 1.0
    return (forward[0] * dx + forward[1] * dz) / dist, dist


def main():
    errors = 0
    room = LAYOUT["meta"]["room"]
    anchors = LAYOUT["anchors"]
    table = anchors["table"]
    depth = room["depth"]
    wall_z = -depth / 2 + 0.09
    fire_aim = (anchors["fireplace"]["x"], wall_z + 0.6 + 0.35)

    zones = set(anchors.get("zones") or [])
    for name in ("fireplace", "communal-table", "reading-nook", "boot-gear"):
        if name not in zones:
            errors += fail(f"missing zone {name}")

    for key in ("corner", "close"):
        preset = LAYOUT["cameraPresets"].get(key)
        if not preset or len(preset["position"]) != 3 or len(preset["target"]) != 3:
            errors += fail(f"camera preset {key}")

    kinds = set(LAYOUT["assets"])
    ids = set()
    for inst in LAYOUT["instances"]:
        if inst["id"] in ids:
            errors += fail(f"duplicate id {inst['id']}")
        ids.add(inst["id"])
        if inst["kind"] not in kinds:
            errors += fail(f"{inst['id']} unknown kind {inst['kind']}")
        glb = ROOT / LAYOUT["assets"][inst["kind"]]["glb"]
        if not glb.exists():
            errors += fail(f"missing glb {glb}")
        elif glb.stat().st_size < 1000:
            errors += fail(f"glb too small {glb}")
        if not glb.is_symlink():
            errors += fail(f"glb should be a symlink, not a copied bulk file: {glb.name}")

    half_l = table["len"] / 2
    half_w = table["wid"] / 2
    for inst in LAYOUT["instances"]:
        if inst["kind"] != "dining_chair":
            continue
        x, _, z = inst["position"]
        # Aim at the closest point on the top, not the center. A chair on a
        # long side faces the near edge; the center can sit well off-axis.
        nx = min(max(x, table["x"] - half_l), table["x"] + half_l)
        nz = min(max(z, table["z"] - half_w), table["z"] + half_w)
        dot, dist = aim_dot(chair_forward(inst["rotationY"]), (x, z), (nx, nz))
        if dot < 0.85:
            errors += fail(f"{inst['id']} does not face the table (dot {dot:.2f})")
        if dist < 0.25 or dist > 1.15:
            errors += fail(f"{inst['id']} distance to tabletop {dist:.2f}")
        outside = abs(x - table["x"]) > half_l + 0.15 or abs(z - table["z"]) > half_w + 0.15
        if not outside:
            errors += fail(f"{inst['id']} sits inside the tabletop")

    sofa = next(i for i in LAYOUT["instances"] if i["id"] == "sofa")
    dot, _ = aim_dot(sofa_forward(sofa["rotationY"]), (sofa["position"][0], sofa["position"][2]), fire_aim)
    if dot < 0.45:
        errors += fail(f"sofa does not face the fireplace (dot {dot:.2f})")

    if "library_lamp" in LAYOUT["assets"] or "readingLamp" not in (ROOT / "lodge.js").read_text():
        errors += fail("reading nook should use the procedural fabric-shade lamp")

    html = (ROOT / "index.html").read_text()
    js = (ROOT / "lodge.js").read_text() + (ROOT / "scene_lib.js").read_text()
    for label, text in (("html", html), ("js", js)):
        if "http://" in text or "https://" in text or "cdn." in text:
            errors += fail(f"{label} references a remote URL")
    if "./vendor/three.module.js" not in html:
        errors += fail("import map is not the local three build")
    if not (ROOT / "vendor" / "three.module.js").exists():
        errors += fail("vendored three.js missing")
    if (ROOT / "vendor").is_symlink() is False:
        errors += fail("vendor should be a symlink, not a copied three build")

    if errors:
        print(f"{errors} failure(s)")
        return 1
    print("ok", len(LAYOUT["instances"]), "instances", len(kinds), "assets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
