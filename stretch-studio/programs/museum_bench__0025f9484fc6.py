import sand3d as s3d


def bench():
    seat_placed = s3d.at(seat(), z=375)
    end_support_placed = s3d.at(end_support(), y=-564)
    opposite_support_placed = s3d.at(opposite_support(), y=564)
    return s3d.assembly("bench", seat_placed, end_support_placed, opposite_support_placed)


def seat(w=375, d=1500, h=81):
    slab = s3d.box("seat", w=w, d=d, h=h)
    s3d.material(slab, "oak", color="#ccb273")
    return s3d.group("seat_group", slab)


def end_support(d=44, h=380):
    limb = support_limb(d=d, h=h)
    twin = s3d.transform(s3d.copy(limb), mirror="x")
    support = s3d.join(limb, twin)
    s3d.material(support, "steel", color="#c1c7d3")
    return s3d.group("end_support_group", support)


def support_limb(d, h):
    return s3d.loft("curved_limb",
        s3d.station(z=0, x=177, w=64, d=d/8),
        s3d.station(z=12, x=159, w=68, d=d),
        s3d.station(z=51, x=107, w=52, d=d),
        s3d.station(z=98, x=68, w=46, d=d),
        s3d.station(z=137, x=45, w=45, d=d),
        s3d.station(z=185, x=19, w=40, d=d),
        s3d.station(z=223, x=48, w=47, d=d),
        s3d.station(z=293, x=84, w=37, d=d),
        s3d.station(z=330, x=77, w=38, d=d),
        s3d.station(z=h, x=61, w=42, d=d))


def opposite_support(d=44, h=380):
    limb = support_limb(d=d, h=h)
    twin = s3d.transform(s3d.copy(limb), mirror="x")
    support = s3d.join(limb, twin)
    s3d.material(support, "steel", color="#c1c7d3")
    return s3d.group("opposite_support_group", support)
