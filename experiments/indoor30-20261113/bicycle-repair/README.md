# Bicycle repair (Three.js + sand3d)

Cutaway shop for a full-size bike on a repair stand, a second bike parked off the aisle, a spoked wheel in a truing stand, a wall rack of wheels, a pegboard, open parts bins, a floor pump, and a service counter. The orange runner is the customer route from the open front to the counter. The rubber mat is the work bay.

Catalog chairs, the register, the thermos, the plant, and the counter pendant are referenced from `library/` and `cafe/`. The staff perch is a shop stool built in this scene. Three.js is the shared `workshop/vendor` copy. The four shop GLBs in `assets/` were baked here from Sandflow programs. They are not copies of other scenes.

## Open

From the repo root, so the vendor and shared GLBs resolve:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

http://127.0.0.1:8765/experiments/indoor30-20261113/bicycle-repair/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the overlay.

Toon is the default: four hard steps, darkest stop lifted so shadows stay in color. Unlit is `MeshBasicMaterial` with the shadow map off.

## Check

```bash
python3 experiments/indoor30-20261113/bicycle-repair/tests/test_layout.py
node experiments/indoor30-20261113/bicycle-repair/tests/runtime_check.mjs
```
