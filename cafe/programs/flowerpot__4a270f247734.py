import sand3d as s3d


def pot():
    body = s3d.at(tapered_body(), z=-8.2)
    return s3d.assembly("pot", body)


def tapered_body(base_r=78, inner_r=72, top_r=116, wall=6, h=204.2, floor=8.2, bottom_curve=2.2, rim_z=181.2):
    profile = s3d.poly([(0, 0), (base_r, bottom_curve), (top_r, h), (top_r-wall, h), (inner_r, floor), (0, floor)])
    body = s3d.revolve("vessel", profile)
    s3d.material(body, "plastic", color="#777777")
    rim = s3d.at(mouth_rim(), z=rim_z)
    return s3d.group("tapered_body", body, rim)


def mouth_rim(outer_r=125, inner_r=110, h=25.5, lip_r=114, skirt_r=117, groove_r=119, groove_h=19, neck_r=115, neck_h=16, bevel=2):
    profile = s3d.poly([(inner_r, h-bevel), (lip_r, h), (outer_r, h), (outer_r, 0), (skirt_r, 0), (groove_r, groove_h), (skirt_r, groove_h), (neck_r, neck_h)])
    rim = s3d.revolve("rim", profile)
    s3d.material(rim, "plastic", color="#777777")
    return s3d.group("mouth_rim", rim)
