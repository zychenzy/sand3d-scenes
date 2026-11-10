# Recording control room

Cutaway control room: glass vocal booth, mixing desk, acoustic treatment, monitor speakers, outboard racks, and cable looms. Toon-hard Three.js, offline.

## Open

```bash
cd experiments/sprint-20261110/recording-studio
python3 -m http.server 8788 --bind 127.0.0.1
```

<http://127.0.0.1:8788/>

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?clean=1` hides the HUD.

## Test

```bash
node --test experiments/sprint-20261110/recording-studio/tests/layout_contract.test.mjs
```

GLBs and the vendored Three.js build are symlinks into existing scene folders. Do not copy them.
