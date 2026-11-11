import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TimeOfDay, WeatherType } from '../types/farm';
import { DayNightSystem, rgbCss } from '../systems/DayNightSystem';
import {
  createInitialFarmMap,
  GRID_SIZE,
  gridToScreen,
  screenToGrid,
} from '../systems/FarmMap';
import { PlantingSystem, PlantCounts } from '../systems/PlantingSystem';
import {
  drawIsometricTile,
  drawPixelSky,
  drawPlantedEntity,
  drawTileProp,
  drawTinyFarmer,
  drawCozyCat,
  drawCozyDuck,
  drawHeartParticle,
  drawSwimmingFish,
} from '../systems/PixelSprites';
import { WeatherSystem } from '../systems/WeatherSystem';
import { soundController } from '../systems/SoundController';

export const INTERNAL_RES = 256;

interface FarmCanvasProps {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  resetSignal: number;
  onCountsChange: (counts: PlantCounts) => void;
  onSelectAction?: (actionText: string) => void;
}

interface SparkleParticle {
  x: number;
  y: number;
  vy: number;
  age: number;
  maxAge: number;
  kind: 'sparkle' | 'heart';
}

export const FarmCanvas: React.FC<FarmCanvasProps> = ({
  timeOfDay,
  weather,
  resetSignal,
  onCountsChange,
  onSelectAction,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<TimeOfDay>(timeOfDay);
  const weatherRef = useRef<WeatherType>(weather);

  timeRef.current = timeOfDay;
  weatherRef.current = weather;

  const mapRef = useRef(createInitialFarmMap());
  const dayNightRef = useRef(new DayNightSystem(timeOfDay, weather));
  const weatherSysRef = useRef(new WeatherSystem(INTERNAL_RES, INTERNAL_RES));
  const plantingRef = useRef(new PlantingSystem());

  const hoveredTileRef = useRef<{ gx: number; gy: number } | null>(null);
  const isPointerDownRef = useRef(false);
  const lastDragTimeRef = useRef(0);
  const chimneyPosRef = useRef({ x: 96, y: 58 });

  // Floating particles (hearts, crop sparkles, water droplets)
  const particlesRef = useRef<SparkleParticle[]>([]);

  // Duck entity on the pond
  const duckRef = useRef({
    x: 178,
    y: 114,
    targetX: 182,
    targetY: 116,
    facingRight: true,
    speed: 7,
    nextPick: 2,
  });

  // Cat entity on the porch
  const catRef = useRef({
    purrUntil: 0,
  });

  // Swimming Koi Fish in pond
  const koiRef = useRef([
    { x: 182, y: 118, targetX: 174, targetY: 115, isCalico: false, speed: 6, nextPick: 2 },
    { x: 170, y: 112, targetX: 180, targetY: 122, isCalico: true, speed: 7, nextPick: 4 },
  ]);

  // Smooth HTML Thought Bubble state (crisp typography)
  const [visibleThought, setVisibleThought] = useState<{ text: string; x: number; y: number } | null>({
    text: 'Cozy day~',
    x: 119,
    y: 112,
  });
  const thoughtTimerRef = useRef<number | null>(null);

  // Farmer state & motion
  const farmerRef = useRef({
    currX: 119,
    currY: 112,
    targetX: 119,
    targetY: 112,
    isWalking: false,
    facingRight: true,
    stepTimer: 0,
    thought: 'Cozy day~' as string | null,
    thoughtUntil: performance.now() / 1000 + 4,
  });

  // Precompute pond screen coordinates for raindrops/ripples
  const pondPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  useEffect(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const tiles = mapRef.current;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (tiles[x][y].terrain === 'water') {
          const p = gridToScreen(x, y, tiles[x][y].elevation);
          pts.push({ x: p.x, y: p.y + 5 });
        }
      }
    }
    pondPointsRef.current = pts;
  }, []);

  // Sync atmospheric remarks when time or weather switches
  useEffect(() => {
    const timeRemarks: Record<TimeOfDay, string> = {
      sunrise: 'Peach dawn~',
      day: 'Warm sunshine!',
      sunset: 'Golden hour~',
      night: 'Starry night',
    };
    farmerRef.current.thought = timeRemarks[timeOfDay];
    farmerRef.current.thoughtUntil = performance.now() / 1000 + 3.5;
  }, [timeOfDay]);

  useEffect(() => {
    const weatherRemarks: Record<WeatherType, string> = {
      clear: 'Breezy skies~',
      rain: 'Rainy peace...',
      fog: 'Misty valley',
      snow: 'Winter hush ❄',
    };
    farmerRef.current.thought = weatherRemarks[weather];
    farmerRef.current.thoughtUntil = performance.now() / 1000 + 3.5;
  }, [weather]);

  // Handle Farm Reset
  useEffect(() => {
    if (resetSignal === 0) return;
    mapRef.current = createInitialFarmMap();
    plantingRef.current.reset();
    farmerRef.current.currX = 119;
    farmerRef.current.currY = 112;
    farmerRef.current.targetX = 119;
    farmerRef.current.targetY = 112;
    farmerRef.current.isWalking = false;
    farmerRef.current.thought = 'Fresh start!';
    farmerRef.current.thoughtUntil = performance.now() / 1000 + 3;
    onCountsChange({ flowers: 0, trees: 0 });
    soundController.playUiClick(480);
  }, [resetSignal, onCountsChange]);

  // Main 60fps Pixel-Art Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId = 0;
    let lastTs = performance.now();

    const renderFrame = (nowMs: number) => {
      const dt = Math.min(0.05, (nowMs - lastTs) / 1000);
      lastTs = nowMs;
      const nowSec = nowMs / 1000;

      const curTime = timeRef.current;
      const curWeather = weatherRef.current;

      const atmo = dayNightRef.current.update(dt, curTime, curWeather);
      plantingRef.current.update(dt);
      weatherSysRef.current.update(
        dt,
        curWeather,
        curTime,
        pondPointsRef.current,
        chimneyPosRef.current
      );

      // 1. Duck wander simulation in pond basin
      const duck = duckRef.current;
      duck.nextPick -= dt;
      if (duck.nextPick <= 0) {
        duck.nextPick = 3 + Math.random() * 4;
        duck.targetX = 166 + Math.random() * 24;
        duck.targetY = 110 + Math.random() * 11;
        duck.facingRight = duck.targetX >= duck.x;
      }
      const duckDx = duck.targetX - duck.x;
      const duckDy = duck.targetY - duck.y;
      const duckDist = Math.hypot(duckDx, duckDy);
      if (duckDist > 1) {
        duck.x += (duckDx / duckDist) * duck.speed * dt;
        duck.y += (duckDy / duckDist) * duck.speed * dt;
        duck.facingRight = duckDx >= 0;
      }

      // 1b. Koi fish simulation
      for (const k of koiRef.current) {
        k.nextPick -= dt;
        if (k.nextPick <= 0) {
          k.nextPick = 3 + Math.random() * 4;
          k.targetX = 168 + Math.random() * 24;
          k.targetY = 110 + Math.random() * 12;
        }
        const kdx = k.targetX - k.x;
        const kdy = k.targetY - k.y;
        const kdist = Math.hypot(kdx, kdy);
        if (kdist > 1) {
          k.x += (kdx / kdist) * k.speed * dt;
          k.y += (kdy / kdist) * k.speed * dt;
        }
      }

      // 2. Farmer walking simulation
      const farmer = farmerRef.current;
      const farmDx = farmer.targetX - farmer.currX;
      const farmDy = farmer.targetY - farmer.currY;
      const farmDist = Math.hypot(farmDx, farmDy);
      if (farmDist > 1.2) {
        farmer.isWalking = true;
        const walkSpeed = 28; // pixels per second
        farmer.currX += (farmDx / farmDist) * walkSpeed * dt;
        farmer.currY += (farmDy / farmDist) * walkSpeed * dt;
        farmer.facingRight = farmDx >= 0;

        farmer.stepTimer += dt;
        if (farmer.stepTimer > 0.22) {
          farmer.stepTimer = 0;
          soundController.playFootstep();
        }
      } else {
        farmer.isWalking = false;
        farmer.currX = farmer.targetX;
        farmer.currY = farmer.targetY;
      }

      // 3. Sky, Stars & Celestial bodies
      drawPixelSky(ctx, INTERNAL_RES, INTERNAL_RES, atmo, nowSec);
      weatherSysRef.current.renderSkyClouds(ctx, atmo, curWeather);

      // 4. Isometric Diorama Terrain & Extruded Cliffs
      const tiles = mapRef.current;
      const planted = plantingRef.current.getEntities();
      const hov = hoveredTileRef.current;

      for (let sum = 0; sum <= (GRID_SIZE - 1) * 2; sum++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const gy = sum - gx;
          if (gy < 0 || gy >= GRID_SIZE) continue;

          const tile = tiles[gx][gy];
          const pos = gridToScreen(gx, gy, tile.elevation);
          const isFrontEdge = gx === GRID_SIZE - 1 || gy === GRID_SIZE - 1;
          const baseIslandY = isFrontEdge
            ? gridToScreen(gx, gy, 0).y + 18
            : gridToScreen(gx, gy, 0).y + 9;

          const isHov =
            hov !== null &&
            hov.gx === gx &&
            hov.gy === gy &&
            plantingRef.current.canPlantOnTile(tile);

          drawIsometricTile(ctx, tile, pos.x, pos.y, baseIslandY, atmo, nowSec, isHov);
        }
      }

      // 5. Pond surface ripples & swimming wildlife (koi fish & swimming duck)
      for (const k of koiRef.current) {
        drawSwimmingFish(ctx, k.x, k.y, k.targetX >= k.x, nowSec, k.isCalico);
      }
      weatherSysRef.current.renderPondRipples(ctx);
      drawCozyDuck(ctx, duck.x, duck.y, duck.facingRight, nowSec, 0);

      // 6. Depth-sorted Props, Structures, Porch Cat, Planted Flora & Farmer
      const catPos = gridToScreen(4, 6, 1);
      const catX = catPos.x + 3;
      const catY = catPos.y + 4;
      const isCatPurring = nowSec < catRef.current.purrUntil;

      for (let sum = 0; sum <= (GRID_SIZE - 1) * 2; sum++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const gy = sum - gx;
          if (gy < 0 || gy >= GRID_SIZE) continue;

          const tile = tiles[gx][gy];
          const pos = gridToScreen(gx, gy, tile.elevation);

          // Built-in prop
          const houseInfo = drawTileProp(ctx, tile, pos.x, pos.y, atmo, nowSec);
          if (houseInfo) {
            chimneyPosRef.current = { x: houseInfo.chimneyX, y: houseInfo.chimneyY };
          }

          // Porch cat sleeping beside front door on (4, 6)
          if (gx === 4 && gy === 6) {
            drawCozyCat(ctx, catX, catY, atmo, nowSec, isCatPurring);
          }

          // Visitor-planted flora
          for (let i = 0; i < planted.length; i++) {
            const ent = planted[i];
            if (ent.gx === gx && ent.gy === gy) {
              drawPlantedEntity(ctx, ent, pos.x, pos.y, atmo, nowSec);
            }
          }
        }
      }

      // 7. Tiny Farmer Character
      drawTinyFarmer(
        ctx,
        Math.round(farmer.currX),
        Math.round(farmer.currY),
        atmo,
        nowSec,
        farmer.isWalking,
        farmer.facingRight
      );

      // 8. Chimney Smoke
      weatherSysRef.current.renderSmoke(ctx, atmo);

      // 9. Floating Particle Effects (Sparkles & Hearts)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.age += dt;
        p.y += p.vy * dt;
        const alpha = Math.max(0, 1 - p.age / p.maxAge);
        if (p.kind === 'heart') {
          drawHeartParticle(ctx, Math.round(p.x), Math.round(p.y), alpha);
        } else {
          ctx.fillStyle = `rgba(255, 238, 140, ${alpha.toFixed(2)})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        }
        if (p.age >= p.maxAge) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 10. Global Time-of-Day Color Grading Wash
      if (atmo.tintAlpha > 0.01) {
        ctx.fillStyle = rgbCss(atmo.tintColor, atmo.tintAlpha);
        ctx.fillRect(0, 0, INTERNAL_RES, INTERNAL_RES);
      }

      // 11. Emissive Window & Lantern Glows re-punched through night shadows
      if (atmo.windowGlow > 0.35) {
        const fhPos = gridToScreen(3, 5, tiles[3][5].elevation);
        const cx = fhPos.x;
        const cy = fhPos.y + 9;
        const glowA = (atmo.windowGlow - 0.25) * 0.65;
        ctx.fillStyle = `rgba(255, 224, 130, ${glowA.toFixed(2)})`;
        ctx.fillRect(cx - 9, cy - 11, 2, 4);
        ctx.fillRect(cx - 6, cy - 11, 1, 4);
        ctx.fillRect(cx + 9, cy - 11, 3, 3);
        ctx.fillRect(cx - 1, cy - 21, 2, 2);
      }

      // 12. Wildlife (Butterflies in day, Fireflies in night)
      weatherSysRef.current.renderAmbientCreatures(ctx, curTime, curWeather);

      // 13. Weather Precipitation & Fog Bands
      weatherSysRef.current.renderWeatherOverlay(ctx, curWeather, atmo);

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  const spawnParticle = (x: number, y: number, kind: 'sparkle' | 'heart') => {
    particlesRef.current.push({
      x,
      y,
      vy: -12 - Math.random() * 8,
      age: 0,
      maxAge: 0.8 + Math.random() * 0.4,
      kind,
    });
  };

  const setFarmerThought = (text: string, duration = 3) => {
    farmerRef.current.thought = text;
    farmerRef.current.thoughtUntil = performance.now() / 1000 + duration;
    setVisibleThought({
      text,
      x: Math.round(farmerRef.current.currX),
      y: Math.round(farmerRef.current.currY),
    });
    if (thoughtTimerRef.current) window.clearTimeout(thoughtTimerRef.current);
    thoughtTimerRef.current = window.setTimeout(() => {
      setVisibleThought(null);
    }, duration * 1000);
    onSelectAction?.(text);
  };

  const getCanvasPixel = (clientX: number, clientY: number): { px: number; py: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const px = Math.floor(((clientX - rect.left) / rect.width) * INTERNAL_RES);
    const py = Math.floor(((clientY - rect.top) / rect.height) * INTERNAL_RES);
    return { px, py };
  };

  const syncCounts = () => {
    onCountsChange(plantingRef.current.getCounts());
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPixel(e.clientX, e.clientY);
    if (!pt) {
      hoveredTileRef.current = null;
      return;
    }
    const tile = screenToGrid(pt.px, pt.py, mapRef.current);
    hoveredTileRef.current = tile ? { gx: tile.gx, gy: tile.gy } : null;

    const nowSec = performance.now() / 1000;

    if (isPointerDownRef.current) {
      if (nowSec - lastDragTimeRef.current > 0.085) {
        lastDragTimeRef.current = nowSec;
        if (plantingRef.current.handleDragTrail(tile, nowSec)) {
          soundController.playSoftRustle();
          syncCounts();
        }
      }
    } else {
      // Gently sprout wildflowers when moving cursor across grass
      if (plantingRef.current.handleHoverGrass(tile, nowSec)) {
        syncCounts();
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isPointerDownRef.current = true;
    const pt = getCanvasPixel(e.clientX, e.clientY);
    if (!pt) return;

    const nowSec = performance.now() / 1000;

    // 1. Check Duck Click
    const duck = duckRef.current;
    if (Math.hypot(pt.px - duck.x, pt.py - duck.y) < 10) {
      duck.speed = 22;
      duck.nextPick = 0.1;
      weatherSysRef.current.addPondRipple(duck.x, duck.y);
      soundController.playQuack();
      spawnParticle(duck.x, duck.y - 4, 'sparkle');
      setFarmerThought('Quack! 🦆');
      return;
    }

    // 2. Check Cat Click (porch)
    const catPos = gridToScreen(4, 6, 1);
    const catX = catPos.x + 3;
    const catY = catPos.y + 4;
    if (Math.hypot(pt.px - catX, pt.py - catY) < 10) {
      catRef.current.purrUntil = nowSec + 3;
      soundController.playPurr();
      spawnParticle(catX, catY - 4, 'heart');
      spawnParticle(catX + 4, catY - 7, 'heart');
      setFarmerThought('Good kitty ♥');
      return;
    }

    const tile = screenToGrid(pt.px, pt.py, mapRef.current);

    // 3. Water Pond interaction
    if (tile && (tile.terrain === 'water' || tile.terrain === 'cliff_water')) {
      const wPos = gridToScreen(tile.gx, tile.gy, tile.elevation);
      weatherSysRef.current.addPondRipple(wPos.x, wPos.y + 5);
      soundController.playWaterSplash();
      spawnParticle(wPos.x, wPos.y, 'sparkle');
      if (tile.terrain === 'cliff_water') {
        setFarmerThought('Crystal falls~');
      }
      return;
    }

    // 4. Farmhouse Hearth Interaction (gx=3..4, gy=5..6)
    if (tile && (tile.gx === 3 || tile.gx === 4) && (tile.gy === 5 || tile.gy === 6)) {
      soundController.playHearthSpark();
      weatherSysRef.current.spawnSmoke(chimneyPosRef.current.x, chimneyPosRef.current.y);
      spawnParticle(chimneyPosRef.current.x, chimneyPosRef.current.y, 'sparkle');
      setFarmerThought('Warm hearth 🔥');
      return;
    }

    // 5. Water Well Interaction (gx=4, gy=7)
    if (tile && tile.prop === 'well') {
      soundController.playWaterSplash();
      const pos = gridToScreen(tile.gx, tile.gy, tile.elevation);
      spawnParticle(pos.x, pos.y - 4, 'sparkle');
      setFarmerThought('Fresh well water 💧');
      return;
    }

    // 6. Vegetable Crops (Carrots, Pumpkin, Wheat)
    if (
      tile &&
      (tile.prop === 'carrot_crop' ||
        tile.prop === 'pumpkin_crop' ||
        tile.prop === 'wheat_crop')
    ) {
      tile.bounceTime = nowSec;
      soundController.playHarvest();
      const pos = gridToScreen(tile.gx, tile.gy, tile.elevation);
      spawnParticle(pos.x, pos.y - 4, 'sparkle');
      const cropName =
        tile.prop === 'carrot_crop'
          ? 'Sweet carrots!'
          : tile.prop === 'pumpkin_crop'
          ? 'Plump pumpkins!'
          : 'Golden wheat!';
      setFarmerThought(cropName);
      return;
    }

    // 7. Planting or moving farmer
    const result = plantingRef.current.handleSingleClick(tile, nowSec);
    if (result === 'planted_flower') {
      soundController.playPlantFlower();
      syncCounts();
      if (tile) {
        const pos = gridToScreen(tile.gx, tile.gy, tile.elevation);
        spawnParticle(pos.x, pos.y - 4, 'sparkle');
        setFarmerThought('A blossom! 🌸');
      }
    } else if (result === 'bounced') {
      soundController.playBounce();
    } else if (tile && !tile.occupiedByStructure) {
      // Guide farmer to walk to the clicked tile on path or lawn!
      const targetScreen = gridToScreen(tile.gx, tile.gy, tile.elevation);
      farmerRef.current.targetX = targetScreen.x;
      farmerRef.current.targetY = targetScreen.y + 4;
      setFarmerThought('Exploring~');
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handlePointerLeave = () => {
    isPointerDownRef.current = false;
    hoveredTileRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPixel(e.clientX, e.clientY);
    if (!pt) return;
    const tile = screenToGrid(pt.px, pt.py, mapRef.current);
    const nowSec = performance.now() / 1000;
    if (plantingRef.current.handleDoubleClick(tile, nowSec)) {
      soundController.playPlantTree();
      syncCounts();
      if (tile) {
        const pos = gridToScreen(tile.gx, tile.gy, tile.elevation);
        spawnParticle(pos.x, pos.y - 8, 'sparkle');
        spawnParticle(pos.x + 4, pos.y - 12, 'sparkle');
        setFarmerThought('Growing tall! 🌲');
      }
    }
  };

  return (
    <div className="farm-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={INTERNAL_RES}
        height={INTERNAL_RES}
        className="farm-pixel-canvas"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        aria-label="GROW interactive isometric pixel-art farm"
      />
      <AnimatePresence>
        {visibleThought && (
          <motion.div
            className="farmer-smooth-bubble"
            style={{
              left: `${(visibleThought.x / INTERNAL_RES) * 100}%`,
              top: `${((visibleThought.y - 14) / INTERNAL_RES) * 100}%`,
            }}
            initial={{ opacity: 0, y: 5, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.92 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="bubble-text">{visibleThought.text}</span>
            <span className="bubble-tail" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
