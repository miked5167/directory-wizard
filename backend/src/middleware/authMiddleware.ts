import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        emailVerified: boolean;
      };
      userId?: string; // For simple cases where only ID is needed
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
  userId: string;
}

// JWT Authentication middleware
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Authorization header required',
        message: 'Please provide a valid JWT token in the Authorization header',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim spaces

    if (!token) {
      res.status(401).json({
        error: 'Missing JWT token',
        message: 'JWT token is required',
      });
      return;
    }

    // Verify the JWT token
    const userId = await AuthService.verifyToken(token);

    if (!userId) {
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please login again to get a valid token',
      });
      return;
    }

    // Get user details
    const user = await AuthService.getUserById(userId);

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists',
      });
      return;
    }

    // Attach user data to request
    req.user = user;
    req.userId = userId;

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication',
    });
  }
};

// Optional JWT middleware (doesn't fail if no token provided)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      next();
      return;
    }

    // Try to verify token, but don't fail if invalid
    const userId = await AuthService.verifyToken(token);

    if (userId) {
      const user = await AuthService.getUserById(userId);
      if (user) {
        req.user = user;
        req.userId = userId;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if there's an error
    console.warn('Optional auth failed:', error);
    next();
  }
};

// Middleware to require email verification
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource',
    });
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource',
    });
    return;
  }

  next();
};

// Admin-only middleware (for future admin functionality)
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource',
    });
    return;
  }

  // For now, all authenticated users can access admin functions
  // In the future, we could add an 'isAdmin' field to the user model
  next();
};

// Combine authentication with email verification
export const authenticateWithVerification = [authenticateJWT, requireEmailVerification];

// Combine authentication with admin requirement
export const authenticateAdmin = [authenticateJWT, requireAdmin];
