# Sheet 2 — indoor curling rink

One enclosed club sheet. The ice is a World Curling Federation length, 45.720 m by 4.750 m, with both houses, hog lines, hacks, and a warm lounge stepped up along the home-end side. The hall walls and roof close around the sheet. It is not a squash court, a pool, or a gym with ice paint.

Three.js r170 stays in `gym/vendor`. Shading is local: a hard 4-step toon and a real `MeshBasicMaterial` unlit path. Shared GLBs are referenced from the repo root. Nothing in this folder copies them.

## Open

Serve the repository root. The vendor and GLB paths climb out of this folder.

```bash
cd /path/to/sand3d-scenes
python3 -m http.server 8796 --bind 127.0.0.1
```

http://127.0.0.1:8796/experiments/indoor30-20261113/curling-rink/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?hud=0` hides the overlay.

## Check

```bash
node --test experiments/indoor30-20261113/curling-rink/tests/sheet_contract.test.mjs
```

Screenshots, with the server already running:

```bash
node experiments/indoor30-20261113/curling-rink/tests/shoot.mjs \
  http://127.0.0.1:8796/experiments/indoor30-20261113/curling-rink \
  experiments/indoor30-20261113/curling-rink/shots
```

The four committed shots are `toon_default`, `toon_corner`, `toon_detail`, and `unlit_default`.
