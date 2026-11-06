import sand3d as s3d


def shelving():
    upper = s3d.at(upper_shelf(), y=6, z=228)
    panel = s3d.at(end_panel(), x=338, z=-400)
    image = s3d.transform(s3d.copy(panel), mirror="x")
    lower = s3d.at(lower_shelf(), y=6, z=-249)
    return s3d.assembly("shelving", upper, panel, image, lower)


def upper_shelf(w=659, d=275, h=22, edge_r=3):
    shelf = s3d.box("upper_shelf", w=w, d=d, h=h)
    shelf = s3d.fillet(shelf, r=edge_r)
    s3d.material(shelf, kind="wood" if False else "oak", color="#ad8b6e")
    return s3d.group("upper_shelf_group", shelf)


def end_panel(w=25.2, d=287.3, h=800, corner_r=60, edge_r=3):
    outline = s3d.poly([(d/2, 0), (-d/2+corner_r, 0), s3d.arc(center=(-d/2+corner_r, corner_r), r=corner_r, start=-90, end=-180), (-d/2, h-corner_r), s3d.arc(center=(-d/2+corner_r, h-corner_r), r=corner_r, start=180, end=90), (d/2, h)])
    panel = s3d.extrude("end_panel", outline, h=w)
    panel = s3d.fillet(panel, r=edge_r)
    panel = s3d.at(panel, x=-w/2, rx=90, rz=90)
    s3d.material(panel, kind="oak", color="#ad8b6e")
    return s3d.group("end_panel_group", panel)


def lower_shelf(w=659, d=275, h=22, edge_r=3):
    shelf = s3d.box("lower_shelf", w=w, d=d, h=h)
    shelf = s3d.fillet(shelf, r=edge_r)
    s3d.material(shelf, kind="oak", color="#ad8b6e")
    return s3d.group("lower_shelf_group", shelf)