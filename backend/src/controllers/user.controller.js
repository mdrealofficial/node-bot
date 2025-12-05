import prisma from '../config/database.js';
import { ApiResponse, NotFoundError } from '../utils/apiResponse.js';

/**
 * Get user profile
 * GET /api/users/:userId
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json(ApiResponse.success('User profile retrieved', user));
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/users/:userId
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { fullName, phone, avatar, bio, website, location, company } = req.body;

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
      },
    });

    // Update profile if provided
    if (bio || website || location || company) {
      await prisma.profile.update({
        where: { userId },
        data: {
          ...(bio && { bio }),
          ...(website && { website }),
          ...(location && { location }),
          ...(company && { company }),
        },
      });
    }

    res.json(ApiResponse.success('Profile updated successfully', user));
  } catch (error) {
    next(error);
  }
};

/**
 * Update user settings
 * PUT /api/users/:userId/settings
 */
export const updateUserSettings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { theme, language, notifications, emailNotifications, smsNotifications } = req.body;

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...(theme && { theme }),
        ...(language && { language }),
        ...(notifications !== undefined && { notifications }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(smsNotifications !== undefined && { smsNotifications }),
      },
    });

    res.json(ApiResponse.success('Settings updated successfully', settings));
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 * GET /api/users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          avatar: true,
          createdAt: true,
          lastLogin: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(
      ApiResponse.success('Users retrieved successfully', {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};
