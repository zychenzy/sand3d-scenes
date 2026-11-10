#!/usr/bin/env python3
"""Layout and orientation checks for the neighbourhood pocket plaza.

Run from the repository root:

  python3 experiments/outdoor-20261110/neighbourhood-pocket-plaza/tests/layout_orientation.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SCENE = Path(__file__).resolve().parents[1]
LAYOUT_PATH = SCENE / "layout.json"

failures: list[str] = []
notes: list[str] = []


def check(cond: bool, msg: str) -> None:
    if cond:
        notes.append("PASS  " + msg)
    else:
        failures.append(msg)
        notes.append("FAIL  " + msg)


def dist_to_seg(px, pz, ax, az, bx, bz) -> float:
    dx, dz = bx - ax, bz - az
    l2 = dx * dx + dz * dz or 1e-8
    t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / l2))
    return math.hypot(px - (ax + t * dx), pz - (az + t * dz))


def dist_to_line(px, pz, pts) -> float:
    best = 1e9
    for i in range(len(pts) - 1):
        ax, az = pts[i]
        bx, bz = pts[i + 1]
        best = min(best, dist_to_seg(px, pz, ax, az, bx, bz))
    return best


def rim(island, t, outward=0.0):
    lx = math.cos(t) * island["rx"]
    lz = math.sin(t) * island["rz"]
    c = math.cos(island["rot"])
    s = math.sin(island["rot"])
    x = island["cx"] + c * lx - s * lz
    z = island["cz"] + s * lx + c * lz
    dx, dz = x - island["cx"], z - island["cz"]
    n = math.hypot(dx, dz) or 1.0
    return x + dx / n * outward, z + dz / n * outward


def forward(ry):
    return math.sin(ry), math.cos(ry)


def main() -> int:
    layout = json.loads(LAYOUT_PATH.read_text())
    site = layout["site"]
    instances = {i["id"]: i for i in layout["instances"]}

    for kind, spec in layout["assets"].items():
        path = (SCENE / spec["glb"]).resolve()
        try:
            path.relative_to(ROOT)
        except ValueError:
            check(False, f"{kind} escapes the repo: {path}")
            continue
        check(path.is_file(), f"{kind} resolves to {path.relative_to(ROOT)}")
        if path.is_file():
            magic = path.read_bytes()[0:4]
            check(magic == b"glTF", f"{kind} is a binary GLB")

    key = layout["lights"]["key"]["position"]
    check(key[0] < 0 and key[2] > 0 and key[1] > 6, f"key light is southwest and elevated {key}")
    check("points" not in layout["lights"], "no point lights (no spotlight pools)")
    intensity = layout["lights"]["key"]["intensity"]
    check(0.7 <= intensity <= 1.45, f"key intensity {intensity} stays in a controlled range")
    check(layout["lights"]["fill"]["intensity"] < 0.4, "fill is a low bounce, not a second sun")

    for name in ("corner", "close"):
        check(name in layout["cameraPresets"], f"camera preset {name}")
    check(layout["camera"]["position"][0] < 0 and layout["camera"]["position"][2] > 0, "default camera sits in the open southwest")

    street_y = site["streetY"]
    for ramp in site["ramps"]:
        top, bot = ramp["top"], ramp["bottom"]
        horiz = math.hypot(top[0] - bot[0], top[2] - bot[2])
        rise = top[1] - bot[1]
        slope = rise / horiz
        limit = (0.062, 0.11) if ramp["kind"] == "corner" else (0.075, 0.095)
        check(abs(top[1] - 0.0) < 1e-6 and abs(bot[1] - street_y) < 1e-6, f"{ramp['id']} drops from plaza to street")
        check(limit[0] <= slope <= limit[1], f"{ramp['id']} slope 1:{1/slope:.1f} ({slope:.3f}) within {limit}")
        check(bot[1] < top[1], f"{ramp['id']} bottom is lower than the top")

    corner = next(r for r in site["ramps"] if r["id"] == "corner")
    check(corner["top"][0] < 0 and corner["top"][2] > 0, "corner ramp is on the southwest edge")
    check(site["cafeDoor"][1] < -6.4, "cafe door is on the north facade")
    check(site["stoop"]["x"] > 7.0, "residential stoop is on the east facade")

    bench = site["bench"]
    island = site["island"]
    span = bench["a1"] - bench["a0"]
    if span < 0:
        span += math.tau
    gap_mid = bench["a1"] + (math.tau - span) / 2
    gx, gz = math.cos(gap_mid), math.sin(gap_mid)
    check(gx < -0.25 and gz > 0.2, f"bench gap opens southwest ({gx:.2f}, {gz:.2f})")

    samples = []
    t = bench["a0"]
    while t <= bench["a1"] + 1e-6:
        samples.append(rim(island, t, bench["seatOut"]))
        t += 0.2
    for i in range(28):
        samples.append(rim(island, -math.pi + i * (2 * math.pi / 28), 0.22))

    min_island = 1e9
    island_hit = ""
    for line in site["desireLines"]:
        half = line["halfWidth"]
        for x, z in samples:
            d = dist_to_line(x, z, line["points"])
            if d < min_island:
                min_island = d
                island_hit = line["id"]
            if d + 1e-6 < half:
                check(False, f"island/bench ({x:.2f},{z:.2f}) enters {line['id']} by {half - d:.2f}m")
                break
    notes.append(f"INFO  closest island/bench sample to a desire line: {min_island:.2f}m ({island_hit})")

    for inst in layout["instances"]:
        r = inst.get("clearance", 0.3)
        px, pz = inst["position"][0], inst["position"][2]
        if inst["id"] in ("counter", "espresso", "counter_cup"):
            check(pz < -7.2, f"{inst['id']} stays inside the cafe")
            continue
        for line in site["desireLines"]:
            d = dist_to_line(px, pz, line["points"])
            need = line["halfWidth"] + r
            if d + 1e-6 < need:
                check(False, f"{inst['id']} clearance {d:.2f}m < {need:.2f}m on {line['id']}")

    for obs in site["obstacles"]:
        for line in site["desireLines"]:
            d = dist_to_line(obs["x"], obs["z"], line["points"])
            need = line["halfWidth"] + obs["r"]
            if d + 1e-6 < need:
                check(False, f"{obs['id']} clearance {d:.2f}m < {need:.2f}m on {line['id']}")

    for inst in layout["instances"]:
        if "faces" not in inst:
            continue
        target = instances[inst["faces"]]
        fx, fz = forward(inst["rotationY"])
        dx = target["position"][0] - inst["position"][0]
        dz = target["position"][2] - inst["position"][2]
        n = math.hypot(dx, dz) or 1.0
        dot = (fx * dx + fz * dz) / n
        check(dot > 0.75, f"{inst['id']} faces {inst['faces']} (dot {dot:.2f})")

    occupied = []
    for inst in layout["instances"]:
        if inst["position"][1] > 0.4:
            continue
        occupied.append(inst)
    for i, a in enumerate(occupied):
        for b in occupied[i + 1 :]:
            d = math.hypot(a["position"][0] - b["position"][0], a["position"][2] - b["position"][2])
            need = a.get("clearance", 0.3) + b.get("clearance", 0.3) * 0.45
            if d < need and a["kind"] != "cup_mug" and b["kind"] != "cup_mug":
                check(False, f"{a['id']} overlaps {b['id']} ({d:.2f}m)")

    report = "\n".join(notes)
    if failures:
        report += "\n\n" + str(len(failures)) + " failure(s):\n- " + "\n- ".join(failures)
    else:
        report += "\n\nAll layout/orientation checks passed."
    out = SCENE / "tests" / "last-run.txt"
    out.write_text(report + "\n")
    print(report)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
