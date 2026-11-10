#!/usr/bin/env python3
"""Sanity checks for the ramen-bar layout. No browser, no copied GLBs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())
room = layout["meta"]["room"]
W, D, H = room["width"], room["depth"], room["height"]
counter = layout["anchors"]["counter"]
front_z = counter["z"] + counter["depth"] / 2
errors = []


def err(msg):
    errors.append(msg)


ids = set()
assets = layout["assets"]
for inst in layout["instances"]:
    if inst["id"] in ids:
        err(f"duplicate id {inst['id']}")
    ids.add(inst["id"])
    if inst["kind"] not in assets:
        err(f"unknown kind {inst['kind']} on {inst['id']}")
    x, y, z = inst["position"]
    if not (-W / 2 - 0.05 <= x <= W / 2 + 0.05):
        err(f"{inst['id']} x {x} outside room")
    if not (-D / 2 - 0.05 <= z <= D / 2 + 0.05):
        err(f"{inst['id']} z {z} outside room")
    if not (-0.01 <= y <= H):
        err(f"{inst['id']} y {y} outside room")

stools = [i for i in layout["instances"] if i["kind"] == "bar_stool"]
if len(stools) < 5:
    err(f"expected 5 counter stools, found {len(stools)}")
xs = []
for s in stools:
    z = s["position"][2]
    xs.append(s["position"][0])
    if z <= counter["z"]:
        err(f"{s['id']} is on the cook side of the counter (z={z})")
    if z < front_z - 0.05:
        err(f"{s['id']} is behind the guest lip (z={z}, lip={front_z:.3f})")
    if not (counter["x0"] + 0.2 <= s["position"][0] <= counter["x1"] - 0.2):
        err(f"{s['id']} x is off the counter")
if xs != sorted(xs):
    err("stools are not ordered along the counter")
gaps = [xs[i + 1] - xs[i] for i in range(len(xs) - 1)]
if gaps and (max(gaps) - min(gaps) < 0.02):
    err("stool spacing is a uniform grid")
zs = sorted(s["position"][2] for s in stools)
if len(zs) >= 2 and zs[-1] - zs[-2] < 0.25:
    err("no stool is pulled out from the row")

for kind, spec in assets.items():
    glb = spec["glb"]
    if glb.startswith("assets/"):
        err(f"{kind} copies a GLB instead of referencing cafe/assets")
    path = (ROOT / glb).resolve()
    if not path.exists():
        err(f"missing glb {path}")
    if "cafe/assets" not in glb.replace("\\", "/"):
        err(f"{kind} is not a shared cafe asset: {glb}")

for cam_name in ("corner", "close"):
    if cam_name not in layout["cameraPresets"]:
        err(f"missing camera preset {cam_name}")

three = REPO / "workshop/vendor/three.module.js"
if not three.exists():
    err(f"vendored three missing: {three}")

html = (ROOT / "index.html").read_text()
js = (ROOT / "scene_lib.js").read_text()
if "http://" in html or "https://" in html or "unpkg" in html or "jsdelivr" in html:
    err("entry HTML references a CDN")
if "three.module.js" not in html:
    err("import map does not point at vendored three")
if "MeshToonMaterial" not in js or "gradientMap" not in js:
    err("local adapter dropped toon shading")

for name in ("index.html", "ramen.js", "scene_lib.js", "README.md", "SPEC.md", "ATTRIBUTIONS.md", "refs/SOURCES.md", "refs/GAP.md"):
    if not (ROOT / name).exists():
        err(f"missing {name}")

if errors:
    print("\n".join(errors))
    raise SystemExit(1)
print(f"ok — {len(layout['instances'])} instances, {len(stools)} stools, guest lip z={front_z:.2f}")
