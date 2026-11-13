import sand3d as s3d


# ITTF playing surface: 2740 x 1525, top at 760. Net and lines are scene geometry.
def ittf_table():
    top = s3d.at(playing_top(), z=738)
    frame_l = s3d.at(side_frame(), x=-640)
    frame_r = s3d.transform(s3d.copy(frame_l), mirror="x")
    bar = s3d.at(under_spine(), z=360)
    return s3d.assembly("ittf_table", top, frame_l, frame_r, bar)


def playing_top():
    edge = s3d.box("edge_body", w=1525, d=2740, h=18)
    s3d.material(edge, "painted_metal", color="#3a4048")
    half_d = (2740 - 3) / 2
    blue = s3d.box("half", w=1521, d=half_d, h=4)
    s3d.material(blue, "plastic", color="#1a4e96")
    north = s3d.at(blue, y=-(half_d + 3) / 2, z=18)
    south = s3d.at(s3d.copy(blue), y=(half_d + 3) / 2, z=18)
    return s3d.group("playing_top", edge, north, south)


def side_frame():
    h = 738
    foot_y = 890
    shift = 280
    leg = s3d.loft(
        "leg",
        s3d.station(z=0, w=46, d=46, y=foot_y, n=8),
        s3d.station(z=h * 0.45, w=40, d=40, y=foot_y - shift * 0.55, n=8),
        s3d.station(z=h, w=36, d=36, y=foot_y - shift, n=8),
    )
    other = s3d.transform(s3d.copy(leg), mirror="y")
    tie = s3d.at(s3d.box("tie", w=28, d=1180, h=16), z=250)
    shoe_n = s3d.at(s3d.box("shoe", w=70, d=90, h=14), y=foot_y)
    shoe_s = s3d.at(s3d.box("shoe", w=70, d=90, h=14), y=-foot_y)
    s3d.material(leg, "painted_metal", color="#4a515a")
    s3d.material(other, "painted_metal", color="#4a515a")
    s3d.material(tie, "painted_metal", color="#3e444c")
    s3d.material(shoe_n, "plastic", color="#2a2c2e")
    s3d.material(shoe_s, "plastic", color="#2a2c2e")
    return s3d.group("side_frame", leg, other, tie, shoe_n, shoe_s)


def under_spine():
    bar = s3d.box("spine", w=1180, d=36, h=22)
    s3d.material(bar, "painted_metal", color="#3e444c")
    return s3d.group("spine", bar)
