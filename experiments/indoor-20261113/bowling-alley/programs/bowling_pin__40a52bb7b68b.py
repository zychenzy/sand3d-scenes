import sand3d as s3d


def bowling_pin():
    body = s3d.at(pin_body(), x=0, y=0, z=0)
    return s3d.assembly("bowling_pin", body)


def pin_body(outline=((17, 0), (47, 19), (64, 74), (67, 125), (61, 157), (35, 219), (29, 246), (38, 335), (35, 358), (25, 374), (0, 380))):
    profile = s3d.poly([s3d.spline(outline), (0, 0)])
    body = s3d.revolve("pin_body", profile)
    s3d.material(body, "plastic", color="#ffffff")
    return s3d.group("pin_body", body)

