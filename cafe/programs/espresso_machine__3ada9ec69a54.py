import sand3d as s3d


def espresso_machine():
    foot = s3d.at(base(), x=-7.5, y=4, z=-126.5)
    shell = s3d.at(body(), x=-8, y=-38, z=-106.5)
    return s3d.assembly("espresso_machine", foot, shell)


def base(w=352.2, d=260, h=40, rim=5, recess=4):
    solid = s3d.box("plinth", w=w, d=d, h=h-rim)
    s3d.material(solid, "painted_metal", color="#040404")
    tray = s3d.at(s3d.extrude("tray", s3d.rect(w-rim, d-rim, chamfer=rim), h=rim), z=h-rim)
    s3d.pocket(tray, s3d.rect(w-4*rim, d-4*rim), depth=recess, on=tray.face("top"))
    s3d.material(tray, "steel", color="#646769")
    return s3d.group("base_group", solid, tray)


def body(w=339, d=153, h=175, nose=44, pitch=112):
    solid = s3d.at(s3d.box("body", w=w, d=d, h=h), y=-11.5)
    pillars = s3d.at(s3d.cylinder("front_columns", d=nose, h=h), on=s3d.grid(2, px=pitch), y=65, z=13)
    solid = s3d.join(solid, pillars)
    s3d.material(solid, "painted_metal", color="#040404")
    upper_housing_placed = s3d.at(upper_housing(), y=35, z=159.5)
    return s3d.group("body_group", solid, upper_housing_placed)


def upper_housing(w=340, d=246, h=44, bevel=14):
    solid = s3d.loft("upper_housing", s3d.station(z=0, w=w, d=d-10, y=-5, n=20), s3d.station(z=h-bevel, w=w, d=d, n=20), s3d.station(z=h, w=w-2*bevel, d=d-2*bevel, y=-5, n=20))
    s3d.material(solid, "steel", color="#76797c")
    fascia = s3d.at(s3d.box("fascia", w=w-4, d=9, h=27), y=d/2-8, z=0)
    s3d.material(fascia, "plastic", color="#040404")
    top_tray_placed = s3d.at(top_tray(), x=-2, y=6, z=42.2)
    brew_fitting_placed = s3d.at(brew_fitting(), x=57, y=105, z=-63)
    brew_fitting_image = s3d.transform(s3d.copy(brew_fitting_placed), mirror="x", x=2)
    front_knob_placed = s3d.at(front_knob(), x=131, y=116, z=6)
    front_knob_image = s3d.transform(s3d.copy(front_knob_placed), mirror="x", x=2)
    steam_tube_placed = s3d.at(steam_tube(), x=131.5, y=84, z=-123)
    steam_tube_image = s3d.transform(s3d.copy(steam_tube_placed), mirror="x", x=2)
    return s3d.group("upper_housing_group", solid, fascia, top_tray_placed, brew_fitting_placed, brew_fitting_image, front_knob_placed, front_knob_image, steam_tube_placed, steam_tube_image)


def top_tray(w=281, d=179, h=31.5, t=5):
    plate = s3d.box("tray_floor", w=w, d=d, h=t)
    back = s3d.at(s3d.box("back_border", w=w, d=t, h=h), y=-(d-t)/2)
    end = s3d.at(s3d.box("end_border", w=t, d=d, h=h), x=(w-t)/2)
    twin = s3d.transform(s3d.copy(end), mirror="x")
    plate = s3d.join(plate, back, end, twin)
    s3d.material(plate, "painted_metal", color="#040404")
    return s3d.group("top_tray_group", plate)


def brew_fitting(w=49, d=90, h=64, cup_d=34, cup_h=26, handle_d=15):
    cup = s3d.at(s3d.cylinder("filter_cup", d=cup_d, h=cup_h), y=-27)
    upper = s3d.at(s3d.cone("head", d=w-6, d2=w, h=h-cup_h-9), y=-27, z=cup_h-1)
    flange = s3d.at(s3d.cylinder("flange", d=w, h=9), y=-27, z=h-10)
    cup = s3d.join(cup, upper, flange)
    s3d.material(cup, "steel", color="#646769")
    handle = s3d.at(s3d.cylinder("handle", d=handle_d, h=52), y=-7, z=handle_d/2, rx=-90)
    s3d.material(handle, "plastic", color="#040404")
    return s3d.group("brew_fitting_group", cup, handle)


def front_knob(w=24, d=20, h=24):
    solid = s3d.at(s3d.cylinder("knob", d=w, h=d), y=-d/2, z=h/2, rx=-90)
    s3d.material(solid, "plastic", color="#1e1f20")
    return s3d.group("front_knob_group", solid)


def steam_tube(w=9, d=43, h=116, tube_d=4):
    solid = s3d.wire("bent_tube", path=[(0,d/2,0),(0,d/2,h/2),(0,-d/2,h-9),(0,-d/2,h)], d=tube_d, fillet=6)
    tip = s3d.at(s3d.cylinder("nozzle", d=w-2, h=12), y=d/2)
    solid = s3d.join(solid, tip)
    s3d.material(solid, "steel", color="#4d4f51")
    return s3d.group("steam_tube_group", solid)
