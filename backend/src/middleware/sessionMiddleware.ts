import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger, securityLogger } from './loggingMiddleware';
import { AuthenticationError, ValidationError } from './errorMiddleware';

// Session configuration interface
export interface SessionConfig {
  secret: string;
  name: string;
  resave: boolean;
  saveUninitialized: boolean;
  rolling: boolean;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: 'strict' | 'lax' | 'none';
    domain?: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    ttl?: number;
  };
}

// Session data interface
export interface SessionData {
  userId?: string;
  tenantId?: string;
  adminUserId?: string;
  wizardStep?: string;
  wizardData?: any;
  loginAttempts?: number;
  lastActivity?: number;
  fingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  roles?: string[];
  permissions?: string[];
  twoFactorVerified?: boolean;
  temporaryData?: Record<string, any>;
}

// Extended session interface
declare module 'express-session' {
  interface SessionData extends SessionData {}
}

// Default session configuration
const defaultSessionConfig: SessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
  name: 'directoryWizard.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'sess:',
    ttl: 24 * 60 * 60, // 24 hours in seconds
  },
};

// Redis client instance
let redisClient: Redis | null = null;

// Initialize Redis client
const initializeRedis = (config: SessionConfig['redis']): Redis => {
  if (redisClient) {
    return redisClient;
  }

  if (!config) {
    throw new Error('Redis configuration is required for session storage');
  }

  redisClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    keyPrefix: config.keyPrefix,
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected for session storage');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis client error', { error: error.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  return redisClient;
};

// Create session store
const createSessionStore = (config: SessionConfig) => {
  if (config.redis) {
    const RedisStore = connectRedis(session);
    const redis = initializeRedis(config.redis);

    return new RedisStore({
      client: redis,
      ttl: config.redis.ttl,
    });
  }

  // Fallback to memory store (not recommended for production)
  logger.warn('Using memory store for sessions - not recommended for production');
  return new session.MemoryStore();
};

// Session middleware factory
export const createSessionMiddleware = (config: Partial<SessionConfig> = {}) => {
  const mergedConfig: SessionConfig = {
    ...defaultSessionConfig,
    ...config,
    cookie: {
      ...defaultSessionConfig.cookie,
      ...config.cookie,
    },
    redis: config.redis !== null ? {
      ...defaultSessionConfig.redis!,
      ...config.redis,
    } : undefined,
  };

  // Validate session secret
  if (!mergedConfig.secret || mergedConfig.secret === 'your-super-secret-key-change-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable must be set in production');
    }
    logger.warn('Using default session secret - change this in production');
  }

  const store = createSessionStore(mergedConfig);

  return session({
    store,
    secret: mergedConfig.secret,
    name: mergedConfig.name,
    resave: mergedConfig.resave,
    saveUninitialized: mergedConfig.saveUninitialized,
    rolling: mergedConfig.rolling,
    cookie: mergedConfig.cookie,
    genid: () => uuidv4(),
  });
};

// Session fingerprinting middleware
export const sessionFingerprinting = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next();
  }

  const fingerprint = Buffer.from(
    JSON.stringify({
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
    })
  ).toString('base64');

  // Check if fingerprint matches existing session
  if (req.session.fingerprint) {
    if (req.session.fingerprint !== fingerprint) {
      securityLogger.logSuspiciousActivity(
        req,
        'Session fingerprint mismatch',
        {
          sessionId: req.sessionID,
          expectedFingerprint: req.session.fingerprint,
          actualFingerprint: fingerprint,
        }
      );

      // Destroy suspicious session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Failed to destroy suspicious session', { error: err.message });
        }
      });

      return res.status(401).json({
        error: 'SECURITY_VIOLATION',
        message: 'Session security check failed',
      });
    }
  } else {
    // Set fingerprint for new session
    req.session.fingerprint = fingerprint;
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.headers['user-agent'];
  }

  next();
};

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next(new AuthenticationError('Session not available'));
  }

  // Update last activity
  req.session.lastActivity = Date.now();

  // Check for session timeout
  const maxInactivity = 30 * 60 * 1000; // 30 minutes
  if (req.session.lastActivity && (Date.now() - req.session.lastActivity > maxInactivity)) {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Failed to destroy inactive session', { error: err.message });
      }
    });

    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Session expired due to inactivity',
    });
  }

  next();
};

// Admin session middleware
export const requireAdminSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.adminUserId) {
    return next(new AuthenticationError('Admin authentication required'));
  }

  next();
};

// User session middleware
export const requireUserSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return next(new AuthenticationError('User authentication required'));
  }

  next();
};

// Tenant context middleware
export const requireTenantContext = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.tenantId) {
    return next(new ValidationError('Tenant context required'));
  }

  // Add tenant ID to request for convenience
  (req as any).tenantId = req.session.tenantId;

  next();
};

// Wizard session middleware
export const wizardSessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next(new AuthenticationError('Session required for wizard'));
  }

  // Initialize wizard data if not present
  if (!req.session.wizardData) {
    req.session.wizardData = {};
  }

  // Add wizard helpers to request
  (req as any).wizard = {
    getStep: () => req.session.wizardStep,
    setStep: (step: string) => {
      req.session.wizardStep = step;
    },
    getData: (key?: string) => {
      if (key) {
        return req.session.wizardData?.[key];
      }
      return req.session.wizardData;
    },
    setData: (key: string, value: any) => {
      if (!req.session.wizardData) {
        req.session.wizardData = {};
      }
      req.session.wizardData[key] = value;
    },
    clearData: () => {
      req.session.wizardData = {};
    },
    isComplete: () => {
      return req.session.wizardStep === 'COMPLETED';
    },
  };

  next();
};

// Two-factor authentication session middleware
export const twoFactorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return next(new AuthenticationError('Authentication required'));
  }

  // Check if 2FA is required but not verified
  if (req.session.userId && !req.session.twoFactorVerified) {
    // Allow access to 2FA verification endpoints
    const allowedPaths = ['/api/auth/2fa/verify', '/api/auth/logout'];
    if (!allowedPaths.some(path => req.path.startsWith(path))) {
      return res.status(403).json({
        error: 'TWO_FACTOR_REQUIRED',
        message: 'Two-factor authentication verification required',
      });
    }
  }

  next();
};

// Session cleanup middleware
export const sessionCleanup = (req: Request, res: Response, next: NextFunction) => {
  // Clean up temporary data older than 1 hour
  if (req.session && req.session.temporaryData) {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const cleanedData: Record<string, any> = {};

    Object.entries(req.session.temporaryData).forEach(([key, value]) => {
      if (typeof value === 'object' && value.timestamp && value.timestamp > oneHourAgo) {
        cleanedData[key] = value;
      } else if (typeof value !== 'object') {
        cleanedData[key] = value;
      }
    });

    req.session.temporaryData = cleanedData;
  }

  next();
};

// Session helpers
export const sessionHelpers = {
  // Store temporary data with timestamp
  setTemporaryData: (req: Request, key: string, value: any, ttl: number = 3600000) => {
    if (!req.session.temporaryData) {
      req.session.temporaryData = {};
    }
    req.session.temporaryData[key] = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + ttl,
    };
  },

  // Get temporary data
  getTemporaryData: (req: Request, key: string) => {
    if (!req.session.temporaryData || !req.session.temporaryData[key]) {
      return null;
    }

    const data = req.session.temporaryData[key];
    if (data.expires && Date.now() > data.expires) {
      delete req.session.temporaryData[key];
      return null;
    }

    return data.value;
  },

  // Clear temporary data
  clearTemporaryData: (req: Request, key?: string) => {
    if (!req.session.temporaryData) {
      return;
    }

    if (key) {
      delete req.session.temporaryData[key];
    } else {
      req.session.temporaryData = {};
    }
  },

  // Get session info
  getSessionInfo: (req: Request) => {
    if (!req.session) {
      return null;
    }

    return {
      sessionId: req.sessionID,
      userId: req.session.userId,
      tenantId: req.session.tenantId,
      adminUserId: req.session.adminUserId,
      wizardStep: req.session.wizardStep,
      lastActivity: req.session.lastActivity,
      fingerprint: req.session.fingerprint,
      ipAddress: req.session.ipAddress,
      userAgent: req.session.userAgent,
      twoFactorVerified: req.session.twoFactorVerified,
    };
  },

  // Destroy session
  destroySession: (req: Request): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return resolve();
      }

      req.session.destroy((err) => {
        if (err) {
          logger.error('Failed to destroy session', { error: err.message });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  // Regenerate session ID
  regenerateSession: (req: Request): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return reject(new Error('No session to regenerate'));
      }

      req.session.regenerate((err) => {
        if (err) {
          logger.error('Failed to regenerate session', { error: err.message });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
};

// Health check for session store
export const sessionHealthCheck = async (): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> => {
  try {
    if (redisClient) {
      await redisClient.ping();
      return { status: 'healthy' };
    } else {
      return { status: 'healthy', details: 'Using memory store' };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export Redis client for direct access if needed
export const getRedisClient = (): Redis | null => redisClient;

// Export default configuration
export { defaultSessionConfig };