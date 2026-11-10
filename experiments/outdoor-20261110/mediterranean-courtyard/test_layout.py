#!/usr/bin/env python3
"""Layout checks for the open-sky Mediterranean courtyard.

Chair convention matches the cafe kit: rotationY 0 faces +Z.
Forward in the ground plane is (sin(rotationY), cos(rotationY)).
"""

import json
import math
import sys
from pathlib import Path

LAYOUT = json.loads((Path(__file__).with_name("layout.json")).read_text())
SITE = LAYOUT["site"]
FAILS = []


def check(ok, msg):
    if not ok:
        FAILS.append(msg)
        print("FAIL", msg)
    else:
        print("ok  ", msg)


def forward(rot):
    return math.sin(rot), math.cos(rot)


def angle_deg(a, b):
    na = math.hypot(*a)
    nb = math.hypot(*b)
    if na < 1e-6 or nb < 1e-6:
        return 180.0
    dot = max(-1.0, min(1.0, (a[0] * b[0] + a[1] * b[1]) / (na * nb)))
    return math.degrees(math.acos(dot))


def main():
    meta = LAYOUT["meta"]
    check(meta.get("openSky") is True, "meta.openSky")
    check(meta.get("ceiling") is False, "meta.ceiling is false")
    check(SITE["walkY"] > 0.12, "arcade walk is a step above the court")

    inst = {i["id"]: i for i in LAYOUT["instances"]}
    tables = {i: inst[i] for i in inst if i.startswith("table_")}
    chairs = [i for i in inst.values() if i["kind"] == "simple_chair"]
    pots = [i for i in inst.values() if i["kind"] == "flowerpot"]
    check(len(tables) == 3, f"three cafe tables (got {len(tables)})")
    check(len(chairs) >= 6, f"at least six chairs (got {len(chairs)})")
    check(len(pots) >= 5, f"at least five terracotta pots (got {len(pots)})")
    check(len(LAYOUT.get("urns") or []) >= 2, "large urns on the fountain coping")

    for chair in chairs:
        table = inst[chair["faces"]]
        dx = table["position"][0] - chair["position"][0]
        dz = table["position"][2] - chair["position"][2]
        dist = math.hypot(dx, dz)
        ang = angle_deg(forward(chair["rotationY"]), (dx, dz))
        check(0.65 <= dist <= 1.05, f"{chair['id']} distance {dist:.2f} m to {chair['faces']}")
        check(ang <= 28, f"{chair['id']} faces its table ({ang:.1f}°)")
        check(abs(chair["position"][1] - table["position"][1]) < 0.02, f"{chair['id']} shares the table's floor")

    cup_y = {
        "cup_south_a": "table_south",
        "cup_south_b": "table_south",
        "cup_west": "table_west",
        "cup_olive_a": "table_olive",
        "cup_olive_b": "table_olive",
    }
    for cid, tid in cup_y.items():
        cup = inst[cid]
        table = inst[tid]
        dx = cup["position"][0] - table["position"][0]
        dz = cup["position"][2] - table["position"][2]
        check(math.hypot(dx, dz) < 0.34, f"{cid} sits on {tid}")
        check(abs(cup["position"][1] - (table["position"][1] + 0.74)) < 0.03, f"{cid} is on the tabletop")

    walk = SITE["walkY"]
    check(abs(inst["table_south"]["position"][1] - walk) < 1e-6, "south table is on the arcade walk")
    check(abs(inst["table_west"]["position"][1] - walk) < 1e-6, "west table is on the arcade walk")
    check(inst["table_olive"]["position"][1] == 0, "olive table is on the court")

    south = SITE["south"]
    west = SITE["west"]
    ts = inst["table_south"]["position"]
    tw = inst["table_west"]["position"]
    check(south["wallZ"] < ts[2] < south["pierZ"], "south table is inside the south gallery")
    check(west["wallX"] < tw[0] < west["pierX"], "west table is inside the west gallery")

    f = SITE["fountain"]
    olive = SITE["olive"]
    check(olive["x"] > f["x"] + 1.5, "olive stands east of the fountain")
    ot = inst["table_olive"]["position"]
    shade = math.hypot(ot[0] - olive["x"], ot[2] - olive["z"])
    check(shade < 1.7, f"olive table is under the canopy ({shade:.2f} m)")

    bench = SITE["bench"]
    check(bench["faces"] == "-x", "bench faces west, toward the fountain")
    check(bench["x"] > f["x"] + 2, "bench is on the east side")
    check(bench["seatY"] < 0.55, "bench seat is a sitting height")

    ent = SITE["entrance"]
    check(ent["x1"] - ent["x0"] >= 1.6, "entrance path is wide enough to walk")

    def blocked(x, z):
        if abs(x - f["x"]) < f["w"] / 2 + 0.35 and abs(z - f["z"]) < f["d"] / 2 + 0.35:
            return "fountain"
        for table in tables.values():
            if math.hypot(x - table["position"][0], z - table["position"][2]) < 1.05:
                return table["id"]
        return None

    x0, z0 = (ent["x0"] + ent["x1"]) / 2, ent["z"] - 0.3
    x1, z1 = f["x"] + 0.15, f["z"] + f["d"] / 2 + 0.85
    hits = []
    for i in range(9):
        t = i / 8
        hit = blocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)
        if hit:
            hits.append(hit)
    check(not hits, f"clear walk from the entrance to the fountain (blocked by {hits})")

    for item in list(inst.values()) + [
        {"id": u["id"], "position": u["position"]} for u in LAYOUT["urns"]
    ]:
        x, _, z = item["position"]
        # Inner water, inside the stone wall. Pots may sit on the coping.
        inside = abs(x - f["x"]) < f["w"] / 2 - 0.28 and abs(z - f["z"]) < f["d"] / 2 - 0.28
        check(not inside, f"{item['id']} is not standing in the water")

    rays = LAYOUT["auditRays"]
    check(any(r["expect"] == "open" for r in rays), "audit includes open-sky rays")
    check(any(r["expect"] == "covered" for r in rays), "audit includes arcade shade rays")
    check(len(south["xs"]) >= 4 and len(west["zs"]) >= 4, "both arcades have at least three bays")

    if FAILS:
        print(f"\n{len(FAILS)} failed")
        return 1
    print(f"\n{len(LAYOUT['instances'])} instances, layout checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
