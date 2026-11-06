import sand3d as s3d


def pool_table():
    body = s3d.at(table_body(), z=255)
    bed = s3d.at(playing_bed(), z=687)
    rim = s3d.at(wooden_rim(), z=712)
    leg = s3d.at(end_leg(), x=543, y=-1065)
    twin = s3d.transform(s3d.copy(leg), mirror="x")
    far = s3d.at(far_leg(), x=543, y=1065)
    other = s3d.transform(s3d.copy(far), mirror="x")
    return s3d.assembly("pool_table", body, bed, rim, leg, twin, far, other)


def table_body(w=1527, d=2800, h=457, bottom_w=1272, bottom_d=2316):
    solid = s3d.loft("cabinet", s3d.station(z=0, w=bottom_w, d=bottom_d, n=100), s3d.station(z=h, w=w, d=d, n=100))
    s3d.material(solid, "walnut", color="#431e0b")
    return s3d.group("table_body", solid)


def playing_bed(w=1370, d=2640, h=40, pocket_d=152, pocket_x=636, pocket_y=1272):
    solid = s3d.box("blue_bed", w=w, d=d, h=h)
    s3d.hole(solid, d=pocket_d, on=s3d.grid(nx=2, ny=2, px=pocket_x*2, py=pocket_y*2))
    s3d.hole(solid, d=pocket_d, on=s3d.grid(nx=2, px=pocket_x*2))
    s3d.material(solid, "fabric", color="#24548a")
    ball_cluster_placed = s3d.at(ball_cluster(), y=-682, z=h)
    cue_ball_placed = s3d.at(cue_ball(), y=764, z=h)
    return s3d.group("playing_bed", solid, ball_cluster_placed, cue_ball_placed)


def ball_cluster(ball_d=60, pitch=63, rows=5, rack_w=363, rack_d=323, rack_t=8, rack_h=45):
    balls = []
    colors = ["#b51b12", "#dbbd14", "#a51b15", "#d6ad12", "#191719"]
    for row in range(rows):
        for col in range(row+1):
            ball = s3d.at(s3d.sphere("ball", d=ball_d), x=(col-row/2)*pitch, y=rack_d/2-ball_d/2-row*pitch*0.866)
            s3d.material(ball, "glossy_plastic", color=colors[(row+col)%len(colors)])
            balls.append(ball)
    outline = s3d.poly([(-rack_w/2,-rack_d/2),(rack_w/2,-rack_d/2),(0,rack_d/2)])
    rack = s3d.extrude("rack", outline, h=rack_h)
    inner = s3d.poly([(-rack_w/2+rack_t*1.732,-rack_d/2+rack_t),(rack_w/2-rack_t*1.732,-rack_d/2+rack_t),(0,rack_d/2-rack_t*2)])
    s3d.pocket(rack, inner, depth=rack_h)
    s3d.material(rack, "plastic", color="#171715")
    return s3d.group("ball_cluster", rack, balls)


def cue_ball(d=60):
    solid = s3d.sphere("ivory_ball", d=d)
    s3d.material(solid, "glossy_plastic", color="#cbc893")
    return s3d.group("cue_ball", solid)


def wooden_rim(w=1527, d=2800, h=66, opening_w=1248, opening_d=2520, pocket_d=152, pocket_x=636, pocket_y=1272):
    solid = s3d.box("rails", w=w, d=d, h=h)
    s3d.pocket(solid, s3d.rect(w=opening_w, d=opening_d), depth=h)
    s3d.hole(solid, d=pocket_d, on=s3d.grid(nx=2, ny=2, px=pocket_x*2, py=pocket_y*2))
    s3d.hole(solid, d=pocket_d, on=s3d.grid(nx=2, px=pocket_x*2))
    s3d.material(solid, "walnut", color="#431e0b")
    return s3d.group("wooden_rim", solid)


def end_leg(h=285, foot=120, top=272, shift=16):
    solid = s3d.loft("leg", s3d.station(z=0, w=foot, d=foot, x=shift, y=-shift, n=100), s3d.station(z=h, w=top, d=top, x=-shift, y=shift, n=100))
    s3d.material(solid, "walnut", color="#260d03")
    return s3d.group("end_leg", solid)


def far_leg(h=285, foot=120, top=272, shift=16):
    solid = s3d.loft("leg", s3d.station(z=0, w=foot, d=foot, x=shift, y=shift, n=100), s3d.station(z=h, w=top, d=top, x=-shift, y=-shift, n=100))
    s3d.material(solid, "walnut", color="#260d03")
    return s3d.group("far_leg", solid)
