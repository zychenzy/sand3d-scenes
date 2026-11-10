# The Quarry — indoor bouldering gym

Cutaway boulder hall. The faceted plywood wall (slab, arete, vertical face, cave, steep section, downclimb) is the room. Blue crash pads follow the fall line. A low reception soffit, lockers, and viewing benches sit outside the yellow line.

## Open

```bash
cd experiments/sprint-20261110/climbing-gym
python3 -m http.server 8791 --bind 127.0.0.1
```

http://127.0.0.1:8791/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close`

Vendor Three.js and catalog GLBs are symlinks. Serve this directory so those relative links resolve. Do not copy the GLBs.

## Check

```bash
node test/safety.mjs
```

Confirms pad clearance (2.4 m past the furthest hold or volume), bench aisle, desk orientation, and that assets are links rather than copies.
