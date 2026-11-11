import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CloudRain,
  Flower2,
  Key,
  Leaf,
  Send,
  Sparkles,
  TreePine,
  Wind,
  X,
} from 'lucide-react';
import { TimeOfDay, WeatherType } from '../types/farm';
import { PlantCounts } from '../systems/PlantingSystem';
import { generateCompletion, getApiKey, setApiKey } from '../services/respanClient';
import { soundController } from '../systems/SoundController';

interface CarbonAlmanacProps {
  open: boolean;
  onClose: () => void;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  counts: PlantCounts;
}

const SUGGESTED_PROMPTS = [
  'How is the valley feeling right now?',
  'What crops thrive in this atmosphere?',
  'How does our garden help the carbon balance?',
  'Tell me a quiet tale of this farm under the stars.',
];

export const CarbonAlmanac: React.FC<CarbonAlmanacProps> = ({
  open,
  onClose,
  timeOfDay,
  weather,
  counts,
}) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ecology' | 'spirit'>('ecology');
  const [keyInput, setKeyInput] = useState(() => getApiKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Carbon sequestered estimation (in grams of CO2)
  const carbonGrams = (counts.trees * 14.2 + counts.flowers * 1.8).toFixed(1);

  const handleSaveKey = () => {
    setApiKey(keyInput);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2400);
    soundController.playUiClick(620);
  };

  const handleAskSpirit = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setLoading(true);
    setResponse(null);
    soundController.playUiClick(680);

    const context = `You are the gentle, ancient Spirit of Carbon Valley in an indie pixel-art farm. The current environment is: Time=${timeOfDay}, Weather=${weather}, with ${counts.flowers} flowers and ${counts.trees} trees planted. Answer the visitor warmly, poetically, and concisely in 2-3 cozy sentences.`;
    const fullPrompt = `${context}\nVisitor asks: "${userPrompt}"`;

    try {
      const result = await generateCompletion(fullPrompt, 'gemini-4-carbon');
      if (result.content) {
        setResponse(result.content);
      } else {
        // Enchanting context-aware fallback when model credits or free promotion are paused
        const fallbacks: Record<string, string> = {
          sunrise: `The dawn mist rises gently over your ${counts.flowers} flowers. In the peach-tinted light, every new leaf breathes in the morning dew and whispers of growth.`,
          day: `Sunlight warms the garden paths and golden wheat fields. With ${counts.trees} trees standing tall, the valley breathes deeply, cradling wildlife beneath its shade.`,
          sunset: `Amber light settles across the pond as twilight draws near. Your garden rests peacefully, having absorbed ${carbonGrams}g of carbon today under quiet skies.`,
          night: `Crickets sing beneath a starlit canopy. The glowing windows of the farmhouse keep watch while your sleeping blossoms dream of tomorrow's rain.`,
        };
        const base = fallbacks[timeOfDay] || fallbacks.day;
        const note = result.error?.includes('activation_required') || result.error?.includes('promotion_closed')
          ? `\n\n(Note: Respan Gateway reported that Gemini Carbon needs credits or a connected provider key at platform.respan.ai/billing to stream live online inferences.)`
          : '';
        setResponse(`${base}${note}`);
      }
    } catch {
      setResponse(`The mountain breeze rustles softly through the pine needles. Nature answers with quiet patience, absorbing ${carbonGrams}g of carbon beneath the ${weather} sky.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="almanac-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="almanac-modal"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Carbon Valley Field Journal"
          >
            {/* Header */}
            <div className="almanac-header">
              <div className="almanac-title-wrap">
                <div className="almanac-badge">
                  <Sparkles size={11} className="badge-sparkle" />
                  <span>Gemini Carbon Almanac</span>
                </div>
                <h2 className="almanac-title">Carbon Valley Field Journal</h2>
                <p className="almanac-desc">
                  Atmospheric readings, ecological sequestration & valley lore
                </p>
              </div>
              <button
                type="button"
                className="almanac-close-btn"
                onClick={onClose}
                aria-label="Close Almanac"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="almanac-tabs">
              <button
                type="button"
                className={`almanac-tab ${activeTab === 'ecology' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('ecology');
                  soundController.playUiClick(500);
                }}
              >
                <Leaf size={13} />
                <span>Ecology & Atmosphere</span>
              </button>
              <button
                type="button"
                className={`almanac-tab ${activeTab === 'spirit' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('spirit');
                  soundController.playUiClick(520);
                }}
              >
                <BookOpen size={13} />
                <span>Ask Valley Spirit</span>
              </button>
            </div>

            {/* Tab 1: Ecology & Atmospheric Overview */}
            {activeTab === 'ecology' && (
              <div className="almanac-content">
                {/* Live Carbon Sequestration Hero Card */}
                <div className="carbon-hero-card">
                  <div className="hero-glow-blob" />
                  <div className="carbon-hero-head">
                    <span className="carbon-label">Net Carbon Sequestered</span>
                    <span className="carbon-number">{carbonGrams}g</span>
                    <span className="carbon-unit">CO₂ Biomass Equivalent</span>
                  </div>
                  <div className="carbon-metrics-grid">
                    <div className="metric-pill">
                      <Flower2 size={13} className="text-pink" />
                      <span>{counts.flowers} Wildflowers</span>
                      <small>+1.8g / bloom</small>
                    </div>
                    <div className="metric-pill">
                      <TreePine size={13} className="text-green" />
                      <span>{counts.trees} Evergreens</span>
                      <small>+14.2g / canopy</small>
                    </div>
                  </div>
                </div>

                {/* Atmospheric Sensor Readings */}
                <div className="almanac-section-title">Valley Atmospheric Conditions</div>
                <div className="sensors-row">
                  <div className="sensor-card">
                    <Wind size={15} />
                    <div>
                      <div className="sensor-val">{timeOfDay.toUpperCase()}</div>
                      <div className="sensor-label">Celestial Cycle</div>
                    </div>
                  </div>
                  <div className="sensor-card">
                    <CloudRain size={15} />
                    <div>
                      <div className="sensor-val">{weather.toUpperCase()}</div>
                      <div className="sensor-label">Precipitation</div>
                    </div>
                  </div>
                </div>

                {/* Farm Field Notes */}
                <div className="field-notes-card">
                  <div className="notes-header">Field Notes from the Farmhouse</div>
                  <p className="notes-body">
                    The gentle water from the cliff spring runs through the wooden bridge and feeds
                    the carrot patches. With every tree you plant, deep root systems retain soil
                    moisture and expand the living carbon sink of the valley.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Gemini Carbon Spirit Interactive Q&A */}
            {activeTab === 'spirit' && (
              <div className="almanac-content">
                <div className="spirit-intro">
                  <Sparkles size={16} className="spirit-icon" />
                  <div>
                    <strong>The Valley Spirit</strong> listens to the rustle of your trees and the
                    fall of rain. Powered by Google Gemini Carbon via Respan Gateway.
                  </div>
                </div>

                <div className="spirit-key-toggle-row">
                  <button
                    type="button"
                    className="key-config-toggle-btn"
                    onClick={() => setShowKeyConfig((v) => !v)}
                  >
                    <Key size={11} />
                    <span>{getApiKey() ? 'API Key Connected' : 'Configure Respan API Key (Optional)'}</span>
                  </button>
                  {keySavedMessage && <span className="key-saved-tag">Saved!</span>}
                </div>

                {showKeyConfig && (
                  <div className="key-config-box">
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="Paste Respan API key..."
                      className="key-config-input"
                    />
                    <button type="button" onClick={handleSaveKey} className="key-save-btn">
                      Save
                    </button>
                  </div>
                )}

                {/* Suggested prompt chips */}
                <div className="spirit-chips">
                  {SUGGESTED_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="spirit-chip"
                      onClick={() => {
                        setQuery(p);
                        handleAskSpirit(p);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Response area */}
                {response && (
                  <motion.div
                    className="spirit-response-box"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="response-origin">Spirit of the Valley</div>
                    <p className="response-text">{response}</p>
                  </motion.div>
                )}

                {loading && (
                  <div className="spirit-loading">
                    <Sparkles size={15} className="spinner-sparkle" />
                    <span>Listening to the mountain winds...</span>
                  </div>
                )}

                {/* Custom Query Input */}
                <form
                  className="spirit-input-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskSpirit(query);
                  }}
                >
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask the farm spirit anything..."
                    className="spirit-input"
                  />
                  <button
                    type="submit"
                    className="spirit-send-btn"
                    disabled={!query.trim() || loading}
                    aria-label="Send question"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            )}

            {/* Footer */}
            <div className="almanac-footer">
              <span className="gateway-status">
                <span className="gateway-dot" />
                Respan Gateway • Gemini 4 Carbon
              </span>
              <span className="almanac-tip">Click farm tiles to cultivate</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

