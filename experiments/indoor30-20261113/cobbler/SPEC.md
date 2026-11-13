# Cobbler workshop — spec

Metres. Hard four-step toon by default (shadow stop 0.32). Unlit is `MeshBasicMaterial`. Cutaway: back wall and left wall. Street side stays open.

## Zones

1. **Repair** — bench at 0.78 m, drawers on the left, knee hole on the right, lasting jack, peg tray, tool rail. Dining chair faces −Z into the bench. Banker's lamp on the top, shade toward the sitter.
2. **Stitch** — screw horse at 0.76 m with a side-profile upper in the jaws. Dining chair faces the horse. The mug sits on the repair bench's lower shelf.
3. **Finisher** — floor machine against the left wall. Motor, column, arm, wheel at about 0.9 m, pedal. Dining chair faces the wheel (−X).
4. **Handoff** — counter at 1.04 m. Till faces +Z. Bell, ticket spike, finished pair, wrapped pairs on the shelf. Waiting bench on the open right, clear of the counter.
5. **Wall** — last rack under the back window, ticket pigeonholes on the back right, tagged shoes on a freestanding rail. One apron on the left wall.

Foreground is a low stool, a boot, and a shoe on a mat, left of the counter.

## Palette

Plaster `#f3eadf`, wainscot `#6a4630`, maple tops `#d7b98a`, oak `#8b5a34`. Leather is oxblood, chestnut, and near-black `#2f2824` — not pure black. Iron `#5d666e`, brass `#c6a15a`, tickets `#f4efe2`.

## Cameras

- Default: open front-right, across the counter toward the bench and finisher.
- `corner`: open right, along the bench.
- `close`: stitch horse.

## Checks

`tests/check_layout.py` checks shared paths, heights, facing, and 0.9 m passages. `tests/render_shots.mjs` loads the four shots, checks GLB failures, and checks that default materials are `MeshToonMaterial` and unlit materials are `MeshBasicMaterial`.
