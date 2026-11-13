import sand3d as s3d


def razor():
    grip = s3d.at(handle(), x=-1.7, y=0, z=19)
    steel = s3d.at(blade(), x=-1, y=0, z=38)
    return s3d.assembly("razor", grip, steel)


def handle(t=3.6, spacing=3.5, edge=1, base=19):
    outline = s3d.spline([(-16,107-base),(16,141-base),(23,143-base),(23,138-base),(1,108-base),(-9,92-base),(-38,25-base),(-45,21-base),(-49,22-base),(-53,28-base),(-53,34-base),(-31,83-base)], closed=True)
    scale = s3d.extrude("scale", outline, h=t, both=True)
    scale = s3d.fillet(scale, r=edge, edges="top bottom")
    scale = s3d.at(scale, x=-spacing, rx=90, rz=90)
    other = s3d.transform(s3d.copy(scale), mirror="x")
    s3d.material(scale, "walnut", color="#433122")
    s3d.material(other, "walnut", color="#433122")
    return s3d.group("handle", scale, other)


def blade(t=2.5, base=38):
    outline = s3d.poly([(38,114-base),(95,51-base),(93,45-base),(91,42-base),(81,38-base),(23,102-base),(32,109-base),(0,141-base),(-4,147-base),(-8,158-base),(-4,157-base),(-2,148-base),(2,144-base),(22,129-base)])
    metal = s3d.extrude("blade", outline, h=t, both=True)
    metal = s3d.at(metal, rx=90, rz=90)
    s3d.material(metal, "steel", color="#000000", roughness=0.5)
    return s3d.group("blade", metal)
