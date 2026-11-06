import sand3d as s3d


def thermos():
    bottle_placed = s3d.at(bottle(), x=41, y=21, z=-0.9)
    cap_placed = s3d.at(cap(), x=37, y=-104, z=-1)
    return s3d.assembly("thermos", bottle_placed, cap_placed)


def bottle(d=85, h=300, shoulder=270, neck_d=71, wall=2.5, floor=9, inner_d=79, inner_shoulder=252, throat_d=56, throat_z=271):
    r = d / 2
    nr = neck_d / 2
    ir = inner_d / 2
    tr = throat_d / 2
    body = s3d.revolve("body", s3d.poly([(0, 0), (r-wall, 0), (r, wall), (r, shoulder), (nr+wall, shoulder+wall), (nr, shoulder+wall*2), (nr, h), (nr-wall, h), (nr-wall, h-21), (tr, throat_z), (ir, inner_shoulder), (ir, floor), (0, floor)]))
    s3d.material(body, "painted_metal", color="#988e79", roughness=0.65)
    ring = s3d.torus("neck_ring", d=neck_d+wall, d_wire=wall)
    ring = s3d.at(ring, z=h-18)
    ring2 = s3d.at(s3d.copy(ring), z=h-25)
    s3d.material(ring, "steel", color="#806e60", roughness=0.6)
    s3d.material(ring2, "steel", color="#806e60", roughness=0.6)
    s3d.join(body, ring, ring2)
    return s3d.group("bottle_group", body)


def cap(d=85, h=48, wall=4, floor=18, boss_d=59, boss_top_d=44, boss_h=46, slope_z=38):
    r = d / 2
    br = boss_d / 2
    top = boss_top_d / 2
    cup = s3d.revolve("cap_cup", s3d.poly([(0, 0), (r-wall, 0), (r, wall), (r, h-wall/2), (r-wall/2, h), (r-wall, h), (r-wall, floor), (br, floor), (br, slope_z), (top, boss_h), (0, boss_h)]))
    s3d.material(cup, "painted_metal", color="#858778", roughness=0.65)
    rim = s3d.at(s3d.tube("rim", d=d-wall, d_in=d-wall*2, h=wall), z=h-wall)
    s3d.material(rim, "rubber", color="#292622", roughness=0.8)
    s3d.join(cup, rim)
    return s3d.group("cap_group", cup)
