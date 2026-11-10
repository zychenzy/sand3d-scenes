#!/usr/bin/env python3
"""Static contract for the indoor swimming hall. No browser required."""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def main():
    layout_path = os.path.join(ROOT, "layout.json")
    with open(layout_path, encoding="utf-8") as f:
        layout = json.load(f)

    room = layout["meta"]["room"]
    pool = layout["pool"]
    niche = layout["niche"]
    trusses = layout["trusses"]
    assert room["width"] > 8 and room["depth"] > 12
    assert pool["deep"] > pool["shallow"] > 0.8
    assert pool["lanes"] == 3
    assert pool["x0"] > -room["width"] / 2
    assert pool["x1"] < room["width"] / 2
    assert pool["z0"] > -room["depth"] / 2
    assert pool["z1"] < room["depth"] / 2
    length = pool["z1"] - pool["z0"]
    width = pool["x1"] - pool["x0"]
    if not 8.5 <= length <= 16:
        fail(f"pool length {length}")
    if not 4.5 <= width <= 8:
        fail(f"pool width {width}")
    if abs(niche["x1"] - (-room["width"] / 2)) > 1e-6:
        fail("niche must open through the left wall")
    if niche["x0"] >= niche["x1"]:
        fail("niche depth")
    if niche["z0"] not in trusses["z"] or niche["z1"] not in trusses["z"]:
        fail("changing bay must sit between truss lines")
    if not (trusses["yRidge"] > trusses["yEave"] > trusses["yBot"] > 2.5):
        fail("truss elevations")
    if len(trusses["z"]) < 6:
        fail("need a run of trusses")

    ids = [i["id"] for i in layout["instances"]]
    if len(ids) != len(set(ids)):
        fail("duplicate instance ids")
    for inst in layout["instances"]:
        if inst["kind"] not in layout["assets"]:
            fail(f"unknown kind {inst['kind']}")
        if len(inst["position"]) != 3:
            fail(f"position {inst['id']}")
    kinds = {i["kind"] for i in layout["instances"]}
    for required in ("museum_bench", "pendant_lamp", "wall_shelf", "flowerpot"):
        if required not in kinds:
            fail(f"missing {required}")
    benches = [i for i in layout["instances"] if i["kind"] == "museum_bench"]
    if len(benches) < 3:
        fail("deck and niche need benches")

    for key in ("corner", "close"):
        preset = layout["cameraPresets"][key]
        if len(preset["position"]) != 3 or len(preset["target"]) != 3:
            fail(f"camera {key}")

    for kind, spec in layout["assets"].items():
        glb = os.path.join(ROOT, spec["glb"])
        if not os.path.islink(glb):
            fail(f"{kind} glb must be a symlink, not a copied bulk file: {glb}")
        if not os.path.exists(glb):
            fail(f"dangling glb {glb}")
        real = os.path.realpath(glb)
        if not real.startswith(REPO + os.sep):
            fail(f"glb escapes repo: {real}")

    vendor = os.path.join(ROOT, "vendor")
    if not os.path.islink(vendor):
        fail("vendor must symlink the shared three build")
    if not os.path.exists(os.path.join(vendor, "three.module.js")):
        fail("three.module.js missing through vendor symlink")

    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "pool.js"), encoding="utf-8").read()
    lib = open(os.path.join(ROOT, "scene_lib.js"), encoding="utf-8").read()
    for blob, name in ((html, "html"), (js, "pool.js"), (lib, "scene_lib.js")):
        if "http://" in blob or "https://" in blob:
            fail(f"{name} must not load from a CDN")
    if "layout.pool" not in js and "layout[\"pool\"]" not in js:
        # frameOf reads layout.pool
        if "layout.pool" not in js:
            fail("pool.js must read layout.pool")
    if "MeshToonMaterial" not in lib:
        fail("toon material missing")
    if "makeShell" not in js or "water" not in js:
        fail("scene entry missing")

    print("ok", len(layout["instances"]), "instances", f"pool {length:.2f}x{width:.2f}m")


if __name__ == "__main__":
    main()
