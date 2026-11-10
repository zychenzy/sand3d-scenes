#!/usr/bin/env python3
"""Layout and orientation checks for the seaside promenade.

Run from the repo root or from this directory:

    python3 experiments/outdoor-20261110/seaside-promenade/test_layout.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import layout_model

HERE = Path(__file__).resolve().parent


def main():
    data = json.loads((HERE / "layout.json").read_text())
    fresh = layout_model.build()
    errors = layout_model.validate(data)
    if data != fresh:
        errors.append("layout.json does not match layout_model.build() — regenerate it")

    vendor = HERE / "vendor" / "three.module.js"
    bench = HERE / "assets" / "museum_bench__0025f9484fc6.glb"
    pot = HERE / "assets" / "flowerpot__4a270f247734.glb"
    if not vendor.is_file():
        errors.append(f"vendored three.js missing at {vendor}")
    if not bench.is_file() or not pot.is_file():
        errors.append("GLB symlinks do not resolve")

    print("benches (local +X faces the water, long axis along the wall):")
    for b in data["benches"]:
        yaw = b["rotationY"]
        fx, fz = math.cos(yaw), -math.sin(yaw)
        nx, nz = b["seaward"]
        print(
            f"  {b['id']:16} pos=({b['position'][0]:+6.2f},{b['position'][1]:.2f},{b['position'][2]:+6.2f})"
            f"  face=({fx:+.2f},{fz:+.2f})  ocean=({nx:+.2f},{nz:+.2f})  dot={fx * nx + fz * nz:.3f}"
        )
    k = data["kiosk"]
    yaw = k["rotationY"]
    cx, cz = -math.sin(yaw), -math.cos(yaw)
    print(
        f"kiosk counter faces ({cx:+.2f},{cz:+.2f}) ocean=({k['seaward'][0]:+.2f},{k['seaward'][1]:+.2f})"
        f" size={k['size']} y={k['position'][1]}"
    )
    print(
        f"steps endY={data['steps']['endY']} sandY={data['steps']['sandY']}"
        f" rise={data['steps']['flights'][0]['rise']} run={data['steps']['run']} dir={data['steps']['dir']}"
    )
    print(
        f"boardwalk length={data['boardwalk']['length']} dir={data['boardwalk']['dir']}"
        f" posts={len(data['boardwalk']['posts'])}"
    )
    heights = [g["height"] for g in data["grasses"]]
    print(
        f"grasses={len(data['grasses'])} height {min(heights):.2f}-{max(heights):.2f}"
        f" rocks={len(data['rocks'])} sails={len(data['sails'])} foam={len(data['foam'])}"
    )
    shore_z = [s["shoreZ"] for s in data["wall"]]
    print(f"shore z {min(shore_z):.2f}..{max(shore_z):.2f}  wall samples={len(data['wall'])}")

    if errors:
        print(f"FAIL {len(errors)}")
        for err in errors:
            print(" -", err)
        return 1
    print("PASS layout/orientation")
    return 0


if __name__ == "__main__":
    sys.exit(main())
