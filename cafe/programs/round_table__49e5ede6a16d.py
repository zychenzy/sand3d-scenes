import sand3d as s3d


def pedestal():
    foot_placed = s3d.at(foot(), x=-3236, y=-145158, z=-154354, rx=4, ry=-0.25)
    stem_placed = s3d.at(stem(), x=-3236.04, y=-145158.63, z=-154345.02, rx=4, ry=-0.25)
    return s3d.assembly("pedestal", foot_placed, stem_placed)


def foot(d=250, h=10):
    solid = s3d.cylinder("foot", d=d, h=h)
    s3d.material(solid, "painted_metal", color="#8e7229")
    return s3d.group("foot_group", solid)


def stem(d=70, h=312, top_z=310):
    solid = s3d.cylinder("stem", d=d, h=h)
    s3d.material(solid, "painted_metal", color="#8e7229")
    top_placed = s3d.at(top(), z=top_z)
    return s3d.group("stem_group", solid, top_placed)


def top(d=448, h=32):
    solid = s3d.cylinder("top", d=d, h=h)
    s3d.material(solid, "painted_metal", color="#8e7229")
    return s3d.group("top_group", solid)
