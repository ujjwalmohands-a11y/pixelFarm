export type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'night';
export type WeatherType = 'clear' | 'rain' | 'fog' | 'snow';

export type TileTerrain =
  | 'grass'
  | 'lush_grass'
  | 'path'
  | 'soil'
  | 'garden_soil'
  | 'water'
  | 'cliff_water'
  | 'bridge'
  | 'wood_floor';

export type PropType =
  | 'none'
  | 'farmhouse'
  | 'barn'
  | 'pine_tree'
  | 'oak_tree'
  | 'birch_tree'
  | 'planted_tree'
  | 'bush'
  | 'rock'
  | 'mushroom'
  | 'carrot_crop'
  | 'pumpkin_crop'
  | 'wheat_crop'
  | 'flower_red'
  | 'flower_yellow'
  | 'flower_blue'
  | 'flower_pink'
  | 'flower_white'
  | 'tiny_sprout'
  | 'lantern'
  | 'fence_x'
  | 'fence_y'
  | 'fence_post'
  | 'well'
  | 'waterwheel';

export interface PlantedEntity {
  id: number;
  gx: number;
  gy: number;
  subX: number; // -3..3 pixel offset inside tile
  subY: number;
  kind: 'flower' | 'tree' | 'sprout';
  variant: number; // color or tree species
  createdAt: number;
  bounceTime: number; // timestamp of last click bounce
  growth: number; // 0..1
}

export interface TileData {
  gx: number;
  gy: number;
  elevation: number; // integer steps (each step = 4px high)
  terrain: TileTerrain;
  prop: PropType;
  propAnchor?: boolean; // true if top-left anchor of multi-tile structure
  occupiedByStructure?: boolean;
  bounceTime?: number;
  seed: number;
}

export type ButterflySpecies = 'monarch' | 'morpho' | 'swallowtail' | 'rose';

export interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  color: string;
  species: ButterflySpecies;
}

export interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

export interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  drift: number;
}

export interface PondRipple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export interface CloudPuff {
  dx: number;
  dy: number;
  w: number;
  h: number;
}

export interface CloudEntity {
  x: number;
  y: number;
  speed: number;
  puffs: CloudPuff[];
}

export interface SmokePuff {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  driftX: number;
}

