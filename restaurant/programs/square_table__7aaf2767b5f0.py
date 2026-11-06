import sand3d as s3d


def table():
    top = s3d.at(tabletop(), x=580.8, y=-523.2, z=1155)
    front = s3d.at(apron_front(), x=580.8, y=32, z=1037)
    back = s3d.at(apron_back(), x=580.8, y=-1078.5, z=1037)
    side = s3d.at(apron_side(), x=20.5, y=-523.2, z=1037)
    side_image = s3d.transform(s3d.copy(side), mirror="x", x=1161.6)
    front_leg = s3d.at(leg_front(), x=36, y=17)
    front_image = s3d.transform(s3d.copy(front_leg), mirror="x", x=1161.6)
    back_leg = s3d.at(leg_back(), x=36, y=-1063)
    back_image = s3d.transform(s3d.copy(back_leg), mirror="x", x=1161.6)
    return s3d.assembly("table", top, front, back, side, side_image, front_leg, front_image, back_leg, back_image)


def tabletop(w=1200, d=1200, h=29):
    top = s3d.box("top", w=w, d=d, h=h)
    s3d.material(top, "oak", color="#a47a4d")
    return s3d.group("tabletop", top)


def apron_front(w=1040, d=29, h=120):
    rail = s3d.box("rail", w=w, d=d, h=h)
    s3d.material(rail, "oak", color="#a47a4d")
    return s3d.group("apron_front", rail)


def apron_back(w=1040, d=29, h=120):
    rail = s3d.box("rail", w=w, d=d, h=h)
    s3d.material(rail, "oak", color="#a47a4d")
    return s3d.group("apron_back", rail)


def apron_side(w=29, d=1030, h=120):
    rail = s3d.box("rail", w=w, d=d, h=h)
    s3d.material(rail, "oak", color="#a47a4d")
    return s3d.group("apron_side", rail)


def leg_front(w=72, foot=53, taper_h=340, h=1156):
    shift = (w-foot)/2
    leg = s3d.loft("leg", s3d.station(z=0, w=foot, d=foot, x=-shift, y=shift, n=100), s3d.station(z=taper_h, w=w, d=w, n=100), s3d.station(z=h, w=w, d=w, n=100))
    s3d.material(leg, "oak", color="#a47a4d")
    return s3d.group("leg_front", leg)


def leg_back(w=72, foot=53, taper_h=340, h=1156):
    shift = (w-foot)/2
    leg = s3d.loft("leg", s3d.station(z=0, w=foot, d=foot, x=-shift, y=-shift, n=100), s3d.station(z=taper_h, w=w, d=w, n=100), s3d.station(z=h, w=w, d=w, n=100))
    s3d.material(leg, "oak", color="#a47a4d")
    return s3d.group("leg_back", leg)
