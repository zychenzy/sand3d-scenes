# Shuttle Hall

Metres, Y up. Nets sit on z = 0. Court 1 is the west court (centre x = −4.05), court 2 the east (x = +4.05). `layout.json` holds cameras, lights, and the furniture. `court_spec.mjs` is the marking and clearance source.

## Courts

BWF doubles, 13.40 × 6.10, lines 40 mm, measured to the outside of the line. The line belongs to the area it bounds, so it sits inside that edge. Singles sidelines are 5.18 m overall, 0.46 m inside each doubles sideline, and they run the full length. Short-service near edges are 1.98 m from the net. The doubles long-service back edge is 0.76 m in from the baseline. The centre line runs only from the short-service line to the baseline, one segment each half. Nothing is drawn under the net.

Posts are 40 mm square, 1.55 m high, inner face on the doubles sideline, body and base entirely outside the court. The cable is 1.55 m at the posts and 1.524 m at the centre. The net is 760 mm deep with a 75 mm white top tape, so the mesh stops well above the floor. A narrow centre strap holds the sag. Mesh cells are 18 mm.

Each court is a green mat on a timber sprung floor. Mats do not cover the run-off.

## Clearances

Side run-off and the gap between the courts are 2.00 m (above the 1.50 m BWF / club minimum). Back run-off to the north wall is 2.00 m. The south wall is a real wall behind the default camera, so the establishing view stands inside the room. Clear height under the truss bottom chord is 9.05 m. A paneled roof deck sits on the trusses. Battens hang at 8.12 m over the side run-offs and the centre gap only, at least 0.75 m clear of every sideline. The east wall carries four canvas pads and a small court notice. Tall walls do not receive the key shadow; the floor and the mats do. The close camera turns off truss and net shadow casting so the lines stay readable.

## Gallery and entry

West of the 2 m run-off is a 2.35 m gallery under a timber soffit at 3.15 m. A colonnade on the gallery edge holds the soffit and does not step into the run-off. Benches are backless and run parallel to the courts, so the court-side seat faces the play. The shoe bench, rubber mat, and ajar door are at the south end of the gallery. The chair faces west, into the sign-in desk, not onto a court. The bookcase opens east, toward the aisle. It is stained green, signed SHUTTLES, and holds tubes and grips. The draw board is the same chalkboard bake with the easel feet hidden, a dark frame, and a two-court score on the face. The west door opens into a small enclosed vestibule. Rackets hang head-down on the rail beside it, faces toward the courts. One racket lies on the shoe bench.

Cool linear battens light the hall. Warm pendants and a cove light only the gallery, which is the shoe-change threshold. Walls are a darker green below 2.35 m and a lighter green above, with no windows.

## Light

Hard toon, no bloom, no outline. The key comes from the south-east and high, so trusses, posts, and the net throw shadows across the timber and the mats. Lines carry a slight emissive lift so a shadow does not erase them. Unlit drops every surface to `MeshBasicMaterial`; the battens, cove, pendants, and desk lamp stay bright because their emissive intensity is high enough to be baked into that flat color.
