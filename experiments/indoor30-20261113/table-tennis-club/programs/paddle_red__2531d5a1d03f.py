import sand3d as s3d


def paddle():
    head = s3d.at(paddle_head(), z=42)
    grip = s3d.at(handle(), z=-47.2)
    return s3d.assembly("paddle", head, grip)


def paddle_head(w=151.8, d=10, h=170.8):
    outline = s3d.spline([(-24,6),(-58,28),(-71,49),(-w/2,90),(-67,132),(-39,162),(0,h),(39,162),(67,132),(w/2,90),(71,49),(58,28),(24,6),(0,0)], closed=True)
    core = s3d.at(s3d.extrude("wood_edge", outline, h=d), y=d/2, rx=90)
    s3d.material(core, "wood" if False else "birch", color="#c2aa79")
    red = s3d.at(s3d.extrude("red_face", outline, h=d/5), y=-d/2+d/5, rx=90)
    black = s3d.at(s3d.extrude("black_face", outline, h=d/5), y=d/2+0.1, rx=90)
    s3d.material(red, "rubber", color="#f20000")
    s3d.material(black, "rubber", color="#1c1c1c")
    return s3d.group("paddle_head", core, red, black)


def handle(w=64, d=22.67, h=101.2):
    grip = s3d.loft("grip", s3d.station(z=0,w=25,d=d-2,n=2.8), s3d.station(z=2,w=27,d=d,n=2.8), s3d.station(z=27,w=23,d=21,n=2.6), s3d.station(z=52,w=23,d=20,n=2.6), s3d.station(z=78,w=30,d=20,n=1.8), s3d.station(z=90,w=42,d=18,n=1.3), s3d.station(z=h,w=w,d=10,n=1.3))
    s3d.material(grip, "plastic", color="#0063b5")
    return s3d.group("handle", grip)
