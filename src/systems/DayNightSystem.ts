import { TimeOfDay, WeatherType } from '../types/farm';

export interface AtmosphereVisualState {
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyBottom: [number, number, number];
  tintColor: [number, number, number];
  tintAlpha: number;
  shadowAlpha: number;
  shadowStretchX: number; // -4..4 pixel shadow shift
  windowGlow: number; // 0..1
  starAlpha: number; // 0..1
  sunMoonY: number; // pixel Y in sky
  isMoon: boolean;
  wetness: number; // 0..1
  snowCover: number; // 0..1
  fogDensity: number; // 0..1
}

interface TimePresetConfig {
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyBottom: [number, number, number];
  tintColor: [number, number, number];
  tintAlpha: number;
  shadowAlpha: number;
  shadowStretchX: number;
  windowGlow: number;
  starAlpha: number;
  sunMoonY: number;
  isMoon: boolean;
}

const TIME_PRESETS: Record<TimeOfDay, TimePresetConfig> = {
  sunrise: {
    skyTop: [122, 146, 189],
    skyMid: [228, 168, 146],
    skyBottom: [249, 211, 162],
    tintColor: [255, 194, 138],
    tintAlpha: 0.16,
    shadowAlpha: 0.24,
    shadowStretchX: -3,
    windowGlow: 0.45,
    starAlpha: 0.15,
    sunMoonY: 42,
    isMoon: false,
  },
  day: {
    skyTop: [118, 178, 219],
    skyMid: [164, 210, 236],
    skyBottom: [215, 236, 238],
    tintColor: [255, 250, 225],
    tintAlpha: 0.03,
    shadowAlpha: 0.22,
    shadowStretchX: 1,
    windowGlow: 0.0,
    starAlpha: 0.0,
    sunMoonY: 22,
    isMoon: false,
  },
  sunset: {
    skyTop: [79, 75, 128],
    skyMid: [198, 108, 98],
    skyBottom: [244, 174, 108],
    tintColor: [238, 128, 68],
    tintAlpha: 0.22,
    shadowAlpha: 0.30,
    shadowStretchX: 4,
    windowGlow: 0.85,
    starAlpha: 0.28,
    sunMoonY: 45,
    isMoon: false,
  },
  night: {
    skyTop: [16, 24, 48],
    skyMid: [28, 42, 74],
    skyBottom: [46, 65, 98],
    tintColor: [18, 32, 68],
    tintAlpha: 0.46,
    shadowAlpha: 0.34,
    shadowStretchX: 2,
    windowGlow: 1.0,
    starAlpha: 1.0,
    sunMoonY: 24,
    isMoon: true,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

export class DayNightSystem {
  private current: AtmosphereVisualState;

  constructor(initialTime: TimeOfDay = 'day', initialWeather: WeatherType = 'clear') {
    const base = TIME_PRESETS[initialTime];
    this.current = {
      ...base,
      skyTop: [...base.skyTop],
      skyMid: [...base.skyMid],
      skyBottom: [...base.skyBottom],
      tintColor: [...base.tintColor],
      wetness: initialWeather === 'rain' ? 1 : 0,
      snowCover: initialWeather === 'snow' ? 1 : 0,
      fogDensity: initialWeather === 'fog' ? 1 : 0,
    };
  }

  public update(dt: number, targetTime: TimeOfDay, targetWeather: WeatherType): AtmosphereVisualState {
    const speed = Math.min(1, dt * 2.4);
    const preset = TIME_PRESETS[targetTime];

    // Modify target sky & tint based on weather so weather transforms the whole world
    let skyTop = [...preset.skyTop] as [number, number, number];
    let skyMid = [...preset.skyMid] as [number, number, number];
    let skyBottom = [...preset.skyBottom] as [number, number, number];
    let tintColor = [...preset.tintColor] as [number, number, number];
    let tintAlpha = preset.tintAlpha;
    let windowGlow = preset.windowGlow;
    let starAlpha = preset.starAlpha;

    if (targetWeather === 'rain') {
      const stormSky: [number, number, number] =
        targetTime === 'night' ? [14, 20, 34] : [82, 98, 114];
      skyTop = lerpRgb(skyTop, stormSky, 0.68);
      skyMid = lerpRgb(skyMid, [104, 119, 134], targetTime === 'night' ? 0.35 : 0.65);
      skyBottom = lerpRgb(skyBottom, [128, 142, 152], targetTime === 'night' ? 0.35 : 0.62);
      tintColor = lerpRgb(tintColor, [38, 56, 78], 0.55);
      tintAlpha = Math.min(0.54, tintAlpha + 0.14);
      windowGlow = Math.max(windowGlow, 0.72);
      starAlpha *= 0.1;
    } else if (targetWeather === 'fog') {
      const fogColor: [number, number, number] =
        targetTime === 'night' ? [48, 60, 78] : [188, 198, 198];
      skyTop = lerpRgb(skyTop, fogColor, 0.72);
      skyMid = lerpRgb(skyMid, fogColor, 0.78);
      skyBottom = lerpRgb(skyBottom, fogColor, 0.85);
      tintColor = lerpRgb(tintColor, [165, 182, 186], 0.5);
      tintAlpha = Math.min(0.45, tintAlpha + 0.1);
      windowGlow = Math.max(windowGlow, 0.45);
      starAlpha *= 0.15;
    } else if (targetWeather === 'snow') {
      const snowSky: [number, number, number] =
        targetTime === 'night' ? [28, 38, 62] : [172, 192, 212];
      skyTop = lerpRgb(skyTop, snowSky, 0.55);
      skyMid = lerpRgb(skyMid, [202, 216, 228], targetTime === 'night' ? 0.25 : 0.58);
      skyBottom = lerpRgb(skyBottom, [226, 235, 242], targetTime === 'night' ? 0.25 : 0.6);
      tintColor = lerpRgb(tintColor, [175, 208, 238], 0.45);
      tintAlpha = Math.min(0.48, tintAlpha + 0.08);
      windowGlow = Math.max(windowGlow, 0.65);
      starAlpha *= 0.45;
    }

    this.current.skyTop = lerpRgb(this.current.skyTop, skyTop, speed);
    this.current.skyMid = lerpRgb(this.current.skyMid, skyMid, speed);
    this.current.skyBottom = lerpRgb(this.current.skyBottom, skyBottom, speed);
    this.current.tintColor = lerpRgb(this.current.tintColor, tintColor, speed);
    this.current.tintAlpha = lerp(this.current.tintAlpha, tintAlpha, speed);
    this.current.shadowAlpha = lerp(this.current.shadowAlpha, preset.shadowAlpha, speed);
    this.current.shadowStretchX = lerp(this.current.shadowStretchX, preset.shadowStretchX, speed);
    this.current.windowGlow = lerp(this.current.windowGlow, windowGlow, speed);
    this.current.starAlpha = lerp(this.current.starAlpha, starAlpha, speed);
    this.current.sunMoonY = lerp(this.current.sunMoonY, preset.sunMoonY, speed);
    this.current.isMoon = preset.isMoon;

    const targetWet = targetWeather === 'rain' ? 1 : 0;
    const targetSnow = targetWeather === 'snow' ? 1 : 0;
    const targetFog = targetWeather === 'fog' ? 1 : 0;

    this.current.wetness = lerp(this.current.wetness, targetWet, dt * 1.6);
    this.current.snowCover = lerp(this.current.snowCover, targetSnow, dt * 1.2);
    this.current.fogDensity = lerp(this.current.fogDensity, targetFog, dt * 1.5);

    return this.current;
  }

  public getState(): AtmosphereVisualState {
    return this.current;
  }
}

export function rgbCss(rgb: [number, number, number], alpha = 1): string {
  if (alpha >= 0.999) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`;
}
