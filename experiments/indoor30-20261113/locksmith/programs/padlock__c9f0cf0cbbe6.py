import sand3d as s3d


def padlock():
    body = s3d.at(lock_body(), y=-18, z=-8.12)
    loop = s3d.at(shackle(), y=21, z=-2.5)
    return s3d.assembly("padlock", body, loop)


def lock_body(w=55.4, d=44, h=16.24, edge_h=12, shoulder=14):
    profile = s3d.poly([(-w/2,(h-edge_h)/2), s3d.spline([(-shoulder,0),(0,0),(shoulder,0),(w/2,(h-edge_h)/2)]), (w/2,(h+edge_h)/2), s3d.spline([(shoulder,h),(0,h),(-shoulder,h),(-w/2,(h+edge_h)/2)])])
    solid = s3d.at(s3d.extrude("body", profile, h=d), rx=90, y=d/2)
    s3d.material(solid, "brass", color="#5e4a17")
    return s3d.group("lock_body", solid)


def shackle(bar=5, half_w=19.5, reach=35.5, leg=15):
    y0=-reach/2
    yc=y0+leg
    path = s3d.spline([(-half_w,y0,bar/2),(-half_w,yc,bar/2),(-half_w*0.707,yc+half_w*0.707,bar/2),(0,yc+half_w,bar/2),(half_w*0.707,yc+half_w*0.707,bar/2),(half_w,yc,bar/2),(half_w,y0,bar/2)], tangents=((0,1,0),(0,-1,0)))
    solid = s3d.wire("loop", path, d=bar)
    s3d.material(solid, "steel", color="#c3c7c7")
    return s3d.group("shackle", solid)
