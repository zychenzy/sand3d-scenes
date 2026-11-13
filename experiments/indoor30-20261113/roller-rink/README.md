# Civic maple roller rink

A cutaway municipal roller rink: maple oval, waist rail with an open skate gate, rental cubbies and slat lace-up benches, a front entry gate, and a small DJ booth under a barrel of warm globe lights. The back wall is lettered MAPLE RINK.

Toon is the default. It uses a four-stop hard gradient whose darkest step stays lifted so the floor and plaster do not crush. `U` switches to real unlit (`MeshBasicMaterial`). Nothing is loaded from the network.

## Open

From this directory. The `vendor/` and `assets/` entries are symlinks into the shared root scenes:

```bash
cd experiments/indoor30-20261113/roller-rink
python3 -m http.server 8771 --bind 127.0.0.1
```

http://127.0.0.1:8771/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` · `?dpr=1`

## Check

```bash
python3 experiments/indoor30-20261113/roller-rink/tests/check_layout.py
```

Screenshots, with the server already running. The script prefixes the slug and exits if the page never becomes ready or throws:

```bash
node experiments/indoor30-20261113/roller-rink/tests/shoot.mjs http://127.0.0.1:8771 /tmp/rink-shots rink
```

The checked-in frames are `shots/toon_default.png`, `shots/toon_corner.png`, `shots/toon_close.png`, and `shots/unlit_default.png`.
