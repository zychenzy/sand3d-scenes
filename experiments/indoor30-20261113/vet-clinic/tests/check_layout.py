#!/usr/bin/env python3
"""Proportion, facing, and pathway checks for the Linden reception. No browser."""
import json
import math
from pathlib import Path

SCENE = Path(__file__).resolve().parent.parent
REPO = SCENE.parents[2]
LAYOUT = json.loads((SCENE / "layout.json").read_text())
ROOT_PREFIXES = ("cafe/", "museum/", "library/", "ktv/", "cowork/")
FLOOR_KINDS = {
    "simple_chair",
    "museum_bench",
    "bar_stool",
    "coffee_table",
    "flowerpot",
    "wall_shelf",
}


def yaw_size(sx, sz, yaw):
    c, s = abs(math.cos(yaw)), abs(math.sin(yaw))
    return sx * c + sz * s, sx * s + sz * c


def footprint(inst):
    spec = LAYOUT["assets"][inst["kind"]]
    nx, ny, nz = spec["native"]
    base = spec["targetHeight"] / ny
    scale = inst.get("scale", 1)
    if isinstance(scale, list):
        sx, sy, sz = (scale + [1, 1, 1])[:3]
    else:
        sx = sy = sz = scale
    bw, bd = yaw_size(nx * base * sx, nz * base * sz, inst.get("rotationY", 0))
    return bw, ny * base * sy, bd


def forward_xz(spec, yaw):
    fx, fz = spec["forward"][0], spec["forward"][2]
    c, s = math.cos(yaw), math.sin(yaw)
    return fx * c + fz * s, -fx * s + fz * c


def rect(cx, cz, w, d):
    return cx, cz, w, d


def overlaps(a, b, pad=0.0):
    ax, az, aw, ad = a
    bx, bz, bw, bd = b
    gap_x = abs(ax - bx) - aw / 2 - bw / 2
    gap_z = abs(az - bz) - ad / 2 - bd / 2
    return gap_x < -pad and gap_z < -pad, gap_x, gap_z


def main():
    errors = []
    room = LAYOUT["meta"]["room"]
    half_w, half_d = room["width"] / 2, room["depth"] / 2
    build = LAYOUT["build"]
    by_id = {i["id"]: i for i in LAYOUT["instances"]}

    if (SCENE / "vendor").exists():
        errors.append("vendor must be a root reference, not a copy in this folder")
    if (SCENE / "assets").exists():
        errors.append("assets must be root references, not copies in this folder")
    html = (SCENE / "index.html").read_text()
    lib = (SCENE / "scene_lib.js").read_text()
    if "../../../cafe/vendor/three.module.js" not in html:
        errors.append("index import map does not reference cafe/vendor")
    if "MeshToonMaterial" not in lib or "MeshBasicMaterial" not in lib:
        errors.append("scene_lib must implement toon and unlit materials")
    if "makeToonGradient(4)" not in lib and "steps = 4" not in lib:
        errors.append("toon gradient must be 4-step")
    vendor = (REPO / "cafe" / "vendor" / "three.module.js")
    if not vendor.is_file():
        errors.append(f"missing shared three vendor {vendor}")

    for kind, spec in LAYOUT["assets"].items():
        glb = SCENE / spec["glb"]
        if ".." not in spec["glb"]:
            errors.append(f"{kind} glb is not a root-relative reference")
        resolved = glb.resolve()
        try:
            rel = resolved.relative_to(REPO).as_posix()
        except ValueError:
            rel = ""
        if not rel.startswith(ROOT_PREFIXES):
            errors.append(f"{kind} resolves outside shared scenes: {resolved}")
        if not resolved.is_file():
            errors.append(f"{kind} missing {resolved}")
        if SCENE in resolved.parents:
            errors.append(f"{kind} file lives inside the experiment folder")
        if "forward" not in spec or "native" not in spec:
            errors.append(f"{kind} needs forward and native size")

    boxes = []
    for inst in LAYOUT["instances"]:
        if inst["kind"] not in FLOOR_KINDS or inst["position"][1] > 0.15:
            continue
        bw, bh, bd = footprint(inst)
        x, y, z = inst["position"]
        if y < -0.01 or y + bh > room["height"] + 0.05:
            errors.append(f"{inst['id']} vertical {y:.2f}..{y + bh:.2f}")
        if abs(x) + bw / 2 > half_w - 0.04 or abs(z) + bd / 2 > half_d - 0.04:
            errors.append(f"{inst['id']} outside room x={x:.2f}±{bw / 2:.2f} z={z:.2f}±{bd / 2:.2f}")
        boxes.append((inst["id"], rect(x, z, bw, bd)))

    desk, access = build["desk"], build["access"]
    boxes.append(("desk", rect(desk["cx"], desk["cz"], desk["w"], desk["d"])))
    boxes.append(("access", rect(access["cx"], access["cz"], access["w"], access["d"])))
    screen = build["screen"]
    boxes.append(("screen", rect(screen["x"], (screen["z0"] + screen["z1"]) / 2, screen["t"], screen["z1"] - screen["z0"])))
    sc = build["scale"]
    boxes.append(("scale", rect(sc["cx"], sc["cz"], sc["w"], sc["d"])))
    bowls = build["bowls"]
    boxes.append(("bowls", rect(bowls["cx"], bowls["cz"], bowls["w"], bowls["d"])))
    table = build["exam"]["table"]
    boxes.append(("exam_table", rect(table["cx"], table["cz"], table["w"], table["d"])))
    for carrier in build["carriers"]:
        bw, bd = yaw_size(carrier["w"], carrier["d"], carrier["rot"])
        boxes.append((carrier["id"], rect(carrier["x"], carrier["z"], bw, bd)))
        if carrier["y"] < 0.02 and (abs(carrier["x"]) + bw / 2 > half_w - 0.04 or abs(carrier["z"]) + bd / 2 > half_d - 0.04):
            errors.append(f"{carrier['id']} outside room")

    allow = {("desk", "access"), ("access", "desk")}
    for i, (name, box) in enumerate(boxes):
        for other, obox in boxes[i + 1 :]:
            if (name, other) in allow:
                continue
            hit, gx, gz = overlaps(box, obox, 0.03)
            if hit:
                errors.append(f"overlap {name} and {other} gapx={gx:.2f} gapz={gz:.2f}")

    paths = {p["id"]: p for p in build["pathways"]}
    for need, min_w in (
        ("entrance", 1.4),
        ("spine", 1.1),
        ("cat_entry", 1.2),
        ("scale_approach", 1.0),
        ("exam_approach", 1.05),
    ):
        if need not in paths:
            errors.append(f"missing pathway {need}")
        elif paths[need]["w"] < min_w:
            errors.append(f"{need} width {paths[need]['w']} < {min_w}")
    if paths.get("queue", {}).get("d", 0) < 1.0:
        errors.append("queue depth under 1.0 m")
    if build["portal"]["clear"] < 1.5:
        errors.append("entrance clear width under 1.5 m")

    for path in build["pathways"]:
        prect = rect(path["cx"], path["cz"], path["w"], path["d"])
        for name, box in boxes:
            hit, gx, gz = overlaps(prect, box, 0.02)
            if hit:
                errors.append(f"pathway {path['id']} blocked by {name} gapx={gx:.2f} gapz={gz:.2f}")

    for face in LAYOUT["facing"]:
        inst = by_id[face["id"]]
        spec = LAYOUT["assets"][inst["kind"]]
        fx, fz = forward_xz(spec, inst.get("rotationY", 0))
        if "toward" in face:
            target = by_id[face["toward"]]["position"]
        else:
            target = face["towardPoint"]
        dx = target[0] - inst["position"][0]
        dz = target[2] - inst["position"][2]
        dot = (fx * dx + fz * dz) / (math.hypot(dx, dz) or 1)
        if dot < 0.75:
            errors.append(f"{face['id']} faces away dot={dot:.2f}")

    if not (0.76 <= access["h"] <= 0.86):
        errors.append(f"accessible counter height {access['h']}")
    if not (1.02 <= desk["h"] <= 1.12):
        errors.append(f"reception counter height {desk['h']}")
    if not (0.05 <= sc["h"] <= 0.1):
        errors.append(f"walk-on scale height {sc['h']}")
    if not (0.8 <= table["h"] <= 0.92):
        errors.append(f"exam table height {table['h']}")
    cat_scale = build["catScale"]
    if not (0.18 <= cat_scale["w"] <= 0.24 and 0.1 <= cat_scale["h"] <= 0.14):
        errors.append("cat counter scale is not the inspected 200 x 116 mm class")
    chair_h = LAYOUT["assets"]["simple_chair"]["targetHeight"]
    bench_h = LAYOUT["assets"]["museum_bench"]["targetHeight"]
    if not (0.84 <= chair_h <= 0.95):
        errors.append(f"chair height {chair_h}")
    if not (0.42 <= bench_h <= 0.5):
        errors.append(f"bench height {bench_h}")

    cats = [by_id["cat_chair_a"], by_id["cat_chair_b"]]
    dogs = [by_id["dog_chair_n"], by_id["dog_chair_s"], by_id["dog_bench"]]
    if max(c["position"][0] for c in cats) >= screen["x"]:
        errors.append("cat seats are not on the screened side")
    if min(c["position"][0] for c in dogs) <= screen["x"]:
        errors.append("dog seats are not separated from the cat alcove")
    if len(build["carriers"]) != 3:
        errors.append("expected three carriers")
    perch_ids = [c["id"] for c in build["carriers"] if c["y"] > 0.4]
    if perch_ids != ["carrier_perch"]:
        errors.append("one carrier must sit on a perch, not the floor")
    if abs(by_id["cat_chair_a"]["rotationY"] - (-math.pi / 2)) > 0.02:
        errors.append("cat chairs should yaw -pi/2 toward the perch wall")
    if build["perches"][1]["d"] < build["carriers"][0]["w"] - 0.02:
        errors.append("middle perch is shorter than the carrier")

    for needed in ("cat_chair_a", "dog_bench", "dog_table", "staff_stool", "monitor_desk", "retail_shelf"):
        if needed not in by_id:
            errors.append(f"missing {needed}")

    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    print(f"layout ok — {len(LAYOUT['instances'])} instances, {len(build['pathways'])} pathways")


if __name__ == "__main__":
    main()
