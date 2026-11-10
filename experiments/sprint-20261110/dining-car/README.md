# Railway dining car

Cutaway restaurant carriage: galley, two long saloon tables, vestibule. Opposing solid-base benches face across tables that run along the carriage. Each dining top has one pedestal spine and wall brackets at the ends. The galley counter is wall-mounted. Side windows are separate openings on a 1.8 m pitch, with a tighter clerestory rhythm in the galley.

## Open

Serve this directory (symlinks reach shared GLBs and the vendored Three.js r170 build):

```bash
cd experiments/sprint-20261110/dining-car
python3 -m http.server 8773 --bind 127.0.0.1
```

http://127.0.0.1:8773/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0`

## Test

```bash
node --test experiments/sprint-20261110/dining-car/test/layout.test.mjs
```

Run from the repo root, or from this directory with `node --test test/layout.test.mjs`.
