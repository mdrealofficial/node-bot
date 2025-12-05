import { ForbiddenError } from '../utils/apiResponse.js';
import prisma from '../config/database.js';

/**
 * Check if user has admin role
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Check if user has ADMIN role
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Also check user_roles table
    const adminRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: req.user.id,
        role: 'admin',
      },
    });

    if (adminRole) {
      return next();
    }

    throw new ForbiddenError('Admin access required');
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has specific role
 */
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const roleArray = Array.isArray(roles) ? roles : [roles];

      // Check main role
      if (roleArray.includes(req.user.role)) {
        return next();
      }

      // Check user_roles table
      const userRoles = await prisma.userRoleAssignment.findMany({
        where: {
          userId: req.user.id,
          role: { in: roleArray.map(r => r.toLowerCase()) },
        },
      });

      if (userRoles.length > 0) {
        return next();
      }

      throw new ForbiddenError('Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      // Allow admin access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Check ownership
      const resourceUserId = req.params[userIdField] || req.body[userIdField];
      
      if (resourceUserId && resourceUserId === req.user.id) {
        return next();
      }

      throw new ForbiddenError('You do not have permission to access this resource');
    } catch (error) {
      next(error);
    }
  };
};
