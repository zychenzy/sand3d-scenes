import sand3d as s3d


def table():
    top = s3d.at(tabletop(), z=680)
    tray = s3d.at(apron(), z=582)
    frame = s3d.at(leg_frame(), x=278)
    twin = s3d.transform(s3d.copy(frame), mirror="x")
    rail = s3d.at(low_rail(), z=145)
    loops = s3d.at(wire_loops(), x=281, z=598)
    images = s3d.transform(s3d.copy(loops), mirror="x")
    return s3d.assembly("table", top, tray, frame, twin, rail, loops, images)


def tabletop(w=590, d=442.5, h=20, corner=18, edge=5):
    top = s3d.extrude("top", s3d.rect(w=w, d=d, r=corner), h=h)
    s3d.fillet(top, r=edge, edges="top bottom")
    s3d.material(top, kind="oak", color="#b5894d")
    return s3d.group("tabletop", top)


def apron(w=520, d=358, h=98, bottom_w=438, bottom_d=321, t=2):
    tray = s3d.loft("tray", s3d.station(z=0, w=bottom_w, d=bottom_d, y=12, n=12), s3d.station(z=15, w=468, d=338, y=4, n=16), s3d.station(z=h, w=w, d=d, y=-5, n=20))
    s3d.shell(tray, t=t, open="end")
    tool = s3d.at(s3d.box("opening", w=w*2, d=d, h=h*2), y=d-12, z=t)
    s3d.cut(tray, tool)
    s3d.material(tray, kind="painted_metal", color="#a0a0a5")
    return s3d.group("apron", tray)


def leg_frame(h=668, foot_x=12, top_x=-14, foot_y=168, top_y=141, tube=17, sleeve=20, sleeve_h=28, rail_x=5, rail_y=158, rail_z=145):
    frame = s3d.wire("frame", path=[(foot_x,-foot_y, sleeve_h/2),(top_x,-top_y,h-18),(top_x,-top_y+18,h),(top_x,top_y-18,h),(top_x,top_y,h-18),(foot_x,foot_y,sleeve_h/2)], d=tube, fillet=18)
    rail = s3d.wire("side_rail", path=[(rail_x,-rail_y+10,rail_z),(rail_x,rail_y,rail_z)], d=14)
    feet=[]
    for side in [-1,1]:
        foot = s3d.loft("foot", s3d.station(z=0,w=sleeve,d=sleeve,x=foot_x+1,y=side*(foot_y+1)), s3d.station(z=sleeve_h,w=sleeve,d=sleeve,x=foot_x,y=side*foot_y))
        s3d.material(foot, kind="rubber", color="#262627")
        feet.append(foot)
    s3d.material(frame, kind="brushed_steel", color="#bfc0c5")
    s3d.material(rail, kind="brushed_steel", color="#bfc0c5")
    return s3d.group("leg_frame", frame, rail, feet)


def low_rail(w=566, y=-167, r=20, tube=14):
    rail=s3d.wire("cross_rail", path=[(-w/2,y+r,0),(-w/2,y,0),(w/2,y,0),(w/2,y+r,0)], d=tube, fillet=r)
    s3d.material(rail, kind="brushed_steel", color="#bfc0c5")
    return s3d.group("low_rail", rail)


def wire_loops(w=36, d=28, h=76, tube=4.5):
    loops=[]
    for side in [-1,1]:
        loop=s3d.wire("loop", path=[(-w/2,side*d/2,h),(-w/2,side*d/2,15),(0,side*d/2,5),(w/2,side*d/3,30),(w/2,0,40)], d=tube, fillet=8)
        s3d.material(loop, kind="brushed_steel", color="#bfc0c5")
        loops.append(loop)
    return s3d.group("wire_loops", loops)
