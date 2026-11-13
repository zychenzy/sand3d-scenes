# objaverse-74c95870e2a141a9903815715d25b8a7
# "Laundry Basket" by cirby2180, https://sketchfab.com/3d-models/74c95870e2a141a9903815715d25b8a7, CC-BY-4.0; modified: rewritten as a sand3d program
# f_score=0.9578161456525476 sand3d=1.5.0

import sand3d as s3d


def basin():
    shell = s3d.at(basin_shell(), z=-100)
    return s3d.assembly("basin", shell)


def basin_shell(w=466, d=558, h=195, bottom_w=303, bottom_d=370, floor=12, n=5):
    outer = s3d.loft("outer", s3d.station(z=0,w=bottom_w,d=bottom_d,n=n), s3d.station(z=7,w=330,d=394,n=n), s3d.station(z=55,w=408,d=488,n=n), s3d.station(z=95,w=450,d=540,n=n), s3d.station(z=135,w=w,d=d,n=n), s3d.station(z=h-12,w=458,d=550,n=n), s3d.station(z=h,w=450,d=540,n=n))
    inside = s3d.loft("inside", s3d.station(z=floor,w=300,d=374,n=n), s3d.station(z=h+5,w=446,d=544,n=n))
    outer = s3d.cut(outer, inside)
    s3d.material(outer,"plastic",color="#1044c0")
    rim = s3d.at(mouth_rim(), z=h-10)
    return s3d.group("basin_shell",outer,rim)


def mouth_rim(w=526.8,d=600,h=14.9,n=5,lip=32):
    outer = s3d.loft("rim",s3d.station(z=0,w=w-8,d=d-8,n=n),s3d.station(z=h/3,w=w,d=d,n=n),s3d.station(z=h*0.7,w=w-4,d=d-4,n=n),s3d.station(z=h,w=w-20,d=d-20,n=n))
    tool=s3d.loft("opening",s3d.station(z=-1,w=w-2*lip,d=d-2*lip,n=n),s3d.station(z=h+1,w=w-2*lip+6,d=d-2*lip+6,n=n))
    outer=s3d.cut(outer,tool)
    s3d.material(outer,"plastic",color="#0d50e7")
    return s3d.group("mouth_rim",outer)