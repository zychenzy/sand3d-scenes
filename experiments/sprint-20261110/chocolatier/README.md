# Maison Cacao — chocolatier atelier

One indoor shop: a wood-floored workshop behind a glass partition, and a tiled shop in front. The marble prep island and the glass display case are the two focal points.

Shared GLBs and the vendored Three.js runtime are symlinked from `cafe/`, `library/`, `workshop/`, and `museum/`. Serve this folder so those links resolve. Do not open the file directly.

## Open

```bash
cd experiments/sprint-20261110/chocolatier
python3 -m http.server 8791 --bind 127.0.0.1
```

http://127.0.0.1:8791/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

## Check

```bash
python3 tests/check_layout.py
node capture.mjs http://127.0.0.1:8791
```

`capture.mjs` expects Chrome and a server already running. It writes `shots/chocolatier_*.png` and `/opt/cursor/artifacts/chocolatier_*.png`.
