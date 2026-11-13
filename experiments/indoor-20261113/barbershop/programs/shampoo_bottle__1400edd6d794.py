import sand3d as s3d


def bottle():
    body_placed = s3d.at(body(), z=1.38)
    return s3d.assembly("bottle", body_placed)


def body(d=73.67, h=149, wall=1, edge=2, opening=28, recess=4.5):
    r = d / 2
    q = opening / 2
    profile = s3d.poly([(0, recess), (r-edge, 0), s3d.tangent_arc(to=(r, edge)), (r, h-edge), s3d.tangent_arc(to=(r-edge, h)), (q, h), (q, h-wall), (r-edge, h-wall), (r-wall, h-edge), (r-wall, edge), (r-edge, wall), (0, recess+wall)])
    skin = s3d.revolve("bottle_body", profile)
    s3d.material(skin, "aluminium", color="#969696", roughness=0.4)
    neck_placed = s3d.at(neck(), z=h-wall)
    return s3d.group("body_group", skin, neck_placed)


def neck(d=27, h=32, wall=1, flare=2, lip=0.5):
    r = d / 2
    profile = s3d.poly([(r+flare, 0), (r, flare), (r, h-lip*3), (r+lip, h-lip*2), (r+lip, h-lip), (r, h), (r-wall, h), (r-wall, flare), (r+flare-wall, 0)])
    tube = s3d.revolve("open_neck", profile)
    s3d.material(tube, "aluminium", color="#969696", roughness=0.4)
    return s3d.group("neck_group", tube)
