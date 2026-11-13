# GAP — Gate B12 holdroom

Inspected the repo-root HF bakes (mesh names and materials) before choosing. Rejected for this room:

- Theatre chair — burgundy leather and walnut. Reads as a cinema.
- Train seat — maroon cushion on a rail plinth. Reads as a coach.
- Museum bench — oak slab and steel X-legs. Already the station-lounge seat.
- Sofa, banker lamp, school desk — hotel, library, or classroom.

No beam seat, gate podium, stanchion, or flight ribbon exists in those bakes. `sand3d` / `bpy` are not installed here, so those pieces were not re-baked. They are procedural meshes in `gate.js`.

## Used as-is, with loader tints only

- Curved desktop monitor on the podium. Not a gate CRT.
- Cafe POS terminal as the scanner head. It reads as a tilted reader after yawing the screen toward the queue. It is not a boarding-pass scanner.
- Cafe bar stool at the work ledge. The seat was tinted off pure black. The base is still a cafe pedestal.
- Flowerpot, with block foliage added in the scene. One cup on the ledge, retinted off the original yellow.

## Still open

- The apron is a cropped fuselage and a short bridge throat. It does not show a docked airliner, a taxiway, or a terminal exterior.
- Flight ribbons are canvas panels, not split-flap or LCD glass.
- The floor access mark is a simple symbol, not a standard wheelchair pictogram.
- No passengers, luggage fleet, or PA speaker that matches a ceiling horn.
- Hard shadow steps remain on stanchion posts and seat legs. The toon ramp starts at 104/255 so the shadow band is not black; the unlit pass confirms the dark seats are the material, not crushed lighting.
