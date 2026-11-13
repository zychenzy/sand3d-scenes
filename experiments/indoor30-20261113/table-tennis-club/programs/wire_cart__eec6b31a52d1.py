import sand3d as s3d


def wire_basket():
    floor = s3d.at(basket_floor(), x=9840, y=5755, z=128)
    frame = s3d.at(handle_frame(), x=9840, y=5755, z=32)
    ends = s3d.at(end_wall(), x=9840, y=5755, z=128)
    wall = s3d.at(side_wall(), x=232, z=128)
    twin = s3d.transform(s3d.copy(wall), mirror="x")
    wall = s3d.transform(wall,x=9840,y=5755)
    twin = s3d.transform(twin,x=9840,y=5755)
    return s3d.assembly("wire_basket", floor, frame, ends, wall, twin)


def basket_floor(w=460, d=458, h=6, pitch=29.4, wire=1.4, tie=3.5):
    rods = s3d.at(s3d.cylinder("floor_wires", d=wire, h=d), on=s3d.grid(nx=14, px=pitch), y=d/2, z=h/3, rx=90)
    cross = s3d.at(s3d.cylinder("floor_ties", d=tie, h=w), on=s3d.grid(nx=1, ny=4, py=d/3), x=-w/2, z=h/2, ry=90)
    s3d.material(rods, "steel", color="#ffffff")
    s3d.material(cross, "steel", color="#ffffff")
    return s3d.group("basket_floor", rods, cross)


def handle_frame(w=477, d=473, h=788, t=15, bar=32, r=40):
    p = s3d.poly([(-w/2,0),(-w/2,h-r),s3d.arc(center=(-w/2+r,h-r),r=r,start=180,end=90),(w/2-r,h),s3d.arc(center=(w/2-r,h-r),r=r,start=90,end=0),(w/2,0),(w/2-t,0),(w/2-t,h-bar-r+t),s3d.arc(center=(w/2-r,h-bar-r+t),r=r-t,start=0,end=90),(-w/2+r,h-bar),s3d.arc(center=(-w/2+r,h-bar-r+t),r=r-t,start=90,end=180),(-w/2+t,0)])
    frame = s3d.at(s3d.extrude("bent_handle", p, h=t), y=-(d-t)/2+t/2, rx=90)
    other = s3d.transform(s3d.copy(frame), mirror="y")
    s3d.material(frame, "steel", color="#ffffff")
    s3d.material(other, "steel", color="#ffffff")
    leg_ends_placed = s3d.at(leg_ends(), y=4, z=-32)
    return s3d.group("handle_frame", frame, other, leg_ends_placed)


def leg_ends(w=460, d=458, h=38, cap=20):
    foot = s3d.extrude("foot", s3d.ellipse(w=cap,d=cap*1.4), h=h)
    s3d.fillet(foot,r=cap/3)
    feet = s3d.at(foot,on=s3d.grid(nx=2,ny=2,px=w,py=d))
    s3d.material(feet,"rubber",color="#5f5f5f")
    return s3d.group("leg_ends", feet)


def end_wall(w=460, d=458, h=572, pitch=29.4, wire=1.4, tie=3.5, rail=4, rail_h=42):
    rods = s3d.at(s3d.cylinder("uprights",d=wire,h=h),on=s3d.grid(nx=14,ny=2,px=pitch,py=d))
    ties = []
    for z in (tie, h/3, h*2/3):
        pair = s3d.at(s3d.cylinder("horizontal_tie",d=tie,h=w),on=s3d.grid(nx=1,ny=2,py=d),x=-w/2,z=z,ry=90)
        ties.extend(pair)
    rails = s3d.at(s3d.box("upper_rail",w=w,d=rail,h=rail_h),on=s3d.grid(nx=1,ny=2,py=d),z=h-rail_h)
    s3d.material(rods,"steel",color="#ffffff")
    s3d.material(ties,"steel",color="#ffffff")
    s3d.material(rails,"steel",color="#bcbcbc")
    return s3d.group("end_wall",rods,ties,rails)


def side_wall(w=15, d=458, h=572, pitch=29.4, wire=1.4, tie=3.5, rail=4, rail_h=42, phase=-11):
    rods = s3d.at(s3d.cylinder("uprights",d=wire,h=h),on=s3d.grid(nx=1,ny=14,py=pitch),y=phase)
    ties=[]
    for z in (tie,h/3,h*2/3):
        rod=s3d.at(s3d.cylinder("horizontal_tie",d=tie,h=d),y=d/2,z=z,rx=90)
        ties.append(rod)
    rail_ob=s3d.at(s3d.box("upper_rail",w=rail,d=d,h=rail_h),z=h-rail_h)
    s3d.material(rods,"steel",color="#ffffff")
    s3d.material(ties,"steel",color="#ffffff")
    s3d.material(rail_ob,"steel",color="#bcbcbc")
    return s3d.group("side_wall",rods,ties,rail_ob)
