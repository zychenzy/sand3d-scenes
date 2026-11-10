# The Marlowe — boutique hotel lobby

Cutaway lobby in the shared Toon-hard renderer. Reception and a hearth lounge are the two working zones; a three-chair nook, elevator bench, and luggage cart keep the entry from reading as empty floor.

## Open

From this directory (symlinks resolve to existing GLBs and the vendored Three.js in `lounge/`):

```bash
cd experiments/sprint-20261110/hotel-lobby
python3 -m http.server 8791 --bind 127.0.0.1
```

http://127.0.0.1:8791/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label for screenshots.

```bash
python3 test_layout.py
node render_shots.mjs http://127.0.0.1:8791 /opt/cursor/artifacts
```

## What is in the room

- Reception desk with key cubbies, desk bell, banker's lamps, POS, and a luggage drop.
- Hearth lounge: sofa and two dining chairs face a low table, under coffers and amber pendants. The sofa looks at the painting.
- Arrival nook: round table, three chairs (open toward the aisle).
- Focal canvas in a brass arch, sculpture on the book-stand plinth, secondary canvas by the elevator.
- Bell cart with three cases, plus bags at the desk.

Furniture GLBs are symlinks, not copies. Walls, desk, luggage, rugs, and the painting are local geometry.
