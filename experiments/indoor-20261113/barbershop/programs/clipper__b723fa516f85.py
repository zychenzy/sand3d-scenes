import sand3d as s3d


def clipper():
    grip = s3d.at(handle(), x=75.43, y=66.7, z=47.3)
    head = s3d.at(head_support(), x=75.43, y=-9, z=47.5)
    return s3d.assembly("clipper", grip, head)


def handle(cy=66.7, base=47.3, n=3.1, transition=75, taper_run=250, round_run=90, sections=((-1,41,31,64),(15,36,29,63),(32,34,28,62),(63,31,27,63),(85,33,29,62),(110,29,25,61),(123,28,23,61),(140,24,21,60.5),(149,12,2,69))):
    stations = [s3d.station(z=cy-y, w=w, d=h, y=c-base, n=n-max(0,y-transition)/round_run, taper=max(0,y-transition)/taper_run) for y,w,h,c in reversed(sections)]
    solid = s3d.at(s3d.loft("grip", *stations), rx=90)
    s3d.material(solid, "plastic", color="#080909", roughness=0.32)
    return s3d.group("handle_group", solid)


def head_support(cy=-9, base=47.5, n=2.8, taper=0.35, crown_n=3, crown_taper=0.2, sections=((-27,30,5,51),(-18,35,17,56),(-8,36,28,62),(7,35,35,65.5),(11,34,35,65.5),(17,34,28,63))):
    stations = [s3d.station(z=cy-y, w=w, d=h, y=c-base, n=crown_n if y>0 else n, taper=crown_taper if y>0 else taper) for y,w,h,c in reversed(sections)]
    solid = s3d.at(s3d.loft("support", *stations), rx=90)
    s3d.material(solid, "plastic", color="#090a0a", roughness=0.3)
    plate = s3d.at(cutting_plate(), y=-9.3, z=-1.2)
    return s3d.group("head_support_group", solid, plate)


def cutting_plate(w=39, length=42, t=1.4, r=8, angle=58, rise=18.5, lip=2, backing=6):
    plate = s3d.extrude("blade_plate", s3d.rect(w=w, d=length, r=r), h=t)
    s3d.material(plate, "steel", color="#393c40", roughness=0.5)
    back = s3d.at(s3d.extrude("blade_back", s3d.rect(w=w-t*2, d=length-backing*2, r=r), h=backing), y=backing/2, z=-backing+t/2)
    s3d.material(back, "plastic", color="#141719", roughness=0.4)
    edge = s3d.at(s3d.box("cutting_lip", w=w, d=lip, h=t), y=-(length-lip)/2, z=-t/4)
    s3d.material(edge, "steel", color="#cacaca", roughness=0.4)
    plate = s3d.at(plate, rx=angle, z=rise)
    back = s3d.transform(back, rx=angle, z=rise)
    edge = s3d.transform(edge, rx=angle, z=rise)
    return s3d.group("cutting_plate_group", plate, back, edge)
