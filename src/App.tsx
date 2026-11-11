import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Flower2, RotateCcw, TreePine } from 'lucide-react';
import { TimeOfDay, WeatherType } from './types/farm';
import { PlantCounts } from './systems/PlantingSystem';
import { soundController } from './systems/SoundController';
import { FarmCanvas } from './components/FarmCanvas';
import { AtmosphereControls } from './components/AtmosphereControls';
import { SettingsPanel } from './components/SettingsPanel';
import { CarbonAlmanac } from './components/CarbonAlmanac';

const TIME_ORDER: TimeOfDay[] = ['sunrise', 'day', 'sunset', 'night'];
const WEATHER_ORDER: WeatherType[] = ['clear', 'rain', 'fog', 'snow'];

export const App: React.FC = () => {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [autoTime, setAutoTime] = useState<boolean>(false);
  const [autoWeather, setAutoWeather] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [almanacOpen, setAlmanacOpen] = useState<boolean>(false);
  const [immersive, setImmersive] = useState<boolean>(false);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [counts, setCounts] = useState<PlantCounts>({ flowers: 0, trees: 0 });

  // Sync procedural audio ambience whenever time or weather changes
  useEffect(() => {
    soundController.setEnvironment(timeOfDay, weather);
  }, [timeOfDay, weather]);

  // Automatic Day / Night cycle
  useEffect(() => {
    if (!autoTime) return;
    const timer = window.setInterval(() => {
      setTimeOfDay((prev) => {
        const idx = TIME_ORDER.indexOf(prev);
        return TIME_ORDER[(idx + 1) % TIME_ORDER.length];
      });
    }, 9000);
    return () => window.clearInterval(timer);
  }, [autoTime]);

  // Automatic Weather cycle
  useEffect(() => {
    if (!autoWeather) return;
    const timer = window.setInterval(() => {
      setWeather((prev) => {
        const idx = WEATHER_ORDER.indexOf(prev);
        return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
      });
    }, 11500);
    return () => window.clearInterval(timer);
  }, [autoWeather]);

  // Keyboard shortcuts (Escape exits settings or immersive mode, M toggles sound, T/W cycle atmosphere)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (almanacOpen) {
          setAlmanacOpen(false);
        } else if (immersive) {
          setImmersive(false);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        const next = soundController.toggle();
        setSoundEnabled(next);
      } else if (e.key === 'a' || e.key === 'A') {
        setAlmanacOpen((prev) => !prev);
        soundController.playUiClick(500);
      } else if (e.key === 't' || e.key === 'T') {
        setAutoTime(false);
        setTimeOfDay((prev) => TIME_ORDER[(TIME_ORDER.indexOf(prev) + 1) % TIME_ORDER.length]);
        soundController.playUiClick(580);
      } else if (e.key === 'w' || e.key === 'W') {
        setAutoWeather(false);
        setWeather((prev) => WEATHER_ORDER[(WEATHER_ORDER.indexOf(prev) + 1) % WEATHER_ORDER.length]);
        soundController.playUiClick(520);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, immersive]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      soundController.dispose();
    };
  }, []);

  const handleToggleSound = useCallback(() => {
    const enabled = soundController.toggle();
    setSoundEnabled(enabled);
  }, []);

  const handleCycleTime = useCallback(() => {
    setAutoTime(false);
    setTimeOfDay((prev) => TIME_ORDER[(TIME_ORDER.indexOf(prev) + 1) % TIME_ORDER.length]);
    soundController.playUiClick(580);
  }, []);

  const handleCycleWeather = useCallback(() => {
    setAutoWeather(false);
    setWeather((prev) => WEATHER_ORDER[(WEATHER_ORDER.indexOf(prev) + 1) % WEATHER_ORDER.length]);
    soundController.playUiClick(520);
  }, []);

  const handleSelectTime = useCallback((t: TimeOfDay) => {
    setAutoTime(false);
    setTimeOfDay(t);
    soundController.playUiClick(600);
  }, []);

  const handleSelectWeather = useCallback((w: WeatherType) => {
    setAutoWeather(false);
    setWeather(w);
    soundController.playUiClick(540);
  }, []);

  const handleToggleAutoTime = useCallback(() => {
    setAutoTime((prev) => !prev);
    soundController.playUiClick(620);
  }, []);

  const handleToggleAutoWeather = useCallback(() => {
    setAutoWeather((prev) => !prev);
    soundController.playUiClick(620);
  }, []);

  const handleResetFarm = useCallback(() => {
    setResetSignal((n) => n + 1);
  }, []);

  const handleCountsChange = useCallback((next: PlantCounts) => {
    setCounts(next);
  }, []);

  return (
    <div className={`grow-page ${immersive ? 'is-immersive' : ''}`}>
      {/* Top-left editorial wordmark */}
      <AnimatePresence>
        {!immersive && (
          <motion.header
            className="grow-header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="grow-wordmark">GROW.</h1>
            <p className="grow-subtitle">A little world that grows with you.</p>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Centered 1:1 square miniature world */}
      <main className="grow-stage">
        <div className="farm-viewport">
          <FarmCanvas
            timeOfDay={timeOfDay}
            weather={weather}
            resetSignal={resetSignal}
            onCountsChange={handleCountsChange}
          />

          {/* Live planted flora badge + subtle inline reset shortcut when plants exist */}
          <div
            className="garden-hud-top"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="plant-counter" aria-live="polite" title="Planted flora in your garden">
              <span className="counter-item">
                <Flower2 size={12} strokeWidth={2} />
                <span>{counts.flowers}</span>
              </span>
              <span className="counter-sep" />
              <span className="counter-item">
                <TreePine size={12} strokeWidth={2} />
                <span>{counts.trees}</span>
              </span>
              <span className="counter-sep" />
              <button
                type="button"
                className="hud-carbon-pill"
                onClick={() => {
                  setAlmanacOpen(true);
                  soundController.playUiClick(560);
                }}
                title="View Carbon Valley Almanac"
                aria-label="View Carbon Valley Almanac"
              >
                <BookOpen size={11} strokeWidth={2} />
                <span>{(counts.trees * 14.2 + counts.flowers * 1.8).toFixed(1)}g CO₂</span>
              </button>
              {(counts.flowers > 0 || counts.trees > 0) && (
                <button
                  type="button"
                  className="hud-reset-mini"
                  onClick={handleResetFarm}
                  title="Reset garden"
                  aria-label="Reset planted flowers and trees"
                >
                  <RotateCcw size={11} strokeWidth={2} />
                </button>
              )}
            </div>

            {(autoTime || autoWeather) && (
              <div className="cycle-indicator">
                <span className="cycle-dot" />
                <span>Auto world</span>
              </div>
            )}
          </div>

          {/* Floating Atmosphere Settings Panel */}
          <SettingsPanel
            open={settingsOpen}
            onClose={() => {
              setSettingsOpen(false);
              soundController.playUiClick(460);
            }}
            timeOfDay={timeOfDay}
            onSelectTime={handleSelectTime}
            weather={weather}
            onSelectWeather={handleSelectWeather}
            autoTime={autoTime}
            onToggleAutoTime={handleToggleAutoTime}
            autoWeather={autoWeather}
            onToggleAutoWeather={handleToggleAutoWeather}
          />

          {/* Gemini Carbon Almanac & Field Journal */}
          <CarbonAlmanac
            open={almanacOpen}
            onClose={() => {
              setAlmanacOpen(false);
              soundController.playUiClick(460);
            }}
            timeOfDay={timeOfDay}
            weather={weather}
            counts={counts}
          />

          {/* Floating Atmosphere Controls near bottom center */}
          <AtmosphereControls
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            timeOfDay={timeOfDay}
            onCycleTime={handleCycleTime}
            weather={weather}
            onCycleWeather={handleCycleWeather}
            settingsOpen={settingsOpen}
            onToggleSettings={() => {
              setSettingsOpen((prev) => !prev);
              soundController.playUiClick(520);
            }}
            almanacOpen={almanacOpen}
            onToggleAlmanac={() => {
              setAlmanacOpen((prev) => !prev);
              soundController.playUiClick(520);
            }}
            immersive={immersive}
            onToggleImmersive={() => {
              setImmersive((prev) => !prev);
              soundController.playUiClick(520);
            }}
            onResetFarm={handleResetFarm}
          />
        </div>

        {/* Small interaction footer beneath the square garden */}
        <AnimatePresence>
          {!immersive && (
            <motion.footer
              className="garden-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <span>Hover grass to sprout</span>
              <span className="footer-dot" aria-hidden="true">·</span>
              <span>Click to plant flowers</span>
              <span className="footer-dot" aria-hidden="true">·</span>
              <span>Double-click to grow trees</span>
              <span className="footer-dot" aria-hidden="true">·</span>
              <span>Drag to paint meadows</span>
            </motion.footer>
          )}
        </AnimatePresence>
      </main>

      {/* Understated creator signature in bottom-right corner outside the square farm */}
      <div className="creator-signature" aria-label="Created by Ujjwal Mohan">
        Ujjwal Mohan
      </div>
    </div>
  );
};

export default App;
