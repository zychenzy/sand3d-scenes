# Small blackbox theatre

A cutaway black box: plaster room-set on a plank stage, overhead pipe grid with gelled fixtures, a half-open wine traveler, raked theatre seats toed in toward the stage, and an upstage-left prop bay (desk, rack, crates, prompt stand).

Toon hard is the local adapter in `scene_lib.js` (stepped gradient, hard shadows, emissive practicals). Shared GLBs are referenced, not copied.

## Open

From the repository root — a server rooted in this folder cannot see `../../../cinema` or the other asset folders:

```bash
python3 -m http.server 8794 --bind 127.0.0.1
```

- http://127.0.0.1:8794/experiments/sprint-20261110/blackbox-theatre/
- `?cam=corner` · `?cam=close` · `?mode=unlit` · `?hud=0`
- Keys: `T` toon, `U` unlit

Or `./serve.sh` from this directory (same server).

## Check

```bash
node --test experiments/sprint-20261110/blackbox-theatre/tests/layout.test.mjs
```

Seat axis, sources, and what is still procedural: `refs/GAP.md`.
