import sand3d as s3d


def amplifier():
    body = s3d.at(cabinet(), x=-20.24, y=0.9, z=1.9)
    grille = s3d.at(front_grille(), x=-20.24, y=-85, z=50)
    controls = s3d.at(front_controls(), x=-20.24, y=-83, z=343)
    back = s3d.at(back_panel(), x=-20.24, y=104, z=49)
    rear = s3d.at(back_controls(), x=-20.24, y=87, z=338)
    return s3d.assembly('amplifier', body, grille, controls, back, rear)


def cabinet(w=446, d=221, h=395, bottom=14, radius=22, opening=380, sill=48, ceiling=391, recess=27, foot_d=18, foot_h=16, foot_x=324, foot_y=144, rear_h=285, rear_depth=10):
    body = s3d.box('cabinet', w=w, d=d, h=h)
    body = s3d.fillet(body, r=radius)
    body = s3d.at(body, z=bottom)
    tool = s3d.box('front_opening', w=opening, d=recess*2, h=ceiling-sill)
    tool = s3d.at(tool, y=-d/2, z=sill)
    body = s3d.cut(body, tool)
    tool = s3d.box('rear_strip', w=opening, d=recess*2, h=ceiling-336)
    body = s3d.cut(body, s3d.at(tool, y=d/2, z=336))
    tool = s3d.box('rear_inset', w=opening-2, d=rear_depth*2, h=rear_h)
    body = s3d.cut(body, s3d.at(tool, y=d/2, z=sill-1))
    s3d.material(body, 'plastic', color='#191818', roughness=0.78)
    feet = s3d.at(s3d.cylinder('feet', d=foot_d, h=foot_h), on=s3d.grid(nx=2, ny=2, px=foot_x, py=foot_y))
    s3d.material(feet, 'rubber', color='#111111')
    return s3d.group('cabinet', body, feet)


def front_grille(w=378, d=6, h=291):
    panel = s3d.box('grille', w=w, d=d, h=h)
    panel = s3d.fillet(panel, r=d/3)
    s3d.material(panel, 'fabric', color='#191919', roughness=0.95)
    return s3d.group('front_grille', panel)


def front_controls(w=378, d=6, h=50, knob_d=16, knob_h=17, pitch=29, count=9):
    panel = s3d.box('control_strip', w=w, d=d, h=h)
    s3d.material(panel, 'painted_metal', color='#171716')
    knob = s3d.cylinder('knob', d=knob_d, h=knob_h)
    s3d.material(knob, 'plastic', color='#39372d')
    knobs = s3d.at(knob, on=s3d.grid(nx=count, px=pitch), x=-20, y=-d/2, z=22, rx=90)
    switch = s3d.at(s3d.box('switch', w=18, d=9, h=26), x=w/2-26, y=-d, z=8)
    s3d.material(switch, 'plastic', color='#55120c')
    return s3d.group('front_controls', panel, knobs, switch)


def back_panel(w=378, d=10, h=285, recess_w=120, recess_h=45, recess_z=44, recess_depth=3):
    panel = s3d.box('back_panel', w=w, d=d, h=h)
    panel = s3d.fillet(panel, r=4)
    tool = s3d.at(s3d.box('recess', w=recess_w, d=recess_depth*2, h=recess_h), y=d/2, z=recess_z)
    panel = s3d.cut(panel, tool)
    s3d.material(panel, 'plastic', color='#191818', roughness=0.85)
    return s3d.group('back_panel', panel)


def back_controls(w=378, d=6, h=55):
    panel = s3d.box('rear_controls', w=w, d=d, h=h)
    s3d.material(panel, 'painted_metal', color='#141414')
    return s3d.group('back_controls', panel)
