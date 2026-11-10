/** Circulation geometry shared by the scene and the node test. Pure numbers, no Three.js. */

export function forwardXZ(rotY) {
  return [Math.sin(rotY), Math.cos(rotY)];
}

export function derive(layout) {
  const m = layout.meta;
  const room = m.room;
  const loft = m.loft;
  const stair = m.stair;
  const table = m.table;
  const desk = m.desk;

  const walkY = loft.walkY;
  const rise = walkY / stair.risers;
  const treads = stair.risers - 1;
  const run = stair.going * treads;
  const topZ = loft.frontZ;
  const bottomZ = topZ + run;
  const rightX = stair.leftX + stair.stringer + stair.width + stair.stringer;
  const deskFrontZ = desk.backZ + desk.depth;
  const deskTopY = walkY + desk.height;

  return {
    walkY,
    soffitY: loft.soffitY,
    frontZ: loft.frontZ,
    ceilingY: loft.ceilingY,
    deck: loft.deck,
    rise,
    going: stair.going,
    treads,
    run,
    topZ,
    bottomZ,
    leftX: stair.leftX,
    rightX,
    stairWidth: stair.width,
    stringer: stair.stringer,
    handrailH: stair.handrailH,
    guardH: stair.guardH,
    balusterSpacing: stair.balusterSpacing,
    balusterThick: stair.balusterThick,
    balusterClear: stair.balusterSpacing - stair.balusterThick,
    rule: 2 * rise + stair.going,
    minX: room.minX,
    maxX: room.maxX,
    minZ: room.minZ,
    maxZ: room.maxZ,
    height: room.height,
    table,
    tableLeft: table.cx - table.w / 2,
    tableRight: table.cx + table.w / 2,
    tableNorthZ: table.cz - table.d / 2,
    tableSouthZ: table.cz + table.d / 2,
    desk,
    deskFrontZ,
    deskTopY,
    postXs: [rightX + 0.08, ...m.posts],
  };
}
