import sand3d as s3d


def bookcase():
    """The whole bookcase: its base and the parts on it, in the world, in millimetres."""
    back_panel_placed = s3d.at(back_panel(), y=-194, z=-25)
    side_panel_placed = s3d.at(side_panel(), x=-405, z=-25)
    side_panel_image = s3d.transform(s3d.copy(side_panel_placed), mirror="x")
    bottom_slab_placed = s3d.at(bottom_slab(), z=-25)
    lower_shelf_placed = s3d.at(lower_shelf(), y=10, z=460)
    middle_shelf_placed = s3d.at(middle_shelf(), y=10, z=946)
    upper_shelf_placed = s3d.at(upper_shelf(), y=10, z=1432)
    top_slab_placed = s3d.at(top_slab(), z=1921)
    return s3d.assembly("bookcase", back_panel_placed, side_panel_placed, side_panel_image, bottom_slab_placed, lower_shelf_placed, middle_shelf_placed, upper_shelf_placed, top_slab_placed)


def back_panel(w=800, d=17, h=2000):
    """A flat rectangular back closing the shelving unit, spanning X and Z at the rear."""
    return s3d.group("back_panel_group", s3d.box("back_panel", w, d, h))


def side_panel(w=17, d=408, h=2000):
    """A straight full-height rectangular side wall, extending along Y and Z."""
    return s3d.group("side_panel_group", s3d.box("side_panel", w, d, h))


def bottom_slab(w=834, d=408, h=54):
    """A broad horizontal bottom slab with a crisp square front edge."""
    return s3d.group("bottom_slab_group", s3d.box("bottom_slab", w, d, h))


def lower_shelf(w=808, d=388, h=54):
    """A thick horizontal shelf spanning the interior width."""
    return s3d.group("lower_shelf_group", s3d.box("lower_shelf", w, d, h))


def middle_shelf(w=808, d=388, h=54):
    """A thick horizontal shelf aligned with the lower shelf."""
    return s3d.group("middle_shelf_group", s3d.box("middle_shelf", w, d, h))


def upper_shelf(w=808, d=388, h=54):
    """A thick horizontal shelf creating the fourth opening below the top."""
    return s3d.group("upper_shelf_group", s3d.box("upper_shelf", w, d, h))


def top_slab(w=834, d=408, h=54):
    """A flat horizontal cap spanning the full width and depth."""
    return s3d.group("top_slab_group", s3d.box("top_slab", w, d, h))
