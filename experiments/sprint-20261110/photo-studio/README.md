# Photography studio (Three.js + sand3d)

Cutaway stills studio: seamless corner cyclorama, goalpost truss, C-stand and softboxes, camera dolly aimed at a dress form, backdrop rail, right-side editing desk, and a curtained changing corner.

## Open

```bash
cd experiments/sprint-20261110/photo-studio
python3 -m http.server 8791 --bind 127.0.0.1
```

`http://127.0.0.1:8791/`

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

GLBs and the Three.js vendor folder are relative symlinks into existing scene kits. Serve this directory; the links stay inside the repo and the page does not need a CDN.

## Check

```bash
python3 tests/test_layout.py
```
