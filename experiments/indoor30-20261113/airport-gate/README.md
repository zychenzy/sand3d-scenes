# Gate B12 departure holdroom

A single airport gate lounge, not a terminal and not a station or hotel lounge. Connected beam seats face two flight ribbons. A podium and two boarding scanners sit at the jet-bridge door, with a 0.9 m queue and a separate 1.7 m accessible lane. A metal work ledge with charging points runs the right wall. The apron is a shallow slot outside the glass.

Shared GLBs and Three.js are read from the repo root (`workshop/vendor`, `cafe/assets`, `cowork/assets`). Nothing in those folders is copied or edited.

## Open

From the repository root:

```bash
python3 -m http.server 8771 --bind 127.0.0.1
```

http://127.0.0.1:8771/experiments/indoor30-20261113/airport-gate/

`T` toon (hard 4-step, default) · `U` unlit (`MeshBasicMaterial`, shadow map off) · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?hud=0`

## Check

```bash
node experiments/indoor30-20261113/airport-gate/tests/layout.test.mjs
```

The test checks repo-root asset paths, seat facing, rank and cross-aisle clearances, the accessible lane, scanner approach paths, ribbon size, and that unlit is basic-material.

Shots in `shots/`: `airport-gate_toon_default`, `airport-gate_toon_corner`, `airport-gate_toon_detail`, `airport-gate_unlit_default`.
