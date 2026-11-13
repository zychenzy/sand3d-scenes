#!/usr/bin/env python3
"""Bake original perfumery meshes the catalog does not have.

Low-poly flacons, a two-pan balance, and a glass pipette. Units are metres.
These are invented silhouettes, not copies of a house bottle.
"""

import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent / "assets"


def linear(hex_color):
    h = hex_color.lstrip("#")
    rgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]

    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4

    return [f(c) for c in rgb] + [1.0]


class Bake:
    def __init__(self):
        self.prims = []

    def add(self, verts, faces, color, smooth=False):
        if not faces:
            return
        if smooth:
            norms = [[0.0, 0.0, 0.0] for _ in verts]
            for a, b, c in faces:
                n = normal(verts[a], verts[b], verts[c])
                for i in (a, b, c):
                    norms[i] = [norms[i][k] + n[k] for k in range(3)]
            norms = [unit(n) for n in norms]
            positions = verts
            indices = [i for f in faces for i in f]
            out_n = norms
        else:
            positions = []
            out_n = []
            indices = []
            for a, b, c in faces:
                n = normal(verts[a], verts[b], verts[c])
                base = len(positions)
                for i in (a, b, c):
                    positions.append(verts[i])
                    out_n.append(n)
                indices.extend((base, base + 1, base + 2))
        self.prims.append((positions, out_n, indices, color))

    def box(self, cx, cy, cz, sx, sy, sz, color):
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        v = [
            (cx - hx, cy - hy, cz - hz),
            (cx + hx, cy - hy, cz - hz),
            (cx + hx, cy + hy, cz - hz),
            (cx - hx, cy + hy, cz - hz),
            (cx - hx, cy - hy, cz + hz),
            (cx + hx, cy - hy, cz + hz),
            (cx + hx, cy + hy, cz + hz),
            (cx - hx, cy + hy, cz + hz),
        ]
        faces = [
            (4, 5, 6), (4, 6, 7),  # +Z
            (1, 0, 3), (1, 3, 2),  # -Z
            (5, 1, 2), (5, 2, 6),  # +X
            (0, 4, 7), (0, 7, 3),  # -X
            (3, 7, 6), (3, 6, 2),  # +Y
            (0, 1, 5), (0, 5, 4),  # -Y
        ]
        self.add(v, faces, color, smooth=False)

    def cylinder(self, cx, cy, cz, radius, height, color, segs=18, axis="y"):
        profile = [(radius, cy - height / 2), (radius, cy + height / 2)]
        self.lathe(profile, color, segs=segs, cx=cx, cz=cz, axis=axis)

    def lathe(self, profile, color, segs=18, cx=0.0, cz=0.0, axis="y", z_scale=1.0):
        rings = []
        for radius, y in profile:
            ring = []
            for s in range(segs):
                a = 2 * math.pi * s / segs
                x = cx + radius * math.cos(a)
                z = cz + radius * math.sin(a) * z_scale
                if axis == "y":
                    ring.append((x, y, z))
                else:
                    ring.append((x, z, y))
            rings.append(ring)
        verts = [p for ring in rings for p in ring]
        faces = []
        for i in range(len(rings) - 1):
            for s in range(segs):
                s2 = (s + 1) % segs
                a = i * segs + s
                b = i * segs + s2
                c = (i + 1) * segs + s2
                d = (i + 1) * segs + s
                faces.append((a, b, c))
                faces.append((a, c, d))
        bottom_y = profile[0][1]
        top_y = profile[-1][1]
        bottom_i = len(verts)
        top_i = bottom_i + 1
        if axis == "y":
            verts.append((cx, bottom_y, cz))
            verts.append((cx, top_y, cz))
        else:
            verts.append((cx, cz, bottom_y))
            verts.append((cx, cz, top_y))
        for s in range(segs):
            s2 = (s + 1) % segs
            faces.append((bottom_i, s2, s))
            faces.append((top_i, (len(rings) - 1) * segs + s, (len(rings) - 1) * segs + s2))
        self.add(verts, faces, color, smooth=True)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def normal(a, b, c):
    return unit(cross(sub(b, a), sub(c, a)))


def unit(v):
    length = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2) or 1.0
    return [v[0] / length, v[1] / length, v[2] / length]


def write_glb(path, bake):
    blob = bytearray()
    views = []
    accessors = []
    primitives = []

    def pad4(buf, fill):
        while len(buf) % 4:
            buf.append(fill)

    def push(array_type, values, count, ctype, atype, target=None):
        start = len(blob)
        blob.extend(struct.pack("<" + array_type * len(values), *values))
        pad4(blob, 0)
        views.append({"buffer": 0, "byteOffset": start, "byteLength": len(blob) - start, "target": target} if target else {"buffer": 0, "byteOffset": start, "byteLength": len(blob) - start})
        acc = {"bufferView": len(views) - 1, "componentType": ctype, "count": count, "type": atype}
        accessors.append(acc)
        return len(accessors) - 1

    for positions, norms, indices, color in bake.prims:
        flat_p = [c for v in positions for c in v]
        flat_n = [c for v in norms for c in v]
        p_i = push("f", flat_p, len(positions), 5126, "VEC3", 34962)
        mins = [min(v[i] for v in positions) for i in range(3)]
        maxs = [max(v[i] for v in positions) for i in range(3)]
        accessors[p_i]["min"] = mins
        accessors[p_i]["max"] = maxs
        n_i = push("f", flat_n, len(positions), 5126, "VEC3", 34962)
        i_i = push("H", indices, len(indices), 5123, "SCALAR", 34963)
        primitives.append({
            "attributes": {"POSITION": p_i, "NORMAL": n_i},
            "indices": i_i,
            "material": len(primitives),
        })

    materials = []
    for _, _, _, color in bake.prims:
        materials.append({
            "pbrMetallicRoughness": {"baseColorFactor": color, "metallicFactor": 0.08, "roughnessFactor": 0.62},
            "doubleSided": False,
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "perfumery-bake"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": path.stem}],
        "meshes": [{"name": path.stem, "primitives": primitives}],
        "materials": materials,
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": views,
        "accessors": accessors,
    }
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "
    bin_blob = bytes(blob)
    while len(bin_blob) % 4:
        bin_blob += b"\x00"
    total = 12 + 8 + len(js) + 8 + len(bin_blob)
    out = struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(js), 0x4E4F534A) + js
    out += struct.pack("<II", len(bin_blob), 0x004E4942) + bin_blob
    path.write_bytes(out)
    height = 0.0
    for positions, _, _, _ in bake.prims:
        height = max(height, max(v[1] for v in positions) - min(0.0, min(v[1] for v in positions)))
    return len(out), round(height, 4)


def cap(b, y, radius, height, color):
    b.cylinder(0, y + height / 2, 0, radius, height, color, segs=16)
    b.cylinder(0, y + height + 0.003, 0, radius * 0.55, 0.006, color, segs=12)


def flacon_rect():
    b = Bake()
    glass = linear("#e7d7ae")
    juice = linear("#c6a15e")
    gold = linear("#e0b45a")
    foot = linear("#8d7040")
    b.box(0, 0.005, 0, 0.056, 0.01, 0.034, foot)
    b.box(0, 0.052, 0, 0.05, 0.086, 0.03, glass)
    b.box(0, 0.102, 0, 0.034, 0.016, 0.022, glass)
    b.cylinder(0, 0.122, 0, 0.0085, 0.022, glass, segs=14)
    b.cylinder(0, 0.136, 0, 0.013, 0.008, gold, segs=14)
    cap(b, 0.140, 0.012, 0.02, gold)
    b.box(0, 0.05, 0.0162, 0.034, 0.058, 0.003, juice)
    return b


def flacon_round():
    b = Bake()
    glass = linear("#e39a3c")
    gold = linear("#d7a84e")
    dark = linear("#8a4e16")
    b.lathe([
        (0.014, 0.0),
        (0.03, 0.01),
        (0.038, 0.04),
        (0.036, 0.078),
        (0.02, 0.1),
        (0.011, 0.118),
        (0.011, 0.128),
    ], glass, segs=18)
    b.cylinder(0, 0.132, 0, 0.014, 0.007, gold, segs=14)
    cap(b, 0.136, 0.0125, 0.018, gold)
    b.cylinder(0, 0.055, 0.03, 0.008, 0.04, dark, segs=10)
    return b


def flacon_shoulder():
    b = Bake()
    glass = linear("#d98996")
    juice = linear("#a85268")
    metal = linear("#c99a78")
    b.lathe([
        (0.015, 0.0),
        (0.028, 0.012),
        (0.046, 0.045),
        (0.048, 0.078),
        (0.022, 0.102),
        (0.012, 0.132),
        (0.012, 0.146),
    ], glass, segs=18)
    b.cylinder(0, 0.15, 0, 0.015, 0.008, metal, segs=14)
    cap(b, 0.154, 0.013, 0.016, metal)
    b.lathe([
        (0.01, 0.02),
        (0.03, 0.05),
        (0.032, 0.075),
        (0.012, 0.095),
    ], juice, segs=14)
    return b


def flacon_oval():
    b = Bake()
    glass = linear("#8eaa8c")
    metal = linear("#4e564e")
    b.lathe([
        (0.016, 0.0),
        (0.03, 0.012),
        (0.036, 0.05),
        (0.03, 0.09),
        (0.014, 0.112),
        (0.012, 0.122),
    ], glass, segs=18, z_scale=0.62)
    b.cylinder(0, 0.128, 0, 0.014, 0.008, metal, segs=14)
    cap(b, 0.132, 0.013, 0.016, metal)
    return b


def flacon_atomizer():
    b = Bake()
    glass = linear("#d5dde0")
    juice = linear("#b7c4c8")
    black = linear("#2c2a28")
    steel = linear("#c5ccd0")
    b.lathe([
        (0.018, 0.0),
        (0.022, 0.008),
        (0.022, 0.09),
        (0.016, 0.104),
        (0.014, 0.112),
    ], glass, segs=18)
    b.lathe([(0.012, 0.02), (0.016, 0.05), (0.016, 0.084), (0.01, 0.098)], juice, segs=14)
    b.cylinder(0, 0.12, 0, 0.02, 0.014, steel, segs=16)
    b.cylinder(0, 0.136, 0, 0.006, 0.02, black, segs=12)
    b.box(0, 0.148, 0.012, 0.016, 0.012, 0.028, black)
    b.box(0, 0.148, 0.028, 0.01, 0.008, 0.016, steel)
    b.cylinder(0, 0.158, 0, 0.007, 0.008, black, segs=12)
    return b


def balance_scale():
    b = Bake()
    wood = linear("#6b4630")
    brass = linear("#d2ae62")
    dark = linear("#3e2c22")
    b.box(0, 0.012, 0, 0.2, 0.024, 0.09, wood)
    b.box(0, 0.028, 0, 0.16, 0.01, 0.07, dark)
    b.cylinder(0, 0.09, 0, 0.012, 0.11, brass, segs=12)
    b.box(0, 0.15, 0, 0.2, 0.01, 0.012, brass)
    b.cylinder(-0.09, 0.156, 0, 0.008, 0.012, brass, segs=10)
    b.cylinder(0.09, 0.156, 0, 0.008, 0.012, brass, segs=10)
    for side in (-1, 1):
        x = side * 0.09
        for dx in (-0.012, 0.012):
            b.box(x + dx, 0.118, 0, 0.004, 0.07, 0.004, brass)
        b.cylinder(x, 0.078, 0, 0.032, 0.01, brass, segs=16)
        b.cylinder(x, 0.084, 0, 0.028, 0.004, dark, segs=14)
    b.box(0, 0.168, 0, 0.006, 0.028, 0.006, brass)
    b.box(0, 0.15, 0.02, 0.004, 0.03, 0.004, dark)
    return b


def pipette():
    b = Bake()
    glass = linear("#d5ebe8")
    tip = linear("#edf7f6")
    bulb = linear("#3e342c")
    b.lathe([
        (0.0022, 0.0),
        (0.0032, 0.02),
        (0.0048, 0.05),
        (0.0052, 0.13),
        (0.0042, 0.148),
    ], glass, segs=12)
    b.cylinder(0, 0.012, 0, 0.0024, 0.024, tip, segs=10)
    b.lathe([
        (0.005, 0.148),
        (0.011, 0.162),
        (0.012, 0.174),
        (0.008, 0.186),
        (0.004, 0.19),
    ], bulb, segs=12)
    return b


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    makers = {
        "flacon_rect": flacon_rect,
        "flacon_round": flacon_round,
        "flacon_shoulder": flacon_shoulder,
        "flacon_oval": flacon_oval,
        "flacon_atomizer": flacon_atomizer,
        "balance_scale": balance_scale,
        "pipette": pipette,
    }
    print("kind bytes height")
    for name, fn in makers.items():
        size, height = write_glb(OUT / f"{name}.glb", fn())
        if size > 120_000:
            raise SystemExit(f"{name} is {size} bytes")
        print(f"{name} {size} {height}")


if __name__ == "__main__":
    main()
