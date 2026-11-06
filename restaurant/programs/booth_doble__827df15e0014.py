import sand3d as s3d


def bench():
    seat_placed = s3d.at(seat(), x=-261, y=-47, z=346)
    apron_placed = s3d.at(apron(), x=-261, y=-47, z=231)
    backrest_placed = s3d.at(backrest(), x=-261, y=-50, z=554)
    end_supports_placed = s3d.at(end_supports(), x=-261, y=-47)
    return s3d.assembly("bench", seat_placed, apron_placed, backrest_placed, end_supports_placed)


def seat(w=1400, d=1202, h=177, lip=25):
    solid=s3d.box("seat",w=w,d=d,h=h)
    s3d.fillet(solid,r=lip,edges="top")
    s3d.material(solid,"leather",color="#863602")
    return s3d.group("seat_group",solid)


def apron(w=1368, d=1202, h=166):
    solid = s3d.box("apron", w=w, d=d, h=h)
    s3d.material(solid,"painted_metal",color="#34302c")
    corner_legs_placed = s3d.at(corner_legs(), x=609, y=-5, z=-231)
    corner_legs_image = s3d.transform(s3d.copy(corner_legs_placed), mirror="x")
    return s3d.group("apron_group", solid, corner_legs_placed, corner_legs_image)


def corner_legs(w=64, d=1126, h=278):
    solid = s3d.box("leg",w=w,d=w,h=h)
    s3d.material(solid,"painted_metal",color="#34302c")
    legs=s3d.at(solid,on=s3d.grid(nx=1,ny=2,py=d-w))
    return s3d.group("corner_legs_group",legs)


def backrest(d=1198, rounding=18, base_w=220, lower_w=310, belly_w=338, middle_w=336, shoulder_w=290, upper_w=250, crown_w=180, top_w=100, base_z=12, lower_z=25, belly_z=62, middle_z=190, shoulder_z=496, upper_z=558, crown_z=596, top_z=606):
    outline=s3d.poly([(-base_w/2,base_z),(-lower_w/2,lower_z),(-belly_w/2,belly_z),(-middle_w/2,middle_z),(-shoulder_w/2,shoulder_z),(-upper_w/2,upper_z),(-crown_w/2,crown_z),(-top_w/2,top_z),(top_w/2,top_z),(crown_w/2,crown_z),(upper_w/2,upper_z),(shoulder_w/2,shoulder_z),(middle_w/2,middle_z),(belly_w/2,belly_z),(lower_w/2,lower_z),(base_w/2,base_z)],fillet=rounding)
    solid=s3d.extrude("backrest",outline,h=d,both=True)
    solid=s3d.at(solid,rx=90)
    s3d.material(solid,"leather",color="#863602")
    return s3d.group("backrest_group",solid)


def end_supports(w=118, d=1240, h=1182):
    solid=s3d.box("spine",w=w,d=d,h=h)
    s3d.material(solid,"painted_metal",color="#34302c")
    return s3d.group("end_supports_group",solid)
