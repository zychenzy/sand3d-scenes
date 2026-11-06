import sand3d as s3d


def register():
    base=s3d.at(plinth(),y=-12,z=-76)
    body=s3d.at(hood_body(),y=-14,z=-54)
    ledge=s3d.at(front_ledge(),y=-115,z=-45)
    return s3d.assembly('register',base,body,ledge)


def plinth(w=240.5,d=317,h=31,rim=8,foot=13):
    base=s3d.box('foot',w=w,d=d,h=foot)
    bevel=s3d.at(s3d.extrude('bevel',s3d.rect(w=w,d=d),h=h-foot,taper=24),z=foot-0.2)
    base=s3d.join(base,bevel)
    s3d.material(base,'painted_metal',color='#080808')
    return s3d.group('plinth',base)


def hood_body(w=217,d=295,h=276,front=-152,back=147,step=82,floor=82,top=275,cy=42,cz=178,r=97,wall=28,recess=31):
    p=s3d.poly([(front,9),(back,9),(back,top),(cy,top),s3d.arc(center=(cy,cz),r=r,start=90,end=180),(-65,168),(-56,102),(front,101),(front,floor),(step,floor),(step,9)])
    solid=s3d.at(s3d.extrude('housing',p,h=w),x=-w/2,rx=90,rz=90)
    side=s3d.at(s3d.box('lower_side',w=wall,d=step-front,h=floor-9),x=(w-wall)/2,y=(step+front)/2,z=9)
    twin=s3d.transform(s3d.copy(side),mirror='x')
    solid=s3d.join(solid,side,twin)
    solid=s3d.pocket(solid,s3d.rect(w=w-30,d=39),depth=recess,on=s3d.Frame(origin=(0,121.5,top)))
    s3d.material(solid,'painted_metal',color='#160909')
    indicators=s3d.at(s3d.box('indicators',w=w/6,d=3,h=recess),on=s3d.grid(nx=3,px=w/4),y=123,z=top-recess)
    central=s3d.at(s3d.box('central_indicator',w=w/12,d=3,h=recess*2),y=133,z=top-recess)
    s3d.material(indicators,'steel',color='#777777')
    s3d.material(central,'painted_metal',color='#160909')
    key_bank_placed=s3d.at(key_bank(),y=-77,z=119.5)
    crest_support_placed=s3d.at(crest_support(),x=101,y=123,z=274)
    crest_support_image=s3d.transform(s3d.copy(crest_support_placed),mirror='x')
    crest_placed=s3d.at(crest(),y=123,z=344)
    return s3d.group('hood_body',solid,indicators,central,key_bank_placed,crest_support_placed,crest_support_image,crest_placed)


def key_bank(w=193,d=47,h=51,cap=16,stem=5,pitch=29,thick=15):
    shaft=s3d.at(s3d.cylinder('stem',d=stem,h=d-cap/2),rx=-70,z=cap/2,y=-d/2+cap/2)
    tip=s3d.at(s3d.cylinder('key',d=cap,h=thick),rx=-20,y=-d/2+cap/2,z=cap/2-thick/2)
    key=s3d.join(tip,shaft)
    s3d.material(key,'steel',color='#222222')
    upper=s3d.at(s3d.copy(key),on=s3d.grid(nx=6,px=pitch),z=h-cap,y=4)
    lower=s3d.at(key,on=s3d.grid(nx=7,px=pitch))
    return s3d.group('key_bank',lower,upper)


def crest_support(w=15,d=48,h=70,t=3,cap_h=6):
    p=s3d.poly([(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2),(-w/2,d/2-t),(0,d/2-t),(0,-d/2+t),(-w/2,-d/2+t)])
    post=s3d.extrude('post',p,h=h-cap_h+1)
    cap=s3d.at(s3d.box('cap',w=w+t,d=d+t,h=cap_h),z=h-cap_h)
    post=s3d.join(post,cap)
    s3d.material(post,'painted_metal',color='#170b09')
    return s3d.group('crest_support',post)


def crest(w=210,d=7,h=84):
    p=s3d.poly([(-w/2,7),(-w/2,24),s3d.spline([(-w/2,24),(-w*.40,h*.55),(-w*.12,h*.79),(-w*.06,h),(w*.02,h),(w*.06,h*.84),(w*.42,h*.71),(w/2,h*.51),(w*.44,7)]),(w*.44,7)])
    plate=s3d.at(s3d.extrude('crest',p,h=d),y=d/2,rx=90)
    s3d.material(plate,'brass',color='#79752a')
    rail=s3d.at(s3d.box('crossbar',w=w,d=48,h=4),z=-7)
    s3d.material(rail,'painted_metal',color='#171713')
    return s3d.group('crest',plate,rail)


def front_ledge(w=161,d=188,h=76,t=10,bottom=5,partition=3,depth=175,rise=52,pitch=36):
    tray=s3d.box('tray',w=w,d=d,h=bottom)
    wall=s3d.at(s3d.box('front',w=w,d=t,h=h),y=-(d-t)/2)
    side=s3d.at(s3d.box('border',w=partition,d=d-t,h=rise+bottom),x=(w-t)/2,y=t/2)
    twin=s3d.transform(s3d.copy(side),mirror='x')
    back=s3d.at(s3d.box('back',w=w-t,d=partition,h=rise+bottom),y=(d-t)/2)
    dividers=s3d.at(s3d.box('divider',w=partition,d=depth,h=rise),on=s3d.grid(nx=3,px=pitch),x=-partition,y=-(d-depth)/2+t,z=bottom-1)
    cross=s3d.at(s3d.box('cross',w=w-t,d=partition,h=rise),y=-22,z=bottom-1)
    tray=s3d.join(tray,wall,side,twin,back,dividers,cross)
    removal=s3d.at(s3d.box('wide_compartment',w=partition*2,d=58,h=rise+partition),x=-pitch-partition,y=-55,z=bottom)
    tray=s3d.cut(tray,removal)
    s3d.material(tray,'painted_metal',color='#191919')
    trim=s3d.at(s3d.box('brass_front',w=w,d=partition,h=h),y=-(d-partition)/2)
    s3d.material(trim,'brass',color='#77732a')
    return s3d.group('front_ledge',tray,trim)
