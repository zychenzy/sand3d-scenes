import sand3d as s3d


def bankers_lamp():
    placed = s3d.at(base(), z=0.5)
    return s3d.assembly("bankers_lamp", placed)


def base(w=290, d=286, h=60, rim=38, plateau=208, wall=2):
    solid = s3d.revolve("base", s3d.poly([(0,0),(w/2,0),(w/2,rim),(plateau/2,h),(0,h)]))
    s3d.shell(solid,t=wall,open="bottom")
    s3d.scale(solid, s=(1,d/w,1))
    s3d.material(solid, "brass", color="#ffe29b")
    stem = s3d.at(support(), z=h-0.5)
    button = s3d.at(switch(), x=65, y=56, z=h-0.5)
    return s3d.group("base_group", solid, stem, button)


def support(w=72, lower_d=38, stem_top=46, stem_h=71, collar_h=36, neck_d=47, neck_h=28, tip_d=24, h=326):
    solid = s3d.revolve("stand", s3d.poly([(0,0),(lower_d/2,0),(stem_top/2,stem_h),(w/2,stem_h+collar_h/3),(w/2,stem_h+collar_h*2/3),(neck_d/2,stem_h+collar_h),(neck_d/2,stem_h+collar_h+neck_h),(tip_d/2,stem_h+collar_h+neck_h+10),(0,stem_h+collar_h+neck_h+10)]))
    path = s3d.spline([(0,0,140),(0,-19,193),(0,-20,220),(0,-10,270),(0,6,304)], tangents=((0,-1,2),(0,1,2)))
    arm = s3d.wire("curved_arm", path=path, d=tip_d)
    s3d.material(solid,"brass",color="#ffe29b")
    s3d.material(arm,"brass",color="#ffe29b")
    shade_placed = s3d.at(shade(), x=0.3, y=100, z=244)
    return s3d.group("support_group", solid, arm, shade_placed)


def shade(w=341, d=202, h=147, t=10, cap=3, tube_d=27):
    pts = [(-78.5,2.5),(-94,45),(-94,65),(-80,96),(-49,124),(8,142),(48,134),(95,94)]
    path = s3d.spline(pts)
    band = s3d.extrude("green_roof", s3d.stroke(path,t=t), h=w, both=True)
    band = s3d.at(band, rx=90, rz=90)
    profile = s3d.poly([pts[0],s3d.spline(pts),pts[-1]])
    end = s3d.at(s3d.extrude("end_cap",profile,h=cap),rx=90,rz=90,x=w/2-cap)
    twin = s3d.transform(s3d.copy(end),mirror="x")
    s3d.material(band,"painted_metal",color="#399c3c")
    s3d.material(end,"painted_metal",color="#399c3c")
    s3d.material(twin,"painted_metal",color="#399c3c")
    bulb = s3d.at(s3d.cylinder("light_tube",d=tube_d,h=w-24),ry=90,x=-(w-24)/2,y=-22,z=69)
    s3d.material(bulb,"plastic",color="#fefefe")
    return s3d.group("shade_group",band,end,twin,bulb)


def switch(w=25, d=18, h=8):
    solid = s3d.box("switch",w=w,d=d,h=h)
    s3d.chamfer(solid,d=h/4,edges="top")
    s3d.material(solid,"aluminium",color="#d3d2cf")
    return s3d.group("switch_group",solid)
