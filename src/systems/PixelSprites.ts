import { ButterflySpecies, PlantedEntity, TileData } from '../types/farm';
import { AtmosphereVisualState, rgbCss } from './DayNightSystem';

// Deterministic stars in top sky area
const SKY_STARS = Array.from({ length: 34 }, (_, i) => ({
  x: Math.floor(((i * 73 + 19) % 248) + 4),
  y: Math.floor(((i * 41 + 7) % 68) + 3),
  twinkleOffset: i * 1.3,
  big: i % 7 === 0,
}));

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w = 1, h = 1) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function mixHex(hex: string, targetRgb: [number, number, number], amount: number): string {
  if (amount <= 0.01) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (targetRgb[0] - r) * amount);
  const ng = Math.round(g + (targetRgb[1] - g) * amount);
  const nb = Math.round(b + (targetRgb[2] - b) * amount);
  return `rgb(${nr},${ng},${nb})`;
}

/**
 * Renders the pixel-art banded sky, dithered transitions, stars, and sun/moon.
 */
export function drawPixelSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  atmo: AtmosphereVisualState,
  timeSec: number
) {
  // Fill base background (deep earth/sky ambiance)
  const bands = 10;
  for (let b = 0; b < bands; b++) {
    const t = b / (bands - 1);
    const col: [number, number, number] =
      t < 0.5
        ? [
            Math.round(atmo.skyTop[0] + (atmo.skyMid[0] - atmo.skyTop[0]) * (t * 2)),
            Math.round(atmo.skyTop[1] + (atmo.skyMid[1] - atmo.skyTop[1]) * (t * 2)),
            Math.round(atmo.skyTop[2] + (atmo.skyMid[2] - atmo.skyTop[2]) * (t * 2)),
          ]
        : [
            Math.round(atmo.skyMid[0] + (atmo.skyBottom[0] - atmo.skyMid[0]) * ((t - 0.5) * 2)),
            Math.round(atmo.skyMid[1] + (atmo.skyBottom[1] - atmo.skyMid[1]) * ((t - 0.5) * 2)),
            Math.round(atmo.skyMid[2] + (atmo.skyBottom[2] - atmo.skyMid[2]) * ((t - 0.5) * 2)),
          ];

    const bandH = Math.ceil(height / bands);
    const y0 = b * bandH;
    ctx.fillStyle = rgbCss(col);
    ctx.fillRect(0, y0, width, bandH + 1);

    // Classic 16-bit checkerboard dithering seam (2px tall) between sky bands
    if (b > 0) {
      for (let x = 0; x < width; x += 2) {
        ctx.fillRect(x + (b % 2), y0 - 1, 1, 1);
        if (x % 4 === 0) {
          ctx.fillRect(x, y0 - 2, 1, 1);
        }
      }
    }
  }

  // Twinkling pixel stars
  if (atmo.starAlpha > 0.04) {
    for (const st of SKY_STARS) {
      const tw = (Math.sin(timeSec * 2.4 + st.twinkleOffset) + 1) * 0.5;
      const a = atmo.starAlpha * (0.35 + tw * 0.65);
      ctx.fillStyle = `rgba(255, 250, 224, ${a.toFixed(2)})`;
      ctx.fillRect(st.x, st.y, 1, 1);
      if (st.big && tw > 0.6) {
        ctx.fillStyle = `rgba(255, 250, 224, ${(a * 0.45).toFixed(2)})`;
        ctx.fillRect(st.x - 1, st.y, 3, 1);
        ctx.fillRect(st.x, st.y - 1, 1, 3);
      }
    }
  }

  // Sun or Crescent Moon in top-right sky
  const celestialX = 208;
  const celestialY = Math.round(atmo.sunMoonY);
  if (atmo.fogDensity < 0.85) {
    const vis = 1 - atmo.fogDensity * 0.8;
    if (atmo.isMoon) {
      // Soft lunar halo
      ctx.fillStyle = `rgba(220, 236, 255, ${(0.12 * vis).toFixed(2)})`;
      px(ctx, celestialX - 7, celestialY - 7, 15, 15);
      // Pixel crescent moon
      ctx.fillStyle = `rgba(248, 245, 214, ${(0.95 * vis).toFixed(2)})`;
      px(ctx, celestialX - 3, celestialY - 4, 7, 9);
      px(ctx, celestialX - 4, celestialY - 3, 9, 7);
      // Carve inner shadow for crescent
      ctx.fillStyle = rgbCss(atmo.skyTop);
      px(ctx, celestialX - 1, celestialY - 3, 5, 6);
      px(ctx, celestialX, celestialY - 4, 4, 7);
    } else {
      // Warm golden pixel sun
      ctx.fillStyle = `rgba(255, 228, 148, ${(0.22 * vis).toFixed(2)})`;
      px(ctx, celestialX - 8, celestialY - 8, 17, 17);
      ctx.fillStyle = `rgba(255, 244, 188, ${(0.92 * vis).toFixed(2)})`;
      px(ctx, celestialX - 4, celestialY - 5, 9, 11);
      px(ctx, celestialX - 5, celestialY - 4, 11, 9);
    }
  }
}

/**
 * Draws an 18x9 stepped pixel-art isometric diamond at top-vertex (sx, sy)
 * plus extruded side cliffs down to baseY so the island floats like a miniature diorama.
 */
export function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  tile: TileData,
  sx: number,
  sy: number,
  baseIslandY: number,
  atmo: AtmosphereVisualState,
  timeSec: number,
  isHovered: boolean
) {
  const wet = atmo.wetness;
  const snow = atmo.snowCover;

  // Determine top surface colors
  let topMain = '#639b4d';
  let topAlt = '#568c42';
  let topHighlight = '#76af59';

  switch (tile.terrain) {
    case 'grass':
      topMain = '#5d9448';
      topAlt = '#50843d';
      topHighlight = '#70a856';
      break;
    case 'lush_grass':
      topMain = '#4f8740';
      topAlt = '#437736';
      topHighlight = '#639c4e';
      break;
    case 'path':
      topMain = '#c7b597';
      topAlt = '#b29e80';
      topHighlight = '#d8c8ad';
      break;
    case 'soil':
      topMain = '#6d4c36';
      topAlt = '#593d2b';
      topHighlight = '#7d5a42';
      break;
    case 'garden_soil':
      topMain = '#78553d';
      topAlt = '#63442f';
      topHighlight = '#8a654b';
      break;
    case 'wood_floor':
      topMain = '#8a6242';
      topAlt = '#755034';
      topHighlight = '#9c7250';
      break;
    case 'bridge':
      topMain = '#9c6c44';
      topAlt = '#7d5232';
      topHighlight = '#b58256';
      break;
    case 'water':
    case 'cliff_water':
      topMain = '#488eb5';
      topAlt = '#3b7a9e';
      topHighlight = '#74b9db';
      break;
  }

  // Wet ground darkening during rain
  if (wet > 0.02 && tile.terrain !== 'water' && tile.terrain !== 'cliff_water') {
    topMain = mixHex(topMain, [34, 52, 48], wet * 0.28);
    topAlt = mixHex(topAlt, [28, 44, 42], wet * 0.30);
    topHighlight = mixHex(topHighlight, [58, 82, 86], wet * 0.22);
  }

  // Snow accumulation on grass & paths
  if (
    snow > 0.05 &&
    tile.terrain !== 'water' &&
    tile.terrain !== 'cliff_water' &&
    tile.terrain !== 'wood_floor'
  ) {
    const snowFactor =
      tile.terrain === 'soil' || tile.terrain === 'garden_soil' ? snow * 0.48 : snow * 0.82;
    topMain = mixHex(topMain, [232, 241, 248], snowFactor);
    topAlt = mixHex(topAlt, [205, 220, 235], snowFactor);
    topHighlight = mixHex(topHighlight, [248, 252, 255], snowFactor);
  }

  const waterDrop = tile.terrain === 'water' ? 2 : 0;
  const ty = sy + waterDrop;

  // 1. Draw side cliff walls (left & right faces of isometric block)
  const skirtBottom = baseIslandY;
  const sideHeight = Math.max(3, skirtBottom - (ty + 4));

  if (sideHeight > 0) {
    const isStoneCliff = tile.elevation >= 2 || tile.terrain === 'cliff_water';
    const leftWallCol = isStoneCliff ? '#6e675f' : '#7a563c';
    const rightWallCol = isStoneCliff ? '#57514b' : '#5e402c';
    const rimLeft = tile.terrain === 'water' ? '#366f91' : '#467336';
    const rimRight = tile.terrain === 'water' ? '#2c5c78' : '#385e2b';

    // Left cliff face (x from sx-9 to sx-1)
    for (let dx = -9; dx < 0; dx++) {
      const edgeY = ty + 4 + Math.floor((9 + dx) * 0.5);
      const h = Math.max(2, skirtBottom - edgeY);
      ctx.fillStyle = leftWallCol;
      px(ctx, sx + dx, edgeY, 1, h);
      if (tile.terrain === 'grass' || tile.terrain === 'lush_grass') {
        ctx.fillStyle = snow > 0.5 ? '#dce8f2' : rimLeft;
        px(ctx, sx + dx, edgeY, 1, 2);
      }
      // Subtle pixel brick/earth texture dither on outer diorama wall
      if ((dx + tile.gx) % 3 === 0 && h > 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        px(ctx, sx + dx, edgeY + 4, 1, 1);
      }
    }

    // Right cliff face (x from sx to sx+8)
    for (let dx = 0; dx < 9; dx++) {
      const edgeY = ty + 8 - Math.floor(dx * 0.5);
      const h = Math.max(2, skirtBottom - edgeY);
      ctx.fillStyle = rightWallCol;
      px(ctx, sx + dx, edgeY, 1, h);
      if (tile.terrain === 'grass' || tile.terrain === 'lush_grass') {
        ctx.fillStyle = snow > 0.5 ? '#c5d6e6' : rimRight;
        px(ctx, sx + dx, edgeY, 1, 2);
      }
      if ((dx + tile.gy) % 3 === 0 && h > 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        px(ctx, sx + dx, edgeY + 5, 1, 1);
      }
    }
  }

  // 2. Draw crisp stepped 18x9 pixel diamond top face
  // Row offsets for authentic 2:1 pixel-art isometric tile:
  // row 0: w=2  (x-1..x)
  // row 1: w=6  (x-3..x+2)
  // row 2: w=10 (x-5..x+4)
  // row 3: w=14 (x-7..x+6)
  // row 4: w=18 (x-9..x+8)
  // row 5: w=14 (x-7..x+6)
  // row 6: w=10 (x-5..x+4)
  // row 7: w=6  (x-3..x+2)
  // row 8: w=2  (x-1..x)
  const rowHalfWidths = [1, 3, 5, 7, 9, 7, 5, 3, 1];
  ctx.fillStyle = topMain;
  for (let r = 0; r < 9; r++) {
    const hw = rowHalfWidths[r];
    px(ctx, sx - hw, ty + r, hw * 2, 1);
  }

  // 3. Per-terrain pixel cluster details & dithering
  if (tile.terrain === 'grass' || tile.terrain === 'lush_grass') {
    // Pixel cluster shading
    ctx.fillStyle = topAlt;
    if (tile.seed > 0.3) px(ctx, sx - 4, ty + 4, 2, 1);
    if (tile.seed > 0.6) px(ctx, sx + 2, ty + 5, 2, 1);

    // Wind-swaying grass blades
    const windShift = Math.sin(timeSec * 2.1 + tile.gx * 0.6 + tile.gy * 0.4) > 0.35 ? 1 : 0;
    ctx.fillStyle = topHighlight;
    px(ctx, sx - 2 + windShift, ty + 3, 1, 1);
    if (tile.seed > 0.45) {
      px(ctx, sx + 3 + windShift, ty + 4, 1, 1);
    }
  } else if (tile.terrain === 'path') {
    // Cobblestone pebbles
    ctx.fillStyle = topHighlight;
    px(ctx, sx - 3, ty + 3, 3, 1);
    px(ctx, sx + 1, ty + 5, 3, 1);
    ctx.fillStyle = topAlt;
    px(ctx, sx - 4, ty + 5, 2, 1);
    px(ctx, sx + 2, ty + 3, 2, 1);
    px(ctx, sx - 1, ty + 6, 2, 1);
  } else if (tile.terrain === 'soil' || tile.terrain === 'garden_soil') {
    // Tilled pixel furrows
    ctx.fillStyle = topAlt;
    px(ctx, sx - 4, ty + 3, 3, 1);
    px(ctx, sx - 1, ty + 5, 4, 1);
    px(ctx, sx + 2, ty + 4, 3, 1);
    if (tile.terrain === 'garden_soil') {
      // Subtle wooden border edge on garden beds
      ctx.fillStyle = '#916746';
      px(ctx, sx - 5, ty + 2, 2, 1);
      px(ctx, sx + 3, ty + 2, 2, 1);
    }
  } else if (tile.terrain === 'water' || tile.terrain === 'cliff_water') {
    // Animated water shimmer
    const wave = Math.floor(timeSec * 3 + tile.gx + tile.gy) % 3;
    ctx.fillStyle = topHighlight;
    if (wave === 0) {
      px(ctx, sx - 3, ty + 4, 3, 1);
    } else if (wave === 1) {
      px(ctx, sx + 1, ty + 5, 3, 1);
    } else {
      px(ctx, sx - 1, ty + 3, 2, 1);
    }
    // Shoreline foam pixels where adjacent to higher land
    ctx.fillStyle = 'rgba(218, 245, 255, 0.55)';
    px(ctx, sx - 5, ty + 2, 2, 1);
  } else if (tile.terrain === 'bridge') {
    // Arched wooden planks & side rails
    ctx.fillStyle = '#6b4428';
    px(ctx, sx - 6, ty + 3, 12, 1);
    px(ctx, sx - 4, ty + 5, 9, 1);
    // Bridge handrails
    ctx.fillStyle = '#b88456';
    px(ctx, sx - 6, ty - 2, 1, 5);
    px(ctx, sx - 1, ty - 4, 1, 5);
    px(ctx, sx - 6, ty - 2, 6, 1);
    px(ctx, sx + 1, ty, 1, 5);
    px(ctx, sx + 6, ty + 2, 1, 5);
    px(ctx, sx + 1, ty + 1, 6, 1);
  }

  // 4. Flowing Pixel-Art Waterfall on steep cliff_water tiles!
  if (tile.terrain === 'cliff_water') {
    const fallHeight = tile.gx === 1 ? 11 : 6;
    const fallX = sx + 1;
    const fallY = ty + 5;
    // Main cascading water sheet on the right-facing cliff toward the pond
    ctx.fillStyle = '#5ca4cc';
    px(ctx, fallX - 2, fallY, 6, fallHeight);
    ctx.fillStyle = '#8ad0f0';
    const animOffset = Math.floor(timeSec * 10) % 4;
    for (let fy = 0; fy < fallHeight; fy++) {
      if ((fy + animOffset) % 3 === 0) {
        px(ctx, fallX - 1, fallY + fy, 2, 1);
      }
      if ((fy + animOffset + 1) % 4 === 0) {
        px(ctx, fallX + 2, fallY + fy, 2, 1);
      }
    }
    // White bubbling splash foam at bottom of waterfall
    if (tile.gx === 1) {
      const foamPulse = Math.floor(timeSec * 7) % 2;
      ctx.fillStyle = '#eefaff';
      px(ctx, fallX - 3, fallY + fallHeight - 1, 8, 2);
      if (foamPulse === 0) {
        px(ctx, fallX - 4, fallY + fallHeight, 2, 1);
        px(ctx, fallX + 4, fallY + fallHeight - 2, 2, 1);
      } else {
        px(ctx, fallX - 1, fallY + fallHeight + 1, 4, 1);
      }
    }
  }

  // 5. Subtle interactive cursor highlight outline on plantable tile
  if (isHovered) {
    ctx.fillStyle = 'rgba(255, 248, 205, 0.35)';
    for (let r = 1; r < 8; r++) {
      const hw = rowHalfWidths[r];
      px(ctx, sx - hw, ty + r, 2, 1);
      px(ctx, sx + hw - 2, ty + r, 2, 1);
    }
  }
}

function getBounceOffset(bounceTime: number | undefined, timeSec: number): number {
  if (!bounceTime) return 0;
  const elapsed = timeSec - bounceTime;
  if (elapsed < 0 || elapsed > 0.42) return 0;
  return -Math.round(Math.sin((elapsed / 0.42) * Math.PI) * 3.5);
}

/**
 * Draws the cozy isometric Wooden Farmhouse (spans gx=3..4, gy=5..6, anchored at 3,5).
 */
export function drawFarmhouse(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  atmo: AtmosphereVisualState,
  timeSec: number
): { chimneyX: number; chimneyY: number } {
  // Center of 2x2 footprint (3..4, 5..6) relative to (3,5) top vertex is (0, +9)
  const cx = anchorX;
  const cy = anchorY + 9;

  // Ground shadow
  ctx.fillStyle = `rgba(16, 24, 20, ${atmo.shadowAlpha.toFixed(2)})`;
  px(ctx, cx - 17 + atmo.shadowStretchX, cy + 2, 34, 9);

  // Stone foundation
  ctx.fillStyle = '#6f6a63';
  px(ctx, cx - 14, cy - 2, 14, 7);
  ctx.fillStyle = '#59544e';
  px(ctx, cx, cy - 2, 14, 7);

  // Left timber wall (facing SW)
  ctx.fillStyle = '#b88456';
  px(ctx, cx - 14, cy - 16, 14, 15);
  // Horizontal log plank shading lines
  ctx.fillStyle = '#9c6b42';
  for (let ly = cy - 14; ly < cy - 2; ly += 3) {
    px(ctx, cx - 14, ly, 14, 1);
  }

  // Right timber wall (facing SE - front door & glowing window)
  ctx.fillStyle = '#9e6d43';
  px(ctx, cx, cy - 16, 14, 15);
  ctx.fillStyle = '#855833';
  for (let ly = cy - 14; ly < cy - 2; ly += 3) {
    px(ctx, cx, ly, 14, 1);
  }

  // Corner dark wood beams
  ctx.fillStyle = '#5c3a22';
  px(ctx, cx - 14, cy - 16, 2, 16);
  px(ctx, cx - 1, cy - 17, 2, 18);
  px(ctx, cx + 13, cy - 16, 2, 16);

  // Cozy Wooden Door on right wall
  ctx.fillStyle = '#59361f';
  px(ctx, cx + 3, cy - 9, 4, 8);
  ctx.fillStyle = '#d9a85b';
  px(ctx, cx + 6, cy - 5, 1, 1); // brass doorknob
  // Stone doorstep
  ctx.fillStyle = '#9c958b';
  px(ctx, cx + 2, cy - 1, 6, 2);

  // Glowing Windows (flickering warm hearth light!)
  const flicker = 0.92 + Math.sin(timeSec * 7.3) * 0.05 + Math.cos(timeSec * 13.1) * 0.03;
  const glow = atmo.windowGlow * flicker;

  const winInner =
    glow > 0.25
      ? `rgb(${Math.round(140 + 115 * glow)}, ${Math.round(165 + 62 * glow)}, ${Math.round(
          185 - 75 * glow
        )})`
      : '#6e9bb5';

  // Window 1 (Left wall)
  ctx.fillStyle = '#4a2e1b';
  px(ctx, cx - 10, cy - 12, 6, 6);
  ctx.fillStyle = winInner;
  px(ctx, cx - 9, cy - 11, 4, 4);
  ctx.fillStyle = '#4a2e1b';
  px(ctx, cx - 7, cy - 11, 1, 4); // window mullion

  // Window 2 (Right wall next to door)
  ctx.fillStyle = '#4a2e1b';
  px(ctx, cx + 8, cy - 12, 5, 5);
  ctx.fillStyle = winInner;
  px(ctx, cx + 9, cy - 11, 3, 3);

  // Warm window light spill onto ground & sills at sunset/night
  if (glow > 0.3) {
    ctx.fillStyle = `rgba(255, 206, 112, ${(glow * 0.28).toFixed(2)})`;
    px(ctx, cx - 12, cy - 5, 8, 5);
    px(ctx, cx - 14, cy + 1, 9, 4);
    px(ctx, cx + 7, cy - 6, 7, 5);
    px(ctx, cx + 8, cy + 1, 8, 4);
  }

  // Brick Chimney on back-left slope
  ctx.fillStyle = '#8c4a3c';
  px(ctx, cx - 9, cy - 31, 4, 10);
  ctx.fillStyle = '#6e372c';
  px(ctx, cx - 6, cy - 31, 2, 10);
  ctx.fillStyle = '#a85d4d';
  px(ctx, cx - 10, cy - 32, 6, 2);

  // Pitched Cozy Shingle Roof
  const snow = atmo.snowCover;
  const roofMain = mixHex('#9e4738', [238, 245, 252], snow * 0.85);
  const roofDark = mixHex('#7d3529', [206, 220, 236], snow * 0.82);
  const roofTrim = '#e3cfa8';

  for (let r = 0; r < 12; r++) {
    const w = 16 - r;
    // Left slope
    ctx.fillStyle = r % 2 === 0 ? roofMain : roofDark;
    px(ctx, cx - w - 1, cy - 16 - r, w + 1, 2);
    // Right slope
    ctx.fillStyle = roofDark;
    px(ctx, cx, cy - 16 - r, w + 1, 2);
  }

  // Gable trim & attic round window
  ctx.fillStyle = roofTrim;
  px(ctx, cx - 16, cy - 15, 16, 1);
  px(ctx, cx, cy - 15, 16, 1);
  px(ctx, cx - 2, cy - 28, 4, 2);

  // Attic warm round window
  ctx.fillStyle = winInner;
  px(ctx, cx - 1, cy - 21, 2, 2);

  return { chimneyX: cx - 8, chimneyY: cy - 34 };
}

/**
 * Draws the small rustic Wooden Barn / Storage Shed (2x2 anchored at 2,9).
 */
export function drawBarn(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  atmo: AtmosphereVisualState
) {
  const cx = anchorX;
  const cy = anchorY + 9;

  // Shadow
  ctx.fillStyle = `rgba(16, 24, 20, ${atmo.shadowAlpha.toFixed(2)})`;
  px(ctx, cx - 14 + atmo.shadowStretchX, cy + 1, 28, 8);

  // Walls (warm barn cedar red-brown)
  ctx.fillStyle = '#9c4339';
  px(ctx, cx - 11, cy - 13, 11, 13);
  ctx.fillStyle = '#80342b';
  px(ctx, cx, cy - 13, 11, 13);

  // White/cream X-bracing barn doors on right face
  ctx.fillStyle = '#5c241e';
  px(ctx, cx + 2, cy - 9, 7, 9);
  ctx.fillStyle = '#e6d5b8';
  px(ctx, cx + 2, cy - 9, 7, 1);
  px(ctx, cx + 2, cy - 9, 1, 9);
  px(ctx, cx + 8, cy - 9, 1, 9);
  px(ctx, cx + 5, cy - 9, 1, 9);
  // Hay bale peeking beside barn
  ctx.fillStyle = '#dfb14b';
  px(ctx, cx - 9, cy - 3, 5, 4);
  ctx.fillStyle = '#b88b2e';
  px(ctx, cx - 9, cy - 1, 5, 2);

  // Gambrel Barn Roof
  const snow = atmo.snowCover;
  const roofLight = mixHex('#6b4f3d', [236, 244, 250], snow * 0.85);
  const roofShade = mixHex('#523b2d', [205, 218, 232], snow * 0.82);

  for (let r = 0; r < 9; r++) {
    const w = 13 - r;
    ctx.fillStyle = roofLight;
    px(ctx, cx - w, cy - 13 - r, w, 2);
    ctx.fillStyle = roofShade;
    px(ctx, cx, cy - 13 - r, w, 2);
  }

  // Hayloft glowing lantern window
  if (atmo.windowGlow > 0.25) {
    ctx.fillStyle = `rgba(255, 214, 125, ${atmo.windowGlow.toFixed(2)})`;
    px(ctx, cx + 4, cy - 13, 3, 2);
  } else {
    ctx.fillStyle = '#3b2318';
    px(ctx, cx + 4, cy - 13, 3, 2);
  }
}

/**
 * Draws the tiny Pixel Farmer Character near the farmhouse with subtle idle breathing,
 * blinking, and watering/tending animation.
 */
export function drawTinyFarmer(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  atmo: AtmosphereVisualState,
  timeSec: number,
  isWalking = false,
  facingRight = true
) {
  const walkBob = isWalking ? Math.round(Math.sin(timeSec * 12) * 1.5) : 0;
  const idleBob = !isWalking ? Math.floor(timeSec * 2.2) % 2 : 0;
  const bob = walkBob + idleBob;
  const x = sx;
  const y = sy + 2;

  // Shadow
  ctx.fillStyle = `rgba(16, 24, 20, ${atmo.shadowAlpha.toFixed(2)})`;
  px(ctx, x - 3, y + 1, 6, 2);

  // Boots (animated when walking)
  ctx.fillStyle = '#4a3222';
  if (isWalking) {
    const legSwing = Math.sin(timeSec * 12);
    px(ctx, x - 2, y + (legSwing > 0 ? -1 : 0), 2, 2);
    px(ctx, x + 1, y + (legSwing <= 0 ? -1 : 0), 2, 2);
  } else {
    px(ctx, x - 2, y, 2, 2);
    px(ctx, x + 1, y, 2, 2);
  }

  // Denim / Forest Overalls
  ctx.fillStyle = '#3d697a';
  px(ctx, x - 2, y - 4 + bob, 5, 4);

  // Red plaid shirt sleeves
  ctx.fillStyle = '#c95549';
  px(ctx, x - 3, y - 4 + bob, 1, 3);
  px(ctx, x + 3, y - 4 + bob, 1, 3);

  // Head
  ctx.fillStyle = '#f2c29b';
  px(ctx, x - 2, y - 7 + bob, 5, 3);

  // Blinking tiny pixel eye (oriented by facing direction)
  const blink = Math.sin(timeSec * 1.9) > 0.96;
  if (!blink) {
    ctx.fillStyle = '#2b1e19';
    const eyeX = facingRight ? x + 1 : x - 1;
    px(ctx, eyeX, y - 6 + bob, 1, 1);
  }

  // Cozy Straw Sunhat
  ctx.fillStyle = '#e6be68';
  px(ctx, x - 4, y - 8 + bob, 9, 1);
  px(ctx, x - 2, y - 10 + bob, 5, 2);
  ctx.fillStyle = '#b85042';
  px(ctx, x - 2, y - 8 + bob, 5, 1); // hat ribbon
}

/**
 * Draws a cozy sleeping or stretching ginger tabby cat on the farmhouse porch.
 */
export function drawCozyCat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  atmo: AtmosphereVisualState,
  timeSec: number,
  isPurring = false
) {
  const breathe = Math.floor(timeSec * 1.8) % 2;
  const tailFlick = Math.sin(timeSec * 2.2) > 0.6 ? 1 : 0;

  // Cat shadow
  ctx.fillStyle = `rgba(16, 24, 20, ${(atmo.shadowAlpha * 0.7).toFixed(2)})`;
  px(ctx, cx - 4, cy + 2, 8, 2);

  // Body (curled sleeping ginger cat)
  ctx.fillStyle = '#df7e32'; // warm ginger
  px(ctx, cx - 3, cy - 1 + breathe, 7, 3);
  ctx.fillStyle = '#b75b1c'; // ginger stripes
  px(ctx, cx - 1, cy - 1 + breathe, 1, 3);
  px(ctx, cx + 1, cy - 1 + breathe, 1, 3);

  // White chest & paws
  ctx.fillStyle = '#faebd7';
  px(ctx, cx - 3, cy + 1 + breathe, 2, 1);

  // Cat head with ears
  ctx.fillStyle = '#df7e32';
  px(ctx, cx + 2, cy - 2 + breathe, 3, 3);
  // Ears
  ctx.fillStyle = '#f8a9a2'; // pink inner ear
  px(ctx, cx + 2, cy - 3 + breathe, 1, 1);
  px(ctx, cx + 4, cy - 3 + breathe, 1, 1);

  // Curled tail
  ctx.fillStyle = '#df7e32';
  px(ctx, cx - 4, cy + breathe, 1, 2);
  px(ctx, cx - 5, cy - 1 + breathe - tailFlick, 1, 2);

  // Purr heart floating
  if (isPurring) {
    const floatY = Math.round((timeSec * 12) % 10);
    drawHeartParticle(ctx, cx, cy - 6 - floatY, 1);
  }
}

/**
 * Draws an adorable white duck swimming gently across the pond.
 */
export function drawCozyDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingRight: boolean,
  timeSec: number,
  seed = 0
) {
  const bob = Math.round(Math.sin(timeSec * 3.2 + seed) * 0.8);
  const cx = Math.round(x);
  const cy = Math.round(y) + bob;

  // Gentle water ripple wake behind the duck
  const wakeDir = facingRight ? -1 : 1;
  ctx.fillStyle = 'rgba(215, 242, 255, 0.45)';
  px(ctx, cx + wakeDir * 4, cy + 2, 2, 1);
  px(ctx, cx + wakeDir * 6, cy + 3, 3, 1);

  // Duck Body
  ctx.fillStyle = '#f7f6f0'; // crisp white
  px(ctx, cx - 3, cy - 1, 6, 3);
  ctx.fillStyle = '#d3dbe2'; // underside shadow
  px(ctx, cx - 2, cy + 1, 4, 1);

  // Head
  const hx = facingRight ? cx + 2 : cx - 3;
  ctx.fillStyle = '#f7f6f0';
  px(ctx, hx, cy - 3, 3, 3);

  // Eye
  ctx.fillStyle = '#211d1a';
  px(ctx, facingRight ? hx + 1 : hx + 1, cy - 2, 1, 1);

  // Yellow beak
  ctx.fillStyle = '#fab039';
  const bx = facingRight ? hx + 3 : hx - 2;
  px(ctx, bx, cy - 2, 2, 1);
}

/**
 * Draws a crisp 5x4 pixel-art heart.
 */
export function drawHeartParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha = 1
) {
  ctx.fillStyle = `rgba(240, 98, 118, ${alpha.toFixed(2)})`;
  px(ctx, x - 2, y, 2, 1);
  px(ctx, x + 1, y, 2, 1);
  px(ctx, x - 2, y + 1, 5, 1);
  px(ctx, x - 1, y + 2, 3, 1);
  px(ctx, x, y + 3, 1, 1);
  // Sparkle highlight
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
  px(ctx, x - 2, y, 1, 1);
}

/**
 * Draws an intricate, multi-pixel fluttering butterfly (25-35 pixels) with realistic
 * wing borders, vivid pigmented scales, wingtip spots, antennae, and multi-stage flapping.
 */
export function drawDetailedButterfly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  species: ButterflySpecies,
  phase: number
) {
  const x = Math.round(cx);
  const y = Math.round(cy);

  // 1. Color palette based on species
  let borderCol = '#1c1917';
  let wingMain = '#ea580c'; // default monarch orange
  let wingHigh = '#fed7aa'; // inner wing highlight
  let spotCol = '#fef08a'; // wingtip spot

  if (species === 'morpho') {
    borderCol = '#082f49';
    wingMain = '#0284c7'; // brilliant cerulean
    wingHigh = '#7dd3fc'; // iridescent cyan
    spotCol = '#ffffff';
  } else if (species === 'swallowtail') {
    borderCol = '#27272a';
    wingMain = '#eab308'; // sunflower yellow
    wingHigh = '#fef08a';
    spotCol = '#38bdf8'; // tail dot
  } else if (species === 'rose') {
    borderCol = '#4c0519';
    wingMain = '#f43f5e'; // rose coral
    wingHigh = '#fda4af';
    spotCol = '#fdf2f8';
  }

  // 2. Continuous flap cycle (0: fully open, 1: mid-up, 2: closed upright)
  const flapCycle = (Math.sin(phase) + 1) * 0.5;

  // Draw Body (head, thorax, abdomen, and antennae)
  ctx.fillStyle = '#1c1917';
  px(ctx, x, y - 2, 1, 1); // head
  px(ctx, x, y - 1, 1, 2); // thorax
  px(ctx, x, y + 1, 1, 2); // abdomen
  px(ctx, x - 1, y - 3, 1, 1); // left antenna
  px(ctx, x + 1, y - 3, 1, 1); // right antenna

  if (flapCycle < 0.35) {
    // --- STAGE A: WINGS WIDE OPEN (Gliding / Full Span: 11px wide, ~26 pixels) ---
    // Left Forewing (Upper)
    ctx.fillStyle = borderCol;
    px(ctx, x - 4, y - 3, 3, 1);
    px(ctx, x - 5, y - 2, 4, 1);
    px(ctx, x - 4, y - 1, 3, 1);
    ctx.fillStyle = wingMain;
    px(ctx, x - 3, y - 3, 2, 1);
    px(ctx, x - 4, y - 2, 3, 1);
    px(ctx, x - 3, y - 1, 2, 1);
    ctx.fillStyle = wingHigh;
    px(ctx, x - 2, y - 2, 1, 1);
    ctx.fillStyle = spotCol;
    px(ctx, x - 5, y - 2, 1, 1);

    // Right Forewing (Upper)
    ctx.fillStyle = borderCol;
    px(ctx, x + 2, y - 3, 3, 1);
    px(ctx, x + 2, y - 2, 4, 1);
    px(ctx, x + 2, y - 1, 3, 1);
    ctx.fillStyle = wingMain;
    px(ctx, x + 2, y - 3, 2, 1);
    px(ctx, x + 2, y - 2, 3, 1);
    px(ctx, x + 2, y - 1, 2, 1);
    ctx.fillStyle = wingHigh;
    px(ctx, x + 2, y - 2, 1, 1);
    ctx.fillStyle = spotCol;
    px(ctx, x + 5, y - 2, 1, 1);

    // Left Hindwing (Lower)
    ctx.fillStyle = borderCol;
    px(ctx, x - 3, y, 3, 2);
    ctx.fillStyle = wingMain;
    px(ctx, x - 2, y, 2, 1);
    px(ctx, x - 2, y + 1, 1, 1);

    // Right Hindwing (Lower)
    ctx.fillStyle = borderCol;
    px(ctx, x + 1, y, 3, 2);
    ctx.fillStyle = wingMain;
    px(ctx, x + 1, y, 2, 1);
    px(ctx, x + 2, y + 1, 1, 1);
  } else if (flapCycle < 0.72) {
    // --- STAGE B: MID-FLAP (Angled upward: 7px wide, ~18 pixels) ---
    // Left Wing
    ctx.fillStyle = borderCol;
    px(ctx, x - 3, y - 4, 2, 1);
    px(ctx, x - 3, y - 3, 3, 2);
    px(ctx, x - 2, y - 1, 2, 2);
    ctx.fillStyle = wingMain;
    px(ctx, x - 2, y - 4, 1, 1);
    px(ctx, x - 2, y - 3, 2, 2);
    px(ctx, x - 1, y - 1, 1, 1);
    ctx.fillStyle = spotCol;
    px(ctx, x - 3, y - 4, 1, 1);

    // Right Wing
    ctx.fillStyle = borderCol;
    px(ctx, x + 2, y - 4, 2, 1);
    px(ctx, x + 1, y - 3, 3, 2);
    px(ctx, x + 1, y - 1, 2, 2);
    ctx.fillStyle = wingMain;
    px(ctx, x + 2, y - 4, 1, 1);
    px(ctx, x + 1, y - 3, 2, 2);
    px(ctx, x + 1, y - 1, 1, 1);
    ctx.fillStyle = spotCol;
    px(ctx, x + 3, y - 4, 1, 1);
  } else {
    // --- STAGE C: FOLDED UPRIGHT (Flutter crest: 3px wide, 7px tall, ~12 pixels) ---
    ctx.fillStyle = borderCol;
    px(ctx, x - 1, y - 5, 3, 1);
    px(ctx, x - 1, y - 4, 3, 3);
    px(ctx, x, y - 1, 1, 2);
    ctx.fillStyle = wingMain;
    px(ctx, x, y - 4, 2, 2);
    ctx.fillStyle = wingHigh;
    px(ctx, x, y - 3, 1, 1);
    ctx.fillStyle = spotCol;
    px(ctx, x - 1, y - 5, 1, 1);
  }
}

/**
 * Draws a swimming golden koi fish beneath the pond surface.
 */
export function drawSwimmingFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingRight: boolean,
  timeSec: number,
  isCalico = false
) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const tailSway = Math.round(Math.sin(timeSec * 7) * 1.2);
  const dir = facingRight ? 1 : -1;

  // Semi-translucent depth beneath water surface
  ctx.fillStyle = isCalico ? 'rgba(239, 68, 68, 0.82)' : 'rgba(245, 158, 11, 0.85)';
  px(ctx, cx - dir * 1, cy, 3, 1);
  px(ctx, cx, cy - 1, 2, 1);
  px(ctx, cx + dir * 2, cy, 1, 1); // nose

  // White belly / calico patch
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  px(ctx, cx, cy, 1, 1);

  // Wiggling Tail fin
  ctx.fillStyle = isCalico ? 'rgba(239, 68, 68, 0.65)' : 'rgba(245, 158, 11, 0.65)';
  px(ctx, cx - dir * 2, cy + tailSway, 1, 1);
  px(ctx, cx - dir * 3, cy + tailSway, 1, 2);
}

/**
 * Draws built-in static/animated pixel-art props (trees, crops, flowers, fences, lanterns, rocks).
 */
export function drawTileProp(
  ctx: CanvasRenderingContext2D,
  tile: TileData,
  sx: number,
  sy: number,
  atmo: AtmosphereVisualState,
  timeSec: number
): { chimneyX: number; chimneyY: number } | null {
  if (tile.prop === 'none') return null;

  if (tile.prop === 'farmhouse' && tile.propAnchor) {
    return drawFarmhouse(ctx, sx, sy, atmo, timeSec);
  }
  if (tile.prop === 'barn' && tile.propAnchor) {
    drawBarn(ctx, sx, sy, atmo);
    return null;
  }

  const bounceY = getBounceOffset(tile.bounceTime, timeSec);
  const cx = sx;
  const cy = sy + 4 + bounceY;
  const sway = Math.round(Math.sin(timeSec * 1.8 + tile.gx * 0.9 + tile.gy * 0.7) * 0.75);
  const snow = atmo.snowCover;

  switch (tile.prop) {
    case 'pine_tree': {
      // Shadow
      ctx.fillStyle = `rgba(14, 24, 18, ${atmo.shadowAlpha.toFixed(2)})`;
      px(ctx, cx - 6 + atmo.shadowStretchX, sy + 3, 12, 4);
      // Trunk
      ctx.fillStyle = '#5c3c28';
      px(ctx, cx - 1, cy - 4, 3, 5);
      // Layered pixel pine tiers
      const darkGreen = mixHex('#23472b', [195, 215, 232], snow * 0.45);
      const midGreen = mixHex('#316138', [220, 234, 246], snow * 0.65);
      const lightGreen = mixHex('#457d49', [245, 250, 255], snow * 0.85);

      // Bottom tier
      ctx.fillStyle = darkGreen;
      px(ctx, cx - 7, cy - 8, 15, 5);
      ctx.fillStyle = midGreen;
      px(ctx, cx - 6, cy - 10, 13, 4);
      // Middle tier
      ctx.fillStyle = darkGreen;
      px(ctx, cx - 6 + sway, cy - 14, 13, 4);
      ctx.fillStyle = midGreen;
      px(ctx, cx - 5 + sway, cy - 16, 11, 4);
      ctx.fillStyle = lightGreen;
      px(ctx, cx - 4 + sway, cy - 16, 5, 2);
      // Top spire
      ctx.fillStyle = midGreen;
      px(ctx, cx - 3 + sway, cy - 20, 7, 4);
      ctx.fillStyle = lightGreen;
      px(ctx, cx - 2 + sway, cy - 23, 5, 3);
      px(ctx, cx - 1 + sway, cy - 25, 3, 2);
      break;
    }

    case 'oak_tree':
    case 'birch_tree': {
      const isBirch = tile.prop === 'birch_tree';
      ctx.fillStyle = `rgba(14, 24, 18, ${atmo.shadowAlpha.toFixed(2)})`;
      px(ctx, cx - 7 + atmo.shadowStretchX, sy + 3, 14, 5);

      // Trunk
      ctx.fillStyle = isBirch ? '#ded8ce' : '#69452d';
      px(ctx, cx - 1, cy - 7, 3, 8);
      if (isBirch) {
        ctx.fillStyle = '#4a453f';
        px(ctx, cx - 1, cy - 5, 2, 1);
        px(ctx, cx, cy - 2, 2, 1);
      }

      // Rich pixel-cluster canopy
      const cDark = mixHex(isBirch ? '#4b7a3f' : '#2d5731', [195, 212, 228], snow * 0.5);
      const cMid = mixHex(isBirch ? '#689c52' : '#40753f', [224, 236, 248], snow * 0.72);
      const cHigh = mixHex(isBirch ? '#89bd68' : '#58944f', [246, 252, 255], snow * 0.88);

      ctx.fillStyle = cDark;
      px(ctx, cx - 7 + sway, cy - 15, 15, 9);
      px(ctx, cx - 5 + sway, cy - 18, 11, 12);

      ctx.fillStyle = cMid;
      px(ctx, cx - 6 + sway, cy - 17, 13, 8);
      px(ctx, cx - 4 + sway, cy - 20, 9, 4);

      // Pixel cluster highlights (top-left sunlit clusters)
      ctx.fillStyle = cHigh;
      px(ctx, cx - 5 + sway, cy - 18, 5, 3);
      px(ctx, cx - 3 + sway, cy - 20, 5, 2);
      px(ctx, cx + 1 + sway, cy - 15, 3, 2);
      break;
    }

    case 'bush': {
      ctx.fillStyle = '#2d5731';
      px(ctx, cx - 4, cy - 3, 9, 4);
      ctx.fillStyle = mixHex('#498245', [240, 248, 255], snow * 0.8);
      px(ctx, cx - 3, cy - 5, 7, 4);
      ctx.fillStyle = mixHex('#66a158', [250, 253, 255], snow * 0.85);
      px(ctx, cx - 2, cy - 5, 4, 2);
      // Tiny berries
      if (snow < 0.4) {
        ctx.fillStyle = '#d9534f';
        px(ctx, cx - 2, cy - 2, 1, 1);
        px(ctx, cx + 1, cy - 3, 1, 1);
      }
      break;
    }

    case 'rock': {
      ctx.fillStyle = '#68655f';
      px(ctx, cx - 4, cy - 2, 8, 3);
      ctx.fillStyle = '#8c8881';
      px(ctx, cx - 3, cy - 4, 6, 3);
      ctx.fillStyle = mixHex('#aba79f', [245, 250, 255], snow * 0.85);
      px(ctx, cx - 2, cy - 4, 3, 1);
      break;
    }

    case 'mushroom': {
      ctx.fillStyle = '#ebe3d5';
      px(ctx, cx, cy - 1, 2, 2);
      ctx.fillStyle = '#cf4a3c';
      px(ctx, cx - 1, cy - 3, 4, 2);
      ctx.fillStyle = '#fff8eb';
      px(ctx, cx, cy - 3, 1, 1);
      break;
    }

    case 'carrot_crop': {
      const spots = [
        [-3, -1],
        [2, -1],
        [-1, 1],
      ];
      for (const [ox, oy] of spots) {
        // Orange root peeking from soil
        ctx.fillStyle = '#e87a38';
        px(ctx, cx + ox, cy + oy - 1, 2, 2);
        // Leafy green top swaying
        ctx.fillStyle = '#5ca14d';
        px(ctx, cx + ox + sway, cy + oy - 3, 2, 2);
      }
      break;
    }

    case 'pumpkin_crop': {
      // Cozy plump pixel pumpkin + vine
      ctx.fillStyle = '#3c7036';
      px(ctx, cx - 4, cy, 8, 1);
      ctx.fillStyle = '#c96228';
      px(ctx, cx - 3, cy - 3, 7, 4);
      ctx.fillStyle = '#e88338';
      px(ctx, cx - 2, cy - 3, 5, 4);
      ctx.fillStyle = '#f5a147';
      px(ctx, cx - 1, cy - 3, 2, 2);
      // Stem
      ctx.fillStyle = '#4e7d3b';
      px(ctx, cx, cy - 5, 1, 2);
      break;
    }

    case 'wheat_crop': {
      ctx.fillStyle = '#ba913c';
      for (let wx = -4; wx <= 3; wx += 2) {
        px(ctx, cx + wx, cy - 3, 1, 4);
        ctx.fillStyle = '#ebc867';
        px(ctx, cx + wx + sway, cy - 6, 1, 3);
        ctx.fillStyle = '#ba913c';
      }
      break;
    }

    case 'well': {
      // Cute miniature stone wishing well
      ctx.fillStyle = '#6c6862';
      px(ctx, cx - 4, cy - 3, 9, 4);
      ctx.fillStyle = '#8f8a82';
      px(ctx, cx - 4, cy - 4, 9, 2);
      ctx.fillStyle = '#366f91';
      px(ctx, cx - 2, cy - 4, 5, 1);
      // Wooden posts & tiny roof
      ctx.fillStyle = '#6e472b';
      px(ctx, cx - 3, cy - 9, 1, 6);
      px(ctx, cx + 3, cy - 9, 1, 6);
      ctx.fillStyle = mixHex('#8f4337', [240, 248, 255], snow * 0.85);
      px(ctx, cx - 5, cy - 11, 11, 3);
      break;
    }

    case 'waterwheel': {
      // Timber Support Framing
      ctx.fillStyle = '#4a2f1c';
      px(ctx, cx - 2, cy - 13, 2, 14);
      px(ctx, cx + 5, cy - 11, 2, 12);
      ctx.fillStyle = '#6d4529';
      px(ctx, cx - 4, cy - 6, 11, 2);
      px(ctx, cx - 3, cy - 11, 10, 2);

      // Iron Axle Hub
      ctx.fillStyle = '#2d2f33';
      px(ctx, cx + 1, cy - 8, 3, 3);
      ctx.fillStyle = '#dcd7cc';
      px(ctx, cx + 2, cy - 7, 1, 1);

      // Rotating 6-spoke wooden waterwheel
      const angle = timeSec * 2.8;
      const wheelR = 7;
      const spokeDark = '#5c3a21';
      const spokeLight = '#825634';
      const paddleCol = '#a16d44';

      // Outer rim ring
      ctx.fillStyle = spokeDark;
      px(ctx, cx - 4, cy - 14, 12, 1);
      px(ctx, cx - 6, cy - 13, 2, 2);
      px(ctx, cx + 8, cy - 13, 2, 2);
      px(ctx, cx - 7, cy - 11, 1, 7);
      px(ctx, cx + 10, cy - 11, 1, 7);
      px(ctx, cx - 6, cy - 3, 2, 2);
      px(ctx, cx + 8, cy - 3, 2, 2);
      px(ctx, cx - 4, cy, 12, 1);

      // Spokes and paddles
      for (let s = 0; s < 6; s++) {
        const a = angle + (s * Math.PI) / 3;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const sx = Math.round(cx + 2 + cosA * (wheelR - 1));
        const sy = Math.round(cy - 7 + sinA * (wheelR - 1));

        ctx.fillStyle = s % 2 === 0 ? spokeLight : spokeDark;
        px(ctx, Math.round(cx + 2 + cosA * 3), Math.round(cy - 7 + sinA * 3), 1, 1);

        ctx.fillStyle = paddleCol;
        px(ctx, sx - 1, sy, 3, 2);

        // Water dripping off descending paddles on right side
        if (cosA > 0.25 && sinA > 0) {
          ctx.fillStyle = 'rgba(215, 245, 255, 0.75)';
          px(ctx, sx, sy + 2, 1, 2);
        }
      }

      // Churning splash foam at bottom where wheel meets stream
      const splashPulse = Math.floor(timeSec * 8) % 3;
      ctx.fillStyle = '#eefaff';
      px(ctx, cx - 3, cy, 9, 2);
      if (splashPulse === 0) {
        px(ctx, cx + 6, cy - 1, 2, 1);
        px(ctx, cx - 4, cy + 1, 2, 1);
      } else if (splashPulse === 1) {
        px(ctx, cx + 7, cy + 1, 2, 1);
        px(ctx, cx - 2, cy - 1, 2, 1);
      }
      break;
    }

    case 'lantern': {
      // Wooden post
      ctx.fillStyle = '#593924';
      px(ctx, cx, cy - 8, 2, 9);
      px(ctx, cx - 1, cy - 8, 4, 1);
      // Lantern housing
      const lGlow = Math.max(0.2, atmo.windowGlow);
      ctx.fillStyle = lGlow > 0.45 ? '#ffe38f' : '#d6e3e8';
      px(ctx, cx - 1, cy - 7, 3, 3);
      ctx.fillStyle = '#3b281c';
      px(ctx, cx - 1, cy - 8, 3, 1);
      if (atmo.windowGlow > 0.3) {
        ctx.fillStyle = `rgba(255, 214, 110, ${(atmo.windowGlow * 0.32).toFixed(2)})`;
        px(ctx, cx - 5, cy - 10, 11, 11);
      }
      break;
    }

    case 'fence_x': {
      ctx.fillStyle = '#754d32';
      px(ctx, cx - 4, cy - 4, 2, 5);
      px(ctx, cx + 3, cy - 2, 2, 5);
      ctx.fillStyle = '#9c6b46';
      px(ctx, cx - 5, cy - 3, 10, 1);
      px(ctx, cx - 5, cy - 1, 10, 1);
      break;
    }

    case 'fence_y': {
      ctx.fillStyle = '#754d32';
      px(ctx, cx + 3, cy - 4, 2, 5);
      px(ctx, cx - 4, cy - 2, 2, 5);
      ctx.fillStyle = '#8c5e3c';
      px(ctx, cx - 4, cy - 3, 9, 1);
      px(ctx, cx - 4, cy - 1, 9, 1);
      break;
    }

    case 'flower_red':
    case 'flower_yellow':
    case 'flower_blue':
    case 'flower_pink':
    case 'flower_white': {
      const palette: Record<string, string> = {
        flower_red: '#e3564b',
        flower_yellow: '#f5cc4d',
        flower_blue: '#6cb4e8',
        flower_pink: '#f08ca2',
        flower_white: '#faf6eb',
      };
      drawFlowerCluster(ctx, cx, cy, palette[tile.prop] || '#f5cc4d', sway, 1);
      break;
    }
  }

  return null;
}

function drawFlowerCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  petalColor: string,
  sway: number,
  growth: number
) {
  // Stems
  ctx.fillStyle = '#3f7838';
  px(ctx, cx - 2, cy - 1, 1, 2);
  px(ctx, cx + 1, cy, 1, 2);

  if (growth < 0.45) {
    // Budding sprout stage
    ctx.fillStyle = '#6db359';
    px(ctx, cx - 2 + sway, cy - 2, 2, 1);
    px(ctx, cx + 1 + sway, cy - 1, 1, 1);
    return;
  }

  // Petals (blooming!)
  ctx.fillStyle = petalColor;
  px(ctx, cx - 3 + sway, cy - 3, 3, 2);
  px(ctx, cx + 1 + sway, cy - 2, 2, 2);

  // Sunny center pixel
  ctx.fillStyle = '#ffe97d';
  px(ctx, cx - 2 + sway, cy - 3, 1, 1);
}

/**
 * Renders visitor-planted flowers, sprouts, and trees with smooth pixel growth & click bounce!
 */
export function drawPlantedEntity(
  ctx: CanvasRenderingContext2D,
  entity: PlantedEntity,
  sx: number,
  sy: number,
  atmo: AtmosphereVisualState,
  timeSec: number
) {
  const bounceY = getBounceOffset(entity.bounceTime, timeSec);
  const cx = sx + entity.subX;
  const cy = sy + 4 + entity.subY + bounceY;
  const sway = Math.round(Math.sin(timeSec * 2.1 + entity.id * 1.3) * 0.75);
  const snow = atmo.snowCover;

  const flowerColors = ['#f5cc4d', '#f08ca2', '#e3564b', '#73b9eb', '#faf6eb'];

  if (entity.kind === 'sprout') {
    ctx.fillStyle = '#48873e';
    px(ctx, cx, cy - 1, 1, 2);
    ctx.fillStyle = '#75ba61';
    px(ctx, cx - 1 + sway, cy - 2, 2, 1);
    if (entity.variant % 2 === 0 && entity.growth > 0.6) {
      ctx.fillStyle = flowerColors[entity.variant % flowerColors.length];
      px(ctx, cx + sway, cy - 3, 1, 1);
    }
    return;
  }

  if (entity.kind === 'flower') {
    const col = flowerColors[entity.variant % flowerColors.length];
    drawFlowerCluster(ctx, cx, cy, col, sway, entity.growth);
    return;
  }

  // Planted Tree (grows from sapling to lush miniature tree!)
  const g = entity.growth;
  ctx.fillStyle = `rgba(14, 24, 18, ${(atmo.shadowAlpha * g).toFixed(2)})`;
  px(ctx, cx - 5 + atmo.shadowStretchX, sy + 3, Math.max(4, Math.round(10 * g)), 4);

  const trunkH = Math.max(3, Math.round(7 * g));
  ctx.fillStyle = '#69452d';
  px(ctx, cx - 1, cy - trunkH, 2, trunkH + 1);

  const radius = Math.max(2, Math.round(6 * g));
  // Variant 0: Lush emerald oak, Variant 1: Pine sapling, Variant 2: Warm Blossom / Golden tree
  let cDark = '#2d5731';
  let cMid = '#468244';
  let cHigh = '#66ab5b';

  if (entity.variant === 2) {
    cDark = '#9e5266';
    cMid = '#d97e96';
    cHigh = '#f7aec0';
  } else if (entity.variant === 1) {
    cDark = '#234a30';
    cMid = '#346941';
    cHigh = '#4e8c58';
  }

  cMid = mixHex(cMid, [230, 240, 250], snow * 0.7);
  cHigh = mixHex(cHigh, [248, 252, 255], snow * 0.85);

  const canopyTop = cy - trunkH - radius * 2 + 2;
  ctx.fillStyle = cDark;
  px(ctx, cx - radius + sway, canopyTop + 2, radius * 2 + 1, radius * 2 - 2);
  ctx.fillStyle = cMid;
  px(ctx, cx - radius + 1 + sway, canopyTop, radius * 2 - 1, radius * 2 - 2);
  ctx.fillStyle = cHigh;
  px(ctx, cx - radius + 2 + sway, canopyTop, Math.max(2, radius - 1), Math.max(2, radius - 2));
}
