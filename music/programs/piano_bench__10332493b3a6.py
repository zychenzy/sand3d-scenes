import sand3d as s3d


def table():
    top = s3d.at(tabletop(), x=-369.4, y=-230, z=385.3)
    frame = s3d.at(apron(), x=-369.4, y=-230, z=295)
    return s3d.assembly("table", top, frame)


def tabletop(w=900, d=433.3, h=20.7, inset=18):
    solid = s3d.loft("top", s3d.station(z=0, w=w-2*inset, d=d-2*inset, n=40), s3d.station(z=h*0.6, w=w, d=d, n=40), s3d.station(z=h, w=w, d=d, n=40))
    s3d.material(solid, "oak", color="#9d835a")
    return s3d.group("tabletop", solid)


def apron(w=855, d=389, h=91, t=16):
    solid = s3d.extrude("rails", s3d.rect(w=w, d=d), h=h)
    solid = s3d.cut(solid, s3d.extrude("inside", s3d.rect(w=w-2*t, d=d-2*t), h=h*3, both=True))
    s3d.material(solid, "oak", color="#9d835a")
    front = s3d.at(front_leg(), x=-386.6, y=-153, z=-361.6)
    front_image = s3d.transform(s3d.copy(front), mirror="x")
    back = s3d.at(back_leg(), x=-386.6, y=153, z=-361.6)
    back_image = s3d.transform(s3d.copy(back), mirror="x")
    return s3d.group("apron", solid, front, front_image, back, back_image)


def front_leg(w=50, foot=34, h=452.6, taper_h=361.6, r=5):
    solid = s3d.loft("leg", s3d.at(s3d.rect(w=foot, d=foot, r=r), z=0), s3d.at(s3d.rect(w=w, d=w, r=r), z=taper_h), s3d.at(s3d.rect(w=w, d=w, r=r), z=h))
    s3d.material(solid, "oak", color="#9d835a")
    return s3d.group("front_leg", solid)


def back_leg(w=50, foot=34, h=452.6, taper_h=361.6, r=5):
    solid = s3d.loft("leg", s3d.at(s3d.rect(w=foot, d=foot, r=r), z=0), s3d.at(s3d.rect(w=w, d=w, r=r), z=taper_h), s3d.at(s3d.rect(w=w, d=w, r=r), z=h))
    s3d.material(solid, "oak", color="#9d835a")
    return s3d.group("back_leg", solid)
