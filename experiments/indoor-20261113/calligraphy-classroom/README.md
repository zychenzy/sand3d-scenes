# Calligraphy classroom · 书法教室

One cutaway room: a teaching wall with a large practice sheet, a demonstration table on a low platform, and six long writing tables. Eighteen seats face that wall. The right side holds paper storage, a wash stand, and a line for drying sheets.

Toon is the default (MeshToonMaterial, a five-step gradient, hard shadows). `U` switches to real unlit materials (MeshBasicMaterial). Three.js and OrbitControls are vendored by symlink. Nothing is loaded from a CDN.

## Open

The server has to start at the **repository root** so the asset and vendor symlinks resolve:

```bash
python3 -m http.server 8773 --bind 127.0.0.1
```

http://127.0.0.1:8773/experiments/indoor-20261113/calligraphy-classroom/

- `T` toon · `U` unlit
- `?mode=unlit`
- `?cam=corner` — window wall and the demonstration table
- `?cam=close` — one writing station
- `?hud=0` hides the overlay (used for the stills)

## Check

```bash
node --test experiments/indoor-20261113/calligraphy-classroom/tests/layout.test.mjs
```

The test checks that chairs face the teaching wall, the teacher faces the class, table depth and seat height leave a reachable gap, and the center, front, side, and row paths are clear.

## Chair axis

The wooden dining chair faces local **+Z** (backrest toward −Z). `rotationY = 0` looks toward +Z. Student chairs use `π` so the seat front points at the teaching wall (−Z). The teacher, behind the demonstration table, uses `0` and looks back at the class.
