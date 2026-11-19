import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool, testConnection } from './config/db.js';

import authRouter from './routes/auth.js';
import participantRouter from './routes/participant.js';
import revealRouter from './routes/reveal.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Trust reverse proxies in production
if (isProd) {
  app.set('trust proxy', 1);
}

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Server-side Session Management
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'evergreen-express-christmas-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'evergreen_session',
    cookie: {
      httpOnly: true,
      secure: isProd, // True only in HTTPS production
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

// Rate Limiting for OTP Verification Code Requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 verification requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification requests from this network. Please wait a few minutes before trying again.',
  },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/auth/register-request-otp', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);

// API Endpoints
app.use('/api/auth', authRouter);
app.use('/api/participant', participantRouter);
app.use('/api/reveal', revealRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'online',
    service: 'THE EVERGREEN EXPRESS API',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.success,
      details: dbStatus.success ? { db: dbStatus.database, time: dbStatus.time } : { error: dbStatus.error },
    },
  });
});

// Serve Static Frontend Assets
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }
}));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback route for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'An unexpected error occurred. Please try again later.' : err.message,
  });
});

// Start Server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, async () => {
  console.log('\n🎄 =============================================================');
  console.log(`   THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Accessible at: http://127.0.0.1:${PORT} (bound to ${HOST})`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  try {
    const dbStatus = await testConnection();
    if (dbStatus.success) {
      console.log(`   Database: Connected to Supabase PostgreSQL (${dbStatus.database})`);
    } else {
      console.warn(`   Database Status: ${dbStatus.error}`);
    }
  } catch (err) {
    console.warn(`   Database connection check error: ${err.message}`);
  }
  console.log('=============================================================\n');
});

export default app;
