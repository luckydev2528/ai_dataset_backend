import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import crypto from 'crypto';

import { errorHandler } from './middleware/error/errorHandler';
import { notFoundHandler } from './middleware/error/notFoundHandler';
import { generalRateLimit, authRateLimit } from './middleware/rateLimit/redisRateLimit';
import { securityLogger } from './middleware/security/securityLogger';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import databaseRoutes from './routes/database';
import { initializeFirebaseAdmin } from './services/auth/firebaseAdmin';
import { redisService } from './services/cache/RedisService';
import CacheService from './services/cache/CacheService';
import { firestoreService } from './services/database/firestoreService';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file or environment configuration.');
    process.exit(1);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  
  // Validate refresh token secret strength
  if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 64) {
    console.error('❌ REFRESH_TOKEN_SECRET must be at least 64 characters long');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// Validate environment before starting
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
async function initializeServices() {
  try {
    // Initialize Firebase Admin
    const firebaseApp = initializeFirebaseAdmin();
    if (!firebaseApp) {
      console.warn('⚠️ Firebase Admin not initialized - some features may not work');
    }
    
    // Initialize Redis
    await redisService.connect();
    
    // Initialize Firestore
    try {
      await firestoreService.healthCheck();
      console.log('✅ Firestore connected successfully');
    } catch (error) {
      console.warn('⚠️ Firestore not available - database features may not work:', error);
    }
    
    // Warm up cache
    await CacheService.warmUpCache();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for React Native compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" },
  // Additional security headers
  hidePoweredBy: true,
  frameguard: { action: 'deny' },
  ieNoOpen: true,
  // Additional security measures
  dnsPrefetchControl: { allow: false },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Redis-based rate limiting
app.use(generalRateLimit);
app.use('/api/auth', authRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Security logging middleware
app.use(securityLogger);

// Additional security middleware
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add request ID for tracking
  (req as any).id = crypto.randomUUID();
  res.setHeader('X-Request-ID', (req as any).id);
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await redisService.healthCheck();
    const cacheStats = await CacheService.getCacheStats();
    const firestoreHealth = await firestoreService.healthCheck();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        redis: {
          status: redisHealth.status,
          latency: redisHealth.latency,
        },
        firestore: {
          status: firestoreHealth.status,
          latency: firestoreHealth.latency,
        },
        cache: {
          totalKeys: cacheStats.totalKeys,
          memoryUsage: cacheStats.memoryUsage,
          hitRate: `${cacheStats.hitRate}%`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/database', databaseRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Data Refining React Native App Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      user: '/api/user',
      database: '/api/database',
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize services first
    await initializeServices();
    
    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔴 Redis: ${redisService.isReady() ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await redisService.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;

