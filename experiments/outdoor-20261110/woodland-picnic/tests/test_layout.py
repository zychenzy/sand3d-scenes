#!/usr/bin/env python3
"""Layout and orientation checks for the woodland picnic grove.

Run from the repo root:
  python3 experiments/outdoor-20261110/woodland-picnic/tests/test_layout.py
"""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "layout.json").read_text())
SITE = LAYOUT["site"]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def angle_diff(a, b):
    d = (a - b + math.pi) % (2 * math.pi) - math.pi
    return abs(d)


def point_seg(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dz * dz or 1e-8
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
    return math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t))


def path_dist(p):
    best = 1e9
    lines = [SITE["path"], *SITE["spurs"]]
    for line in lines:
        for i in range(len(line) - 1):
            best = min(best, point_seg(p, line[i], line[i + 1]))
    return best


def stream_x_at(z):
    line = SITE["stream"]
    for i in range(len(line) - 1):
      a, b = line[i], line[i + 1]
      if (a[1] <= z <= b[1]) or (b[1] <= z <= a[1]):
        t = (z - a[1]) / (b[1] - a[1] or 1e-8)
        return a[0] + t * (b[0] - a[0])
    raise AssertionError(f"z {z} outside stream")


def stream_dist(p):
    best = 1e9
    line = SITE["stream"]
    for i in range(len(line) - 1):
        best = min(best, point_seg(p, line[i], line[i + 1]))
    return best


def segments_cross(a, b, c, d):
    def cross(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    d1, d2 = cross(a, b, c), cross(a, b, d)
    d3, d4 = cross(c, d, a), cross(c, d, b)
    return d1 * d2 < 0 and d3 * d4 < 0


def local_plus_z(yaw):
    """Three.js rotation.y maps local +Z to (sin yaw, cos yaw) in (x, z)."""
    return (math.sin(yaw), math.cos(yaw))


def main():
    checks = []

    def check(name, ok, detail):
        checks.append((name, ok, detail))
        print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

    tables = SITE["tables"]
    check("three tables", len(tables) == 3, f"{len(tables)} tables")
    ids = [t["id"] for t in tables]
    check("table ids", ids == ["table_near", "table_mid", "table_far"], ",".join(ids))

    pts = [t["position"] for t in tables]
    pair = [dist(pts[i], pts[j]) for i in range(3) for j in range(i + 1, 3)]
    check(
        "staggered spacing",
        all(3.4 <= d <= 9.2 for d in pair),
        "distances " + ", ".join(f"{d:.2f}m" for d in pair),
    )
    area = abs(
        (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1])
        - (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0])
    ) / 2
    check("not a straight row", area > 2.0, f"triangle area {area:.2f} m^2")

    yaws = [t["rotationY"] for t in tables]
    yaw_gaps = [angle_diff(yaws[i], yaws[j]) for i in range(3) for j in range(i + 1, 3)]
    check(
        "yaw not a grid",
        all(g > 0.25 for g in yaw_gaps),
        "yaw gaps " + ", ".join(f"{g:.2f}" for g in yaw_gaps),
    )

    for t in tables:
        seat_ok = (
            t["benches"] == "both-long-sides"
            and 0.72 <= t["topHeight"] <= 0.80
            and 0.40 <= t["seatHeight"] < t["topHeight"]
            and t["seatZ"] > t["topHalfWidth"]
            and 1.6 <= t["length"] <= 2.05
        )
        check(
            f"{t['id']} benches face the top",
            seat_ok,
            f"seats at ±{t['seatZ']}m, top half-width {t['topHalfWidth']}m, top {t['topHeight']}m",
        )
        sd = stream_dist(t["position"])
        check(f"{t['id']} clear of creek", sd > 2.3, f"{sd:.2f}m from centerline")
        pd = path_dist(t["position"])
        check(f"{t['id']} path beside it", 1.05 < pd < 2.4, f"path {pd:.2f}m from center")

    grill = SITE["grill"]["position"]
    prep = SITE["prep"]["position"]
    g_to_tables = [dist(grill, t["position"]) for t in tables]
    check(
        "grill stands off the tables",
        min(g_to_tables) >= 2.4 and min(g_to_tables) <= 5.5,
        "nearest " + f"{min(g_to_tables):.2f}m",
    )
    p_to_tables = [dist(prep, t["position"]) for t in tables]
    gp = dist(grill, prep)
    check(
        "prep is the grill's counter",
        0.9 <= gp <= 1.8 and min(p_to_tables) >= 2.2,
        f"grill-prep {gp:.2f}m, nearest table {min(p_to_tables):.2f}m",
    )
    fwd = local_plus_z(SITE["grill"]["rotationY"])
    toward = (prep[0] - grill[0], prep[1] - grill[1])
    tlen = math.hypot(*toward) or 1
    dot = (fwd[0] * toward[0] + fwd[1] * toward[1]) / tlen
    check("grill opens toward the prep counter", dot > 0.7, f"forward dot {dot:.2f}")

    bridge = SITE["bridge"]
    crossed = any(
        segments_cross(bridge["a"], bridge["b"], SITE["stream"][i], SITE["stream"][i + 1])
        for i in range(len(SITE["stream"]) - 1)
    )
    blen = dist(bridge["a"], bridge["b"])
    check("bridge crosses the creek", crossed and 4.2 <= blen <= 6.5, f"span {blen:.2f}m, crosses={crossed}")
    check("bridge is a footbridge", 0.85 <= bridge["width"] <= 1.3 and bridge["railHeight"] >= 0.8,
          f"width {bridge['width']}m rail {bridge['railHeight']}m")

    sign = SITE["sign"]["position"]
    check("sign at the path split", dist(sign, SITE["junction"]) < 2.2,
          f"{dist(sign, SITE['junction']):.2f}m from junction")
    check("sign has two boards", len(SITE["sign"]["boards"]) == 2, " / ".join(SITE["sign"]["boards"]))

    seats = [log for log in SITE["logs"] if log["role"] == "seat"]
    check("two log seats", len(seats) == 2, f"{len(seats)} seat logs")
    creek = next(log for log in seats if log["faces"] == "stream")
    sx = stream_x_at(creek["position"][1])
    check(
        "creek log on the east bank",
        creek["position"][0] > sx + 1.1 and stream_dist(creek["position"]) < 2.4,
        f"log x {creek['position'][0]:.2f}, stream x {sx:.2f}, dist {stream_dist(creek['position']):.2f}m",
    )
    far = next(t for t in tables if t["id"] == "table_far")
    log_far = next(log for log in seats if log["faces"] == "table_far")
    ld = dist(log_far["position"], far["position"])
    check(
        "far log faces the far table",
        1.4 <= ld <= 2.4 and angle_diff(log_far["rotationY"], far["rotationY"]) < 0.2,
        f"{ld:.2f}m away, yaw delta {angle_diff(log_far['rotationY'], far['rotationY']):.2f}",
    )

    for item in SITE["topItems"]:
        lx, lz = item["local"]
        on_top = abs(lx) < 0.7 and abs(lz) < 0.28 and item["table"] in ids
        check(f"{item['id']} sits on a tabletop", on_top, f"local ({lx:.2f}, {lz:.2f}) on {item['table']}")

    for tree in SITE["trees"]:
        p = [tree["x"], tree["z"]]
        td = min(dist(p, t["position"]) for t in tables)
        sd = stream_dist(p)
        pd = path_dist(p)
        need_table = 1.35 + tree["r"]
        ok = td >= need_table and sd >= 1.7 and pd >= 0.85
        check(
            f"tree {tree['id']} clears furniture, water, path",
            ok,
            f"table {td:.2f}m (need {need_table:.2f}), creek {sd:.2f}m, path {pd:.2f}m",
        )

    check("single shadow-casting sun", LAYOUT["lights"]["key"]["castShadow"] is True
          and LAYOUT["lights"]["fill"]["castShadow"] is False
          and "points" not in LAYOUT["lights"],
          "key casts, fill does not, no point lights")

    cam = LAYOUT["camera"]
    close = LAYOUT["cameraPresets"]["close"]
    corner = LAYOUT["cameraPresets"]["corner"]
    check("default camera is an overview", cam["position"][1] > 6 and 40 <= cam["fov"] <= 55,
          f"y {cam['position'][1]} fov {cam['fov']}")
    check("close camera is near eye height", close["position"][1] < 2.2, f"y {close['position'][1]}")
    check("corner camera is on the far bank", corner["position"][0] < -4, f"x {corner['position'][0]}")

    failed = [c for c in checks if not c[1]]
    print(f"\n{len(checks) - len(failed)} passed, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
