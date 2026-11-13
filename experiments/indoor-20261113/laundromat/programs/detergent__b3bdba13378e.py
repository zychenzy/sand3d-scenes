# objaverse-b3bdba13378e42caa3574f54e96ee32e
# "parquet detergent with almond oil 1220ml" by alex.shulai, https://sketchfab.com/3d-models/b3bdba13378e42caa3574f54e96ee32e, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9889409492052014 sand3d=1.5.0

import sand3d as s3d


def bottle():
    body = s3d.at(bottle_body(), x=-72.46, y=-10.3, z=7.2)
    closure = s3d.at(cap(), x=-72, y=-17, z=251.2)
    return s3d.assembly("bottle", body, closure)


def bottle_body(w=65, h=246, n=2.8):
    sections = []
    for z, d, y in [(0, 100, -3), (5, 120, -2), (12, 126, -1), (28, 128.7, 0), (69, 118, 2), (116, 95, 1), (147, 87, -4), (185, 93, -12), (220, 102, -12), (237, 84, -8), (246, 40, -7)]:
        width = min(w - z / h * (w - 53), w - 10 + z)
        sections.append(s3d.station(z=z, w=width, d=d, y=y, n=n))
    body = s3d.loft("bottle_body", *sections)
    s3d.material(body, kind="plastic", color="#302564")
    return s3d.group("bottle_body", body)


def cap(d=42, h=46, collar_h=5, top_d=29):
    collar = s3d.cone("collar", d=d, d2=d-2, h=collar_h)
    lid = s3d.at(s3d.cone("cap", d=d-3, d2=top_d, h=h-collar_h+1), z=collar_h-1)
    closure = s3d.join(collar, lid)
    s3d.material(closure, kind="plastic", color="#402893")
    return s3d.group("cap", closure)
