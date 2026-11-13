"""Recurve bow.

Catalog program objaverse-d1593958dbbb4187a2b3c08ae30741c3
("Recurve Bow" by DanielMcGavin2898, CC-BY-4.0), arrow omitted.
"""
import sand3d as s3d


import os

# Rack bow: the catalog arrow stays in arrow() but is not assembled.
# A stored bow on a rack is not drawn. Limb color via BOW_LIMB.
LIMB = os.environ.get("BOW_LIMB", "#513323")

def bow():
    body = s3d.at(bow_body(), x=8, y=-15, z=54.7)
    # y=-293 is the catalog brace. In the export that is the tip plane
    # (glTF z ≈ 0.29 m), so the cord meets both limb tips.
    string = s3d.at(bowstring(), x=8, y=-293, z=69.7)
    return s3d.assembly("bow", body, string)


def bow_body(w=49, h=1700, tip_y=-296, bend_y=-198, knee_y=-68, bend_z=75, knee_z=269, straight_z=508, grip_z=710, grip_w=43):
    levels = [(0, tip_y, w), (bend_z, bend_y, w), (knee_z, knee_y, w), (straight_z, 0, w), (grip_z, 0, w), (grip_z + w / 2, 0, grip_w)]
    stations = [s3d.station(z=z, w=width, d=width, y=y) for z, y, width in levels]
    stations += [s3d.station(z=h-z, w=width, d=width, y=y) for z, y, width in reversed(levels)]
    limb = s3d.loft("angular_limbs", *stations)
    s3d.material(limb, "walnut", color=LIMB)
    return s3d.group("bow_body_group", limb)


def bowstring(d=8, h=1670):
    string = s3d.cylinder("string", d=d, h=h)
    s3d.material(string, "fabric", color="#b9aa88")
    return s3d.group("bowstring_group", string)


def arrow(shaft_d=8, tail_y=-571, tail_z=417, head_y=224, head_z=1137, tip_y=315, tip_z=1216, shoulder_y=160, shoulder_z=1125, notch_y=204, notch_z=1115, barb_y=210, barb_z=1068, blade_t=3, fin_w=26, fin_l=110):
    shaft = s3d.wire("shaft", path=[(0, tail_y, tail_z), (0, head_y, head_z)], d=shaft_d)
    head = s3d.extrude("head", s3d.poly([(shoulder_y, shoulder_z), (tip_y, tip_z), (barb_y, barb_z), (notch_y, notch_z)]), h=blade_t, both=True)
    head = s3d.at(head, rx=90, rz=90)
    fin = s3d.extrude("fletching", s3d.poly([(tail_y-fin_w/2, tail_z), (tail_y+fin_l-fin_w/2, tail_z+fin_l), (tail_y+fin_l, tail_z+fin_l-fin_w), (tail_y, tail_z-fin_w/2)]), h=fin_w, both=True)
    fin = s3d.at(fin, rx=90, rz=90)
    s3d.material(shaft, "pine", color="#926d41")
    s3d.material(head, "steel", color="#737b82")
    s3d.material(fin, "fabric", color="#d4c8af")
    return s3d.group("arrow_group", shaft, head, fin)
