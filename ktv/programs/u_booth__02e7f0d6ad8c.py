import sand3d as s3d


def booth():
    enclosure_placed = s3d.at(enclosure(), x=198255, y=-73458)
    bench_placed = s3d.at(bench(), x=198895, y=-73511)
    bench_image = s3d.transform(s3d.copy(bench_placed), x=396510, mirror="x")
    table_placed = s3d.at(table(), x=198255, y=-73458)
    raised_panel_placed = s3d.at(raised_panel(), x=198252, y=-72860, z=1101)
    return s3d.assembly("booth", enclosure_placed, bench_placed, bench_image, table_placed, raised_panel_placed)


def enclosure(w=1994, d=1284, h=1119, t=114, plinth=170):
    wall = s3d.at(s3d.box("end_wall", w=t, d=d, h=h), x=(w-t)/2)
    twin = s3d.transform(s3d.copy(wall), mirror="x")
    rear = s3d.at(s3d.box("long_wall", w=w, d=t, h=h), y=(d-t)/2)
    walls = s3d.join(wall, twin, rear)
    s3d.material(walls, "walnut", color="#863602")
    return s3d.group("enclosure", walls)


def bench(w=646, d=1136, h=1104, base=220, rail=115, seat_top=495, radius=35, leg=56, leg_pitch=1003, seat_shift=-38):
    support = s3d.at(s3d.box("seat_frame", w=w-20, d=d, h=rail), x=seat_shift, z=base)
    s3d.material(support, "walnut", color="#69300e")
    cushion = s3d.fillet(s3d.box("seat_pad", w=w, d=d, h=seat_top-base-rail), r=radius)
    cushion = s3d.at(cushion, x=seat_shift, z=base+rail-10)
    s3d.material(cushion, "leather", color="#863602")
    profile = s3d.poly([(285,532), (162,532), s3d.spline([(147,556), (138,632), (144,760), (158,958), (168,1025), (193,1083), (215,h)]), (285,h)])
    back = s3d.at(s3d.extrude("back_pad", profile, h=d), rx=90, y=d/2)
    s3d.material(back, "leather", color="#863602")
    feet = s3d.at(s3d.box("leg", w=leg, d=leg, h=base+2), on=s3d.grid(nx=1, ny=2, py=leg_pitch), x=-276)
    s3d.material(feet, "painted_metal", color="#292a26")
    seat = s3d.join(cushion, support)
    return s3d.group("bench", seat, back, feet)


def table(w=669, d=1287, h=834, t=33, post_d=83, post_y=-58):
    top = s3d.at(s3d.box("tabletop", w=w, d=d, h=t), z=h-t)
    s3d.material(top, "plastic", color="#aaa5a5")
    post = s3d.at(s3d.cylinder("pedestal", d=post_d, h=h-t+2), y=post_y)
    s3d.material(post, "painted_metal", color="#34302c")
    return s3d.group("table", top, post)


def raised_panel(w=1685, d=28, h=558, panel_h=428, upright=20):
    panel = s3d.at(s3d.box("screen", w=w, d=d, h=panel_h), z=h-panel_h)
    posts = s3d.at(s3d.box("upright", w=upright, d=d, h=h-panel_h+upright), on=s3d.grid(nx=2, px=w-upright))
    s3d.material(panel, "painted_metal", color="#34302c")
    s3d.material(posts, "painted_metal", color="#34302c")
    return s3d.group("raised_panel", panel, posts)
