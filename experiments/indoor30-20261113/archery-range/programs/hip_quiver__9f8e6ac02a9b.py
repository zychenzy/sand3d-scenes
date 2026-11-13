"""Hip quiver.

Catalog program objaverse-9f8e6ac02a9b4243b7ea3c3e2708a5ef
("quiver" by Iben_Vroman, CC-BY-4.0). Unmodified.
"""
import sand3d as s3d


def quiver():
    body = s3d.at(quiver_body(), x=-13, y=13)
    return s3d.assembly('quiver', body)


def quiver_body(w=110, d=205, h=414, t=4, lip=6):
    body = body_blank(w=w,d=d,h=h,inset=0)
    inside = s3d.at(body_blank(w=w,d=d,h=h,inset=t),z=t)
    body = s3d.cut(body,inside)
    tool = s3d.at(s3d.extrude('mouth_cut',s3d.ellipse(w=190,d=d),h=w*2,both=True),ry=90,z=h+11)
    body = s3d.cut(body,tool)
    rim = s3d.wire('rolled_lip',path=body.edge('mouth_cut'),d=lip)
    curl = mouth_curl(w=w,d=d,h=h,t=t,lip=lip)
    curl_other = s3d.transform(s3d.copy(curl),mirror='y')
    curls = s3d.merge(curl,curl_other)
    back = s3d.transform(s3d.copy(curls),mirror='x')
    body = s3d.join(body,rim,curls,back)
    s3d.material(body,'leather',color='#65412c')
    cuff = s3d.at(lower_cuff(),z=0)
    strap = s3d.at(shoulder_strap(),x=-2,y=-152,z=-56)
    arrows = s3d.at(arrow_bundle(),x=-1,y=-26,z=44)
    return s3d.group('quiver_body',body,cuff,strap,arrows)


def body_blank(w,d,h,inset):
    return s3d.loft('body_blank',s3d.station(z=0,w=56-inset*2,d=108-inset*4,n=2.5),s3d.station(z=12,w=70-inset*2,d=134-inset*4,n=2.5),s3d.station(z=55,w=74-inset*2,d=146-inset*4,n=2.5),s3d.station(z=180,w=85-inset*2,d=158-inset*4,n=2.5),s3d.station(z=310,w=100-inset*2,d=180-inset*4,n=2.5),s3d.station(z=h,w=w-inset*2,d=d-inset*4,n=2.5))


def mouth_curl(w,d,h,t,lip):
    return s3d.wire('curled_trim',path=s3d.spline([(w/2-t,0,h-110),(w/2-t,d/4,h-100),(w/2-t*2,d/3,h-90),(w/2-t*2,d/3,h-80),(w/2-t,d/4,h-80),(w/2-t,d/4,h-90)]),d=lip)


def lower_cuff(w=76,d=148,h=72,t=4):
    cuff=s3d.loft('cuff',s3d.station(z=1,w=57,d=110,n=2.5),s3d.station(z=14,w=72,d=137,n=2.5),s3d.station(z=h,w=w,d=d,n=2.5))
    cuff=s3d.shell(cuff,t=t,open='end')
    tool=s3d.at(s3d.extrude('scallop',s3d.ellipse(w=80,d=130),h=w*2,both=True),ry=90,z=h)
    cuff=s3d.cut(cuff,tool)
    piping=s3d.wire('cuff_border',path=cuff.edge('scallop'),d=t)
    cuff=s3d.join(cuff,piping)
    s3d.material(cuff,'leather',color='#4b3023')
    return s3d.group('lower_cuff',cuff)


def shoulder_strap(w=21,d=158,h=340,t=3):
    path=s3d.spline([(0,76,h),(0,48,314),(0,-7,250),(0,-42,199),(0,-62,160),(0,-76,108),(0,-74,64),(0,-61,35),(0,-31,9),(0,0,1),(0,24,9),(0,76,56)])
    strap=s3d.sweep('strap',s3d.rect(w=w,d=t),path=path)
    s3d.material(strap,'leather',color='#4b3023')
    return s3d.group('shoulder_strap',strap)


def arrow_bundle(h=400,shaft=5,fin_w=31,fin_h=65):
    arrows=[]
    for x,y,dz,lean,dx in [(-22,29,-4,-72,0),(-1,33,-6,-47,0),(23,50,0,-99,0),(15,39,-9,-86,-26)]:
        rod=s3d.wire('shaft',path=[(x,y,0),(x+dx,y+lean,h+dz)],d=shaft)
        s3d.material(rod,'oak',color='#927044')
        feather=s3d.extrude('feather',s3d.ellipse(w=fin_w,d=fin_h),h=1.5,both=True)
        feather=s3d.at(feather,x=x+dx,y=y+lean+6,z=h+dz-fin_h/2-12,rx=90,rz=45)
        s3d.material(feather,'fabric',color='#514b3c')
        arrows.extend([rod,feather])
    return s3d.group('arrow_bundle',*arrows)
