import sand3d as s3d


def comb():
    body = s3d.at(comb_body(), x=88.43, y=20.88, z=-20.7)
    return s3d.assembly("comb", body)


def comb_body(w=3.6, d=180, h=45, top_r=9, bottom_r=3, slot_w=2.7, pitch=5.4, tooth_h=27, slots=33, edge_r=0.6):
    outline = s3d.poly([(-d/2+bottom_r, 0), (d/2-bottom_r, 0), s3d.arc(center=(d/2-bottom_r, bottom_r), r=bottom_r, start=-90, end=0), (d/2, h-top_r), s3d.arc(center=(d/2-top_r, h-top_r), r=top_r, start=0, end=90), (-d/2+top_r, h), s3d.arc(center=(-d/2+top_r, h-top_r), r=top_r, start=90, end=180), (-d/2, bottom_r), s3d.arc(center=(-d/2+bottom_r, bottom_r), r=bottom_r, start=180, end=270)])
    blank = s3d.extrude("comb_blank", outline, h=w, both=True, on=s3d.Frame(normal=(1, 0, 0), up=(0, 0, 1)))
    blank = s3d.fillet(blank, r=edge_r, edges="top bottom")
    tool = s3d.box("slot", w=w*2, d=slot_w, h=tooth_h+bottom_r)
    tools = s3d.at(tool, on=s3d.grid(nx=1, ny=slots, py=pitch), z=-bottom_r)
    blank = s3d.cut(blank, tools)
    s3d.material(blank, kind="plastic", color="#303033", roughness=0.35)
    return s3d.group("comb_body", blank)
