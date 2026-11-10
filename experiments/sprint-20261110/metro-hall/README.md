# North Quay concourse

Cutaway underground ticket hall: street stair, ticket gates, tiled columns, route map, platform stair, and a coffered ceiling with a lamp rhythm. Toon hard, offline.

Shared GLBs (museum bench, flowerpot, KTV display) are referenced with relative paths. Three.js is the museum vendor, not a copy and not a CDN.

## Open

From the **repository root** (the page URL has to contain this folder, because assets live beside it):

```bash
python3 -m http.server 8777 --bind 127.0.0.1
# http://127.0.0.1:8777/experiments/sprint-20261110/metro-hall/
```

Keys: `T` toon · `U` unlit. Query: `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

```bash
node --test experiments/sprint-20261110/metro-hall/tests/layout.test.mjs
```

## What you should see

Unpaid side (toward the open cut): stair down the left wall to a street portal, wayfinding totem, ticket machines, a bench facing a departures screen. The gate line is the threshold. Paid side: the route map and NORTH QUAY frieze between tiled columns, a bench in front of the map, and a stair down to platforms on the right.
