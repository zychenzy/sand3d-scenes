"""Offline checks for the aquarium hall package. No browser, no network."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]


def fail(msg):
    print("FAIL", msg)
    return 1


def main():
    errors = 0
    layout_path = ROOT / "layout.json"
    layout = json.loads(layout_path.read_text())
    room = layout["meta"]["room"]
    for key in ("width", "depth", "height"):
        if room[key] <= 2:
            errors += fail(f"room.{key} too small")

    for preset in ("corner", "close"):
        if preset not in layout["cameraPresets"]:
            errors += fail(f"missing camera preset {preset}")
        else:
            p = layout["cameraPresets"][preset]
            if len(p["position"]) != 3 or len(p["target"]) != 3:
                errors += fail(f"{preset} camera vectors")

    kinds = set(layout["assets"])
    ids = []
    benches = []
    for inst in layout["instances"]:
        ids.append(inst["id"])
        if inst["kind"] not in kinds:
            errors += fail(f"unknown kind {inst['kind']}")
        if inst["kind"] == "museum_bench":
            benches.append(inst)
    if len(ids) != len(set(ids)):
        errors += fail("duplicate instance ids")
    if len(benches) < 2:
        errors += fail("expected two viewing benches facing the glass")
    for bench in benches:
        rot = bench["rotationY"]
        if abs(abs(rot) - math.pi / 2) > 0.05:
            errors += fail(f"{bench['id']} should face the tank, rotationY={rot}")
        if bench["position"][1] != 0:
            errors += fail(f"{bench['id']} should sit on the floor")

    if not any(i["kind"] == "flowerpot" for i in layout["instances"]):
        errors += fail("expected lobby flowerpots")

    points = layout["lights"]["points"]
    if len(points) < 3:
        errors += fail("tank needs several restrained point lights")

    vendor = ROOT / "vendor"
    three = vendor / "three.module.js"
    if not vendor.is_symlink():
        errors += fail("vendor/ should be a symlink, not a copied three.js tree")
    if not three.exists():
        errors += fail("vendor/three.module.js missing")

    for rel in (
        "assets/museum_bench__0025f9484fc6.glb",
        "assets/flowerpot__4a270f247734.glb",
    ):
        path = ROOT / rel
        if not path.is_symlink():
            errors += fail(f"{rel} should symlink a shared GLB")
        if not path.exists() or path.stat().st_size < 1000:
            errors += fail(f"{rel} does not resolve")
        resolved = path.resolve()
        if REPO not in resolved.parents and resolved != REPO:
            errors += fail(f"{rel} resolves outside the repo")

    html = (ROOT / "index.html").read_text()
    if "./vendor/three.module.js" not in html:
        errors += fail("import map should stay on the local vendor symlink")
    if "http://" in html or "https://" in html:
        errors += fail("index.html should not fetch a CDN")

    src = (ROOT / "aquarium.js").read_text()
    for token in ("KELP FOREST", "GARIBALDI", "SENORITA", "ROCKFISH", "makeFish", "museum_bench"):
        if token not in src and token not in layout_path.read_text():
            errors += fail(f"missing {token}")

    if errors:
        print(f"{errors} check(s) failed")
        return 1
    print("aquarium hall checks ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
