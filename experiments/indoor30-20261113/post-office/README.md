# Cedar Lane post office

Neighborhood retail lobby and the sorting hall behind the counter. Three teller windows, a queue, a floor parcel scale, PO boxes on the left wall, and a visible letter case with two mail trolleys and a packing desk. Toon is the default. Unlit swaps every material to `MeshBasicMaterial`.

Furniture GLBs are referenced from the repo root. Three.js is the museum vendor. Nothing in this folder copies those files.

## Open

From the repository root, so the relative GLB and vendor paths resolve:

```bash
python3 -m http.server 8777 --bind 127.0.0.1
# http://127.0.0.1:8777/experiments/indoor30-20261113/post-office/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?shot=1` hides the HUD.

## Test

```bash
node --test experiments/indoor30-20261113/post-office/tests/layout.test.mjs
node experiments/indoor30-20261113/post-office/tests/render_shots.mjs
```
