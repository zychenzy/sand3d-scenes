import sand3d as s3d


def workbench():
    top = s3d.at(tabletop(), x=-784, y=313.5, z=704)
    panel = s3d.at(upright_panel(), x=-787, y=599, z=735)
    frame = s3d.at(support_frame(), x=-784, y=330, z=649)
    return s3d.assembly('workbench', top, panel, frame)


def tabletop(w=1800, d=651, h=30, inset_w=1720, inset_d=500, rise=9):
    slab = s3d.box('top_slab', w=w, d=d, h=h)
    inner = s3d.at(s3d.box('inset_surface', w=inset_w, d=inset_d, h=rise+1), y=16.5, z=h-1)
    slab = s3d.join(slab, inner)
    s3d.material(slab, 'walnut', color='#302219')
    return s3d.group('tabletop', slab)


def upright_panel(w=1722, d=52, h=764, rim=22, skin=28):
    panel = s3d.at(s3d.box('panel_board', w=w, d=skin, h=h), y=(d-skin)/2)
    s3d.material(panel, 'walnut', color='#382a1d')
    frame = s3d.box('panel_frame', w=w, d=d, h=h)
    tool = s3d.at(s3d.box('frame_opening', w=w-2*rim, d=d+2, h=h-2*rim), z=rim)
    frame = s3d.cut(frame, tool)
    s3d.material(frame, 'painted_metal', color='#32312f')
    return s3d.group('upright_panel', panel, frame)


def support_frame(w=1780, d=540, h=64, t=28):
    solid = s3d.box('apron', w=w, d=d, h=h)
    tool = s3d.at(s3d.box('apron_void', w=w-2*t, d=d-2*t, h=h+2), z=-1)
    solid = s3d.cut(solid, tool)
    s3d.material(solid, 'painted_metal', color='#282623')
    end_legs_placed = s3d.at(end_legs(), x=-817, y=1, z=-650)
    end_legs_image = s3d.transform(s3d.copy(end_legs_placed), mirror='x')
    middle_legs_placed = s3d.at(middle_legs(), x=-17, y=1, z=-650)
    lower_shelf_placed = s3d.at(lower_shelf(), z=-408)
    return s3d.group('support_frame', solid, end_legs_placed, end_legs_image, middle_legs_placed, lower_shelf_placed)


def end_legs(w=70, d=594, h=698, t=27):
    leg = s3d.box('leg', w=w, d=t, h=h)
    legs = s3d.at(leg, on=s3d.grid(nx=1, ny=2, py=d-t))
    s3d.material(legs, 'painted_metal', color='#32312f')
    return s3d.group('end_legs', legs)


def middle_legs(w=70, d=594, h=698, t=27):
    leg = s3d.box('leg', w=w, d=t, h=h)
    legs = s3d.at(leg, on=s3d.grid(nx=1, ny=2, py=d-t))
    s3d.material(legs, 'painted_metal', color='#32312f')
    return s3d.group('middle_legs', legs)


def lower_shelf(w=1790, d=540, h=84, slab_t=30, rail_t=28):
    slab = s3d.at(s3d.box('shelf_board', w=w, d=d, h=slab_t), z=h-slab_t)
    s3d.material(slab, 'walnut', color='#302219')
    rail = s3d.box('shelf_apron', w=w, d=d, h=h-slab_t+1)
    void = s3d.at(s3d.box('shelf_void', w=w-2*rail_t, d=d-2*rail_t, h=h), z=-1)
    rail = s3d.cut(rail, void)
    s3d.material(rail, 'painted_metal', color='#252321')
    return s3d.group('lower_shelf', slab, rail)
