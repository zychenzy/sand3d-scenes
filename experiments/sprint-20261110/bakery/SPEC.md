# Hearth neighborhood bakery

A cutaway shop, not a cafe clone. Back wall is -Z, the street window is the left wall (-X), and the front (+Z) and right (+X) are open.

## Zones

- **Bread display** — open rack on the back-left wall, baskets of loaves on the lower shelves, loose loaves above, a floor crate, and the HEARTH sign. A low bread table sits in the room so the display is not only a wall of shelves.
- **Pastry counter** — reused L-counter, yawed so the long face meets customers. Glass case with two dense shelves, register, a small coffee station, paper bags. A stanchion lane leads to the counter.
- **Open preparation** — deck oven against the back-right wall, work table with dough tubs, a scale, flour sacks, and proofing baskets, plus a peel and an ingredient shelf.
- **Window cafe** — banquette facing into the room (+X), three round tables with one chair each on the room side, and a couple’s table whose chairs face each other across the top.

## Facing

Dining chairs use +Z as forward at `rotationY = 0` (same axis as the restaurant and workshop scenes). `layout.json` records `lookAt` for each of them. `test_layout.py` checks the forward vector points at that target.

The banquette is procedural: its back is against the window and the seat faces the tables.

## Lighting

Daylight key from the window side, warm fill from the open front, pendant bulbs, a case strip, and the oven mouth. Contact discs sit under the furniture. Toon keeps a 4-step gradient; unlit keeps the same colors and treats emissive surfaces as bright.

## Launch

See `README.md`. Do not start the server inside this folder only — `../` asset URLs need the repo root.
