import sand3d as s3d


def blockwork():
    middle = s3d.at(middle_section(), x=276.3, y=-52.9, z=98)
    cap = s3d.at(top_slab(), x=276.3, y=-52.9, z=266)
    lower = s3d.at(lower_block(), x=276.3, y=-116.8, z=-74)
    companion = s3d.at(lower_companion(), x=276.3, y=10.8, z=-74)
    upright = s3d.at(outer_upright(), x=275.5, y=-244.6, z=-73.8)
    other = s3d.at(outer_companion(), x=277, y=138.4, z=-73.8)
    return s3d.assembly("blockwork", middle, cap, lower, companion, upright, other)


def middle_section(w=121, d=233, h=161, bevel=2):
    body = s3d.box("middle_section", w=w, d=d, h=h)
    s3d.chamfer(body, d=bevel, edges="top bottom")
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("middle_section", body)


def top_slab(w=121, d=233, h=50, bevel=2):
    body = s3d.box("top_slab", w=w, d=d, h=h)
    s3d.chamfer(body, d=bevel, edges="top bottom")
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("top_slab", body)


def lower_block(w=121, d=117, h=161, bevel=3):
    body = s3d.box("lower_block", w=w, d=d, h=h)
    s3d.chamfer(body, d=bevel, edges="top")
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("lower_block", body)


def lower_companion(w=121, d=117, h=161, bevel=3):
    body = s3d.box("lower_companion", w=w, d=d, h=h)
    s3d.chamfer(body, d=bevel, edges="top")
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("lower_companion", body)


def outer_upright(w=121, d=117, h=455.8, shoulder_h=393, block_w=48, block_d=46, pitch=51.5, block_x=-1, bevel=3, overlap=1):
    body = s3d.box("upright", w=w, d=d, h=shoulder_h)
    s3d.chamfer(body, d=bevel, edges="top")
    blocks = s3d.at(s3d.box("raised_block", w=block_w, d=block_d, h=h-shoulder_h+overlap), on=s3d.grid(nx=1, ny=2, py=pitch), x=block_x, z=shoulder_h-overlap)
    body = s3d.join(body, blocks)
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("outer_upright", body)


def outer_companion(w=121, d=117, h=455.8, shoulder_h=393, block_w=48, block_d=46, pitch=51.5, block_x=-1, bevel=3, overlap=1):
    body = s3d.box("upright", w=w, d=d, h=shoulder_h)
    s3d.chamfer(body, d=bevel, edges="top")
    blocks = s3d.at(s3d.box("raised_block", w=block_w, d=block_d, h=h-shoulder_h+overlap), on=s3d.grid(nx=1, ny=2, py=pitch), x=block_x, z=shoulder_h-overlap)
    body = s3d.join(body, blocks)
    s3d.material(body, kind="painted_metal", color="#e78e45")
    return s3d.group("outer_companion", body)
