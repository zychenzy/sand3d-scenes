import sand3d as s3d


def recliner():
    pedestal_placed = s3d.at(pedestal(), x=-137.5, y=-45, z=-388.5)
    seat_placed = s3d.at(seat(), x=-137.5, y=-53, z=-210)
    return s3d.assembly("recliner", pedestal_placed, seat_placed)


def pedestal(w=603, h=157, rim=4, crown=28, stem=67):
    base = s3d.revolve("base",s3d.poly([(stem/2,crown),(w/2,rim),(w/2,0),(stem/2,crown-rim)]))
    column = s3d.at(s3d.cylinder("column",d=stem,h=h-crown+rim),z=crown-rim)
    base = s3d.join(base,column)
    s3d.material(base, "steel", color="#797979")
    return s3d.group("pedestal_group", base)


def seat(w=361, d=430, h=155, mount_w=204, rail_w=40, rear=167):
    solid = s3d.body("seat", plan=[(-d/2,w), (0,w), (rear,w)], top=[(-d/2,145),(-107,h),(0,154),(146,129),(rear,92)], bottom=[(-d/2,23),(-180,14),(rear,14)], n=10)
    mount = s3d.body("mount",plan=[(-d/2,55),(-100,mount_w),(mount_w/2,mount_w)],top=26,bottom=[(-d/2,-5),(-100,-20),(mount_w/2,-20)],n=6)
    solid = s3d.join(solid,mount)
    linkage = s3d.body("linkage",plan=[(-422,rail_w),(-d/2,rail_w)],top=[(-422,57),(-d/2,7)],bottom=[(-422,43),(-d/2,-5)],n=10)
    s3d.material(linkage,"steel",color="#797979")
    s3d.material(solid, "leather", color="#3c160a")
    back_placed = s3d.at(back(), x=-6.5, y=278, z=125)
    arm_wall_placed = s3d.at(arm_wall(), x=-211.5, y=-1, z=-2)
    arm_wall_image = s3d.transform(s3d.copy(arm_wall_placed), mirror="x")
    leg_support_placed = s3d.at(leg_support(), x=9.5, y=-398, z=58)
    return s3d.group("seat_group", solid, linkage, back_placed, arm_wall_placed, arm_wall_image, leg_support_placed)


def back(w=420, h=474, t=10, cushion_w=359, pad_w=235, pad_h=105, pad_t=32, bend=42):
    outline = s3d.poly([(-w/2,-bend),s3d.spline([(-w/2,-bend),(0,0),(w/2,-bend)]),(w/2,-bend-t),s3d.spline([(w/2,-bend-t),(0,-t),(-w/2,-bend-t)])])
    shell = s3d.loft("back_shell",s3d.at(outline,z=-111,y=-67),s3d.at(outline,z=74,y=-39),s3d.at(outline,z=246,y=54),s3d.at(outline,z=h,y=130))
    sections = []
    curve = bend-t
    for z,y,depth in [(0,-112,36),(108,-83,46),(260,7,44),(h-5,78,56)]:
        profile = s3d.poly([(-cushion_w/2,depth/2-curve),s3d.spline([(-cushion_w/2,depth/2-curve),(0,depth/2),(cushion_w/2,depth/2-curve)]),(cushion_w/2,-depth/2-curve),s3d.spline([(cushion_w/2,-depth/2-curve),(0,-depth/2),(-cushion_w/2,-depth/2-curve)])])
        sections.append(s3d.at(profile,z=z,y=y))
    cushion = s3d.loft("back_cushion",*sections)
    pad = s3d.at(s3d.box("head_pad",w=pad_w,d=pad_t,h=pad_h),y=0,z=h-pad_h-10,rx=-18)
    s3d.fillet(pad,r=5)
    s3d.material(shell,"leather",color="#3b1d18")
    s3d.material(cushion,"leather",color="#3c160a")
    s3d.material(pad,"leather",color="#3c160a")
    return s3d.group("back_group",shell,cushion,pad)


def arm_wall(w=68, d=430, h=224, wall=40, cap=16):
    top = [(-d/2,85),(-195,145),(-155,185),(-90,215),(0,h),(d/2,h)]
    solid = s3d.body("arm_panel",plan=[(-d/2,wall),(-185,wall),(-60,wall),(140,wall),(d/2,wall)],top=[(y,z-cap/2) for y,z in top],bottom=[(-d/2,14),(0,8),(180,16),(d/2,h-cap*3)],n=12)
    solid = s3d.at(solid,x=10)
    crest = s3d.body("arm_cap",plan=[(-d/2,32),(-185,w),(-60,w),(140,52),(d/2,30)],top=top,bottom=[(y,z-cap) for y,z in top],n=5)
    solid = s3d.join(solid,crest)
    s3d.material(solid,"leather",color="#3b1d18")
    return s3d.group("arm_wall_group",solid)


def leg_support(w=361,d=394,t=30,lip=5):
    solid = s3d.body("leg",plan=[(-d/2,w),(d/2,w)],top=[(-d/2,32),(-170,46),(-60,50),(0,60),(d/2,92)],bottom=[(-d/2,22),(-60,16),(0,24),(d/2,50)],n=5)
    edge = s3d.body("end_lip",plan=[(-d/2,w+lip),(-170,w)],top=[(-d/2,32+lip),(-170,46+lip)],bottom=[(-d/2,32-lip),(-170,46-lip)],n=5)
    solid = s3d.join(solid,edge)
    s3d.material(solid,"leather",color="#3c160a")
    return s3d.group("leg_support_group",solid)
