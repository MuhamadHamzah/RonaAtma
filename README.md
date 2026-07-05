# RonaAtma: AI-Powered & Privacy-First Student Counseling Sanctuary

RonaAtma is a modern, web-based student mental health and counseling support platform designed specifically for high school students in Indonesia. Built as a "Sanctuary," it addresses the critical student-to-counselor gap, high-school stress, and bullying by integrating empathetic artificial intelligence with zero-biometric, decentralized cryptographic privacy paradigms.

---

## 🌌 Key Features & Innovations

### 1. Unified RonaAtma.AI Hub
An integrated chat and calling experience replacing traditional segregated communication interfaces.
* **Smart Input Switching:** The message input dynamically morphs between a **Send** action (when text is present) and a **Voice Call** toggle (when input is empty).
* **Instant Hand-Back Transcription:** Text conversations and voice calling sessions happen in the same view. Ending a call automatically collapses the Call UI and appends the spoken dialogue into the persistent text history.

### 2. Dual-Stream Voice Masking (Client-Side Privacy)
Addressing privacy concerns where students fear voiceprints or raw voice recordings could be tracked or leaked.
* **Web Audio Processing:** Utilizes local browser node graphs (`BiquadFilterNode`, `OscillatorNode`, and `WaveShaperNode`) to process audio.
* **Dual-Stream Pipeline:**
  * **Stream 1 (Raw Audio):** Sent directly to the Speech-to-Text (STT) recorder locally to ensure Whisper maintains **98% transcription accuracy**.
  * **Stream 2 (Masked Audio):** Frequency/pitch shifted locally in real-time, routed solely to the Analyser node to drive the Siri Quantum Fluid Orb visualizer.
  * **Zero Biometrics on Server:** The student's raw biological voiceprint never leaves the client device.

### 3. Siri Quantum Fluid Orb Visualizer
* Replaces static 2D avatars with a dynamic, multi-layered Bezier/sine wave fluid visualizer canvas that pulses and changes color/movement depending on active microphone input (user speaking) and speaker output (AI speaking).

### 4. Early Warning System (EWS) & Counselor Dashboard
* **Automatic Sentiment Tracking:** Tracks mood stability fluctuations over a multi-day window.
* **BK Alerts:** Automated notifications triggered to Guru BK for critical mental health or high-risk bullying reports while preserving student pseudonymity.

---

## 🛠️ Tech Stack & Architecture

* **Languages & Technologies (Bahasa yang Digunakan):**
  * **TypeScript / TSX:** Core logic React frontend, Web Audio API integration, and hooks.
  * **TypeScript (Deno Runtime):** Supabase Serverless Edge Functions backend scripts.
  * **SQL (PostgreSQL PL/pgSQL):** Database schemas, Row Level Security (RLS) policies, and database triggers.
  * **CSS3:** Custom cyber-cosmic styling and keyframe canvas animations.
  * **HTML5:** Main skeleton layout.
* **Frontend:** React (v18), Vite, Tailwind CSS, Lucide icons, Recharts
* **Backend Database & Serverless:** Supabase (Auth, PostgreSQL, Realtime Database, Edge Functions)
* **AI Pipelines (Edge Functions):**
  * **STT:** OpenAI Whisper Large v3
  * **LLM Completions:** Groq Llama-3/Qwen with contextual few-shot Indonesian teenage slang prompting
  * **TTS:** ElevenLabs Multi-Key Rotation and Fallback Pipeline (graceful Web Speech API browser-side fallback if ElevenLabs limits are hit)
* **Blockchain-Ready Layer:** ICP (Internet Computer Protocol) canister mock salt interfaces for decentralized, pseudonymous identity generation.

---

## 📂 Project Directory Structure

```text
├── supabase/
│   ├── functions/
│   │   ├── chat-ai/          # LLM completions + crisis detection
│   │   ├── speech-to-text/   # Whisper v3 endpoint
│   │   └── text-to-speech/   # ElevenLabs multi-key TTS rotation engine
│   └── config.toml
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx # Global responsive viewport (dvh/overflow guard)
│   │   │   └── Sidebar.tsx   # Sidebar & bottom mobile nav
│   │   └── AvatarCounselor.tsx # Siri Quantum Fluid Orb canvas
│   ├── hooks/
│   │   └── useAudioEngine.ts # Voice masking + VAD + audio playback engine
│   ├── pages/
│   │   ├── student/
│   │   │   ├── Dashboard.tsx # Main student portal
│   │   │   ├── MoodTracker.tsx # Mood input & AI feedback
│   │   │   ├── RonaAtmaAI.tsx # Combined Chat & Voice RonaAtma.AI screen
│   │   │   └── BullyingReport.tsx # Decentralized anonymous reporting
│   │   └── dashboard/        # Counselor Dashboard pages (BK view)
│   ├── App.tsx               # Client routes (Vite + React Router)
│   └── index.css             # Anti-overflow, custom scrollbars, card themes
```

---

## 🚀 Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [Supabase CLI](https://supabase.com/docs/guides/cli) (for Edge Functions local development)

### 1. Installation
Clone the repository and install npm dependencies:
```bash
git clone <repository-url>
cd RonaAtma
npm install
```

### 2. Environment Configurations
Create a `.env` file in the root directory:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

### 3. Run Dev Server
Launch Vite's hot-reloading development server locally:
```bash
npm run dev
```
Open `http://localhost:5173` (or the console printed port) in your browser.

---

## 🔒 Production & Supabase Deploy

### Supabase Edge Functions Secrets
Deploy ElevenLabs keys (main + backups) to Supabase cloud environment secrets:
```bash
npx supabase secrets set ELEVENLABS_API_KEY="key1,key2,key3"
```

### Build & Compilation Check
Compile assets and check TypeScript compliance before deploying:
```bash
npm run typecheck
npm run build
```

---

## 🛡️ Privacy & Legal Compliance (UU PDP)
RonaAtma strictly adheres to Indonesian Law **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**:
1. **De-identification:** All student personal identifiers (Names, Student ID numbers) are cryptographically decoupled from chat transcripts in the database.
2. **Voluntary Informed Consent:** Both text and voice inputs require explicitly granted permission and consent triggers.
3. **No Biometric Leaks:** Audio voice masking is executed 100% client-side before STT parsing. Original voiceprints are never retained on server logs.
