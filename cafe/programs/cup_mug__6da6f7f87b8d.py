import sand3d as s3d


def cup():
    body = s3d.at(cup_body(), z=0)
    return s3d.assembly("cup", body)


def cup_body(bottom_d=54, top_d=72, h=76, foot_wall=2, recess=3):
    body = s3d.revolve("body", s3d.poly([(bottom_d / 2 - foot_wall, 0), (bottom_d / 2, 0), (top_d / 2, h), (0, h), (0, recess), (bottom_d / 2 - foot_wall, recess)]))
    s3d.material(body, kind="plastic", color="#ffffc0")
    band = s3d.at(sleeve(), z=30)
    cap = s3d.at(lid(), z=74)
    return s3d.group("cup_body", body, band, cap)


def sleeve(bottom_d=66, top_d=72, h=26):
    band = s3d.cone("sleeve", d=bottom_d, d2=top_d, h=h)
    s3d.material(band, kind="plastic", color="#ec6000")
    return s3d.group("sleeve", band)


def lid(bottom_d=75.2, top_d=72, h=16, rim=2, recess=4, underside=1.5):
    cap = s3d.revolve("lid", s3d.poly([(bottom_d / 2, 0), (top_d / 2, h), (top_d / 2 - rim, h), (top_d / 2 - rim, h - recess), (0, h - recess), (0, underside), (bottom_d / 2 - rim, underside)]))
    s3d.material(cap, kind="plastic", color="#717171")
    return s3d.group("lid", cap)
