import sand3d as s3d


def pedestal():
    base_placed = s3d.at(base(), x=5693, z=-51)
    column_placed = s3d.at(column(), x=5693, z=35)
    return s3d.assembly("pedestal", base_placed, column_placed)


def base(w=665.4, d=665.4, h=63, ledge=337, rise=16):
    solid = s3d.box("plinth", w=w, d=d, h=h)
    step = s3d.at(s3d.box("ledge", w=ledge, d=ledge, h=rise+1), z=h-1)
    solid = s3d.join(solid, step)
    s3d.material(solid, "walnut", color="#453020")
    return s3d.group("base_group", solid)


def column(w=275, d=275, h=1017, core=205, strip=35, shoulder=20, foot=227, trim_h=40, bottom=-7):
    solid = s3d.at(s3d.box("recessed_faces", w=core, d=core, h=h), z=bottom)
    posts = s3d.at(s3d.box("corner_strips", w=strip, d=strip, h=h), on=s3d.grid(nx=2, ny=2, px=w-strip, py=d-strip), z=bottom)
    shoulders = s3d.at(s3d.box("edge_steps", w=shoulder, d=shoulder, h=h), on=s3d.grid(nx=2, ny=2, px=core, py=core), z=bottom)
    lower = s3d.at(s3d.box("foot_trim", w=foot, d=foot, h=trim_h), z=bottom)
    upper = s3d.at(s3d.box("head_trim", w=foot, d=foot, h=trim_h), z=bottom+h-trim_h)
    solid = s3d.join(solid, posts, shoulders, lower, upper)
    s3d.material(solid, "walnut", color="#2b1b12")
    top_placed = s3d.at(top(), z=1016)
    return s3d.group("column_group", solid, top_placed)


def top(w=451, d=656, h=98, thick=26, flat=122, drop=42, core=205):
    profile = s3d.poly([(-w/2,h-thick), (-w/2,h), (-w/2+flat,h), (w/2,h-drop), (w/2,h-drop-thick), (-w/2+flat,h-thick)])
    cap = s3d.at(s3d.extrude("sloping_cap", profile, h=d), y=d/2, rx=90)
    neck = s3d.box("neck", w=core, d=core, h=h-thick-drop/2)
    cap = s3d.join(cap, neck)
    s3d.material(cap, "walnut", color="#4c3522")
    return s3d.group("top_group", cap)
