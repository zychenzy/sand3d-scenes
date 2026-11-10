# Retro arcade — brief

A small arcade with two zones and a clear walk between them.

**Play floor.** Five upright cabinets along the back wall, each a different silhouette (classic, winged deluxe, tall marquee, low candy, cream mono). A colored glow pool sits on the floor in front of each cabinet. A pinball sits on the left wall with the player end toward the room. A blaster cabinet faces into the room further along that wall. A cocktail table occupies the left pocket. A linked pair of sit-down racers (red P1, blue P2) sits in the right bay. Each racer has a bucket seat with a headrest, a steering wheel, and a dash, and the seat back is toward local −Z so the driver faces the wheel and screen.

**Token booth.** A built-in counter with a coin window, prize cubbies and a price board. Three stools stand on the entry side (+Z) and face the counter. A cash register and a POS terminal sit on the top, register front toward the entry. A short return wall closes the +X end. A 1.2 m TOKENS panel hangs from the ceiling over the counter. The open side of the cutaway is the entry.

**Circulation.** `layout.json` `clear` rectangles must stay empty: a spine from the entry to the cabinet row, a left pass in front of the pinball, and a bay between the racing pair and the stools. Player mats stay in front of the uprights and do not enter the spine.

**Light.** Stepped toon, one shadow-casting key, a cool fill, and four short point lights (marquee amber, race cyan, booth magenta, pendant warm). Screens and signs use emissive maps at modest intensity. No bloom or outline pass.

**Facing.** Local +Z is the player side of every cabinet before `yaw`. Racing occupants face +Z. Stools use `rotationY = π` so they address the counter from the entry side.

Room: 11.6 × 9.0 × 3.35 m. Walls on −X and −Z only.
