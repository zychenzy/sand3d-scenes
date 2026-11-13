#!/usr/bin/env python3
"""Geometry, path, load, and runtime checks for the leathercraft atelier."""

import json
import math
import subprocess
import sys
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread

SCENE = Path(__file__).resolve().parents[1]
REPO = SCENE.parents[2]
LAYOUT_PATH = SCENE / "layout.json"
PORT = 8796

REQUIRED_ZONES = [
    "clicker",
    "clickerStand",
    "pony",
    "ponyTable",
    "workStool",
    "burnish",
    "cabinet",
    "niche",
    "hides",
    "window",
]

REQUIRED_IDS = [
    "chair_burnish",
    "lamp_burnish",
    "lamp_pony",
    "pend_clicker",
    "pend_pony",
    "pend_burnish",
    "jar_burnish",
    "jar_clicker",
    "plant",
    "mug",
]


def forward(rot):
    return math.sin(rot), math.cos(rot)


def face_dot(inst, target):
    fx, fz = forward(inst["rotationY"])
    dx = target[0] - inst["position"][0]
    dz = target[1] - inst["position"][2]
    dist = math.hypot(dx, dz) or 1e-6
    return (fx * dx + fz * dz) / dist, dist


def footprint_box(inst, spec):
    w, d = spec["footprint"]
    rot = abs(inst.get("rotationY", 0)) % math.pi
    if abs(rot - math.pi / 2) < 0.45:
        w, d = d, w
    x, _, z = inst["position"]
    return (x - w / 2, x + w / 2, z - d / 2, z + d / 2)


def zone_box(zone):
    return (
        zone["x"] - zone["w"] / 2,
        zone["x"] + zone["w"] / 2,
        zone["z"] - zone["d"] / 2,
        zone["z"] + zone["d"] / 2,
    )


def overlap_xz(a, b, gap=0.0):
    return a[1] + gap > b[0] and b[1] + gap > a[0] and a[3] + gap > b[2] and b[3] + gap > a[2]


def x_gap(a, b):
    if a[1] < b[0]:
        return b[0] - a[1]
    if b[1] < a[0]:
        return a[0] - b[1]
    return 0.0


def main():
    errors = []
    layout = json.loads(LAYOUT_PATH.read_text())
    room = layout["meta"]["room"]
    if not (10.0 <= room["width"] <= 13.0 and 7.5 <= room["depth"] <= 10.5 and room["height"] >= 3.1):
        errors.append(f"unexpected room {room}")

    zones = layout["zones"]
    for key in REQUIRED_ZONES:
        if key not in zones:
            errors.append(f"missing zone {key}")

    ids = [i["id"] for i in layout["instances"]]
    if len(ids) != len(set(ids)):
        errors.append("duplicate instance ids")
    for req in REQUIRED_IDS:
        if req not in ids:
            errors.append(f"missing instance {req}")
    by_id = {i["id"]: i for i in layout["instances"]}

    half_w = room["width"] / 2 - 0.05
    half_d = room["depth"] / 2 - 0.05
    for inst in layout["instances"]:
        x, y, z = inst["position"]
        if abs(x) > half_w or abs(z) > half_d or y < -0.01 or y > room["height"]:
            errors.append(f"{inst['id']} outside room {inst['position']}")
        spec = layout["assets"][inst["kind"]]
        path = (SCENE / spec["glb"]).resolve()
        if not path.is_file():
            errors.append(f"missing GLB {spec['glb']}")
        if not str(path).startswith(str(REPO)):
            errors.append(f"{inst['kind']} escapes the repo")
        if SCENE in path.parents:
            errors.append(f"{inst['kind']} must stay a shared reference, not a copy in this folder")
        if ".." not in spec["glb"]:
            errors.append(f"{inst['kind']} should use a relative root path")

    for inst in layout["instances"]:
        target_name = inst.get("faces")
        if not target_name:
            continue
        target = zones[target_name]
        dot, dist = face_dot(inst, (target["x"], target["z"]))
        if dot < 0.8:
            errors.append(f"{inst['id']} faces away from {target_name} (dot {dot:.2f})")
        if not (0.35 <= dist <= 2.2):
            errors.append(f"{inst['id']} distance to {target_name} is {dist:.2f}")

    clicker = zone_box(zones["clicker"])
    pony = zone_box(zones["pony"])
    burnish = zone_box(zones["burnish"])
    stand = zone_box(zones["clickerStand"])
    if x_gap(clicker, pony) < 0.95:
        errors.append("aisle between clicker and pony is under 0.95 m")
    if x_gap(pony, burnish) < 0.95:
        errors.append("aisle between pony and burnish is under 0.95 m")
    if stand[2] <= clicker[3]:
        errors.append("standing zone is not in front of the clicker bench")
    if stand[1] - stand[0] < 0.9:
        errors.append("standing zone is narrower than 0.9 m")

    stool_z = zones["workStool"]
    stool = zone_box(stool_z)
    chair = footprint_box(by_id["chair_burnish"], layout["assets"]["dining_chair"])
    if overlap_xz(stool, stand, -0.02):
        errors.append("work stool blocks the standing zone")
    if overlap_xz(stool, clicker, -0.02):
        errors.append("work stool intersects the clicker bench")
    if not (0.58 <= stool_z["h"] <= 0.72):
        errors.append("work stool is not a perch height beside the standing bench")
    stool_dot, stool_dist = face_dot(
        {"rotationY": stool_z["rot"], "position": [stool_z["x"], 0, stool_z["z"]]},
        (zones["clickerEnd"]["x"], zones["clickerEnd"]["z"]),
    )
    if stool_dot < 0.8:
        errors.append(f"work stool faces away from the clicker end (dot {stool_dot:.2f})")
    if not (0.35 <= stool_dist <= 1.4):
        errors.append(f"work stool distance to the clicker end is {stool_dist:.2f}")
    if "bar_stool" in layout["assets"] or any(i["kind"] == "bar_stool" for i in layout["instances"]):
        errors.append("tulip cafe stool is still instanced")
    if overlap_xz(chair, burnish, -0.02):
        errors.append("burnish chair intersects the bench")
    # Seat front is the side toward -Z (rotation pi). Keep a knee gap, not a stride.
    chair_front = chair[2]
    bench_front = burnish[3]
    knee = chair_front - bench_front
    if not (0.12 <= knee <= 0.45):
        errors.append(f"burnish knee gap {knee:.2f} m is outside 0.12–0.45")

    pony_z = zones["pony"]
    if not (0.46 <= pony_z["seat"] <= 0.55):
        errors.append("pony seat height is not a sitting height")
    if pony_z["jaw"] < pony_z["seat"] + 0.4:
        errors.append("pony jaws are too low for saddle stitching")
    if not (0.88 <= zones["clicker"]["h"] <= 0.96):
        errors.append("clicker bench is not standing height")
    if not (0.72 <= zones["burnish"]["h"] <= 0.8):
        errors.append("burnish bench is not seated height")

    repeat = layout["shell"]["floorRepeat"]
    if repeat[1] < 6:
        errors.append("floor texture repeat is coarse")

    for name in ("corner", "close"):
        if name not in layout["cameraPresets"]:
            errors.append(f"missing camera {name}")
    close = layout["cameraPresets"]["close"]["target"]
    if math.hypot(close[0] - zones["pony"]["x"], close[2] - zones["pony"]["z"]) > 0.7:
        errors.append("close camera is not aimed at the stitching pony")
    if not (0.55 <= close[1] <= 1.05):
        errors.append("close camera target misses the pony seat and jaws")
    if len(layout["lights"].get("points") or []) < 4:
        errors.append("expected task and pendant point lights")

    js = (SCENE / "leather.js").read_text()
    lib = (SCENE / "scene_lib.js").read_text()
    html = (SCENE / "index.html").read_text()
    for token in ("LatheGeometry", "TorusGeometry", "TubeGeometry", "hangGeometry", "stitchingPony", "clickerPress", "workStool", "bagSeam"):
        if token not in js:
            errors.append(f"leather.js missing {token}")
    if "bar_stool" in js:
        errors.append("leather.js still references the cafe bar stool")
    for banned in ("floorLoom", "sewingMachine", "textile.js"):
        if banned in js:
            errors.append(f"leather.js still references {banned}")
    if "MeshBasicMaterial" not in lib or "PCFHardShadowMap" not in lib or "NearestFilter" not in lib:
        errors.append("scene_lib is missing hard toon or true unlit")
    if "0.28" not in lib:
        errors.append("toon gradient floor was not lifted")
    if "../../../workshop/vendor/three.module.js" not in html:
        errors.append("index.html should import the shared workshop vendor")
    if (SCENE / "vendor").exists():
        errors.append("do not vendor three.js into this folder")
    if list(SCENE.glob("assets/*.glb")):
        errors.append("do not copy GLBs into this folder")

    # Load + runtime. Server root is the repo so shared GLBs resolve.
    handler = lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, directory=str(REPO), **kwargs)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    thread = Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{PORT}/experiments/indoor30-20261113/leathercraft"
    try:
        for rel in ["/", "/layout.json", "/leather.js", "/scene_lib.js", "/index.html"]:
            url = base + rel
            try:
                with urllib.request.urlopen(url, timeout=10) as res:
                    if res.status != 200:
                        errors.append(f"{rel} status {res.status}")
            except Exception as exc:
                errors.append(f"load {rel} failed: {exc}")
        for spec in layout["assets"].values():
            url = base + "/" + spec["glb"]
            req = urllib.request.Request(url, method="HEAD")
            try:
                with urllib.request.urlopen(req, timeout=10) as res:
                    if res.status != 200:
                        errors.append(f"GLB {spec['glb']} status {res.status}")
            except Exception as exc:
                errors.append(f"GLB load failed {spec['glb']}: {exc}")

        runtime = subprocess.run(
            ["node", str(SCENE / "tests" / "runtime_browser.mjs"), base, str(SCENE / "shots")],
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
        if runtime.returncode != 0:
            errors.append((runtime.stderr or runtime.stdout or "runtime failed").strip())
        else:
            print(runtime.stdout.strip())
    finally:
        httpd.shutdown()

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"ok — {len(ids)} instances, shared GLBs, aisles, load, runtime")
    return 0


if __name__ == "__main__":
    sys.exit(main())
