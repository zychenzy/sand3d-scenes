import sand3d as s3d


def table():
    tabletop_placed = s3d.at(tabletop(), x=-43.3, z=-22.7)
    front_leg_placed = s3d.at(front_leg(), x=599, y=-192, z=-693)
    front_leg_image = s3d.transform(s3d.copy(front_leg_placed), mirror="x", x=-91.6)
    rear_leg_placed = s3d.at(rear_leg(), x=599, y=193, z=-693)
    rear_leg_image = s3d.transform(s3d.copy(rear_leg_placed), mirror="x", x=-91.6)
    return s3d.assembly("table", tabletop_placed, front_leg_placed, front_leg_image, rear_leg_placed, rear_leg_image)


def tabletop(w=1800, d=937.6, h=57, bevel=12):
    slab = s3d.box("tabletop", w=w, d=d, h=h)
    slab = s3d.chamfer(slab, d=bevel, edges="top")
    s3d.material(slab, "oak", color="#7a5741")
    return s3d.group("tabletop_group", slab)


def front_leg(h=674, foot=86, head=71, dx=166, dy=124, cx=81, cy=-62):
    leg = s3d.loft("front_leg", s3d.station(z=0, w=foot, d=foot, x=cx, y=cy, n=20), s3d.station(z=h, w=head, d=head, x=cx-dx, y=cy+dy, n=20))
    s3d.material(leg, "oak", color="#7a5741")
    return s3d.group("front_leg_group", leg)


def rear_leg(h=674, foot=86, head=71, dx=166, dy=124, cx=81, cy=62):
    leg = s3d.loft("rear_leg", s3d.station(z=0, w=foot, d=foot, x=cx, y=cy, n=20), s3d.station(z=h, w=head, d=head, x=cx-dx, y=cy-dy, n=20))
    s3d.material(leg, "oak", color="#7a5741")
    return s3d.group("rear_leg_group", leg)
