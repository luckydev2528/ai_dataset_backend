import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, UpdateUserData } from '../../types';
import { FirebaseWrapper } from '../../services/firebase/firebaseWrapper';
import { asyncHandler, AppError } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth/authHelpers';
import { createStandardUserObject } from '../../utils/userUtils';
import { Logger } from '../../utils/logger';
import { 
  createSuccessResponse, 
  createErrorResponse,
  createNotFoundErrorResponse,
  createValidationErrorResponse
} from '../../utils/responseUtils';

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { response, statusCode } = createSuccessResponse(
    'Profile retrieved successfully',
    { user: req.user }
  );
  res.status(statusCode).json(response);
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { name, photo }: UpdateUserData = req.body;

  // Prepare update data
  const updateData: any = {};
  if (name !== undefined) updateData.displayName = name;
  if (photo !== undefined) updateData.photoURL = photo;

  // Update user in Firebase
  const updatedFirebaseUser = await FirebaseWrapper.updateUser(req.user!.id, updateData);

  // Update local user object
  const updatedUser = {
    ...req.user,
    name: updatedFirebaseUser.displayName || req.user!.name,
    photo: updatedFirebaseUser.photoURL || req.user!.photo,
    updatedAt: new Date(),
  };

  const { response, statusCode } = createSuccessResponse(
    'Profile updated successfully',
    { user: updatedUser }
  );
  res.status(statusCode).json(response);
});

/**
 * Delete user account
 */
export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  // Delete user from Firebase
  await FirebaseWrapper.deleteUser(req.user!.id);

  const { response, statusCode } = createSuccessResponse('Account deleted successfully');
  res.status(statusCode).json(response);
});

/**
 * Get user by ID (admin only)
 */
export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { userId } = req.params;

  // Get user from Firebase
  const firebaseUser = await FirebaseWrapper.getUserByUid(userId!);

  const user = createStandardUserObject(firebaseUser, 'email');

  const { response, statusCode } = createSuccessResponse(
    'User retrieved successfully',
    { user }
  );
  res.status(statusCode).json(response);
});

/**
 * Get all users (admin only)
 */
export const getAllUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  // This would require implementing a user listing function in Firebase Admin
  // For now, we'll return a placeholder response
  const { response, statusCode } = createSuccessResponse(
    'Users retrieved successfully',
    {
      users: [],
      total: 0,
      page: 1,
      limit: 10,
    }
  );
  res.status(statusCode).json(response);
});

/**
 * Update user status (admin only)
 */
export const updateUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { userId } = req.params;
  const { isActive } = req.body;

  // Update user status in Firebase
  await FirebaseWrapper.updateUser(userId!, { disabled: !isActive });

  const { response, statusCode } = createSuccessResponse('User status updated successfully');
  res.status(statusCode).json(response);
});

/**
 * Get user statistics
 */
export const getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  // This would typically involve querying a database for user statistics
  // For now, we'll return a placeholder response
  const stats = {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  };

  const { response, statusCode } = createSuccessResponse(
    'User statistics retrieved successfully',
    { stats }
  );
  res.status(statusCode).json(response);
});

/**
 * Search users
 */
export const searchUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  const { query, page = 1, limit = 10 } = req.query;

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  // This would typically involve querying a database for users
  // For now, we'll return a placeholder response
  const { response, statusCode } = createSuccessResponse(
    'Users search completed',
    {
      users: [],
      total: 0,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      query,
    }
  );
  res.status(statusCode).json(response);
});

/**
 * Export user data (GDPR compliance)
 */
export const exportUserData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAuth(req, res, () => {});

  // This would typically involve gathering all user data from various sources
  // For now, we'll return the basic user profile
  const userData = {
    profile: req.user,
    exportDate: new Date().toISOString(),
    dataTypes: ['profile', 'authentication', 'preferences'],
  };

  const { response, statusCode } = createSuccessResponse(
    'User data exported successfully',
    userData
  );
  res.status(statusCode).json(response);
});
