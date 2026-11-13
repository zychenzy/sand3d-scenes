# GAP — KCOM community radio

Dataset: https://huggingface.co/datasets/Sandflow/sand3d-objaverse (CC-BY-4.0). Renders were inspected and not copied into this folder.

Rejected after looking at the renders:

- `mixing_console` `27857db9347f` — a flat black slab. Faders read as dashes. No meter bridge, no channel strip a hand could use.
- `mixer` `8a1f9402088f` — not a broadcast desk.
- `microphone` `4d32ad54ac72` — a stick condenser, no articulated boom.
- `microphone_stand` `2fee17f09919` — a straight stand, not a desk boom.
- `microphone` `a28f5e3ca19c` — a handheld with a giant cube flag.
- `alarm_clock` `e3422158ba18` — bells and a blank face, no second hand.
- `clock` `cc82051d07cf` — a tall column, not a wall news clock.

The local catalog has the same hole: chairs, a desktop monitor, a small speaker, shelves, and lamps. No broadcast mic, boom, mixer, or studio clock. Those are built in `radio.js`. Mixer caps, knobs, and cue keys stay under 2 cm.

Reused as-is, referenced by relative path (not copied):

- Dining chair — lounge bake, host, two guests, producer
- Monitor — cowork bake. Screen faces local +Z, so each one looks at its operator. A small rundown plane sits on the glass.
- Speaker — music bake, two cue cabinets on the producer desk, 0.15 m tall
- Wall shelf, pendant, mug, flowerpot, thermos — cafe bakes
- Library lamp — producer desk

Known stand-ins:

- No people. Facing is the seat's forward axis.
- Ladder-back dining chairs stand in for studio swivel chairs.
- Carts are colored slabs in a wood rack, not cartridge machines.
- Record rows on the shelves are colored slabs.
- The producer window is wood mullions and a transparent pane.
- Burgundy fabric panels and wood slats stand in for acoustic treatment. The room is plaster and oak, not a black foam box.
