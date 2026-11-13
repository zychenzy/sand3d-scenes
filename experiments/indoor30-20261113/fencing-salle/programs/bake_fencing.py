"""Bake the fencing kit that is not in the shared GLB catalog.

Metres, Y up, origin at the footprint centre, bottom at y = 0.
Run from anywhere: python3 programs/bake_fencing.py
"""
import json
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets"

STEEL = (0.78, 0.81, 0.84)
STEEL_DARK = (0.55, 0.58, 0.62)
LEATHER = (0.32, 0.22, 0.16)
POMMEL = (0.62, 0.50, 0.32)
BIB = (0.90, 0.86, 0.78)
MASK_PAD = (0.45, 0.32, 0.24)
RACK_WOOD = (0.45, 0.30, 0.18)
RACK_RAIL = (0.29, 0.33, 0.36)
BOX = (0.22, 0.25, 0.29)
BOX_TRIM = (0.55, 0.58, 0.60)
WINDOW = (0.93, 0.90, 0.82)
RED = (0.78, 0.16, 0.12)
GREEN = (0.12, 0.55, 0.28)
CABLE = (0.18, 0.20, 0.22)


def _png(w, h, rgba):
    raw = b"".join(b"\x00" + rgba[y * w * 4:(y + 1) * w * 4] for y in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def mesh_grid_png(size=128, step=7, thickness=1):
    px = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            i = (y * size + x) * 4
            on = (x % step) < thickness or (y % step) < thickness
            if on:
                px[i:i + 4] = bytes((196, 204, 210, 255))
            else:
                px[i:i + 4] = bytes((0, 0, 0, 0))
    return _png(size, size, bytes(px))


class Mesh:
    def __init__(self, name, material):
        self.name = name
        self.material = material
        self.positions = []
        self.normals = []
        self.uvs = []
        self.indices = []

    def add(self, p, n, uv=(0.0, 0.0)):
        self.positions.append(p)
        self.normals.append(n)
        self.uvs.append(uv)
        return len(self.positions) - 1

    def tri(self, a, b, c):
        self.indices.extend((a, b, c))

    def quad(self, a, b, c, d):
        self.tri(a, b, c)
        self.tri(a, c, d)


def _norm(v):
    l = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) or 1.0
    return (v[0] / l, v[1] / l, v[2] / l)


def box(mesh, cx, cy, cz, sx, sy, sz):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    faces = [
        ((0, 0, 1), [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]),
        ((0, 0, -1), [(hx, -hy, -hz), (-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz)]),
        ((1, 0, 0), [(hx, -hy, hz), (hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz)]),
        ((-1, 0, 0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)]),
        ((0, 1, 0), [(-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz), (-hx, hy, -hz)]),
        ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)]),
    ]
    for n, pts in faces:
        ids = [mesh.add((cx + p[0], cy + p[1], cz + p[2]), n) for p in pts]
        mesh.quad(*ids)


def cylinder(mesh, cx, cy, cz, radius, height, segments=16, axis="y"):
    h = height / 2
    ring = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        ring.append((math.cos(a), math.sin(a)))
    def pt(c, s, along):
        if axis == "y":
            return (cx + radius * c, cy + along, cz + radius * s)
        if axis == "z":
            return (cx + radius * c, cy + radius * s, cz + along)
        return (cx + along, cy + radius * c, cz + radius * s)
    def nrm(c, s):
        if axis == "y":
            return (c, 0, s)
        if axis == "z":
            return (c, s, 0)
        return (0, c, s)
    cap_n = {"y": (0, 1, 0), "z": (0, 0, 1), "x": (1, 0, 0)}[axis]
    cap_n_b = tuple(-v for v in cap_n)
    bottom = []
    top = []
    for c, s in ring:
        bottom.append(mesh.add(pt(c, s, -h), nrm(c, s)))
        top.append(mesh.add(pt(c, s, h), nrm(c, s)))
    for i in range(segments):
        j = (i + 1) % segments
        mesh.quad(bottom[i], bottom[j], top[j], top[i])
    bc = mesh.add(pt(0, 0, -h), cap_n_b)
    tc = mesh.add(pt(0, 0, h), cap_n)
    bcap = [mesh.add(pt(c, s, -h), cap_n_b) for c, s in ring]
    tcap = [mesh.add(pt(c, s, h), cap_n) for c, s in ring]
    for i in range(segments):
        j = (i + 1) % segments
        mesh.tri(bc, bcap[j], bcap[i])
        mesh.tri(tc, tcap[i], tcap[j])


def sphere(mesh, cx, cy, cz, radius, seg=12, rings=8):
    rows = []
    for i in range(rings + 1):
        v = i / rings
        phi = math.pi * v
        row = []
        for j in range(seg):
            u = j / seg
            theta = 2 * math.pi * u
            n = (math.sin(phi) * math.cos(theta), math.cos(phi), math.sin(phi) * math.sin(theta))
            row.append(mesh.add((cx + n[0] * radius, cy + n[1] * radius, cz + n[2] * radius), n, (u, v)))
        rows.append(row)
    for i in range(rings):
        for j in range(seg):
            j2 = (j + 1) % seg
            mesh.quad(rows[i][j], rows[i][j2], rows[i + 1][j2], rows[i + 1][j])


def lathe(mesh, profile, segments=28, u0=0.0, u1=1.0):
    """profile: list of (radius, y) revolving around Y."""
    cols = []
    for i in range(segments):
        u = i / segments
        theta = 2 * math.pi * u
        c, s = math.cos(theta), math.sin(theta)
        col = []
        for k, (r, y) in enumerate(profile):
            r0, y0 = profile[max(0, k - 1)]
            r1, y1 = profile[min(len(profile) - 1, k + 1)]
            n = _norm((c, (r0 - r1) * 0.5, s))
            if n[1] == 0 and r0 == r1:
                n = (c, 0, s)
            col.append(mesh.add((r * c, y, r * s), n, (u0 + (u1 - u0) * u, k / (len(profile) - 1))))
        cols.append(col)
    for i in range(segments):
        j = (i + 1) % segments
        for k in range(len(profile) - 1):
            mesh.quad(cols[i][k], cols[j][k], cols[j][k + 1], cols[i][k + 1])


def tapered_blade(mesh, y0, y1, w0, w1, t0, t1, segments=8, bow=0.0):
    """Straight or sabre-bowed blade. bow is +Z at the tip."""
    rings = []
    for i in range(segments + 1):
        f = i / segments
        y = y0 + (y1 - y0) * f
        z = bow * f * f
        w = w0 + (w1 - w0) * f
        t = t0 + (t1 - t0) * f
        # tangent for a slight normal tilt
        dy = (y1 - y0) / segments
        dz = bow * ((f + 1 / segments) ** 2 - f * f) if i < segments else bow * (f * f - (f - 1 / segments) ** 2)
        rings.append((y, z, w, t))
    for i in range(segments):
        y_a, z_a, w_a, t_a = rings[i]
        y_b, z_b, w_b, t_b = rings[i + 1]
        corners_a = [(-w_a / 2, y_a, z_a + t_a / 2), (w_a / 2, y_a, z_a + t_a / 2), (w_a / 2, y_a, z_a - t_a / 2), (-w_a / 2, y_a, z_a - t_a / 2)]
        corners_b = [(-w_b / 2, y_b, z_b + t_b / 2), (w_b / 2, y_b, z_b + t_b / 2), (w_b / 2, y_b, z_b - t_b / 2), (-w_b / 2, y_b, z_b - t_b / 2)]
        normals = [(0, 0, 1), (1, 0, 0), (0, 0, -1), (-1, 0, 0)]
        order = [(0, 1), (1, 2), (2, 3), (3, 0)]
        for n, (a, b) in zip(normals, order):
            ia = mesh.add(corners_a[a], n)
            ib = mesh.add(corners_a[b], n)
            ic = mesh.add(corners_b[b], n)
            id_ = mesh.add(corners_b[a], n)
            mesh.quad(ia, ib, ic, id_)
    # tip cap
    y, z, w, t = rings[-1]
    n = (0, 1, 0)
    a = mesh.add((-w / 2, y, z + t / 2), n)
    b = mesh.add((w / 2, y, z + t / 2), n)
    c = mesh.add((w / 2, y, z - t / 2), n)
    d = mesh.add((-w / 2, y, z - t / 2), n)
    mesh.quad(a, b, c, d)


def arc_tube(mesh, cx, cy, cz, radius, tube, a0, a1, segments=10, axis="z"):
    """Partial torus in a plane. axis is the ring normal."""
    rings = []
    for i in range(segments + 1):
        a = a0 + (a1 - a0) * i / segments
        if axis == "x":
            center = (cx, cy + radius * math.cos(a), cz + radius * math.sin(a))
            normal = (0, math.cos(a), math.sin(a))
        else:
            center = (cx + radius * math.cos(a), cy + radius * math.sin(a), cz)
            normal = (math.cos(a), math.sin(a), 0)
        ring = []
        for j in range(8):
            b = 2 * math.pi * j / 8
            if axis == "x":
                side = (1, 0, 0)
                binorm = _norm((0, -normal[2], normal[1]))
            else:
                side = (0, 0, 1)
                binorm = _norm((-normal[1], normal[0], 0))
            n = (
                side[0] * math.cos(b) + binorm[0] * math.sin(b),
                normal[1] * math.cos(b) + binorm[1] * math.sin(b),
                normal[2] * math.cos(b) + binorm[2] * math.sin(b),
            )
            # rebuild a clean tube frame
            if axis == "x":
                n = (math.cos(b), math.sin(b) * math.cos(a), math.sin(b) * math.sin(a))
                p = (center[0] + tube * n[0], center[1] + tube * n[1], center[2] + tube * n[2])
            else:
                n = (math.cos(a) * math.cos(b), math.sin(a) * math.cos(b), math.sin(b))
                p = (center[0] + tube * math.cos(b) * math.cos(a), center[1] + tube * math.cos(b) * math.sin(a), center[2] + tube * math.sin(b))
            ring.append(mesh.add(p, _norm(n)))
        rings.append(ring)
    for i in range(segments):
        for j in range(8):
            j2 = (j + 1) % 8
            mesh.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j])


def french_weapon(name, bell_r, bell_h, bell_y, blade_len, cup=False, bow=0.0, knuckle=False):
    steel = Mesh(name + "_steel", "steel")
    dark = Mesh(name + "_dark", "steel_dark")
    leather = Mesh(name + "_grip", "leather")
    brass = Mesh(name + "_brass", "pommel")
    # pommel, grip, bell, blade. Bottom is the pommel.
    cylinder(brass, 0, 0.016, 0, 0.014, 0.032, 12)
    cylinder(leather, 0, 0.016 + 0.018 + 0.075, 0, 0.012, 0.15, 10)
    # bell: flat disk, or a cup (cylinder + inner lip)
    by = bell_y
    cylinder(steel, 0, by, 0, bell_r, bell_h, 20)
    if cup:
        cylinder(dark, 0, by + bell_h * 0.15, 0, bell_r * 0.72, bell_h * 0.55, 16)
    cylinder(steel, 0, by + bell_h * 0.5 + 0.012, 0, 0.012, 0.028, 8)
    y0 = by + bell_h * 0.55
    tapered_blade(steel, y0, y0 + blade_len, 0.010, 0.004, 0.0035, 0.0022, segments=10, bow=bow)
    cylinder(dark, 0, y0 + blade_len + 0.006, bow, 0.0045, 0.012, 8)
    if knuckle:
        arc_tube(brass, 0, by, bell_r * 0.15, bell_r * 0.85, 0.0045, math.pi * 1.05, math.pi * 1.85, segments=12, axis="x")
    return [steel, dark, leather, brass]


def build_foil():
    return french_weapon("foil", bell_r=0.048, bell_h=0.012, bell_y=0.185, blade_len=0.90, cup=False)


def build_epee():
    return french_weapon("epee", bell_r=0.068, bell_h=0.032, bell_y=0.195, blade_len=0.90, cup=True)


def build_sabre():
    return french_weapon("sabre", bell_r=0.055, bell_h=0.016, bell_y=0.188, blade_len=0.86, cup=False, bow=0.055, knuckle=True)


def build_mask():
    shell = Mesh("mask_shell", "mesh")
    inner = Mesh("mask_inner", "steel_dark")
    pad = Mesh("mask_pad", "pad")
    bib = Mesh("mask_bib", "bib")
    tongue = Mesh("mask_tongue", "pad")
    # Head cage. Profile is a fencing mask: deep brow, round crown, open-ish chin.
    profile = [
        (0.045, 0.10),
        (0.078, 0.13),
        (0.100, 0.18),
        (0.108, 0.24),
        (0.096, 0.30),
        (0.062, 0.35),
        (0.028, 0.38),
    ]
    lathe(shell, profile, segments=22)
    lathe(inner, [(r * 0.82, y) for r, y in profile], segments=16)
    # face padding ring, slightly in front
    cylinder(pad, 0, 0.20, 0.02, 0.092, 0.028, 18)
    # bib — cream leather flap down the front (+Z)
    box(bib, 0.0, 0.085, 0.078, 0.16, 0.13, 0.012)
    box(bib, 0.0, 0.145, 0.062, 0.12, 0.04, 0.02)
    # rear tongue that drops over a peg
    box(tongue, 0.0, 0.30, -0.055, 0.045, 0.09, 0.012)
    box(tongue, 0.0, 0.345, -0.04, 0.055, 0.016, 0.028)
    return [inner, shell, pad, bib, tongue]


def build_rack():
    wood = Mesh("rack_wood", "rack_wood")
    metal = Mesh("rack_metal", "rack_rail")
    # Back plate, 1.76 wide, 1.18 tall, sitting on y=0. Depth grows toward +Z.
    box(wood, 0, 0.59, 0.012, 1.76, 1.18, 0.024)
    # side stiles
    box(wood, -0.84, 0.59, 0.04, 0.04, 1.18, 0.04)
    box(wood, 0.84, 0.59, 0.04, 0.04, 1.18, 0.04)
    # lower bell rail
    box(metal, 0, 0.78, 0.09, 1.68, 0.028, 0.10)
    # dividers — 9 fences make 8 slots across the rail
    for i in range(9):
        x = -0.72 + i * 0.18
        box(metal, x, 0.80, 0.11, 0.012, 0.07, 0.11)
    # upper finger rail
    box(metal, 0, 1.02, 0.07, 1.68, 0.02, 0.025)
    for i in range(9):
        x = -0.72 + i * 0.18
        box(metal, x, 1.00, 0.085, 0.01, 0.06, 0.04)
    # mounting cleats on the back
    box(wood, -0.6, 0.20, -0.004, 0.18, 0.06, 0.012)
    box(wood, 0.6, 0.20, -0.004, 0.18, 0.06, 0.012)
    return [wood, metal]


def build_scoring_box():
    body = Mesh("box_body", "box")
    trim = Mesh("box_trim", "trim")
    window = Mesh("box_window", "window")
    red = Mesh("lamp_red", "red")
    green = Mesh("lamp_green", "green")
    cable = Mesh("box_cable", "cable")
    box(body, 0, 0.07, 0, 0.46, 0.14, 0.22)
    # front bezel, +Z
    box(trim, 0, 0.075, 0.112, 0.40, 0.09, 0.008)
    box(window, 0, 0.055, 0.118, 0.16, 0.045, 0.006)
    # top lamps — readable from the side, not only from the front
    sphere(red, -0.11, 0.175, 0.02, 0.042, seg=12, rings=8)
    sphere(green, 0.11, 0.175, 0.02, 0.042, seg=12, rings=8)
    cylinder(trim, -0.11, 0.145, 0.02, 0.028, 0.012, 10)
    cylinder(trim, 0.11, 0.145, 0.02, 0.028, 0.012, 10)
    # short cable out the back
    cylinder(cable, 0, 0.06, -0.14, 0.008, 0.08, 8, axis="z")
    return [body, trim, window, red, green, cable]


MATERIALS = {
    "steel": {"base": STEEL, "emissive": (0, 0, 0)},
    "steel_dark": {"base": STEEL_DARK, "emissive": (0, 0, 0)},
    "leather": {"base": LEATHER, "emissive": (0, 0, 0)},
    "pommel": {"base": POMMEL, "emissive": (0, 0, 0)},
    "mesh": {"base": (0.85, 0.88, 0.90), "emissive": (0, 0, 0), "texture": "mesh"},
    "pad": {"base": MASK_PAD, "emissive": (0, 0, 0)},
    "bib": {"base": BIB, "emissive": (0, 0, 0)},
    "rack_wood": {"base": RACK_WOOD, "emissive": (0, 0, 0)},
    "rack_rail": {"base": RACK_RAIL, "emissive": (0, 0, 0)},
    "box": {"base": BOX, "emissive": (0, 0, 0)},
    "trim": {"base": BOX_TRIM, "emissive": (0, 0, 0)},
    "window": {"base": WINDOW, "emissive": (0.25, 0.22, 0.14)},
    "red": {"base": RED, "emissive": (0.85, 0.08, 0.05)},
    "green": {"base": GREEN, "emissive": (0.05, 0.55, 0.16)},
    "cable": {"base": CABLE, "emissive": (0, 0, 0)},
}


def pack_glb(meshes, texture_png=None):
    # unique materials in order of first use
    mat_names = []
    for m in meshes:
        if m.material not in mat_names:
            mat_names.append(m.material)
    blob = bytearray()
    buffer_views = []
    accessors = []
    prims_per_mesh = []

    def align(n=4):
        while len(blob) % n:
            blob.append(0)

    def push(data, target):
        align(4)
        start = len(blob)
        blob.extend(data)
        buffer_views.append({"buffer": 0, "byteOffset": start, "byteLength": len(data), "target": target})
        return len(buffer_views) - 1

    tex_index = None
    if texture_png:
        align(4)
        start = len(blob)
        blob.extend(texture_png)
        buffer_views.append({"buffer": 0, "byteOffset": start, "byteLength": len(texture_png)})
        tex_view = len(buffer_views) - 1
        tex_index = 0

    mesh_defs = []
    for mesh in meshes:
        mi = mat_names.index(mesh.material)
        pos = struct.pack("<" + "f" * (len(mesh.positions) * 3), *[c for p in mesh.positions for c in p])
        nrm = struct.pack("<" + "f" * (len(mesh.normals) * 3), *[c for p in mesh.normals for c in p])
        idx = struct.pack("<" + "H" * len(mesh.indices), *mesh.indices)
        pv = push(pos, 34962)
        nv = push(nrm, 34962)
        iv = push(idx, 34963)
        xs = [p[0] for p in mesh.positions]
        ys = [p[1] for p in mesh.positions]
        zs = [p[2] for p in mesh.positions]
        accessors.append({
            "bufferView": pv, "componentType": 5126, "count": len(mesh.positions), "type": "VEC3",
            "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)],
        })
        pa = len(accessors) - 1
        accessors.append({"bufferView": nv, "componentType": 5126, "count": len(mesh.normals), "type": "VEC3"})
        na = len(accessors) - 1
        accessors.append({"bufferView": iv, "componentType": 5123, "count": len(mesh.indices), "type": "SCALAR"})
        ia = len(accessors) - 1
        attrs = {"POSITION": pa, "NORMAL": na}
        if mesh.material == "mesh":
            uv = struct.pack("<" + "f" * (len(mesh.uvs) * 2), *[c for p in mesh.uvs for c in p])
            uvv = push(uv, 34962)
            accessors.append({"bufferView": uvv, "componentType": 5126, "count": len(mesh.uvs), "type": "VEC2"})
            attrs["TEXCOORD_0"] = len(accessors) - 1
        mesh_defs.append({
            "name": mesh.name,
            "primitives": [{
                "attributes": attrs,
                "indices": ia,
                "material": mi,
            }],
        })

    materials = []
    for name in mat_names:
        spec = MATERIALS[name]
        entry = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [spec["base"][0], spec["base"][1], spec["base"][2], 1],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.85,
            },
            "emissiveFactor": list(spec["emissive"]),
            "doubleSided": True,
        }
        if name == "mesh" and tex_index is not None:
            entry["pbrMetallicRoughness"]["baseColorTexture"] = {"index": tex_index}
            entry["alphaMode"] = "MASK"
            entry["alphaCutoff"] = 0.4
            entry["doubleSided"] = True
        materials.append(entry)

    images = []
    textures = []
    if texture_png:
        images.append({"bufferView": tex_view, "mimeType": "image/png"})
        textures.append({"source": 0})

    gltf = {
        "asset": {"version": "2.0", "generator": "fencing-salle bake"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "root", "children": list(range(1, 1 + len(mesh_defs)))}],
        "meshes": mesh_defs,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
    }
    # children indices: nodes 1..n each point at mesh
    gltf["nodes"] = [{"name": "root", "children": list(range(1, 1 + len(mesh_defs)))}]
    for i, mesh in enumerate(meshes):
        gltf["nodes"].append({"name": mesh.name, "mesh": i})
    if images:
        gltf["images"] = images
        gltf["textures"] = textures

    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "
    while len(blob) % 4:
        blob.append(0)
    total = 12 + 8 + len(js) + 8 + len(blob)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(js), 0x4E4F534A)
    out += js
    out += struct.pack("<II", len(blob), 0x004E4942)
    out += blob
    return bytes(out)


def bounds(meshes):
    xs, ys, zs = [], [], []
    for m in meshes:
        for p in m.positions:
            xs.append(p[0]); ys.append(p[1]); zs.append(p[2])
    return {
        "size": [round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4)],
        "min": [round(min(xs), 4), round(min(ys), 4), round(min(zs), 4)],
        "max": [round(max(xs), 4), round(max(ys), 4), round(max(zs), 4)],
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    png = mesh_grid_png()
    builds = {
        "foil.glb": (build_foil(), None),
        "epee.glb": (build_epee(), None),
        "sabre.glb": (build_sabre(), None),
        "mask.glb": (build_mask(), png),
        "weapon_rack.glb": (build_rack(), None),
        "scoring_box.glb": (build_scoring_box(), None),
    }
    report = {}
    for name, (meshes, tex) in builds.items():
        data = pack_glb(meshes, tex)
        (OUT / name).write_bytes(data)
        report[name] = {"bytes": len(data), **bounds(meshes)}
        print(name, report[name])
    (OUT / "baked_bounds.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
