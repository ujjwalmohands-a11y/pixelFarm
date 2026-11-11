import { TimeOfDay, WeatherType } from '../types/farm';

export class SoundController {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private nightGain: GainNode | null = null;
  private birdTimer: number | null = null;
  private cricketTimer: number | null = null;
  private musicTimer: number | null = null;
  private currentTimeOfDay: TimeOfDay = 'day';
  private currentWeather: WeatherType = 'clear';

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    if (!this.ctx) {
      this.initAudio();
    }
    this.enabled = !this.enabled;
    if (this.ctx && this.ctx.state === 'suspended' && this.enabled) {
      this.ctx.resume();
    }
    this.updateMix();
    this.playUiClick(this.enabled ? 660 : 440);
    return this.enabled;
  }

  private initAudio() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Create pink/white noise buffer for rain and gentle breeze
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    // Rain channel (bandpass filtered pink noise)
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1100;
    rainFilter.Q.value = 0.7;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSource.start();

    // Gentle wind / waterfall murmur channel (lowpass filtered noise)
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 340;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.18;
    windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSource.start();

    // Soft nighttime warm pad drone
    const nightOsc = this.ctx.createOscillator();
    nightOsc.type = 'sine';
    nightOsc.frequency.value = 196; // G3
    const nightOsc2 = this.ctx.createOscillator();
    nightOsc2.type = 'sine';
    nightOsc2.frequency.value = 293.66; // D4
    this.nightGain = this.ctx.createGain();
    this.nightGain.gain.value = 0;
    nightOsc.connect(this.nightGain);
    nightOsc2.connect(this.nightGain);
    this.nightGain.connect(this.masterGain);
    nightOsc.start();
    nightOsc2.start();

    this.scheduleNatureLoops();
  }

  private scheduleNatureLoops() {
    if (this.birdTimer) window.clearInterval(this.birdTimer);
    if (this.cricketTimer) window.clearInterval(this.cricketTimer);
    if (this.musicTimer) window.clearInterval(this.musicTimer);

    this.musicTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx || !this.masterGain) return;
      if (Math.random() < 0.45) {
        this.playAmbientArpeggio();
      }
    }, 5500);

    this.birdTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx) return;
      const isDayish = this.currentTimeOfDay === 'day' || this.currentTimeOfDay === 'sunrise';
      if (isDayish && this.currentWeather !== 'rain' && Math.random() < 0.55) {
        this.playBirdChirp();
      }
    }, 2900);

    this.cricketTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx) return;
      const isNightish = this.currentTimeOfDay === 'night' || this.currentTimeOfDay === 'sunset';
      if (isNightish && this.currentWeather !== 'snow' && Math.random() < 0.7) {
        this.playCricketTrill();
      }
    }, 2400);
  }

  public setEnvironment(time: TimeOfDay, weather: WeatherType) {
    this.currentTimeOfDay = time;
    this.currentWeather = weather;
    this.updateMix();
  }

  private updateMix() {
    if (!this.ctx || !this.masterGain || !this.rainGain || !this.windGain || !this.nightGain) return;
    const now = this.ctx.currentTime;

    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.55 : 0, now, 0.25);

    const rainLevel = this.currentWeather === 'rain' ? 0.65 : 0;
    this.rainGain.gain.setTargetAtTime(rainLevel, now, 0.6);

    const windLevel =
      this.currentWeather === 'fog' || this.currentWeather === 'snow' ? 0.28 : 0.14;
    this.windGain.gain.setTargetAtTime(windLevel, now, 0.6);

    const nightLevel = this.currentTimeOfDay === 'night' ? 0.028 : 0.004;
    this.nightGain.gain.setTargetAtTime(nightLevel, now, 0.8);
  }

  private playBirdChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [1760, 2093, 2349, 2637];
    const base = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.24, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(base * 0.95, now + 0.14);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Optional second double-chirp
    if (Math.random() > 0.4) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(base * 1.12, now + 0.2);
      osc2.frequency.exponentialRampToValueAtTime(base * 1.35, now + 0.28);
      gain2.gain.setValueAtTime(0.0001, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0.028, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.36);
    }
  }

  private playCricketTrill() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3950, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.012, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.045);
    }
  }

  public playPlantFlower() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const freq = scale[Math.floor(Math.random() * scale.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playPlantTree() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.065, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playSoftRustle() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660 + Math.random() * 260, now);
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.linearRampToValueAtTime(0.018, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBounce() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(690, now + 0.09);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playUiClick(freq = 540) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playQuack() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPurr() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);

    mod.type = 'square';
    mod.frequency.setValueAtTime(26, now);
    modGain.gain.setValueAtTime(30, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.masterGain);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.58);
    osc.stop(now + 0.58);
  }

  public playWaterSplash() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [480, 720, 960].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.05);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.04, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  public playFootstep() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playHearthSpark() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playHarvest() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playAmbientArpeggio() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Peaceful Pentatonic scale notes (G major / C major)
    const scale = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0];
    const rootIdx = Math.floor(Math.random() * 4);
    const melody = [scale[rootIdx], scale[rootIdx + 2], scale[rootIdx + 1]];

    melody.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.28;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0005, t);
      gain.gain.linearRampToValueAtTime(0.038, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }

  public dispose() {
    if (this.birdTimer) window.clearInterval(this.birdTimer);
    if (this.cricketTimer) window.clearInterval(this.cricketTimer);
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundController = new SoundController();
