import sand3d as s3d


def display():
    panel_placed = s3d.at(panel(), x=12.6, y=12.6, z=46.7)
    return s3d.assembly("display", panel_placed)


def panel(w=40, d=1450, h=729, rim=42, corner=18, skin=8):
    frame = s3d.extrude("frame", s3d.rect(w=d, d=h, r=corner), h=w)
    frame = s3d.pocket(frame, s3d.rect(w=d-2*rim, d=h-2*rim, r=corner/3), depth=(w-skin)/2, on=frame.face("top"))
    frame = s3d.pocket(frame, s3d.rect(w=d-2*rim, d=h-2*rim, r=corner/3), depth=(w-skin)/2, on=frame.face("bottom"))
    frame = s3d.at(frame, x=-w/2, z=h/2, rx=90, rz=90)
    s3d.material(frame, kind="plastic", color="#25282b")
    foot = s3d.at(pedestal(), x=0.5, y=0, z=-46.7)
    return s3d.group("panel_group", frame, foot)


def pedestal(w=187, d=486, h=54, t=8):
    profile = s3d.poly([(-w/2, 0), (0, h), (w/2, 0), (w/2-t, 0), (0, h-t), (-w/2+t, 0)])
    foot = s3d.extrude("sloping_foot", profile, h=d)
    foot = s3d.at(foot, y=d/2, rx=90)
    s3d.material(foot, kind="aluminium", color="#777b80")
    return s3d.group("pedestal_group", foot)
