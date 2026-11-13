# QA — North Pit

Date: 2026-11-13. Served from the repository root on `127.0.0.1:8871`. Headless Chrome, SwiftShader, 1600×1000, HUD off.

## Layout

```bash
python3 experiments/indoor-20261113/esports-room/tests/check_layout.py
```

Result: `ok — 5 stations, aisle clear, 7 shared GLBs`

Checks that passed:

- Each chair front (local +Z after yaw) points at its monitor. Monitor `rotationY` is π, so the curve's near side faces the sitter. Coach chair faces the coach monitor.
- Desks, chairs, bench, credenza, and pot stay inside the room and out of `aisle`, `coach_walk`, and `forecourt`. A chair may tuck under its own desk.
- GLB paths resolve to `cowork/`, `cafe/`, and `ktv/` outside this folder.
- `index.html` and `scene_lib.js` import `cinema/vendor/` (offline Three.js). Unlit is `MeshBasicMaterial`. Toon is `MeshToonMaterial` with a 4-step gradient.
- No study desk, dining chair, chalkboard, or banker lamp in `assets`.
- No image files under `refs/`.

## Browser

```bash
node experiments/indoor-20261113/esports-room/tools/shoot.mjs
```

| shot | bytes | mode | console errors | failed requests |
| --- | ---: | --- | ---: | ---: |
| `shots/toon_default.png` | 149892 | TOON | 0 | 0 |
| `shots/toon_corner.png` | 153547 | TOON | 0 | 0 |
| `shots/toon_close.png` | 129960 | TOON | 0 | 0 |
| `shots/unlit_default.png` | 76246 | UNLIT | 0 | 0 |

Favicon 404s are ignored. Scene status reached `ready`. GLB loads reported none in `window.__failed`.

What the frames show:

- Default: five stations on the pit mat, chair backs toward the camera and screens toward the replay wall, draft board on the right, raceway spines in the gaps, nook and bench on the left. Ceiling is lit plaster, not a black lid.
- Corner: coach desk with the round-tape monitor, note card, and the chair's teal front bolster in the foreground. The player row continues behind it.
- Close: MID screen reads "MID / SCRIM · LIVE". The red-bolster chair front, arm, keyboard, and mug sit on the sitter side of that screen.
- Unlit: same default camera, flat basic materials, replay and station screens still drawn from their maps.

## Not claimed

The monitor bezel stays faceted. The shelf headsets do not rest on pegs. The wide shot does not center the coach; the corner shot does. See `refs/GAP.md`.
