import { PlantedEntity, TileData } from '../types/farm';

export interface PlantCounts {
  flowers: number;
  trees: number;
}

export class PlantingSystem {
  private entities: PlantedEntity[] = [];
  private nextId = 1;
  private lastHoverTileKey = '';
  private lastHoverTime = 0;

  public getEntities(): PlantedEntity[] {
    return this.entities;
  }

  public getCounts(): PlantCounts {
    let flowers = 0;
    let trees = 0;
    for (const e of this.entities) {
      if (e.kind === 'tree') trees++;
      else flowers++;
    }
    return { flowers, trees };
  }

  public reset() {
    this.entities = [];
    this.lastHoverTileKey = '';
  }

  public update(dt: number) {
    for (const e of this.entities) {
      if (e.growth < 1) {
        const rate = e.kind === 'tree' ? 2.1 : 3.2;
        e.growth = Math.min(1, e.growth + dt * rate);
      }
    }
  }

  public canPlantOnTile(tile: TileData | undefined): boolean {
    if (!tile) return false;
    if (tile.occupiedByStructure) return false;
    if (
      tile.terrain !== 'grass' &&
      tile.terrain !== 'lush_grass' &&
      tile.terrain !== 'garden_soil' &&
      tile.terrain !== 'soil'
    ) {
      return false;
    }
    if (
      tile.prop !== 'none' &&
      tile.prop !== 'flower_red' &&
      tile.prop !== 'flower_yellow' &&
      tile.prop !== 'flower_blue' &&
      tile.prop !== 'flower_pink' &&
      tile.prop !== 'flower_white' &&
      tile.prop !== 'tiny_sprout'
    ) {
      return false;
    }
    return true;
  }

  public findEntityAt(gx: number, gy: number): PlantedEntity | undefined {
    // Prefer trees or most recently planted entity on this tile
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.gx === gx && e.gy === gy) return e;
    }
    return undefined;
  }

  public countOnTile(gx: number, gy: number): number {
    let c = 0;
    for (const e of this.entities) {
      if (e.gx === gx && e.gy === gy) c++;
    }
    return c;
  }

  /**
   * Moving the cursor over grass creates small wildflower sprouts gently.
   */
  public handleHoverGrass(tile: TileData | undefined, nowSec: number): boolean {
    if (!tile) return false;
    if (tile.terrain !== 'grass' && tile.terrain !== 'lush_grass') return false;
    if (!this.canPlantOnTile(tile)) return false;
    if (tile.prop !== 'none') return false;

    const key = `${tile.gx},${tile.gy}`;
    if (key === this.lastHoverTileKey) return false;
    if (nowSec - this.lastHoverTime < 0.14) return false;

    if (this.countOnTile(tile.gx, tile.gy) >= 1) return false;

    this.lastHoverTileKey = key;
    this.lastHoverTime = nowSec;

    this.entities.push({
      id: this.nextId++,
      gx: tile.gx,
      gy: tile.gy,
      subX: Math.floor((Math.random() - 0.5) * 6),
      subY: Math.floor((Math.random() - 0.5) * 4),
      kind: 'sprout',
      variant: Math.floor(Math.random() * 5),
      createdAt: nowSec,
      bounceTime: nowSec,
      growth: 0.1,
    });
    return true;
  }

  /**
   * Dragging creates a lush trail of grass sprouts and wildflowers.
   */
  public handleDragTrail(tile: TileData | undefined, nowSec: number): boolean {
    if (!tile || !this.canPlantOnTile(tile)) return false;
    if (this.countOnTile(tile.gx, tile.gy) >= 3) return false;

    const existingTree = this.entities.find(
      (e) => e.gx === tile.gx && e.gy === tile.gy && e.kind === 'tree'
    );
    if (existingTree) return false;

    this.entities.push({
      id: this.nextId++,
      gx: tile.gx,
      gy: tile.gy,
      subX: Math.floor((Math.random() - 0.5) * 8),
      subY: Math.floor((Math.random() - 0.5) * 4),
      kind: Math.random() > 0.35 ? 'flower' : 'sprout',
      variant: Math.floor(Math.random() * 5),
      createdAt: nowSec,
      bounceTime: nowSec,
      growth: 0.15,
    });
    return true;
  }

  /**
   * Single click:
   * - If tile already has an existing plant/crop/tree, bounce it! (Or add up to 2 flowers on empty garden soil)
   * - If empty patch, plant a random flower.
   */
  public handleSingleClick(
    tile: TileData | undefined,
    nowSec: number
  ): 'planted_flower' | 'bounced' | 'none' {
    if (!tile) return 'none';

    const existing = this.findEntityAt(tile.gx, tile.gy);
    if (existing && (existing.kind === 'tree' || this.countOnTile(tile.gx, tile.gy) >= 2)) {
      existing.bounceTime = nowSec;
      existing.growth = Math.min(1, existing.growth + 0.25);
      return 'bounced';
    }

    // If built-in prop is a crop, tree, bush, or flower, trigger tile bounce!
    if (
      tile.prop !== 'none' &&
      tile.prop !== 'fence_x' &&
      tile.prop !== 'fence_y' &&
      tile.prop !== 'fence_post' &&
      tile.prop !== 'lantern' &&
      tile.prop !== 'rock'
    ) {
      tile.bounceTime = nowSec;
      return 'bounced';
    }

    if (!this.canPlantOnTile(tile)) return 'none';

    // Upgrade a tiny hover sprout on click into a full blooming flower cluster, or plant new flower
    if (existing && existing.kind === 'sprout') {
      existing.kind = 'flower';
      existing.variant = Math.floor(Math.random() * 5);
      existing.bounceTime = nowSec;
      existing.growth = 0.2;
      return 'planted_flower';
    }

    this.entities.push({
      id: this.nextId++,
      gx: tile.gx,
      gy: tile.gy,
      subX: existing ? Math.floor((Math.random() - 0.5) * 7) : 0,
      subY: existing ? Math.floor((Math.random() - 0.5) * 4) : 0,
      kind: 'flower',
      variant: Math.floor(Math.random() * 5),
      createdAt: nowSec,
      bounceTime: nowSec,
      growth: 0.15,
    });
    return 'planted_flower';
  }

  /**
   * Double-clicking grows a charming pixel-art tree on any plantable tile.
   */
  public handleDoubleClick(tile: TileData | undefined, nowSec: number): boolean {
    if (!tile || !this.canPlantOnTile(tile)) return false;

    // Remove small sprouts/flowers on that exact tile to make room for the sapling tree
    this.entities = this.entities.filter((e) => !(e.gx === tile.gx && e.gy === tile.gy));

    this.entities.push({
      id: this.nextId++,
      gx: tile.gx,
      gy: tile.gy,
      subX: 0,
      subY: 0,
      kind: 'tree',
      variant: Math.floor(Math.random() * 3), // 0: round oak, 1: cozy pine, 2: golden/blossom tree
      createdAt: nowSec,
      bounceTime: nowSec,
      growth: 0.1,
    });
    return true;
  }
}
