# 🌾 GROW — Cozy Indie Pixel-Art Farm

An enchanting, interactive isometric pixel-art farming simulation and generative web experiment. Explore a living miniature diorama with dynamic weather, day/night cycles, procedural Web Audio soundscapes, and an in-game **Carbon Almanac** powered by Google Gemini Carbon via the Respan AI Gateway.

![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Respan](https://img.shields.io/badge/Respan-Gateway-10B981?style=flat-square)
![Gemini Carbon](https://img.shields.io/badge/Google_Gemini-4_Carbon-4285F4?style=flat-square&logo=google&logoColor=white)

---

## ✨ Features

* **Isometric Living Diorama:** Hand-crafted pixel sprites for a 2-story farmhouse, chimney with drifting smoke puffs, turning wooden waterwheel, stone bridge, wishing well, and harvestable vegetable patches (carrots, pumpkins, and wheat).
* **Wildlife & Fauna:**
  * **Fluttering Butterflies:** 4 distinct species (Monarch, Blue Morpho, Swallowtail, and Peacock Rose) with 25+ detailed pixels each and dynamic 4-frame flapping flight.
  * **Swimming Pond Duck:** Bobs gently on the water with wake ripples; quacks and speeds up when clicked.
  * **Porch Tabby Cat:** Curls up asleep on the porch; purrs and sends up floating pixel hearts when petted.
  * **Swimming Koi Fish:** Golden and calico koi gliding beneath the water surface.
  * **Tiny Farmer Character:** Can walk anywhere across paths and meadows with smooth footstep pacing and interactive thought bubbles.
* **Interactive Flora Cultivation:**
  * Hover across meadows to sprout tender grass wildflowers.
  * Single-click to plant colorful blossoms (poppy red, buttercup yellow, periwinkle blue, peony pink, and chamomile white).
  * Double-click to grow tall evergreen pine and birch saplings.
  * Drag to paint lush wildflower fields.
* **Atmospheric Cycles & Lighting:**
  * **Time of Day:** Sunrise (peach dawn), Day (golden sun), Sunset (twilight gradient), and Night (starry skies, window hearth glow, and floating fireflies).
  * **Weather Engine:** Clear skies, diagonal rain streaks with pond ripple impacts, drifting fog mist, and winter snowfall.
* **Procedural Web Audio Synthesizer:**
  * Zero external sound assets or network latency.
  * Synthesizes ambient rain, wind murmur, nighttime pad drone, bird chirps, cricket trills, duck quacks, feline purrs, and generative lo-fi kalimba melodies in real time.
* **Gemini Carbon Field Journal & Valley Spirit:**
  * Real-time ecological carbon calculation based on planted flowers and trees.
  * Interactive conversational Spirit of Carbon Valley powered by **Google Gemini Carbon** (`gemini-4-carbon`) through the **Respan AI Gateway**.

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|---|---|
| **T** | Cycle Time of Day (Sunrise → Day → Sunset → Night) |
| **W** | Cycle Weather (Clear → Rain → Fog → Snow) |
| **M** | Toggle Audio Ambience & Generative Music |
| **A** | Open / Close Carbon Almanac |
| **Esc** | Exit Settings, Almanac, or Immersive Mode |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ujjwalmohands-a11y/pixelFarm.git
cd pixelFarm
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (Optional)
Copy `.env.example` to `.env` and add your Respan API key to enable live Gemini Carbon generation:
```bash
cp .env.example .env
```

```env
RESPAN_API_KEY=your_respan_api_key_here
VITE_RESPAN_API_KEY=your_respan_api_key_here
```

### 4. Run development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production
```bash
npm run build
```

---

## 🛠️ Tech Stack

* **Framework:** React 18 with TypeScript
* **Build Tool:** Vite
* **Animation:** Framer Motion
* **Audio:** Web Audio API (procedural synthesis)
* **AI Gateway:** Respan Gateway (`https://gateway.respan.ai/v1`)
* **AI Model:** Google Gemini Carbon (`gemini-4-carbon`)
* **Icons:** Lucide React
* **Typography:** Instrument Serif, Silkscreen, Inter

---

## 📄 License
MIT

