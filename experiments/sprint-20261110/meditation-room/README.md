# Meditation room

Cutaway contemplative interior: stone floor and dado, timber posts and lattice, a sculpted skylight over an open tatami meadow, three spaced floor seats facing a tokonoma, and a separate tea niche.

## Open

From this directory (vendor and GLBs are symlinks, not copies):

```bash
cd experiments/sprint-20261110/meditation-room
python3 -m http.server 8787 --bind 127.0.0.1
```

http://127.0.0.1:8787/

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?shot=1` hides the HUD.

## Check

```bash
python3 tests/layout_checks.py
```

See `SPEC.md` for the plan and `refs/GAP.md` for what the catalog does not contain.
