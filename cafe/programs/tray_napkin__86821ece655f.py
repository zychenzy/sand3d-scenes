import sand3d as s3d


def shelf_stand():
    rail = s3d.at(peak_rail(), z=98)
    frame = s3d.at(end_frame(), x=136, y=6, z=-126.1)
    twin = s3d.transform(s3d.copy(frame), mirror="x")
    upper = s3d.at(upper_shelf(), z=-6.5)
    lower = s3d.at(lower_shelf(), z=-107)
    return s3d.assembly("shelf_stand", rail, frame, twin, upper, lower)


def peak_rail(w=280, d=12, h=12):
    rail = s3d.at(s3d.cylinder("rail", d=d, h=w), x=-w/2, z=h/2, ry=90)
    s3d.material(rail, "oak", color="#e9c688")
    return s3d.group("peak_rail", rail)


def end_frame(w=2, d=18, h=238.1, front=-64, back=64, peak=-6, inset=56, rise=16):
    front_leg = s3d.loft("front_leg", s3d.station(z=rise, w=w, d=d, x=-w/2, y=front), s3d.station(z=h-d/2, w=w, d=d, x=-w/2, y=peak))
    back_leg = s3d.loft("back_leg", s3d.station(z=rise, w=w, d=d, x=w/2, y=back), s3d.station(z=h-d/2, w=w, d=d, x=w/2, y=peak))
    returns=[]
    for y in (front, back):
        path=s3d.spline([(0,rise),(-w, rise/2),(-inset/2,w),(-inset,rise),(-136,rise)])
        band=s3d.extrude("return", s3d.stroke(path,t=w), h=d)
        band=s3d.at(band, y=y+d/2, rx=90)
        returns.append(band)
    s3d.material(front_leg,"painted_metal",color="#191919")
    s3d.material(back_leg,"painted_metal",color="#191919")
    s3d.material(returns,"painted_metal",color="#191919")
    return s3d.group("end_frame",front_leg,back_leg,returns)


def upper_shelf(w=260, d=192.8, h=13, n=4.4, edge=3):
    shelf=s3d.loft("shelf",s3d.station(z=0,w=w-edge*8,d=d-edge*18,n=n),s3d.station(z=edge,w=w,d=d,n=n),s3d.station(z=h-edge,w=w,d=d,n=n),s3d.station(z=h,w=w-edge*8,d=d-edge*18,n=n))
    s3d.material(shelf,"oak",color="#e9c688")
    return s3d.group("upper_shelf",shelf)


def lower_shelf(w=260, d=192.8, h=13, n=4.4, edge=3, tilt=2.4):
    shelf=s3d.loft("shelf",s3d.station(z=0,w=w-edge*8,d=d-edge*18,n=n),s3d.station(z=edge,w=w,d=d,n=n),s3d.station(z=h-edge,w=w,d=d,n=n),s3d.station(z=h,w=w-edge*8,d=d-edge*18,n=n))
    shelf=s3d.at(shelf,rx=tilt)
    s3d.material(shelf,"oak",color="#e9c688")
    return s3d.group("lower_shelf",shelf)
