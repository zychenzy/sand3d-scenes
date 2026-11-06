import sand3d as s3d


def pendant():
    shade_placed = s3d.at(shade(), x=1.95, y=1.42, z=-424)
    bulb_placed = s3d.at(bulb(), x=1.95, y=1.42, z=-449)
    suspension_cord_placed = s3d.at(suspension_cord(), x=1.95, y=1.42, z=-224)
    return s3d.assembly("pendant", shade_placed, bulb_placed, suspension_cord_placed)


def shade(h=201, t=1.3, neck_r=13):
    pts = [(116, 0), (122, 14), (122.85, 29), (118, 46), (108, 66), (94, 85), (63, 118), (46, 140), (neck_r, h)]
    inside = [(r-t, z) for r, z in reversed(pts)]
    outline = s3d.poly([s3d.spline(pts), inside[0], s3d.spline(inside), pts[0]])
    solid = s3d.revolve("shade", outline)
    s3d.material(solid, "painted_metal", color="#ad6100", roughness=0.45)
    return s3d.group("shade_group", solid)


def bulb(w=97, h=105, stem_d=43, stem_h=39, socket_d=25, socket_h=82):
    pts = [(0, 0), (w*0.3, 5), (w/2, 26), (w/2, 45), (w*0.42, 69), (stem_d/2, h), (0, h)]
    solid = s3d.revolve("bulb", s3d.poly([s3d.spline(pts[:-1]), pts[-1]]))
    stem = s3d.at(s3d.cylinder("holder", d=stem_d, h=stem_h), z=h-1)
    socket = s3d.at(s3d.cylinder("socket", d=socket_d, h=socket_h), z=h+stem_h-2)
    s3d.material(solid, "glass", color="#d9d9d9", roughness=0.3)
    s3d.material(stem, "ceramic", color="#d9d9d9")
    s3d.material(socket, "ceramic", color="#d9d9d9")
    return s3d.group("bulb_group", solid, stem, socket)


def suspension_cord(w=1, h=212):
    solid = s3d.cylinder("suspension_cord", d=w, h=h)
    s3d.material(solid, "rubber", color="#000000")
    ceiling_cap_placed = s3d.at(ceiling_cap(), z=h)
    return s3d.group("suspension_cord_group", solid, ceiling_cap_placed)


def ceiling_cap(w=48, h=12):
    solid = s3d.cylinder("ceiling_cap", d=w, h=h)
    s3d.material(solid, "painted_metal", color="#000000")
    return s3d.group("ceiling_cap_group", solid)
