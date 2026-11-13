import sand3d as s3d


def basket():
    bowl_placed = s3d.at(bowl(), z=4)
    arch_handle_placed = s3d.at(arch_handle(), z=56)
    handle_braces_placed = s3d.at(handle_braces(), x=190, z=71)
    handle_braces_image = s3d.transform(s3d.copy(handle_braces_placed), mirror="x")
    return s3d.assembly("basket", bowl_placed, arch_handle_placed, handle_braces_placed, handle_braces_image)


def bowl(w=400, d=399.6, h=85, floor_r=130, heel_r=154, inner_r=140, floor_t=3, lip=4):
    profile = s3d.poly([(0,0),(floor_r,2),(heel_r,6),(heel_r+4,10),(w/2, h-lip/2),(w/2-lip/2,h),(w/2-14,h-lip),(inner_r,10),(inner_r-7,floor_t+1),(0,floor_t)])
    wall = s3d.revolve("bowl_wall", profile)
    wall = s3d.fillet(wall, r=1)
    s3d.material(wall, "oak", color="#917b49")
    return s3d.group("bowl_group", wall)


def arch_handle(w=400, d=10, h=294, crown_r=220, band=16, root=74):
    outer = s3d.extrude("band", s3d.ellipse(w=w, d=crown_r*2), h=d)
    inner = s3d.extrude("opening", s3d.ellipse(w=w-2*band, d=(crown_r-band)*2), h=d*3, both=True)
    outer = s3d.cut(outer, inner)
    keep = s3d.at(s3d.box("upper", w=w*2, d=h, h=d*3), y=(h/2-root), z=-d)
    outer = s3d.intersect(outer, keep)
    outer = s3d.fillet(outer, r=d/4)
    outer = s3d.at(outer, rx=90, y=d/2, z=root)
    s3d.material(outer, "oak", color="#8c7545")
    return s3d.group("arch_handle_group", outer)


def handle_braces(w=20, d=122, h=78, rod=10, toe=10):
    path = s3d.spline([(-8,-d/2,toe),(-3,-50,28),(2,-21,57),(0,0,h)])
    brace = s3d.wire("brace", path, d=rod)
    twin = s3d.transform(s3d.copy(brace), mirror="y")
    s3d.material(brace, "oak", color="#8c7340")
    s3d.material(twin, "oak", color="#8c7340")
    return s3d.group("handle_braces_group", brace, twin)
