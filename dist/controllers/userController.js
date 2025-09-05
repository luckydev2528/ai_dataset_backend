"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportUserData = exports.searchUsers = exports.getUserStats = exports.updateUserStatus = exports.getAllUsers = exports.getUserById = exports.deleteAccount = exports.updateProfile = exports.getProfile = void 0;
const firebaseAdmin_1 = require("../services/firebaseAdmin");
const errorHandler_1 = require("../middleware/errorHandler");
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
exports.updateProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { name, photo } = req.body;
    const updateData = {};
    if (name !== undefined)
        updateData.displayName = name;
    if (photo !== undefined)
        updateData.photoURL = photo;
    const updatedFirebaseUser = await (0, firebaseAdmin_1.updateUser)(req.user.id, updateData);
    const updatedUser = {
        ...req.user,
        name: updatedFirebaseUser.displayName || req.user.name,
        photo: updatedFirebaseUser.photoURL || req.user.photo,
        updatedAt: new Date(),
    };
    const response = {
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: updatedUser,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.deleteAccount = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    await (0, firebaseAdmin_1.deleteUser)(req.user.id);
    const response = {
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.getUserById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { userId } = req.params;
    const firebaseUser = await (0, firebaseAdmin_1.getUserByUid)(userId);
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
    const response = {
        success: true,
        message: 'User retrieved successfully',
        data: {
            user,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.getAllUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const response = {
        success: true,
        message: 'Users retrieved successfully',
        data: {
            users: [],
            total: 0,
            page: 1,
            limit: 10,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.updateUserStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { userId } = req.params;
    const { isActive } = req.body;
    await (0, firebaseAdmin_1.updateUser)(userId, { disabled: !isActive });
    const response = {
        success: true,
        message: 'User status updated successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.getUserStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const stats = {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
    };
    const response = {
        success: true,
        message: 'User statistics retrieved successfully',
        data: {
            stats,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.searchUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { query, page = 1, limit = 10 } = req.query;
    if (!query || typeof query !== 'string') {
        throw new errorHandler_1.AppError('Search query is required', 400);
    }
    const response = {
        success: true,
        message: 'Users search completed',
        data: {
            users: [],
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            query,
        },
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.exportUserData = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const userData = {
        profile: req.user,
        exportDate: new Date().toISOString(),
        dataTypes: ['profile', 'authentication', 'preferences'],
    };
    const response = {
        success: true,
        message: 'User data exported successfully',
        data: userData,
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
//# sourceMappingURL=userController.js.map