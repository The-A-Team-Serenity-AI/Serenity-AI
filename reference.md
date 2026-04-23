# Serenity AI — Complete Technical Reference

> **Repo**: [The-A-Team-Serenity-AI/Serenity-AI](https://github.com/The-A-Team-Serenity-AI/Serenity-AI)
> **Local path**: `d:\Desktop\Serenity`
> **Last audited**: 2026-04-23

---

## 1. What Is Serenity AI?

Serenity AI is a **mental wellness platform** featuring:

- **Amy** — A real-time 3D anime-style AI companion (VRM model rendered in Three.js) that users can chat with via text or live voice.
- **Progressive Trust Ladder** — A 4-phase access system that gradually unlocks community features as the user demonstrates emotional readiness.
- **Community Hub** — Events, recommendations, and a moderated chat room with toxicity filtering.
- **Guardian Consent** — Email-based parental verification flow for minors.
- **Crisis Detection** — Keyword-based detection that surfaces helpline resources when self-harm language is detected.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, GSAP |
| **3D Mascot** | Three.js, `@react-three/fiber`, `@react-three/drei`, `@pixiv/three-vrm` |
| **AI (Chat)** | Google Generative AI SDK (`@google/generative-ai`), model `gemini-2.5-flash-lite` |
| **AI (TTS)** | Gemini `gemini-2.5-flash-preview-tts` REST API (voice: `Kore`) |
| **AI (Live Voice)** | Gemini Live API via WebSocket (`gemini-2.5-flash-native-audio-preview`), server proxy |
| **Backend** | Node.js, Express, ES Modules |
| **Database** | MongoDB Atlas via Mongoose |
| **Auth** | JWT (`jsonwebtoken`), bcrypt, Google OAuth (`google-auth-library`) |
| **Email** | Nodemailer (Gmail transport) |
| **Icons** | Lucide React |

---

## 3. Project Structure

```
Serenity/
├── public/
│   └── models/waifu.vrm          # Amy's 3D model
├── server/
│   └── server.js                  # Express + WebSocket server (1786 lines)
├── src/
│   ├── App.tsx                    # Root: routing, auth guards, layout
│   ├── context/
│   │   └── AuthContext.tsx        # React Context for auth state
│   ├── utils/
│   │   └── api.ts                 # getApiUrl() helper
│   ├── pages/
│   │   ├── MascotPage.tsx         # Full-page Amy interaction
│   │   ├── ProfilePage.tsx        # User profile + ReadinessMeter
│   │   ├── Diary.tsx              # Password-locked local diary
│   │   ├── Recommendations.tsx    # Community events & recs hub
│   │   ├── GuardianVerification.tsx # Guardian approve/deny page
│   │   └── CommunityGuidelines.tsx  # Static guidelines page
│   ├── features/
│   │   ├── chat/
│   │   │   └── ChatWithPulse.tsx  # Standalone AI chat (text + voice)
│   │   └── voice/
│   │       └── voiceUtils.ts      # Speech synthesis helpers
│   └── components/
│       ├── Mascot/
│       │   ├── MascotScene.tsx     # Three.js canvas + VRM avatar loader
│       │   ├── MascotController.ts # EmotionController + VoiceController singletons
│       │   ├── MascotAnimations.ts # AnimationController + 6 named animations
│       │   ├── LiveVoiceClient.ts  # WebSocket client for Gemini Live API
│       │   ├── ChatBox.tsx         # Mascot chat UI (text + live voice toggle)
│       │   └── FaceTracker.tsx     # Webcam skin-color face tracking
│       ├── ReadinessMeter.tsx      # 4-phase staircase progress UI
│       └── CommunityChat.tsx       # Modal chat with toxicity feedback
├── .env.example                   # Template for environment variables
├── package.json
└── ARCHITECTURE.md                # Original design document
```

---

## 4. The Progressive Trust Ladder

The core architectural concept. Users start in a safe AI-only zone and earn access to community features based on measurable engagement.

### 4.1 The Four Phases

| # | Phase | Unlock Criteria | Access |
|---|---|---|---|
| 1 | `ai-only` | Default on signup | Chat with Amy, Diary |
| 2 | `micro-therapy` | ≥2 sessions + completed Sentiscope assessment | Above + therapy recommendations |
| 3 | `community-readonly` | ≥2 therapies tried + ≥3 engagement days | Above + read community posts |
| 4 | `full-access` | Readiness score ≥70% + zero toxicity flags | Full community participation |

### 4.2 Readiness Score Algorithm

Defined in [server.js:586-608](file:///d:/Desktop/Serenity/server/server.js#L586-L608):

```
score = min(sessionCount/5 * 30, 30)        // Sessions:    30 pts max
      + min(therapyAdoptionCount/3 * 25, 25) // Therapies:   25 pts max
      + min(engagementDays/7 * 20, 20)       // Engagement:  20 pts max
      + min(moodStabilityScore/100 * 15, 15) // Mood:        15 pts max
      + min(reputationScore/100 * 10, 10)    // Reputation:  10 pts max
      - (toxicityFlags * 10)                 // Penalty
```

Result is clamped to `[0, 100]`. Phase transitions are triggered in [track-engagement](file:///d:/Desktop/Serenity/server/server.js#L511-L583).

### 4.3 ReadinessMeter Component

[ReadinessMeter.tsx](file:///d:/Desktop/Serenity/src/components/ReadinessMeter.tsx) renders a visual staircase of the 4 phases with:
- A gradient progress bar showing overall `readinessScore`
- Phase cards that glow when active, checkmark when complete
- "Next Milestone" section with progress percentage
- Stats grid: sessions, therapies tried, active days

---

## 5. The Mascot System (Amy)

Amy is a VRM 3D model rendered inside a React Three Fiber `<Canvas>`. The system has 4 singleton controllers:

### 5.1 MascotScene — [MascotScene.tsx](file:///d:/Desktop/Serenity/src/components/Mascot/MascotScene.tsx)

- Loads `/models/waifu.vrm` via `GLTFLoader` + `VRMLoaderPlugin`
- Sets a **natural resting pose** (arms down at sides, slight spine tilt) via `applyNaturalPose()`
- Runs a `useFrame` animation loop that handles:
  - **Breathing**: hips oscillate on Y via `sin(t * 1.5) * 0.002`
  - **Eye tracking**: VRM `lookAt.target` follows face position or idle drift
  - **Head rotation**: smoothly lerped toward face tracker or idle sway
  - **Blinking**: randomized 2–6 second intervals with smooth open/close
  - **Lip sync**: drives `aa`/`oh` blend shapes from `voiceController.mouthOpenness`
  - **Emotion**: calls `emotionController.update(delta)` for smooth expression fading
  - **Animations**: calls `animationController.update(vrm, delta)` for body animations

### 5.2 EmotionController — [MascotController.ts:28-76](file:///d:/Desktop/Serenity/src/components/Mascot/MascotController.ts#L28-L76)

Maps emotion names to VRM expression blend shape targets:

| Emotion | Expressions |
|---|---|
| `happy` | happy: 0.95 |
| `embarrassed` | happy: 0.5 |
| `angry` | angry: 0.9 |
| `frustrated` | angry: 0.4, sad: 0.3 |
| `blushing` | happy: 0.6 |
| `teasing` | happy: 0.7 |

Smoothly interpolates current → target at `lerpSpeed = 4` per frame.

### 5.3 VoiceController — [MascotController.ts:82-223](file:///d:/Desktop/Serenity/src/components/Mascot/MascotController.ts#L82-L223)

- **`speak(text)`**: Tries Gemini TTS endpoint first (`POST /api/mascot/tts`), falls back to browser `SpeechSynthesis`
- **Lip sync**: `updateLipSync(elapsed)` generates multi-frequency sine waves for realistic mouth movement
- **Voice selection**: Auto-picks Google/Microsoft natural voices, or uses user-selected voice from dropdown

### 5.4 AnimationController — [MascotAnimations.ts](file:///d:/Desktop/Serenity/src/components/Mascot/MascotAnimations.ts)

Six named bone animations:

| Animation | Duration | Description |
|---|---|---|
| `waveHello` | 2.5s | Big arm raise + wrist wave |
| `twirlIdle` | 3.5s | ±25° body rotation |
| `giggleBend` | 1.8s | Forward bend + bounce |
| `idleLookAround` | 4.0s | Head sweep left-right |
| `shyLookAway` | 2.0s | Head down + sideways glance |
| `fingerTapShy` | 2.2s | Arms inward + finger tap |

Features:
- **Reply trigger detection**: scans AI reply text for giggle/blush/shy keywords → auto-plays matching animation
- **Compliment detection**: user messages like "you're cute" trigger `shyLookAway`
- **Idle auto-trigger**: random animation every 20–40s
- **Idle prompts**: companion messages every 40–60s ("Don't forget to take breaks! 🌸")
- **Reaction bubbles**: floating text above Amy during animations

### 5.5 FaceTracker — [FaceTracker.tsx](file:///d:/Desktop/Serenity/src/components/Mascot/FaceTracker.tsx)

Lightweight webcam face tracking using skin-color pixel heuristic:
- Captures 160×120 frames from webcam
- Counts pixels matching `r > 95 && g > 40 && b > 20 && r > g && r > b`
- Computes centroid → normalized [-1, 1] position → drives `mascotState.headTargetX/Y`
- Fires `onFaceLost` after 5s of no detection
- Renders a small live preview window in top-left corner

### 5.6 LiveVoiceClient — [LiveVoiceClient.ts](file:///d:/Desktop/Serenity/src/components/Mascot/LiveVoiceClient.ts)

WebSocket client for real-time voice conversation with Gemini Live API:

```
Browser Mic (16kHz PCM) → base64 → WebSocket → Server Proxy → Gemini Live API
                                                                    ↓
Browser Speaker ← AudioContext (24kHz) ← base64 PCM ← WebSocket ← Gemini
```

- **Mic capture**: `ScriptProcessorNode` at 16kHz, converts Float32 → Int16 → base64
- **Playback**: Decodes base64 → Int16 → Float32 → `AudioBufferSourceNode` at 24kHz
- **Barge-in**: model stops speaking when user interrupts
- **Transcription**: receives `inputTranscription` (user) and `outputTranscription` (model) from Gemini

---

## 6. Chat Systems

### 6.1 Mascot ChatBox — [ChatBox.tsx](file:///d:/Desktop/Serenity/src/components/Mascot/ChatBox.tsx)

The chat panel next to Amy. Two modes:

**Text Mode**: `POST /api/mascot/chat` → server calls Gemini with Amy's personality prompt → returns `{ reply, emotion }` → triggers animations + TTS.

**Live Voice Mode**: Connects `LiveVoiceClient` to WebSocket proxy. Transcripts accumulate in refs, flush to messages on turn completion. Drives `voiceController.isSpeaking` for lip sync.

### 6.2 ChatWithPulse — [ChatWithPulse.tsx](file:///d:/Desktop/Serenity/src/features/chat/ChatWithPulse.tsx)

Standalone full-page chat (no 3D mascot). Features:
- **Crisis detection**: keyword list checks user input before API call; surfaces helpline numbers (1-800-273-8255, Crisis Text Line)
- **API key rotation**: tries primary → mascot → fallback keys on 429 errors
- **Typewriter effect**: characters appear one at a time with TTS playing simultaneously
- **Voice input**: Web Speech API (`SpeechRecognition`) with 3s silence timeout
- **Engagement tracking**: calls `POST /api/user/track-engagement` with action `'session'`
- **Suggestion pills**: 3 random prompts from a pool of 7

---

## 7. Backend Server — [server.js](file:///d:/Desktop/Serenity/server/server.js)

Single 1786-line Express server handling HTTP REST + WebSocket.

### 7.1 Database Schemas (Mongoose)

| Model | Key Fields |
|---|---|
| **User** | username, email, city, password, currentPhase, readinessScore, sessionCount, therapyAdoptionCount, engagementDays, moodStabilityScore, reputationScore, toxicityFlags, isShadowBanned, isMinor, guardianEmail, guardianConsent, accountActivated |
| **Recommendation** | userId, type, title, description, likes[], dislikes[] |
| **Event** | creatorId, sport, title, description, date, duration, maxParticipants, currentParticipants, location, status, likes[], dislikes[] |
| **EventParticipant** | eventId, userId, status (pending/accepted/rejected) |
| **ChatMessage** | userId, message (max 500 chars), timestamp |
| **Notification** | recipientId, senderId, eventId, type, message, read |
| **FlaggedContent** | contentType, contentId, userId, reason, toxicityScore, status |
| **GuardianConsent** | userId, childUsername, childEmail, childAge, guardianEmail, verificationToken, status, expiresAt |

### 7.2 API Endpoints

#### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register (handles minor flow) |
| POST | `/api/auth/login` | — | Login (checks accountActivated) |
| POST | `/api/auth/google` | — | Google OAuth login/register |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/check-activation` | — | Check if minor's account is activated |

#### User & Readiness
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/user/readiness` | ✅ | Get readiness score, phase, next milestone |
| POST | `/api/user/track-engagement` | ✅ | Track session/therapy/assessment → recalculate readiness |
| POST | `/api/user/reputation` | ✅ | Adjust reputation (positive/negative) |

#### Community
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/recommendations` | — | List all recommendations |
| POST | `/api/recommendations` | ✅ | Create (toxicity-checked) |
| POST | `/api/recommendations/:id/like` | ✅ | Toggle like |
| POST | `/api/recommendations/:id/dislike` | ✅ | Toggle dislike |
| GET | `/api/events` | — | List all events |
| POST | `/api/events` | ✅ | Create event (toxicity-checked) |
| POST | `/api/events/:id/join` | ✅ | Request to join |
| PUT | `/api/events/:id/participants/:pid` | ✅ | Accept/reject participant |
| GET | `/api/events/my-events` | ✅ | User's created + joined events |
| POST | `/api/events/:id/like` | ✅ | Toggle like |
| POST | `/api/events/:id/dislike` | ✅ | Toggle dislike |

#### Chat & Moderation
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/chat/messages` | ✅ | Last 100 messages |
| POST | `/api/chat/messages` | ✅ | Send message (toxicity-checked) |
| POST | `/api/moderation/flag` | ✅ | Manually flag content |
| GET | `/api/moderation/queue` | ✅ | View pending flagged content |

#### Guardian Consent
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/guardian/consent/:token` | — | Get consent request details |
| POST | `/api/guardian/approve/:token` | — | Approve minor's account |
| POST | `/api/guardian/deny/:token` | — | Deny minor's account |

#### Mascot AI
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/mascot/chat` | — | Chat with Amy (Gemini, dual-key fallback) |
| POST | `/api/mascot/tts` | — | Text-to-speech via Gemini TTS |
| WS | `/api/mascot/live` | — | Live voice proxy to Gemini Live API |

### 7.3 Toxicity Detection — [server.js:1067-1119](file:///d:/Desktop/Serenity/server/server.js#L1067-L1119)

Keyword-based with 3 severity tiers:

| Tier | Score/match | Examples |
|---|---|---|
| **High** | +0.8 | "kill yourself", "kys", "rape", "pedophile" |
| **Medium** | +0.4 | "hate you", "idiot", "retard", "violence", "racist" |
| **Low** | +0.2 | "dumb", "ugly", "shut up", "sucks" |

Flagged if cumulative score ≥ 0.5. Consequences:
- Content blocked, `FlaggedContent` record created
- User's `toxicityFlags += 1`, `reputationScore -= 10`
- Auto shadow-ban at ≥3 flags

### 7.4 WebSocket Live Voice Proxy — [server.js:1692-1780](file:///d:/Desktop/Serenity/server/server.js#L1692-L1780)

The server acts as a transparent WebSocket proxy between the browser and `wss://generativelanguage.googleapis.com`. On connection:
1. Opens upstream WS to Gemini Live API with `LIVE_API_KEY`
2. Sends setup config (model, voice `Kore`, Amy's system instruction, transcription enabled)
3. Forwards all messages bidirectionally (client ↔ Gemini)

---

## 8. Frontend Pages

### 8.1 MascotPage — [MascotPage.tsx](file:///d:/Desktop/Serenity/src/pages/MascotPage.tsx)
Full-screen Amy interaction: `MascotScene` (3D canvas) + `ChatBox` + `FaceTracker` with toggle.

### 8.2 ProfilePage — [ProfilePage.tsx](file:///d:/Desktop/Serenity/src/pages/ProfilePage.tsx)
User profile view. Polls `/api/user/readiness` every 10 seconds to show live `ReadinessMeter`.

### 8.3 Diary — [Diary.tsx](file:///d:/Desktop/Serenity/src/pages/Diary.tsx)
Password-protected personal diary stored in **localStorage** (per-user key). Features:
- First-time password setup screen
- Unlock screen on return visits
- CRUD entries with title, content, mood (5 types with emojis), and tags
- Search across title/content/tags
- Simple hash function for password (not cryptographically secure — noted as TODO)

### 8.4 Recommendations — [Recommendations.tsx](file:///d:/Desktop/Serenity/src/pages/Recommendations.tsx)
Community hub with events + recommendations. Search + filter (all/events/recommendations). Like/dislike toggles. Join event flow. Opens `CommunityChat` modal.

### 8.5 GuardianVerification — [GuardianVerification.tsx](file:///d:/Desktop/Serenity/src/pages/GuardianVerification.tsx)
Token-based page for guardians to approve/deny minor accounts. Shows child details, platform description, and approve/deny buttons.

### 8.6 CommunityGuidelines — [CommunityGuidelines.tsx](file:///d:/Desktop/Serenity/src/pages/CommunityGuidelines.tsx)
Static page: core principles, prohibited behavior, reporting instructions, enforcement tiers (warning → temp ban → permanent ban).

---

## 9. Auth System — [AuthContext.tsx](file:///d:/Desktop/Serenity/src/context/AuthContext.tsx)

React Context providing: `user`, `login()`, `signup()`, `googleLogin()`, `logout()`, `loading`.

- JWT stored in `localStorage` under key `token`
- On mount, auto-fetches user data via `GET /api/auth/me` if token exists
- Logout clears both `token` and `age_verified` from localStorage

---

## 10. Environment Variables

Required in `.env` at project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your-secret-key
VITE_GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...  # Not currently used server-side

# AI - Chat & TTS
VITE_GOOGLE_AI_API_KEY=...       # Primary Gemini key (frontend + backend)
MASCOT_GEMINI_API_KEY=...        # Dedicated mascot key (backend only)
VITE_FALLBACK_API_KEYS=key1,key2 # Comma-separated fallback keys

# AI - Live Voice
LIVE_API_KEY=...                  # Gemini Live API key for WebSocket proxy

# Email (Guardian consent)
EMAIL_USER=serenity.noreply@gmail.com
EMAIL_PASSWORD=app-password       # Gmail app password

# URLs
VITE_API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

---

## 11. Running the Project

```bash
# 1. Install dependencies
cd d:\Desktop\Serenity
npm install
cd server && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys

# 3. Start backend (Terminal 1)
node server/server.js
# → Express on :5000, WebSocket on ws://localhost:5000/api/mascot/live

# 4. Start frontend (Terminal 2)
npm run dev
# → Vite on http://localhost:5173
```

---

## 12. Known Limitations & Future Work

| Area | Current State | Improvement |
|---|---|---|
| **Security** | No HTTPS, no rate limiting, no `helmet.js` | Add all three for production |
| **Toxicity** | Keyword matching only | Integrate Perspective API or ML classifier |
| **Diary passwords** | Simple hash in localStorage | Use bcrypt or Web Crypto API |
| **Readiness** | Calculated on every request | Cache with Redis |
| **Face tracking** | Skin-color heuristic | Use MediaPipe Face Mesh |
| **Guardian routes** | Duplicated in server.js (L1242-1355 and L1366-1488) | Deduplicate |
| **Community chat** | Polling every 3s | Switch to WebSocket |
| **Voice utils** | Duplicate functions in `voiceUtils.ts` | Consolidate |
| **Admin panel** | Endpoints section exists but empty | Implement admin dashboard |
