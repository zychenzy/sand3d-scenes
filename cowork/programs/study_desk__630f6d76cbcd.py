import sand3d as s3d


def desk():
    top_placed = s3d.at(top(), x=1053, y=-989, z=621.5)
    cabinet_placed = s3d.at(cabinet(), x=1051, y=-1335, z=73)
    end_frame_placed = s3d.at(end_frame(), x=1049, y=-533, z=-6.5)
    return s3d.assembly("desk", top_placed, cabinet_placed, end_frame_placed)


def top(w=369.1, d=1070, h=21):
    solid = s3d.box("top", w=w, d=d, h=h)
    s3d.material(solid, "oak", color="#936931")
    return s3d.group("top_group", solid)


def cabinet(w=264, d=348, h=550, inset=10, stile=30):
    profile = s3d.poly([(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2),(-w/2,d/2-stile),(-w/2+inset,d/2-stile),(-w/2+inset,-d/2+stile),(-w/2,-d/2+stile)])
    solid = s3d.extrude("cabinet", profile, h=h)
    s3d.material(solid, "oak", color="#936931")
    plinth_placed = s3d.at(plinth(), x=0, z=-79)
    return s3d.group("cabinet_group", solid, plinth_placed)


def plinth(w=333, d=438, h=82):
    solid = s3d.box("plinth", w=w, d=d, h=h)
    s3d.material(solid, "oak", color="#936931")
    return s3d.group("plinth_group", solid)


def end_frame(w=292, d=89, h=629, post=36, low_z=71.5, low_h=20, upper_z=464.5):
    upright = s3d.at(s3d.box("upright", w=post, d=d, h=h), x=-(w-post)/2)
    twin = s3d.transform(s3d.copy(upright), mirror="x")
    low = s3d.at(s3d.box("low_rail", w=w-post, d=d, h=low_h), z=low_z)
    upper = s3d.at(s3d.box("upper_rail", w=w-post, d=d, h=h-upper_z), z=upper_z)
    solid = s3d.join(upright, twin, low, upper)
    s3d.material(solid, "oak", color="#936931")
    return s3d.group("end_frame_group", solid)
