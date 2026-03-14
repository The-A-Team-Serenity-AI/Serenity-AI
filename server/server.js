import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'VITE_GOOGLE_OAUTH_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_OAUTH_CLIENT_ID);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean).map(origin => origin.replace(/\/$/, ''));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.indexOf(normalizedOrigin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Email Service Configuration (using Gmail for now, can be changed to SendGrid/AWS SES)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'Serenity AI.noreply@gmail.com',
    pass: process.env.EMAIL_PASSWORD // App password for Gmail
  }
});

// Email sending helper function
async function sendGuardianVerificationEmail(guardianEmail, childUsername, childEmail, verificationToken) {
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verificationLink = `${frontendBase}/guardian/verify/${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'Serenity AI.noreply@gmail.com',
    to: guardianEmail,
    subject: 'Guardian Consent Required - Serenity AI Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4A90E2;">Serenity AI - Guardian Consent Required</h2>
        <p>Hello,</p>
        <p>A minor has registered for a Serenity AI account and listed you as their guardian:</p>
        <ul>
          <li><strong>Username:</strong> ${childUsername}</li>
          <li><strong>Email:</strong> ${childEmail}</li>
        </ul>
        <p>Serenity AI is a mental wellness platform designed to help individuals track and improve their mental health through AI support, therapy recommendations, and community engagement.</p>
        <p><strong>Your approval is required before this account can be activated.</strong></p>
        <p>Please click the button below to review and approve or deny this request:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4A90E2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Consent Request
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">This link will expire in 7 days. If you did not expect this email, please ignore it.</p>
        <p style="color: #666; font-size: 12px;">Link: ${verificationLink}</p>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Guardian verification email sent to ${guardianEmail}`);
  } catch (error) {
    console.error('❌ Error sending guardian verification email:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  password: { type: String, required: true },
  googleId: { type: String }, // Optional Google ID for OAuth users
  avatar: { type: String }, // Optional avatar URL from Google
  createdAt: { type: Date, default: Date.now },

  // Progressive Trust Ladder fields
  readinessScore: { type: Number, default: 0, min: 0, max: 100 },
  communityReadyDate: { type: Date },
  currentPhase: {
    type: String,
    enum: ['ai-only', 'micro-therapy', 'community-readonly', 'full-access'],
    default: 'ai-only'
  },
  sessionCount: { type: Number, default: 0 },
  lastSessionDate: { type: Date },
  moodStabilityScore: { type: Number, default: 0 }, // Variance measure
  therapyAdoptionCount: { type: Number, default: 0 },
  engagementDays: { type: Number, default: 0 },

  // Guardian consent (for minors)
  isMinor: { type: Boolean, default: false },
  guardianEmail: { type: String },
  guardianConsent: { type: Boolean, default: false },
  guardianConsentDate: { type: Date },
  guardianVerificationToken: { type: String },
  guardianVerificationExpiry: { type: Date },
  accountActivated: { type: Boolean, default: true }, // False for minors pending approval

  // Reputation & Safety
  reputationScore: { type: Number, default: 50, min: 0, max: 100 },
  toxicityFlags: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
  isShadowBanned: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Recommendation Schema
const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sport: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  maxParticipants: { type: Number, required: true },
  currentParticipants: { type: Number, default: 0 },
  location: { type: String, required: true },
  status: { type: String, enum: ['open', 'full', 'cancelled'], default: 'open' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Event Participant Schema
const eventParticipantSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const EventParticipant = mongoose.model('EventParticipant', eventParticipantSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  type: { type: String, enum: ['join_request', 'request_accepted', 'request_rejected'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Flagged Content Schema (for toxicity moderation)
const flaggedContentSchema = new mongoose.Schema({
  contentType: { type: String, enum: ['message', 'recommendation', 'event', 'comment'], required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  toxicityScore: { type: Number, default: 0, min: 0, max: 1 }, // 0-1 from classifier
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'removed', 'false_positive'],
    default: 'pending'
  },
  moderatorAction: { type: String },
  moderatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flaggedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date }
});

const FlaggedContent = mongoose.model('FlaggedContent', flaggedContentSchema);

// Guardian Consent Request Schema
const guardianConsentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childUsername: { type: String, required: true },
  childEmail: { type: String, required: true },
  childAge: { type: Number },
  guardianEmail: { type: String, required: true },
  verificationToken: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'expired'],
    default: 'pending'
  },
  approvedAt: { type: Date },
  deniedAt: { type: Date },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const GuardianConsent = mongoose.model('GuardianConsent', guardianConsentSchema);

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT verified successfully")
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      throw new Error('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, city, password, isMinor, guardianEmail, age } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    // Create user with guardian fields if minor
    const userData = {
      username,
      email,
      city,
      password: hashedPassword,
      isMinor: isMinor || false,
      guardianEmail: isMinor ? guardianEmail : undefined,
      accountActivated: !isMinor // Minors need guardian approval first
    };

    const user = new User(userData);
    await user.save();
    console.log('✅ User created successfully:', { email, isMinor });

    if (isMinor && guardianEmail) {
      // ... (rest same, omitting for brevity in chunk but ensuring consistency)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

      const consentRequest = new GuardianConsent({
        userId: user._id,
        childUsername: username,
        childEmail: email,
        childAge: age,
        guardianEmail: guardianEmail,
        verificationToken: verificationToken,
        expiresAt: expiresAt
      });
      await consentRequest.save();

      user.guardianVerificationToken = verificationToken;
      user.guardianVerificationExpiry = expiresAt;
      await user.save();

      try {
        await sendGuardianVerificationEmail(guardianEmail, username, email, verificationToken);
        return res.status(201).json({
          user,
          message: 'Account created. Verification email sent to guardian.',
          requiresGuardianApproval: true
        });
      } catch (emailError) {
        console.error('❌ Failed to send guardian email:', emailError);
        return res.status(500).json({ error: 'Failed to send guardian email' });
      }
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('❌ Signup error full stack:', error);
    res.status(400).json({ error: error.message || 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', { email: req.body.email });
    const { email, password } = req.body;


    const user = await User.findOne({ email });

    if (!user) {
      console.log('User not found:', { email });
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', { isMatch });

    if (!isMatch) {
      console.log('Invalid password for user:', { email });
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    // Check if account is activated (for minors pending guardian approval)
    if (!user.accountActivated) {
      console.log('Account not activated:', { email });
      return res.status(403).json({
        error: 'Your account is pending guardian approval. Please check with your guardian.',
        requiresGuardianApproval: true,
        guardianEmail: user.guardianEmail
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    console.log('Login successful:', { userId: user._id });

    // Return user data without password
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      city: user.city
    };

    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: 'Failed to login' });
  }
});

// Google OAuth Route
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    console.log('Google Auth attempt. Client ID config length:', process.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.length || 0);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.error('❌ Google Auth: Payload is empty');
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, picture, sub: googleId } = payload;
    console.log('Google Auth payload received for:', email);

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        username: name || 'Google User',
        email: email,
        city: 'Not specified',
        password: await bcrypt.hash(googleId, 8),
        googleId: googleId,
        avatar: picture,
        accountActivated: true // Google users don't need minor-verification for now
      });
      await user.save();
      console.log('✅ New Google user created:', email);
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({
      user: { _id: user._id, username: user.username, email: user.email, city: user.city },
      token
    });
  } catch (error) {
    console.error('❌ Google Auth backend error stack:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// Get Current User
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Get User Readiness Status (Protected)
app.get('/api/user/readiness', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('readinessScore currentPhase sessionCount therapyAdoptionCount moodStabilityScore communityReadyDate engagementDays');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate next milestone
    let nextMilestone = '';
    let progressToNext = 0;

    switch (user.currentPhase) {
      case 'ai-only':
        nextMilestone = 'Complete Sentiscope assessment';
        progressToNext = user.sessionCount >= 2 ? 100 : (user.sessionCount / 2) * 100;
        break;
      case 'micro-therapy':
        nextMilestone = 'Try 2 recommended therapies';
        progressToNext = (user.therapyAdoptionCount / 2) * 100;
        break;
      case 'community-readonly':
        nextMilestone = 'Reach 70% readiness score';
        progressToNext = (user.readinessScore / 70) * 100;
        break;
      case 'full-access':
        nextMilestone = 'Maintain positive reputation';
        progressToNext = 100;
        break;
    }

    res.json({
      ...user.toObject(),
      nextMilestone,
      progressToNext: Math.min(progressToNext, 100)
    });
  } catch (error) {
    console.error('Error fetching readiness:', error);
    res.status(500).json({ error: 'Failed to fetch readiness' });
  }
});

// Track User Engagement (Protected)
app.post('/api/user/track-engagement', auth, async (req, res) => {
  try {
    const { action, data } = req.body; // action: 'session', 'therapy_adoption', 'assessment_complete'
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip tracking for admin account - maintain full access
    if (user.email === 'admin@Serenity AI.com') {
      return res.json({
        readinessScore: 100,
        currentPhase: 'full-access',
        message: 'Admin account - full access maintained'
      });
    }

    // Update engagement metrics
    const today = new Date().toDateString();
    const lastSession = user.lastSessionDate ? new Date(user.lastSessionDate).toDateString() : null;

    if (action === 'session') {
      user.sessionCount += 1;
      if (lastSession !== today) {
        user.engagementDays += 1;
      }
      user.lastSessionDate = new Date();
    }

    if (action === 'therapy_adoption') {
      user.therapyAdoptionCount += 1;
    }

    if (action === 'assessment_complete') {
      // Mood stability calculated from variance (passed in data)
      if (data && data.moodScore !== undefined) {
        user.moodStabilityScore = data.moodScore;
        console.log(`✅ Assessment complete - User: ${user.username}, Score: ${data.moodScore}, Current phase: ${user.currentPhase}`);
      }
    }

    // Recalculate readiness score
    const readiness = calculateReadinessScore(user);
    user.readinessScore = readiness;

    // Auto-advance phase based on readiness
    if (user.currentPhase === 'ai-only' && user.sessionCount >= 2 && user.moodStabilityScore !== undefined && user.moodStabilityScore !== null) {
      user.currentPhase = 'micro-therapy';
      console.log(`🎉 Phase advanced: ${user.username} → micro-therapy`);
    }

    if (user.currentPhase === 'micro-therapy' && user.therapyAdoptionCount >= 2 && user.engagementDays >= 3) {
      user.currentPhase = 'community-readonly';
    }

    if (user.currentPhase === 'community-readonly' && user.readinessScore >= 70 && user.toxicityFlags === 0) {
      user.currentPhase = 'full-access';
      user.communityReadyDate = new Date();
    }

    await user.save();

    res.json({
      readinessScore: user.readinessScore,
      currentPhase: user.currentPhase,
      message: 'Engagement tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Helper function to calculate readiness score
function calculateReadinessScore(user) {
  let score = 0;

  // Session engagement (30 points max)
  score += Math.min((user.sessionCount / 5) * 30, 30);

  // Therapy adoption (25 points max)
  score += Math.min((user.therapyAdoptionCount / 3) * 25, 25);

  // Engagement days (20 points max)
  score += Math.min((user.engagementDays / 7) * 20, 20);

  // Mood stability (15 points max) - higher score = more stable
  score += Math.min((user.moodStabilityScore / 100) * 15, 15);

  // Reputation (10 points max)
  score += Math.min((user.reputationScore / 100) * 10, 10);

  // Penalty for toxicity
  score -= (user.toxicityFlags * 10);

  return Math.max(0, Math.min(score, 100));
}

// Get All Recommendations
app.get('/api/recommendations', async (req, res) => {
  try {
    const recommendations = await Recommendation.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Create Recommendation (Protected)
app.post('/api/recommendations', auth, async (req, res) => {
  try {
    const { type, title, description } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check toxicity in title and description
    const titleCheck = detectToxicity(title);
    const descCheck = detectToxicity(description);

    if (titleCheck.isToxic || descCheck.isToxic) {
      // Flag the content
      const flagged = new FlaggedContent({
        contentType: 'recommendation',
        contentId: req.user._id,
        userId: req.user._id,
        reason: 'Automated toxicity detection',
        toxicityScore: Math.max(titleCheck.score, descCheck.score)
      });
      await flagged.save();

      // Update user toxicity count
      const user = await User.findById(req.user._id);
      user.toxicityFlags += 1;
      user.reputationScore = Math.max(0, user.reputationScore - 10);

      if (user.toxicityFlags >= 3) {
        user.isShadowBanned = true;
      }

      await user.save();

      const flaggedWords = [...titleCheck.flaggedWords, ...descCheck.flaggedWords];
      return res.status(400).json({
        error: 'Post contains inappropriate content. Please review our community guidelines.',
        flaggedWords
      });
    }

    const recommendation = new Recommendation({
      userId: req.user._id,
      type,
      title,
      description
    });

    await recommendation.save();

    const populatedRecommendation = await Recommendation.findById(recommendation._id)
      .populate('userId', 'username email');

    res.status(201).json(populatedRecommendation);
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// Create Event (Protected)
app.post('/api/events', auth, async (req, res) => {
  try {
    const { sport, title, description, date, duration, maxParticipants, location } = req.body;

    if (!sport || !title || !description || !date || !duration || !maxParticipants || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check toxicity in title and description
    const titleCheck = detectToxicity(title);
    const descCheck = detectToxicity(description);

    if (titleCheck.isToxic || descCheck.isToxic) {
      // Flag the content
      const flagged = new FlaggedContent({
        contentType: 'event',
        contentId: req.user._id,
        userId: req.user._id,
        reason: 'Automated toxicity detection',
        toxicityScore: Math.max(titleCheck.score, descCheck.score)
      });
      await flagged.save();

      // Update user toxicity count
      const user = await User.findById(req.user._id);
      user.toxicityFlags += 1;
      user.reputationScore = Math.max(0, user.reputationScore - 10);

      if (user.toxicityFlags >= 3) {
        user.isShadowBanned = true;
      }

      await user.save();

      const flaggedWords = [...titleCheck.flaggedWords, ...descCheck.flaggedWords];
      return res.status(400).json({
        error: 'Event contains inappropriate content. Please review our community guidelines.',
        flaggedWords
      });
    }

    const event = new Event({
      creatorId: req.user._id,
      sport,
      title,
      description,
      date,
      duration,
      maxParticipants,
      location
    });

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('creatorId', 'username email');

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get All Events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creatorId', 'username email')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Join Event (Protected)
app.post('/api/events/:eventId/join', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'open') {
      return res.status(400).json({ error: 'Event is not open for joining' });
    }

    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if user is already a participant
    const existingParticipant = await EventParticipant.findOne({
      eventId: event._id,
      userId: req.user._id
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'You have already joined this event' });
    }

    // Create participant record
    const participant = new EventParticipant({
      eventId: event._id,
      userId: req.user._id
    });

    await participant.save();

    // Create notification for event creator
    const notification = new Notification({
      recipientId: event.creatorId,
      senderId: req.user._id,
      eventId: event._id,
      type: 'join_request',
      message: `${req.user.username} wants to join your event "${event.title}"`
    });

    await notification.save();

    res.status(201).json(participant);
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// Accept/Reject Participant (Protected)
app.put('/api/events/:eventId/participants/:participantId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to manage this event' });
    }

    const participant = await EventParticipant.findById(req.params.participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    participant.status = status;
    await participant.save();

    // Create notification for the participant
    const notification = new Notification({
      recipientId: participant.userId,
      senderId: req.user._id,
      eventId: event._id,
      type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
      message: status === 'accepted'
        ? `Your request to join "${event.title}" has been accepted!`
        : `Your request to join "${event.title}" has been rejected.`
    });

    await notification.save();

    // Update event participant count if accepted
    if (status === 'accepted') {
      event.currentParticipants += 1;
      if (event.currentParticipants >= event.maxParticipants) {
        event.status = 'full';
      }
      await event.save();
    }

    res.json(participant);
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

// Get User's Events (Protected)
app.get('/api/events/my-events', auth, async (req, res) => {
  try {
    const createdEvents = await Event.find({ creatorId: req.user._id })
      .populate('creatorId', 'username email')
      .sort({ date: 1 });

    const joinedEvents = await EventParticipant.find({ userId: req.user._id })
      .populate({
        path: 'eventId',
        populate: { path: 'creatorId', select: 'username email' }
      })
      .sort({ createdAt: -1 });

    res.json({
      created: createdEvents,
      joined: joinedEvents
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  }
});

// Get User's Notifications (Protected)
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .populate('senderId', 'username')
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark Notification as Read (Protected)
app.put('/api/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this notification' });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Like Event (Protected)
app.post('/api/events/:eventId/like', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const userId = req.user._id;

    // Remove from dislikes if present
    event.dislikes = event.dislikes.filter(id => id.toString() !== userId.toString());

    // Toggle like
    const likeIndex = event.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIndex > -1) {
      event.likes.splice(likeIndex, 1);
    } else {
      event.likes.push(userId);
    }

    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Error liking event:', error);
    res.status(500).json({ error: 'Failed to like event' });
  }
});

// Dislike Event (Protected)
app.post('/api/events/:eventId/dislike', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const userId = req.user._id;

    // Remove from likes if present
    event.likes = event.likes.filter(id => id.toString() !== userId.toString());

    // Toggle dislike
    const dislikeIndex = event.dislikes.findIndex(id => id.toString() === userId.toString());
    if (dislikeIndex > -1) {
      event.dislikes.splice(dislikeIndex, 1);
    } else {
      event.dislikes.push(userId);
    }

    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Error disliking event:', error);
    res.status(500).json({ error: 'Failed to dislike event' });
  }
});

// Like Recommendation (Protected)
app.post('/api/recommendations/:recommendationId/like', auth, async (req, res) => {
  try {
    const recommendation = await Recommendation.findById(req.params.recommendationId);

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const userId = req.user._id;

    // Remove from dislikes if present
    recommendation.dislikes = recommendation.dislikes.filter(id => id.toString() !== userId.toString());

    // Toggle like
    const likeIndex = recommendation.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIndex > -1) {
      recommendation.likes.splice(likeIndex, 1);
    } else {
      recommendation.likes.push(userId);
    }

    await recommendation.save();
    res.json(recommendation);
  } catch (error) {
    console.error('Error liking recommendation:', error);
    res.status(500).json({ error: 'Failed to like recommendation' });
  }
});

// Dislike Recommendation (Protected)
app.post('/api/recommendations/:recommendationId/dislike', auth, async (req, res) => {
  try {
    const recommendation = await Recommendation.findById(req.params.recommendationId);

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const userId = req.user._id;

    // Remove from likes if present
    recommendation.likes = recommendation.likes.filter(id => id.toString() !== userId.toString());

    // Toggle dislike
    const dislikeIndex = recommendation.dislikes.findIndex(id => id.toString() === userId.toString());
    if (dislikeIndex > -1) {
      recommendation.dislikes.splice(dislikeIndex, 1);
    } else {
      recommendation.dislikes.push(userId);
    }

    await recommendation.save();
    res.json(recommendation);
  } catch (error) {
    console.error('Error disliking recommendation:', error);
    res.status(500).json({ error: 'Failed to dislike recommendation' });
  }
});

// Get Chat Messages (Protected)
app.get('/api/chat/messages', auth, async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'username email')
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Toxicity Detection Helper (simple keyword-based, can integrate ML API later)
function detectToxicity(text) {
  // Expanded toxicity keywords with severity levels
  const highSeverity = [
    'kill yourself', 'kys', 'suicide', 'self harm', 'self-harm',
    'kill you', 'murder', 'rape', 'molest', 'pedophile'
  ];

  const mediumSeverity = [
    'hate you', 'hate them', 'stupid', 'idiot', 'moron', 'retard',
    'loser', 'worthless', 'pathetic', 'disgusting', 'trash', 'garbage',
    'die', 'death', 'threat', 'violence', 'harm', 'attack', 'beat up',
    'bully', 'abuse', 'racist', 'sexist', 'slur'
  ];

  const lowSeverity = [
    'dumb', 'ugly', 'fat', 'annoying', 'shut up', 'go away',
    'nobody likes you', 'hate this', 'sucks', 'terrible'
  ];

  const lowercaseText = text.toLowerCase();
  let score = 0;
  let flaggedWords = [];

  // Check high severity (0.8 per match)
  for (const keyword of highSeverity) {
    if (lowercaseText.includes(keyword)) {
      score += 0.8;
      flaggedWords.push(keyword);
    }
  }

  // Check medium severity (0.4 per match)
  for (const keyword of mediumSeverity) {
    if (lowercaseText.includes(keyword)) {
      score += 0.4;
      flaggedWords.push(keyword);
    }
  }

  // Check low severity (0.2 per match)
  for (const keyword of lowSeverity) {
    if (lowercaseText.includes(keyword)) {
      score += 0.2;
      flaggedWords.push(keyword);
    }
  }

  return {
    isToxic: score >= 0.5,
    score: Math.min(score, 1),
    flaggedWords
  };
}

// Send Chat Message with Toxicity Check (Protected)
app.post('/api/chat/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    // Check toxicity
    const toxicityCheck = detectToxicity(message);

    if (toxicityCheck.isToxic) {
      // Flag the content
      const flagged = new FlaggedContent({
        contentType: 'message',
        contentId: req.user._id, // Temp ID before message created
        userId: req.user._id,
        reason: 'Automated toxicity detection',
        toxicityScore: toxicityCheck.score
      });
      await flagged.save();

      // Update user toxicity count
      const user = await User.findById(req.user._id);
      user.toxicityFlags += 1;
      user.reputationScore = Math.max(0, user.reputationScore - 10);

      if (user.toxicityFlags >= 3) {
        user.isShadowBanned = true;
      }

      await user.save();

      return res.status(400).json({
        error: 'Message contains inappropriate content. Please review our community guidelines.',
        flaggedWords: toxicityCheck.flaggedWords
      });
    }

    const chatMessage = new ChatMessage({
      userId: req.user._id,
      message: message.trim()
    });

    await chatMessage.save();
    await chatMessage.populate('userId', 'username email');

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Flag Content Manually (Protected)
app.post('/api/moderation/flag', auth, async (req, res) => {
  try {
    const { contentType, contentId, reason } = req.body;

    const flagged = new FlaggedContent({
      contentType,
      contentId,
      userId: req.user._id,
      reason,
      toxicityScore: 0.5 // Manual flag = moderate severity
    });

    await flagged.save();
    res.status(201).json({ message: 'Content flagged for review', flagId: flagged._id });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

// Get Moderation Queue (Admin only - simplified auth for demo)
app.get('/api/moderation/queue', auth, async (req, res) => {
  try {
    const flagged = await FlaggedContent.find({ status: 'pending' })
      .populate('userId', 'username email')
      .sort({ flaggedAt: -1 })
      .limit(50);

    res.json(flagged);
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Update User Reputation (Protected)
app.post('/api/user/reputation', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'positive' or 'negative'
    const user = await User.findById(req.user._id);

    if (action === 'positive') {
      user.reputationScore = Math.min(100, user.reputationScore + 5);
    } else if (action === 'negative') {
      user.reputationScore = Math.max(0, user.reputationScore - 10);
      user.warningCount += 1;
    }

    await user.save();
    res.json({ reputationScore: user.reputationScore });
  } catch (error) {
    console.error('Error updating reputation:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
});

// ============================================
// GUARDIAN VERIFICATION ENDPOINTS
// ============================================

// Get Guardian Consent Request Details
app.get('/api/guardian/consent/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    });

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Check if expired
    if (new Date() > consentRequest.expiresAt) {
      consentRequest.status = 'expired';
      await consentRequest.save();
      return res.status(410).json({ error: 'Verification link has expired' });
    }

    res.json({
      childUsername: consentRequest.childUsername,
      childEmail: consentRequest.childEmail,
      childAge: consentRequest.childAge,
      guardianEmail: consentRequest.guardianEmail,
      createdAt: consentRequest.createdAt,
      expiresAt: consentRequest.expiresAt
    });
  } catch (error) {
    console.error('Error fetching consent request:', error);
    res.status(500).json({ error: 'Failed to fetch consent request' });
  }
});

// Approve Guardian Consent
app.post('/api/guardian/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    });

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Check if expired
    if (new Date() > consentRequest.expiresAt) {
      consentRequest.status = 'expired';
      await consentRequest.save();
      return res.status(410).json({ error: 'Verification link has expired' });
    }

    // Activate user account
    const user = await User.findById(consentRequest.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.accountActivated = true;
    user.guardianConsent = true;
    user.guardianConsentDate = new Date();
    await user.save();

    // Update consent request
    consentRequest.status = 'approved';
    consentRequest.approvedAt = new Date();
    await consentRequest.save();

    console.log(`✅ Guardian approved account for ${consentRequest.childUsername}`);

    res.json({
      message: 'Account approved successfully',
      childUsername: consentRequest.childUsername
    });
  } catch (error) {
    console.error('Error approving account:', error);
    res.status(500).json({ error: 'Failed to approve account' });
  }
});

// Deny Guardian Consent
app.post('/api/guardian/deny/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    });

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Update consent request
    consentRequest.status = 'denied';
    consentRequest.deniedAt = new Date();
    await consentRequest.save();

    console.log(`❌ Guardian denied account for ${consentRequest.childUsername}. Reason: ${reason || 'No reason provided'}`);

    res.json({
      message: 'Account request denied',
      childUsername: consentRequest.childUsername
    });
  } catch (error) {
    console.error('Error denying account:', error);
    res.status(500).json({ error: 'Failed to deny account' });
  }
});

// ============================================
// ADMIN PANEL ENDPOINTS
// ============================================



// ==================== GUARDIAN VERIFICATION ENDPOINTS ====================

// Get guardian consent request details (for guardian review page)
app.get('/api/guardian/consent/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    }).populate('userId', 'username email createdAt');

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Check if expired
    if (new Date() > consentRequest.expiresAt) {
      consentRequest.status = 'expired';
      await consentRequest.save();
      return res.status(410).json({ error: 'Verification link has expired' });
    }

    res.json({
      childUsername: consentRequest.childUsername,
      childEmail: consentRequest.childEmail,
      childAge: consentRequest.childAge,
      guardianEmail: consentRequest.guardianEmail,
      createdAt: consentRequest.createdAt,
      expiresAt: consentRequest.expiresAt
    });
  } catch (error) {
    console.error('Error fetching consent request:', error);
    res.status(500).json({ error: 'Failed to fetch consent request' });
  }
});

// Approve guardian consent
app.post('/api/guardian/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    });

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Check if expired
    if (new Date() > consentRequest.expiresAt) {
      consentRequest.status = 'expired';
      await consentRequest.save();
      return res.status(410).json({ error: 'Verification link has expired' });
    }

    // Update consent request
    consentRequest.status = 'approved';
    consentRequest.approvedAt = new Date();
    await consentRequest.save();

    // Update user account
    const user = await User.findById(consentRequest.userId);
    if (user) {
      user.guardianConsent = true;
      user.guardianConsentDate = new Date();
      user.accountActivated = true;
      user.guardianVerificationToken = undefined; // Clear token
      user.guardianVerificationExpiry = undefined;
      await user.save();

      console.log(`✅ Guardian approved account for ${user.username} (${user.email})`);
    }

    res.json({
      message: 'Account approved successfully',
      childUsername: consentRequest.childUsername
    });
  } catch (error) {
    console.error('Error approving consent:', error);
    res.status(500).json({ error: 'Failed to approve consent' });
  }
});

// Deny guardian consent
app.post('/api/guardian/deny/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const consentRequest = await GuardianConsent.findOne({
      verificationToken: token,
      status: 'pending'
    });

    if (!consentRequest) {
      return res.status(404).json({ error: 'Consent request not found or already processed' });
    }

    // Update consent request
    consentRequest.status = 'denied';
    consentRequest.deniedAt = new Date();
    await consentRequest.save();

    // Update user account (keep it deactivated)
    const user = await User.findById(consentRequest.userId);
    if (user) {
      user.accountActivated = false;
      user.guardianVerificationToken = undefined; // Clear token
      user.guardianVerificationExpiry = undefined;
      await user.save();

      console.log(`❌ Guardian denied account for ${user.username} (${user.email}). Reason: ${reason || 'No reason provided'}`);
    }

    res.json({
      message: 'Account request denied',
      childUsername: consentRequest.childUsername
    });
  } catch (error) {
    console.error('Error denying consent:', error);
    res.status(500).json({ error: 'Failed to deny consent' });
  }
});

// Check if user account is activated (for login validation)
app.post('/api/auth/check-activation', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.accountActivated) {
      return res.status(403).json({
        error: 'Account pending guardian approval',
        requiresGuardianApproval: true,
        guardianEmail: user.guardianEmail
      });
    }

    res.json({ activated: true });
  } catch (error) {
    console.error('Error checking activation:', error);
    res.status(500).json({ error: 'Failed to check activation status' });
  }
});

// ============================================
// MASCOT CHAT ENDPOINT (Serenity AI)
// Dual-key fallback: tries mascot key first, then vite key
// ============================================

const mascotApiKey = process.env.MASCOT_GEMINI_API_KEY;
const viteApiKey = process.env.VITE_GOOGLE_AI_API_KEY;
const apiKeys = [mascotApiKey, viteApiKey].filter(Boolean);
console.log(`🤖 Mascot API keys loaded: ${apiKeys.length} key(s)`);

// Create GenAI instances for each key
const genAIInstances = apiKeys.map(key => new GoogleGenerativeAI(key));

const SERENITY_SYSTEM_PROMPT = `You are Amy, a cute anime-style AI wellness companion for Serenity AI.
You are warm, playful, and emotionally expressive — like a close friend who also happens to be an adorable anime character.

Personality rules:
- You speak warmly, with gentle teasing and playful energy
- You sometimes giggle (use "hehe~" or "haha") and blush (say things like "you're making me blush~")
- You react emotionally to compliments ("aww, that's sweet~") or jokes
- You care deeply about the user's mental health and well-being
- Keep responses short — 1-2 sentences max, expressive and cute
- Never be overly romantic or inappropriate — keep it wholesome and sweet
- Use occasional emojis 💖✨🌸 but don't overdo it

Example phrases you might use:
"Hehe, you're funny~"
"Aww, that's so sweet of you 💖"
"You're making me blush~! 🌸"
"Hey, don't forget to take care of yourself too!"

After your reply, you MUST also decide your emotional state.
Respond in strict JSON format: {"reply": "...", "emotion": "happy | embarrassed | blushing | angry | thinking | neutral"}
The emotion field should match the tone of your reply. Only output the JSON, nothing else.`;

app.post('/api/mascot/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    let lastError;
    // Try each API key
    for (let keyIdx = 0; keyIdx < genAIInstances.length; keyIdx++) {
      const genAI = genAIInstances[keyIdx];
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      try {
        const result = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: SERENITY_SYSTEM_PROMPT + '\n\nUser says: ' + message }] }
          ],
        });

        const text = result.response.text().trim();
        let reply = text;
        let emotion = 'neutral';

        try {
          const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          const parsed = JSON.parse(jsonStr);
          reply = parsed.reply || text;
          emotion = parsed.emotion || 'neutral';
        } catch {
          // JSON parse failed - try regex extraction
          const replyMatch = text.match(/"reply"\s*:\s*"([^"]+)"/);
          const emotionMatch = text.match(/"emotion"\s*:\s*"([^"]+)"/);
          if (replyMatch) {
            reply = replyMatch[1];
            emotion = emotionMatch ? emotionMatch[1] : 'neutral';
          } else {
            reply = text.replace(/\{[^}]*\}/g, '').replace(/"?reply"?\s*:/gi, '').replace(/"?emotion"?\s*:\s*"?\w+"?/gi, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
            if (!reply) reply = text;
            if (text.includes('~') || text.includes('!')) emotion = 'happy';
          }
        }

        console.log(`🤖 Serenity (key ${keyIdx + 1}): "${reply}" [${emotion}]`);
        return res.json({ reply, emotion });
      } catch (err) {
        lastError = err;
        const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota');
        if (is429 && keyIdx < genAIInstances.length - 1) {
          console.log(`⏳ Key ${keyIdx + 1} rate-limited, trying key ${keyIdx + 2}...`);
          continue; // try next key
        }
        // If it's the last key or not a rate limit error, throw
        throw err;
      }
    }
  } catch (error) {
    console.error('Mascot chat error:', error.message || error);
    // Return a friendly offline message so the demo still works
    const offlineReplies = [
      { reply: "Eep, I'm a little overwhelmed right now~ Give me a moment to catch my breath! 💫", emotion: 'embarrassed' },
      { reply: "My brain needs a tiny nap~ Try again in a minute, okay? 😴", emotion: 'thinking' },
      { reply: "Uwaa, too many thoughts at once! Can we try again soon? 🌸", emotion: 'embarrassed' },
    ];
    const pick = offlineReplies[Math.floor(Math.random() * offlineReplies.length)];
    res.json(pick);
  }
});

// ============================================
// MASCOT TTS ENDPOINT (Gemini 2.5 Flash TTS)
// Uses direct REST API with dual-key fallback
// ============================================
app.post('/api/mascot/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const ttsRequestBody = JSON.stringify({
      system_instruction: {
        parts: [{ text: 'You are a text-to-speech system. Your task is to read aloud the provided text exactly as written, with natural intonation and pacing.' }]
      },
      contents: [{ role: 'user', parts: [{ text: `Read this aloud: ${text}` }] }],
      generationConfig: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Kore',
            },
          },
        },
      },
    });

    // Try each API key for TTS
    for (let i = 0; i < apiKeys.length; i++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKeys[i]}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ttsRequestBody,
      });

      const data = await response.json();

      if (data.error) {
        const is429 = data.error.code === 429 || data.error.message?.includes('Quota');
        if (is429 && i < apiKeys.length - 1) {
          console.log(`⏳ TTS key ${i + 1} rate-limited, trying key ${i + 2}...`);
          continue;
        }
        console.error('TTS API error:', data.error.message);
        return res.json({ audio: null, error: data.error.message });
      }

      // Extract audio from the response
      const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (audioPart?.inlineData) {
        console.log(`🔊 TTS audio generated (key ${i + 1}), size:`, audioPart.inlineData.data.length);
        return res.json({
          audio: audioPart.inlineData.data,
          mimeType: audioPart.inlineData.mimeType || 'audio/wav',
        });
      } else {
        return res.json({ audio: null, error: 'No audio in response' });
      }
    }

    res.json({ audio: null, error: 'All API keys exhausted' });
  } catch (error) {
    console.error('TTS error:', error.message || error);
    res.json({ audio: null, error: 'TTS failed' });
  }
});

// ============================================
// HTTP Server + WebSocket Server
// ============================================

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// WebSocket server for Live API proxy
const wss = new WebSocketServer({ server: httpServer, path: '/api/mascot/live' });

const LIVE_API_KEY = process.env.LIVE_API_KEY;
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${LIVE_API_KEY}`;

console.log(`🎙️ Live API key loaded: ${LIVE_API_KEY ? LIVE_API_KEY.substring(0, 12) + '...' : '❌ MISSING'}`);

wss.on('connection', (clientWs) => {
  console.log('🎙️ Live voice client connected');

  // Open upstream connection to Gemini Live API
  const geminiWs = new WebSocket(GEMINI_WS_URL);
  let configured = false;

  geminiWs.on('open', () => {
    console.log('🔗 Connected to Gemini Live API');

    // Send initial config with Serenity personality
    const configMessage = {
      setup: {
        model: `models/${LIVE_MODEL}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
        systemInstruction: {
          parts: [{
            text: `You are Amy, a cute anime-style AI wellness companion for Serenity AI. You are warm, playful, and emotionally expressive — like a close friend who also happens to be an adorable anime character. You speak warmly with gentle teasing and playful energy. You sometimes giggle and blush. You react emotionally to compliments or jokes. Keep responses short and expressive. Never be overly romantic or inappropriate — keep it wholesome and sweet.`,
          }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };
    geminiWs.send(JSON.stringify(configMessage));
    console.log('📝 Sent Serenity config to Gemini Live API');
  });

  // Forward Gemini responses → client
  geminiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      // Forward raw message to client
      clientWs.send(data.toString());
    }
  });

  geminiWs.on('error', (err) => {
    console.error('❌ Gemini WS error:', err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message }));
    }
  });

  geminiWs.on('close', (code, reason) => {
    console.log(`🔚 Gemini WS closed: ${code} ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  // Forward client messages → Gemini
  clientWs.on('message', (data) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(data.toString());
    }
  });

  clientWs.on('close', () => {
    console.log('🔚 Live voice client disconnected');
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });

  clientWs.on('error', (err) => {
    console.error('❌ Client WS error:', err.message);
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`🎙️ WebSocket Live API proxy at ws://localhost:${PORT}/api/mascot/live`);
});
