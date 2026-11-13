# objaverse-ea0080f2433b41578145944a3d0b350c
# "Dryer" by ra3id, https://sketchfab.com/3d-models/ea0080f2433b41578145944a3d0b350c, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.959127447402425 sand3d=1.5.0

import sand3d as s3d


def washer():
    cabinet_placed = s3d.at(cabinet(), x=-12, y=-21)
    top_cap_placed = s3d.at(top_cap(), x=-12, y=-30, z=814)
    control_band_placed = s3d.at(control_band(), x=-12, y=267, z=692)
    door_placed = s3d.at(door(), x=-10, y=213, z=104)
    return s3d.assembly("washer", cabinet_placed, top_cap_placed, control_band_placed, door_placed)


def cabinet(w=664, d=602, h=824, opening=411, door_z=351, recess=90, wall=5):
    body = s3d.box("enamel_cabinet", w=w, d=d, h=h)
    s3d.shell(body, t=wall, open="top bottom")
    s3d.hole(body, d=opening, depth=recess, on=s3d.Frame(origin=(2,d/2,door_z), normal=(0,1,0)))
    s3d.material(body, "painted_metal", color="#e5e5e4")
    return s3d.group("cabinet_group", body)


def top_cap(w=664, d=584, h=36, bevel=5, seam=5):
    lid = s3d.box("lid", w=w, d=d, h=h)
    s3d.chamfer(lid, d=bevel)
    s3d.shell(lid, t=seam, open="bottom")
    s3d.material(lid, "painted_metal", color="#e5e5e4")
    trim = s3d.at(s3d.box("lid_trim", w=w-bevel, d=d-bevel, h=seam), z=-seam/2)
    s3d.shell(trim, t=seam/2, open="top bottom")
    s3d.material(trim, "plastic", color="#9c9d9c")
    return s3d.group("top_cap_group", lid, trim)


def control_band(w=644, d=26, h=122, knob_d=59, knob_depth=20, seam=5):
    fascia = s3d.box("control_fascia", w=w, d=d, h=h)
    s3d.shell(fascia, t=seam, open="-Y")
    s3d.material(fascia, "plastic", color="#f7f7f7")
    strip = s3d.at(s3d.box("lower_seam", w=w, d=seam, h=seam), y=d/2-seam/2, z=-seam/2)
    s3d.material(strip, "rubber", color="#494949")
    knob = s3d.at(s3d.cylinder("selector", d=knob_d, h=knob_depth), y=d/2-1, z=745-692, rx=-90)
    s3d.fillet(knob, r=2, edges="top")
    s3d.material(knob, "plastic", color="#94a3b3")
    return s3d.group("control_band_group", fascia, strip, knob)


def door(w=494, d=80, h=494, opening=411, lip=8, rear=4):
    rim = s3d.revolve("sloping_door_rim", s3d.poly(pts=[(opening/2,0),(w/2-lip,0),(w/2,d-lip),(w/2-lip,d),(opening/2+lip,d),(opening/2,d-lip)]))
    s3d.fillet(rim, r=lip/3)
    s3d.material(rim, "plastic", color="#94a3b3")
    glass = s3d.cylinder("recessed_glazing", d=opening+rear, h=rear)
    s3d.material(glass, "glossy_plastic", color="#494949")
    rim = s3d.at(rim, z=h/2, rx=-90)
    glass = s3d.at(glass, z=h/2, rx=-90)
    return s3d.group("door_group", rim, glass)
