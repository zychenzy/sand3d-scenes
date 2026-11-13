import sand3d as s3d


def thinning_shears():
    blade = s3d.at(plain_blade(), x=-0.6, y=-32, z=-7)
    comb = s3d.at(comb_blade(), x=2, y=-29, z=-8)
    pin = s3d.at(pivot(), x=0.8, y=1, z=-7.5)
    oval = s3d.at(oval_handle(), y=15, z=-81)
    hooked = s3d.at(hooked_handle(), x=1.1, y=44, z=-70)
    return s3d.assembly('thinning_shears', blade, comb, pin, oval, hooked)


def plain_blade(t=2.6, y0=-32, z0=-7, tip_y=-66, tip_z=98, heel_y=6, heel_z=-9, width=12):
    profile = s3d.poly([(tip_y-y0-width/2,tip_z-z0-width/2),(tip_y-y0,tip_z-z0),(heel_y-y0,heel_z-z0+width),(heel_y-y0,heel_z-z0),(-6-y0,-8-z0)], fillet=1)
    ob = s3d.at(s3d.extrude('plain steel', profile, h=t), x=-t/2, rx=90, rz=90)
    s3d.material(ob, 'steel', color='#a3a5a6')
    return s3d.group('plain_blade', ob)


def comb_blade(t=2.5, y0=-29, z0=-8, length=111, width=10, angle=35, pitch=4.5, notch=2.4, depth=5.5, count=22):
    ob = s3d.box('comb steel', w=t, d=width, h=length)
    tool = s3d.box('notch', w=notch, d=t*2, h=depth)
    frame = s3d.Frame(origin=(0,width/2-depth,length-pitch*(count+1)/2+notch/2), normal=(0,1,0), up=(1,0,0))
    s3d.cut(ob, s3d.at(tool, on=s3d.grid(nx=count, px=pitch, on=frame)))
    ob = s3d.at(ob, y=-9-y0, z=4-z0, rx=angle)
    s3d.material(ob, 'steel', color='#a3a5a6')
    return s3d.group('comb_blade', ob)


def pivot(w=6.8, d=9):
    ob = s3d.at(s3d.cylinder('pivot', d=d, h=w), x=-w/2, z=d/2, ry=90)
    s3d.material(ob, 'steel', color='#989a9b')
    return s3d.group('pivot', ob)


def oval_handle(t=3.8, hole_w=20, hole_h=26, hole_y=2, hole_z=19):
    outline = s3d.spline([(-21,73),(-12,67),(-10,43),(-3,38),(12,30),(19,17),(11,3),(0,0),(-11,8),(-15,20),(-11,40)], closed=True)
    ob = s3d.extrude('oval handle', outline, h=t)
    opening = s3d.at(s3d.extrude('finger opening', s3d.ellipse(w=hole_w,d=hole_h), h=t*3), x=hole_y,y=hole_z,z=-t)
    s3d.cut(ob, opening)
    ob = s3d.at(ob, x=-t/2, rx=90, rz=90)
    s3d.material(ob, 'steel', color='#939596')
    return s3d.group('oval_handle', ob)


def hooked_handle(t=3.6, hole_w=20, hole_h=25, hole_y=7, hole_z=23, hook_t=2):
    outline = s3d.spline([(-42,63),(-16,55),(-10,45),(11,40),(22,30),(23,18),(14,6),(3,6),(-7,16),(-10,35),(-22,48)], closed=True)
    ob = s3d.extrude('hooked handle', outline, h=t)
    opening = s3d.at(s3d.extrude('finger opening', s3d.ellipse(w=hole_w,d=hole_h), h=t*3), x=hole_y,y=hole_z,z=-t)
    s3d.cut(ob, opening)
    rest = s3d.extrude('finger rest', s3d.stroke(s3d.spline([(18,11),(24,6),(33,2),(37,3)]), t=hook_t), h=t/2)
    s3d.join(ob, s3d.at(rest,z=t/4))
    ob = s3d.at(ob, x=-t/2, rx=90, rz=90)
    s3d.material(ob, 'steel', color='#939596')
    return s3d.group('hooked_handle', ob)
