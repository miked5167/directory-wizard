import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services';
import { ValidationUtils } from '../utils/validation';
import { authenticateJWT } from '../middleware/authMiddleware';
import { ValidationError, ConflictError } from '../middleware/errorMiddleware';

const router = Router();

// Rate limiting state for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Export function to reset rate limiting for tests
export function resetRateLimiting(): void {
  loginAttempts.clear();
}

// Helper function to check rate limiting
function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(email);

  if (!attempts) {
    return true; // No previous attempts
  }

  // Reset if window has passed
  if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.delete(email);
    return true;
  }

  return attempts.count < MAX_LOGIN_ATTEMPTS;
}

// Helper function to record login attempt
function recordLoginAttempt(email: string, successful: boolean): void {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };

  if (successful) {
    // Reset on successful login
    loginAttempts.delete(email);
  } else {
    // Increment failed attempts
    attempts.count += 1;
    attempts.lastAttempt = now;
    loginAttempts.set(email, attempts);
  }
}

// POST /api/auth/register - User registration
router.post('/register', async (req, res, next): Promise<void> => {
  try {
    const { email, password, firstName, lastName, businessName, businessRole, agreeToTerms, subscribeToNewsletter } = req.body;

    // Validate required fields
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Invalid email', 'email');
    }

    const passwordValidation = ValidationUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error || 'Invalid password', 'password');
    }

    const firstNameValidation = ValidationUtils.validateName(firstName, 'firstName');
    if (!firstNameValidation.isValid) {
      throw new ValidationError(firstNameValidation.error || 'Invalid first name', 'firstName');
    }

    const lastNameValidation = ValidationUtils.validateName(lastName, 'lastName');
    if (!lastNameValidation.isValid) {
      throw new ValidationError(lastNameValidation.error || 'Invalid last name', 'lastName');
    }

    // Validate terms agreement
    if (!agreeToTerms) {
      throw new ValidationError('You must agree to the terms of service', 'agreeToTerms');
    }

    // Validate business fields if provided
    if (businessName && businessName.length > 100) {
      throw new ValidationError('Business name is too long (max 100 characters)', 'businessName');
    }

    if (businessRole && businessRole.length > 50) {
      throw new ValidationError('Business role is too long (max 50 characters)', 'businessRole');
    }

    // Register user with enhanced data
    const authResponse = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      businessName: businessName || null,
      businessRole: businessRole || null,
      subscribeToNewsletter: subscribeToNewsletter || false,
    });

    res.status(201).json(authResponse);
    return;
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error && error.message.includes('already exists')) {
      next(new ConflictError('User with this email already exists'));
      return;
    }
    next(error);
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: emailValidation.error,
        field: 'email'
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Password is required',
        field: 'password'
      });
    }

    if (password === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Password cannot be empty',
        field: 'password'
      });
    }

    // Check rate limiting
    if (!checkRateLimit(email.toLowerCase())) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      });
    }

    try {
      // Attempt login with rememberMe option
      const authResponse = await AuthService.login({
        email,
        password,
        rememberMe: rememberMe || false,
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || 'unknown'
      });

      // Record successful login
      recordLoginAttempt(email.toLowerCase(), true);

      return res.status(200).json({
        message: 'Login successful',
        ...authResponse
      });
    } catch (loginError) {
      // Record failed login attempt
      recordLoginAttempt(email.toLowerCase(), false);

      if (loginError instanceof Error && loginError.message === 'Invalid credentials') {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
      }

      if (loginError instanceof Error && loginError.message.includes('suspended')) {
        return res.status(403).json({
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.',
        });
      }

      if (loginError instanceof Error && loginError.message.includes('locked')) {
        return res.status(423).json({
          error: 'ACCOUNT_LOCKED',
          message: 'Your account is temporarily locked. Please try again later.',
        });
      }

      throw loginError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during login. Please try again.',
    });
  }
});

// POST /api/auth/verify-email - Email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    // Validate token
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Verification token is required',
        field: 'token'
      });
    }

    const tokenValidation = ValidationUtils.validateEmailVerificationToken(token);
    if (!tokenValidation.isValid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: tokenValidation.error || 'Invalid verification token format',
        field: 'token'
      });
    }

    // Verify email
    const result = await AuthService.verifyEmail(token);

    return res.status(200).json({
      message: 'Email verified successfully',
      ...result
    });
  } catch (error) {
    console.error('Error verifying email:', error);

    if (error instanceof Error && error.message.includes('Invalid or expired')) {
      return res.status(404).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token',
      });
    }

    if (error instanceof Error && error.message.includes('already verified')) {
      return res.status(200).json({
        error: 'ALREADY_VERIFIED',
        message: 'Email address is already verified',
      });
    }

    if (error instanceof Error && error.message.includes('token expired')) {
      return res.status(410).json({
        error: 'TOKEN_EXPIRED',
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during email verification. Please try again.',
    });
  }
});

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: emailValidation.error || 'Invalid email address',
        field: 'email'
      });
    }

    // Resend verification email
    const result = await AuthService.resendEmailVerification(email);

    return res.status(200).json({
      message: 'Verification email sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error resending verification email:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'No account found with that email address',
      });
    }

    if (error instanceof Error && error.message.includes('already verified')) {
      return res.status(400).json({
        error: 'ALREADY_VERIFIED',
        message: 'Email address is already verified',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to resend verification email. Please try again.',
    });
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    // In a more sophisticated implementation, you would:
    // 1. Invalidate the refresh token
    // 2. Add the access token to a blacklist
    // 3. Clear any server-side session data

    // For now, we'll just return success
    // The client is responsible for clearing the token

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during logout.',
    });
  }
});

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Refresh token is required',
        field: 'refreshToken'
      });
    }

    // Refresh the token
    const result = await AuthService.refreshToken(refreshToken);

    return res.status(200).json({
      message: 'Token refreshed successfully',
      ...result
    });
  } catch (error) {
    console.error('Error refreshing token:', error);

    if (error instanceof Error && error.message.includes('invalid')) {
      return res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while refreshing token.',
    });
  }
});

// GET /api/auth/me - Get current user profile (protected route)
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    // User data is already attached by the middleware
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch user profile',
    });
  }
});

// PUT /api/auth/profile - Update user profile (protected route)
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const { firstName, lastName, businessName, businessRole } = req.body;

    // Validate fields if provided
    if (firstName) {
      const firstNameValidation = ValidationUtils.validateName(firstName, 'firstName');
      if (!firstNameValidation.isValid) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: firstNameValidation.error || 'Invalid first name',
          field: 'firstName'
        });
      }
    }

    if (lastName) {
      const lastNameValidation = ValidationUtils.validateName(lastName, 'lastName');
      if (!lastNameValidation.isValid) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: lastNameValidation.error || 'Invalid last name',
          field: 'lastName'
        });
      }
    }

    if (businessName && businessName.length > 100) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Business name is too long (max 100 characters)',
        field: 'businessName'
      });
    }

    if (businessRole && businessRole.length > 50) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Business role is too long (max 50 characters)',
        field: 'businessRole'
      });
    }

    // Update profile
    const result = await AuthService.updateProfile(req.user.id, {
      firstName,
      lastName,
      businessName,
      businessRole,
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: result.user,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update profile',
    });
  }
});

export default router;
