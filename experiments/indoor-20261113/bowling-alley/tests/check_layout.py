#!/usr/bin/env python3
"""Footprint, facing, and proportion checks. No browser."""

import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from geometry import build  # noqa: E402

LAYOUT_PATH = ROOT / "layout.json"


def load_glb(path):
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise SystemExit(f"{path} is not a GLB")
    off = 12
    chunks = []
    while off < len(data):
        clen, ctype = struct.unpack_from("<II", data, off)
        off += 8
        chunks.append((ctype, data[off:off + clen]))
        off += clen
    return json.loads(chunks[0][1]), chunks[1][1]


def read_positions(js, blob, accessor_index):
    acc = js["accessors"][accessor_index]
    view = js["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride", 12)
    out = []
    for i in range(acc["count"]):
        out.append(struct.unpack_from("<fff", blob, start + i * stride))
    return out


def qrot(q, v):
    x, y, z, w = q
    tx = 2 * (y * v[2] - z * v[1])
    ty = 2 * (z * v[0] - x * v[2])
    tz = 2 * (x * v[1] - y * v[0])
    return (
        v[0] + w * tx + (y * tz - z * ty),
        v[1] + w * ty + (z * tx - x * tz),
        v[2] + w * tz + (x * ty - y * tx),
    )


def mesh_bounds(path):
    js, blob = load_glb(path)
    nodes = js["nodes"]
    parent = {i: None for i in range(len(nodes))}
    for i, node in enumerate(nodes):
        for child in node.get("children") or []:
            parent[child] = i

    def chain(index):
        out = []
        while index is not None:
            out.append(index)
            index = parent[index]
        return out

    def xform(ch, p):
        for index in ch:
            node = nodes[index]
            t = node.get("translation", [0, 0, 0])
            r = node.get("rotation", [0, 0, 0, 1])
            s = node.get("scale", [1, 1, 1])
            p = (p[0] * s[0], p[1] * s[1], p[2] * s[2])
            p = qrot(r, p)
            p = (p[0] + t[0], p[1] + t[1], p[2] + t[2])
        return p

    centroids = {}
    bounds = []
    for index, node in enumerate(nodes):
        if "mesh" not in node:
            continue
        pts = []
        for prim in js["meshes"][node["mesh"]]["primitives"]:
            pts.extend(read_positions(js, blob, prim["attributes"]["POSITION"]))
        pts = [xform(chain(index), p) for p in pts]
        centroids[node.get("name") or f"mesh{index}"] = (
            sum(p[0] for p in pts) / len(pts),
            sum(p[1] for p in pts) / len(pts),
            sum(p[2] for p in pts) / len(pts),
        )
        # top of this mesh
        centroids[node.get("name") or f"mesh{index}"] = (
            centroids[node.get("name") or f"mesh{index}"][0],
            max(p[1] for p in pts),
            centroids[node.get("name") or f"mesh{index}"][2],
        )
        named = node.get("name") or f"mesh{index}"
        centroids[named + ":top"] = max(p[1] for p in pts)
        centroids[named + ":cz"] = sum(p[2] for p in pts) / len(pts)
        bounds.extend(pts)
    mins = [min(p[i] for p in bounds) for i in range(3)]
    maxs = [max(p[i] for p in bounds) for i in range(3)]
    return centroids, mins, maxs


def aabb(cx, cz, w, d, yaw=0.0):
    hw, hd = w / 2, d / 2
    c, s = math.cos(yaw), math.sin(yaw)
    xs, zs = [], []
    for x in (-hw, hw):
        for z in (-hd, hd):
            xs.append(cx + x * c + z * s)
            zs.append(cz - x * s + z * c)
    return min(xs), max(xs), min(zs), max(zs)


def hits(a, b, pad=0.0):
    return not (a[1] < b[0] + pad or b[1] < a[0] + pad or a[3] < b[2] + pad or b[3] < a[2] + pad)


def footprint(kind, assets, cache):
    if kind not in cache:
        spec = assets[kind]
        _, mins, maxs = mesh_bounds(ROOT / spec["glb"])
        sy = maxs[1] - mins[1]
        scale = spec["targetHeight"] / sy
        cache[kind] = ((maxs[0] - mins[0]) * scale, (maxs[2] - mins[2]) * scale, sy * scale)
    return cache[kind]


def main():
    errors = []
    layout = json.loads(LAYOUT_PATH.read_text())
    fresh = json.loads(json.dumps(build()))
    if layout["lanes"] != fresh["lanes"] or layout["instances"] != fresh["instances"] or layout["blocks"] != fresh["blocks"]:
        errors.append("layout.json drifted from tests/geometry.py — regenerate")

    room = layout["meta"]["room"]
    half_w, half_d = room["width"] / 2, room["depth"] / 2
    plan = layout["plan"]

    seat_info, seat_min, seat_max = mesh_bounds(ROOT / layout["assets"]["lane_seat"]["glb"])
    if seat_info.get("back_surface:cz", -1) <= seat_info.get("cushion:cz", 1):
        errors.append("lane seat backrest is not on +Z of the cushion; rotationY 0 would face the wrong way")
    cushion_top = seat_info.get("cushion:top")
    table_info, _, _ = mesh_bounds(ROOT / layout["assets"]["drink_table"]["glb"])
    table_top = table_info.get("top:top")
    seat_scale = layout["assets"]["lane_seat"]["targetHeight"] / (seat_max[1] - seat_min[1])
    table_h = layout["assets"]["drink_table"]["targetHeight"]
    # native file is already in metres and targetHeight matches it
    if not (0.42 <= cushion_top * seat_scale <= 0.50):
        errors.append(f"cushion top {cushion_top * seat_scale:.3f} is outside 0.42–0.50 m")
    if not (0.48 <= table_top <= 0.58):
        errors.append(f"table top {table_top:.3f} is outside 0.48–0.58 m")
    if table_top <= cushion_top * seat_scale:
        errors.append("drink table is not taller than the seat cushion")
    if table_top - cushion_top * seat_scale > 0.16:
        errors.append("drink table is too tall beside the seat")

    counters = {b["id"]: b for b in layout["blocks"] if b["kind"] == "counter"}
    for need in ("shoe_counter", "snack_counter"):
        if need not in counters:
            errors.append(f"missing {need}")
    for block in counters.values():
        if block["facing"] != "+x" or abs(block["yaw"]) > 0.01:
            errors.append(f"{block['id']} should face +X")
        if not (1.02 <= block["h"] <= 1.12):
            errors.append(f"{block['id']} height {block['h']}")
    stool_h = layout["assets"]["bar_stool"]["targetHeight"]
    if not (0.22 <= counters["shoe_counter"]["h"] - stool_h <= 0.42):
        errors.append("stool-to-counter relationship is off")

    kinds = {b["kind"] for b in layout["blocks"]}
    for need in ("counter", "cubby", "rack", "tray", "console", "masking", "hood", "sign"):
        if need not in kinds:
            errors.append(f"missing block kind {need}")
    if len(layout["lanes"]) != 4:
        errors.append("expected 4 lanes")
    if {lane["number"] for lane in layout["lanes"]} != {7, 8, 9, 10}:
        errors.append("lane numbers drifted")

    for console in (b for b in layout["blocks"] if b["kind"] == "console"):
        if console["facing"] != "+z" or abs(console["yaw"]) > 0.01:
            errors.append(f"{console['id']} screen should face the bowler (+Z)")
        if console["z"] <= plan["foulZ"]:
            errors.append(f"{console['id']} is on the pin side of the foul line")
        if console.get("y", 0) < 0.9:
            errors.append(f"{console['id']} is too low to read")

    rack = next(b for b in layout["blocks"] if b["kind"] == "rack")
    if rack["facing"] != "+x":
        errors.append("ball rack should open toward +X")

    concourse = next(z for z in layout["clear"] if z["id"] == "concourse")
    aisle = next(z for z in layout["clear"] if z["id"] == "left_aisle")
    if concourse["max"][1] - concourse["min"][1] < 2.4:
        errors.append("concourse is shorter than 2.4 m")
    if aisle["max"][0] - aisle["min"][0] < 1.2:
        errors.append("left aisle is narrower than 1.2 m")
    if plan["approachEndZ"] - plan["foulZ"] < 3.0:
        errors.append("approach is shorter than 3 m")

    seat_depth = (seat_max[2] - seat_min[2]) * seat_scale
    for inst in layout["instances"]:
        if inst["kind"] != "lane_seat":
            continue
        if abs(inst["rotationY"]) > 0.15:
            errors.append(f"{inst['id']} rotationY {inst['rotationY']} does not face the pins")
        front = inst["position"][2] - seat_depth / 2
        if front - plan["approachEndZ"] < 0.75:
            errors.append(f"{inst['id']} crowds the approach ({front - plan['approachEndZ']:.2f} m)")
        if inst["position"][2] <= plan["headZ"]:
            errors.append(f"{inst['id']} is not behind the pins")

    snack = counters["snack_counter"]
    snack_front = snack["x"] + snack["w"] / 2
    for inst in layout["instances"]:
        if inst["kind"] != "bar_stool":
            continue
        if abs(inst["rotationY"] + math.pi / 2) > 0.05:
            errors.append(f"{inst['id']} should yaw -pi/2 toward the counter")
        if inst["position"][0] <= snack_front:
            errors.append(f"{inst['id']} is not on the customer side of the snack counter")

    cache = {}
    floor = []
    for block in layout["blocks"]:
        if block.get("elevated"):
            continue
        box = aabb(block["x"], block["z"], block["w"], block["d"], block.get("yaw") or 0)
        floor.append((block["id"], box))
        if box[0] < -half_w + 0.02 or box[1] > half_w - 0.02 or box[2] < -half_d + 0.02 or box[3] > half_d - 0.02:
            errors.append(f"{block['id']} leaves the room")

    for inst in layout["instances"]:
        if inst.get("elevated") or inst.get("rest") or inst["kind"] == "bowling_pin":
            continue
        w, d, _ = footprint(inst["kind"], layout["assets"], cache)
        box = aabb(inst["position"][0], inst["position"][2], w, d, inst.get("rotationY") or 0)
        floor.append((inst["id"], box))
        if box[0] < -half_w + 0.02 or box[1] > half_w - 0.02 or box[2] < -half_d + 0.02 or box[3] > half_d - 0.02:
            errors.append(f"{inst['id']} leaves the room")

    for i, (name, box) in enumerate(floor):
        for other, obox in floor[i + 1:]:
            if hits(box, obox, pad=0.02):
                errors.append(f"overlap {name} x {other}")
        for zone in layout["clear"]:
            zx0, zz0 = zone["min"]
            zx1, zz1 = zone["max"]
            if hits(box, (zx0, zx1, zz0, zz1), pad=0.02):
                errors.append(f"{name} blocks {zone['id']}")

    by_id = {b["id"]: b for b in layout["blocks"]}
    pins_by_lane = {}
    for inst in layout["instances"]:
        if inst["kind"] == "bowling_pin":
            pins_by_lane.setdefault(inst["lane"], []).append(inst)
        if inst.get("rest"):
            parent = by_id.get(inst["rest"])
            if parent is None:
                continue
            px, pz = inst["position"][0], inst["position"][2]
            if abs(px - parent["x"]) > parent["w"] / 2 + 0.08 or abs(pz - parent["z"]) > parent["d"] / 2 + 0.08:
                errors.append(f"{inst['id']} is not on {inst['rest']}")
            if inst["kind"] == "house_ball" and inst["rest"] == "ball_rack" and px < parent["x"] - parent["w"] / 2:
                errors.append(f"{inst['id']} sits behind the rack")

    for lane in layout["lanes"]:
        pins = pins_by_lane.get(lane["number"], [])
        if len(pins) != 10:
            errors.append(f"lane {lane['number']} has {len(pins)} pins")
            continue
        head = max(pins, key=lambda p: p["position"][2])
        if abs(head["position"][2] - plan["headZ"]) > 0.02:
            errors.append(f"lane {lane['number']} head pin is not on the head spot")
        if head["position"][2] <= min(p["position"][2] for p in pins):
            errors.append("head pin is not the closest pin to the bowler")
        for pin in pins:
            if abs(pin["position"][0] - lane["x"]) > lane["w"] / 2 - 0.04:
                errors.append(f"{pin['id']} leaves the lane bed")
            if not (lane["pitZ"] < pin["position"][2] < lane["foulZ"]):
                errors.append(f"{pin['id']} is off the lane length")

    for name in ("corner", "close"):
        if name not in layout["cameraPresets"]:
            errors.append(f"missing camera {name}")

    vendor = ROOT / "vendor" / "three.module.js"
    orbit = ROOT / "vendor" / "controls" / "OrbitControls.js"
    if not vendor.is_file() or not orbit.is_file():
        errors.append("vendored three.js or OrbitControls is missing")
    for kind, spec in layout["assets"].items():
        path = ROOT / spec["glb"]
        if not path.is_file():
            errors.append(f"missing glb {spec['glb']}")
        if kind in ("bar_stool", "cash_register", "pos_terminal", "cup_mug", "pendant_lamp", "flowerpot"):
            if not path.is_symlink() or "cafe/assets" not in path.readlink().as_posix():
                errors.append(f"{spec['glb']} should symlink into cafe/assets")
        if kind in ("bowling_pin", "house_ball", "lane_seat", "drink_table") and path.is_symlink():
            errors.append(f"{spec['glb']} should be a baked file in this folder")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"ok — {len(layout['lanes'])} lanes, {len(layout['blocks'])} blocks, {len(layout['instances'])} instances")
    return 0


if __name__ == "__main__":
    sys.exit(main())
