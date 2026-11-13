# objaverse-0e12a394f1864a629f9022956c8ea349
# "5 Clothes Dryer" by SergeyB, https://sketchfab.com/3d-models/0e12a394f1864a629f9022956c8ea349, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9859787663555251 sand3d=1.5.0

import sand3d as s3d


def drying_rack():
    top = s3d.at(rack(), x=4.8, y=510.1, z=483.4)
    a = s3d.at(forward_support(), x=2, y=494, z=0.9)
    b = s3d.at(backward_support(), x=9, y=527, z=0.9)
    return s3d.assembly("drying_rack", top, a, b)


def rack(w=651, d=682, tube=18, rod=7.6, pitch=64, skew=14, rod_z=4.6, corner=70):
    rim = s3d.at(s3d.wire("rim", s3d.rect(w=w, d=d, r=corner), d=tube), z=tube/2)
    line = s3d.wire("drying_rod", [(-skew/2,-d/2,rod_z),(skew/2,d/2,rod_z)], d=rod)
    rods = s3d.at(line, on=s3d.grid(nx=9, px=pitch))
    s3d.material(rim, "chrome", color="#b7b9bb")
    for ob in rods:
        s3d.material(ob, "chrome", color="#b7b9bb")
    return s3d.group("rack", rim, rods)


def forward_support(tube=17.5, upper_x=274, upper_y=296, upper_z=487, lower_y=-302, knee_x=271, knee_y=-192, knee_z=89, bend_x=235, bend_y=-273, bend_z=25, floor_x=150, floor_z=9, hinge_w=30, hinge_d=23, hinge_h=16, collar_d=24, collar_l=22):
    path = s3d.spline([(-upper_x,upper_y,upper_z),(-knee_x,knee_y,knee_z),(-bend_x,bend_y,bend_z),(-floor_x,lower_y,floor_z),(0,lower_y-1,floor_z), (floor_x,lower_y,floor_z),(bend_x,bend_y,bend_z),(knee_x,knee_y,knee_z),(upper_x,upper_y,upper_z)])
    tube_ob = s3d.wire("forward_tube", path, d=tube)
    block = s3d.at(s3d.box("hinge", w=hinge_w, d=hinge_d, h=hinge_h), x=upper_x, y=upper_y, z=upper_z-hinge_h/2)
    twin = s3d.transform(s3d.copy(block), mirror="x")
    sleeve = s3d.wire("collar", [(floor_x-collar_l/2,lower_y,floor_z),(floor_x+collar_l/2,lower_y,floor_z)], d=collar_d)
    other = s3d.transform(s3d.copy(sleeve), mirror="x")
    s3d.material(tube_ob, "chrome", color="#b7b9bb")
    for ob in [block, twin, sleeve, other]:
        s3d.material(ob, "plastic", color="#888888")
    return s3d.group("forward_support", tube_ob, block, twin, sleeve, other)


def backward_support(tube=18, upper_x=253, upper_y=-306, upper_z=487, lower_y=306, knee_x=244, knee_y=246, knee_z=55, bend_x=210, bend_y=286, bend_z=24, floor_x=150, floor_z=9, hinge_w=30, hinge_d=23, hinge_h=16, collar_d=24, collar_l=22):
    path = s3d.spline([(-upper_x,upper_y,upper_z),(-knee_x,knee_y,knee_z),(-bend_x,bend_y,bend_z),(-floor_x,lower_y,floor_z),(0,lower_y+1,floor_z),(floor_x,lower_y,floor_z),(bend_x,bend_y,bend_z),(knee_x,knee_y,knee_z),(upper_x,upper_y,upper_z)])
    tube_ob = s3d.wire("backward_tube", path, d=tube)
    block = s3d.at(s3d.box("hinge", w=hinge_w, d=hinge_d, h=hinge_h), x=upper_x, y=upper_y, z=upper_z-hinge_h/2)
    twin = s3d.transform(s3d.copy(block), mirror="x")
    sleeve = s3d.wire("collar", [(floor_x-collar_l/2,lower_y,floor_z),(floor_x+collar_l/2,lower_y,floor_z)], d=collar_d)
    other = s3d.transform(s3d.copy(sleeve), mirror="x")
    s3d.material(tube_ob, "chrome", color="#b7b9bb")
    for ob in [block, twin, sleeve, other]:
        s3d.material(ob, "plastic", color="#888888")
    return s3d.group("backward_support", tube_ob, block, twin, sleeve, other)
