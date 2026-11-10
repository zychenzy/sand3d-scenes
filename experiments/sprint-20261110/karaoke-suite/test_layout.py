"""Spatial contract for the karaoke suite. No browser required."""
import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parents[2]
layout = json.loads((ROOT / "layout.json").read_text())

# Measured GLB sizes after the root scale, in metres. Height is Y.
NATIVE = {
    "sofa_solid": (2.2, 1.204, 1.225),
    "coffee_table": (0.655, 0.276, 1.2),
    "speaker": (0.25, 0.105, 0.074),
    "tv": (0.187, 0.776, 1.45),
    "pendant_lamp": (0.246, 0.449, 0.246),
    "cup_mug": (0.075, 0.09, 0.075),
}


def half_extents(kind, scale):
    nx, ny, nz = NATIVE[kind]
    target = layout["assets"][kind]["targetHeight"]
    s = target / ny
    sx, sy, sz = (scale + [1, 1, 1])[:3]
    return (nx * s * sx / 2, ny * s * sy / 2, nz * s * sz / 2)


def yaw(x, z, rot):
    c, s = math.cos(rot), math.sin(rot)
    return (c * x + s * z, -s * x + c * z)


def world_aabb(inst):
    scale = inst.get("scale") or [1, 1, 1]
    if isinstance(scale, (int, float)):
        scale = [scale, scale, scale]
    hx, _, hz = half_extents(inst["kind"], scale)
    rot = inst.get("rotationY") or 0
    px, pz = inst["position"][0], inst["position"][2]
    xs, zs = [], []
    for lx in (-hx, hx):
        for lz in (-hz, hz):
            x, z = yaw(lx, lz, rot)
            xs.append(px + x)
            zs.append(pz + z)
    return min(xs), max(xs), min(zs), max(zs)


def facing(inst):
    """Seat faces local -Z before yaw."""
    return yaw(0, -1, inst.get("rotationY") or 0)


def long_axis(inst):
    kind = inst["kind"]
    rot = inst.get("rotationY") or 0
    if kind == "coffee_table":
        return yaw(0, 1, rot)
    return yaw(1, 0, rot)


def separated(a, b, gap=0.0):
    ax0, ax1, az0, az1 = a
    bx0, bx1, bz0, bz1 = b
    return ax1 + gap <= bx0 or bx1 + gap <= ax0 or az1 + gap <= bz0 or bz1 + gap <= az0


def main():
    instances = {i["id"]: i for i in layout["instances"]}
    sofas = [i for i in layout["instances"] if i["kind"] == "sofa_solid"]
    assert len(sofas) == 3, len(sofas)
    table = instances["table"]
    long = instances["sofa_long"]
    left = instances["sofa_left"]
    right = instances["sofa_right"]

    t_axis = long_axis(table)
    s_axis = long_axis(long)
    parallel = abs(t_axis[0] * s_axis[0] + t_axis[1] * s_axis[1])
    assert parallel > 0.98, parallel

    # Long sofa sits on the long side (+Z), not on a short end.
    assert long["position"][2] > table["position"][2] + 0.8

    tb = world_aabb(table)
    lb = world_aabb(long)
    assert separated(tb, lb, 0.25), (tb, lb)
    assert separated(world_aabb(left), lb, 0.12)
    assert separated(world_aabb(right), lb, 0.12)
    assert separated(world_aabb(left), tb, 0.2)
    assert separated(world_aabb(right), tb, 0.2)
    assert separated(world_aabb(left), world_aabb(right), 1.0)

    for sofa in sofas:
        fx, fz = facing(sofa)
        vx = table["position"][0] - sofa["position"][0]
        vz = table["position"][2] - sofa["position"][2]
        norm = math.hypot(vx, vz)
        dot = (fx * vx + fz * vz) / norm
        assert dot > 0.8, (sofa["id"], dot)

    screen = layout["build"]["screen"]
    assert screen["facing"] == [0, 0, 1]
    assert screen["w"] >= 2.2 and abs(screen["w"] / screen["h"] - 16 / 9) < 0.08
    assert screen["z"] < tb[2] - 1.0
    # Long sofa looks toward the screen (facing -Z, screen is -Z of the sofa).
    fx, fz = facing(long)
    assert fz < -0.9
    assert screen["z"] < long["position"][2]

    mics = layout["build"]["mics"]
    assert sum(1 for m in mics if m["type"] == "stand") == 1
    assert sum(1 for m in mics if m["type"] == "table") == 2
    stage = layout["build"]["stage"]
    stand = next(m for m in mics if m["type"] == "stand")
    assert abs(stand["x"] - stage["x"]) < stage["w"] / 2
    assert abs(stand["z"] - stage["z"]) < stage["d"] / 2
    for mic in mics:
        if mic["type"] != "table":
            continue
        assert tb[0] < mic["x"] < tb[1], mic
        assert tb[2] < mic["z"] < tb[3], mic

    assert len(layout["build"]["panels"]) >= 6
    widths = [p["w"] for p in layout["build"]["panels"]]
    assert len(set(round(w, 2) for w in widths)) >= 4

    for inst in layout["instances"]:
        if inst["kind"] == "pendant_lamp":
            assert inst["position"][1] > 1.8
    pendants = [i["position"] for i in layout["instances"] if i["kind"] == "pendant_lamp"]
    points = layout["lights"]["points"]
    for pos in pendants:
        near = min(math.dist(pos, p["position"]) for p in points)
        assert near < 0.6, near

    for inst in layout["instances"]:
        path = (ROOT / layout["assets"][inst["kind"]]["glb"]).resolve()
        assert path.is_file(), path
        assert REPO in path.parents

    html = (ROOT / "index.html").read_text()
    js = (ROOT / "karaoke.js").read_text() + (ROOT / "scene_lib.js").read_text()
    assert "http://" not in html and "https://" not in html
    assert "cdn" not in html.lower()
    for token in ("lyricTexture", "standMic", "panel(", "addContact"):
        assert token in js, token
    assert re.search(r"three\.module\.js", html)

    print("ok", len(layout["instances"]), "instances", len(layout["build"]["panels"]), "panels")


if __name__ == "__main__":
    main()
