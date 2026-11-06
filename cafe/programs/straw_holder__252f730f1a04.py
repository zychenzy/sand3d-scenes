import sand3d as s3d


def canister():
    body_placed = s3d.at(body(), z=-125)
    cap_placed = s3d.at(domed_cap(), z=75)
    return s3d.assembly("canister", body_placed, cap_placed)


def body(h=202, bottom_r=39, top_r=44):
    outline = s3d.poly([(0, 0), (20, 1), (33, 1), s3d.spline([(33, 1), (37, 2), (bottom_r, 5), (bottom_r, 7)]), (top_r, h), (0, h)])
    solid = s3d.revolve("body", outline)
    s3d.material(solid, "plastic", color="#888685", roughness=0.7)
    return s3d.group("body_group", solid)


def domed_cap(r=45.44, h=32):
    outline = s3d.poly([(0, 0), (44, 0), (r, 2), (44, 4), (43, 4), (43, 8), (40, 11), (38, 15), (33, 18), s3d.spline([(33, 18), (31, 23), (26, 28), (19, 30), (6, h)]), (0, h)])
    solid = s3d.revolve("cap", outline)
    s3d.material(solid, "plastic", color="#888685", roughness=0.7)
    top_knob_placed = s3d.at(top_knob(), z=h-0.5)
    return s3d.group("domed_cap_group", solid, top_knob_placed)


def top_knob(h=18.5, r=8.5, neck_r=4):
    outline = s3d.poly([(0, 0), (6, 0), (6, 3), (neck_r, 6), (neck_r, 9), (5, 12), (r, 14), (r, h-1), (6, h), (0, h)])
    solid = s3d.revolve("knob", outline)
    s3d.material(solid, "plastic", color="#888685", roughness=0.7)
    return s3d.group("top_knob_group", solid)
