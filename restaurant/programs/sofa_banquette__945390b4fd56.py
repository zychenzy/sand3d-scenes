import sand3d as s3d


def sofa():
    base = s3d.at(seat(), x=12, y=28.5, z=189)
    upright = s3d.at(back(), x=15, y=-292, z=189)
    rail = s3d.at(arm(), x=-835.5, y=30, z=262)
    twin = s3d.transform(s3d.copy(rail), mirror="x", x=24)
    foot = s3d.at(front_leg(), x=-787, y=332, z=-37)
    foot_image = s3d.transform(s3d.copy(foot), mirror="x")
    rear = s3d.at(rear_leg(), x=-787, y=-281, z=-37)
    rear_image = s3d.transform(s3d.copy(rear), mirror="x")
    return s3d.assembly("sofa", base, upright, rail, twin, foot, foot_image, rear, rear_image)


def seat(w=1792, d=803, h=159, rear=-401.5, front=400.5, lip=90):
    profile = s3d.poly([(rear,0),(front-lip,0),s3d.spline([(front-lip,0),(front-12,18),(front,30)]),(front,120),s3d.spline([(front,120),(front-45,148),(front-146,h)]),(rear,h)])
    solid = s3d.extrude("seat", profile, h=w)
    solid = s3d.at(solid, x=-w/2, rx=90, rz=90)
    s3d.material(solid, "fabric", color="#937a4d")
    return s3d.group("seat", solid)


def back(w=1800, d=162, h=606, crown=45):
    profile = s3d.poly([(-d/2,0),(-d/2,h),(-d/2+crown,h),s3d.spline([(-d/2+crown,h),(-9,h-13),(28,h-76),(48,h-145),(69,h-278),(76,h-376),(76,159)]),(d/2,0)])
    solid = s3d.extrude("back", profile, h=w)
    solid = s3d.at(solid, x=-w/2, rx=90, rz=90)
    s3d.material(solid, "fabric", color="#aa8c5d")
    return s3d.group("back", solid)


def arm(w=97, d=593, h=206, front=323, bottom=70):
    profile = s3d.poly([(front-d,bottom),(front,bottom),(front,143),s3d.spline([(front,143),(front-10,160),(front-50,179),(front-102,191),(85,h)]),(front-d,h)])
    solid = s3d.extrude("arm", profile, h=w)
    solid = s3d.at(solid, x=-w/2, rx=90, rz=90)
    s3d.material(solid, "fabric", color="#937a4d")
    return s3d.group("arm", solid)


def front_leg(w=58, d=43, h=242):
    solid = s3d.box("front_leg", w=w, d=d, h=h)
    s3d.material(solid, "oak", color="#74623b")
    return s3d.group("front_leg", solid)


def rear_leg(w=58, d=43, h=242):
    solid = s3d.box("rear_leg", w=w, d=d, h=h)
    s3d.material(solid, "oak", color="#74623b")
    return s3d.group("rear_leg", solid)