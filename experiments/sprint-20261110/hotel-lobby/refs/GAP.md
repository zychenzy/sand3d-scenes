# GAP — hotel lobby

`sand3d` is not installed in this environment, so no new Objaverse programs were baked. Luggage, the reception desk, and the painting are procedural on purpose. The cafe bar counter was not reused; it reads as a cafe.

Closed in this scene:

- Coffee-table seating uses narrowed sofa bakes as burgundy club chairs, not ladder-backs. Facing is checked in `test_layout.py`.
- Front desk is long and forward, with a backlit key wall.
- One entrance mat. A runner runs from that mat to the desk, with a flower table on the path.
- Table lamps are procedural brass stems and fabric shades. The green library lamp is not used.
- Layered ceiling: reception soffit and cove, hearth coffers, pendant cords up to ceiling roses.
- Contact discs under the large masses, emissive lamp bulbs and the picture light.
- Luggage cart with three distinct cases, plus bags at the desk return.

Still open:

- No Chesterfield, bellhop, or hard-shell suitcase GLB in the local kit. Cases are primitive shells with wheels, a seam, and a tag.
- No fabric-shade table-lamp GLB. Desk and side lamps are brass cylinders and a flared shade.
- Flower GLBs are empty pots; leaves and the center bouquet are spheres.
- `book_stand` is a pedestal, not a lectern. The bronze stack on top is procedural.
- `tray_napkin` normalizes to a small object because the source bbox is tall.
- Elevator is a pair of slabs, not a sliding door. No guest rooms beyond the cutaway.
- Toon materials do not carry roughness; brass vs walnut is color, not a real metal response.
- Contact discs are flat circles, not a screen-space AO pass.
