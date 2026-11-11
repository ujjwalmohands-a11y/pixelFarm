import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CloudFog,
  CloudRain,
  CloudSnow,
  Maximize2,
  Minimize2,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TimeOfDay, WeatherType } from '../types/farm';

interface AtmosphereControlsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  timeOfDay: TimeOfDay;
  onCycleTime: () => void;
  weather: WeatherType;
  onCycleWeather: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  almanacOpen: boolean;
  onToggleAlmanac: () => void;
  immersive: boolean;
  onToggleImmersive: () => void;
  onResetFarm: () => void;
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  sunrise: 'Sunrise',
  day: 'Daylight',
  sunset: 'Sunset',
  night: 'Night',
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  clear: 'Clear skies',
  rain: 'Gentle rain',
  fog: 'Morning fog',
  snow: 'Winter snow',
};

export const AtmosphereControls: React.FC<AtmosphereControlsProps> = ({
  soundEnabled,
  onToggleSound,
  timeOfDay,
  onCycleTime,
  weather,
  onCycleWeather,
  settingsOpen,
  onToggleSettings,
  almanacOpen,
  onToggleAlmanac,
  immersive,
  onToggleImmersive,
  onResetFarm,
}) => {
  const renderTimeIcon = () => {
    switch (timeOfDay) {
      case 'sunrise':
        return <Sunrise size={15} strokeWidth={1.8} />;
      case 'day':
        return <Sun size={15} strokeWidth={1.8} />;
      case 'sunset':
        return <Sunset size={15} strokeWidth={1.8} />;
      case 'night':
        return <Moon size={15} strokeWidth={1.8} />;
    }
  };

  const renderWeatherIcon = () => {
    switch (weather) {
      case 'clear':
        return <Sun size={15} strokeWidth={1.8} />;
      case 'rain':
        return <CloudRain size={15} strokeWidth={1.8} />;
      case 'fog':
        return <CloudFog size={15} strokeWidth={1.8} />;
      case 'snow':
        return <CloudSnow size={15} strokeWidth={1.8} />;
    }
  };

  return (
    <motion.div
      className="atmosphere-dock"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Atmosphere controls"
    >
      <DockButton
        active={soundEnabled}
        onClick={onToggleSound}
        tooltip={soundEnabled ? 'Mute sound' : 'Enable ambience'}
        ariaLabel="Toggle sound ambience"
      >
        {soundEnabled ? <Volume2 size={15} strokeWidth={1.8} /> : <VolumeX size={15} strokeWidth={1.8} />}
      </DockButton>

      <div className="dock-divider" />

      <DockButton
        active={timeOfDay === 'night' || timeOfDay === 'sunset'}
        onClick={onCycleTime}
        tooltip={`Time: ${TIME_LABELS[timeOfDay]}`}
        ariaLabel={`Switch time of day, currently ${TIME_LABELS[timeOfDay]}`}
      >
        {renderTimeIcon()}
      </DockButton>

      <DockButton
        active={weather !== 'clear'}
        onClick={onCycleWeather}
        tooltip={`Weather: ${WEATHER_LABELS[weather]}`}
        ariaLabel={`Switch weather, currently ${WEATHER_LABELS[weather]}`}
      >
        {renderWeatherIcon()}
      </DockButton>

      <DockButton
        active={settingsOpen}
        onClick={onToggleSettings}
        tooltip="Atmosphere settings"
        ariaLabel="Open atmosphere settings panel"
      >
        <SlidersHorizontal size={15} strokeWidth={1.8} />
      </DockButton>

      <DockButton
        active={almanacOpen}
        onClick={onToggleAlmanac}
        tooltip="Carbon Almanac & Lore"
        ariaLabel="Open Gemini Carbon Almanac"
      >
        <BookOpen size={15} strokeWidth={1.8} />
      </DockButton>

      <div className="dock-divider" />

      <DockButton
        active={false}
        onClick={onResetFarm}
        tooltip="Reset garden"
        ariaLabel="Reset planted garden to original state"
      >
        <RotateCcw size={14} strokeWidth={1.8} />
      </DockButton>

      <DockButton
        active={immersive}
        onClick={onToggleImmersive}
        tooltip={immersive ? 'Exit immersive mode' : 'Immersive mode'}
        ariaLabel="Toggle immersive mode"
      >
        {immersive ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
      </DockButton>
    </motion.div>
  );
};

interface DockButtonProps {
  active: boolean;
  onClick: () => void;
  tooltip: string;
  ariaLabel: string;
  children: React.ReactNode;
}

const DockButton: React.FC<DockButtonProps> = ({
  active,
  onClick,
  tooltip,
  ariaLabel,
  children,
}) => {
  return (
    <motion.button
      type="button"
      className={`dock-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.93 }}
      aria-label={ariaLabel}
    >
      {children}
      <span className="dock-tooltip" role="tooltip">
        {tooltip}
      </span>
    </motion.button>
  );
};
