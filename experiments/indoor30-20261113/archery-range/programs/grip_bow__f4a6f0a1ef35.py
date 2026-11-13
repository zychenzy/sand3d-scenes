"""Grip recurve.

Catalog program objaverse-f4a6f0a1ef354053ba614afc52868aa5
("Arco" by pacoalgebra2, CC-BY-4.0), nocked arrow omitted.
"""
import sand3d as s3d


def bow():
    body = s3d.at(bow_body(), x=9270, y=2420, z=-739.72)
    string = s3d.at(bowstring(), x=9270, y=2714, z=-714.72)
    return s3d.assembly("bow", body, string)


def bow_body(w=24, d=345, h=1500, grip_h=210, grip_d=43, limb_d=22):
    path = s3d.spline([(90,-128),(210,-157),(300,-145),(379,-103),(446,-50),(507,11),(575,74),(687,136),(740,160)])
    limb = s3d.at(s3d.wire("limb", path=path, d=limb_d), ry=-90, z=h/2)
    twin = s3d.transform(s3d.copy(limb), mirror="z", z=h)
    grip = s3d.at(s3d.box("grip", w=w, d=grip_d, h=grip_h), y=-114, z=(h-grip_h)/2)
    grip = s3d.fillet(grip, r=w/5)
    s3d.material(limb, "oak", color="#704728")
    s3d.material(twin, "oak", color="#704728")
    s3d.material(grip, "leather", color="#392a20")
    return s3d.group("bow_body", limb, twin, grip)


def bowstring(w=7.5, d=292, h=1450):
    cord = s3d.wire("string", path=[(0,-d/2,0),(0,d/2,h/2),(0,-d/2,h)], d=w)
    s3d.material(cord, "fabric", color="#c3b799")
    return s3d.group("bowstring", cord)


def arrow(w=59.3, d=917.3, h=56, shaft_d=8, head_l=70, fin_l=140, fin_t=2):
    shaft = s3d.wire("shaft", path=[(-20,-d/2+head_l,h/2),(2,d/2,h/2)], d=shaft_d)
    head = s3d.at(s3d.cone("head", d=16, d2=0, h=head_l), x=-20, y=-d/2+head_l, z=h/2, rx=90)
    outline = s3d.poly([(-fin_l/2,0),(-fin_l/3,h/3),(fin_l/4,h/2),(fin_l/2,0)])
    fin = s3d.at(s3d.extrude("fin", outline, h=fin_t, both=True), x=0, y=d/2-fin_l/2, z=h/2, rx=90, rz=90)
    second = s3d.at(s3d.copy(fin), rx=0)
    s3d.material(shaft, "pine", color="#a7814c")
    s3d.material(head, "steel", color="#777b80")
    s3d.material(fin, "fabric", color="#70513b")
    s3d.material(second, "fabric", color="#70513b")
    return s3d.group("arrow", shaft, head, fin, second)
