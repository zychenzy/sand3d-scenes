import sand3d as s3d


def table():
    tabletop_placed = s3d.at(tabletop(), x=57.7, y=-389.4, z=-54.9)
    end_leg_placed = s3d.at(end_leg(), x=-204, y=129, z=-255.2)
    end_leg_image = s3d.transform(s3d.copy(end_leg_placed), mirror="x", x=115.5)
    far_leg_placed = s3d.at(far_leg(), x=-207, y=-910, z=-255.2)
    far_leg_image = s3d.transform(s3d.copy(far_leg_placed), mirror="x", x=115.5)
    return s3d.assembly("table", tabletop_placed, end_leg_placed, end_leg_image, far_leg_placed, far_leg_image)


def tabletop(w=654.8, d=1200, h=76, edge_r=20, border=50, band=12, recess=1):
    slab = s3d.box("slab", w=w, d=d, h=h)
    slab = s3d.fillet(slab, r=edge_r, edges="top bottom")
    slab = s3d.pocket(slab, s3d.rect(w=w-2*border, d=d-2*border), depth=recess, on=slab.face("top"))
    slab = s3d.pocket(slab, s3d.rect(w=w-2*(border+band), d=d-2*(border+band)), depth=2*recess, on=s3d.Frame(origin=(0,0,h)))
    s3d.material(slab, kind="wood" if False else "walnut", color="#803b27")
    return s3d.group("tabletop_group", slab)


def end_leg(w=53, d=82, h=203.3, shaft_w=41, shaft_d=68, foot=7, shoulder=42):
    leg = s3d.extrude("shaft", s3d.superellipse(w=shaft_w, d=shaft_d, n=3), h=h-shoulder+foot)
    leg = s3d.chamfer(leg, d=foot, edges="bottom")
    cap = s3d.at(s3d.extrude("shoulder", s3d.superellipse(w=w, d=d, n=2.3), h=shoulder), z=h-shoulder)
    leg = s3d.join(leg, cap)
    s3d.material(leg, kind="walnut", color="#91422c")
    return s3d.group("end_leg_group", leg)


def far_leg(w=53, d=82, h=203.3, shaft_w=41, shaft_d=68, foot=7, shoulder=42):
    leg = s3d.extrude("shaft", s3d.superellipse(w=shaft_w, d=shaft_d, n=3), h=h-shoulder+foot)
    leg = s3d.chamfer(leg, d=foot, edges="bottom")
    cap = s3d.at(s3d.extrude("shoulder", s3d.superellipse(w=w, d=d, n=2.3), h=shoulder), z=h-shoulder)
    leg = s3d.join(leg, cap)
    s3d.material(leg, kind="walnut", color="#91422c")
    return s3d.group("far_leg_group", leg)
