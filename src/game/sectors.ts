import { SectorDefinition, Obstacle } from '../types/game';

// Helper to create straight wall segments
function createWallLine(x1: number, y1: number, x2: number, y2: number): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let curX = x1;
  let curY = y1;
  while (true) {
    obstacles.push({ x: curX, y: curY, type: 'WALL' });
    if (curX === x2 && curY === y2) break;
    curX += dx;
    curY += dy;
  }
  return obstacles;
}

export const CAMPAIGN_SECTORS: SectorDefinition[] = [
  {
    id: 1,
    name: 'Sector 01: Neon Perimeter',
    description: 'Establish neural link. Clean open field with high energy density.',
    targetApples: 12,
    baseSpeedMs: 110,
    hasWrapWalls: false,
    obstacles: [],
  },
  {
    id: 2,
    name: 'Sector 02: The Monoliths',
    description: 'Four energy towers anchor the zone. Navigate tight clearance corridors.',
    targetApples: 15,
    baseSpeedMs: 104,
    hasWrapWalls: false,
    obstacles: [
      // 4 symmetric 2x2 pillars
      { x: 6, y: 6, type: 'WALL' },
      { x: 7, y: 6, type: 'WALL' },
      { x: 6, y: 7, type: 'WALL' },
      { x: 7, y: 7, type: 'WALL' },

      { x: 18, y: 6, type: 'WALL' },
      { x: 19, y: 6, type: 'WALL' },
      { x: 18, y: 7, type: 'WALL' },
      { x: 19, y: 7, type: 'WALL' },

      { x: 6, y: 18, type: 'WALL' },
      { x: 7, y: 18, type: 'WALL' },
      { x: 6, y: 19, type: 'WALL' },
      { x: 7, y: 19, type: 'WALL' },

      { x: 18, y: 18, type: 'WALL' },
      { x: 19, y: 18, type: 'WALL' },
      { x: 18, y: 19, type: 'WALL' },
      { x: 19, y: 19, type: 'WALL' },
    ],
  },
  {
    id: 3,
    name: 'Sector 03: Quantum Gate',
    description: 'Twin wormhole portals active. Entering one instantly warps you to the other.',
    targetApples: 18,
    baseSpeedMs: 98,
    hasWrapWalls: false,
    obstacles: [
      // Portals
      { x: 4, y: 13, type: 'PORTAL', portalId: 1, portalTarget: { x: 21, y: 13 } },
      { x: 21, y: 13, type: 'PORTAL', portalId: 2, portalTarget: { x: 4, y: 13 } },
      // Guard barriers around portal edges
      { x: 4, y: 12, type: 'WALL' },
      { x: 4, y: 14, type: 'WALL' },
      { x: 21, y: 12, type: 'WALL' },
      { x: 21, y: 14, type: 'WALL' },
    ],
  },
  {
    id: 4,
    name: 'Sector 04: The Crossfire',
    description: 'Partition walls divide quadrant space. Master quick cornering.',
    targetApples: 20,
    baseSpeedMs: 92,
    hasWrapWalls: false,
    obstacles: [
      ...createWallLine(12, 3, 13, 3),
      ...createWallLine(12, 4, 13, 4),
      ...createWallLine(12, 5, 13, 5),
      ...createWallLine(12, 6, 13, 6),
      ...createWallLine(12, 7, 13, 7),
      ...createWallLine(12, 18, 13, 18),
      ...createWallLine(12, 19, 13, 19),
      ...createWallLine(12, 20, 13, 20),
      ...createWallLine(12, 21, 13, 21),
      ...createWallLine(12, 22, 13, 22),
      ...createWallLine(3, 12, 7, 12),
      ...createWallLine(3, 13, 7, 13),
      ...createWallLine(18, 12, 22, 12),
      ...createWallLine(18, 13, 22, 13),
    ],
  },
  {
    id: 5,
    name: 'Sector 05: The Labyrinth',
    description: 'Zig-zag energy conduits. Ghost chips allow phasing through barriers.',
    targetApples: 22,
    baseSpeedMs: 88,
    hasWrapWalls: false,
    obstacles: [
      ...createWallLine(5, 5, 20, 5),
      ...createWallLine(5, 10, 15, 10),
      ...createWallLine(10, 15, 20, 15),
      ...createWallLine(5, 20, 20, 20),
    ],
  },
  {
    id: 6,
    name: 'Sector 06: The Hyper Core',
    description: 'Maximum velocity chamber. Twin portals and central core grid.',
    targetApples: 25,
    baseSpeedMs: 82,
    hasWrapWalls: true,
    obstacles: [
      { x: 12, y: 12, type: 'WALL' },
      { x: 13, y: 12, type: 'WALL' },
      { x: 12, y: 13, type: 'WALL' },
      { x: 13, y: 13, type: 'WALL' },
      { x: 6, y: 6, type: 'PORTAL', portalId: 1, portalTarget: { x: 19, y: 19 } },
      { x: 19, y: 19, type: 'PORTAL', portalId: 2, portalTarget: { x: 6, y: 6 } },
      { x: 19, y: 6, type: 'PORTAL', portalId: 3, portalTarget: { x: 6, y: 19 } },
      { x: 6, y: 19, type: 'PORTAL', portalId: 4, portalTarget: { x: 19, y: 6 } },
    ],
  },
];
