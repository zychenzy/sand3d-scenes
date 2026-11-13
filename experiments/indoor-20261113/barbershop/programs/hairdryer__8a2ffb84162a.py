import sand3d as s3d


def hairdryer():
    body = s3d.at(dryer_body(), y=-24, z=163)
    grip = s3d.at(handle(), y=-3, z=55)
    nozzle = s3d.at(concentrator(), y=-90)
    return s3d.assembly('hairdryer', body, grip, nozzle)


def dryer_body(w=62, d=136, h=62, outlet=43, back=51, rim=2, bore=35, depth=38):
    shape = s3d.revolve('barrel', s3d.poly([(0,0),(back/2,0),(28,8),(w/2,28),(30,48),(27,73),(24,98),(outlet/2,d-rim),(outlet/2,d),(0,d)]))
    shape = s3d.hole(shape,d=bore,depth=depth,on=shape.face('top'))
    shape = s3d.at(shape, y=67, z=h/2, rx=90)
    s3d.material(shape, 'plastic', color='#080808')
    lip = s3d.tube('outlet_rim', d=outlet, d_in=outlet-2*rim, h=rim)
    lip = s3d.at(lip, y=67-d+rim/2, z=h/2, rx=90)
    s3d.material(lip, 'plastic', color='#ff005c')
    backlip = s3d.tube('back_rim', d=back, d_in=back-2*rim, h=rim)
    backlip = s3d.at(backlip, y=67+rim/2, z=h/2, rx=90)
    s3d.material(backlip, 'plastic', color='#ff005c')
    ribs=s3d.at(s3d.box('outlet_support',w=1,d=bore/2,h=depth),y=bore/4)
    ribs=s3d.at(ribs,on=s3d.ring(n=6,r=0))
    ribs=s3d.group('supports',ribs)
    ribs=s3d.at(ribs,y=67-d+depth,z=h/2,rx=90)
    s3d.material(ribs,'steel',color='#909195')
    return s3d.group('dryer_body_group', shape, lip, backlip, ribs)


def handle(w=28, d=27, h=114, tail=22, loop_d=3):
    solid = s3d.loft('grip', s3d.station(z=-tail,w=7,d=8,y=-5), s3d.station(z=5,w=11,d=12,y=-4), s3d.station(z=22,w=18,d=19,y=-1), s3d.station(z=55,w=w,d=d,y=4), s3d.station(z=89,w=25,d=24,y=3), s3d.station(z=h,w=28,d=35,y=4))
    s3d.material(solid,'plastic',color='#040404')
    loop = s3d.wire('hanging_loop',path=s3d.spline([(0,0,0),(0,15,6),(0,14,19),(0,10,26)]),d=loop_d)
    s3d.material(loop,'rubber',color='#171717')
    power_cord_placed = s3d.at(power_cord(), y=13, z=-55)
    return s3d.group('handle_group', solid, loop, power_cord_placed)


def power_cord(w=200, d=76, h=58, t=2.7):
    junction=(-10,15,2)
    lead=s3d.wire('cord_lead',path=s3d.spline([(0,-18,33),(0,-18,10),(-9,-8,2),(25,-27,2),(30,-17,2),(-20,-8,2),(-98,3,2),(-80,23,2),junction]),d=t)
    tail=s3d.wire('cord_tail',path=s3d.spline([junction,(58,13,2),(56,-8,2),(-10,-8,2),(-63,0,3),(-50,27,3),(15,10,2),(100,6,3)]),d=t)
    s3d.material(lead,'rubber',color='#171717')
    s3d.material(tail,'rubber',color='#171717')
    plug_placed = s3d.at(plug(), x=125, y=6)
    return s3d.group('power_cord_group',lead,tail,plug_placed)


def plug(w=51,d=26,h=24,pin=4,pitch=12):
    body=s3d.at(s3d.cylinder('plug_body',d=23,h=12),x=-1,z=h/2,ry=90)
    neck=s3d.at(s3d.cone('strain_relief',d=8,d2=14,h=28),x=-w/2,z=h/2,ry=90)
    inlet=s3d.at(s3d.cylinder('cord_entry',d=5,h=12),x=-w/2,z=3)
    s3d.material(body,'plastic',color='#101010')
    s3d.material(neck,'rubber',color='#171717')
    s3d.material(inlet,'rubber',color='#171717')
    pins=s3d.at(s3d.cylinder('pin',d=pin,h=14),on=s3d.grid(nx=2,px=pitch,on=s3d.Frame(origin=(11,0,h/2),normal=(1,0,0),up=(0,0,1))))
    s3d.material(pins,'steel',color='#909195')
    return s3d.group('plug_group',body,neck,inlet,pins)


def concentrator(w=58,d=40,h=40,t=1.3):
    solid=s3d.loft('nozzle',s3d.station(z=0,w=38,d=38),s3d.station(z=10,w=42,d=36),s3d.station(z=20,w=47,d=25),s3d.station(z=30,w=54,d=13),s3d.station(z=h,w=w,d=8,n=4))
    solid=s3d.shell(solid,t=t,open='start end')
    s3d.material(solid,'plastic',color='#171717')
    return s3d.group('concentrator_group',solid)
