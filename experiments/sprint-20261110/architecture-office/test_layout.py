#!/usr/bin/env python3
"""Layout checks for the architecture studio. No browser required."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def fail(msg):
    print("FAIL:", msg)
    return 1


def main():
    errors = 0
    with open(os.path.join(ROOT, "layout.json"), encoding="utf-8") as f:
        layout = json.load(f)
    room = layout["meta"]["room"]
    W, D, H = room["width"], room["depth"], room["height"]
    build = layout["build"]

    for kind, spec in layout["assets"].items():
        path = os.path.join(ROOT, spec["glb"])
        if not os.path.isfile(path):
            errors += fail(f"missing asset {kind}: {spec['glb']}")
        if spec["targetHeight"] <= 0 or spec["targetHeight"] > 3:
            errors += fail(f"bad targetHeight for {kind}")

    ids = [i["id"] for i in layout["instances"]]
    if len(ids) != len(set(ids)):
        errors += fail("duplicate instance ids")
    required = [
        "ref_desk", "chair_digital", "mon_digital", "chair_senior", "chair_junior",
        "crit_table", "chair_crit_s", "chair_crit_w", "chair_crit_e", "bench_pinup",
        "easel_trace", "binder_case", "plinth_model", "stool_model_s", "sample_rack",
        "lamp_senior", "lamp_model", "pend_model",
    ]
    for rid in required:
        if rid not in ids:
            errors += fail(f"missing instance {rid}")

    for inst in layout["instances"]:
        x, y, z = inst["position"]
        if y < -0.01 or y > H:
            errors += fail(f"{inst['id']} y {y} outside room")
        if abs(x) > W / 2 - 0.05 or abs(z) > D / 2 - 0.05:
            errors += fail(f"{inst['id']} ({x:.2f},{z:.2f}) outside floor")

    for face in layout["acceptance"]["facing"]:
        inst = next(i for i in layout["instances"] if i["id"] == face["id"])
        if abs(inst["rotationY"] - face["rotationY"]) > 0.02:
            errors += fail(f"{face['id']} rotation {inst['rotationY']} != {face['rotationY']}")

    # Dining-chair local +Z is the facing direction. Drafting chairs sit on the
    # low (+Z) side of their boards and turn 180° so they face the pin-up.
    for cid, desk_z in (("chair_senior", -0.3), ("chair_junior", 1.55), ("chair_digital", 3.12)):
        chair = next(i for i in layout["instances"] if i["id"] == cid)
        if chair["position"][2] <= desk_z:
            errors += fail(f"{cid} should sit on the +Z side of its desk")
        if abs(chair["rotationY"] - 3.1416) > 0.02:
            errors += fail(f"{cid} should face -Z")

    crit = next(i for i in layout["instances"] if i["id"] == "crit_table")
    cx, cz = crit["position"][0], crit["position"][2]
    seats = {
        "chair_crit_s": (0, 1, 3.1416),
        "chair_crit_w": (-1, 0, 1.5708),
        "chair_crit_e": (1, 0, -1.5708),
    }
    for sid, (sx, sz, rot) in seats.items():
        chair = next(i for i in layout["instances"] if i["id"] == sid)
        dx = chair["position"][0] - cx
        dz = chair["position"][2] - cz
        if sx and dx * sx < 0.3:
            errors += fail(f"{sid} not on the correct side of the crit table")
        if sz and dz * sz < 0.3:
            errors += fail(f"{sid} not on the correct side of the crit table")
        if abs(chair["rotationY"] - rot) > 0.02:
            errors += fail(f"{sid} facing {chair['rotationY']}")

    for spec in build["drafting"]:
        if spec["backH"] <= spec["frontH"]:
            errors += fail(f"{spec['id']} board does not slope up toward the pin-up")
        if spec["frontH"] < 0.7 or spec["backH"] > 1.2:
            errors += fail(f"{spec['id']} drafting height out of range")
        if abs(spec["x"]) + spec["w"] / 2 > W / 2 - 0.2:
            errors += fail(f"{spec['id']} drafting table hits a side")
        if abs(spec["z"]) + spec["d"] / 2 > D / 2 - 0.2:
            errors += fail(f"{spec['id']} drafting table hits an end")

    table = build["modelTable"]
    if not 0.9 <= table["h"] <= 1.05:
        errors += fail("model table should be standing height")
    if table["w"] < 1.8 or table["d"] < 1.0:
        errors += fail("model table too small to read as a making bench")

    ceil = build["ceiling"]
    holes = build["skylights"]
    if len(holes) < 3:
        errors += fail("expected pin-up, drafting, and model skylights")
    for h in holes:
        if h["x0"] < ceil["x0"] or h["x1"] > ceil["x1"] or h["z0"] < ceil["z0"] or h["z1"] > ceil["z1"]:
            errors += fail(f"skylight {h['id']} is outside the ceiling")
        if h["x1"] - h["x0"] < 1.2 or h["z1"] - h["z0"] < 1.0:
            errors += fail(f"skylight {h['id']} is too small to read")
    for i, a in enumerate(holes):
        for b in holes[i + 1:]:
            ox = min(a["x1"], b["x1"]) - max(a["x0"], b["x0"])
            oz = min(a["z1"], b["z1"]) - max(a["z0"], b["z0"])
            if ox > 0 and oz > 0:
                errors += fail(f"skylights {a['id']} and {b['id']} overlap")

    bays = build["materialBays"]
    if len(bays) < 5:
        errors += fail("material library needs distinct bays")
    if len({b["id"] for b in bays}) < 5:
        errors += fail("material bays are not distinct")
    run = build["shelfRun"]["z0"] + sum(b["w"] for b in bays)
    if run > D / 2 - 0.4:
        errors += fail("material shelves run into the open front")

    # Keep the two work zones from occupying the same floor.
    def box(x, z, hw, hd):
        return (x - hw, x + hw, z - hd, z + hd)

    zones = [
        ("senior", box(-2.55, -0.3, 0.85, 0.5)),
        ("junior", box(-3.7, 1.55, 0.74, 0.45)),
        ("model", box(table["x"], table["z"], table["w"] / 2, table["d"] / 2)),
        ("flat", box(build["flatFile"]["x"], build["flatFile"]["z"], build["flatFile"]["w"] / 2, build["flatFile"]["d"] / 2)),
        ("crit", box(crit["position"][0], crit["position"][2], 0.52, 0.51)),
        ("desk", box(-1.15, 3.12, 0.65, 0.22)),
    ]
    for i, (na, a) in enumerate(zones):
        for nb, b in zones[i + 1:]:
            ox = min(a[1], b[1]) - max(a[0], b[0])
            oz = min(a[3], b[3]) - max(a[2], b[2])
            if ox > 0.05 and oz > 0.05:
                errors += fail(f"{na} overlaps {nb} by {ox:.2f} x {oz:.2f}")

    vendor = os.path.join(ROOT, "vendor", "three.module.js")
    if not os.path.isfile(vendor):
        errors += fail("vendored three.js symlink is broken")

    if errors:
        print(f"{errors} layout check(s) failed")
        return 1
    print("layout ok —", len(layout["instances"]), "instances,", len(holes), "skylights,", len(bays), "material bays")
    return 0


if __name__ == "__main__":
    sys.exit(main())
