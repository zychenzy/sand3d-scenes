#!/usr/bin/env python3
"""Facing and bench/seat proportion checks. Conventions are measured from the GLBs.

Chairs and the cash-register keys face local +Z.
The library-lamp shade overhangs local -Z, so a lamp at rotation pi lights the maker.
The bookcase opens on local -Z; rotation -pi/2 turns that opening toward +X.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "layout.json").read_text())
by_id = {item["id"]: item for item in layout["instances"]}
props = layout["proportions"]
anchors = layout["anchors"]


def fail(msg):
    raise AssertionError(msg)


def near(a, b, tol, msg):
    if abs((a - b + math.pi) % (2 * math.pi) - math.pi) > tol and abs(a - b) > tol:
        # compare on the circle, including the signed value the layout stores
        if abs(a - b) > tol:
            fail(f"{msg}: {a} != {b}")


EXPECT = {
    "stool_a": math.pi,
    "stool_b": math.pi,
    "chair_wait_s": 0.0,
    "chair_wait_n": math.pi,
    "lamp_a": math.pi,
    "lamp_b": math.pi,
    "register": math.pi,
    "parts_case": -math.pi / 2,
}

for item_id, rot in EXPECT.items():
    got = by_id[item_id].get("rotationY", 0.0)
    if abs(got - rot) > 0.02:
        fail(f"{item_id} rotation {got} != {rot}")

# Stools face the benches and sit in the kneehole, not in a pedestal.
for stool_id, bench in (("stool_a", anchors["benchA"]), ("stool_b", anchors["benchB"])):
    x, _, z = by_id[stool_id]["position"]
    front = bench["z"] + bench["d"] / 2
    if z <= front:
        fail(f"{stool_id} is not on the room side of the bench")
    knee0 = bench["pedL"][1]
    knee1 = bench["pedR"][0]
    half = 0.464 * (props["stoolTarget"] / 0.750) / 2
    if x - half < knee0 - 0.02 or x + half > knee1 + 0.02:
        fail(f"{stool_id} does not sit in the kneehole")

# Seat vs bench: loupe-height gap, and thighs clear the underside.
seat = props["stoolTarget"] * props["stoolSeatFraction"]
gap = props["benchTop"] - seat
thigh = props["apronUnderside"] - seat
if not 0.24 <= gap <= 0.32:
    fail(f"bench/seat gap {gap:.3f} m is outside 0.24–0.32")
if thigh < 0.18:
    fail(f"thigh clearance {thigh:.3f} m under the bench")

chair_seat = props["chairTarget"] * props["chairSeatFraction"]
table_gap = props["tableTarget"] - chair_seat
if not 0.26 <= table_gap <= 0.36:
    fail(f"waiting chair/table gap {table_gap:.3f} m")

table_z = anchors["table"]["z"]
if not (by_id["chair_wait_s"]["position"][2] < table_z < by_id["chair_wait_n"]["position"][2]):
    fail("waiting chairs do not face the table")
if abs(by_id["chair_wait_s"]["position"][0] - anchors["table"]["x"]) > 0.05:
    fail("south chair is not centered on the table")
if abs(by_id["chair_wait_n"]["position"][0] - anchors["table"]["x"]) > 0.05:
    fail("north chair is not centered on the table")

# No low dining chair parked at the standing counter.
for inst in layout["instances"]:
    if inst["kind"] != "simple_chair":
        continue
    if inst["position"][2] < 0.5:
        fail(f"{inst['id']} is a low chair in the counter zone")

stool_front = by_id["stool_a"]["position"][2] + 0.464 * (props["stoolTarget"] / 0.750) / 2
counter_back = anchors["counter"]["z"] - anchors["counter"]["d"] / 2
aisle = counter_back - stool_front
if aisle < 1.05:
    fail(f"bench aisle is {aisle:.2f} m")

if anchors["benchA"]["h"] != props["benchTop"] or anchors["benchB"]["h"] != props["benchTop"]:
    fail("bench anchor height drifted from the proportion target")

print(f"ok — facing, bench gap {gap:.2f} m, thigh {thigh:.2f} m, aisle {aisle:.2f} m")
