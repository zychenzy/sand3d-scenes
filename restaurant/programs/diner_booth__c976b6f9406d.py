import sand3d as s3d


def diner_booth():
    top = s3d.at(tabletop(), x=46, y=-32, z=191)
    legs = s3d.at(pedestal(), x=12, y=-20, z=-467)
    bench = s3d.at(booth_bench(), x=18, y=-807, z=-486.6)
    other = s3d.at(opposing_bench(), x=27, y=727, z=-486.6)
    return s3d.assembly("diner_booth", top, legs, bench, other)


def tabletop(w=1372, d=811, h=90, r=65, rim=12):
    edge = s3d.extrude("rim", s3d.rect(w=w, d=d, r=r), h=h)
    s3d.material(edge, "painted_metal", color="#444240")
    surface = s3d.at(s3d.extrude("top", s3d.rect(w=w, d=d, r=r), h=rim), z=h-rim)
    s3d.material(surface, "oak", color="#a57520")
    return s3d.group("tabletop", edge, surface)


def pedestal(pitch=739, h=678, foot=227, post=89, flare_h=110, cap=460, cap_h=25):
    leg = s3d.revolve("pedestal", s3d.poly([(0,0),(foot/2,0),(foot/2,30),(post/2,flare_h),(post/2,h-cap_h),(cap/2,h-cap_h),(cap/2,h),(0,h)]))
    s3d.material(leg, "chrome", color="#bdb9b6")
    placed = s3d.at(leg, x=-pitch/2)
    twin = s3d.transform(s3d.copy(placed), mirror="x")
    return s3d.group("pedestal", placed, twin)


def booth_bench(w=1467, d=680, h=973.1):
    solid = bench_shape(w=w, d=d, h=h)
    return s3d.group("booth_bench", solid)


def bench_shape(w, d, h):
    outline = s3d.poly([(-334,0),(298,0),(298,155),(290,170),(337,438),(337,483),(311,512),(-190,435),s3d.spline([(-190,435),(-140,558),(-108,683),(-108,785),(-145,897),(-223,955)]),(-228,h),(-320,h),(-320,170),(-334,155)])
    solid = s3d.at(s3d.extrude("bench", outline, h=w), x=-w/2, rx=90, rz=90)
    s3d.material(solid, "leather", color="#703e3d")
    return solid


def opposing_bench(w=1467, d=660, h=973.1):
    solid = bench_shape(w=w, d=d, h=h)
    solid = s3d.transform(solid, mirror="y")
    return s3d.group("opposing_bench", solid)
