"""Authoritative layout for the seaside promenade.

Generates layout.json and checks orientation, clearance, curvature, and scale.
Distances are metres. +Z is landward, -Z is seaward, Y is up, water surface is y=0.
"""

from __future__ import annotations

import json
import math
import os
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent

PROM_Y = 1.58
PARAPET_H = 0.50
PARAPET_T = 0.46
WALK_EDGE = 4.72
BENCH_D = 1.14
PATH_D = 2.42
PATH_HALF = 0.98
STEP_START_D = PATH_D - PATH_HALF  # seaward edge of the clear through-route

CONTROL = [
    (-16.2, -6.55),
    (-13.2, -4.35),
    (-9.6, -2.25),
    (-6.0, -0.55),
    (-2.4, 0.78),
    (1.4, 1.42),
    (5.4, 0.92),
    (9.2, -0.22),
    (12.8, -1.72),
    (16.3, -3.55),
]


def catmull(points, n_per_seg):
    p = [(float(x), float(z)) for x, z in points]
    padded = [p[0]] + p + [p[-1]]
    out = []
    segs = len(p) - 1
    for i in range(segs):
        p0, p1, p2, p3 = padded[i], padded[i + 1], padded[i + 2], padded[i + 3]
        steps = n_per_seg if i < segs - 1 else n_per_seg + 1
        for s in range(steps):
            t = s / n_per_seg
            t2 = t * t
            t3 = t2 * t

            def ax(a, b, c, d):
                return 0.5 * (
                    (2 * b)
                    + (-a + c) * t
                    + (2 * a - 5 * b + 4 * c - d) * t2
                    + (-a + 3 * b - 3 * c + d) * t3
                )

            out.append((ax(p0[0], p1[0], p2[0], p3[0]), ax(p0[1], p1[1], p2[1], p3[1])))
    return out


def _lerp(a, b, t):
    return a + (b - a) * t


def beach_width(x):
    # Narrow rocky hook on the left, wide sand in the bay and under the deck.
    bay = 3.55 * math.exp(-((x - 1.3) / 6.2) ** 2)
    deck = 2.15 * math.exp(-((x - 9.0) / 4.6) ** 2)
    return 2.15 + bay + deck


def toe_y(x):
    # Built-up sand in the bay; the rocky left hook sits lower, so more wall shows.
    return 0.16 + 0.34 * math.exp(-((x - 1.3) / 7.2) ** 2)


def beach_y(dist_from_toe, toe, shore_dist):
    shore_y = 0.055
    deep_y = -1.15
    deep_dist = 10.5
    if shore_dist <= 0.2:
        shore_dist = 0.2
    if dist_from_toe <= shore_dist:
        t = max(0.0, dist_from_toe / shore_dist)
        return toe + (shore_y - toe) * (t ** 0.85)
    extra = dist_from_toe - shore_dist
    t = min(extra / deep_dist, 1.0)
    return shore_y + (deep_y - shore_y) * (t ** 1.1)


def dune_height(x, z, d_land, mounds):
    """KEEP IN SYNC with duneHeight() in promenade.js."""
    if d_land is not None and d_land <= WALK_EDGE:
        return PROM_Y - 0.16
    base = 0.40 + 0.10 * math.sin(x * 0.31 + 1.2) + 0.06 * math.cos(z * 0.27 + 0.4)
    extra = 0.0
    for m in mounds:
        dx = (x - m["x"]) / m["rx"]
        dz = (z - m["z"]) / m["rz"]
        r2 = dx * dx + dz * dz
        if r2 < 1.0:
            extra += m["h"] * ((1.0 - r2) ** 2)
    h = base + extra
    if d_land is not None and d_land < WALK_EDGE + 1.7:
        t = (d_land - WALK_EDGE) / 1.7
        t = t * t * (3.0 - 2.0 * t)
        h = (PROM_Y - 0.02) * (1.0 - t) + h * t
    return h


def build_wall():
    raw = catmull(CONTROL, 8)
    samples = []
    for i, (x, z) in enumerate(raw):
        if i == 0:
            tx, tz = raw[1][0] - x, raw[1][1] - z
        elif i == len(raw) - 1:
            tx, tz = x - raw[i - 1][0], z - raw[i - 1][1]
        else:
            tx, tz = raw[i + 1][0] - raw[i - 1][0], raw[i + 1][1] - raw[i - 1][1]
        length = math.hypot(tx, tz) or 1.0
        tx, tz = tx / length, tz / length
        n1, n2 = (-tz, tx), (tz, -tx)
        nx, nz = n1 if n1[1] <= n2[1] else n2
        bw = beach_width(x)
        ty = toe_y(x)
        samples.append(
            {
                "x": round(x, 4),
                "z": round(z, 4),
                "nx": round(nx, 5),
                "nz": round(nz, 5),
                "tx": round(tx, 5),
                "tz": round(tz, 5),
                "beachW": round(bw, 4),
                "toeY": round(ty, 4),
                "shoreX": round(x + nx * bw, 4),
                "shoreZ": round(z + nz * bw, 4),
            }
        )
    return samples


def frame_at(wall, x):
    if x <= wall[0]["x"]:
        return wall[0]
    if x >= wall[-1]["x"]:
        return wall[-1]
    for i in range(len(wall) - 1):
        a, b = wall[i], wall[i + 1]
        if a["x"] <= x <= b["x"]:
            span = b["x"] - a["x"] or 1.0
            t = (x - a["x"]) / span
            out = {}
            for k in ("x", "z", "nx", "nz", "tx", "tz", "beachW", "toeY", "shoreX", "shoreZ"):
                out[k] = _lerp(a[k], b[k], t)
            # renormalise
            nl = math.hypot(out["nx"], out["nz"]) or 1.0
            tl = math.hypot(out["tx"], out["tz"]) or 1.0
            out["nx"] /= nl
            out["nz"] /= nl
            out["tx"] /= tl
            out["tz"] /= tl
            return out
    return wall[-1]


def along(fr, d_land, y=None):
    """Point at a signed landward distance from the outer face. Negative d is seaward."""
    x = fr["x"] - fr["nx"] * d_land
    z = fr["z"] - fr["nz"] * d_land
    if y is None:
        return (x, z)
    return (x, y, z)


def beach_y_at(fr, d_land):
    # d_land negative on the beach. Distance from the toe (outer face) is -d_land.
    dist = max(0.0, -d_land)
    return beach_y(dist, fr["toeY"], fr["beachW"])


def yaw_face_seaward(nx, nz):
    """rotation.y so a bench's local +X points seaward."""
    return math.atan2(-nz, nx)


def yaw_kiosk(nx, nz):
    """rotation.y so local -Z (the counter) points seaward."""
    return math.atan2(-nx, -nz)


def dist_point_to_segment(px, pz, ax, az, bx, bz):
    vx, vz = bx - ax, bz - az
    l2 = vx * vx + vz * vz
    if l2 < 1e-8:
        return math.hypot(px - ax, pz - az)
    t = max(0.0, min(1.0, ((px - ax) * vx + (pz - az) * vz) / l2))
    return math.hypot(px - (ax + t * vx), pz - (az + t * vz))


def dist_to_poly(px, pz, poly):
    best = 1e9
    for i in range(len(poly) - 1):
        best = min(best, dist_point_to_segment(px, pz, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]))
    return best


def obb_clear(px, pz, cx, cz, yaw, half_l, half_w):
    """Distance from point to an oriented box. yaw rotates local +X by the bench formula.

    Local +X → (cos yaw, -sin yaw), local +Z → (sin yaw, cos yaw).
    half_l is along local Z (bench length), half_w along local X (seat depth).
    """
    dx, dz = px - cx, pz - cz
    lx = dx * math.cos(yaw) + dz * (-math.sin(yaw))
    lz = dx * math.sin(yaw) + dz * math.cos(yaw)
    ox = max(abs(lx) - half_w, 0.0)
    oz = max(abs(lz) - half_l, 0.0)
    return math.hypot(ox, oz)


MOUNDS = [
    {"id": "dune_left", "x": -12.4, "z": 2.6, "rx": 4.4, "rz": 2.6, "h": 1.05},
    {"id": "dune_left_fore", "x": -6.8, "z": 8.4, "rx": 3.6, "rz": 2.5, "h": 0.62},
    {"id": "dune_right", "x": 13.6, "z": 4.4, "rx": 3.8, "rz": 2.7, "h": 0.78},
    {"id": "dune_fore", "x": 11.2, "z": 10.2, "rx": 3.4, "rz": 2.4, "h": 0.85},
    {"id": "dune_pocket", "x": -1.5, "z": 9.6, "rx": 2.8, "rz": 2.0, "h": 0.38},
]


def build():
    wall = build_wall()
    # Innermost bay sample — steps sit where the walk turns parallel to X.
    bay = max(wall, key=lambda s: s["z"])
    step_x = bay["x"]
    fr = frame_at(wall, step_x)

    # Solve a run whose last tread meets the sand.
    flights_spec = [
        {"kind": "flight", "risers": 3, "tread": 0.34},
        {"kind": "landing", "depth": 0.92},
        {"kind": "flight", "risers": 3, "tread": 0.34},
        {"kind": "landing", "depth": 1.05},
        {"kind": "flight", "risers": 2, "tread": 0.36},
    ]
    run = 0.0
    for f in flights_spec:
        run += f["tread"] * f["risers"] if f["kind"] == "flight" else f["depth"]
    end_d = STEP_START_D - run
    end_y = beach_y_at(fr, end_d)
    # Sit the last tread a couple of centimetres into the sand so it reads grounded.
    target_y = end_y + 0.02
    drop = PROM_Y - target_y
    n_risers = sum(f["risers"] for f in flights_spec if f["kind"] == "flight")
    rise = drop / n_risers
    flights = []
    for f in flights_spec:
        if f["kind"] == "flight":
            flights.append(
                {
                    "kind": "flight",
                    "risers": f["risers"],
                    "rise": round(rise, 4),
                    "tread": f["tread"],
                }
            )
        else:
            flights.append({"kind": "landing", "depth": f["depth"]})

    ox, oy, oz = along(fr, STEP_START_D, PROM_Y)
    steps = {
        "id": "tiered_steps",
        "x": round(step_x, 4),
        "width": 3.85,
        "startD": STEP_START_D,
        "run": round(run, 4),
        "endD": round(end_d, 4),
        "endY": round(target_y, 4),
        "sandY": round(end_y, 4),
        "origin": [round(ox, 4), round(oy, 4), round(oz, 4)],
        "dir": [round(fr["nx"], 5), round(fr["nz"], 5)],
        "tangent": [round(fr["tx"], 5), round(fr["tz"], 5)],
        "flights": flights,
        "gap": {
            "x0": round(step_x - 2.05, 4),
            "x1": round(step_x + 2.05, 4),
        },
    }

    # Boardwalk viewing pocket, right of the steps, over the upper beach.
    deck_x = 9.15
    dfr = frame_at(wall, deck_x)
    deck_len = 4.15  # from the inner parapet face, seaward
    deck_w = 3.15
    # Center of the deck: start at d = PARAPET_T (inner face) and extend seaward.
    center_d = PARAPET_T - deck_len / 2.0
    dcx, dcy, dcz = along(dfr, center_d, PROM_Y)
    posts = []
    for along_t, along_d in ((-1.15, -1.15), (1.15, -1.15), (-1.15, -3.15), (1.15, -3.15)):
        # local: tangent * along_t + seaward move
        px = dfr["x"] + dfr["tx"] * along_t + dfr["nx"] * (PARAPET_T - along_d) * -1.0
        # along_d is seaward distance from inner face. d_land = PARAPET_T - along_d
        d_land = PARAPET_T - along_d
        px, pz = along(dfr, d_land)[0] + dfr["tx"] * along_t, along(dfr, d_land)[1] + dfr["tz"] * along_t
        gy = beach_y_at(dfr, d_land)
        posts.append({"x": round(px, 4), "z": round(pz, 4), "groundY": round(gy, 4)})
    boardwalk = {
        "id": "viewing_pocket",
        "x": deck_x,
        "length": deck_len,
        "width": deck_w,
        "center": [round(dcx, 4), PROM_Y, round(dcz, 4)],
        "dir": [round(dfr["nx"], 5), round(dfr["nz"], 5)],
        "tangent": [round(dfr["tx"], 5), round(dfr["tz"], 5)],
        "yaw": round(math.atan2(dfr["nx"], dfr["nz"]), 5),
        "gap": {"x0": round(deck_x - deck_w / 2.0, 4), "x1": round(deck_x + deck_w / 2.0, 4)},
        "posts": posts,
    }

    def bench_at(bid, x, scale_z, d=BENCH_D):
        bfr = frame_at(wall, x)
        px, py, pz = along(bfr, d, PROM_Y)
        yaw = yaw_face_seaward(bfr["nx"], bfr["nz"])
        return {
            "id": bid,
            "kind": "museum_bench",
            "position": [round(px, 4), round(py, 4), round(pz, 4)],
            "rotationY": round(yaw, 5),
            "scale": [1, 1, scale_z],
            "seaward": [round(bfr["nx"], 5), round(bfr["nz"], 5)],
            "wallX": round(x, 4),
        }

    # Deck bench sits near the outer end of the pocket, still on the planks.
    deck_bench_d = PARAPET_T - (deck_len - 1.05)
    bfr = frame_at(wall, deck_x)
    dbx, dby, dbz = along(bfr, deck_bench_d, PROM_Y)
    deck_bench = {
        "id": "bench_pocket",
        "kind": "museum_bench",
        "position": [round(dbx, 4), PROM_Y, round(dbz, 4)],
        "rotationY": round(yaw_face_seaward(bfr["nx"], bfr["nz"]), 5),
        "scale": [1, 1, 1.15],
        "seaward": [round(bfr["nx"], 5), round(bfr["nz"], 5)],
        "wallX": deck_x,
        "on": "boardwalk",
    }

    benches = [
        bench_at("bench_west", -9.4, 1.28),
        bench_at("bench_bay", 6.35, 1.05),
        bench_at("bench_east", 13.7, 1.22),
        deck_bench,
    ]

    # Kiosk: body entirely landward of the walk edge, counter facing the sea.
    kiosk_x = -6.4
    kfr = frame_at(wall, kiosk_x)
    k_depth = 1.85
    k_width = 2.55
    k_h = 2.72
    kx, ky, kz = along(kfr, WALK_EDGE + k_depth / 2.0, PROM_Y)
    kiosk = {
        "id": "gelato",
        "position": [round(kx, 4), PROM_Y, round(kz, 4)],
        "rotationY": round(yaw_kiosk(kfr["nx"], kfr["nz"]), 5),
        "size": [k_width, k_h, k_depth],
        "seaward": [round(kfr["nx"], 5), round(kfr["nz"], 5)],
        "counter": "local-negZ",
        "wallX": kiosk_x,
    }

    # Flowerpots on the landward corners of the kiosk pad.
    pots = []
    yaw = kiosk["rotationY"]
    lx = math.cos(yaw)
    lz = -math.sin(yaw)
    for sign, name in ((-1, "west"), (1, "east")):
        # local +X runs along the kiosk front; landward is opposite seaward.
        px = kx - kfr["nx"] * (k_depth / 2.0 + 0.28) + lx * sign * (k_width / 2.0 + 0.05)
        pz = kz - kfr["nz"] * (k_depth / 2.0 + 0.28) + lz * sign * (k_width / 2.0 + 0.05)
        pots.append(
            {
                "id": f"pot_{name}",
                "kind": "flowerpot",
                "position": [round(px, 4), PROM_Y, round(pz, 4)],
                "rotationY": round(0.4 * sign, 3),
                "plant": "tuft" if sign < 0 else "bloom",
            }
        )

    # Entrance path joins the through-route near x=5.5.
    join = frame_at(wall, 5.6)
    jx, jz = along(join, PATH_D)
    path = [
        [2.15, 11.35],
        [3.55, 8.85],
        [4.7, 7.15],
        [round(jx, 4), round(jz, 4)],
    ]
    # Through-route centerline along the prom.
    through = []
    x = wall[0]["x"]
    while x <= wall[-1]["x"]:
        sfr = frame_at(wall, x)
        px, pz = along(sfr, PATH_D)
        through.append([round(px, 4), round(pz, 4)])
        x += 0.85

    # Bike stand beside the entrance, landward of the walk, clear of the path.
    bike_x = 8.4
    bike_fr = frame_at(wall, bike_x)
    # Push landward of the edge and a little east of the path join.
    bx, by, bz = along(bike_fr, WALK_EDGE + 1.15, PROM_Y)
    bikes = {
        "id": "bike_stand",
        "position": [round(bx, 4), PROM_Y, round(bz, 4)],
        "rotationY": round(math.atan2(-bike_fr["tz"], bike_fr["tx"]), 5),
        "seaward": [round(bike_fr["nx"], 5), round(bike_fr["nz"], 5)],
        "footprint": [1.7, 0.7],
    }

    bin_fr = frame_at(wall, 4.2)
    bin_x, bin_y, bin_z = along(bin_fr, WALK_EDGE + 0.55, PROM_Y)
    lamp_a = frame_at(wall, 4.9)
    lamp_b = frame_at(wall, 11.4)
    lamps = []
    for lid, lfr, extra in (
        ("lamp_join", lamp_a, 0.35),
        ("lamp_east", lamp_b, 0.42),
    ):
        lx, ly, lz = along(lfr, WALK_EDGE + extra, PROM_Y)
        lamps.append(
            {
                "id": lid,
                "position": [round(lx, 4), PROM_Y, round(lz, 4)],
                "rotationY": round(yaw_face_seaward(lfr["nx"], lfr["nz"]), 5),
            }
        )
    bin_obj = {
        "id": "bin_join",
        "position": [round(bin_x, 4), PROM_Y, round(bin_z, 4)],
        "rotationY": 0.2,
    }

    grasses = place_grasses(wall, steps, boardwalk, path, through)
    rocks = place_rocks(wall, steps)
    sails = [
        {"id": "sail_west", "x": -7.2, "z": -15.6, "scale": 1.05, "yaw": 0.55, "y": 0.0},
        {"id": "sail_mid", "x": 2.4, "z": -17.4, "scale": 0.72, "yaw": -0.85, "y": 0.0},
        {"id": "sail_east", "x": 12.6, "z": -14.8, "scale": 0.46, "yaw": 1.35, "y": 0.0},
    ]
    foam = place_foam(wall)
    ripples = [
        {"x": -4.0, "z": -9.5, "rx": 2.4, "rz": 0.55, "rot": 0.4},
        {"x": 1.2, "z": -8.2, "rx": 1.8, "rz": 0.4, "rot": -0.2},
        {"x": 6.5, "z": -10.4, "rx": 2.8, "rz": 0.5, "rot": 0.15},
        {"x": 11.0, "z": -8.8, "rx": 1.6, "rz": 0.38, "rot": 0.7},
        {"x": -10.5, "z": -11.2, "rx": 2.1, "rz": 0.42, "rot": -0.5},
        {"x": -1.5, "z": -13.0, "rx": 3.2, "rz": 0.48, "rot": 0.05},
        {"x": 8.2, "z": -14.2, "rx": 2.2, "rz": 0.36, "rot": 0.3},
    ]

    instances = []
    for b in benches:
        instances.append(
            {
                "id": b["id"],
                "kind": "museum_bench",
                "position": b["position"],
                "rotationY": b["rotationY"],
                "scale": b["scale"],
                "seaward": b["seaward"],
            }
        )
    for p in pots:
        instances.append(
            {
                "id": p["id"],
                "kind": "flowerpot",
                "position": p["position"],
                "rotationY": p["rotationY"],
                "plant": p["plant"],
            }
        )

    data = {
        "meta": {
            "title": "Seaside promenade",
            "units": "metres",
            "style": "Toon hard",
            "place": "small coastal promenade — curving seawall, tiered steps, viewing pocket",
            "notes": [
                "Water is seaward (-Z). The walk follows a bay: the middle is inland, the left end hooks toward the sea.",
                "Benches are backless catalog seats. Local +X faces the water so the long axis runs along the wall.",
                "The gelato counter is local -Z and faces the promenade / ocean.",
            ],
        },
        "dimensions": {
            "promenadeY": PROM_Y,
            "parapetH": PARAPET_H,
            "parapetT": PARAPET_T,
            "walkEdge": WALK_EDGE,
            "benchD": BENCH_D,
            "pathD": PATH_D,
            "pathHalf": PATH_HALF,
            "stepStartD": STEP_START_D,
            "waterY": 0.03,
        },
        "wall": wall,
        "steps": steps,
        "boardwalk": boardwalk,
        "kiosk": kiosk,
        "bikes": bikes,
        "benches": benches,
        "grasses": grasses,
        "rocks": rocks,
        "sails": sails,
        "foam": foam,
        "ripples": ripples,
        "mounds": MOUNDS,
        "path": path,
        "through": through,
        "lamps": lamps,
        "bin": bin_obj,
        "pots": pots,
        "assets": {
            "museum_bench": {
                "glb": "assets/museum_bench__0025f9484fc6.glb",
                "targetHeight": 0.46,
                "credit": "Bench by RookeyJerry, Sandflow/sand3d-objaverse, CC-BY-4.0",
            },
            "flowerpot": {
                "glb": "assets/flowerpot__4a270f247734.glb",
                "targetHeight": 0.30,
                "credit": "Flowerpot from the cafe kit, Sandflow/sand3d-objaverse, CC-BY-4.0",
            },
        },
        "instances": instances,
        "shell": {
            "clearColor": "#c3e0f4",
            "fogColor": "#d7eef8",
            "fogNear": 30,
            "fogFar": 78,
        },
        "camera": {
            "fov": 50,
            "position": [11.2, 9.4, 16.6],
            "target": [0.6, 0.7, -1.8],
        },
        "cameraPresets": {
            "corner": {
                "position": [-15.2, 6.4, -10.2],
                "target": [1.6, 1.15, 0.4],
            },
            "close": {
                "position": [4.4, 1.9, -3.2],
                "target": [1.15, 0.9, 1.4],
            },
        },
        "lights": {
            "hemi": {"sky": 13953535, "ground": 14933412, "intensity": 0.62},
            "key": {
                "color": 16774880,
                "intensity": 1.12,
                "position": [1.5, 16.0, -10.0],
                "target": [0.0, 1.0, 1.5],
                "shadow": {
                    "left": -22,
                    "right": 22,
                    "top": 22,
                    "bottom": -22,
                    "near": 2,
                    "far": 55,
                    "bias": -0.0006,
                    "normalBias": 0.035,
                    "mapSize": 2048,
                },
            },
            "fill": {"color": 14018806, "intensity": 0.38, "position": [-8.0, 7.5, -7.0]},
        },
        "acceptance": {
            "shots": ["toon default", "toon corner", "toon close", "unlit"],
            "must_read": [
                "Curving stone seawall with a bay and a left hook.",
                "Tiered steps from the walk down to the sand and water.",
                "Timber viewing pocket with a bench facing the sea.",
                "Benches along the wall oriented to the ocean, off the through path.",
                "Gelato kiosk and bicycle stand on the landward side.",
                "Dune grasses, rocks, and distant sail silhouettes.",
                "Water has a curved shore, shallow colour, and a broken foam line.",
            ],
        },
    }
    return data


def side_name(side):
    return "west" if side < 0 else "east"


def place_grasses(wall, steps, boardwalk, path, through):
    # Hand anchors: (x, z, height, blades, lean, kind). kind is dune or beach.
    # Beach anchors use wall-x plus a seaward distance instead of absolute z — see below.
    dune_anchors = [
        (-15.2, 1.1, 0.95, 16, 0.42, "sage"),
        (-13.4, 3.4, 1.15, 18, 0.55, "grey"),
        (-11.0, 1.6, 0.72, 11, 0.28, "straw"),
        (-8.6, 4.6, 0.88, 14, 0.48, "deep"),
        (-7.2, 7.6, 0.55, 9, 0.22, "sage"),
        (-4.4, 7.9, 0.48, 8, 0.36, "straw"),
        (0.4, 8.8, 0.42, 10, 0.18, "grey"),
        (7.8, 7.2, 0.62, 12, 0.33, "sage"),
        (12.2, 5.6, 0.84, 15, 0.5, "deep"),
        (14.8, 3.2, 0.7, 13, 0.4, "straw"),
        (15.4, 6.4, 0.58, 9, 0.26, "grey"),
        (10.2, 10.6, 0.78, 14, 0.46, "sage"),
        (12.8, 9.4, 0.5, 8, 0.2, "straw"),
        (-2.8, 10.4, 0.36, 7, 0.15, "grey"),
        (6.4, 10.0, 0.44, 9, 0.3, "deep"),
    ]
    # Beach: (wall x, seaward metres from the outer face, height, blades, lean, kind)
    beach_anchors = [
        (-14.6, 1.15, 0.62, 12, 0.5, "straw"),
        (-12.8, 0.7, 0.48, 8, 0.35, "sage"),
        (-11.2, 1.55, 0.7, 10, 0.44, "grey"),
        (-3.6, 1.35, 0.4, 7, 0.25, "straw"),
        (4.6, 2.1, 0.55, 11, 0.38, "sage"),
        (7.2, 1.25, 0.36, 8, 0.22, "deep"),
        (11.6, 1.7, 0.58, 12, 0.48, "grey"),
        (14.2, 0.85, 0.44, 9, 0.3, "straw"),
        (10.4, 3.3, 0.33, 6, 0.18, "sage"),
    ]
    grasses = []
    gap0, gap1 = steps["gap"]["x0"], steps["gap"]["x1"]

    def blocked(x, z):
        if dist_to_poly(x, z, path) < PATH_HALF + 0.35:
            return True
        if dist_to_poly(x, z, through) < PATH_HALF + 0.15:
            return True
        return False

    for i, (x, z, h, blades, lean, kind) in enumerate(dune_anchors):
        fr = frame_at(wall, x)
        # landward distance of this absolute point
        d = (fr["x"] - x) * fr["nx"] + (fr["z"] - z) * fr["nz"]
        # wait: along() uses x = fr.x - nx * d, so d = dot(fr - point, n)? 
        # point = fr - n * d_land => d_land = dot(fr - point, n) = nx*(frx-x)+nz*(frz-z)
        d_land = fr["nx"] * (fr["x"] - x) + fr["nz"] * (fr["z"] - z)
        if d_land < WALK_EDGE + 0.35:
            continue
        if gap0 - 0.4 < x < gap1 + 0.4 and d_land < STEP_START_D + 0.4:
            continue
        if blocked(x, z):
            continue
        gy = dune_height(x, z, d_land, MOUNDS)
        grasses.append(
            {
                "id": f"grass_d{i}",
                "role": "dune",
                "position": [round(x, 3), round(gy, 3), round(z, 3)],
                "height": h,
                "blades": blades,
                "lean": lean,
                "kind": kind,
                "seed": 11 + i * 7,
            }
        )

    for i, (wx, sea, h, blades, lean, kind) in enumerate(beach_anchors):
        fr = frame_at(wall, wx)
        d_land = -sea  # seaward
        x = fr["x"] - fr["nx"] * d_land
        z = fr["z"] - fr["nz"] * d_land
        if sea < 0.35 or sea > fr["beachW"] - 0.45:
            continue
        if gap0 - 0.3 < wx < gap1 + 0.3 and sea < steps["run"]:
            # keep grasses off the stair mass
            if sea < 5.6:
                continue
        gy = beach_y_at(fr, d_land)
        grasses.append(
            {
                "id": f"grass_b{i}",
                "role": "beach",
                "position": [round(x, 3), round(gy, 3), round(z, 3)],
                "height": h,
                "blades": blades,
                "lean": lean,
                "kind": kind,
                "seed": 40 + i * 5,
            }
        )
    return grasses


def place_rocks(wall, steps):
    specs = [
        # (wall x, seaward metres, scale, bury fraction, yaw, tint)
        (-15.4, 1.6, 1.15, 0.42, 0.4, "dry"),
        (-14.2, 2.15, 0.72, 0.38, 1.2, "wet"),
        (-13.3, 1.05, 0.55, 0.35, 2.1, "dry"),
        (-12.4, 2.45, 0.9, 0.45, 0.7, "wet"),
        (-11.5, 0.85, 0.42, 0.3, 1.7, "dry"),
        (13.8, 1.9, 0.68, 0.4, 0.3, "wet"),
        (15.1, 1.15, 0.48, 0.32, 1.4, "dry"),
        (14.5, 2.5, 0.36, 0.28, 2.4, "wet"),
        (-3.8, 1.7, 0.58, 0.36, 0.9, "dry"),
    ]
    rocks = []
    for i, (wx, sea, scale, bury, yaw, tint) in enumerate(specs):
        fr = frame_at(wall, wx)
        d_land = -sea
        x = fr["x"] - fr["nx"] * d_land
        z = fr["z"] - fr["nz"] * d_land
        gy = beach_y_at(fr, d_land)
        rocks.append(
            {
                "id": f"rock_{i}",
                "position": [round(x, 3), round(gy - scale * bury, 3), round(z, 3)],
                "groundY": round(gy, 3),
                "scale": scale,
                "yaw": yaw,
                "tint": tint,
                "seed": 3 + i * 9,
                "seawardOfShore": sea > fr["beachW"],
            }
        )
    return rocks


def place_foam(wall):
    foam = []
    i = 2
    while i < len(wall) - 2:
        s = wall[i]
        span = 0.55 + ((i * 17) % 5) * 0.18
        gap = 0.35 + ((i * 13) % 4) * 0.22
        foam.append(
            {
                "x": s["shoreX"],
                "z": s["shoreZ"],
                "nx": s["nx"],
                "nz": s["nz"],
                "tx": s["tx"],
                "tz": s["tz"],
                "length": round(span, 3),
                "width": round(0.28 + ((i * 3) % 4) * 0.06, 3),
                "seed": i,
            }
        )
        # skip ahead by approximate samples
        i += 2 + (i % 3)
    return foam


def validate(data):
    errors = []
    wall = data["wall"]
    dims = data["dimensions"]
    if len(wall) < 40:
        errors.append("wall needs a dense polyline")
    xs = [s["x"] for s in wall]
    if any(b <= a for a, b in zip(xs, xs[1:])):
        errors.append("wall x is not strictly increasing")
    zs = [s["z"] for s in wall]
    if max(zs) - min(zs) < 4.0:
        errors.append("seawall curve is too flat to read as a bay")
    shores = [s["shoreZ"] for s in wall]
    if max(shores) - min(shores) < 4.0:
        errors.append("shoreline does not curve")
    # Not a straight line: residual from the end chord.
    chord = _residual(wall, "z")
    if chord < 1.2:
        errors.append(f"wall chord residual {chord:.2f} is too small")
    shore_res = _residual(
        [{"x": s["x"], "z": s["shoreZ"]} for s in wall],
        "z",
    )
    if shore_res < 1.0:
        errors.append("shoreline is too close to a straight chord")
    for a, b in zip(wall, wall[1:]):
        dot = a["nx"] * b["nx"] + a["nz"] * b["nz"]
        if dot < 0.9:
            errors.append("seaward normal flips along the wall")
            break
        if a["nz"] > -0.55:
            errors.append("a wall normal does not point generally seaward")
            break

    steps = data["steps"]
    y = dims["promenadeY"]
    rises = []
    for f in steps["flights"]:
        if f["kind"] == "flight":
            if not (0.14 <= f["rise"] <= 0.175):
                errors.append(f"riser {f['rise']} outside 140–175mm")
            if not (0.30 <= f["tread"] <= 0.42):
                errors.append(f"tread {f['tread']} is uncomfortable")
            for _ in range(f["risers"]):
                y -= f["rise"]
                rises.append(f["rise"])
        # landings stay level — the tier
    if abs(y - steps["endY"]) > 0.02:
        errors.append(f"step end {y:.3f} != recorded {steps['endY']}")
    if abs(steps["endY"] - steps["sandY"]) > 0.06:
        errors.append("lowest step does not meet the sand")
    if steps["endY"] >= dims["promenadeY"] - 0.8:
        errors.append("steps do not descend enough")
    # seaward direction
    dx, dz = steps["dir"]
    if dz > -0.75:
        errors.append("steps do not head toward the water")
    if not (steps["gap"]["x0"] < steps["x"] < steps["gap"]["x1"]):
        errors.append("step opening does not contain the stair")

    # Benches face the ocean and sit in the bench zone, clear of the stair opening.
    for b in data["benches"]:
        nx, nz = b["seaward"]
        if nz > -0.7:
            errors.append(f"{b['id']} seaward vector is not oceanward")
        yaw = b["rotationY"]
        fx, fz = math.cos(yaw), -math.sin(yaw)  # local +X
        dot = fx * nx + fz * nz
        if dot < 0.96:
            errors.append(f"{b['id']} facing dot {dot:.3f} — local +X should be seaward")
        if b.get("on") == "boardwalk":
            continue
        if steps["gap"]["x0"] - 0.15 < b["wallX"] < steps["gap"]["x1"] + 0.15:
            errors.append(f"{b['id']} sits in the step opening")
        if abs(b["position"][1] - dims["promenadeY"]) > 0.01:
            errors.append(f"{b['id']} is not on the promenade surface")

    # Kiosk counter faces seaward and the body is landward of the walk.
    k = data["kiosk"]
    nx, nz = k["seaward"]
    yaw = k["rotationY"]
    # local -Z → (-sin yaw, -cos yaw)
    cx, cz = -math.sin(yaw), -math.cos(yaw)
    if cx * nx + cz * nz < 0.96:
        errors.append("gelato counter does not face the ocean")
    kfr = frame_at(wall, k["wallX"])
    kd = kfr["nx"] * (kfr["x"] - k["position"][0]) + kfr["nz"] * (kfr["z"] - k["position"][2])
    if kd < WALK_EDGE + k["size"][2] / 2.0 - 0.05:
        errors.append("kiosk overlaps the promenade")
    if not (2.2 <= k["size"][1] <= 3.2):
        errors.append("kiosk height is not a modest hut")

    # Bikes landward of the walk edge.
    bikes = data["bikes"]
    bfr = frame_at(wall, 8.4)
    bd = bfr["nx"] * (bfr["x"] - bikes["position"][0]) + bfr["nz"] * (bfr["z"] - bikes["position"][2])
    if bd < WALK_EDGE + 0.4:
        errors.append("bicycle stand is not landward of the promenade")

    # Boardwalk projects seaward of the outer face.
    bw = data["boardwalk"]
    bdir = bw["dir"]
    if bdir[1] > -0.7:
        errors.append("boardwalk does not point toward the water")
    seaward_end_d = PARAPET_T - bw["length"]
    if seaward_end_d > -2.5:
        errors.append("viewing pocket does not project over the beach")
    for p in bw["posts"]:
        if p["groundY"] > dims["promenadeY"] - 0.4:
            errors.append("boardwalk post is not down on the beach")

    # Path clearance against benches, kiosk, bikes, rocks.
    obstacles_checked = 0
    for pt in data["through"] + data["path"]:
        px, pz = pt
        for b in data["benches"]:
            half_l = 0.78 * b["scale"][2]
            half_w = 0.24
            d = obb_clear(px, pz, b["position"][0], b["position"][2], b["rotationY"], half_l, half_w)
            if d < PATH_HALF - 0.05:
                errors.append(f"through path hits {b['id']} ({d:.2f}m)")
                break
        # kiosk box — approximate radius from center, conservative half diagonal of the footprint
        kx, kz = k["position"][0], k["position"][2]
        # oriented: local X half = width/2, local Z half = depth/2, yaw is kiosk yaw
        # For kiosk, local +Z is not the seaward axis. local -Z is seaward.
        # obb_clear assumes local +Z is length. Use a radius check with the circumradius of the hut
        # plus require the centerline distance > path half + a margin from the front.
        d_k = math.hypot(px - kx, pz - kz)
        reach = math.hypot(k["size"][0] / 2.0, k["size"][2] / 2.0)
        if d_k < reach + 0.85:
            errors.append(f"path comes within {d_k - reach:.2f}m of the kiosk body")
            break
        bx, bz = bikes["position"][0], bikes["position"][2]
        if math.hypot(px - bx, pz - bz) < 1.15:
            errors.append("path runs through the bicycle stand")
            break
        obstacles_checked += 1
    if obstacles_checked < 10:
        errors.append("clearance sweep did not cover the path")

    # Grasses varied, off the path, not identical.
    grasses = data["grasses"]
    if len(grasses) < 16:
        errors.append(f"only {len(grasses)} grass clumps")
    heights = [g["height"] for g in grasses]
    if statistics.pstdev(heights) < 0.12:
        errors.append("grass heights are too uniform")
    blades = [g["blades"] for g in grasses]
    if statistics.pstdev(blades) < 2.0:
        errors.append("grass clumps have the same silhouette")
    leans = [g["lean"] for g in grasses]
    if max(leans) - min(leans) < 0.25:
        errors.append("grass lean does not vary in the breeze")
    kinds = {g["kind"] for g in grasses}
    if len(kinds) < 3:
        errors.append("grass colours collapsed to one kind")
    # nearest neighbour distances should vary (not a grid)
    nn = []
    for i, g in enumerate(grasses):
        best = 1e9
        for j, h in enumerate(grasses):
            if i == j:
                continue
            best = min(
                best,
                math.hypot(g["position"][0] - h["position"][0], g["position"][2] - h["position"][2]),
            )
        nn.append(best)
        if dist_to_poly(g["position"][0], g["position"][2], data["path"]) < PATH_HALF:
            errors.append(f"{g['id']} blocks the entrance path")
        if dist_to_poly(g["position"][0], g["position"][2], data["through"]) < PATH_HALF:
            errors.append(f"{g['id']} blocks the promenade")
    if statistics.pstdev(nn) < 0.15:
        errors.append("grass spacing is too regular")

    rocks = data["rocks"]
    scales = [r["scale"] for r in rocks]
    if len(rocks) < 6 or statistics.pstdev(scales) < 0.15:
        errors.append("rocks are too few or too alike")
    if not any(r["position"][1] + r["scale"] * 0.5 > 0.05 and r["groundY"] < 0.12 for r in rocks):
        # at least one rock meets the waterline
        wet = [r for r in rocks if r["groundY"] < 0.2]
        if len(wet) < 2:
            errors.append("need rocks at the waterline")
    for r in rocks:
        top = r["position"][1] + r["scale"] * 0.55
        if top < r["groundY"] - 0.02:
            errors.append(f"{r['id']} is fully buried")
        if r["position"][1] > r["groundY"] + 0.05:
            errors.append(f"{r['id']} floats above the beach")

    sails = data["sails"]
    if len({round(s["scale"], 2) for s in sails}) < 3:
        errors.append("sail silhouettes should differ in size")
    for s in sails:
        # seaward of every nearby shore sample
        near = min(wall, key=lambda w: abs(w["x"] - s["x"]))
        if s["z"] > near["shoreZ"] - 3.0:
            errors.append(f"{s['id']} is not offshore")
        if s["y"] != 0:
            errors.append("sails should sit on the water")

    foam = data["foam"]
    if len(foam) < 12:
        errors.append("foam line is too sparse to read")
    # gaps: foam pieces are not a single continuous run — successive seeds skip
    if foam[-1]["seed"] - foam[0]["seed"] < len(foam) + 8:
        errors.append("foam line has no breaks")

    # Water bands implied by the shore curve plus three authored colours in the renderer.
    # The shore itself must not be an axis-aligned rectangle.
    shore_pts = [(s["shoreX"], s["shoreZ"]) for s in wall]
    if _is_rect(shore_pts):
        errors.append("shoreline is a rectangle")

    # Human scale: bench height, parapet you can see over, walk clear width.
    if not (0.42 <= data["assets"]["museum_bench"]["targetHeight"] <= 0.52):
        errors.append("bench seat height is off")
    if dims["parapetH"] > 0.7:
        errors.append("parapet blocks the view of the water")
    clear = dims["walkEdge"] - dims["parapetT"] - 0.9  # minus bench zone
    if clear < 2.2:
        errors.append(f"clear walk {clear:.2f}m is tight")

    # Camera target sits inside the site, default camera sees from the land.
    cam = data["camera"]
    if cam["position"][2] < 8 or cam["position"][1] < 5:
        errors.append("default camera should be an elevated landward overview")
    if not (-8 < cam["target"][0] < 8 and cam["target"][2] < 2):
        errors.append("default camera target misses the bay")

    return errors


def _residual(samples, zkey):
    ax, az = samples[0]["x"], samples[0][zkey]
    bx, bz = samples[-1]["x"], samples[-1][zkey]
    best = 0.0
    for s in samples:
        # distance from point to chord in the z direction, scaled
        t = 0 if bx == ax else (s["x"] - ax) / (bx - ax)
        zc = az + (bz - az) * t
        best = max(best, abs(s[zkey] - zc))
    return best


def _is_rect(pts):
    xs = [p[0] for p in pts]
    zs = [p[1] for p in pts]
    return (max(xs) - min(xs) < 0.2) or (max(zs) - min(zs) < 0.2)


def main():
    data = build()
    errors = validate(data)
    out = HERE / "layout.json"
    out.write_text(json.dumps(data, indent=2) + "\n")
    print(f"wrote {out}")
    print(
        f"wall {len(data['wall'])}  grasses {len(data['grasses'])}  "
        f"rocks {len(data['rocks'])}  foam {len(data['foam'])}  "
        f"benches {len(data['benches'])}"
    )
    print(
        f"steps endY {data['steps']['endY']} sand {data['steps']['sandY']} "
        f"rise {data['steps']['flights'][0]['rise']} run {data['steps']['run']}"
    )
    if errors:
        print(f"{len(errors)} layout errors:")
        for e in errors:
            print(" -", e)
        raise SystemExit(1)
    print("layout ok")


if __name__ == "__main__":
    main()
