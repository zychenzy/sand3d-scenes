import sand3d as s3d
import math


def monitor():
    panel = s3d.at(screen(), x=293.8, y=12, z=846)
    mount = s3d.at(rear_mount(), x=299, y=-27, z=973)
    return s3d.assembly("monitor", panel, mount)


def screen(w=600, h=306, t=20, sag=26, y_mid=-23):
    radius = (w*w/4+sag*sag)/(2*sag)
    a = math.degrees(math.asin(w/2/radius))
    profile = s3d.poly([(-w/2,y_mid+sag), s3d.arc(center=(0,y_mid+radius), r=radius, start=270-a, end=270+a), (w/2,y_mid+sag+t), s3d.arc(center=(0,y_mid+radius+t), r=radius, start=270+a, end=270-a)])
    solid = s3d.extrude("curved_screen", profile, h=h)
    s3d.material(solid, "plastic", color="#000000")
    return s3d.group("screen_group", solid)


def rear_mount(d=100, depth=15, rim_d=120, rim_t=4, connector_w=61, connector_h=16, connector_d=25):
    disc = s3d.at(s3d.cylinder("mount_disc", d=d, h=depth), y=6, z=d/2, rx=-90)
    s3d.chamfer(disc, d=6, edges="bottom")
    rim = s3d.at(s3d.tube("raised_rim", d=rim_d, d_in=d, h=rim_t), y=17, z=d/2, rx=-90)
    connector = s3d.at(s3d.box("connector", w=connector_w, d=connector_d, h=connector_h), y=-4, z=d/2-connector_h/2)
    s3d.material(disc, "plastic", color="#282828")
    s3d.material(rim, "plastic", color="#505050")
    s3d.material(connector, "plastic", color="#000000")
    post = s3d.at(upright(), y=-20, z=-168)
    return s3d.group("rear_mount_group", disc, rim, connector, post)


def upright(d=32, h=233):
    solid = s3d.cylinder("upright", d=d, h=h)
    s3d.material(solid, "aluminium", color="#a5a5a5")
    arm = s3d.at(base_arm(), x=109.8, y=29)
    twin = s3d.transform(s3d.copy(arm), mirror="x", x=-10.4)
    return s3d.group("upright_group", solid, arm, twin)


def base_arm(w=230, rise=58, thickness=32, h=22):
    solid = s3d.loft("rounded_arm", s3d.station(z=0, w=h, d=thickness, y=-rise/2), s3d.station(z=w, w=h, d=thickness, y=rise/2))
    solid = s3d.at(solid, x=-w/2, z=h/2, ry=90)
    s3d.material(solid, "aluminium", color="#a5a5a5")
    return s3d.group("base_arm_group", solid)
