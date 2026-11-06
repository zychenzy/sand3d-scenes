import sand3d as s3d


def pedestal():
    upright_placed = s3d.at(upright(), x=6.8, y=-10.9, z=132)
    square_foot_placed = s3d.at(square_foot(), x=6.8, y=-10.9)
    square_cap_placed = s3d.at(square_cap(), x=6.8, y=-10.9, z=764)
    return s3d.assembly("pedestal", upright_placed, square_foot_placed, square_cap_placed)


def upright(w=722, d=722, h=634, t=5):
    solid = s3d.shell(s3d.box("upright", w=w, d=d, h=h), t=t, open="bottom")
    s3d.material(solid, "walnut", color="#6d3921")
    return s3d.group("upright_group", solid)


def square_foot(w=812.3, d=812.3, h=135, band_h=90, t=5):
    band = s3d.box("lower_band", w=w, d=d, h=band_h)
    shoulder = s3d.at(s3d.extrude("shoulder", s3d.rect(w=w, d=d), h=h-band_h, taper=45), z=band_h)
    solid = s3d.join(band, shoulder)
    solid = s3d.shell(solid, t=t, open="top bottom")
    s3d.material(solid, "walnut", color="#6d3921")
    return s3d.group("square_foot_group", solid)


def square_cap(w=812.3, d=812.3, h=136):
    solid = s3d.box("square_cap", w=w, d=d, h=h)
    s3d.material(solid, "walnut", color="#6d3921")
    return s3d.group("square_cap_group", solid)