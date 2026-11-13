import sand3d as s3d


def lane_seat():
    """One bowling settee. Local front is the open side.

    Sand3d is Z-up. The backrest sits at -Y so a glTF export (Y-up, Z = -Y)
    puts `back_surface` toward +Z and the cushion toward -Z. rotationY = 0
    then faces the pins.
    """
    cushion = s3d.at(s3d.box("cushion", 700, 460, 90), z=360)
    s3d.material(cushion, "leather", color="#7a2438", roughness=0.55)
    back = s3d.at(s3d.box("back_surface", 700, 72, 400), y=-248, z=430)
    s3d.material(back, "leather", color="#641c2e", roughness=0.55)
    arms = []
    for index, x in enumerate((-332, 332)):
        arm = s3d.at(s3d.box(f"arm_{index}", 64, 420, 160), x=x, y=-10, z=430)
        s3d.material(arm, "leather", color="#641c2e", roughness=0.55)
        arms.append(arm)
    legs = []
    for index, (x, y) in enumerate(((-300, -180), (300, -180), (-300, 180), (300, 180))):
        leg = s3d.at(s3d.box(f"leg_{index}", 46, 46, 360), x=x, y=y)
        s3d.material(leg, "walnut", color="#3a2618", roughness=0.6)
        legs.append(leg)
    rail = s3d.at(s3d.box("back_rail", 640, 28, 22), y=-248, z=820)
    s3d.material(rail, "oak", color="#c2a06a", roughness=0.45)
    return s3d.assembly("lane_seat", cushion, back, rail, *arms, *legs)
