import sand3d as s3d


def multimeter():
    body = s3d.at(meter_body(), y=-2.5, z=-59.7)
    panel = s3d.at(front_panel(), y=-8.5, z=-53.5)
    red = s3d.at(red_probe(), x=16.5, y=-25, z=-49.7)
    black = s3d.at(black_probe(), x=-16.5, y=-25, z=-49.7)
    return s3d.assembly("multimeter", body, panel, red, black)


def meter_body(w=68.7, d=16, h=119.4, r=2, back_w=49, back_h=53):
    outline = s3d.poly([(-w/2+5, 5), (-w/2+3, 9), (-w/2, h-27), (-w/2+1, h-10), (-w/2+6, h-3), (-w/2+15, h), (w/2-15, h), (w/2-6, h-3), (w/2-1, h-10), (w/2, h-27), (w/2-3, 9), (w/2-5, 5), (w/2-15, 1), (0, 0), (-w/2+15, 1)], fillet=r)
    body = s3d.at(s3d.extrude("red_housing", outline, h=d), y=d/2+r/10, rx=90)
    s3d.fillet(body, r=r, edges="top bottom")
    s3d.material(body, kind="plastic", color="#a42222")
    back = s3d.at(s3d.extrude("back_inset", s3d.rect(w=back_w, d=back_h, r=r), h=r), y=d/2-r/2, z=back_h/2+r*2, rx=-90)
    s3d.material(back, kind="rubber", color="#242424")
    return s3d.group("meter_body", body, back)


def front_panel(w=55, d=2, h=105, r=5, dial_d=37, dial_z=41, display_w=47, display_h=25):
    face = s3d.at(s3d.extrude("dark_face", s3d.rect(w=w, d=h, r=r), h=d), z=h/2, rx=90)
    s3d.material(face, kind="plastic", color="#3f3e3c")
    display = s3d.at(s3d.box("display", w=display_w, d=d/2, h=display_h), y=-d/2, z=h-display_h-r)
    s3d.material(display, kind="glass", color="#8faca3", roughness=0.65)
    dial = s3d.at(s3d.cylinder("selector", d=dial_d, h=d), y=-d/2, z=dial_z, rx=90)
    s3d.material(dial, kind="plastic", color="#242424")
    handle = s3d.at(s3d.box("selector_handle", w=r, d=d, h=dial_d-r), y=-d*1.5, z=dial_z-(dial_d-r)/2)
    s3d.material(handle, kind="plastic", color="#242424")
    return s3d.group("front_panel", face, display, dial, handle)


def red_probe(h=190, guard_d=12, grip_d=7, stem_d=3, elbow_d=7, reach=25, axis_y=-9):
    solid = probe_shape(h=h, guard_d=guard_d, grip_d=grip_d, stem_d=stem_d, elbow_d=elbow_d, reach=reach, axis_y=axis_y)
    s3d.material(solid, kind="plastic", color="#a42222")
    tip = s3d.at(s3d.cone("metal_tip", d=1, h=13, d2=0.3), y=axis_y, z=h-13)
    s3d.material(tip, kind="steel", color="#999b99")
    return s3d.group("red_probe", solid, tip)


def probe_shape(h, guard_d, grip_d, stem_d, elbow_d, reach, axis_y):
    shaft = s3d.at(s3d.revolve("probe", s3d.poly([(0, 0), (stem_d/2, 0), (stem_d/2, 90), (grip_d/2, 120), (grip_d/2, 161), (guard_d/2, 161), (guard_d/2, 163), (stem_d, 164), (stem_d, 174), (stem_d/2, 177), (0, 177)])), y=axis_y)
    elbow = s3d.at(s3d.cylinder("bent_connector", d=elbow_d, h=reach), y=axis_y, z=elbow_d/2, rx=-90)
    block = s3d.at(s3d.box("connector_block", w=elbow_d+1, d=elbow_d+1, h=elbow_d*2), y=axis_y)
    return s3d.join(shaft, elbow, block)


def black_probe(h=190, guard_d=12, grip_d=7, stem_d=3, elbow_d=7, reach=25, axis_y=-9):
    solid = probe_shape(h=h, guard_d=guard_d, grip_d=grip_d, stem_d=stem_d, elbow_d=elbow_d, reach=reach, axis_y=axis_y)
    s3d.material(solid, kind="plastic", color="#242424")
    tip = s3d.at(s3d.cone("metal_tip", d=1, h=13, d2=0.3), y=axis_y, z=h-13)
    s3d.material(tip, kind="steel", color="#999b99")
    return s3d.group("black_probe", solid, tip)
