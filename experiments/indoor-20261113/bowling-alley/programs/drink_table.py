import sand3d as s3d


def drink_table():
    """Side table between a pair of lane seats. Top at 520 mm, 360 mm across."""
    top = s3d.at(s3d.cylinder("top", d=360, h=28), z=492)
    s3d.material(top, "walnut", color="#6a4328", roughness=0.5)
    stem = s3d.at(s3d.cylinder("stem", d=48, h=470), z=22)
    s3d.material(stem, "walnut", color="#3a2618", roughness=0.55)
    base = s3d.cylinder("base", d=240, h=22)
    s3d.material(base, "walnut", color="#2c1c12", roughness=0.55)
    return s3d.assembly("drink_table", top, stem, base)
