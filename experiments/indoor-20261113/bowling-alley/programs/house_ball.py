import sand3d as s3d


def house_ball():
    """Pearl house ball, 216 mm, three-hole grip on the top.

    Original sand3d program. Hugging Face search ranked bowling pins for
    "bowling ball" and did not return a usable house-ball program.

    The grip is three dark inserts on the crown. A boolean cavity in the
    same plastic disappears under MeshToonMaterial; the inserts stay readable
    in both toon and unlit. Sand3d is Z-up, so the grip lands on glTF +Y.
    """
    ball = s3d.sphere("ball", 216)
    s3d.material(ball, "plastic", color="#f4f1ea", roughness=0.32)
    grip = ((22, 12), (-22, 12), (0, -20))
    holes = []
    for index, (x, y) in enumerate(grip):
        hole = s3d.cylinder(f"finger_{index}", d=48, h=36)
        s3d.material(hole, "plastic", color="#1a120e", roughness=0.55)
        holes.append(s3d.at(hole, x=x, y=y, z=208))
    return s3d.assembly("house_ball", ball, *holes)
