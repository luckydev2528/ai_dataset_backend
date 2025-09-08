"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("./middleware/error");
const redisRateLimit_1 = require("./middleware/rateLimit/redisRateLimit");
const securityLogger_1 = require("./middleware/security/securityLogger");
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const database_1 = __importDefault(require("./routes/database"));
const video_1 = __importDefault(require("./routes/video"));
const task_1 = __importDefault(require("./routes/task"));
const userPoints_1 = __importDefault(require("./routes/userPoints"));
const firebaseAdmin_1 = require("./services/auth/firebaseAdmin");
const RedisService_1 = require("./services/cache/RedisService");
const CacheService_1 = __importDefault(require("./services/cache/CacheService"));
const firestoreService_1 = require("./services/database/firestoreService");
dotenv_1.default.config();
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
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET must be at least 32 characters long');
        process.exit(1);
    }
    if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 64) {
        console.error('❌ REFRESH_TOKEN_SECRET must be at least 64 characters long');
        process.exit(1);
    }
    console.log('✅ Environment validation passed');
}
validateEnvironment();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
async function initializeServices() {
    try {
        const firebaseApp = (0, firebaseAdmin_1.initializeFirebaseAdmin)();
        if (!firebaseApp) {
            console.warn('⚠️ Firebase Admin not initialized - some features may not work');
        }
        else {
            try {
                firestoreService_1.firestoreService.initialize();
                console.log('✅ Firestore Service initialized successfully');
            }
            catch (error) {
                console.warn('⚠️ Firestore Service initialization failed:', error);
            }
        }
        await RedisService_1.redisService.connect();
        try {
            await firestoreService_1.firestoreService.healthCheck();
            console.log('✅ Firestore connected successfully');
        }
        catch (error) {
            console.warn('⚠️ Firestore not available - database features may not work:', error);
        }
        await CacheService_1.default.warmUpCache();
        console.log('✅ All services initialized successfully');
    }
    catch (error) {
        console.error('❌ Error initializing services:', error);
    }
}
app.use((0, helmet_1.default)({
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
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "same-origin" },
    hidePoweredBy: true,
    frameguard: { action: 'deny' },
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://192.168.1.19:3000',
        'http://192.168.1.19:8081'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(redisRateLimit_1.generalRateLimit);
app.use('/api/auth', redisRateLimit_1.authRateLimit);
app.use(express_1.default.json({
    limit: '10mb'
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb'
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(securityLogger_1.securityLogger);
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    req.id = crypto_1.default.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
});
app.get('/health', async (req, res) => {
    try {
        const redisHealth = await RedisService_1.redisService.healthCheck();
        const cacheStats = await CacheService_1.default.getCacheStats();
        const firestoreHealth = await firestoreService_1.firestoreService.healthCheck();
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
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/database', database_1.default);
app.use('/api/video', video_1.default);
app.use('/api/task', task_1.default);
app.use('/api/user-points', userPoints_1.default);
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
            video: '/api/video',
            task: '/api/task',
            userPoints: '/api/user-points',
        },
    });
});
app.use(error_1.notFoundHandler);
app.use(error_1.errorHandler);
async function startServer() {
    try {
        await initializeServices();
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 Mobile access: http://192.168.1.19:${PORT}/health`);
            console.log(`📋 API Documentation: http://localhost:${PORT}/`);
            console.log(`🔴 Redis: ${RedisService_1.redisService.isReady() ? 'Connected' : 'Disconnected'}`);
        });
        server.timeout = 300000;
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await RedisService_1.redisService.disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await RedisService_1.redisService.disconnect();
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map