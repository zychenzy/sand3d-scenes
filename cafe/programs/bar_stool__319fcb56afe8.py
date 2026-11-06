import sand3d as s3d


def pedestal():
    foot = s3d.at(circular_foot(), x=-4.8, y=6, z=53)
    post = s3d.at(central_post(), x=-4.8, y=6, z=153)
    return s3d.assembly("pedestal", foot, post)


def circular_foot(h=146, r=221):
    profile = s3d.poly([(0, 0), (r-22, 0), (r-6, 3), (r, 10), (r-3, 18), (181, 35), (174, 51), (160, 64), (147, 72), (143, 85), (123, 98), (107, 106), (80, 113), (66, 125), (54, h), (0, h)])
    solid = s3d.revolve("stepped_foot", profile)
    s3d.material(solid, "aluminium", color="#a7a7a7")
    return s3d.group("circular_foot_group", solid)


def central_post(d=108, h=536):
    solid = s3d.cylinder("post", d=d, h=h)
    s3d.material(solid, "aluminium", color="#a7a7a7")
    top = s3d.at(round_top(), z=524)
    return s3d.group("central_post_group", solid, top)


def round_top(h=126, r=232):
    profile = s3d.poly([(0, 0), (125, 0), (136, 5), (145, 12), (203, 13), (216, 20), (226, 31), (r, 64), (r, 94), (r-3, 108), (r-11, 119), (r-22, h), (r-36, h-1), (r-45, h-5), (0, h-5)])
    solid = s3d.revolve("cushioned_top", profile)
    s3d.material(solid, "rubber", color="#000000")
    return s3d.group("round_top_group", solid)
