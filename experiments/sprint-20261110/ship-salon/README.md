# Passenger ship salon (Three.js + sand3d)

Cutaway outboard lounge: curved timber ribs and deckhead, brass portholes, two built-in settees, a long mess table and a square chart table, chart chest, books, and caged practical lights.

Serve from the **repository root** so shared GLBs and the vendored Three.js resolve. Paths are relative; nothing in `cafe/`, `restaurant/`, `library/`, or `boardgame/` is copied.

## Open

```bash
# from the sand3d-scenes repo root
python3 -m http.server 8788 --bind 127.0.0.1
# http://127.0.0.1:8788/experiments/sprint-20261110/ship-salon/
```

`T` toon · `U` unlit · `?mode=unlit` · `?cam=corner` · `?cam=close` · `?hud=0` hides the label.

```bash
python3 experiments/sprint-20261110/ship-salon/test_layout.py
```

## Zones

- **Chart alcove** (aft): framed sketch chart over a teak chest of books, atlas stand, library case, one chair facing the chart, square communal table with the aft settee.
- **Mess** (forward): longer built-in settee, long table, two chairs facing it, pendant over the cloth.
- A compass inlay and a porthole with glasses mark the standing bay between them. Life ring and bell close the forward bulkhead.
