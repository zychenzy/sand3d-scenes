import sand3d as s3d


def easel():
    p = s3d.at(panel(), x=-273, y=-175, z=404)
    r = s3d.at(side_rail(), x=-597, y=-184, z=-5)
    twin = s3d.transform(s3d.copy(r), mirror="x", x=-560)
    prop = s3d.at(rear_prop(), x=-269, y=475, z=-5)
    ledge = s3d.at(lower_ledge(), x=-280, y=-166, z=385)
    cap = s3d.at(upper_crosspiece(), x=-273, y=22, z=1159)
    return s3d.assembly("easel", p, r, twin, prop, ledge, cap)


def panel(w=494, t=40, h=772, lean=177):
    ob = s3d.loft("panel", s3d.station(z=0, w=w, d=t, n=100), s3d.station(z=h, w=w, d=t, y=lean, n=100))
    s3d.material(ob, "plastic", color="#bfc0b2")
    return s3d.group("panel_group", ob)


def side_rail(w=73, d=55, h=1700, dx=194, dy=331, top_w=51, top_d=31, foot_d=109, foot_h=36):
    rail = s3d.loft("rail", s3d.station(z=0, w=w, d=d, n=100), s3d.station(z=h, w=top_w, d=top_d, x=dx, y=dy, n=100))
    foot = s3d.loft("foot", s3d.station(z=0, w=w, d=foot_d, y=-(foot_d-d)/2, n=100), s3d.station(z=foot_h, w=w, d=d, x=dx*foot_h/h, y=dy*foot_h/h, n=100))
    s3d.join(rail, foot)
    s3d.material(rail, "oak", color="#dbbd9e")
    return s3d.group("side_rail_group", rail)


def rear_prop(w=74, d=54, h=1225, lean=-397, top_w=50, top_d=32, foot_d=109, foot_h=40):
    rail = s3d.loft("prop", s3d.station(z=0, w=w, d=d, n=100), s3d.station(z=h, w=top_w, d=top_d, y=lean, n=100))
    foot = s3d.loft("foot", s3d.station(z=0, w=w, d=foot_d, y=5, n=100), s3d.station(z=foot_h, w=w, d=d, y=lean*foot_h/h, n=100))
    s3d.join(rail, foot)
    s3d.material(rail, "oak", color="#dbbd9e")
    return s3d.group("rear_prop_group", rail)


def lower_ledge(w=607, shelf_w=494, depth=113, t=31, lip_d=30, lip_h=31):
    shelf = s3d.at(s3d.box("shelf", w=shelf_w, d=depth, h=t), y=32, z=19)
    lip = s3d.at(s3d.box("lip", w=w, d=lip_d, h=lip_h), y=-42, z=6, rx=-26)
    s3d.material(shelf, "oak", color="#dbbd9e")
    s3d.material(lip, "oak", color="#dbbd9e")
    return s3d.group("lower_ledge_group", shelf, lip)


def upper_crosspiece(w=494, d=66, h=37):
    cap = s3d.at(s3d.box("cap", w=w, d=d, h=h), rx=-13)
    s3d.material(cap, "oak", color="#dbbd9e")
    return s3d.group("upper_crosspiece_group", cap)
