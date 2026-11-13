"""Indoor block butt with a vertical 40 cm three-spot.

Original sand3d program for this scene. The catalog round target
(objaverse-bafac3d3d41048fa8cd42c8d5ca81a4c) is an outdoor tripod boss:
no scoring rings, about 64 degrees of tilt, arrows in the back.
World Archery indoor allows 0–10 degrees and a vertical three-spot
whose middle face is centred at 130 cm. This butt is vertical.

Millimetres, Z up. The scoring faces sit on the -Y side so a glTF
Y-up export points them toward +Z (the archers).
"""

import sand3d as s3d

# Middle face centre, and the two companions, in assembly Z.
SPOTS = (880, 1300, 1760)
# Foam front is y=-180. The sheet sits just proud of it; rings step toward the archers.
RINGS = (
    (400, -196, "#f7f5ef"),  # white, 1–2
    (320, -201, "#2c3036"),  # black, 3–4
    (240, -206, "#3c7ec4"),  # blue, 5–6
    (160, -211, "#d4533c"),  # red, 7–8
    (80, -216, "#e6a820"),   # gold, 9
    (40, -221, "#f6d35a"),   # gold, 10
)


def indoor_butt():
    return s3d.assembly("indoor_butt", foam_stack(), stand(), face_card(), three_spot())


def foam_stack(w=900, d=360, h=1480, z0=560, layers=12):
    slabs = []
    step = h / layers
    colors = ("#e7d3b0", "#c9ae86")
    for i in range(layers):
        slab = s3d.box(f"foam_{i}", w=w, d=d, h=step - 2.2)
        s3d.material(slab, "fabric", color=colors[i % 2])
        slabs.append(s3d.at(slab, z=z0 + i * step))
    return s3d.group("foam_stack", *slabs)


def stand():
    parts = []
    for x, name in ((-310, "leg_l"), (310, "leg_r")):
        post = s3d.box(name, w=46, d=46, h=560)
        s3d.material(post, "painted_metal", color="#3e454c")
        parts.append(s3d.at(post, x=x))
        foot = s3d.box(name + "_foot", w=70, d=280, h=28)
        s3d.material(foot, "painted_metal", color="#2f353b")
        parts.append(s3d.at(foot, x=x, y=20))
    rail = s3d.box("bottom_rail", w=680, d=40, h=36)
    s3d.material(rail, "painted_metal", color="#3e454c")
    parts.append(s3d.at(rail, z=70))
    yoke = s3d.box("yoke", w=680, d=40, h=36)
    s3d.material(yoke, "painted_metal", color="#3e454c")
    parts.append(s3d.at(yoke, z=500))
    return s3d.group("stand", *parts)


def face_card():
    card = s3d.box("face_card", w=500, d=8, h=1340)
    s3d.material(card, "plastic", color="#fbfaf6")
    return s3d.at(card, y=-186, z=640)


def three_spot():
    rings = []
    for zi in SPOTS:
        for i, (d, y, color) in enumerate(RINGS):
            ring = s3d.cylinder(f"ring_{zi}_{i}", d=d, h=7)
            s3d.material(ring, "plastic", color=color)
            rings.append(s3d.at(ring, rx=90, y=y, z=zi))
    return s3d.group("three_spot", *rings)
