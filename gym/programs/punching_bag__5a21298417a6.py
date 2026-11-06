import sand3d as s3d
import math


def punching_bag():
    frame = s3d.at(overhead_frame(), y=117)
    foot = s3d.at(spread_foot(), x=270, y=90, z=-4)
    twin_foot = s3d.transform(s3d.copy(foot), mirror="x")
    brace = s3d.at(diagonal_brace(), x=161, y=208, z=48)
    twin_brace = s3d.transform(s3d.copy(brace), mirror="x")
    chains = s3d.at(suspension(), y=-8, z=995)
    return s3d.assembly("punching_bag", frame, foot, twin_foot, brace, twin_brace, chains)


def overhead_frame(w=37, depth=68, upright_y=383, bend_y=284, bend_z=1244, radius=133, arm_end=-183, arm_top=1371, cap_w=48, cap_length=67, cap_h=80, peg_d=17, peg_top=1496, origin_y=117):
    outer_y = upright_y + depth / 2 - origin_y
    inner_y = upright_y - depth / 2 - origin_y
    cy = bend_y - origin_y
    outline = s3d.poly([(inner_y, 0), (outer_y, 0), (outer_y, bend_z), s3d.arc(center=(cy, bend_z), r=radius, start=0, end=90), (arm_end-origin_y, arm_top), (arm_end-origin_y, arm_top-depth), (cy, arm_top-depth), s3d.arc(center=(cy, bend_z), r=radius-depth, start=90, end=0), (inner_y, 0)])
    frame = s3d.extrude("bent_steel", outline, h=w, on=s3d.Frame(origin=(-w/2,0,0), normal=(1,0,0), up=(0,0,1)))
    cap = s3d.at(s3d.box("arm_cap", w=cap_w, d=cap_length, h=cap_h), y=arm_end-origin_y+cap_length/2, z=arm_top-depth/2-cap_h/2)
    peg = s3d.at(s3d.cylinder("peg", d=peg_d, h=peg_top-arm_top+peg_d), y=-origin_y, z=arm_top-peg_d)
    collar = s3d.at(s3d.cylinder("peg_collar", d=peg_d*1.6, h=peg_d), y=-origin_y, z=arm_top-peg_d/2)
    frame = s3d.join(frame, cap, peg, collar)
    s3d.material(frame, "painted_metal", color="#30343a")
    return s3d.group("overhead_frame", frame)


def spread_foot(start_x=0, start_y=383, end_x=516, end_y=-193, width=37, height=68, cap_width=48, cap_length=76, cap_height=80, origin_x=270, origin_y=90, base=6):
    dx = end_x-start_x
    dy = end_y-start_y
    length = math.hypot(dx,dy)
    angle = math.degrees(math.atan2(-dx,dy))
    beam = s3d.at(s3d.box("foot_beam", w=width, d=length, h=height), x=(start_x+end_x)/2-origin_x, y=(start_y+end_y)/2-origin_y, z=base, rz=angle)
    cap = s3d.at(s3d.box("foot_cap", w=cap_width, d=cap_length, h=cap_height), x=end_x-origin_x, y=end_y-origin_y, rz=angle)
    s3d.material(beam, "painted_metal", color="#30343a")
    s3d.material(cap, "rubber", color="#222326")
    return s3d.group("spread_foot", beam, cap)


def diagonal_brace(bottom_x=319, bottom_y=28, bottom_z=68, top_x=0, top_y=393, top_z=1010, width=28, thickness=12, origin_x=161, origin_y=208, origin_z=48):
    dx = top_x-bottom_x
    dy = top_y-bottom_y
    dz = top_z-bottom_z
    length = math.sqrt(dx*dx+dy*dy+dz*dz)
    brace = s3d.extrude("brace", s3d.rect(w=width,d=thickness), h=length, on=s3d.Frame(origin=(bottom_x-origin_x,bottom_y-origin_y,bottom_z-origin_z), normal=(dx,dy,dz)))
    s3d.material(brace, "painted_metal", color="#30343a")
    return s3d.group("diagonal_brace", brace)


def suspension(w=250, d=260, h=310, wire_d=4, link_w=20, link_h=32, chain_bottom=145, chain_top=308, pitch=24, shoulder_y=-122, shoulder_z=15):
    links = []
    for i in range(8):
        link = chain_link(link_w=link_w, link_h=link_h, wire_d=wire_d)
        link = s3d.at(link, y=8, z=chain_bottom+i*pitch, ry=90, rz=(i%2)*90)
        links.append(link)
    branch_links = []
    tilt = -math.degrees(math.atan2(-shoulder_y,chain_bottom-shoulder_z))
    for i in range(8):
        link = chain_link(link_w=link_w, link_h=link_h, wire_d=wire_d)
        link = s3d.at(link, y=shoulder_y*i/7, z=chain_bottom+(shoulder_z-chain_bottom)*i/7, ry=90, rx=tilt)
        branch_links.append(link)
    branch = s3d.group("shoulder_chain", branch_links)
    branches = s3d.at(branch, on=s3d.ring(n=3,r=0), y=8)
    hanging_bag_placed = s3d.at(hanging_bag(), y=8, z=-839)
    return s3d.group("suspension", links, branches, hanging_bag_placed)


def chain_link(link_w, link_h, wire_d):
    link = s3d.extrude("chain_link", s3d.slot(l=link_h-wire_d,d=link_w-wire_d), h=wire_d)
    link = s3d.pocket(link, s3d.slot(l=link_h-wire_d*3,d=link_w-wire_d*3))
    s3d.material(link, "steel", color="#999da0")
    return link


def hanging_bag(d=275, h=880, round_r=50):
    bag = s3d.cylinder("padded_bag", d=d, h=h)
    bag = s3d.fillet(bag, r=round_r, edges="top bottom")
    s3d.material(bag, "leather", color="#282426", roughness=0.6)
    return s3d.group("hanging_bag", bag)
