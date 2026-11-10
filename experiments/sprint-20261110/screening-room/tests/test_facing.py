#!/usr/bin/env python3
"""Seat fronts face the screen.

The theatre-chair GLB is measured, not assumed: cushion centroid must sit
toward -Z of the backrest after the same scale / recenter / yaw the viewer
applies. rotationY near π would aim the backrest at the screen and fail.
"""

import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLB = ROOT / "assets" / "theatre_chair__0e346addc570.glb"
LAYOUT = ROOT / "layout.json"
SCREEN_Z = -5.18


def load_glb(path):
    data = path.read_bytes()
    off = 12
    chunks = []
    while off < len(data):
        clen, ctype = struct.unpack_from("<II", data, off)
        off += 8
        chunks.append((ctype, data[off:off + clen]))
        off += clen
    js = json.loads(chunks[0][1])
    return js, chunks[1][1]


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


def mesh_centroids(js, blob):
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
        acc = []
        for prim in js["meshes"][node["mesh"]]["primitives"]:
            acc.extend(read_positions(js, blob, prim["attributes"]["POSITION"]))
        ch = chain(index)
        pts = [xform(ch, p) for p in acc]
        centroids[node["name"]] = (
            sum(p[0] for p in pts) / len(pts),
            sum(p[1] for p in pts) / len(pts),
            sum(p[2] for p in pts) / len(pts),
        )
        for p in pts:
            bounds.append(p)
    mins = [min(p[i] for p in bounds) for i in range(3)]
    maxs = [max(p[i] for p in bounds) for i in range(3)]
    return centroids, mins, maxs


def prepare(point, mins, maxs, target_height):
    size_y = maxs[1] - mins[1]
    scale = target_height / size_y
    center_x = scale * (mins[0] + maxs[0]) / 2
    center_z = scale * (mins[2] + maxs[2]) / 2
    min_y = scale * mins[1]
    return (
        point[0] * scale - center_x,
        point[1] * scale - min_y,
        point[2] * scale - center_z,
    )


def yaw(point, theta):
    c, s = math.cos(theta), math.sin(theta)
    return (
        point[0] * c + point[2] * s,
        point[1],
        -point[0] * s + point[2] * c,
    )


def main():
    failures = []
    if not GLB.is_symlink():
        failures.append(f"{GLB} must be a symlink, not a copied GLB")
    else:
        target = GLB.readlink().as_posix()
        if "cinema/assets/theatre_chair__0e346addc570.glb" not in target:
            failures.append(f"unexpected chair symlink target {target}")
    speaker = ROOT / "assets" / "speaker__2db67686cd88.glb"
    if not speaker.is_symlink():
        failures.append("speaker GLB must be a symlink")

    layout = json.loads(LAYOUT.read_text())
    js, blob = load_glb(GLB)
    centroids, mins, maxs = mesh_centroids(js, blob)
    if "cushion" not in centroids or "back_surface" not in centroids:
        failures.append(f"missing mesh names in GLB: {sorted(centroids)}")
        report(failures)
        return 1

    native_dz = centroids["cushion"][2] - centroids["back_surface"][2]
    if native_dz >= 0:
        failures.append(
            f"native cushion Z {centroids['cushion'][2]:.3f} is not in front of "
            f"back_surface Z {centroids['back_surface'][2]:.3f}"
        )

    height = layout["assets"]["theatre_chair"]["targetHeight"]
    cushion = prepare(centroids["cushion"], mins, maxs, height)
    back = prepare(centroids["back_surface"], mins, maxs, height)
    if cushion[2] >= back[2]:
        failures.append("recenter/scale flipped the chair front")

    chairs = [i for i in layout["instances"] if i["kind"] == "theatre_chair"]
    if len(chairs) < 12:
        failures.append(f"expected a full house, found {len(chairs)} chairs")

    levels = set(layout["meta"]["levels"])
    ys = {round(i["position"][1], 2) for i in chairs}
    if ys != set(levels):
        failures.append(f"seat levels {sorted(ys)} != stepped floors {sorted(levels)}")

    by_y = {}
    for inst in chairs:
        yaw_v = inst.get("rotationY", 0)
        if abs(abs(yaw_v) - math.pi) < 0.6 or abs(yaw_v) > 0.45:
            failures.append(f"{inst['id']} rotationY {yaw_v} is not a screen-facing toe-in")
        local_c = yaw(cushion, yaw_v)
        local_b = yaw(back, yaw_v)
        pos = inst["position"]
        cz = local_c[2] + pos[2]
        bz = local_b[2] + pos[2]
        dz = cz - bz
        dx = (local_c[0] + pos[0]) - (local_b[0] + pos[0])
        if not (dz < -0.08 and abs(dz) > abs(dx)):
            failures.append(f"{inst['id']} front not toward screen dz={dz:.3f} dx={dx:.3f}")
        if pos[2] <= SCREEN_Z:
            failures.append(f"{inst['id']} is behind the screen")
        by_y.setdefault(pos[1], []).append(pos[0])

    for y, xs in by_y.items():
        xs = sorted(xs)
        for a, b in zip(xs, xs[1:]):
            if b - a < 0.85:
                failures.append(f"row y={y} seats overlap: {a} .. {b}")

    # Rows are staggered: the front row x's are not the middle row x's.
    rows = [sorted(by_y[y]) for y in sorted(by_y)]
    if len(rows) >= 2 and rows[0] == rows[1]:
        failures.append("front and middle rows are the same grid")

    # Middle row has a center seat; the loge is split into pairs.
    loge = rows[-1]
    if len(loge) != 4 or loge[2] - loge[1] < 1.6:
        failures.append(f"loge should be two separated pairs, got {loge}")

    report(failures)
    return 1 if failures else 0


def report(failures):
    if failures:
        print("FAIL")
        for item in failures:
            print(" -", item)
    else:
        print("ok — cushion is -Z of the backrest; every placed seat faces the screen")


if __name__ == "__main__":
    sys.exit(main())
