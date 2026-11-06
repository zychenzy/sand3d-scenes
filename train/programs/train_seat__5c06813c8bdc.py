import sand3d as s3d


def bench():
    pedestal_placed = s3d.at(pedestal(), x=4179, y=-2256)
    seat_placed = s3d.at(seat(), x=4179, y=-2252.5, z=296)
    return s3d.assembly("bench", pedestal_placed, seat_placed)


def pedestal(w=900, d=435.4, h=296, body_w=865, bottom_d=291, body_d=405, bottom_h=17, rim_h=35, foot_w=882, foot_d=307, rear=206, bevel=4):
    profile = s3d.poly([(rear-bottom_d,bottom_h/2),(rear,bottom_h/2),(rear,h-rim_h+bevel),(rear-body_d,h-rim_h+bevel)])
    core = s3d.extrude("sloping_base", profile, h=body_w, both=True)
    core = s3d.at(core, rx=90, rz=90)
    rim = s3d.at(s3d.box("upper_rim", w=w, d=d, h=rim_h), z=h-rim_h)
    rim = s3d.chamfer(rim, d=bevel)
    foot = s3d.at(s3d.box("bottom_rim", w=foot_w, d=foot_d, h=bottom_h), y=rear-bottom_d/2)
    foot = s3d.chamfer(foot, d=bevel)
    solid = s3d.join(core, rim, foot)
    s3d.material(solid, "painted_metal", color="#898989")
    return s3d.group("pedestal_group", solid)


def seat(w=865, d=405, h=78, bevel=4):
    solid = s3d.at(s3d.box("seat", w=w, d=d, h=h+bevel), z=-bevel)
    solid = s3d.chamfer(solid, d=bevel)
    s3d.material(solid, "leather", color="#640e0e")
    backrest_placed = s3d.at(backrest(), y=147.5, z=74)
    return s3d.group("seat_group", solid, backrest_placed)


def backrest(w=865, d=110, h=293.5, top_d=65, bevel=4):
    profile = s3d.poly([(-d/2,0),(d/2,0),(d/2,h),(d/2-top_d,h)])
    solid = s3d.extrude("backrest", profile, h=w, both=True)
    solid = s3d.at(solid, rx=90, rz=90)
    solid = s3d.chamfer(solid, d=bevel)
    s3d.material(solid, "leather", color="#640e0e")
    return s3d.group("backrest_group", solid)
