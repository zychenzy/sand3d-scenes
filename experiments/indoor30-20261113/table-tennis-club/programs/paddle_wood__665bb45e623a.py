import sand3d as s3d


def paddle():
    core = s3d.at(head_core(), x=134, y=-176.9, z=-97)
    return s3d.assembly("paddle", core)


def head_core(w=119, d=8.4, h=129):
    core = paddle_sheet("core", w=w, d=d, h=h)
    s3d.material(core, "birch", color="#fdeca6")
    red = s3d.at(red_face(), x=0, y=-7, z=4)
    dark = s3d.at(dark_face(), x=0, y=7, z=4)
    grip = s3d.at(handle(), x=0, y=0, z=-77)
    return s3d.group("head_core", core, red, dark, grip)


def paddle_sheet(name, w, d, h):
    outline = s3d.poly([(-w/4, 0), (w/4, 0), s3d.spline([(w/4, 0), (w*0.44, h*0.12), (w/2, h*0.36), (w*0.48, h*0.66), (w*0.32, h*0.9), (0, h), (-w*0.32, h*0.9), (-w*0.48, h*0.66), (-w/2, h*0.36), (-w*0.44, h*0.12), (-w/4, 0)])])
    solid = s3d.extrude(name, outline, h=d, both=True)
    return s3d.at(solid, rx=90)


def red_face(w=121, d=6.4, h=125):
    face = paddle_sheet("red_sheet", w=w, d=d, h=h)
    s3d.material(face, "rubber", color="#f83c44")
    return s3d.group("red_face", face)


def dark_face(w=121, d=6.4, h=125):
    face = paddle_sheet("dark_sheet", w=w, d=d, h=h)
    s3d.material(face, "rubber", color="#272727")
    return s3d.group("dark_face", face)


def handle(w=34, d=12, h=80, grip_w=20):
    grip = s3d.loft("wood_grip", s3d.station(z=0, w=grip_w, d=d-3, n=3), s3d.station(z=3, w=grip_w+3, d=d, n=3), s3d.station(z=h*0.35, w=grip_w-1, d=d, n=3), s3d.station(z=h*0.7, w=grip_w-1, d=d, n=3), s3d.station(z=h*0.87, w=grip_w+3, d=d-1, n=3), s3d.station(z=h, w=w, d=d-3, n=3))
    s3d.material(grip, "birch", color="#fdeca6")
    return s3d.group("handle", grip)
