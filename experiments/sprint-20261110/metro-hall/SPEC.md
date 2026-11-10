# North Quay concourse — spec

Units are metres. Style is MeshToonMaterial with a 4-step gradient and hard shadows. Palette is cream tile, teal dado, brass pinstripe, safety yellow, and cool ceiling grey. The route map is the only saturated focal graphic.

## Zones

**Unpaid concourse** (+Z, open cutaway). Passengers come down the left-hand stair from a street portal, cross a darker floor runner, and meet the gates. A totem at the turn reads STREET / TICKETS / PLATFORMS. Ticket machines and a queue rail sit on the right. One bench faces the freestanding departures TV.

**Paid hall** (−Z). Past the gates: two tiled columns frame the route map, clock, and NORTH QUAY frieze. A bench sits in front of the map. The right-hand well is the platform stair.

## Gate line

Six aisles, seven shared cabinets, z = −1.55, x from −2.5 to 2.5. Flaps are down except one standard lane (open, green) and the wide accessible lane (blue badge, no flap). One standard lane is closed (red lamp). A lower luminous bridge hangs over this line; the rest of the ceiling is a coffer grid with a sparser lamp run, including a run above the street stair.

## Assets and axes

| kind | file | target height | axis |
| --- | --- | --- | --- |
| museum_bench | museum `0025f9484fc6` | 0.46 | long axis local Z, backless. `rotationY = π/2` puts the length on world X so a side faces ±Z |
| flowerpot | museum `4a270f247734` | 0.34 | column planters |
| tv | ktv `7a1ea89eeb48` | 1.02 | panel is thin in local X. `rotationY = -π/2` turns that face toward +Z. Plinth 0.36 m. `bench_info` is at greater Z on the same X |

Benches do not share a grid: map bench in the paid hall, entrance bench by the stair path, info bench opposite the screen.

## Not in this scene

No passengers, no escalator, no train, no copied metro roundel. The map is a fictional North Quay network (Red, Teal, Amber, Violet).
