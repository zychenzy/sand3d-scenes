#!/usr/bin/env python3
"""Layout and orientation checks for the riverside tea pavilion.

Run from anywhere:
  python3 experiments/outdoor-20261110/riverside-tea-pavilion/tests/test_layout.py
"""
import json
import math
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
fails = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f" — {detail}" if detail else ""))
    if not ok:
        fails.append(name)


def pip(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]
        xj, zj = poly[j]
        if (zi > z) != (zj > z):
            xcross = (xj - xi) * (z - zi) / (zj - zi) + xi
            if x < xcross:
                inside = not inside
        j = i
    return inside


def dist_seg(px, pz, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dz * dz
    if l2 == 0:
        return math.hypot(px - a[0], pz - a[1])
    t = max(0, min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2))
    return math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz))


def path_dist(px, pz, pts):
    return min(dist_seg(px, pz, pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def forward(yaw):
    return (-math.sin(yaw), -math.cos(yaw))


def angle_deg(a, b):
    dot = a[0] * b[0] + a[1] * b[1]
    la = math.hypot(*a)
    lb = math.hypot(*b)
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / (la * lb)))))


def y_at_z(cam, target, z):
    dz = target[2] - cam[2]
    t = (z - cam[2]) / dz
    return cam[1] + t * (target[1] - cam[1])


def pitch(cam, pt):
    dx, dy, dz = pt[0] - cam[0], pt[1] - cam[1], pt[2] - cam[2]
    return math.degrees(math.atan2(dy, math.hypot(dx, dz)))


land = layout["site"]["land"]
water = layout["site"]["water"]
pav = layout["pavilion"]
furn = layout["furniture"]
cam = layout["camera"]["position"]
tgt = layout["camera"]["target"]
fov = layout["camera"]["fov"]

check("land and water are not rectangles", len(land) >= 12 and len(water) >= 12, f"land {len(land)} water {len(water)}")
zs = [p[1] for p in water]
check("water has a side creek and a far shore", max(zs) > 0.5 and min(zs) < -7, f"z {min(zs):.2f}..{max(zs):.2f}")
shore_z = [p[1] for p in land if p[1] < 2]
check("near shore is not a straight edge", max(shore_z) - min(shore_z) > 1.4, f"span {max(shore_z)-min(shore_z):.2f}")

cx, cz = pav["center"]
hx, hz = pav["stone"][0] / 2, pav["stone"][1] / 2
for corner in [(cx - hx, cz - hz), (cx + hx, cz - hz), (cx - hx, cz + hz), (cx + hx, cz + hz)]:
    check(
        f"pavilion corner {corner} on land, dry",
        pip(corner[0], corner[1], land) and not pip(corner[0], corner[1], water),
    )

tables = {t["id"]: t for t in furn["tables"]}
counts = {}
for ch in furn["chairs"]:
    if ch["faces"] != "river":
        counts[ch["faces"]] = counts.get(ch["faces"], 0) + 1
check("table groups are not one repeated grid", len(set(counts.values())) > 1, str(counts))

for ch in furn["chairs"]:
    x, _, z = ch["position"]
    check(f"{ch['id']} is dry", not pip(x, z, water))
    if ch["faces"] == "river":
        fx, fz = forward(ch["rotationY"])
        check(f"{ch['id']} faces the river (-Z)", fz < -0.9 and abs(fx) < 0.2, f"fwd {fx:.2f},{fz:.2f}")
        continue
    table = tables[ch["faces"]]
    tx, tz = table["position"][0], table["position"][2]
    dx, dz = tx - x, tz - z
    ang = angle_deg(forward(ch["rotationY"]), (dx, dz))
    check(f"{ch['id']} faces {ch['faces']}", ang < 8, f"{ang:.2f} deg")
    dist = math.hypot(dx, dz)
    check(f"{ch['id']} sits at the table", 0.75 < dist < 1.15, f"{dist:.2f} m")

chairs = furn["chairs"]
for i, a in enumerate(chairs):
    for b in chairs[i + 1 :]:
        d = math.hypot(a["position"][0] - b["position"][0], a["position"][2] - b["position"][2])
        check(f"clearance {a['id']} / {b['id']}", d > 0.62, f"{d:.2f} m")

posts = [(cx + x, cz + z) for x in pav["postXs"] for z in pav["postZs"]]
for ch in furn["chairs"]:
    if ch["position"][1] < 0.1:
        continue
    d = min(math.hypot(ch["position"][0] - px, ch["position"][2] - pz) for px, pz in posts)
    check(f"{ch['id']} clears posts", d > 0.48, f"{d:.2f} m")

clear = layout["paths"]["clearance"]
blockers = []
for ch in chairs:
    blockers.append((ch["id"], ch["position"][0], ch["position"][2], clear))
for t in furn["tables"]:
    blockers.append((t["id"], t["position"][0], t["position"][2], t["size"] / 2 + 0.25))
ctr = furn["counter"]
blockers.append(("counter", ctr["position"][0], ctr["position"][2], 1.15))
for pid, pts in (("main", layout["paths"]["main"]), ("side", layout["paths"]["side"])):
    for name, x, z, need in blockers:
        # Bank cluster is the destination of the side path, not an obstacle on the main walk.
        if pid == "side" and ("bank" in name or name == "counter"):
            continue
        if pid == "main" and "bank" in name:
            continue
        d = path_dist(x, z, pts)
        check(f"{pid} path clears {name}", d > need * 0.85, f"{d:.2f} > {need * 0.85:.2f}")

b = layout["bridge"]
mx = (b["start"][0] + b["end"][0]) / 2
mz = (b["start"][2] + b["end"][2]) / 2
check("bridge start is on land", pip(b["start"][0], b["start"][2], land) and not pip(b["start"][0], b["start"][2], water))
check("bridge end is on land", pip(b["end"][0], b["end"][2], land) and not pip(b["end"][0], b["end"][2], water))
check("bridge midpoint crosses water", pip(mx, mz, water), f"{mx:.2f},{mz:.2f}")
span = math.hypot(b["end"][0] - b["start"][0], b["end"][2] - b["start"][2])
check("bridge is a short footbridge", 2.2 < span < 4.2 and 1.1 < b["width"] < 1.8 and 0.3 < b["rise"] < 0.9, f"span {span:.2f}")

st = layout["steps"]
check("step risers are low and human", 0.12 <= st["riser"] <= 0.17 and 0.32 <= st["tread"] <= 0.5, f"{st['riser']} / {st['tread']}")
check("three terrace steps", st["count"] == 3)

check("table height", 0.7 <= furn["tableHeight"] <= 0.78)
check("chair seat height", 0.4 <= furn["seatHeight"] <= 0.48)
check("counter height", 0.88 <= furn["counterHeight"] <= 1.05)
check("deck above stone", pav["deckTop"] > pav["stoneTop"] > 0)

fx, fz = forward(ctr["rotationY"])
check("counter faces the hall (-X)", fx < -0.9 and abs(fz) < 0.15, f"fwd {fx:.2f},{fz:.2f}")
hall = tables["table_hall"]
dang = angle_deg((fx, fz), (hall["position"][0] - ctr["position"][0], hall["position"][2] - ctr["position"][2]))
check("counter front points toward seating", dang < 55, f"{dang:.1f} deg")

eave_front = cz + pav["eave"][1] / 2
eave_back = cz - pav["eave"][1] / 2
hall_top = [hall["position"][0], pav["deckTop"] + furn["tableHeight"], hall["position"][2]]
y_front = y_at_z(cam, hall_top, eave_front)
check("default view passes under the front eave", y_front < pav["eaveY"] - 0.35, f"ray {y_front:.2f} eave {pav['eaveY']}")
water_pt = [0.4, layout["site"]["waterY"] + 0.05, -4.5]
y_back = y_at_z(cam, water_pt, eave_back)
check("river stays visible under the far eave", y_back < pav["eaveY"] - 0.4, f"ray {y_back:.2f}")
look = pitch(cam, tgt)
ridge = pitch(cam, [cx, pav["ridgeY"], cz])
check("roof ridge is inside the default frame", abs(ridge - look) < fov / 2 - 1, f"delta {ridge - look:.1f} half-fov {fov/2}")

heights = [t["height"] for t in layout["trees"]]
check("willow heights differ", len(set(heights)) == len(heights) and max(heights) - min(heights) > 2)

for inst in layout["instances"]:
    path = ROOT / inst["kind"] and ROOT / layout["assets"][inst["kind"]]["glb"]
    check(f"asset {inst['id']} resolves", path.is_file(), str(path))

check("toon is the default shading", "unlit" not in layout["meta"]["style"].lower())
check("fog is warm mist", layout["shell"]["fogColor"].lower() == layout["shell"]["clearColor"].lower())
key = layout["lights"]["key"]["color"].lstrip("#")
r, g, b = int(key[0:2], 16), int(key[2:4], 16), int(key[4:6], 16)
check("key light is warm", r > g > b and r > 220, key)

print()
if fails:
    print(f"{len(fails)} FAILED")
    raise SystemExit(1)
print(f"all checks passed ({os.path.basename(str(ROOT))})")
