import sand3d as s3d


def terminal():
    base = s3d.at(housing(), z=-10)
    return s3d.assembly("terminal", base)


def housing(w=80.87, edge=1.5):
    outline = s3d.poly([(-100,14), s3d.spline([(-97,7),(-86,0),(-76,1),(18,21),(29,20),(49,8),(95,19),(100,26),(83,53),(63,61),(43,57)]), (48,35),(46,35),(39,56),(-99,18)])
    body = s3d.extrude("housing", outline, h=w, both=True)
    body = s3d.at(body, rx=90, rz=90)
    body = s3d.fillet(body, r=edge)
    body = s3d.pocket(body, s3d.rect(w=64, d=edge), depth=edge*2, on=s3d.Frame(origin=(0,62,61)))
    s3d.material(body, "plastic", color="#3e3939")
    display = s3d.at(screen(), y=-29, z=38, rx=15.8)
    return s3d.group("housing", body, display)


def screen(w=74, d=137, t=1, r=3):
    glass = s3d.extrude("screen", s3d.rect(w=w, d=d, r=r), h=t)
    s3d.material(glass, "glass", color="#151515", roughness=0.25)
    return s3d.group("screen", glass)
