import sand3d as s3d


def column():
    """The whole column: its base and the parts on it, in the world, in millimetres."""
    lower_section_placed = lower_section()
    upper_section_placed = s3d.at(upper_section(), z=1124)
    return s3d.assembly("column", lower_section_placed, upper_section_placed)


def lower_section(w=684, d=684, h=1128):
    """A straight square prism with flat vertical faces and sharp corners, centered on the Z axis. Its upper edge includes the narrow projecting lip at the transition to the narrower upper section."""
    return s3d.group("lower_section_group", s3d.box("lower_section", w, d, h))


def upper_section(w=650, d=650, h=676):
    """A slightly narrower square prism with a flat top, centered above the lower section with faces parallel and corners aligned."""
    return s3d.group("upper_section_group", s3d.box("upper_section", w, d, h))
