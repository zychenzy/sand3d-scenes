import sand3d as s3d
import math


def auditorium_chair():
    a=s3d.at(back_shell(),x=-116.8,y=-159,z=357)
    b=s3d.at(back_pad(),x=-116.8,y=-159,z=357)
    c=s3d.at(side_support(),x=180.5,y=118,z=3)
    e=s3d.transform(s3d.copy(c),mirror='x',x=-233.6)
    f=s3d.at(lower_panel(),x=-116.8,y=49,z=151.5)
    return s3d.assembly('auditorium_chair',a,b,c,e,f)


def back_shell(w=620,h=546,t=18):
    a=back_surface(w=w,h=h,t=t,inset=-7,bulge=0)
    s3d.material(a,'walnut',color='#d1a383')
    return s3d.group('back_shell',a)

def back_surface(w=620,h=546,t=18,inset=-7,bulge=0):
    sections=[]
    for f in [-1,-0.94,-0.78,-0.5,0,0.5,0.78,0.94,1]:
        q=1-math.sqrt(1-(f*0.99)**2)
        bottom_y=-12+175*q+inset
        top_y=-182+310*q+inset
        bottom_z=9+60*f*f
        top_z=h-135*f*f
        thick=t+bulge*f*f
        p=s3d.poly([(bottom_y,bottom_z),(bottom_y+thick,bottom_z+5),(top_y+thick,top_z-5),(top_y,top_z)])
        sections.append(s3d.at(p,on=s3d.Frame(origin=(w*f/2,0,0),normal=(1,0,0),up=(0,0,1))))
    return s3d.loft('back_surface',*sections)


def back_pad(w=600,h=525,t=35,inset=4,bulge=26):
    a=back_surface(w=w,h=h,t=t,inset=inset,bulge=bulge)
    s3d.material(a,'leather',color='#62191e')
    return s3d.group('back_pad',a)


def side_support(w=61,d=317,h=647,t=40,foot=32,cap=28,angle=-1.3):
    a=s3d.at(s3d.box('upright',w=t,d=d-57,h=h-foot-cap),z=foot)
    b=s3d.box('foot',w=w,d=d,h=foot)
    c=s3d.at(s3d.box('cap',w=w,d=d+10,h=cap),z=h-cap)
    a=s3d.join(a,b,c)
    s3d.fillet(a,r=3)
    s3d.material(a,'walnut',color='#d1a383')
    return s3d.group('side_support',s3d.at(a,rz=angle))


def lower_panel(w=550,d=245,h=541,t=24):
    p=s3d.poly([(-119,94),s3d.spline([(-122,63),(-110,35),(-86,20),(-40,4),(-5,0),(5,3)]),(110,450),s3d.spline([(122,520),(118,528),(78,539),(50,541),(23,534),(-3,516),(-24,482),(-57,376)])])
    a=s3d.extrude('cushion',p,h=w)
    a=s3d.at(a,rx=90,rz=90,x=-w/2)
    s3d.material(a,'leather',color='#62191e')
    p2=s3d.poly([(-5,0),(5,3),(122,520),(118,528),(98,534),(-22,9)])
    b=s3d.extrude('underside',p2,h=w)
    b=s3d.at(b,rx=90,rz=90,x=-w/2)
    s3d.material(b,'walnut',color='#85684f')
    crossbar_placed=s3d.at(crossbar(),y=87,z=227)
    return s3d.group('lower_panel',a,b,crossbar_placed)


def crossbar(w=590,d=17,h=17):
    a=s3d.cylinder('bar',d=d,h=w)
    a=s3d.at(a,ry=90,x=-w/2,z=h/2)
    s3d.material(a,'steel',color='#c0c0c0')
    return s3d.group('crossbar',a)
