import sand3d as s3d


def bottle():
    body = s3d.at(bottle_body(), x=0, y=-3.5, z=-90)
    foot = s3d.at(rounded_foot(), x=0, y=-2, z=-100)
    neck = s3d.at(threaded_neck(), x=0.7, y=-4.5, z=66)
    return s3d.assembly("bottle", body, foot, neck)


def bottle_body(w=63, d=60, h=158, base_w=52, base_d=51, lower_z=10, shoulder_z=144, shoulder_w=62, shoulder_d=61, bend_z=150, bend_w=58, bend_d=57, top_w=33):
    solid = s3d.loft("body", s3d.station(z=0, w=base_w, d=base_d), s3d.station(z=lower_z, w=60, d=59), s3d.station(z=45, w=w, d=d), s3d.station(z=110, w=64, d=59), s3d.station(z=shoulder_z, w=shoulder_w, d=shoulder_d), s3d.station(z=bend_z, w=bend_w, d=bend_d), s3d.station(z=155, w=43, d=43), s3d.station(z=h, w=top_w, d=top_w))
    s3d.material(solid, "plastic", color="#e4dfce", roughness=0.45)
    return s3d.group("bottle_body", solid)


def rounded_foot(w=59, d=58, h=12, neck=52, edge=3):
    solid = s3d.loft("foot", s3d.station(z=0, w=w-edge*2, d=d-edge*2), s3d.station(z=edge, w=w, d=d), s3d.station(z=h-edge*2, w=w, d=d), s3d.station(z=h-edge, w=neck, d=neck), s3d.station(z=h, w=neck, d=neck))
    s3d.material(solid, "plastic", color="#e4dfce", roughness=0.45)
    return s3d.group("rounded_foot", solid)


def threaded_neck(d=32, h=32, bore=26, recess=16, ridge_d=35, ridge_t=2, pitch=7):
    solid = s3d.cylinder("neck", d=d, h=h)
    s3d.hole(solid, d=bore, depth=recess, on=solid.face("top"))
    for z in (h-pitch*3, h-pitch*2, h-pitch, h-ridge_t):
        ridge = s3d.at(s3d.torus("ridge", d=ridge_d-ridge_t, d_wire=ridge_t), z=z)
        solid = s3d.join(solid, ridge)
    s3d.material(solid, "plastic", color="#e4dfce", roughness=0.45)
    return s3d.group("threaded_neck", solid)
