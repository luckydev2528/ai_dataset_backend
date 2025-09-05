import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, UpdateUserData } from '../../types';
import { updateUser, deleteUser, getUserByUid } from '../../services/auth/firebaseAdmin';
import { asyncHandler, AppError } from '../../middleware/error/errorHandler';

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: req.user,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { name, photo }: UpdateUserData = req.body;

  // Prepare update data
  const updateData: any = {};
  if (name !== undefined) updateData.displayName = name;
  if (photo !== undefined) updateData.photoURL = photo;

  // Update user in Firebase
  const updatedFirebaseUser = await updateUser(req.user.id, updateData);

  // Update local user object
  const updatedUser = {
    ...req.user,
    name: updatedFirebaseUser.displayName || req.user.name,
    photo: updatedFirebaseUser.photoURL || req.user.photo,
    updatedAt: new Date(),
  };

  const response: ApiResponse = {
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Delete user account
 */
export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // Delete user from Firebase
  await deleteUser(req.user.id);

  const response: ApiResponse = {
    success: true,
    message: 'Account deleted successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get user by ID (admin only)
 */
export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { userId } = req.params;

  // Get user from Firebase
  const firebaseUser = await getUserByUid(userId!);

  const user = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || 'User',
    photo: firebaseUser.photoURL || undefined,
    type: 'email' as const, // This would need to be determined from provider data
    createdAt: new Date(firebaseUser.metadata.creationTime),
    updatedAt: new Date(firebaseUser.metadata.lastSignInTime || firebaseUser.metadata.creationTime),
    lastLoginAt: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
    isActive: !firebaseUser.disabled,
  };

  const response: ApiResponse = {
    success: true,
    message: 'User retrieved successfully',
    data: {
      user,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get all users (admin only)
 */
export const getAllUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // This would require implementing a user listing function in Firebase Admin
  // For now, we'll return a placeholder response
  const response: ApiResponse = {
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

/**
 * Update user status (admin only)
 */
export const updateUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { userId } = req.params;
  const { isActive } = req.body;

  // Update user status in Firebase
  await updateUser(userId!, { disabled: !isActive });

  const response: ApiResponse = {
    success: true,
    message: 'User status updated successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get user statistics
 */
export const getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // This would typically involve querying a database for user statistics
  // For now, we'll return a placeholder response
  const stats = {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  };

  const response: ApiResponse = {
    success: true,
    message: 'User statistics retrieved successfully',
    data: {
      stats,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Search users
 */
export const searchUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { query, page = 1, limit = 10 } = req.query;

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  // This would typically involve querying a database for users
  // For now, we'll return a placeholder response
  const response: ApiResponse = {
    success: true,
    message: 'Users search completed',
    data: {
      users: [],
      total: 0,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      query,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Export user data (GDPR compliance)
 */
export const exportUserData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // This would typically involve gathering all user data from various sources
  // For now, we'll return the basic user profile
  const userData = {
    profile: req.user,
    exportDate: new Date().toISOString(),
    dataTypes: ['profile', 'authentication', 'preferences'],
  };

  const response: ApiResponse = {
    success: true,
    message: 'User data exported successfully',
    data: userData,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});
