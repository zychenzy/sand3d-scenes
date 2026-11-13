import sand3d as s3d


def scissors():
    base = s3d.at(handle_frame(), z=0)
    return s3d.assembly("scissors", base)


def handle_frame(w=60.63, d=8.773, h=70):
    side = [(0,19),(2,9),(5,3),(16,0),(27,5),(w/2,16),(w/2,29),(27,46),(18,h),(0,h)]
    outline = s3d.spline(side + [(-x,z) for x,z in reversed(side[1:-1])], closed=True)
    rim = s3d.extrude("rim", outline, h=d)
    pts = [(16,4),(24,7),(27,26),(25,42),(18,51),(8,47),(4,26),(5,11)]
    tool = s3d.extrude("opening", s3d.spline(pts, closed=True), h=d)
    rim = s3d.cut(rim, tool, s3d.transform(s3d.copy(tool), mirror="x"))
    rim = s3d.at(rim, rx=90, y=d/2)
    s3d.material(rim, "plastic", color="#006b89")
    blades = s3d.at(blade_pair(), z=h-1)
    return s3d.group("handle_frame", rim, blades)


def blade_pair(w=28, d=3.6, h=111):
    p = [(0,h), (0.7,h-1), (7,25), s3d.spline([(7,25),(8,17),(11,8),(w/2,0)]), (5,0), (0,8), (-5,0), (-w/2,0), s3d.spline([(-w/2,0),(-11,8),(-8,17),(-7,25)]), (-0.7,h-1)]
    blade = s3d.extrude("blades", s3d.poly(p), h=d)
    blade = s3d.at(blade, rx=90, y=d/2)
    s3d.material(blade, "steel", color="#c4c7c7")
    return s3d.group("blade_pair", blade)
