import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  BusinessLogicError,
  DatabaseError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  asyncHandler,
  validateRequired,
  assertBusinessRule,
  handleDatabaseOperation,
} from '../middleware/errorMiddleware';

// Example of how to use error middleware in routes

// Example 1: Using asyncHandler for automatic error catching
export const exampleAsyncRoute = asyncHandler(async (req: Request, res: Response) => {
  // This will automatically catch any thrown errors and pass them to error middleware
  const userId = req.params.id;

  // Validate required parameter
  validateRequired(userId, 'User ID');

  // Simulate database operation that might fail
  const user = await handleDatabaseOperation(async () => {
    // Your database operation here
    throw new Error('Database connection failed');
  }, 'Failed to fetch user');

  res.json({ user });
});

// Example 2: Manual validation with custom errors
export const exampleValidationRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, age } = req.body;

    // Validate required fields
    if (!email) {
      throw new ValidationError('Email is required', 'email');
    }

    if (!password) {
      throw new ValidationError('Password is required', 'password');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password');
    }

    // Validate age if provided
    if (age !== undefined && (age < 13 || age > 120)) {
      throw new ValidationError('Age must be between 13 and 120', 'age');
    }

    res.json({ message: 'Validation passed' });
  } catch (error) {
    next(error); // Pass error to error middleware
  }
};

// Example 3: Business logic validation
export const exampleBusinessLogicRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount } = req.body;

    // Simulate checking user balance
    const userBalance = 100; // Mock balance
    const requestedAmount = parseFloat(amount);

    // Business rule: Cannot withdraw more than balance
    assertBusinessRule(requestedAmount <= userBalance, 'Insufficient funds for withdrawal');

    // Business rule: Cannot withdraw negative amount
    assertBusinessRule(requestedAmount > 0, 'Withdrawal amount must be positive');

    // Business rule: Maximum withdrawal limit
    assertBusinessRule(requestedAmount <= 1000, 'Daily withdrawal limit exceeded');

    res.json({ message: 'Withdrawal processed' });
  } catch (error) {
    next(error);
  }
};

// Example 4: Database error handling
export const exampleDatabaseRoute = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Use handleDatabaseOperation for consistent error handling
  const result = await handleDatabaseOperation(async () => {
    // Simulate Prisma database operation
    const user = await simulateUserLookup(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }, 'Failed to retrieve user data');

  res.json({ user: result });
});

// Example 5: Authentication and authorization
export const exampleAuthRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if authorization header exists
    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    // Simulate token validation
    const isValidToken = authHeader === 'Bearer valid-token';
    if (!isValidToken) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Simulate permission check
    const userRole = 'user'; // Mock role
    const requiredRole = 'admin';

    if (userRole !== requiredRole) {
      throw new AuthorizationError('Admin access required for this resource');
    }

    res.json({ message: 'Access granted' });
  } catch (error) {
    next(error);
  }
};

// Example 6: Conflict handling (e.g., duplicate resources)
export const exampleConflictRoute = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Simulate checking if user already exists
  const existingUser = await simulateUserExistence(email);

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user logic here...
  res.json({ message: 'User created successfully' });
});

// Example 7: Rate limiting
export const exampleRateLimitRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIP = req.ip;
    const requestCount = getRequestCount(clientIP); // Mock function

    if (requestCount > 100) {
      throw new RateLimitError('API rate limit exceeded. Please try again later.');
    }

    res.json({ message: 'Request processed' });
  } catch (error) {
    next(error);
  }
};

// Example 8: Comprehensive route with multiple error types
export const exampleComprehensiveRoute = asyncHandler(async (req: Request, res: Response) => {
  const { userId, action, data } = req.body;

  // 1. Validation
  validateRequired(userId, 'User ID');
  validateRequired(action, 'Action');

  // 2. Authentication check
  if (!req.headers.authorization) {
    throw new AuthenticationError();
  }

  // 3. Database operation with error handling
  const user = await handleDatabaseOperation(async () => {
    const foundUser = await simulateUserLookup(userId);
    if (!foundUser) {
      throw new NotFoundError('User');
    }
    return foundUser;
  }, 'Failed to retrieve user');

  // 4. Business logic validation
  assertBusinessRule(user.isActive, 'Cannot perform action on inactive user');

  assertBusinessRule(
    user.permissions.includes(action),
    'User does not have permission for this action'
  );

  // 5. Rate limiting check
  const actionCount = getUserActionCount(userId, action);
  if (actionCount > 10) {
    throw new RateLimitError('Action limit exceeded for this user');
  }

  // 6. Success response
  res.json({
    message: 'Action completed successfully',
    user: user.id,
    action,
    timestamp: new Date().toISOString(),
  });
});

// Mock helper functions (these would be real implementations in practice)
async function simulateUserLookup(id: string) {
  // Simulate database lookup
  if (id === 'valid-id') {
    return {
      id,
      name: 'Test User',
      isActive: true,
      permissions: ['read', 'write'],
    };
  }
  return null;
}

async function simulateUserExistence(email: string) {
  // Simulate checking if user exists
  return email === 'existing@example.com';
}

function getRequestCount(ip: string): number {
  // Mock rate limiting counter
  return ip === '127.0.0.1' ? 101 : 5;
}

function getUserActionCount(userId: string, action: string): number {
  // Mock action counter
  return userId === 'rate-limited-user' ? 11 : 3;
}
