import sand3d as s3d


def sofa():
    base = s3d.at(seat_base(), z=70)
    arms = s3d.at(arm(), x=1000, z=70)
    image = s3d.transform(s3d.copy(arms), mirror="x")
    rear = s3d.at(back(), x=4, y=-302, z=460)
    feet = s3d.at(foot(), x=836)
    feet_image = s3d.transform(s3d.copy(feet), mirror="x")
    return s3d.assembly("sofa", base, arms, image, rear, feet, feet_image)


def seat_base(w=2064, d=1115, h=417, upper_w=2156, upper_d=1158, step=130):
    plinth = s3d.box("plinth", w=w, d=d, h=step+2)
    cushion = s3d.loft("seat", s3d.station(z=step, w=w+26, d=d, n=20), s3d.station(z=h, w=upper_w, d=upper_d, n=20))
    solid = s3d.join(plinth, cushion)
    s3d.material(solid, "fabric", color="#77736d")
    return s3d.group("seat_base", solid)


def arm(w=270, d=1115, h=692, outer_bottom=32, outer_top=100, inner_top=-108, inner_seat=-170, seat_h=410, outer_heel=46, heel_h=49, crown_drop=19):
    profile = s3d.poly([(inner_seat,0),(outer_bottom,0),(outer_heel,heel_h),(outer_top,h-crown_drop),(inner_top,h),(inner_seat,seat_h)])
    solid = s3d.extrude("arm", profile, h=d)
    solid = s3d.at(solid, y=d/2, rx=90)
    s3d.material(solid, "fabric", color="#77736d")
    return s3d.group("arm", solid)


def back(w=1942, d=280, h=747, clip_w=318, clip_h=150, lean=95):
    profile = s3d.poly([(-w/2,0),(w/2,0),(w/2,h-clip_h),(w/2-clip_w,h),(-w/2+clip_w,h),(-w/2,h-clip_h)])
    solid = s3d.extrude("back", profile, h=d)
    solid = s3d.at(solid, rx=lean)
    s3d.material(solid, "fabric", color="#77736d")
    return s3d.group("back", solid)


def foot(w=105, d=941, h=76):
    solid = s3d.at(s3d.box("foot", w=w, d=w, h=h), y=(d-w)/2)
    other = s3d.at(s3d.copy(solid), y=-(d-w)/2)
    s3d.material(solid, "wood" if False else "walnut", color="#30251e")
    s3d.material(other, "walnut", color="#30251e")
    return s3d.group("foot", solid, other)
