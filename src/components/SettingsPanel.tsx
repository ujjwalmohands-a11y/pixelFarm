import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TimeOfDay, WeatherType } from '../types/farm';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  timeOfDay: TimeOfDay;
  onSelectTime: (t: TimeOfDay) => void;
  weather: WeatherType;
  onSelectWeather: (w: WeatherType) => void;
  autoTime: boolean;
  onToggleAutoTime: () => void;
  autoWeather: boolean;
  onToggleAutoWeather: () => void;
}

const TIME_OPTIONS: Array<{
  id: TimeOfDay;
  label: string;
  desc: string;
}> = [
  { id: 'sunrise', label: 'Sunrise', desc: 'Peach dawn' },
  { id: 'day', label: 'Day', desc: 'Warm sun' },
  { id: 'sunset', label: 'Sunset', desc: 'Golden hour' },
  { id: 'night', label: 'Night', desc: 'Starlight' },
];

const WEATHER_OPTIONS: Array<{
  id: WeatherType;
  label: string;
  desc: string;
}> = [
  { id: 'clear', label: 'Clear skies', desc: 'Calm breeze' },
  { id: 'rain', label: 'Rain', desc: 'Pond ripples' },
  { id: 'fog', label: 'Fog', desc: 'Drifting mist' },
  { id: 'snow', label: 'Snow', desc: 'Winter hush' },
];

const TimePreviewThumb: React.FC<{ id: TimeOfDay }> = ({ id }) => {
  switch (id) {
    case 'sunrise':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="4" fill="#7a92bd" />
          <rect x="0" y="4" width="16" height="4" fill="#e4a892" />
          <rect x="0" y="8" width="16" height="4" fill="#4f8740" />
          <rect x="10" y="5" width="4" height="3" fill="#ffe49e" />
          <rect x="3" y="6" width="3" height="2" fill="#3b6b32" />
        </svg>
      );
    case 'day':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="5" fill="#76b2db" />
          <rect x="0" y="5" width="16" height="3" fill="#b4dcf0" />
          <rect x="0" y="8" width="16" height="4" fill="#5d9448" />
          <rect x="11" y="2" width="3" height="3" fill="#fff2a6" />
          <rect x="3" y="2" width="4" height="2" fill="#fcf9f0" />
          <rect x="4" y="6" width="3" height="2" fill="#40753f" />
        </svg>
      );
    case 'sunset':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="4" fill="#4f4b80" />
          <rect x="0" y="4" width="16" height="4" fill="#c66c62" />
          <rect x="0" y="8" width="16" height="4" fill="#3d6134" />
          <rect x="10" y="5" width="4" height="3" fill="#ffb86c" />
          <rect x="3" y="6" width="4" height="3" fill="#7d3529" />
          <rect x="4" y="7" width="1" height="1" fill="#ffe38f" />
        </svg>
      );
    case 'night':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="8" fill="#14203e" />
          <rect x="0" y="8" width="16" height="4" fill="#1e382b" />
          <rect x="2" y="2" width="1" height="1" fill="#fff8d6" />
          <rect x="6" y="4" width="1" height="1" fill="#fff8d6" />
          <rect x="11" y="2" width="3" height="3" fill="#f8f5d6" />
          <rect x="12" y="2" width="2" height="2" fill="#14203e" />
          <rect x="4" y="9" width="1" height="1" fill="#ffe878" />
          <rect x="9" y="9" width="1" height="1" fill="#ffe878" />
        </svg>
      );
  }
};

const WeatherPreviewThumb: React.FC<{ id: WeatherType }> = ({ id }) => {
  switch (id) {
    case 'clear':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="8" fill="#82bce0" />
          <rect x="0" y="8" width="16" height="4" fill="#5d9448" />
          <rect x="3" y="3" width="5" height="2" fill="#fcf9f0" />
          <rect x="4" y="2" width="3" height="1" fill="#fcf9f0" />
          <rect x="11" y="2" width="3" height="3" fill="#ffe885" />
        </svg>
      );
    case 'rain':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="8" fill="#546678" />
          <rect x="0" y="8" width="16" height="4" fill="#3a6354" />
          <rect x="3" y="2" width="1" height="3" fill="#bad8f2" />
          <rect x="7" y="4" width="1" height="3" fill="#bad8f2" />
          <rect x="11" y="1" width="1" height="3" fill="#bad8f2" />
          <rect x="13" y="5" width="1" height="2" fill="#bad8f2" />
          <rect x="5" y="10" width="4" height="1" fill="#cbeeff" />
        </svg>
      );
    case 'fog':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="8" fill="#aebcbc" />
          <rect x="0" y="8" width="16" height="4" fill="#5f7d61" />
          <rect x="1" y="3" width="11" height="2" fill="#dce4e2" />
          <rect x="4" y="6" width="11" height="2" fill="#e6eeec" />
          <rect x="2" y="9" width="8" height="1" fill="#d4dedc" />
        </svg>
      );
    case 'snow':
      return (
        <svg className="preset-thumb" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="16" height="8" fill="#9cb2c9" />
          <rect x="0" y="8" width="16" height="4" fill="#e4edf5" />
          <rect x="3" y="2" width="1" height="1" fill="#ffffff" />
          <rect x="8" y="4" width="2" height="2" fill="#ffffff" />
          <rect x="13" y="2" width="1" height="1" fill="#ffffff" />
          <rect x="5" y="6" width="1" height="1" fill="#ffffff" />
          <rect x="11" y="6" width="1" height="1" fill="#ffffff" />
        </svg>
      );
  }
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  timeOfDay,
  onSelectTime,
  weather,
  onSelectWeather,
  autoTime,
  onToggleAutoTime,
  autoWeather,
  onToggleAutoWeather,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="settings-panel"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="A changing world atmosphere settings"
        >
          <div className="settings-header">
            <div>
              <h2 className="settings-title">A changing world</h2>
              <p className="settings-subtitle">Shape light, sky &amp; season</p>
            </div>
            <button
              type="button"
              className="settings-close-btn"
              onClick={onClose}
              aria-label="Close atmosphere settings"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-head">
              <span className="settings-section-label">TIME OF DAY</span>
              <button
                type="button"
                className={`auto-pill ${autoTime ? 'is-on' : ''}`}
                onClick={onToggleAutoTime}
                aria-pressed={autoTime}
              >
                <span className="auto-dot" />
                Auto cycle
              </button>
            </div>

            <div className="preset-grid">
              {TIME_OPTIONS.map((opt) => {
                const active = timeOfDay === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`preset-card ${active ? 'is-selected' : ''}`}
                    onClick={() => onSelectTime(opt.id)}
                    aria-pressed={active}
                  >
                    <TimePreviewThumb id={opt.id} />
                    <span className="preset-meta">
                      <span className="preset-name">{opt.label}</span>
                      <span className="preset-desc">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-head">
              <span className="settings-section-label">WEATHER</span>
              <button
                type="button"
                className={`auto-pill ${autoWeather ? 'is-on' : ''}`}
                onClick={onToggleAutoWeather}
                aria-pressed={autoWeather}
              >
                <span className="auto-dot" />
                Auto weather
              </button>
            </div>

            <div className="preset-grid">
              {WEATHER_OPTIONS.map((opt) => {
                const active = weather === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`preset-card ${active ? 'is-selected' : ''}`}
                    onClick={() => onSelectWeather(opt.id)}
                    aria-pressed={active}
                  >
                    <WeatherPreviewThumb id={opt.id} />
                    <span className="preset-meta">
                      <span className="preset-name">{opt.label}</span>
                      <span className="preset-desc">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
