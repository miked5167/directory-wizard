import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { securityLogger } from './loggingMiddleware';

// Security configuration interface
export interface SecurityConfig {
  cors: {
    origins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge?: number;
  };
  helmet: {
    contentSecurityPolicy?: {
      directives: Record<string, string[]>;
    };
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: { policy: string };
    dnsPrefetchControl?: boolean;
    frameguard?: { action: string };
    hidePoweredBy?: boolean;
    hsts?: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: boolean;
    referrerPolicy?: { policy: string[] };
    xssFilter?: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
  trustedProxies?: string[];
  fileUpload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    maxFiles: number;
  };
}

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: ['no-referrer-when-downgrade'] },
    xssFilter: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    maxFiles: 10,
  },
};

// Rate limiting configurations for different endpoints
export const rateLimitConfigs = {
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req: Request, res: Response) => {
      securityLogger.logRateLimitExceeded(req, 5);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: Math.round(15 * 60), // seconds
      });
    },
  }),

  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.logRateLimitExceeded(req, 100);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many API requests, please try again later.',
        retryAfter: Math.round(15 * 60), // seconds
      });
    },
  }),

  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: 'Too many file uploads, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.logRateLimitExceeded(req, 20);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later.',
        retryAfter: Math.round(60 * 60), // seconds
      });
    },
  }),

  registration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: 'Too many registration attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.logRateLimitExceeded(req, 3);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts, please try again later.',
        retryAfter: Math.round(60 * 60), // seconds
      });
    },
  }),
};

// CORS configuration
export const createCorsMiddleware = (config: SecurityConfig['cors'] = defaultSecurityConfig.cors) => {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (config.origins.includes(origin) || config.origins.includes('*')) {
        return callback(null, true);
      }

      // Log suspicious origin attempts
      securityLogger.logSuspiciousActivity(
        { headers: { origin } } as Request,
        'Blocked CORS request from unauthorized origin',
        { origin, allowedOrigins: config.origins }
      );

      callback(new Error('Not allowed by CORS'));
    },
    credentials: config.credentials,
    methods: config.methods,
    allowedHeaders: config.allowedHeaders,
    exposedHeaders: config.exposedHeaders,
    maxAge: config.maxAge,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });
};

// Helmet configuration
export const createHelmetMiddleware = (config: SecurityConfig['helmet'] = defaultSecurityConfig.helmet) => {
  return helmet({
    contentSecurityPolicy: config.contentSecurityPolicy ? {
      directives: config.contentSecurityPolicy.directives,
      reportOnly: process.env.NODE_ENV === 'development',
    } : false,
    crossOriginEmbedderPolicy: config.crossOriginEmbedderPolicy,
    crossOriginOpenerPolicy: config.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: config.crossOriginResourcePolicy,
    dnsPrefetchControl: config.dnsPrefetchControl,
    frameguard: config.frameguard,
    hidePoweredBy: config.hidePoweredBy,
    hsts: process.env.NODE_ENV === 'production' ? config.hsts : false,
    ieNoOpen: config.ieNoOpen,
    noSniff: config.noSniff,
    originAgentCluster: config.originAgentCluster,
    permittedCrossDomainPolicies: config.permittedCrossDomainPolicies,
    referrerPolicy: config.referrerPolicy,
    xssFilter: config.xssFilter,
  });
};

// IP validation middleware
export const ipValidation = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // Block private IP ranges in production if not from trusted proxies
  if (process.env.NODE_ENV === 'production' && clientIP) {
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.)/;

    if (privateIPRegex.test(clientIP)) {
      const trustedProxies = defaultSecurityConfig.trustedProxies;
      const forwardedFor = req.headers['x-forwarded-for'] as string;

      if (!trustedProxies.length || !forwardedFor) {
        securityLogger.logSuspiciousActivity(
          req,
          'Request from private IP address',
          { clientIP, forwardedFor }
        );

        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied from this IP address',
        });
      }
    }
  }

  next();
};

// Request size validation
export const requestSizeValidation = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength) > maxSize) {
      securityLogger.logSuspiciousActivity(
        req,
        'Request size exceeds limit',
        { contentLength, maxSize }
      );

      return res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload too large',
        maxSize,
      });
    }

    next();
  };
};

// Content type validation
export const contentTypeValidation = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      securityLogger.logSuspiciousActivity(
        req,
        'Invalid content type',
        { contentType, allowedTypes }
      );

      return res.status(415).json({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content type not supported',
        allowedTypes,
      });
    }

    next();
  };
};

// User agent validation
export const userAgentValidation = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'];

  if (!userAgent) {
    securityLogger.logSuspiciousActivity(
      req,
      'Request without user agent',
      { userAgent }
    );

    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'User agent header required',
    });
  }

  // Block known malicious user agents
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /burp/i,
    /acunetix/i,
    /nessus/i,
    /openvas/i,
    /python-requests/i,
    /curl\/[\d\.]+$/i,
    /wget/i,
  ];

  if (maliciousPatterns.some(pattern => pattern.test(userAgent))) {
    securityLogger.logSuspiciousActivity(
      req,
      'Blocked malicious user agent',
      { userAgent }
    );

    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied',
    });
  }

  next();
};

// Request method validation
export const methodValidation = (allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method)) {
      securityLogger.logSuspiciousActivity(
        req,
        'Invalid HTTP method',
        { method: req.method, allowedMethods }
      );

      return res.status(405).json({
        error: 'METHOD_NOT_ALLOWED',
        message: 'HTTP method not allowed',
        allowedMethods,
      });
    }

    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Request-ID', (req as any).requestId || 'unknown');

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// File upload security
export const fileUploadSecurity = (config: SecurityConfig['fileUpload'] = defaultSecurityConfig.fileUpload) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This middleware should be used with multer
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file size
      if (file.size > config.maxFileSize) {
        securityLogger.logSuspiciousActivity(
          req,
          'File size exceeds limit',
          { filename: file.originalname, size: file.size, maxSize: config.maxFileSize }
        );

        return res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum allowed size',
          maxSize: config.maxFileSize,
        });
      }

      // Check MIME type
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        securityLogger.logSuspiciousActivity(
          req,
          'Invalid file type uploaded',
          { filename: file.originalname, mimetype: file.mimetype, allowedTypes: config.allowedMimeTypes }
        );

        return res.status(415).json({
          error: 'INVALID_FILE_TYPE',
          message: 'File type not allowed',
          allowedTypes: config.allowedMimeTypes,
        });
      }

      // Check filename for path traversal attempts
      if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        securityLogger.logSuspiciousActivity(
          req,
          'Path traversal attempt in filename',
          { filename: file.originalname }
        );

        return res.status(400).json({
          error: 'INVALID_FILENAME',
          message: 'Invalid filename detected',
        });
      }
    }

    next();
  };
};

// Trust proxy configuration
export const configureTrustedProxies = (app: any, trustedProxies: string[] = defaultSecurityConfig.trustedProxies) => {
  if (trustedProxies.length > 0) {
    app.set('trust proxy', trustedProxies);
  } else if (process.env.NODE_ENV === 'production') {
    // In production, trust first proxy by default
    app.set('trust proxy', 1);
  }
};

// Complete security middleware setup
export const setupSecurity = (app: any, config: Partial<SecurityConfig> = {}) => {
  const mergedConfig = {
    ...defaultSecurityConfig,
    ...config,
    cors: { ...defaultSecurityConfig.cors, ...config.cors },
    helmet: { ...defaultSecurityConfig.helmet, ...config.helmet },
    rateLimit: { ...defaultSecurityConfig.rateLimit, ...config.rateLimit },
    fileUpload: { ...defaultSecurityConfig.fileUpload, ...config.fileUpload },
  };

  // Configure trusted proxies
  configureTrustedProxies(app, mergedConfig.trustedProxies);

  // Apply security middleware in order
  app.use(createHelmetMiddleware(mergedConfig.helmet));
  app.use(createCorsMiddleware(mergedConfig.cors));
  app.use(securityHeaders);
  app.use(ipValidation);
  app.use(userAgentValidation);
  app.use(requestSizeValidation());
  app.use(contentTypeValidation(['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']));
  app.use(methodValidation());

  return {
    rateLimitConfigs,
    fileUploadSecurity: fileUploadSecurity(mergedConfig.fileUpload),
  };
};

// Export default configuration
export { defaultSecurityConfig };