# Neighborhood locksmith (Three.js + sand3d)

A cutaway key shop: blank pegwall, duplicator with two vises, cylinder and mortise stock, a parts cubby, a small rekey bench, and a grilled handoff counter. Customers stay on the public side of the grille. The cutter and the bench each have a four-leg work stool facing the work. The ceiling is the full room plane.

Hard stepped toon is the default. Unlit is `MeshBasicMaterial` (true unlit, not a flat toon). Nothing is loaded from a CDN.

## Open

Serve this directory so the symlinked vendor and shared GLBs resolve:

```bash
cd experiments/indoor30-20261113/locksmith
python3 -m http.server 8773 --bind 127.0.0.1
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=detail` · `?shot=1` hides the HUD.

## Check

```bash
node --test experiments/indoor30-20261113/locksmith/tests/scene_contract.test.mjs
```

Shared customer chairs, the register, the terminal, and Three.js are symlinks into `library/` and `cafe/`. The work stools and the parts cubby are geometry in this folder. The padlock GLB is the one bake made for this folder. Do not copy the shared files.
