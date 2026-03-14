# Serenity AI - Project Requirements & Setup Guide

This document outlines the system requirements, dependencies, and setup instructions necessary to run the Serenity AI project locally.

## Prerequisites

Before setting up the project, ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: v2.30.0 or higher
- **MongoDB Database**: Either a local MongoDB instance or a remote MongoDB Atlas cluster.

## Dependencies

The project is split into a frontend (React/Vite) and a backend (Node.js/Express) application.

### Frontend Dependencies (`package.json`)
The frontend is built with React, Vite, and several specialized libraries for 3D rendering and animations.
- `react`, `react-dom`
- `react-router-dom` (Routing)
- `tailwindcss`, `postcss`, `autoprefixer` (Styling)
- `lucide-react` (Icons)
- `@google/generative-ai` (Gemini API Integration)
- `axios` (HTTP Client)
- `three` (WebGL 3D Rendering)
- `@pixiv/three-vrm` (VRM Avatar Parsing/Rendering)
- `gsap` (Complex UI Animations, DotGrid)
- `framer-motion` (Page transitions)

### Backend Dependencies (`server/package.json`)
The backend provides authentication, tracking, and serves as a WebSocket proxy for the Gemini Live API.
- `express` (Web Server)
- `mongoose` (MongoDB Object Modeling)
- `jsonwebtoken` (Auth Tokens)
- `bcryptjs` (Password Hashing)
- `google-auth-library` (OAuth Verification)
- `cors`, `dotenv` (Middleware/Config)
- `ws` (WebSocket Server for Voice Proxy)
- `@google/generative-ai` (Gemini API)

## Environment Variables Configuration

The application requires specific API keys and credentials to function properly. 
Copy the provided `.env.example` file and rename it to `.env` in the root directory.

### Required Keys:
1. **Google Gemini API Keys**
   - Head to [Google AI Studio](https://aistudio.google.com/) to generate API keys.
   - You need keys for standard text generation (`VITE_GOOGLE_AI_API_KEY`), fallback keys for handling rate limits (`VITE_FALLBACK_API_KEYS`), and a key for the WebSocket live voice API (`LIVE_API_KEY`).
2. **Google OAuth Credentials**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/).
   - Set up an OAuth Consent Screen and create Web Application Credentials.
   - Add the Client ID and Client Secret to the `.env` file.
3. **MongoDB Connection String**
   - Get a connection URI from your MongoDB Atlas dashboard or local instance. Example: `mongodb+srv://<user>:<password>@cluster.mongodb.net/serenityai`
4. **JWT Password**
   - Provide a strong, random string for `JWT_SECRET`.

## Local Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/ankeshpatra/SerenityAI.git
   cd SerenityAI
   # or the specific directory if it was cloned into a subfolder:
   cd Clean_PulseMind
   ```

2. **Install Frontend Dependencies**
   ```bash
   # From the root application directory
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure Environment Variables**
   - Check the `Environment Variables Configuration` section above. Create `.env` and fill out the keys.

5. **Start the Development Servers**
   You will need two separate terminal windows.

   **Terminal 1 (Backend Server):**
   ```bash
   # From the root directory
   node server/server.js
   # Server should run on port 5000
   ```

   **Terminal 2 (Frontend Client):**
   ```bash
   # From the root directory
   npm run dev
   # Vite server should run on port 5173
   ```

6. **Access the Application**
   - Open your browser and navigate to `http://localhost:5173/`

## Troubleshooting

- **MongoDB Connection Error**: Ensure your IP address is whitelisted in your MongoDB Atlas Network Access settings.
- **Gemini API 429 Errors**: The application uses a fallback key system. If rate limits persist, consider upgrading your Google AI Studio quota or slowing down request frequency.
- **Mascot (Amy) Fails to Load**: Ensure the file `models/waifu.vrm` exists in the frontend `public` directory.
- **Microphone Access Denied**: The chat and voice features require microphone permissions. Ensure your browser is allowing microphone access for `localhost`.
