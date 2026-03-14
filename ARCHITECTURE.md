# 🏗️ Serenity AI Architecture

Complete technical documentation of system design, data flows, and implementation details.

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Progressive Trust Ladder](#progressive-trust-ladder)
3. [Tech Stack Deep Dive](#tech-stack-deep-dive)
4. [API Documentation](#api-documentation)
5. [Database Schemas](#database-schemas)
6. [Frontend Architecture](#frontend-architecture)
7. [Backend Architecture](#backend-architecture)
8. [Toxicity Prevention System](#toxicity-prevention-system)
9. [Authentication Flow](#authentication-flow)
10. [Readiness Calculation Algorithm](#readiness-calculation-algorithm)

---

## System Overview

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite Dev Server - Port 5173)            │  │
│  │  - Pages, Components, Context                             │  │
│  │  - Real-time UI updates via polling                       │  │
│  │  - Progressive Trust UI gating                            │  │
│  │  - WebSockets for Gemini Live API Voice                   │  │
│  └────────┬────────────────────────────────────────┬─────────┘  │
└───────────┼────────────────────────────────────────┼────────────┘
            │ Axios HTTP & WebSockets                │ Google OAuth
            │ (JWT in Authorization header)          │ Redirect Flow
            ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Node.js + Express Backend (Port 5000)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Routes                                               │  │
│  │  - /api/auth/* (signup, login, google)                    │  │
│  │  - /api/user/* (readiness, track-engagement)              │  │
│  │  - /api/moderation/* (flag, queue)                        │  │
│  │  - /api/recommendations, /api/events, /api/chat/messages  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Middleware                                               │  │
│  │  - JWT verification (auth)                                │  │
│  │  - CORS (open for development)                            │  │
│  │  - Body parser (JSON)                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────┬─────────────┘
             │ Mongoose ODM                         │ Gemini API
             │                                      │ (HTTP)
             ▼                                      ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│   MongoDB Atlas          │        │  Google AI Services      │
│   (Cloud Database)       │        │  - Gemini 2.5 Flash      │
│   - Users collection     │        │  - Gemini Pro            │
│   - FlaggedContent       │        │                          │
│   - Recommendations      │        └──────────────────────────┘
│   - Events, ChatMessages │
└──────────────────────────┘
```

---

## Progressive Trust Ladder

### **Core Concept**

Serenity AI uses a **4-phase progression system** to gradually introduce users to community features based on emotional readiness. This prevents vulnerable users from exposure to potentially harmful interactions.

### **Phase Definitions**

```
╔═══════════════════════════════════════════════════════════════╗
║                    PROGRESSIVE TRUST LADDER                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  Phase 1: AI-Only (0-10% Readiness)                           ║
║  ├─ Unlocked: Chat with Amy (AI companion)                  ║
║  ├─ Blocked: All community features                           ║
║  └─ Goal: Build initial trust with AI                         ║
║                                                                ║
║  Phase 2: Micro-Therapy (10-40% Readiness)                    ║
║  ├─ Unlocked: Sentiscope (mood assessment)                    ║
║  ├─ Unlocked: All therapy types (Audio, Physical, etc.)       ║
║  ├─ Blocked: Community chat, posting                          ║
║  └─ Goal: Explore therapeutic tools                           ║
║                                                                ║
║  Phase 3: Community (Read-Only) (40-70% Readiness)            ║
║  ├─ Unlocked: View recommendations feed                       ║
║  ├─ Unlocked: Browse community events                         ║
║  ├─ Blocked: Posting/commenting                               ║
║  └─ Goal: Observe community safely                            ║
║                                                                ║
║  Phase 4: Full-Access (70%+ Readiness)                        ║
║  ├─ Unlocked: Create recommendations                          ║
║  ├─ Unlocked: Host events                                     ║
║  ├─ Unlocked: Community chat (with toxicity filter)           ║
║  └─ Goal: Contribute positively to community                  ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

### **Readiness Scoring Components**

| Component | Weight | Max Score | How to Earn |
|-----------|--------|-----------|-------------|
| **Chat Sessions** | 30% | 30 | Each Amy conversation adds 5 points (max 6 sessions) |
| **Therapy Adoption** | 25% | 25 | Visit each therapy type (Audio, Physical, Laughing, Reading) = 6.25 points each |
| **Engagement Days** | 20% | 20 | Logarithmic growth: `min(20, 10 * log10(days + 1))` |
| **Mood Stability** | 15% | 15 | Complete Sentiscope assessments, average mood score |
| **Community Reputation** | 10% | 10 | Start at 10, -2 per flagged post, +1 per week of good behavior |

**Formula:**
```javascript
readinessScore = (
  (chatSessions * 5) +                             // Max 30
  (therapyTypesVisited * 6.25) +                   // Max 25
  min(20, 10 * log10(engagementDays + 1)) +        // Max 20
  (averageMoodScore / 5 * 15) +                    // Max 15 (mood scores are 1-5)
  communityReputation                              // Max 10
)

phase = determinePhase(readinessScore)
```

### **Phase Advancement Logic**

```javascript
function determinePhase(readiness) {
  if (readiness < 10) return "ai-only";
  if (readiness < 40) return "micro-therapy";
  if (readiness < 70) return "community-readonly";
  return "full-access";
}
```

**Backend Implementation:** `/api/user/readiness` endpoint calculates this on every request using real-time user data.

---

## Tech Stack Deep Dive

### **Frontend Technologies**

| Technology | Version | Purpose | Key Files |
|------------|---------|---------|-----------|
| **React** | 18.3.1 | UI framework | `src/main.tsx`, `src/App.tsx` |
| **TypeScript** | 5.6.2 | Type safety | `tsconfig.json`, all `.tsx` files |
| **Vite** | 5.4.2 | Build tool & dev server | `vite.config.ts` |
| **React Router** | 6.26.1 | Client-side routing | `src/App.tsx` (routes) |
| **Tailwind CSS** | 3.4.10 | Utility-first styling | `tailwind.config.js`, `src/index.css` |
| **Framer Motion** | 11.3.31 | Animations | Phase transitions, hover effects |
| **GSAP** | 3.12.5 | Complex UI Animations | `src/components/DotGrid.tsx` |
| **Three.js & VRM** | 0.169.0 | 3D Mascot Rendering | `src/components/Mascot/*` |
| **Axios** | 1.7.7 | HTTP client | `src/pages/*.tsx` (API calls) |

### **Backend Technologies**

| Technology | Version | Purpose | Key Files |
|------------|---------|---------|-----------|
| **Node.js** | 18+ | Runtime | - |
| **Express** | 4.19.2 | Web framework | `server/server.js` |
| **MongoDB** | - | NoSQL database | Atlas cloud instance |
| **Mongoose** | 8.6.0 | ODM for MongoDB | Schemas in `server.js` |
| **JWT** | jsonwebtoken@9.0.2 | Auth tokens | Login/signup endpoints |
| **bcrypt** | 5.1.1 | Password hashing | User registration |
| **Google OAuth2** | google-auth-library@9.14.0 | Social login | `/api/auth/google` |
| **cors** | 2.8.5 | Cross-origin requests | Middleware |
| **dotenv** | 16.4.5 | Environment variables | `.env` loading |

### **AI Services**

| Service | Model | Purpose | API Endpoint |
|---------|-------|---------|--------------|
| **Google Gemini Live API** | gemini-2.0-flash-exp | Real-time Voice Chat with Amy | `wss://generativelanguage.../ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent` |
| **Google Gemini API** | gemini-2.5-flash-lite | Text Chat with Amy | `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent` |
| **Google Gemini API** | gemini-2.5-flash | Therapy recommendations (Sentiscope) | `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |

---

## API Documentation

### **Base URL**
```
Development: http://localhost:5000
Production: https://your-domain.com
```

### **Authentication**

All protected routes require JWT token in header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

### **1. Authentication Endpoints**

#### **POST /api/auth/signup**
Register new user with email/password.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "age": 25,
  "guardianEmail": "guardian@example.com"  // Required if age < 18
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "name": "John Doe",
    "email": "john@example.com",
    "phase": "ai-only",
    "readinessScore": 0
  }
}
```

**Special Case: Admin Account**
If email is `admin@serenityai.com` and password is `SerenityAIAdmin2026!`:
- Automatically set `readinessScore: 100`, `phase: "full-access"`
- Pre-populate engagement metrics (6 chat sessions, 4 therapy types, 30 days)

**Validation:**
- Age must be ≥ 13
- If age < 18, guardianEmail required and consent sent via email
- Password must be 8+ characters

---

#### **POST /api/auth/login**
Login with email/password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "name": "John Doe",
    "email": "john@example.com",
    "phase": "micro-therapy",
    "readinessScore": 25
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials
- `404 Not Found`: User doesn't exist

---

#### **POST /api/auth/google**
Authenticate with Google OAuth token.

**Request Body:**
```json
{
  "token": "ya29.a0AfH6SMB..."  // Google ID token from frontend
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "name": "John Doe",
    "email": "john@gmail.com",
    "phase": "ai-only",
    "readinessScore": 0
  }
}
```

**Process:**
1. Verify token with Google OAuth2 library
2. Extract email, name from payload
3. Find or create user in database
4. Generate JWT token
5. Return user object

---

### **2. User Endpoints**

#### **GET /api/user/readiness**
Get real-time readiness score and phase for logged-in user.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "readinessScore": 45.5,
  "phase": "community-readonly",
  "breakdown": {
    "chatSessions": 30,
    "therapyAdoption": 25,
    "engagementDays": 15.5,
    "moodStability": 12,
    "communityReputation": 10
  },
  "nextMilestone": {
    "phase": "full-access",
    "requiredScore": 70,
    "pointsNeeded": 24.5
  }
}
```

**Calculation:**
- Fetches user from database
- Runs readiness algorithm (see [Readiness Calculation](#readiness-calculation-algorithm))
- Returns breakdown for transparency

---

#### **POST /api/user/track-engagement**
Track user actions to update engagement metrics.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "action": "session",         // or "therapy_adoption", "assessment_complete"
  "therapyType": "audio"       // Required if action is "therapy_adoption"
}
```

**Actions:**
- `session`: Increments chatSessions count (max 6)
- `therapy_adoption`: Adds therapy type to adoptedTherapies array (max 4 types)
- `assessment_complete`: Adds Sentiscope completion to moodAssessments

**Response (200):**
```json
{
  "message": "✅ Session tracked - User: john@example.com, Count: 3",
  "readinessScore": 15,
  "phase": "micro-therapy"
}
```

---

### **3. Moderation Endpoints**

#### **POST /api/moderation/flag**
Flag content for toxicity (auto-triggered by backend, can be manual).

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "contentType": "chat",                  // or "recommendation", "event"
  "content": "This is a toxic message",
  "reason": "Severe toxicity detected",
  "severity": "high"                      // "low", "medium", "high"
}
```

**Response (201):**
```json
{
  "message": "Content flagged successfully",
  "flagId": "60d5ec49f1b2c8b5e8f8e8e8",
  "reputationChange": -2
}
```

**Side Effects:**
- Reduces user's `communityReputation` by 2
- Creates FlaggedContent document
- If reputation drops below 0, user is shadow-banned (phase locked to ai-only)

---

#### **GET /api/moderation/queue**
Get all flagged content (admin only, not implemented in frontend yet).

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "flaggedContent": [
    {
      "id": "60d5ec49f1b2c8b5e8f8e8e8",
      "contentType": "chat",
      "content": "Toxic message here",
      "reason": "Severe toxicity detected",
      "severity": "high",
      "userId": "60d5ec49f1b2c8b5e8f8e8e9",
      "timestamp": "2025-02-15T10:30:00Z"
    }
  ]
}
```

---

### **4. Community Endpoints**

#### **POST /api/recommendations**
Create new recommendation (requires Full-Access phase).

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "title": "Great Meditation App",
  "description": "Helped me with anxiety!",
  "category": "Apps"
}
```

**Response (201):**
```json
{
  "message": "Recommendation created successfully",
  "recommendation": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "title": "Great Meditation App",
    "description": "Helped me with anxiety!",
    "category": "Apps",
    "author": {
      "id": "60d5ec49f1b2c8b5e8f8e8e9",
      "name": "John Doe"
    },
    "createdAt": "2026-02-15T10:30:00Z"
  }
}
```

**Validation:**
- User must have phase = "full-access"
- Content runs through toxicity detection
- Blocked if toxic (returns 403 with reason)

---

#### **POST /api/events**
Create community event (requires Full-Access phase).

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "title": "Group Meditation Session",
  "description": "Join us for a relaxing meditation",
  "date": "2026-03-01",
  "time": "18:00",
  "location": "Zoom Link: https://zoom.us/j/123456789"
}
```

**Response (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "title": "Group Meditation Session",
    "date": "2026-03-01",
    "time": "18:00",
    "host": {
      "id": "60d5ec49f1b2c8b5e8f8e8e9",
      "name": "John Doe"
    }
  }
}
```

---

#### **POST /api/chat/messages**
Send message in community chat (requires Full-Access phase).

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "message": "Looking forward to the meditation event!"
}
```

**Response (201):**
```json
{
  "message": "Message sent successfully",
  "chatMessage": {
    "id": "60d5ec49f1b2c8b5e8f8e8e8",
    "content": "Looking forward to the meditation event!",
    "sender": {
      "id": "60d5ec49f1b2c8b5e8f8e8e9",
      "name": "John Doe"
    },
    "timestamp": "2026-02-15T10:30:00Z"
  }
}
```

**Toxicity Filtering:**
- Runs message through toxicity detection before saving
- If toxic, returns `403 Forbidden` with alert details:
  ```json
  {
    "error": "Message blocked due to toxic content",
    "severity": "high",
    "reason": "Severe toxicity detected: Contains hate speech"
  }
  ```

---

## Database Schemas

### **User Schema**

```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (hashed with bcrypt, required if not OAuth),
  googleId: String (optional, for OAuth users),
  age: Number (required, min: 13),
  guardianEmail: String (required if age < 18),
  
  // Progressive Trust Metrics
  readinessScore: Number (default: 0, calculated field),
  phase: String (enum: ["ai-only", "micro-therapy", "community-readonly", "full-access"], default: "ai-only"),
  
  // Engagement Tracking
  chatSessions: Number (default: 0, max: 6 for scoring),
  adoptedTherapies: [String] (array of therapy types: ["audio", "physical", "laughing", "reading"]),
  engagementDays: Number (default: 0, updated via cron or manual tracking),
  moodAssessments: [
    {
      score: Number (1-5 scale),
      timestamp: Date
    }
  ],
  communityReputation: Number (default: 10, range: 0-10),
  
  // Timestamps
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

**Indexes:**
- `email`: Unique index for fast lookups
- `googleId`: Index for OAuth users

---

### **FlaggedContent Schema**

```javascript
{
  userId: ObjectId (ref: "User", required),
  contentType: String (enum: ["chat", "recommendation", "event"], required),
  content: String (required, the flagged text),
  reason: String (required, e.g., "Severe toxicity detected"),
  severity: String (enum: ["low", "medium", "high"], required),
  timestamp: Date (default: Date.now)
}
```

---

### **Recommendation Schema**

```javascript
{
  title: String (required),
  description: String (required),
  category: String (required, e.g., "Apps", "Books", "Techniques"),
  author: {
    id: ObjectId (ref: "User"),
    name: String
  },
  createdAt: Date (default: Date.now)
}
```

---

### **Event Schema**

```javascript
{
  title: String (required),
  description: String (required),
  date: String (required, format: "YYYY-MM-DD"),
  time: String (required, format: "HH:MM"),
  location: String (required, can be URL for virtual events),
  host: {
    id: ObjectId (ref: "User"),
    name: String
  },
  createdAt: Date (default: Date.now)
}
```

---

### **ChatMessage Schema**

```javascript
{
  content: String (required),
  sender: {
    id: ObjectId (ref: "User"),
    name: String
  },
  timestamp: Date (default: Date.now)
}
```

---

## 3D Mascot Architecture (Amy)

The core distinguishing feature of Serenity AI is "Amy" — a real-time, 3D interactive avatar. Her architecture is built on a specialized rendering and animation stack that synchronizes with Google's Gemini Multimodal Live API.

### **Rendering Stack**
- **Three.js Canvas**: The fundamental WebGL rendering context.
- **@pixiv/three-vrm**: An extension for Three.js that parses and renders `.vrm` files (a 3D avatar standard based on glTF).
- **GSAP**: Handles fluid interpolation between animation states (e.g., smoothly transitioning an arm from "resting" to "waving").

### **Component Breakdown (`src/components/Mascot`)**
1. **`MascotScene.tsx`**: The React entry point. It initializes the Three.js `<canvas>`, mounts the camera, handles lighting, and delegates the render loop to `MascotController`.
2. **`MascotController.ts`**: The "brain" of the visual representation. It:
   - Loads the `models/waifu.vrm` file.
   - Updates the physics simulation (hair/clothing sway) via `vrm.update()` on every frame.
   - Exposes public methods to trigger animations (e.g., `playAnimation('wave')`, `setExpression('happy')`).
3. **`MascotAnimations.ts`**: A library of predefined skeletal poses and facial expressions (Blendshapes).
   - **Blendshapes**: Controls facial geometry like `Relaxed`, `Neutral`, `Joy`, `Sorrow`, `Angry`, and lip-sync shapes (`Aa`, `Ih`, `Ou`, `Ee`, `Oh`).
   - **Bone Rotations**: Controls skeletal nodes like `rightShoulder`, `leftUpperArm`, `neck`, etc., to create poses (waving, shrugging, thinking).

### **Voice and Lip-Sync Integration**
When using the Gemini Live API via WebSockets (`ChatWithPulse.tsx`):
1. User speaks into the microphone -> send PCM audio buffer to Gemini via WebSocket.
2. Gemini processes the audio and streams back an audio response + text.
3. As the audio plays via the Web Audio API, the system can extract volume data or rely on AI-provided text cues to trigger corresponding `MascotController` methods, animating her mouth and facial expressions in real-time.

---

## Frontend Architecture

### **Component Hierarchy**

```
App.tsx (Routes)
├── Home.tsx
│   ├── DotGrid.tsx (GSAP Animated background)
│   └── Typewriter.tsx (Animated text)
├── SignUp.tsx
│   ├── GoogleOAuthButton.tsx
│   └── AgeVerificationModal (conditional)
├── Login.tsx
│   └── GoogleOAuthButton.tsx
├── ProfilePage.tsx
│   ├── ReadinessMeter (4-phase staircase UI)
│   └── Engagement stats display
├── MascotPage.tsx
│   ├── MascotScene.tsx (Three.js Canvas)
│   └── ChatWithPulse.tsx (src/features/chat/)
│       ├── Voice input button (WebSocket)
│       └── Gemini API integration
├── MoodAssessmentPage.tsx
│   ├── MoodAssessment.tsx (5-question form)
│   └── AI recommendation display
├── Services.tsx
│   └── Therapy cards (Audio, Physical, Laughing, Reading)
├── AudioTherapy.tsx, PhysicalTherapy.tsx, LaughingTherapy.tsx, ReadingTherapy.tsx
│   └── Therapy adoption tracking
├── Recommendations.tsx
│   ├── Recommendation feed (read-only for Phase 3)
│   └── CreateRecommendation.tsx (Phase 4 only)
├── CreateEvent.tsx (Phase 4 only)
│   └── Event form
├── DoctorConsultation.tsx
│   └── Professional support UI
└── (Other pages...)
```

### **State Management**

**AuthContext** (`src/context/AuthContext.tsx`):
```typescript
interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

// Stored in localStorage:
// - "token": JWT token
// - "user": Serialized user object
```

**Local Component State:**
- Each page manages own loading states, form inputs
- No global state library (Redux, Zustand) used
- Simple prop drilling for small components

### **Routing Protection**

All routes protected via:
```tsx
{isLoggedIn ? <ProtectedRoute /> : <Navigate to="/login" />}
```

### **Real-Time Readiness Updates**

**Polling Mechanism:**
```typescript
// In ProfilePage.tsx
useEffect(() => {
  const fetchReadiness = async () => {
    const response = await axios.get('/api/user/readiness', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setReadiness(response.data);
  };

  fetchReadiness(); // Initial fetch
  const interval = setInterval(fetchReadiness, 10000); // Poll every 10 seconds
  
  // Also refresh on visibility change (tab focus)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchReadiness();
  });

  return () => clearInterval(interval);
}, []);
```

---

## Backend Architecture

### **Middleware Stack**

```javascript
app.use(cors());                    // Enable CORS for all origins (dev)
app.use(express.json());            // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', protect, userRoutes);       // All user routes require JWT
app.use('/api/moderation', protect, moderationRoutes);
app.use('/api', protect, communityRoutes);       // recommendations, events, chat
```

### **JWT Verification Middleware**

```javascript
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password'); // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### **MongoDB Connection**

```javascript
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));
```

---

## Toxicity Prevention System

### **Architecture**

```
User Input → Frontend → Backend API → Toxicity Detector → Decision
                                              ↓
                                        [Allow] or [Block]
                                              ↓
                                    [Flag in DB] (if blocked)
                                              ↓
                                    [Reduce Reputation]
```

### **Keyword-Based Detection (Current)**

**Implementation:**
```javascript
const toxicKeywords = {
  severe: ['kill yourself', 'kys', 'suicide', 'die', 'harm yourself'],
  high: ['hate', 'idiot', 'stupid', 'dumb', 'loser', 'ugly'],
  medium: ['annoying', 'weird', 'boring', 'lame']
};

function detectToxicity(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of toxicKeywords.severe) {
    if (lowerMessage.includes(keyword)) {
      return { toxic: true, severity: 'high', reason: `Severe toxicity detected: Contains "${keyword}"` };
    }
  }
  
  for (const keyword of toxicKeywords.high) {
    if (lowerMessage.includes(keyword)) {
      return { toxic: true, severity: 'medium', reason: `High toxicity detected: Contains "${keyword}"` };
    }
  }
  
  for (const keyword of toxicKeywords.medium) {
    if (lowerMessage.includes(keyword)) {
      return { toxic: true, severity: 'low', reason: `Medium toxicity detected: Contains "${keyword}"` };
    }
  }
  
  return { toxic: false };
}
```

**Limitations:**
- No context awareness (e.g., "I hate feeling anxious" is flagged)
- Easy to bypass with leetspeak or misspellings
- No sentiment analysis

**Future Enhancement:**
- Integrate Google Perspective API or similar ML model
- Context-aware detection
- Multi-language support

### **Blocking & Flagging**

**Process:**
1. User submits message/recommendation/event
2. Backend runs toxicity detection
3. If toxic:
   - Return `403 Forbidden` to frontend
   - Create FlaggedContent document
   - Reduce user's communityReputation by 2
   - Update user's phase if reputation drops below threshold
4. If clean:
   - Save to database
   - Return success response

**Frontend Handling:**
```typescript
try {
  await axios.post('/api/chat/messages', { message });
  // Success
} catch (error) {
  if (error.response?.status === 403) {
    alert(`⚠️ Message Blocked\n${error.response.data.reason}`);
  }
}
```

---

## Authentication Flow

### **Email/Password Signup**

```
User fills form → POST /api/auth/signup
                      ↓
                [Validate input]
                      ↓
                [Hash password with bcrypt]
                      ↓
                [Create User document]
                      ↓
                [Generate JWT token]
                      ↓
                [Return token + user object]
                      ↓
Frontend stores token in localStorage → Redirect to Profile
```

### **Google OAuth Flow**

```
User clicks "Login with Google" → Google OAuth popup
                                        ↓
                                  [User grants permission]
                                        ↓
                                  [Google returns ID token]
                                        ↓
Frontend sends token to POST /api/auth/google
                                        ↓
                              [Verify token with Google]
                                        ↓
                              [Extract email, name]
                                        ↓
                              [Find or create User]
                                        ↓
                              [Generate JWT token]
                                        ↓
                              [Return token + user object]
                                        ↓
Frontend stores token in localStorage → Redirect to Profile
```

**Security:**
- JWT tokens expire after 7 days (`expiresIn: '7d'`)
- Passwords hashed with bcrypt (salt rounds: 10)
- Google OAuth verified server-side using `google-auth-library`

---

## Readiness Calculation Algorithm

### **Full Implementation**

```javascript
async function calculateReadiness(user) {
  // 1. Chat Sessions (30% max)
  const chatScore = Math.min(user.chatSessions * 5, 30);
  
  // 2. Therapy Adoption (25% max)
  const therapyScore = user.adoptedTherapies.length * 6.25; // 4 types * 6.25 = 25
  
  // 3. Engagement Days (20% max)
  // Logarithmic growth to reward consistent engagement
  const daysScore = Math.min(20, 10 * Math.log10((user.engagementDays || 0) + 1));
  
  // 4. Mood Stability (15% max)
  let moodScore = 0;
  if (user.moodAssessments.length > 0) {
    const avgMood = user.moodAssessments.reduce((sum, a) => sum + a.score, 0) / user.moodAssessments.length;
    moodScore = (avgMood / 5) * 15; // Normalize 1-5 scale to 0-15
  }
  
  // 5. Community Reputation (10% max)
  const reputationScore = Math.max(0, Math.min(10, user.communityReputation));
  
  // Total Score
  const totalScore = chatScore + therapyScore + daysScore + moodScore + reputationScore;
  
  // Determine Phase
  let phase;
  if (totalScore < 10) phase = "ai-only";
  else if (totalScore < 40) phase = "micro-therapy";
  else if (totalScore < 70) phase = "community-readonly";
  else phase = "full-access";
  
  // Update user in database
  await User.findByIdAndUpdate(user._id, {
    readinessScore: totalScore,
    phase: phase
  });
  
  return {
    readinessScore: totalScore,
    phase: phase,
    breakdown: {
      chatSessions: chatScore,
      therapyAdoption: therapyScore,
      engagementDays: daysScore,
      moodStability: moodScore,
      communityReputation: reputationScore
    }
  };
}
```

### **Example Calculation**

**User Profile:**
- `chatSessions`: 4
- `adoptedTherapies`: ["audio", "physical"]
- `engagementDays`: 10
- `moodAssessments`: [{ score: 4 }, { score: 5 }, { score: 3 }]
- `communityReputation`: 10

**Calculation:**
```javascript
chatScore = 4 * 5 = 20
therapyScore = 2 * 6.25 = 12.5
daysScore = 10 * Math.log10(10 + 1) = 10 * 1.041 = 10.41
avgMood = (4 + 5 + 3) / 3 = 4
moodScore = (4 / 5) * 15 = 12
reputationScore = 10

totalScore = 20 + 12.5 + 10.41 + 12 + 10 = 64.91
phase = "community-readonly" (since 64.91 is between 40 and 70)
```

**Next Milestone:**
- Required for Full-Access: 70 points
- Points needed: 70 - 64.91 = 5.09 points
- Suggestions: Complete 1 more chat session (5 points) OR visit 1 more therapy type (6.25 points)

---

## 🚀 Performance Considerations

- **Database Queries**: Indexed on email and googleId for fast lookups
- **JWT Tokens**: Stateless, no database lookup on every request (only on `/api/user/readiness`)
- **Frontend Polling**: 10-second interval prevents excessive API calls
- **Readiness Calculation**: Real-time calculation on request (no caching yet, could be optimized with Redis)

---

## 🛡️ Security Best Practices

- ✅ Passwords hashed with bcrypt (never stored plaintext)
- ✅ JWT tokens signed with strong secret (32+ bytes)
- ✅ CORS enabled (restrict in production to specific origins)
- ✅ MongoDB credentials in environment variables
- ✅ Input validation on all endpoints
- ❌ **Not implemented yet**: Rate limiting, HTTPS enforcement, helmet.js

---

## 📊 Future Architecture Enhancements

1. **Redis Caching**: Cache readiness scores for 1-minute TTL
2. **ML Toxicity Detection**: Replace keyword matching with Perspective API
3. **Microservices**: Separate auth, chat, and recommendation services
4. **CDN for Static Assets**: Optimize therapy media delivery
5. **Analytics Pipeline**: Track user journeys for insights

---

## 📧 Questions?

Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines or contact **Karthik B** at karthik.b.college@gmail.com.

**Built with 💙 for project 2026**
