import { PropType, TileData, TileTerrain } from '../types/farm';

export const GRID_SIZE = 14;
export const TILE_W = 18; // half-width = 9px
export const TILE_H = 9;  // half-height = 4.5px -> integer stepped 18x9 diamond
export const ORIGIN_X = 128;
export const ORIGIN_Y = 66;
export const ELEVATION_PX = 4;

export function gridToScreen(gx: number, gy: number, elevation = 0): { x: number; y: number } {
  const sx = Math.round(ORIGIN_X + (gx - gy) * 9);
  const sy = Math.round(ORIGIN_Y + (gx + gy) * 4.5 - elevation * ELEVATION_PX);
  return { x: sx, y: sy };
}

export function screenToGrid(
  px: number,
  py: number,
  tiles: TileData[][]
): TileData | undefined {
  // Iterate from front-most to back-most tiles to accurately pick elevated tiles
  let bestTile: TileData | undefined;
  let bestDist = Infinity;

  for (let sum = (GRID_SIZE - 1) * 2; sum >= 0; sum--) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const gy = sum - gx;
      if (gy < 0 || gy >= GRID_SIZE) continue;
      const tile = tiles[gx][gy];
      const center = gridToScreen(gx, gy, tile.elevation);
      const dx = Math.abs(px - center.x);
      const dy = Math.abs(py - (center.y + 4)); // diamond center is +4px below top vertex
      // Normalized diamond equation: dx / 9 + dy / 4.5 <= 1.05
      const diamondDist = dx / 9 + dy / 4.8;
      if (diamondDist <= 1.05 && diamondDist < bestDist) {
        bestDist = diamondDist;
        bestTile = tile;
      }
    }
    if (bestTile) return bestTile;
  }
  return undefined;
}

function pseudoHash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function createInitialFarmMap(): TileData[][] {
  const map: TileData[][] = [];

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    map[gx] = [];
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const seed = pseudoHash(gx, gy);
      let elevation = 1;
      let terrain: TileTerrain = seed > 0.48 ? 'lush_grass' : 'grass';
      const prop: PropType = 'none';

      // Elevated northern woodland ridge along back edges
      if (gx <= 1 || gy <= 1) {
        elevation = 2;
      }
      if (gx === 0 && gy <= 4) {
        elevation = 3;
      }

      map[gx][gy] = {
        gx,
        gy,
        elevation,
        terrain,
        prop,
        seed,
      };
    }
  }

  const setTile = (
    gx: number,
    gy: number,
    opts: Partial<TileData>
  ) => {
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      Object.assign(map[gx][gy], opts);
    }
  };

  // --- 1. WATERFALL & STREAM & POND (Right / East side: gy = 2..5, gx = 0..10) ---
  // High cliff spring source at (0, 3) & (1, 3) cascading down into stream & pond
  setTile(0, 3, { elevation: 3, terrain: 'cliff_water', occupiedByStructure: true });
  setTile(1, 3, { elevation: 2, terrain: 'cliff_water', occupiedByStructure: true });
  setTile(2, 3, { elevation: 0, terrain: 'water', occupiedByStructure: true });
  setTile(3, 3, { elevation: 0, terrain: 'water', occupiedByStructure: true });
  setTile(4, 3, { elevation: 0, terrain: 'water', occupiedByStructure: true });

  // Wooden bridge crossing the stream at (5, 3)
  setTile(5, 3, { elevation: 1, terrain: 'bridge', occupiedByStructure: true });

  // Cozy Pond Basin (gx = 6..10, gy = 2..5)
  const pondCoords = [
    [6, 3], [6, 4],
    [7, 2], [7, 3], [7, 4], [7, 5],
    [8, 2], [8, 3], [8, 4], [8, 5],
    [9, 3], [9, 4], [9, 5],
    [10, 3], [10, 4],
  ];
  for (const [px, py] of pondCoords) {
    setTile(px, py, { elevation: 0, terrain: 'water', occupiedByStructure: true });
  }

  // --- 2. WOODEN FARMHOUSE (gx = 3..4, gy = 5..6) ---
  for (let x = 3; x <= 4; x++) {
    for (let y = 5; y <= 6; y++) {
      setTile(x, y, {
        elevation: 1,
        terrain: 'wood_floor',
        occupiedByStructure: true,
        prop: x === 3 && y === 5 ? 'farmhouse' : 'none',
        propAnchor: x === 3 && y === 5,
      });
    }
  }

  // --- 3. SMALL COZY BARN / STORAGE SHED (gx = 2..3, gy = 9..10) ---
  for (let x = 2; x <= 3; x++) {
    for (let y = 9; y <= 10; y++) {
      setTile(x, y, {
        elevation: 1,
        terrain: 'wood_floor',
        occupiedByStructure: true,
        prop: x === 2 && y === 9 ? 'barn' : 'none',
        propAnchor: x === 2 && y === 9,
      });
    }
  }

  // --- 4. WINDING STONE PATHWAY ---
  const pathCoords = [
    [5, 6], [6, 6], [6, 5], [5, 4], // Farmhouse front door toward bridge
    [5, 2], [4, 2],                 // Across bridge to northern overlook
    [5, 7], [5, 8], [4, 8], [4, 9], // Path over to Barn & Character
    [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7], // Main central garden lane
    [8, 8], [8, 9], [8, 10],        // Path between vegetable patch and planting garden
  ];
  for (const [px, py] of pathCoords) {
    setTile(px, py, { elevation: 1, terrain: 'path', occupiedByStructure: true });
  }

  // --- 5. VEGETABLE PATCHES (Carrots, Pumpkins, Golden Wheat) ---
  // Patch A: Carrots & Pumpkins (gx = 5..7, gy = 9..11)
  setTile(5, 9, { terrain: 'soil', prop: 'carrot_crop' });
  setTile(6, 9, { terrain: 'soil', prop: 'carrot_crop' });
  setTile(7, 9, { terrain: 'soil', prop: 'carrot_crop' });
  setTile(5, 10, { terrain: 'soil', prop: 'pumpkin_crop' });
  setTile(6, 10, { terrain: 'soil', prop: 'pumpkin_crop' });
  setTile(7, 10, { terrain: 'soil', prop: 'carrot_crop' });
  setTile(5, 11, { terrain: 'soil', prop: 'wheat_crop' });
  setTile(6, 11, { terrain: 'soil', prop: 'wheat_crop' });
  setTile(7, 11, { terrain: 'soil', prop: 'pumpkin_crop' });

  // --- 6. OPEN INTERACTIVE GARDEN PATCHES (Ready for planting!) ---
  // Tilled rich garden beds at (gx = 9..11, gy = 8..10) + open meadow around them
  for (let x = 9; x <= 11; x++) {
    for (let y = 8; y <= 10; y++) {
      setTile(x, y, { terrain: 'garden_soil', prop: 'none' });
    }
  }
  // Seed just two starter flowers so the visitor sees how garden beds look
  setTile(9, 8, { terrain: 'garden_soil', prop: 'flower_yellow' });
  setTile(11, 10, { terrain: 'garden_soil', prop: 'flower_pink' });

  // --- 7. DENSE PIXEL-ART PERIMETER TREES ---
  const pineCoords = [
    [0, 0], [0, 2], [0, 5], [0, 7], [0, 10], [0, 12],
    [2, 0], [5, 0], [8, 0], [11, 0],
    [1, 11], [1, 13], [13, 1],
  ];
  for (const [tx, ty] of pineCoords) {
    setTile(tx, ty, { prop: 'pine_tree', occupiedByStructure: true });
  }

  const oakCoords = [
    [1, 1], [1, 6], [1, 8], [3, 1], [6, 1], [10, 1], [12, 0],
    [0, 9], [2, 12], [12, 2], [13, 4],
  ];
  for (const [tx, ty] of oakCoords) {
    setTile(tx, ty, { prop: 'oak_tree', occupiedByStructure: true });
  }

  const birchCoords = [
    [0, 4], [9, 1], [11, 2], [4, 12],
  ];
  for (const [tx, ty] of birchCoords) {
    setTile(tx, ty, { prop: 'birch_tree', occupiedByStructure: true });
  }

  // Turning wooden waterwheel powered by the waterfall at (2, 2)
  setTile(2, 2, { prop: 'waterwheel', occupiedByStructure: true });

  // --- 8. WOODEN FENCES & COZY LANTERNS ---
  // Fence along front-left & front-right borders of the farmyard
  setTile(4, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(5, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(6, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(7, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(9, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(10, 13, { prop: 'fence_x', occupiedByStructure: true });
  setTile(11, 13, { prop: 'fence_x', occupiedByStructure: true });

  setTile(13, 6, { prop: 'fence_y', occupiedByStructure: true });
  setTile(13, 8, { prop: 'fence_y', occupiedByStructure: true });
  setTile(13, 9, { prop: 'fence_y', occupiedByStructure: true });
  setTile(13, 10, { prop: 'fence_y', occupiedByStructure: true });
  setTile(13, 11, { prop: 'fence_y', occupiedByStructure: true });

  // Warm lanterns near farmhouse door, bridge, and garden path
  setTile(5, 5, { prop: 'lantern', occupiedByStructure: true });
  setTile(8, 6, { prop: 'lantern', occupiedByStructure: true });
  setTile(4, 7, { prop: 'well', occupiedByStructure: true });

  // --- 9. BUSHES, ROCKS, MUSHROOMS & WILDFLOWERS ---
  setTile(1, 2, { prop: 'rock', occupiedByStructure: true });
  setTile(1, 4, { prop: 'rock', occupiedByStructure: true });
  setTile(6, 2, { prop: 'rock', occupiedByStructure: true });
  setTile(10, 5, { prop: 'rock', occupiedByStructure: true });
  setTile(12, 5, { prop: 'bush', occupiedByStructure: true });
  setTile(2, 7, { prop: 'bush', occupiedByStructure: true });
  setTile(3, 12, { prop: 'bush', occupiedByStructure: true });
  setTile(12, 12, { prop: 'bush', occupiedByStructure: true });

  setTile(1, 5, { prop: 'mushroom' });
  setTile(2, 4, { prop: 'mushroom' });
  setTile(7, 1, { prop: 'mushroom' });
  setTile(12, 3, { prop: 'mushroom' });

  // Colorful starter flower clusters around pond & meadow
  setTile(3, 4, { prop: 'flower_blue' });
  setTile(4, 4, { prop: 'flower_yellow' });
  setTile(9, 6, { prop: 'flower_red' });
  setTile(10, 6, { prop: 'flower_white' });
  setTile(11, 5, { prop: 'flower_blue' });
  setTile(11, 6, { prop: 'flower_yellow' });
  setTile(7, 8, { prop: 'flower_pink' });
  setTile(12, 8, { prop: 'flower_red' });
  setTile(8, 12, { prop: 'flower_yellow' });
  setTile(10, 12, { prop: 'flower_white' });

  return map;
}
