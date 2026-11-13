# Reference links

No reference images are stored in git.

Practice-room planning, not arcade cabinets and not an open office:

- Esports systems design guide (practice facility, instructor station, wall observation displays, player stations) — https://media.extron.com/public/download/files/articles/esports-systems-design-guide_revA.pdf — Extron
- Alienware training facility note (separate scrim rooms and replay screening rooms) — https://web.archive.org/web/20190302152435/https://www.teamliquidpro.com/AlienwareTF/ — Team Liquid
- Considerations for building esports facilities (displays plus acoustics for training rooms) — https://www.smwllc.com/building-esports-facilities/ — Shen Milsom & Wilke
- Esports lab guide (coach/analyst stations, acoustic panels, zoned floor) — https://senet.cloud/blog/esports-lab
- How to build an esports lab (cable channel under a row, monitor distance, seat height) — https://nextgenfurniture.com/blogs/articles/how-to-build-an-esports-lab — NextGen Furniture

The room is lit, not blacked out. Pro scrim rooms are often darker; a dark box collapses under a four-stop toon gradient. Daylight from the cutaway is the key. Ceiling slots stay dim.

Asset programs: https://huggingface.co/datasets/Sandflow/sand3d-objaverse

Inspected before placement:

- Monitor `cowork/assets/monitor__b7429da7ef4a.glb` — 0.60 × 0.35 × 0.10 m native. Curve wings reach local −Z (the sitter, once `rotationY` is π). Glass materials are near black. A canvas sits just in front of the wings.
- TV `ktv/assets/tv__7a1ea89eeb48.glb` — about 0.73 × 1.45 m with a 0.73 m sloping foot. Opaque glass, no emissive. At training-room scale the foot reads as a partition and the picture lands on the edge. Not instanced. See `GAP.md`.
- Speaker — wide low box, thin in Z. Stood on a plinth, broad face toward the room.
- Dining chair local +Z is the seat front (back posts at −Z). Not used. Player seats are procedural so the front lip, bolsters, and high back are unambiguous and not a wooden office chair.
- Study desk and chalkboard were not used.
