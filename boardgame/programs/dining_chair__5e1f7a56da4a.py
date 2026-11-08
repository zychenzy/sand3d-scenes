import sand3d as s3d


def chair():
    seat_placed = s3d.at(seat(), x=-158.8, y=35.14, z=442.5)
    back_post_placed = s3d.at(back_post(), x=7, y=259, z=60.8)
    back_post_image = s3d.transform(s3d.copy(back_post_placed), mirror="x", x=-317.6)
    front_leg_placed = s3d.at(front_leg(), x=7, y=-201, z=60.8)
    front_leg_image = s3d.transform(s3d.copy(front_leg_placed), mirror="x", x=-317.6)
    side_stretcher_placed = s3d.at(side_stretcher(), x=7, y=35, z=250)
    side_stretcher_image = s3d.transform(s3d.copy(side_stretcher_placed), mirror="x", x=-317.6)
    back_bars_placed = s3d.at(back_bars(), x=-158.8, y=259, z=587.5)
    return s3d.assembly("chair", seat_placed, back_post_placed, back_post_image, front_leg_placed, front_leg_image, side_stretcher_placed, side_stretcher_image, back_bars_placed)


def seat(w=361.5, d=510.1, h=35):
    slab = s3d.box("seat", w=w, d=d, h=h)
    s3d.material(slab, "oak", color="#806044")
    return s3d.group("seat_group", slab)


def back_post(w=29, d=61, h=1000):
    post = s3d.box("back_post", w=w, d=d, h=h)
    s3d.material(post, "oak", color="#806044")
    return s3d.group("back_post_group", post)


def front_leg(w=29, d=39, h=398.4):
    leg = s3d.box("front_leg", w=w, d=d, h=h)
    s3d.material(leg, "oak", color="#806044")
    return s3d.group("front_leg_group", leg)


def side_stretcher(w=24, d=452, h=14):
    rail = s3d.box("side_stretcher", w=w, d=d, h=h)
    s3d.material(rail, "oak", color="#806044")
    return s3d.group("side_stretcher_group", rail)


def back_bars(w=337, d=37, h=35, pitch=125.3, count=4):
    bars = []
    for i in range(count):
        bar = s3d.box("back_bar", w=w, d=d, h=h)
        s3d.material(bar, "oak", color="#806044")
        bars.append(s3d.at(bar, z=i*pitch))
    return s3d.group("back_bars_group", *bars)
