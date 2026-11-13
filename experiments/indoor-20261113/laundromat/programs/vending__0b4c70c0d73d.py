# objaverse-0b4c70c0d73d4f259998d5898e542104
# "Vending Machine" by Odd1In, https://sketchfab.com/3d-models/0b4c70c0d73d4f259998d5898e542104, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9942390680482498 sand3d=1.5.0

import sand3d as s3d


def vending_machine():
    body = s3d.at(cabinet(), x=22.5, y=-202.5)
    shelves = s3d.at(shelf_display(), x=202.5, y=67.5, z=630)
    controls = s3d.at(control_strip(), x=-405, y=90, z=45)
    outlet = s3d.at(dispensing_recess(), x=202.5, y=90, z=270)
    return s3d.assembly("vending_machine", body, shelves, controls, outlet)


def cabinet(w=1305, d=675, h=1800, border=45, skin=12, opening_w=855, opening_h=1080, opening_x=180, opening_z=675, control_w=270, control_x=-427.5, lower_h=540):
    body = s3d.box("frame", w=w, d=d, h=h)
    tool = s3d.at(s3d.box("display_void", w=opening_w, d=d/5+skin, h=opening_h), x=opening_x, y=d/2-d/10+skin/2, z=opening_z)
    body = s3d.cut(body, tool)
    s3d.material(body, "painted_metal", color="#777777")
    back = s3d.at(s3d.box("back_panel", w=w-2*border, d=skin, h=h-2*border), y=-d/2+skin/2, z=border)
    top = s3d.at(s3d.box("top_panel", w=w-2*border, d=d-2*border, h=skin), z=h-skin)
    side = s3d.at(s3d.box("side_panel", w=skin, d=d-2*border, h=h-2*border), x=w/2-skin/2, z=border)
    twin = s3d.transform(s3d.copy(side), mirror="x")
    for ob in (back, top, side, twin):
        s3d.material(ob, "painted_metal", color="#3ecfff")
        body = s3d.cut(body, s3d.copy(ob))
    control_cut = s3d.at(s3d.box("control_seat", w=control_w, d=skin, h=h-2*border), x=control_x, y=d/2-skin/2, z=border)
    lower_cut = s3d.at(s3d.box("lower_seat", w=opening_w, d=skin, h=lower_h), x=opening_x, y=d/2-skin/2, z=border)
    body = s3d.cut(body, control_cut, lower_cut)
    return s3d.group("cabinet", body, back, top, side, twin)


def shelf_display(w=855, d=135, h=1125, ledge=90, pitch=270, block_w=90, block_h=135, peg=45):
    backing = s3d.at(s3d.box("dark_back", w=w, d=12, h=h), y=-d/2, z=0)
    s3d.material(backing, "painted_metal", color="#444444")
    solids = [backing]
    for row in range(4):
        shelf = s3d.at(s3d.box("shelf", w=w, d=ledge, h=ledge), y=(ledge-d)/2, z=peg+row*pitch)
        s3d.material(shelf, "painted_metal", color="#eeeeee")
        solids.append(shelf)
        count = 4 if row == 2 else 6
        spacing = 180 if row == 2 else 135
        color = ("#72ad57", "#302dba", "#3ba77e", "#709da9")[row]
        stock = s3d.box("stock", w=block_w, d=peg, h=block_h)
        s3d.material(stock, "plastic", color=color)
        stock = s3d.at(stock, on=s3d.grid(nx=count, px=spacing), y=-peg, z=peg+ledge+row*pitch)
        solids.extend(stock if isinstance(stock, list) else [stock])
        lip = s3d.box("stock_stop", w=peg, d=peg, h=peg)
        s3d.material(lip, "painted_metal", color="#888888")
        lip = s3d.at(lip, on=s3d.grid(nx=count, px=spacing), y=0, z=peg+ledge+row*pitch)
        solids.extend(lip if isinstance(lip, list) else [lip])
    return s3d.group("shelf_display", *solids)


def control_strip(w=360, d=90, h=1710, border=45, skin=12, screen_w=135, screen_h=90, screen_z=1575, button=45, button_pitch=90):
    panel = s3d.at(s3d.box("blue_panel", w=w-2*border, d=skin, h=h), y=d/2-skin/2)
    s3d.material(panel, "painted_metal", color="#3ecfff")
    surround = s3d.at(s3d.box("screen_surround", w=screen_w+border, d=skin, h=screen_h+border), y=d/2-skin/2, z=screen_z-border/2)
    s3d.material(surround, "painted_metal", color="#888888")
    screen = s3d.at(s3d.box("screen", w=screen_w, d=skin, h=screen_h), y=d/2-skin/2, z=screen_z)
    s3d.material(screen, "plastic", color="#222222")
    band = s3d.at(s3d.box("control_band", w=w-2*border, d=skin, h=button_pitch*3), y=d/2-skin/2, z=h*2/3)
    s3d.material(band, "plastic", color="#345037")
    panel = s3d.cut(panel, s3d.copy(surround), s3d.copy(band))
    surround = s3d.cut(surround, s3d.copy(screen))
    buttons = s3d.box("button", w=button, d=button, h=skin)
    s3d.material(buttons, "plastic", color="#bbbbbb")
    frames = s3d.grid(nx=3, ny=3, px=button_pitch, py=button_pitch, on=s3d.Frame(origin=(0,d/2-skin/2,h/2), normal=(0,1,0)))
    buttons = s3d.at(buttons, on=frames)
    return s3d.group("control_strip", panel, surround, screen, band, buttons)


def dispensing_recess(w=855, d=90, h=315, border=45, skin=12):
    panel = s3d.at(s3d.box("lower_blue", w=w, d=skin, h=h+border*5), y=d/2-skin/2, z=-border*5)
    s3d.material(panel, "painted_metal", color="#3ecfff")
    inset = s3d.at(s3d.box("outlet_inset", w=w-2*border, d=skin, h=h-2*border), y=d/2-skin/2, z=border)
    s3d.material(inset, "painted_metal", color="#d5d5d5")
    return s3d.group("dispensing_recess", panel, inset)
