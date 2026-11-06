import sand3d as s3d


def counter():
    base = s3d.at(counter_base(), x=213.7, y=212.2, z=0)
    return s3d.assembly("counter", base)


def counter_base(w=1734, d=821, h=400, arm=396, return_w=295, edge=3.3):
    outline = s3d.poly([(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(w/2-return_w,d/2),(w/2-return_w,-d/2+arm),(-w/2,-d/2+arm)])
    solid = s3d.extrude("base", outline, h=h)
    solid = s3d.fillet(solid, r=edge)
    s3d.material(solid, kind="painted_metal", color="#808080")
    top = s3d.at(counter_top(), x=0, y=0, z=h-2.5)
    return s3d.group("counter_base", solid, top)


def counter_top(w=1800, d=886.3, h=57.4, arm=462, return_w=360, edge=3.3):
    outline = s3d.poly([(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(w/2-return_w,d/2),(w/2-return_w,-d/2+arm),(-w/2,-d/2+arm)])
    solid = s3d.extrude("top", outline, h=h)
    solid = s3d.fillet(solid, r=edge)
    s3d.material(solid, kind="plastic", color="#969696")
    return s3d.group("counter_top", solid)
