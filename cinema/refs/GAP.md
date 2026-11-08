# GAP — cinema

Photo refs (local):

- `refs/savoy_cinema_auditorium_1929.jpg`
- `refs/berkhamsted_rex_proscenium.jpg` (large file; local only)

Closed in scene JS:

- Procedural framed projection screen + gold proscenium + side curtains (TV asset dropped).
- Rear-row risers (row 1 +0.10 m, row 2 +0.20 m) and aisle lights.
- Seat facing: GLB nodes place `back_pad`/`back_shell` at local +Z and `lower_panel` (cushion) at local −Z, so the occupant faces −Z. `rotationY` 0 points every row at the screen. π had been reversed.

Remaining:

- Floor is stepped risers, not a continuous rake. Medium.
- Speakers are the shared KTV boxes. Medium.

Theatre chair official render (`candidates/old_theatre_chair__0e346addc570.png`) is a strong match: wood sides, red upholstery, tray bar.

`candidates/pink_cinema_seat__35ff2374c991.png` was rejected as a mixer (different typology).
