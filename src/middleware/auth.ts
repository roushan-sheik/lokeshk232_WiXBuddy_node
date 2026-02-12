// src/middlewares/auth.middleware.ts
import { config } from '@/core/config';
import { AuthenticationError, AuthorizationError } from '@/core/errors/AppError';
import { AppLogger } from '@/core/logging/logger';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
  name: string;
  avatar: string | null;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user?: JWTPayload;
  userId?: string;
  userRole?: string;
}

/**
 * Core function to verify a JWT
 */
function verifyToken(token: string): JWTPayload {
  if (!config.security.jwt.secret) {
    throw new Error('JWT secret is not defined in the environment');
  }

  try {
    return jwt.verify(token, config.security.jwt.secret) as JWTPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Authentication token has expired');
    }
    if (err instanceof jwt.NotBeforeError) {
      throw new AuthenticationError('Authentication token is not yet valid');
    }
    throw new AuthenticationError('Invalid authentication token');
  }
}

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(req: Request): string | null {
  // 1. Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (authHeader) {
    return authHeader;
  }

  // 2. Cookies (auth_token preferred)
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('Authentication token is required');
    }

    const decoded = verifyToken(token);

    req.user = decoded;
    req.userId = decoded.id;
    req.userRole = decoded.role;

    AppLogger.debug('User authenticated', {
      userId: req.userId,
      userRole: req.userRole,
      requestId: (req as any).id,
    });

    next();
  } catch (error) {
    AppLogger.error(`Authentication error: ${(error as Error).message}`, {
      requestId: (req as any).id,
    });
    next(error);
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!roles.includes(req.userRole)) {
      AppLogger.warn(`Access denied. User role: ${req.userRole}`, {
        requestId: (req as any).id,
        userId: req.userId,
        requiredRoles: roles,
      });
      throw new AuthorizationError(`Access denied. Required role(s): ${roles.join(', ')}`);
    }

    AppLogger.debug('User authorized successfully', {
      userId: req.userId,
      userRole: req.userRole,
      requestId: (req as any).id,
    });
    next();
  };
};

/**
 * Middleware to check if user can access their own resource or is admin
 */
export const authorizeOwnerOrAdmin = (userIdParam: string = 'id') => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const targetUserId = req.params[userIdParam];

    if (req.userRole === 'admin' || req.userId === targetUserId) {
      AppLogger.debug('Owner/admin authorized successfully', {
        userId: req.userId,
        userRole: req.userRole,
        requestId: (req as any).id,
      });
      return next();
    }

    AppLogger.warn('Owner/Admin authorization failed', {
      requestId: (req as any).id,
      userId: req.userId,
      userRole: req.userRole,
    });

    throw new AuthorizationError(
      'Access denied. You can only access your own resources or need admin privileges'
    );
  };
};

/**
 * Optional authentication - does not throw error if no/invalid token
 */
export const optionalAuth = (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);

    req.user = decoded;
    req.userId = decoded.id;
    req.userRole = decoded.role;

    AppLogger.debug('User optionally authenticated', {
      userId: req.userId,
      userRole: req.userRole,
      requestId: (req as any).id,
    });
  } catch {
    // ignore errors, proceed without authentication
  }

  next();
};
