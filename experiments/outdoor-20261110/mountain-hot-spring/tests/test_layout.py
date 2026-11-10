#!/usr/bin/env python3
"""Layout and orientation checks for the mountain hot spring. Units are metres."""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
FAILS = []


def check(name, ok, detail=""):
    if ok:
        print(f"PASS  {name}" + (f" — {detail}" if detail else ""))
    else:
        FAILS.append(name)
        print(f"FAIL  {name}" + (f" — {detail}" if detail else ""))


def area(poly):
    a = 0.0
    for i, p in enumerate(poly):
        q = poly[(i + 1) % len(poly)]
        a += p[0] * q[1] - q[0] * p[1]
    return a / 2


def centroid(poly):
    a = cx = cz = 0.0
    for i, p in enumerate(poly):
        q = poly[(i + 1) % len(poly)]
        c = p[0] * q[1] - q[0] * p[1]
        a += c
        cx += (p[0] + q[0]) * c
        cz += (p[1] + q[1]) * c
    a *= 0.5
    return cx / (6 * a), cz / (6 * a)


def point_in(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]
        xj, zj = poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            inside = not inside
        j = i
    return inside


def dist_to(x, z, poly):
    best = 1e9
    for i, a in enumerate(poly):
        b = poly[(i + 1) % len(poly)]
        dx, dz = b[0] - a[0], b[1] - a[1]
        l2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2))
        best = min(best, math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)))
    return best


def edge_crosses(poly):
    out = []
    for i, a in enumerate(poly):
        b = poly[(i + 1) % len(poly)]
        c = poly[(i + 2) % len(poly)]
        out.append((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
    return out


def hex_rgb(value):
    v = value.lstrip("#")
    return int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)


def main():
    pool = LAYOUT["pool"]["polygon"]
    a = area(pool)
    crosses = edge_crosses(pool)
    check("pool has an irregular outline", len(pool) >= 8 and a > 12 and a < 22, f"area {a:.2f} m², {len(pool)} verts")
    check("pool is convex", all(c > 0 for c in crosses) or all(c < 0 for c in crosses))
    axis = 0
    for i, p in enumerate(pool):
        q = pool[(i + 1) % len(pool)]
        if abs(q[0] - p[0]) < 1e-6 or abs(q[1] - p[1]) < 1e-6:
            axis += 1
    check("pool is not a rectangle", axis == 0 and len(pool) > 4, f"axis-aligned edges {axis}")

    lip = LAYOUT["pool"]["lipY"]
    water = LAYOUT["pool"]["waterY"]
    floor = LAYOUT["pool"]["floorY"]
    seat = LAYOUT["pool"]["seatY"]
    check("water sits below the stone lip", water <= lip - 0.18, f"lip {lip} water {water}")
    depth = water - floor
    check("pool is deep enough to soak", 0.75 <= depth <= 1.15, f"depth {depth:.2f}")
    soak = water - seat
    check("seat is chest-deep", 0.38 <= soak <= 0.52, f"water over seat {soak:.2f}")
    check("seat is above the floor", seat > floor + 0.25)

    pts = LAYOUT["drainage"]["points"]
    drops = []
    for a_pt, b_pt in zip(pts, pts[1:]):
        run = math.hypot(b_pt[0] - a_pt[0], b_pt[2] - a_pt[2])
        drop = a_pt[1] - b_pt[1]
        drops.append(drop / max(run, 1e-6))
    check("overflow falls the whole way", all(b[1] < a[1] - 0.02 for a, b in zip(pts, pts[1:])), f"slopes {[round(s, 3) for s in drops]}")
    check("swale slope is walkable", all(0.02 <= s <= 0.12 for s in drops[:-1]), f"body {drops[:-1]}")
    check("end spills as a cascade", drops[-1] > 0.3, f"last {drops[-1]:.2f}")
    check("overflow starts at the rim", dist_to(pts[0][0], pts[0][2], pool) < 0.25, f"dist {dist_to(pts[0][0], pts[0][2], pool):.3f}")
    check("overflow leaves the terrace", pts[-1][1] <= -0.8, f"end y {pts[-1][1]}")

    cx, cz = centroid(pool)
    bridge = LAYOUT["bridge"]
    nearest = min(pts, key=lambda p: (p[0] - bridge["x"]) ** 2 + (p[2] - bridge["z"]) ** 2)
    clearance = bridge["deckY"] - (nearest[1] + 0.03)
    check("bridge spans the overflow", 0.25 <= clearance <= 0.8, f"clearance {clearance:.2f}")
    check("bridge is wide enough to walk", bridge["width"] >= 0.9 and bridge["length"] >= 1.2)

    shelter = LAYOUT["shelter"]
    scx = shelter["x"] + shelter["w"] / 2
    scz = shelter["z"] + shelter["d"] / 2
    dx, dz = cx - scx, cz - scz
    norm = math.hypot(dx, dz)
    opening = shelter["opening"]
    dot = (opening[0] * dx + opening[1] * dz) / norm
    check("shelter opens toward the pool", dot > 0.75, f"dot {dot:.2f}")
    bfx, bfz = shelter["benchFacing"]
    check("changing bench faces the opening", bfx * opening[0] + bfz * opening[1] > 0.9)
    sfx, sfz = shelter["stoolFacing"]
    check("wash stool faces the basin wall", sfx * 0 + sfz * -1 > 0.9)
    clear = shelter["eave"] - shelter["floor"]
    check("shelter headroom is human", 1.9 <= clear <= 2.25, f"clear {clear:.2f}")
    check("shelter opening is wide enough", shelter["openingWidth"] >= 0.9)
    check("shelter does not sit in the pool", shelter["x"] + shelter["w"] < min(p[0] for p in pool) - 0.6)

    steps = LAYOUT["steps"]
    check("steps use a human riser and tread", 0.14 <= steps["riser"] <= 0.18 and steps["tread"] >= 0.3 and steps["width"] >= 0.9 and steps["count"] >= 3)
    check("handrail is at hand height", 0.85 <= steps["railHeight"] <= 1.05 and 0.85 <= bridge["railHeight"] <= 1.05)
    deck = LAYOUT["deck"]
    check("dry deck is on the near side of the pool", deck["z0"] > cz)
    gap_deck_bridge = (bridge["z"] - bridge["length"] / 2) - deck["z1"]
    check("deck meets the bridge", gap_deck_bridge < 0.35, f"gap {gap_deck_bridge:.2f}")
    gap_bridge_steps = steps["zTop"] - (bridge["z"] + bridge["length"] / 2)
    check("steps follow the bridge", 0 <= gap_bridge_steps < 0.4, f"gap {gap_bridge_steps:.2f}")

    cam = LAYOUT["camera"]
    corner = LAYOUT["cameraPresets"]["corner"]
    close = LAYOUT["cameraPresets"]["close"]
    check("default camera looks toward the mountains", cam["position"][2] > cam["target"][2] + 3 and cam["position"][1] > cam["target"][1] + 2)
    check(
        "corner camera comes in past the shelter opening",
        corner["position"][0] < 1 and corner["position"][2] > shelter["z"] + shelter["d"] + 3,
    )
    ctx, ctz = close["target"][0], close["target"][2]
    check("close camera looks into the water", point_in(ctx, ctz, pool) and not point_in(close["position"][0], close["position"][2], pool))
    check("close camera looks down into the basin", close["position"][1] > close["target"][1] + 0.8)

    def spread(rows, index):
        vals = [r[index] for r in rows]
        return max(vals) - min(vals)

    bamboo = LAYOUT["bamboo"]
    check("bamboo is a grove, not one height", len(bamboo) >= 12 and spread(bamboo, 2) >= 2.2, f"n {len(bamboo)} spread {spread(bamboo, 2):.1f}")
    nn = []
    for i, b in enumerate(bamboo):
        best = min(math.hypot(b[0] - c[0], b[1] - c[1]) for j, c in enumerate(bamboo) if i != j)
        nn.append(best)
    mean = sum(nn) / len(nn)
    var = sum((d - mean) ** 2 for d in nn) / len(nn)
    check("bamboo is not planted on a grid", math.sqrt(var) / mean > 0.12, f"spacing cv {math.sqrt(var) / mean:.2f}")
    shelter_box = (shelter["x"], shelter["x"] + shelter["w"], shelter["z"], shelter["z"] + shelter["d"])
    inside_hut = [
        b for b in bamboo
        if shelter_box[0] < b[0] < shelter_box[1] and shelter_box[2] < b[1] < shelter_box[3]
    ]
    check("bamboo does not grow through the shelter", not inside_hut, str(inside_hut))

    reeds = LAYOUT["reeds"]
    check("reeds vary and flank the water", len(reeds) >= 4 and spread(reeds, 2) >= 0.5)
    for r in reeds:
        check(f"reed clump ({r[0]}, {r[1]}) stays out of the pool", not point_in(r[0], r[1], pool) and dist_to(r[0], r[1], pool) > 0.4)

    pines = LAYOUT["pines"]
    check("pines are different sizes", len(pines) >= 4 and spread(pines, 2) >= 0.6)

    for s in LAYOUT["stones"]:
        check(f"stepping stone {s} is outside the pool", (not point_in(s[0], s[1], pool)) and dist_to(s[0], s[1], pool) > 0.25)

    for w in LAYOUT["steam"]:
        check(f"steam at ({w['x']}, {w['z']}) rises off the pool", point_in(w["x"], w["z"], pool) and w["opacity"] <= 0.2 and w["h"] <= 1.6)

    k_from, k_to = LAYOUT["kakehi"]["from"], LAYOUT["kakehi"]["to"]
    check("kakehi runs downhill into the pool", k_from[1] > k_to[1] > water and (not point_in(k_from[0], k_from[2], pool)) and point_in(k_to[0], k_to[2], pool))

    for rock in LAYOUT["anchors"]:
        inside = point_in(rock["x"], rock["z"], pool)
        if inside:
            check(f"{rock['id']} rests on the pool floor", abs(rock["baseY"] - floor) < 0.04, f"base {rock['baseY']}")
            top = rock["baseY"] + rock["sy"]
            check(f"{rock['id']} is a boulder not a pillar", rock["sy"] < 1.3 and top < lip + 0.25)
        else:
            check(f"{rock['id']} sits on grade", rock["baseY"] >= -0.7, f"base {rock['baseY']}")

    r, g, b = hex_rgb(LAYOUT["pool"]["waterDeep"])
    check("water is mineral, not pool-blue", b < 140 and abs(b - g) < 50 and r < 80, f"rgb {r, g, b}")

    for lan in LAYOUT["lanterns"]:
        ly = lan.get("lightY", lan["y"])
        lr, lg, lb = hex_rgb(lan["color"])
        check(f"lantern {lan['id']} is a warm human-height light", 0.6 <= ly <= 2.15 and lr > lg > lb and lr > 180, f"y {ly} rgb {(lr, lg, lb)}")

    for m in LAYOUT["mountains"]:
        check(f"mountain at z {m['z']} is behind the pool", m["z"] < min(p[1] for p in pool) - 4)

    stool = LAYOUT["viewStool"]
    check(
        "view stool sits on the deck and faces the mountain",
        deck["x0"] < stool["x"] < deck["x1"] and deck["z0"] < stool["z"] < deck["z1"] and stool["facing"][1] < -0.5 and abs(stool["x"] - bridge["x"]) > 0.5,
    )
    check("bucket is a human pail on the rim", 0.2 <= LAYOUT["bucket"]["height"] <= 0.4 and dist_to(LAYOUT["bucket"]["x"], LAYOUT["bucket"]["z"], pool) < 0.45)

    if FAILS:
        print(f"\n{len(FAILS)} failed")
        return 1
    print(f"\nall checks passed ({LAYOUT['meta']['title']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
