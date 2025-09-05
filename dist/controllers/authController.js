"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.getProfile = exports.logout = exports.refreshToken = exports.confirmPasswordReset = exports.sendPasswordReset = exports.socialAuth = exports.login = exports.register = void 0;
const jwtService_1 = require("../services/jwtService");
const firebaseAdmin_1 = require("../services/firebaseAdmin");
const errorHandler_1 = require("../middleware/errorHandler");
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, name } = req.body;
    const existingUser = await (0, firebaseAdmin_1.getUserByEmail)(email);
    if (existingUser) {
        throw new errorHandler_1.AppError('User with this email already exists', 409);
    }
    const firebaseUser = await (0, firebaseAdmin_1.createUser)({
        email,
        password,
        displayName: name,
    });
    const user = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        photo: firebaseUser.photoURL || undefined,
        type: 'email',
        createdAt: new Date(firebaseUser.metadata.creationTime),
        updatedAt: new Date(firebaseUser.metadata.creationTime),
        isActive: !firebaseUser.disabled,
    };
    const token = jwtService_1.JWTService.generateToken(user);
    const response = {
        success: true,
        message: 'User registered successfully',
        data: {
            user,
            token,
        },
        timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
});
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    try {
        const firebaseUser = await (0, firebaseAdmin_1.getUserByEmail)(email);
        if (!firebaseUser) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        if (firebaseUser.disabled) {
            throw new errorHandler_1.AppError('Account is disabled', 401);
        }
        const user = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            photo: firebaseUser.photoURL || undefined,
            type: 'email',
            createdAt: new Date(firebaseUser.metadata.creationTime),
            updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
            lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
            isActive: !firebaseUser.disabled,
        };
        const token = jwtService_1.JWTService.generateToken(user);
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                user,
                token,
            },
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        if (error.message === 'Firebase Auth not initialized') {
            throw new errorHandler_1.AppError('Authentication service is not available. Please check server configuration.', 503);
        }
        throw error;
    }
});
exports.socialAuth = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { idToken, provider } = req.body;
    try {
        const decodedToken = await (0, firebaseAdmin_1.verifyIdToken)(idToken);
        let firebaseUser;
        try {
            firebaseUser = await (0, firebaseAdmin_1.getUserByUid)(decodedToken.uid);
        }
        catch (firebaseError) {
            if (firebaseError.message.includes('Firebase service account lacks required permissions')) {
                console.warn('⚠️ Firebase Admin permission error, using token data as fallback');
                firebaseUser = {
                    uid: decodedToken.uid,
                    email: decodedToken.email || '',
                    displayName: decodedToken.name || 'User',
                    photoURL: decodedToken.picture || undefined,
                    disabled: false,
                    metadata: {
                        creationTime: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : new Date().toISOString(),
                        lastSignInTime: decodedToken.auth_time ? new Date(decodedToken.auth_time * 1000).toISOString() : new Date().toISOString(),
                    }
                };
            }
            else {
                throw firebaseError;
            }
        }
        let userType = 'email';
        switch (provider) {
            case 'email':
                userType = 'email';
                break;
            case 'google':
                userType = 'google';
                break;
            case 'twitter':
                userType = 'twitter';
                break;
            case 'facebook':
                userType = 'facebook';
                break;
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
        const token = jwtService_1.JWTService.generateToken(user);
        const response = {
            success: true,
            message: `${provider} authentication successful`,
            data: {
                user,
                token,
            },
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        if (error.message.includes('Firebase service account lacks required permissions')) {
            throw new errorHandler_1.AppError('Authentication service configuration error. Please contact support.', 503);
        }
        if (error.message.includes('Invalid ID token') || error.message.includes('ID token has expired')) {
            throw new errorHandler_1.AppError('Invalid authentication token. Please try logging in again.', 401);
        }
        if (error.message.includes('User not found')) {
            throw new errorHandler_1.AppError('User account not found. Please try registering first.', 404);
        }
        throw error;
    }
});
exports.sendPasswordReset = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const user = await (0, firebaseAdmin_1.getUserByEmail)(email);
    if (!user) {
        const response = {
            success: true,
            message: 'If an account with this email exists, a password reset link has been sent',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
        return;
    }
    await (0, firebaseAdmin_1.sendPasswordResetEmail)(email);
    const response = {
        success: true,
        message: 'Password reset email sent',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.confirmPasswordReset = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { oobCode, newPassword } = req.body;
    await (0, firebaseAdmin_1.confirmPasswordReset)(oobCode, newPassword);
    const response = {
        success: true,
        message: 'Password reset successful',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.refreshToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const newToken = jwtService_1.JWTService.generateToken(req.user);
    const response = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
            token: newToken,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const response = {
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const response = {
        success: true,
        message: 'Profile retrieved successfully',
        data: {
            user: req.user,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.verifyToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = jwtService_1.JWTService.extractTokenFromHeader(authHeader);
    if (!token) {
        throw new errorHandler_1.AppError('Token is required', 401);
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
        const response = {
            success: true,
            message: 'Token is valid',
            data: {
                user,
                valid: true,
            },
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            message: 'Token is invalid',
            data: {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
    }
});
//# sourceMappingURL=authController.js.map