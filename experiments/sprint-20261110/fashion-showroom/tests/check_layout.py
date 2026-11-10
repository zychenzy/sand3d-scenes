#!/usr/bin/env python3
"""Layout and asset checks for the fashion showroom. No browser required."""

import json
import math
import subprocess
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
    W, D, H = room["width"], room["depth"], room["height"]
    hx, hz = W / 2, D / 2
    zones = LAYOUT["zones"]
    consult = zones["consult"]

    for rel in ("index.html", "showroom.js", "scene_lib.js", "README.md", "SPEC.md"):
        if not (ROOT / rel).is_file():
            errors += fail(f"missing {rel}")

    for js in ("showroom.js", "scene_lib.js"):
        proc = subprocess.run(["node", "--check", str(ROOT / js)], capture_output=True, text=True)
        if proc.returncode != 0:
            errors += fail(f"syntax {js}: {proc.stderr.strip()}")

    kinds = set(LAYOUT["assets"])
    for kind, spec in LAYOUT["assets"].items():
        path = (ROOT / spec["glb"]).resolve()
        if not path.is_file():
            errors += fail(f"{kind} glb missing: {spec['glb']}")
        elif path.stat().st_size < 500:
            errors += fail(f"{kind} glb too small")

    ids = set()
    by_id = {}
    for inst in LAYOUT["instances"]:
        if inst["id"] in ids:
            errors += fail(f"duplicate id {inst['id']}")
        ids.add(inst["id"])
        by_id[inst["id"]] = inst
        if inst["kind"] not in kinds:
            errors += fail(f"{inst['id']} unknown kind")
        x, y, z = inst["position"]
        margin = 0.15
        if not (-hx + margin <= x <= hx - margin and -hz + margin <= z <= hz - margin):
            errors += fail(f"{inst['id']} outside room {inst['position']}")
        if not (0 <= y <= H):
            errors += fail(f"{inst['id']} bad height {y}")

    table = by_id["consult_table"]
    client = by_id["chair_client"]
    designer = by_id["chair_designer"]
    if abs(table["position"][0] - consult["x"]) > 1e-6 or abs(table["position"][2] - consult["z"]) > 1e-6:
        errors += fail("consult_table does not match zones.consult")
    seat = consult["seat"]
    if abs(client["position"][2] - (consult["z"] + seat)) > 0.02:
        errors += fail("client chair is not south of the table")
    if abs(client["rotationY"] - math.pi) > 0.02:
        errors += fail("client chair should face the table (-Z)")
    if abs(designer["position"][0] - (consult["x"] - seat)) > 0.02:
        errors += fail("designer chair is not west of the table")
    if abs(designer["rotationY"] - math.pi / 2) > 0.02:
        errors += fail("designer chair should face the table (+X)")
    if abs(client["rotationY"] - designer["rotationY"]) < 0.2:
        errors += fail("chairs share a rotation")

    for key in ("corner", "close"):
        if key not in LAYOUT["cameraPresets"]:
            errors += fail(f"missing camera {key}")

    # The inset pause sits between the plinth and the consultation table.
    plat = zones["platform"]
    if plat["z"] + plat["d"] / 2 >= consult["z"] - 0.6:
        errors += fail("platform crowds the consultation zone")
    niche = zones["niche"]
    if niche["x1"] >= plat["x"] - plat["w"] / 2:
        errors += fail("niche overlaps the plinth")

    # Referenced vendor runtime resolves through the symlink.
    three = (ROOT / "vendor" / "three.module.js").resolve()
    if not three.is_file():
        errors += fail("vendored three.js symlink broken")

    if errors:
        print(f"{errors} failed")
        return 1
    print("ok", len(LAYOUT["instances"]), "instances", len(kinds), "glbs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
