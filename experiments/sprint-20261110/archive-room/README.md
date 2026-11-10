# Archive research room

Cutaway municipal archive: records bays, map flat-files, a shared document table, numbered reader carrels, and a glazed enquiries desk. Toon-hard Three.js, vendored from the library scene (not copied).

## Open

Serve the **repository root** so the relative GLB paths resolve. Do not start the server inside this folder.

```bash
python3 -m http.server 8794 --bind 127.0.0.1
# http://127.0.0.1:8794/experiments/sprint-20261110/archive-room/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?bare=1` hides the HUD.

## Check

```bash
node --test experiments/sprint-20261110/archive-room/tests/layout.test.mjs
```
