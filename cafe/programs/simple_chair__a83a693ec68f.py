import sand3d as s3d


def chair():
    seat_placed = s3d.at(seat(), x=-13.4, y=-26, z=-465)
    leg_frame_placed = s3d.at(leg_frame(), x=-13.4, y=-23, z=-849)
    back_rail_placed = s3d.at(back_rail(), x=-13.4, y=151, z=-449)
    return s3d.assembly('chair', seat_placed, leg_frame_placed, back_rail_placed)


def seat(w=364, d=404, h=32, front_r=34, back_r=120):
    outline = s3d.poly([(-w/2+front_r,-d/2),(w/2-front_r,-d/2),s3d.tangent_arc(to=(w/2,-d/2+front_r)),(w/2,d/2-back_r),s3d.tangent_arc(to=(w/2-back_r,d/2)),(-w/2+back_r,d/2),s3d.tangent_arc(to=(-w/2,d/2-back_r)),(-w/2,-d/2+front_r),s3d.tangent_arc(to=(-w/2+front_r,-d/2))])
    solid=s3d.extrude('seat',outline,h=h)
    s3d.fillet(solid,r=3,edges='top')
    s3d.material(solid, 'painted_metal', color='#555957')
    return s3d.group('seat_group',solid)


def leg_frame(w=430, d=450, h=388, top_w=364, top_d=404, wall=3, foot_h=70, arch_h=343, corner=45, front_r=35, rear_r=110):
    sections=[]
    for width,depth,z,r in [(w,d,foot_h,rear_r/2),(top_w,top_d,h,rear_r)]:
        outline=s3d.poly([(-width/2+front_r,-depth/2),(width/2-front_r,-depth/2),s3d.tangent_arc(to=(width/2,-depth/2+front_r)),(width/2,depth/2-r),s3d.tangent_arc(to=(width/2-r,depth/2)),(-width/2+r,depth/2),s3d.tangent_arc(to=(-width/2,depth/2-r)),(-width/2,-depth/2+front_r),s3d.tangent_arc(to=(-width/2+front_r,-depth/2))])
        sections.append(s3d.at(outline,z=z))
    solid=s3d.loft('skirt_legs',*sections)
    s3d.shell(solid,t=wall,open='start end')
    for span,turn in [(w,0),(d,90)]:
        profile=s3d.poly([(-span/2+corner,0),(span/2-corner,0),(span/2-corner,foot_h),s3d.spline([(span/2-corner,foot_h),(span/2-corner*2,arch_h-corner),(0,arch_h),(-span/2+corner*2,arch_h-corner),(-span/2+corner,foot_h)]),(-span/2+corner,0)])
        tool=s3d.extrude('arch',profile,h=d*2,both=True)
        tool=s3d.at(tool,rx=90,rz=turn)
        solid=s3d.cut(solid,tool)
    feet=s3d.at(s3d.cylinder('feet',d=24,h=foot_h+8),on=s3d.grid(nx=2,ny=2,px=w-44,py=d-30))
    s3d.material(solid,'painted_metal',color='#555957')
    s3d.material(feet,'rubber',color='#414443')
    return s3d.group('leg_frame_group',solid,feet)


def back_rail(w=454,d=204,h=450,tube_d=16):
    path=s3d.spline([(200,-98,0),(222,-65,240),(w/2,-25,350),(192,25,401),(120,74,430),(0,94,h-tube_d/2)],tangents=((0,0,1),(-1,0,0)))
    solid=s3d.wire('back_rail',path,d=tube_d)
    twin=s3d.transform(s3d.copy(solid),mirror='x')
    solid=s3d.join(solid,twin)
    s3d.material(solid,'painted_metal',color='#555957')
    back_strip_placed=s3d.at(back_strip(),x=-2.6,y=54,z=9)
    return s3d.group('back_rail_group',solid,back_strip_placed)


def back_strip(w=132,d=77,h=418,t=3):
    solid=s3d.loft('back_strip',s3d.station(z=0,w=96,d=t,y=-d/2,n=12),s3d.station(z=h,w=w,d=t,y=d/2,n=12))
    s3d.material(solid,'painted_metal',color='#555957')
    return s3d.group('back_strip_group',solid)
