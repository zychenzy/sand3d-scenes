"""Ground quiver for the shooting line.

Original sand3d program. A tube on a splayed tripod with six fletched
arrows. Catalog quivers are hip or belt bags; none is a line quiver.
Millimetres, Z up.
"""

import sand3d as s3d


def ground_quiver():
    return s3d.assembly(
        "ground_quiver",
        cup(),
        tripod(),
        arrow_set(),
    )


def cup():
    wall = s3d.tube("cup", d=108, d_in=96, h=250)
    s3d.material(wall, "painted_metal", color="#2f4a3e")
    floor = s3d.cylinder("cup_floor", d=96, h=6)
    s3d.material(floor, "painted_metal", color="#24382f")
    rim = s3d.tube("rim", d=116, d_in=100, h=10)
    s3d.material(rim, "painted_metal", color="#d2b15a")
    return s3d.group(
        "cup",
        s3d.at(wall, z=250),
        s3d.at(floor, z=250),
        s3d.at(rim, z=492),
    )


def tripod():
    legs = []
    spreads = ((0, -150), (130, 80), (-130, 80))
    for i, (x, y) in enumerate(spreads):
        leg = s3d.wire(
            f"leg_{i}",
            path=[(x * 0.22, y * 0.22, 250), (x, y, 8)],
            d=12,
        )
        s3d.material(leg, "painted_metal", color="#3e454c")
        foot = s3d.sphere(f"foot_{i}", d=22)
        s3d.material(foot, "rubber", color="#2a2e32")
        legs.append(leg)
        legs.append(s3d.at(foot, x=x, y=y, z=8))
    return s3d.group("tripod", *legs)


def arrow_set():
    colors = ("#e25b2a", "#f2c14e", "#f4f1ea", "#3c7ec4", "#d4533c", "#6aaa4a")
    spots = ((-22, -8), (0, -16), (22, -6), (-14, 14), (12, 16), (0, 4))
    parts = []
    for i, ((x, y), color) in enumerate(zip(spots, colors)):
        shaft = s3d.cylinder(f"shaft_{i}", d=6.4, h=520)
        s3d.material(shaft, "pine", color="#c2a06a")
        point = s3d.cone(f"point_{i}", d=9, h=28)
        s3d.material(point, "steel", color="#8e969c")
        parts.append(s3d.at(shaft, x=x, y=y, z=300))
        parts.append(s3d.at(point, x=x, y=y, z=812))
        for k, rz in enumerate((0, 120, 240)):
            vane = s3d.box(f"vane_{i}_{k}", w=28, d=1.4, h=70)
            s3d.material(vane, "plastic", color=color)
            parts.append(s3d.at(vane, x=x, y=y, z=340, rz=rz))
    return s3d.group("arrows", *parts)
