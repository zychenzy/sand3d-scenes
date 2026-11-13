# GAP — bathhouse changing and wash hall

Closed in this scene:

- Entry sequence: shoe cubbies, raised attendant platform, timber bandai, vintage register facing the aisle.
- Changing: eight timber lockers with stiles, panels, pulls and vents; a backless bench with a 0.80 m knee gap and a 0.44 m seat; baskets and a towel rail.
- Wash: ten stations, 0.90 m pitch, 0.30 m stools, buckets between stool and wall, taps at 0.76 m, a long mirror, 100 mm tile with a cool border, a center drain and wet slats.
- Bath entry: reed screens (solid lower panel, vertical sudare) beside a 1.4 m opening, a four-panel noren with a walk-through gap, clerestory panes, and a short wooden rim. The tub is not a pool.
- Warm timber against cool tile. Register paints darker than about 3% linear are lifted so the toon shadow does not go black.

Still open:

- The catalog has no getabako, sento locker, oke, wall tap, or noren. Those are built in `bathhouse.js`. The quedlin wooden stool on Hugging Face (`objaverse-34fe7fd87a924cf8aeff89ea6f012bae`, f-score about 0.96) is a 450 mm three-leg seat, too wide for a 0.90 m wash pitch and unsteady on a wet floor. It was not baked. Kitchen sinks and vanities in the bathroom-fixture family read as a hotel bath and were not used.
- `Old Locker` hits in that dataset did not resolve to a timber locker bank worth baking. The museum bench was rejected: its legs are steel sleds. The cafe pendant and flowerpot were rejected so the hall would not turn into a lobby.
- The towel shelf is the cafe oak shelf. Its rounded end panels are still a domestic shelf, not a kago rack.
- The register is a counter-top machine, not a period bandai till. Its silhouette is right; the keys are small at hall scale.
- Tile and floorboards are repeated canvases (100 mm tile, 130 mm boards), not separate meshes. Grout is the gap in that canvas.
- Water is an opaque toon slab. No refraction, steam, or wet tracks. Mirrors are pale panes, not reflections. Noren panels are flat boards with a hem and a crest, not cloth.
- One gender hall. The other side of a full sento, the boiler, and the rest of the tub are out of frame on purpose.
- Glazing does not cast coloured light. The cool fill and the clerestory colour stand in for it. Shadows are a single hard map; contact at the stool feet is the mesh itself, not an AO bake.
