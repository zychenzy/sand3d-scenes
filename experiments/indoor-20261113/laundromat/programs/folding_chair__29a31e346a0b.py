# objaverse-29a31e346a0b44659dcc0d939a2cf2d0
# "Folding Chair" by GreenLineStudio, https://sketchfab.com/3d-models/29a31e346a0b44659dcc0d939a2cf2d0, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9986776601228343 sand3d=1.5.0

import sand3d as s3d


def folding_chair():
    seat_placed = s3d.at(seat(), z=0)
    tall_frame_placed = s3d.at(tall_frame(), y=67, z=-403)
    folding_frame_placed = s3d.at(folding_frame(), y=133, z=-401)
    return s3d.assembly("folding_chair", seat_placed, tall_frame_placed, folding_frame_placed)


def seat(w=431, d=431, h=20, corner=40, edge=3):
    solid = s3d.extrude("seat", s3d.rect(w=w, d=d, r=corner), h=h)
    solid = s3d.fillet(solid, r=edge, edges="top bottom")
    s3d.material(solid, "plastic", color="#1c1c1c")
    return s3d.group("seat_group", solid)


def tall_frame(w=436, tube=26, h=837, run=418.5, bend=32, floor_y=-207):
    solid = s3d.wire("tall_frame", [(-w/2, floor_y+run, h), (-w/2, floor_y, tube/2), (w/2, floor_y, tube/2), (w/2, floor_y+run, h)], d=tube, fillet=bend)
    s3d.material(solid, "steel", color="#838383")
    backrest_placed = s3d.at(backrest(), y=135, z=539.5)
    return s3d.group("tall_frame_group", solid, backrest_placed)


def backrest(w=436, length=340, t=20, corner=30, angle=63.435, h=311):
    solid = s3d.extrude("back_panel", s3d.rect(w=w, d=length, r=corner), h=t, both=True)
    solid = s3d.fillet(solid, r=t/6, edges="top bottom")
    solid = s3d.at(solid, rx=angle, z=h/2)
    s3d.material(solid, "plastic", color="#343434")
    return s3d.group("backrest_group", solid)


def folding_frame(w=436, tube=24, h=400, run=179, floor_y=100, bend=32):
    solid = s3d.wire("folding_frame", [(-w/2, floor_y-run, h), (-w/2, floor_y, tube/2), (w/2, floor_y, tube/2), (w/2, floor_y-run, h)], d=tube, fillet=bend)
    s3d.material(solid, "steel", color="#979797")
    return s3d.group("folding_frame_group", solid)
