import sand3d as s3d


def armchair():
    base_placed = s3d.at(base(), z=73)
    seat_placed = s3d.at(seat(), y=-81, z=342)
    back_placed = s3d.at(back(), y=355, z=367)
    side_wall_placed = s3d.at(side_wall(), x=317, y=-75, z=73)
    side_wall_image = s3d.transform(s3d.copy(side_wall_placed), mirror="x")
    return s3d.assembly("armchair", base_placed, seat_placed, back_placed, side_wall_placed, side_wall_image)


def base(w=693, d=900, h=322, band_h=161, r=34, overlap=10):
    lower = s3d.fillet(s3d.box("lower", w=w, d=d, h=band_h+overlap/2), r=r)
    upper = s3d.at(s3d.fillet(s3d.box("upper", w=w, d=d, h=h-band_h+overlap/2), r=r), z=band_h-overlap/2)
    solid = s3d.join(lower, upper)
    s3d.material(solid, "fabric", color="#7d9cb5")
    return s3d.group("base_group", solid)


def seat(w=626, d=738, h=83, crown=22):
    solid = s3d.loft("seat", s3d.station(z=0, w=w, d=d, n=5), s3d.station(z=h-crown*2, w=w, d=d, n=5), s3d.station(z=h-crown, w=w-crown*2, d=d-crown*2, n=4), s3d.station(z=h, w=w/3, d=d/3, y=81, n=4))
    s3d.material(solid, "fabric", color="#7d9cb5")
    return s3d.group("seat_group", solid)


def back(w=795, d=190, h=432, r=53):
    solid = s3d.fillet(s3d.box("back", w=w, d=d, h=h), r=r)
    s3d.material(solid, "fabric", color="#719c7c")
    return s3d.group("back_group", solid)


def side_wall(w=55, d=740, h=312):
    solid = s3d.box("side_wall", w=w, d=d, h=h)
    s3d.material(solid, "fabric", color="#7d9cb5")
    arm_roll_placed = s3d.at(arm_roll(), z=304)
    return s3d.group("side_wall_group", solid, arm_roll_placed)


def arm_roll(w=154, d=750, h=154, r=8):
    solid = s3d.extrude("arm_roll", s3d.ellipse(w=w, d=h), h=d)
    solid = s3d.fillet(solid, r=r, edges="top bottom")
    solid = s3d.at(solid, y=d/2, z=h/2, rx=90)
    s3d.material(solid, "fabric", color="#43797a")
    return s3d.group("arm_roll_group", solid)
