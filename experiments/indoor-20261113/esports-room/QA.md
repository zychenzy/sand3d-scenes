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
| `shots/toon_default.png` | 193741 | TOON | 0 | 0 |
| `shots/toon_corner.png` | 224272 | TOON | 0 | 0 |
| `shots/toon_close.png` | 179232 | TOON | 0 | 0 |
| `shots/unlit_default.png` | 103941 | UNLIT | 0 | 0 |

Favicon 404s are ignored. Scene status reached `ready`. GLB loads reported none in `window.__failed`.

What the frames show:

- Default: five chairs face the monitors. From behind, each back is a narrow waist, shoulder wings, and a separate headrest. Tape ticks and the near raceway mark the carpet. Replay reads NORTH PIT / 14:22. The coach desk corner is at the near right.
- Corner: coach monitor reads COACH · ROUND TAPE. Keyboard rows, mouse, headset stand, and the chair's teal front bolster are on the sitter side. The player row is behind.
- Close: MID reads SCRIM · LIVE. The red bolster, bucket seat, and armrest face that screen. The keyboard is staggered key rows, not a handful of blocks. The tower front is vented.
- Unlit: same default camera, flat basic materials, no toon steps. Replay and station screens still draw from their maps.

## Not claimed

The monitor bezel stays faceted. The shelf headsets do not rest on pegs. The wide shot does not center the coach; the corner shot does. See `refs/GAP.md`.
