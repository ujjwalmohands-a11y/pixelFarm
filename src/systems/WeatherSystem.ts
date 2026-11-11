import {
  Butterfly,
  ButterflySpecies,
  CloudEntity,
  Firefly,
  PondRipple,
  SmokePuff,
  TimeOfDay,
  WeatherParticle,
  WeatherType,
} from '../types/farm';
import { AtmosphereVisualState } from './DayNightSystem';
import { drawDetailedButterfly } from './PixelSprites';

export class WeatherSystem {
  private particles: WeatherParticle[] = [];
  private clouds: CloudEntity[] = [];
  private ripples: PondRipple[] = [];
  private butterflies: Butterfly[] = [];
  private fireflies: Firefly[] = [];
  private smoke: SmokePuff[] = [];
  private fogOffset = 0;

  constructor(private width: number, private height: number) {
    this.initClouds();
    this.initButterflies();
    this.initFireflies();
  }

  private initClouds() {
    this.clouds = [
      {
        x: 24,
        y: 18,
        speed: 2.2,
        puffs: [
          { dx: 0, dy: 4, w: 26, h: 6 },
          { dx: 5, dy: 1, w: 16, h: 6 },
          { dx: 11, dy: -2, w: 10, h: 5 },
        ],
      },
      {
        x: 135,
        y: 30,
        speed: 1.6,
        puffs: [
          { dx: 0, dy: 3, w: 22, h: 5 },
          { dx: 4, dy: 0, w: 13, h: 5 },
        ],
      },
      {
        x: 210,
        y: 14,
        speed: 2.6,
        puffs: [
          { dx: 0, dy: 4, w: 30, h: 6 },
          { dx: 6, dy: 1, w: 18, h: 6 },
          { dx: 14, dy: -2, w: 9, h: 5 },
        ],
      },
    ];
  }

  private initButterflies() {
    const speciesList: ButterflySpecies[] = ['monarch', 'morpho', 'swallowtail', 'rose'];
    this.butterflies = Array.from({ length: 5 }, (_, i) => ({
      x: 75 + (i * 28) % 110,
      y: 95 + ((i * 35) % 75),
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 6,
      phase: i * 1.4,
      color: '',
      species: speciesList[i % speciesList.length],
    }));
  }

  private initFireflies() {
    this.fireflies = Array.from({ length: 18 }, () => ({
      x: 45 + Math.random() * 170,
      y: 78 + Math.random() * 135,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 6,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  public spawnSmoke(x: number, y: number) {
    if (this.smoke.length < 18) {
      this.smoke.push({
        x,
        y,
        age: 0,
        maxAge: 2.6 + Math.random() * 1.1,
        driftX: 3.5 + Math.random() * 3,
      });
    }
  }

  public addPondRipple(x: number, y: number) {
    if (this.ripples.length < 16) {
      this.ripples.push({
        x,
        y,
        age: 0,
        maxAge: 0.9 + Math.random() * 0.4,
      });
    }
  }

  public update(
    dt: number,
    weather: WeatherType,
    timeOfDay: TimeOfDay,
    pondPoints: Array<{ x: number; y: number }>,
    chimneyPos: { x: number; y: number }
  ) {
    this.fogOffset = (this.fogOffset + dt * 7) % this.width;

    // Clouds move gently across the top sky
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > this.width + 20) {
        c.x = -40;
      }
    }

    // Chimney smoke puffs
    if (Math.random() < dt * 2.3) {
      this.spawnSmoke(chimneyPos.x, chimneyPos.y);
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.age += dt;
      s.x += s.driftX * dt;
      s.y -= 6.5 * dt;
      if (s.age >= s.maxAge) {
        this.smoke.splice(i, 1);
      }
    }

    // Weather precipitation particles
    if (weather === 'rain') {
      const targetCount = 95;
      while (this.particles.length < targetCount) {
        this.particles.push({
          x: Math.random() * (this.width + 40),
          y: Math.random() * -this.height,
          vx: -28,
          vy: 165 + Math.random() * 45,
          size: 3 + Math.floor(Math.random() * 3),
          alpha: 0.45 + Math.random() * 0.3,
          drift: 0,
        });
      }
      // Spawn pond ripples in rain
      if (pondPoints.length > 0 && Math.random() < dt * 12) {
        const pt = pondPoints[Math.floor(Math.random() * pondPoints.length)];
        this.addPondRipple(pt.x + (Math.random() - 0.5) * 8, pt.y + (Math.random() - 0.5) * 4);
      }
    } else if (weather === 'snow') {
      const targetCount = 75;
      while (this.particles.length < targetCount) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * -this.height,
          vx: -4 + Math.random() * 8,
          vy: 20 + Math.random() * 14,
          size: Math.random() > 0.72 ? 2 : 1,
          alpha: 0.75 + Math.random() * 0.25,
          drift: Math.random() * Math.PI * 2,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (weather === 'snow') {
        p.drift += dt * 2.2;
        p.x += (p.vx + Math.sin(p.drift) * 7) * dt;
        p.y += p.vy * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      if (p.y > this.height + 6 || p.x < -20 || p.x > this.width + 30) {
        if (weather === 'rain') {
          p.x = Math.random() * (this.width + 50);
          p.y = -8 - Math.random() * 25;
          p.vx = -28;
          p.vy = 165 + Math.random() * 45;
          p.size = 3 + Math.floor(Math.random() * 3);
        } else if (weather === 'snow') {
          p.x = Math.random() * this.width;
          p.y = -6 - Math.random() * 20;
          p.vx = -4 + Math.random() * 8;
          p.vy = 20 + Math.random() * 14;
          p.size = Math.random() > 0.72 ? 2 : 1;
        } else {
          this.particles.splice(i, 1);
        }
      }
    }

    // Pond ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += dt;
      if (this.ripples[i].age >= this.ripples[i].maxAge) {
        this.ripples.splice(i, 1);
      }
    }
    // Occasional calm fish/breeze ripple even in clear weather
    if (weather !== 'rain' && pondPoints.length > 0 && Math.random() < dt * 1.1) {
      const pt = pondPoints[Math.floor(Math.random() * pondPoints.length)];
      this.addPondRipple(pt.x, pt.y);
    }

    // Butterflies (active in day/sunrise when not raining/snowing)
    for (const b of this.butterflies) {
      b.phase += dt * 11;
      if (Math.random() < dt * 1.6) {
        b.vx += (Math.random() - 0.5) * 14;
        b.vy += (Math.random() - 0.5) * 12;
      }
      b.vx = Math.max(-14, Math.min(14, b.vx));
      b.vy = Math.max(-10, Math.min(10, b.vy));
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 55) b.vx = Math.abs(b.vx);
      if (b.x > 205) b.vx = -Math.abs(b.vx);
      if (b.y < 85) b.vy = Math.abs(b.vy);
      if (b.y > 195) b.vy = -Math.abs(b.vy);
    }

    // Fireflies (night & sunset)
    if (timeOfDay === 'night' || timeOfDay === 'sunset') {
      for (const f of this.fireflies) {
        f.phase += dt * 3.2;
        f.x += Math.cos(f.phase * 0.7) * 5 * dt + f.vx * dt * 0.4;
        f.y += Math.sin(f.phase * 0.9) * 4 * dt + f.vy * dt * 0.4;
        if (f.x < 42) f.x = 212;
        if (f.x > 214) f.x = 44;
        if (f.y < 72) f.y = 205;
        if (f.y > 208) f.y = 75;
      }
    }
  }

  public renderSkyClouds(
    ctx: CanvasRenderingContext2D,
    atmo: AtmosphereVisualState,
    weather: WeatherType
  ) {
    const alpha = weather === 'fog' ? 0.25 : weather === 'rain' ? 0.55 : 0.82;
    const isDark = atmo.starAlpha > 0.5;
    const mainCol = isDark
      ? `rgba(68, 86, 122, ${alpha * 0.65})`
      : weather === 'rain'
      ? `rgba(142, 156, 172, ${alpha})`
      : `rgba(252, 249, 240, ${alpha})`;
    const shadeCol = isDark
      ? `rgba(46, 60, 92, ${alpha * 0.65})`
      : weather === 'rain'
      ? `rgba(114, 128, 144, ${alpha})`
      : `rgba(222, 226, 232, ${alpha})`;

    for (const c of this.clouds) {
      const cx = Math.round(c.x);
      const cy = Math.round(c.y);
      for (const p of c.puffs) {
        ctx.fillStyle = shadeCol;
        ctx.fillRect(cx + p.dx, cy + p.dy + 1, p.w, p.h);
        ctx.fillStyle = mainCol;
        ctx.fillRect(cx + p.dx, cy + p.dy, p.w, p.h - 1);
      }
    }
  }

  public renderPondRipples(ctx: CanvasRenderingContext2D) {
    for (const r of this.ripples) {
      const t = r.age / r.maxAge;
      const rad = Math.floor(1 + t * 4);
      const alpha = (1 - t) * 0.65;
      ctx.fillStyle = `rgba(225, 246, 255, ${alpha.toFixed(2)})`;
      const rx = Math.round(r.x);
      const ry = Math.round(r.y);
      // Pixelated isometric ellipse ring
      ctx.fillRect(rx - rad, ry, 1, 1);
      ctx.fillRect(rx + rad, ry, 1, 1);
      ctx.fillRect(rx - Math.max(1, rad - 1), ry - 1, rad * 2 - 1, 1);
      ctx.fillRect(rx - Math.max(1, rad - 1), ry + 1, rad * 2 - 1, 1);
    }
  }

  public renderSmoke(ctx: CanvasRenderingContext2D, atmo: AtmosphereVisualState) {
    for (const s of this.smoke) {
      const t = s.age / s.maxAge;
      const alpha = (1 - t) * (atmo.starAlpha > 0.5 ? 0.35 : 0.55);
      const size = t > 0.5 ? 3 : 2;
      ctx.fillStyle = `rgba(242, 238, 232, ${alpha.toFixed(2)})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), size, size);
    }
  }

  public renderAmbientCreatures(
    ctx: CanvasRenderingContext2D,
    timeOfDay: TimeOfDay,
    weather: WeatherType
  ) {
    // Butterflies during clear/fog daytime & sunrise (detailed multi-pixel wings)
    if ((timeOfDay === 'day' || timeOfDay === 'sunrise') && weather !== 'rain' && weather !== 'snow') {
      for (const b of this.butterflies) {
        drawDetailedButterfly(ctx, b.x, b.y, b.species, b.phase);
      }
    }

    // Fireflies during night and sunset (when not snowing heavily)
    if ((timeOfDay === 'night' || timeOfDay === 'sunset') && weather !== 'snow') {
      const mult = timeOfDay === 'night' ? 1 : 0.45;
      for (const f of this.fireflies) {
        const pulse = (Math.sin(f.phase) + 1) * 0.5;
        if (pulse < 0.2) continue;
        const fx = Math.round(f.x);
        const fy = Math.round(f.y);
        const glowAlpha = pulse * 0.35 * mult;
        ctx.fillStyle = `rgba(255, 232, 120, ${glowAlpha.toFixed(2)})`;
        ctx.fillRect(fx - 1, fy - 1, 3, 3);
        ctx.fillStyle = `rgba(255, 250, 175, ${(pulse * 0.95 * mult).toFixed(2)})`;
        ctx.fillRect(fx, fy, 1, 1);
      }
    }
  }

  public renderWeatherOverlay(
    ctx: CanvasRenderingContext2D,
    weather: WeatherType,
    atmo: AtmosphereVisualState
  ) {
    // Precipitation particles
    if (weather === 'rain' || (this.particles.length > 0 && atmo.wetness > 0.1)) {
      for (const p of this.particles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        ctx.fillStyle = `rgba(186, 216, 242, ${p.alpha.toFixed(2)})`;
        // Diagonal crisp 1px pixel-art rain streak
        for (let s = 0; s < p.size; s++) {
          ctx.fillRect(px - Math.floor(s * 0.25), py + s, 1, 1);
        }
      }
    } else if (weather === 'snow' || (this.particles.length > 0 && atmo.snowCover > 0.1)) {
      for (const p of this.particles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        ctx.fillStyle = `rgba(250, 253, 255, ${p.alpha.toFixed(2)})`;
        ctx.fillRect(px, py, p.size, p.size);
      }
    }

    // Drifting pixel-art fog bands with dithered edges
    if (atmo.fogDensity > 0.02) {
      const d = atmo.fogDensity;
      const isNight = atmo.starAlpha > 0.5;
      const baseRgb = isNight ? '66, 82, 108' : '222, 230, 228';

      // Atmospheric haze wash
      ctx.fillStyle = `rgba(${baseRgb}, ${(d * 0.24).toFixed(3)})`;
      ctx.fillRect(0, 35, this.width, this.height - 35);

      // Banded drifting pixel mist layers
      const bands = [
        { y: 68, h: 18, speed: 1.0, alpha: 0.22 },
        { y: 108, h: 22, speed: -0.7, alpha: 0.20 },
        { y: 152, h: 26, speed: 1.2, alpha: 0.24 },
        { y: 196, h: 24, speed: -0.9, alpha: 0.22 },
      ];

      for (const b of bands) {
        const shift = Math.round(this.fogOffset * b.speed);
        for (let k = -1; k <= 1; k++) {
          const bx = ((shift + k * 140) % (this.width + 80)) - 40;
          ctx.fillStyle = `rgba(${baseRgb}, ${(d * b.alpha).toFixed(3)})`;
          ctx.fillRect(Math.round(bx), b.y, 96, b.h);
          ctx.fillRect(Math.round(bx) + 12, b.y - 3, 72, 3);
          ctx.fillRect(Math.round(bx) + 16, b.y + b.h, 64, 3);
        }
      }
    }
  }
}
