#!/usr/bin/env python3
"""Layout checks for the Marlowe lobby. No browser required."""
import json
import math
from pathlib import Path

SCENE = Path(__file__).resolve().parent
NATIVE = {
    "sofa_solid": (2.156, 1.115, 1.326),
    "coffee_table": (0.6548, 0.2033, 1.200),
    "club_chair": (2.156, 1.115, 1.326),
    "round_table": (0.448, 0.312, 0.448),
    "round_table_low": (0.448, 0.312, 0.448),
    "center_table": (0.448, 0.312, 0.448),
    "pendant_lamp": (0.2463, 0.212, 0.2463),
    "flowerpot": (0.250, 0.2042, 0.250),
    "cup_mug": (0.0752, 0.076, 0.0752),
    "pos_terminal": (0.200, 0.08087, 0.137),
    "thermos": (0.085, 0.300, 0.085),
    "tray_napkin": (0.2715, 0.280, 0.2173),
    "museum_bench": (0.418, 0.380, 1.500),
    "book_stand": (0.684, 1.017, 0.684),
}
FLOOR = {
    "sofa_solid",
    "club_chair",
    "coffee_table",
    "round_table",
    "round_table_low",
    "center_table",
    "museum_bench",
    "book_stand",
    "flowerpot",
}


def yaw_size(sx, sz, yaw):
    c, s = abs(math.cos(yaw)), abs(math.sin(yaw))
    return sx * c + sz * s, sx * s + sz * c


def footprint(inst, spec):
    nx, ny, nz = NATIVE[inst["kind"]]
    base = spec["targetHeight"] / ny
    scale = inst.get("scale", 1)
    if isinstance(scale, list):
        sx, sy, sz = scale
    else:
        sx = sy = sz = scale
    world_x = nx * base * sx
    world_z = nz * base * sz
    world_y = ny * base * sy
    yaw = inst.get("rotationY", 0)
    bw, bd = yaw_size(world_x, world_z, yaw)
    return bw, world_y, bd


def forward_xz(kind, spec, yaw):
    fx, fz = spec["forward"][0], spec["forward"][2]
    c, s = math.cos(yaw), math.sin(yaw)
    return fx * c + fz * s, -fx * s + fz * c


def main():
    layout = json.loads((SCENE / "layout.json").read_text())
    room = layout["meta"]["room"]
    half_w, half_d = room["width"] / 2, room["depth"] / 2
    by_id = {i["id"]: i for i in layout["instances"]}
    errors = []

    vendor = (SCENE / "vendor" / "three.module.js").resolve()
    if not vendor.is_file():
        errors.append(f"missing three vendor symlink: {vendor}")

    for kind, spec in layout["assets"].items():
        path = (SCENE / spec["glb"]).resolve()
        if not path.is_file():
            errors.append(f"{kind} missing glb {path}")
        if "forward" not in spec:
            errors.append(f"{kind} missing forward axis")
        if kind not in NATIVE:
            errors.append(f"{kind} missing native size in test")

    boxes = []
    for inst in layout["instances"]:
        spec = layout["assets"][inst["kind"]]
        bw, bh, bd = footprint(inst, spec)
        x, y, z = inst["position"]
        if y < -0.01 or y + bh > room["height"] + 0.05:
            errors.append(f"{inst['id']} vertical {y}..{y+bh:.2f} outside room")
        if abs(x) + bw / 2 > half_w - 0.02 or abs(z) + bd / 2 > half_d - 0.02:
            errors.append(
                f"{inst['id']} footprint outside room x={x:.2f}±{bw/2:.2f} z={z:.2f}±{bd/2:.2f}"
            )
        if inst["kind"] in FLOOR and y < 0.05:
            boxes.append((inst["id"], x, z, bw, bd))

    for i, (a, ax, az, aw, ad) in enumerate(boxes):
        for b, bx, bz, bw, bd in boxes[i + 1 :]:
            gap_x = abs(ax - bx) - aw / 2 - bw / 2
            gap_z = abs(az - bz) - ad / 2 - bd / 2
            if gap_x < -0.04 and gap_z < -0.04:
                errors.append(f"overlap {a} and {b} gapx={gap_x:.2f} gapz={gap_z:.2f}")

    for face in layout["facing"]:
        inst = by_id[face["id"]]
        target = by_id[face["toward"]]
        spec = layout["assets"][inst["kind"]]
        fx, fz = forward_xz(inst["kind"], spec, inst.get("rotationY", 0))
        dx = target["position"][0] - inst["position"][0]
        dz = target["position"][2] - inst["position"][2]
        norm = math.hypot(dx, dz) or 1
        dot = (fx * dx + fz * dz) / norm
        if dot < 0.75:
            errors.append(f"{face['id']} faces away from {face['toward']} dot={dot:.2f}")

    ids = set(by_id)
    for needed in ("sofa_hearth", "table_hearth", "table_nook", "plinth_art", "bench_wait"):
        if needed not in ids:
            errors.append(f"missing instance {needed}")

    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    print(f"ok — {len(layout['instances'])} instances, {len(layout['facing'])} facing checks")


if __name__ == "__main__":
    main()
