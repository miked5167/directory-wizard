import { Request, Response, NextFunction } from 'express';

// Custom error class for application-specific errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string | undefined;

  constructor(message: string, statusCode: number, code?: string | undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (code !== undefined) {
      this.code = code;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  public field?: string | undefined;

  constructor(message: string, field?: string | undefined) {
    super(message, 400, 'VALIDATION_ERROR');
    if (field !== undefined) {
      this.field = field;
    }
  }
}

// Business logic error class
export class BusinessLogicError extends AppError {
  constructor(message: string, statusCode: number = 422) {
    super(message, statusCode, 'BUSINESS_LOGIC_ERROR');
  }
}

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR');
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

// Conflict error class
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  code?: string | undefined;
  field?: string | undefined;
  stack?: string | undefined;
  timestamp: string;
  path: string;
  method: string;
}

// Helper function to determine if error is operational
const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

// Helper function to handle Prisma errors
const handlePrismaError = (error: any): AppError => {
  if (error.code === 'P2002') {
    // Unique constraint violation
    const field = error.meta?.target?.[0] || 'field';
    return new ConflictError(`A record with this ${field} already exists`);
  }

  if (error.code === 'P2025') {
    // Record not found
    return new NotFoundError('Record');
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return new ValidationError('Related record does not exist');
  }

  if (error.code === 'P2014') {
    // Required relation violation
    return new ValidationError('Required relationship is missing');
  }

  // Generic database error
  return new DatabaseError('Database operation failed', error);
};

// Helper function to handle Multer errors
const handleMulterError = (error: any): AppError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File size too large');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files uploaded');
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }

  return new ValidationError('File upload error');
};

// Helper function to handle JWT errors
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }

  return new AuthenticationError('Authentication failed');
};

// Main error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // Convert known error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'PrismaClientKnownRequestError') {
    appError = handlePrismaError(error);
  } else if (error.name === 'MulterError') {
    appError = handleMulterError(error);
  } else if (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError' ||
    error.name === 'NotBeforeError'
  ) {
    appError = handleJWTError(error);
  } else if (error.name === 'ValidationError') {
    appError = new ValidationError(error.message);
  } else if (error.name === 'CastError') {
    appError = new ValidationError('Invalid data format');
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    appError = new ValidationError('Invalid JSON in request body');
  } else {
    // Unknown error - log it and return generic error
    console.error('Unknown error:', error);
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log error for non-operational errors or in development
  const shouldLog = !isOperationalError(appError) || process.env.NODE_ENV === 'development';
  if (shouldLog) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack,
      timestamp: new Date().toISOString(),
    });
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: appError.message,
    message: appError.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Add optional properties only if they exist
  if (appError.code) {
    errorResponse.code = appError.code;
  }

  // Add field information for validation errors
  if (appError instanceof ValidationError && appError.field) {
    errorResponse.field = appError.field;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && appError.stack) {
    errorResponse.stack = appError.stack;
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for routes that don't exist
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Validation helper
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
};

// Business logic helper
export const assertBusinessRule = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new BusinessLogicError(message);
  }
};

// Database operation helper
export const handleDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new DatabaseError(errorMessage, error as Error);
  }
};
