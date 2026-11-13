# objaverse-4949ac257c7848c7a6c9149218ecfaae
# "Washing Machine" by sixpence, https://sketchfab.com/3d-models/4949ac257c7848c7a6c9149218ecfaae, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9547888665543586 sand3d=1.5.0

import sand3d as s3d


def washer():
    body = s3d.at(cabinet(), x=-75.5, y=-15, z=-351)
    cap = s3d.at(top_cap(), x=-75.5, y=-15, z=327)
    front = s3d.at(door(), x=-65, y=250, z=-241)
    controls = s3d.at(console(), x=-75, y=-168, z=350)
    return s3d.assembly("washer", body, cap, front, controls)


def cabinet(w=588, d=532, h=702, turn=1):
    body = s3d.box("body", w=w, d=d, h=h)
    body = s3d.fillet(body, r=3, edges="side")
    body = s3d.at(body, rz=turn)
    s3d.material(body, "painted_metal", color="#cbcbcb")
    return s3d.group("cabinet", body)


def top_cap(w=588, d=532, h=24, turn=1):
    lid = s3d.box("lid", w=w, d=d, h=h)
    lid = s3d.fillet(lid, r=3, edges="all")
    s3d.material(lid, "painted_metal", color="#cbcbcb")
    return s3d.group("top_cap", s3d.at(lid, rz=turn))


def door(radius=240, depth=28, ring_outer=214, crest=194, inner=166, base=5):
    surround = s3d.revolve("surround", s3d.poly([(inner,0),(radius,0),(radius,base),(ring_outer,base+1),(crest,depth),(crest-9,depth),(inner,base+1)]))
    disk = s3d.cylinder("recessed_disk", d=inner*2+2, h=base+1)
    s3d.material(surround, "rubber", color="#121212")
    s3d.material(disk, "glass", color="#292929", roughness=0.3)
    surround = s3d.at(surround, rx=-90, z=radius)
    disk = s3d.at(disk, rx=-90, z=radius)
    return s3d.group("door", surround, disk)


def console(w=584, d=220, h=148, main_h=108, end_w=82, main_d=136, slope=38, recess=4, border=12):
    profile = s3d.poly([(-d/2,0),(-d/2,main_h),(-d/2+main_d-slope,main_h),(-d/2+main_d,0)])
    panel = s3d.extrude("console_body", profile, h=w)
    panel = s3d.at(panel, x=-w/2, rx=90, rz=90)
    end_profile = s3d.poly([(-d/2,0),(-d/2,h),(d/2-24,h),(d/2,main_h),(d/2,0)])
    end = s3d.extrude("console_end", end_profile, h=end_w)
    end = s3d.at(end, x=-w/2, rx=90, rz=90)
    panel = s3d.join(panel, end)
    face = s3d.Frame(origin=(end_w/2, -d/2+main_d-slope/2, main_h/2), normal=(0,main_h,slope), up=(0,0,1))
    inset_profile = s3d.rect(w=w-end_w-border*2, d=main_h-border*2)
    panel = s3d.pocket(panel, inset_profile, depth=recess, on=face)
    inset = s3d.extrude("control_inset", inset_profile, h=recess/2, on=face.offset(d=-recess))
    s3d.material(panel, "painted_metal", color="#c1c1c1")
    s3d.material(inset, "plastic", color="#585858")
    return s3d.group("console", panel, inset)
