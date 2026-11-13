# objaverse-b6aa6e7f91d545f3bb5d4027a83e2da1
# "Laundry Basket" by fatihmcnn, https://sketchfab.com/3d-models/b6aa6e7f91d545f3bb5d4027a83e2da1, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9714425596827106 sand3d=1.5.0

import sand3d as s3d
import math


def basket():
    shell = s3d.at(basket_shell(), x=8.836, y=-3.761, z=6.05)
    return s3d.assembly("basket", shell)


def basket_shell(w=392, d=467, h=246, t=2.5, n=3.8, floor_w=270, floor_d=361, shoulder=68, pitch_x=26, pitch_y=33.4, pitch_z=23.4, bar=7, opening_z=69, r=70, bow=20):
    outer = s3d.loft("basket_shell", s3d.station(z=0, w=floor_w, d=floor_d, n=n), s3d.station(z=9, w=316, d=401, n=n), s3d.station(z=27, w=363, d=442, n=n), s3d.station(z=shoulder, w=w, d=d, n=n))
    inner = s3d.loft("inside", s3d.station(z=t, w=floor_w, d=floor_d, n=n), s3d.station(z=9+t, w=316-2*t, d=401-2*t, n=n), s3d.station(z=27+t, w=363-2*t, d=442-2*t, n=n), s3d.station(z=shoulder+t, w=w-2*t, d=d-2*t, n=n))
    outer = s3d.cut(outer, inner)
    wall = s3d.extrude("lattice_walls", rim_outline(w=w,d=d,r=r,bow=bow), h=h-shoulder+t)
    wall = s3d.pocket(wall, rim_outline(w=w-2*t,d=d-2*t,r=r-t,bow=bow))
    wall = s3d.at(wall,z=shoulder-t)
    outer = s3d.join(outer,wall)
    short_tool = s3d.extrude("short_opening", s3d.rect(w=pitch_x-bar, d=pitch_z-bar), h=d*2, both=True)
    short_frames = s3d.grid(nx=8, ny=6, px=pitch_x, py=pitch_z, on=s3d.Frame(origin=(0,0,opening_z+(pitch_z*5)/2), normal=(0,-1,0)))
    short_tool = s3d.at(short_tool, on=short_frames)
    long_tool = s3d.extrude("long_opening", s3d.rect(w=pitch_y-bar, d=pitch_z-bar), h=w*2, both=True)
    long_frames = s3d.grid(nx=10, ny=6, px=pitch_y, py=pitch_z, on=s3d.Frame(origin=(0,0,opening_z+(pitch_z*5)/2), normal=(1,0,0)))
    long_tool = s3d.at(long_tool, on=long_frames)
    outer = s3d.cut(outer, short_tool, long_tool)
    handle = s3d.extrude("handle_tool", s3d.slot(l=68, d=13), h=d*2, both=True)
    handle = s3d.at(handle, z=h-24, rx=90)
    outer = s3d.cut(outer, handle)
    s3d.material(outer, kind="plastic", color="#d8d8d8")
    rim = s3d.at(rolled_rim(), z=233.05)
    return s3d.group("basket_shell_group", outer, rim)


def rolled_rim(w=421.8, d=501.9, h=20.5, t=2.5, reach=17, r=85, bow=20):
    profile = rim_outline(w=w, d=d, r=r, bow=bow)
    inside = rim_outline(w=w-2*reach, d=d-2*reach, r=r-reach, bow=bow)
    top = s3d.extrude("rim_crown", profile, h=t)
    top = s3d.pocket(top, inside)
    top = s3d.at(top, z=h-t)
    skirt = s3d.extrude("rim_skirt", profile, h=h/2)
    skirt = s3d.pocket(skirt, rim_outline(w=w-2*t, d=d-2*t, r=r-t, bow=bow))
    skirt = s3d.at(skirt, z=h/2-t)
    inner_return = s3d.extrude("inner_return", rim_outline(w=w-2*reach+2*t, d=d-2*reach+2*t, r=r-reach+t, bow=bow), h=h/2)
    inner_return = s3d.pocket(inner_return, inside)
    inner_return = s3d.at(inner_return, z=h/2-t)
    rim = s3d.join(top, skirt, inner_return)
    s3d.material(rim, kind="plastic", color="#d8d8d8")
    return s3d.group("rolled_rim_group", rim)


def rim_outline(w, d, r, bow):
    a=w/2-r-bow
    b=d/2-r
    radius=(b*b+bow*bow)/(2*bow)
    angle=math.degrees(math.atan2(b,radius-bow))
    return s3d.poly([(-a,-d/2),(a,-d/2),s3d.arc(center=(a,-b),r=r,start=270,end=360),s3d.arc(center=(w/2-radius,0),r=radius,start=-angle,end=angle),s3d.arc(center=(a,b),r=r,start=0,end=90),(-a,d/2),s3d.arc(center=(-a,b),r=r,start=90,end=180),s3d.arc(center=(-w/2+radius,0),r=radius,start=180-angle,end=180+angle),s3d.arc(center=(-a,-b),r=r,start=180,end=270)])
