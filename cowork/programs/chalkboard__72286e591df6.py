import sand3d as s3d


def screen():
    panel = s3d.at(framed_screen(), x=63, y=-743, z=-181.5)
    near = s3d.at(end_support(), x=66, y=-11, z=-668.5)
    far = s3d.at(far_support(), x=60, y=-1475, z=-668.5)
    rail = s3d.at(lower_rail(), x=63, y=-743, z=-319.5)
    return s3d.assembly("screen", panel, near, far, rail)


def framed_screen(w=32, d=1464, h=771, skin=15, rim=44):
    panel = s3d.box("panel", w=skin, d=d, h=h)
    bottom = s3d.box("bottom_edge", w=w, d=d, h=rim)
    top = s3d.at(s3d.copy(bottom), z=h-rim)
    end = s3d.box("end_edge", w=w, d=rim, h=h)
    end = s3d.at(end, y=(d-rim)/2)
    other = s3d.at(s3d.copy(end), y=-(d-rim)/2)
    panel = s3d.join(panel, bottom, top, end, other)
    s3d.material(panel, "painted_metal", color="#8f733e")
    return s3d.group("framed_screen", panel)


def end_support(w=428, d=38, h=981, post=34, post_d=22, foot=60, brace_h=220, brace_w=56):
    support = support_shape(w=w, d=d, h=h, post=post, post_d=post_d, foot=foot, brace_h=brace_h, brace_w=brace_w)
    s3d.material(support, "painted_metal", color="#ab8b4e")
    return s3d.group("end_support", support)


def support_shape(w, d, h, post, post_d, foot, brace_h, brace_w):
    base = s3d.box("foot", w=w, d=d, h=foot)
    upright = s3d.box("post", w=post, d=post_d, h=h)
    brace = s3d.extrude("brace", s3d.poly([(w/2-d-brace_w, foot), (w/2-d, foot), (post/2, brace_h), (post/2, brace_h-brace_w)]), h=post_d)
    brace = s3d.at(brace, rx=90, y=post_d/2)
    opposite = s3d.transform(s3d.copy(brace), mirror="x")
    return s3d.join(base, upright, brace, opposite)


def far_support(w=428, d=38, h=981, post=34, post_d=22, foot=60, brace_h=220, brace_w=56):
    support = support_shape(w=w, d=d, h=h, post=post, post_d=post_d, foot=foot, brace_h=brace_h, brace_w=brace_w)
    s3d.material(support, "painted_metal", color="#ab8b4e")
    return s3d.group("far_support", support)


def lower_rail(w=20, d=1464, h=57):
    rail = s3d.box("rail", w=w, d=d, h=h)
    s3d.material(rail, "painted_metal", color="#ab8b4e")
    return s3d.group("lower_rail", rail)
