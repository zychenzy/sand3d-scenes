#!/usr/bin/env python3
"""Layout and orientation checks for the sculpture park. No renderer required."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LAYOUT = json.loads((ROOT / "layout.json").read_text())
FAILS = []


def check(name, ok, detail):
    status = "PASS" if ok else "FAIL"
    print(f"{status} {name}: {detail}")
    if not ok:
        FAILS.append(name)


def dist2(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def polyline(points):
    return sum(dist2(points[i], points[i + 1]) for i in range(len(points) - 1))


def point_in_poly(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]
        xj, zj = poly[j]
        if (zi > z) != (zj > z):
            xinter = (xj - xi) * (z - zi) / ((zj - zi) or 1e-9) + xi
            if x < xinter:
                inside = not inside
        j = i
    return inside


def dist_point_segment(p, a, b):
    ax, az = a
    bx, bz = b
    px, pz = p
    abx, abz = bx - ax, bz - az
    denom = abx * abx + abz * abz or 1e-9
    t = max(0.0, min(1.0, ((px - ax) * abx + (pz - az) * abz) / denom))
    return math.hypot(px - (ax + abx * t), pz - (az + abz * t))


def dist_point_polyline(p, points):
    return min(dist_point_segment(p, points[i], points[i + 1]) for i in range(len(points) - 1))


def forward_xz(local, ry):
    lx, _, lz = local
    c, s = math.cos(ry), math.sin(ry)
    return (c * lx + s * lz, -s * lx + c * lz)


def angle_between(a, b):
    na = math.hypot(*a) or 1e-9
    nb = math.hypot(*b) or 1e-9
    dot = max(-1.0, min(1.0, (a[0] * b[0] + a[1] * b[1]) / (na * nb)))
    return math.degrees(math.acos(dot))


basin = LAYOUT["basin"]["outline"]
path = LAYOUT["path"]["points"]
spur = LAYOUT["spur"]["points"]
mounds = LAYOUT["mounds"]
works = LAYOUT["works"]
seats = LAYOUT["seating"]

closed = dist2(path[0], path[-1]) < 0.05
length = polyline(path)
check("gravel loop closed", closed and LAYOUT["path"]["closed"], f"length {length:.1f} m, closed={closed}")
check("loop is a walk", length > 50, f"{length:.1f} m")

unique_x = len({round(p[0], 2) for p in basin})
unique_z = len({round(p[1], 2) for p in basin})
check(
    "basin is not a rectangle",
    len(basin) >= 10 and unique_x > 4 and unique_z > 4,
    f"{len(basin)} outline points, {unique_x} x / {unique_z} z",
)

heights = [m["radius"][1] for m in mounds]
spread = max(heights) - min(heights)
check("meadow mounds unequal", len(mounds) >= 4 and spread > 0.8, f"{len(mounds)} mounds, height spread {spread:.2f} m")

ids = [works["meridian"]["geometry"], works["coil"]["geometry"], works["fins"]["geometry"]]
mats = [works["meridian"]["material"], works["coil"]["material"], works["fins"]["material"]]
check("three distinct works", len(set(ids)) == 3 and len(set(mats)) == 3, ", ".join(f"{m}/{g}" for m, g in zip(mats, ids)))

controls = works["meridian"]["controls"]
ys = [p[1] for p in controls]
crest = max(ys)
root = controls[0][1]
approach = (controls[-2][0] - controls[-3][0], controls[-2][2] - controls[-3][2])
hook_seg = (controls[-1][0] - controls[-2][0], controls[-1][2] - controls[-2][2])
hook = approach[0] * hook_seg[0] + approach[1] * hook_seg[1]
check(
    "ribbon is a rooted curve",
    4.8 <= crest <= 6.6 and root < 0.4 and hook < 0,
    f"crest {crest:.2f} m, root y {root:.2f}, hook dot {hook:.2f}",
)

radii = [r["radius"] for r in works["coil"]["rings"]]
arcs = [r["arc"] for r in works["coil"]["rings"]]
check(
    "coil rings differ and are open",
    max(radii) - min(radii) > 0.3 and all(1.2 < a < 6.0 for a in arcs),
    f"radii {radii}, arcs {['%.2f' % a for a in arcs]}",
)

plates = works["fins"]["plates"]
hs = [p["h"] for p in plates]
check(
    "fins are thin unequal plates",
    len(plates) >= 4
    and max(hs) - min(hs) > 1.5
    and all(abs(p["wb"] - p["wt"]) > 0.15 and p["h"] > p["t"] * 12 for p in plates),
    f"heights {hs}",
)

anchors = [
    controls[0],
    works["coil"]["position"],
    works["fins"]["position"],
]
sep = min(
    math.dist((anchors[i][0], anchors[i][2]), (anchors[j][0], anchors[j][2]))
    for i in range(3)
    for j in range(i + 1, 3)
)
same_z = max(a[2] for a in anchors) - min(a[2] for a in anchors)
check("works are not a plinth row", sep > 8 and same_z > 2.5 and "plinths" not in LAYOUT, f"min separation {sep:.1f} m, z span {same_z:.1f} m")

aim_worst = 0
for seat in seats:
    fwd = forward_xz(seat["forwardLocal"], seat["rotationY"])
    origin = seat["seatPosition"]
    target = seat["facePoint"]
    aim = (target[0] - origin[0], target[2] - origin[2])
    deg = angle_between(fwd, aim)
    aim_worst = max(aim_worst, deg)
    check(f"{seat['id']} aims at {seat['faces']}", deg <= 18, f"{deg:.1f} deg off")

rots = [s["rotationY"] for s in seats]
check(
    "seats are not a parallel grid",
    min(abs(rots[i] - rots[j]) for i in range(3) for j in range(i + 1, 3)) > 0.4,
    f"rotations {['%.2f' % r for r in rots]}",
)

half = LAYOUT["path"]["width"] * 0.5
for seat in seats:
    clearance = dist_point_polyline((seat["seatPosition"][0], seat["seatPosition"][2]), path)
    check(f"{seat['id']} clear of loop", clearance > half + 0.35, f"{clearance:.2f} m from centerline")

path_hits = [p for p in path if point_in_poly(p[0], p[1], basin)]
edge_clear = min(dist_point_polyline(tuple(p), path) for p in basin)
check("loop stays out of the basin", not path_hits and edge_clear > 1.35, f"edge clearance {edge_clear:.2f} m, hits {len(path_hits)}")

spur_hits = [p for p in spur if point_in_poly(p[0], p[1], basin)]
check("spur joins the loop and stays dry", dist2(spur[0], [-10.0, 2.0]) < 0.05 and not spur_hits, f"length {polyline(spur):.1f} m")

inside = []
for spec in LAYOUT["specimens"] + LAYOUT["background"]:
    x, _, z = spec["position"]
    if point_in_poly(x, z, basin):
        inside.append(spec["id"] if "id" in spec else spec["kind"])
kinds = {s["kind"] for s in LAYOUT["specimens"]}
check("specimens outside the water", not inside, f"inside {inside or 'none'}")
check("botanical kinds vary", len(kinds) >= 4, ", ".join(sorted(kinds)))
back_z = max(s["position"][2] for s in LAYOUT["background"])
check("background tree line sits behind the garden", back_z < -9, f"nearest background z {back_z:.1f}")

cams = LAYOUT["cameraPresets"]
check("corner and close cameras", "corner" in cams and "close" in cams and "position" in LAYOUT["camera"], "default, corner, close")
check("overcast shell", LAYOUT["shell"]["clearColor"] == LAYOUT["shell"]["fogColor"], LAYOUT["shell"]["clearColor"])
check("no point-light pools", "points" not in LAYOUT.get("lights", {}), "hemi + key + fill only")

bench_glb = ROOT / "assets" / "museum_bench__0025f9484fc6.glb"
check("bench glb resolves", bench_glb.exists() and bench_glb.stat().st_size > 1000, str(bench_glb))
vendor = ROOT / "vendor" / "three.module.js"
check("vendored three resolves", vendor.exists() and vendor.stat().st_size > 1000, str(vendor))

print(f"\n{len(FAILS)} failed" if FAILS else "\nall layout checks passed")
sys.exit(1 if FAILS else 0)
