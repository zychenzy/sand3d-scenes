import sand3d as s3d


def jar():
    body = s3d.at(jar_body(), x=0.7, y=0.2, z=53.3)
    return s3d.assembly("jar", body)


def jar_body(d=94, h=110, bottom_d=87, neck_d=77, base_round=3, shoulder_z=93, neck_z=105):
    profile = s3d.poly([(0, 0), (bottom_d / 2, 0), s3d.tangent_arc(to=(d / 2, base_round)), (d / 2, shoulder_z), (neck_d / 2, neck_z), (neck_d / 2, h), (0, h)])
    body = s3d.revolve("body", profile)
    s3d.material(body, "glass", color="#5d0007", roughness=0.35)
    cap = s3d.at(lid(), x=0, y=0, z=106)
    return s3d.group("jar_body", body, cap)


def lid(d=80, h=14, rim_d=77, step_h=3, round_r=3):
    rim = s3d.cylinder("lower_rim", d=rim_d, h=step_h + round_r)
    top = s3d.at(s3d.cylinder("lid_top", d=d, h=h-step_h), z=step_h)
    s3d.fillet(top, r=round_r, edges="top bottom")
    cap = s3d.join(rim, top)
    s3d.material(cap, "painted_metal", color="#ffbb00", roughness=0.32)
    return s3d.group("lid", cap)
