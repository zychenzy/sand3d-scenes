import sand3d as s3d


def pedestal_table():
    top = s3d.at(tabletop(), y=2148, z=204)
    base = s3d.at(crossed_supports(), y=2148, z=-276)
    return s3d.assembly("pedestal_table", top, base)


def tabletop(w=900, lower=865, neck=842, h=51, lip=10, shoulder=4, waist=19):
    top = s3d.loft("stepped_top", s3d.station(z=0, w=lower, d=lower, n=100), s3d.station(z=lip, w=lower, d=lower, n=100), s3d.station(z=lip+shoulder, w=neck, d=neck, n=100), s3d.station(z=lip+shoulder+waist, w=neck, d=neck, n=100), s3d.station(z=h-lip, w=w, d=w, n=100), s3d.station(z=h, w=w, d=w, n=100))
    s3d.material(top, "painted_metal", color="#483c2f", roughness=0.7)
    return s3d.group("tabletop", top)


def crossed_supports(h=479, foot_span=588, thickness=25, band=23):
    spindle = s3d.revolve("pedestal", s3d.poly([(0,80),(24,80),(50,206),(42,226),(50,246),(39,302),(66,401),(63,426),(36,h),(0,h)]))
    path = s3d.spline([(-foot_span/2,8),(-245,65),(-150,118),(0,133),(150,118),(245,65),(foot_span/2,8)])
    arch = s3d.extrude("curved_feet", s3d.stroke(path, t=band), h=thickness)
    arch = s3d.at(arch, rx=90, y=thickness/2)
    twin = s3d.at(s3d.copy(arch), rz=90)
    s3d.material(spindle, "painted_metal", color="#483c2f", roughness=0.7)
    s3d.material(arch, "painted_metal", color="#483c2f", roughness=0.7)
    s3d.material(twin, "painted_metal", color="#483c2f", roughness=0.7)
    return s3d.group("crossed_supports", spindle, arch, twin)
