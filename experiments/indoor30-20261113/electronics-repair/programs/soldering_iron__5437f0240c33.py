import sand3d as s3d


def soldering_iron():
    a = s3d.at(grip(), x=-49, y=81, z=-6.5)
    b = s3d.at(neck(), x=-35, y=129, z=3.5)
    c = s3d.at(cord_sleeve(), x=-63, y=35, z=-4)
    return s3d.assembly('soldering_iron', a, b, c)


def grip(length=77, rear=10, middle=19.5, front=19, rx=-82, rz=-16, pad_d=5.5, pad_h=1.3):
    solid = s3d.loft('grip', s3d.station(z=0, w=rear, d=rear), s3d.station(z=length*0.25, w=16, d=16), s3d.station(z=length*0.65, w=middle, d=middle), s3d.station(z=length, w=front, d=front))
    solid = s3d.at(solid, rx=rx, rz=rz, x=-11, y=-38, z=9.5)
    s3d.material(solid, 'plastic', color='#95ce78')
    rim = s3d.at(s3d.cylinder('pad_rim', d=pad_d, h=pad_h), x=-7, y=-25, z=18)
    s3d.material(rim, 'rubber', color='#1d1d1d')
    pad = s3d.at(s3d.cylinder('pad', d=pad_d-pad_h, h=pad_h), x=-7, y=-25, z=18.3)
    s3d.material(pad, 'plastic', color='#95ce78')
    return s3d.group('grip_group', solid, rim, pad)


def neck(length=26, diameter=19, flare=27):
    solid = s3d.loft('neck', s3d.station(z=0, w=diameter, d=diameter), s3d.station(z=length*0.7, w=diameter, d=diameter), s3d.station(z=length, w=flare, d=flare))
    solid = s3d.at(solid, rx=-82, rz=-16, x=-3.5, y=-14, z=9.5)
    s3d.material(solid, 'plastic', color='#1d1d1d')
    guard_placed = s3d.at(guard(), x=5, y=15, z=-7)
    return s3d.group('neck_group', solid, guard_placed)


def guard(width=40, upper=13, lower=23, thick=16, corner=3, recess=22, depth=6):
    solid = s3d.extrude('guard', s3d.poly([(-width/2,-upper),(width/2,-upper),(0,lower)], fillet=corner), h=thick)
    s3d.pocket(solid, s3d.circle(d=recess), depth=depth, on=solid.face('top'))
    solid = s3d.at(solid, rx=-82, rz=-16, x=-2.6, y=-8, z=19.2)
    s3d.material(solid, 'plastic', color='#95ce78')
    shaft_placed = s3d.at(shaft(), x=10, y=37, z=19.5)
    return s3d.group('guard_group', solid, shaft_placed)


def shaft(diameter=9, length=57, tip_d=3.5, tip_l=18):
    solid = s3d.cylinder('shaft', d=diameter, h=length)
    point = s3d.at(s3d.cone('tip', d=tip_d, h=tip_l, d2=0.4), z=length-0.5)
    solid = s3d.join(solid, point)
    solid = s3d.at(solid, rx=-82, rz=-16, x=-11.5, y=-37.7, z=1.2)
    s3d.material(solid, 'steel', color='#bcbcbc', roughness=0.55)
    return s3d.group('shaft_group', solid)


def cord_sleeve(length=21, rear=4, front=10, rib=0.8):
    solid = s3d.cone('sleeve', d=rear, d2=front, h=length)
    for fraction in (0.2,0.4,0.6,0.8):
        collar = s3d.at(s3d.cylinder('rib', d=rear+(front-rear)*fraction+rib, h=rib), z=length*fraction)
        solid = s3d.join(solid, collar)
    solid = s3d.at(solid, rx=-82, rz=-16, x=-3, y=-10, z=4)
    s3d.material(solid, 'rubber', color='#1d1d1d')
    cord_placed = s3d.at(cord(), x=17, y=-26, z=-2)
    return s3d.group('cord_sleeve_group', solid, cord_placed)


def cord(diameter=3):
    path = s3d.spline([(-20,16,6),(-22,0,4),(-12,-2,4),(1,3,5),(15,5,5),(23,-13,4)], tangents=((0,-1,0),(0,-1,0)))
    solid = s3d.wire('cord', path, d=diameter)
    s3d.material(solid, 'rubber', color='#1d1d1d')
    plug_placed = s3d.at(plug(), x=29, y=-32, z=-8)
    return s3d.group('cord_group', solid, plug_placed)


def plug(w=19, d=18, h=12, stem_w=12, stem_l=16, flange=23):
    solid = s3d.box('plug_body', w=w, d=d, h=h)
    stem = s3d.at(s3d.box('plug_stem', w=stem_w, d=stem_l, h=10), y=(d+stem_l)/2-1, z=1)
    lip = s3d.at(s3d.box('plug_flange', w=flange, d=2, h=16), y=-d/2, z=-2)
    solid = s3d.join(solid, stem, lip)
    s3d.fillet(solid, r=0.7)
    solid = s3d.at(solid, rz=16, y=-2, z=2)
    s3d.material(solid, 'plastic', color='#1d1d1d')
    blades_placed = s3d.at(blades(), x=4, y=-16, z=5.5)
    return s3d.group('plug_group', solid, blades_placed)


def blades(pitch=11, thick=1.5, length=12, height=4):
    blade = s3d.box('blade', w=thick, d=length, h=height)
    solids = s3d.at(blade, on=s3d.grid(nx=2, px=pitch), y=1, z=0)
    solid = s3d.group('blade_solids', solids)
    solid = s3d.at(solid, rz=16)
    s3d.material(solid, 'steel', color='#dbdbdb')
    return s3d.group('blades_group', solid)
