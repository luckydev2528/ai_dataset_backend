"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRateLimit = exports.requireRole = exports.optionalAuth = exports.authenticateFirebase = exports.authenticateJWT = void 0;
const jwtService_1 = require("../services/jwtService");
const firebaseAdmin_1 = require("../services/firebaseAdmin");
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtService_1.JWTService.extractTokenFromHeader(authHeader);
        if (!token) {
            const response = {
                success: false,
                message: 'Access token is required',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        const payload = jwtService_1.JWTService.verifyToken(token);
        const firebaseUser = await (0, firebaseAdmin_1.getUserByUid)(payload.uid);
        const user = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            photo: firebaseUser.photoURL || undefined,
            type: payload.type,
            createdAt: new Date(firebaseUser.metadata.creationTime),
            updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
            lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
            isActive: !firebaseUser.disabled,
        };
        req.user = user;
        req.firebaseUser = firebaseUser;
        next();
    }
    catch (error) {
        console.error('JWT Authentication error:', error);
        const response = {
            success: false,
            message: error instanceof Error ? error.message : 'Authentication failed',
            timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
    }
};
exports.authenticateJWT = authenticateJWT;
const authenticateFirebase = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtService_1.JWTService.extractTokenFromHeader(authHeader);
        if (!token) {
            const response = {
                success: false,
                message: 'Firebase ID token is required',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        const decodedToken = await (0, firebaseAdmin_1.verifyIdToken)(token);
        const firebaseUser = await (0, firebaseAdmin_1.getUserByUid)(decodedToken.uid);
        const providerData = firebaseUser.providerData[0];
        let userType = 'email';
        if (providerData) {
            switch (providerData.providerId) {
                case 'google.com':
                    userType = 'google';
                    break;
                case 'twitter.com':
                    userType = 'twitter';
                    break;
                case 'facebook.com':
                    userType = 'facebook';
                    break;
                default:
                    userType = 'email';
            }
        }
        const user = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            photo: firebaseUser.photoURL || undefined,
            type: userType,
            createdAt: new Date(firebaseUser.metadata.creationTime),
            updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
            lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
            isActive: !firebaseUser.disabled,
        };
        req.user = user;
        req.firebaseUser = firebaseUser;
        next();
    }
    catch (error) {
        console.error('Firebase Authentication error:', error);
        const response = {
            success: false,
            message: error instanceof Error ? error.message : 'Authentication failed',
            timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
    }
};
exports.authenticateFirebase = authenticateFirebase;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtService_1.JWTService.extractTokenFromHeader(authHeader);
        if (!token) {
            next();
            return;
        }
        try {
            const payload = jwtService_1.JWTService.verifyToken(token);
            const firebaseUser = await (0, firebaseAdmin_1.getUserByUid)(payload.uid);
            const user = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                photo: firebaseUser.photoURL || undefined,
                type: payload.type,
                createdAt: new Date(firebaseUser.metadata.creationTime),
                updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
                lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
                isActive: !firebaseUser.disabled,
            };
            req.user = user;
            req.firebaseUser = firebaseUser;
        }
        catch (error) {
            console.warn('Optional auth failed:', error);
        }
        next();
    }
    catch (error) {
        console.error('Optional auth error:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                message: 'Authentication required',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        if (!req.user.isActive) {
            const response = {
                success: false,
                message: 'Account is disabled',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const userRateLimit = (maxRequests, windowMs) => {
    const userRequests = new Map();
    return (req, res, next) => {
        if (!req.user) {
            next();
            return;
        }
        const userId = req.user.id;
        const now = Date.now();
        const userLimit = userRequests.get(userId);
        if (!userLimit || now > userLimit.resetTime) {
            userRequests.set(userId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (userLimit.count >= maxRequests) {
            const response = {
                success: false,
                message: 'Too many requests for this user',
                timestamp: new Date().toISOString(),
            };
            res.status(429).json(response);
            return;
        }
        userLimit.count++;
        next();
    };
};
exports.userRateLimit = userRateLimit;
//# sourceMappingURL=auth.js.map