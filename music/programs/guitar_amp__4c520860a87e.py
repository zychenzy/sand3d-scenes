import sand3d as s3d


def amplifier():
    cab = s3d.at(cabinet(), x=24.1, y=-26.9, z=-14)
    front = s3d.at(front_baffle(), x=24.1, y=113.5, z=13)
    driver = s3d.at(speaker(), x=26, y=-31, z=1)
    controls = s3d.at(control_strip(), x=24, y=122, z=342)
    caps = s3d.at(corner_caps(), x=24.1, y=105, z=384)
    handle = s3d.at(carry_handle(), x=24, y=-26.5, z=407.6)
    return s3d.assembly('amplifier', cab, front, driver, controls, caps, handle)


def cabinet(w=602.7, d=330.7, h=426, t=4, border=25, rear_low=118, rear_high=70, return_depth=28):
    outer = s3d.box('case', w=w, d=d, h=h)
    tunnel = s3d.at(s3d.box('interior', w=w-2*t, d=d+2*t, h=h-2*t), z=t)
    s3d.cut(outer, tunnel)
    low = s3d.at(s3d.box('rear_bottom', w=w, d=t, h=rear_low), y=-d/2+t/2)
    high = s3d.at(s3d.box('rear_top', w=w, d=t, h=rear_high), y=-d/2+return_depth/2, z=h-rear_high)
    shelf = s3d.at(s3d.box('bottom_return', w=w, d=return_depth, h=t), y=-d/2+return_depth/2, z=rear_low-t)
    upper = s3d.at(s3d.box('upper_return', w=w, d=return_depth, h=t), y=-d/2+return_depth/2, z=h-border)
    rails = s3d.at(s3d.box('edge_rail', w=border, d=border, h=h), on=s3d.grid(nx=2, px=w-border), y=d/2-border/2)
    backrails = s3d.at(s3d.box('rear_edge', w=border/2, d=border, h=h), on=s3d.grid(nx=2, px=w-border/2), y=-d/2+border/2)
    front_low = s3d.at(s3d.box('front_lower', w=w, d=border, h=border), y=d/2-border/2)
    front_high = s3d.at(s3d.box('front_upper', w=w, d=border, h=border), y=d/2-border/2, z=h-border)
    s3d.join(outer, low, high, shelf, upper, rails, backrails, front_low, front_high)
    s3d.material(outer, 'painted_metal', color='#1b1b1b')
    return s3d.group('cabinet', outer)


def front_baffle(w=552, d=3, h=372, lip=7):
    panel = s3d.box('baffle', w=w, d=d, h=h)
    s3d.material(panel, 'painted_metal', color='#1b1b1b')
    rim = s3d.at(s3d.box('lower_lip', w=w, d=lip, h=lip), y=lip/2, z=0)
    s3d.material(rim, 'painted_metal', color='#e49d60')
    return s3d.group('front_baffle', panel, rim)


def speaker(w=366, d=141, h=366, magnet=135, magnet_depth=36, t=3):
    basket = s3d.revolve('speaker_cone', s3d.poly([(magnet/2,magnet_depth),(w/2,d-t),(w/2,d),(w/2-t,d),(magnet/2-t,magnet_depth)]))
    s3d.at(basket, y=0, z=h/2, rx=-90)
    s3d.material(basket, 'painted_metal', color='#e49d60')
    motor = s3d.cylinder('magnet', d=magnet, h=magnet_depth+t)
    s3d.at(motor, y=0, z=h/2, rx=-90)
    s3d.material(motor, 'painted_metal', color='#c58753')
    return s3d.group('speaker', basket, motor)


def control_strip(w=552, d=30, h=42, knob=12, pitch=48):
    fascia = s3d.at(s3d.box('fascia', w=w, d=4, h=h), y=-d/2)
    s3d.material(fascia, 'painted_metal', color='#050505')
    knobs = s3d.at(s3d.cylinder('knob', d=knob, h=d-4), on=s3d.grid(nx=11, px=pitch), y=-d/2, z=h/3, rx=-90)
    s3d.material(knobs, 'plastic', color='#050505')
    return s3d.group('control_strip', fascia, knobs)


def corner_caps(w=602.7, d=66, h=28, t=3, span=28):
    cap = s3d.box('cap_top', w=span, d=d, h=t)
    flap = s3d.at(s3d.box('cap_flap', w=span, d=t, h=h), y=d/2-t/2, z=t-h)
    s3d.join(cap, flap)
    s3d.at(cap, x=-w/2+span/2, z=h-t)
    twin = s3d.transform(s3d.copy(cap), mirror='x')
    s3d.material(cap, 'aluminium', color='#d3d3d3')
    s3d.material(twin, 'aluminium', color='#d3d3d3')
    return s3d.group('corner_caps', cap, twin)


def carry_handle(w=161, d=29, h=14.8, shoe=19):
    strap = s3d.at(s3d.box('strap', w=w-shoe, d=d/2, h=h/2), z=h/2)
    s3d.material(strap, 'rubber', color='#050505')
    shoes = s3d.at(s3d.box('mount', w=shoe, d=d, h=h*0.7), on=s3d.grid(nx=2, px=w-shoe))
    s3d.material(shoes, 'aluminium', color='#d3d3d3')
    return s3d.group('carry_handle', strap, shoes)
