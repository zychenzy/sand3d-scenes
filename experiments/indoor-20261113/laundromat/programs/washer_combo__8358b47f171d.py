# objaverse-8358b47f171d43e98f473083ce55b36e
# "Washer Dryer Machine" by rhcreations, https://sketchfab.com/3d-models/8358b47f171d43e98f473083ce55b36e, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9943616572783113 sand3d=1.5.0

import sand3d as s3d


def washer():
    cabinet_placed = s3d.at(cabinet(), x=0, y=0, z=0)
    door_placed = s3d.at(door(), x=321, y=0, z=165)
    controls_placed = s3d.at(controls(), x=323, y=0, z=731.5)
    return s3d.assembly("washer", cabinet_placed, door_placed, controls_placed)


def cabinet(w=650, d=650, h=850, edge_r=15, recess_w=132, recess_h=64, recess_z=760, recess_y=183, back_w=132, back_h=65, back_y=-212, back_z=63, depth=3):
    body = s3d.box("cabinet", w=w, d=d, h=h)
    body = s3d.fillet(body, r=edge_r)
    body = s3d.pocket(body, s3d.rect(w=recess_w, d=recess_h), depth=depth, on=body.face("+X").move(x=recess_y, y=recess_z + recess_h / 2))
    body = s3d.pocket(body, s3d.rect(w=recess_w * 1.4, d=recess_h * 1.6), depth=depth, on=body.face("+X").move(x=-recess_y, y=recess_z))
    body = s3d.pocket(body, s3d.rect(w=back_w, d=back_h), depth=depth, on=body.face("-X").move(x=back_y, y=back_z))
    s3d.material(body, "painted_metal", color="#ececec")
    return s3d.group("cabinet_group", body)


def door(d=548, thickness=29, base=6, front=16, inner_d=426, bevel=12):
    radius = d / 2
    inner = inner_d / 2
    profile = s3d.poly([(0, 0), (radius - bevel, 0), (radius, base), (radius, front), (radius - bevel / 3, thickness - bevel / 3), (radius - bevel, thickness), (inner + bevel / 3, thickness), (inner, front), (0, front)])
    solid = s3d.revolve("door", profile)
    solid = s3d.at(solid, x=0, z=radius, ry=90)
    s3d.material(solid, "plastic", color="#ececec")
    return s3d.group("door_group", solid)


def controls(knob_d=77, knob_depth=24, knob_z=59.5, button_d=26, button_depth=10, button_pitch=116, button_z=21.5, power_d=34, power_y=273, power_z=58.5):
    knob = s3d.cylinder("selector", d=knob_d, h=knob_depth)
    knob = s3d.fillet(knob, r=4)
    knob = s3d.at(knob, x=0, z=knob_z, ry=90)
    s3d.material(knob, "plastic", color="#ececec")
    button = s3d.cylinder("button", d=button_d, h=button_depth)
    button = s3d.at(button, ry=90)
    buttons = s3d.at(button, on=s3d.grid(nx=1, ny=2, py=button_pitch), z=button_z)
    s3d.material(buttons, "plastic", color="#b0aeaf")
    power = s3d.cylinder("power", d=power_d, h=button_depth / 2)
    power = s3d.at(power, x=0, y=power_y, z=power_z, ry=90)
    s3d.material(power, "plastic", color="#ececec")
    return s3d.group("controls_group", knob, buttons, power)
