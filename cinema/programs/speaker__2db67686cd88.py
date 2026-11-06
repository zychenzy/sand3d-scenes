import sand3d as s3d


def case():
    body = s3d.at(case_body(), x=0, y=0, z=0)
    return s3d.assembly("case", body)


def case_body(w=231.1, d=73.55, h=105.1, r=2, seam=1.2, seam_y=-32):
    body = s3d.fillet(s3d.box("case_skin", w=w, d=d, h=h), r=r)
    outer = s3d.extrude("edge_recess", s3d.rect(w=w+2*r, d=h+2*r, r=r), h=seam)
    inner = s3d.at(s3d.extrude("recess_inside", s3d.rect(w=w-seam, d=h-seam, r=r), h=3*seam), z=-seam)
    tool = s3d.cut(outer, inner)
    tool = s3d.at(tool, y=seam_y, z=h/2, rx=90)
    body = s3d.cut(body, tool)
    s3d.material(body, "plastic", color="#212225", roughness=0.65)
    strap = s3d.at(end_loop(), x=124.5, y=1, z=51)
    return s3d.group("case_body", body, strap)


def end_loop(w=20.9, d=14, h=44, t=1.2):
    path = s3d.poly([(-7.5,23),(-3.5,19),(6.5,13),(9.5,6),(5.5,1),(4.5,0),(-4.5,3),(-6.5,12)])
    outside = s3d.extrude("loop_outer", s3d.offset(path, t=t/2), h=d)
    inside = s3d.at(s3d.extrude("loop_inner", s3d.offset(path, t=-t/2), h=d+2*t), z=-t)
    strap = s3d.cut(outside, inside)
    strap = s3d.at(strap, y=d/2, rx=90)
    tab = s3d.at(s3d.box("strap_mount", w=t, d=d, h=h-22), x=-8, z=22)
    strap = s3d.join(strap, tab)
    s3d.material(strap, "leather", color="#4b3228", roughness=0.8)
    return s3d.group("end_loop", strap)
