import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Log levels enum
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Request log interface
export interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, any>;
  userAgent: string;
  ip: string;
  userId?: string;
  tenantId?: string;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  requestId: string;
  level: LogLevel;
  message: string;
}

// Performance metrics interface
export interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  timestamp: string;
  userAgent: string;
  ip: string;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

// Logger class
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    return JSON.stringify(logEntry);
  }

  public error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, data));
    }
  }

  public warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, data));
    }
  }

  public info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(LogLevel.INFO, message, data));
    }
  }

  public debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, data));
    }
  }

  public logRequest(requestLog: RequestLog): void {
    const level = requestLog.statusCode && requestLog.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    if (this.shouldLog(level)) {
      console.log(this.formatLog(level, requestLog.message, requestLog));
    }
  }

  public logPerformance(metrics: PerformanceMetrics): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const message = `Performance: ${metrics.method} ${metrics.path} - ${metrics.duration}ms`;
      console.log(this.formatLog(LogLevel.DEBUG, message, metrics));
    }
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Extract client IP address
const getClientIP = (req: Request): string => {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Sanitize sensitive data from logs
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'authorization',
    'cookie',
    'secret',
    'key',
    'api_key',
    'apiKey',
    'refresh_token',
    'refreshToken',
    'access_token',
    'accessToken',
  ];

  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

// Request logging middleware
export const requestLogger = (options: {
  logBody?: boolean;
  logHeaders?: boolean;
  excludePaths?: string[];
  logLevel?: LogLevel;
} = {}) => {
  const {
    logBody = false,
    logHeaders = false,
    excludePaths = ['/health', '/metrics'],
    logLevel = LogLevel.INFO,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const requestId = generateRequestId();
    const startTime = performance.now();

    // Add request ID to request object for use in other middleware
    (req as any).requestId = requestId;

    // Extract request information
    const requestInfo = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: sanitizeData(req.query),
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIP(req),
      timestamp: new Date().toISOString(),
    };

    // Add optional data
    const logData: any = { ...requestInfo };

    if (logHeaders) {
      logData.headers = sanitizeData(req.headers);
    }

    if (logBody && req.body) {
      logData.body = sanitizeData(req.body);
    }

    // Extract user and tenant info if available
    if ((req as any).user) {
      logData.userId = (req as any).user.id;
    }

    if ((req as any).tenant) {
      logData.tenantId = (req as any).tenant.id;
    }

    // Log request start
    logger.info(`Incoming request: ${req.method} ${req.path}`, logData);

    // Override res.end to capture response information
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Create request log
      const requestLog: RequestLog = {
        ...requestInfo,
        duration,
        statusCode: res.statusCode,
        responseSize: res.get('content-length') ? parseInt(res.get('content-length')!) : undefined,
        level: res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
        message: `Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      };

      // Add user and tenant info to final log
      if ((req as any).user) {
        requestLog.userId = (req as any).user.id;
      }

      if ((req as any).tenant) {
        requestLog.tenantId = (req as any).tenant.id;
      }

      // Log request completion
      logger.logRequest(requestLog);

      // Log performance metrics if enabled
      if (logger.getInstance().shouldLog(LogLevel.DEBUG)) {
        const performanceMetrics: PerformanceMetrics = {
          requestId,
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'] || 'unknown',
          ip: getClientIP(req),
          memoryUsage: process.memoryUsage(),
        };

        logger.logPerformance(performanceMetrics);
      }

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Error logging middleware (should be used after error handler)
export const errorLogger = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req as any).requestId || 'unknown';

  const errorLog = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    userId: (req as any).user?.id,
    tenantId: (req as any).tenant?.id,
  };

  logger.error(`Request error: ${req.method} ${req.path}`, errorLog);

  next(error);
};

// Security event logger
export const securityLogger = {
  logFailedAuth: (req: Request, reason: string): void => {
    logger.warn('Authentication failed', {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  logSuspiciousActivity: (req: Request, activity: string, details?: any): void => {
    logger.warn('Suspicious activity detected', {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      activity,
      details: sanitizeData(details),
      timestamp: new Date().toISOString(),
    });
  },

  logRateLimitExceeded: (req: Request, limit: number): void => {
    logger.warn('Rate limit exceeded', {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      limit,
      timestamp: new Date().toISOString(),
    });
  },
};

// Application event logger
export const applicationLogger = {
  logTenantCreated: (tenantId: string, userId?: string): void => {
    logger.info('Tenant created', {
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
    });
  },

  logTenantPublished: (tenantId: string, domain: string): void => {
    logger.info('Tenant published', {
      tenantId,
      domain,
      timestamp: new Date().toISOString(),
    });
  },

  logFileProcessed: (sessionId: string, filename: string, fileSize: number, processingTime: number): void => {
    logger.info('File processed', {
      sessionId,
      filename,
      fileSize,
      processingTime,
      timestamp: new Date().toISOString(),
    });
  },

  logJobStarted: (jobId: string, jobType: string, tenantId: string): void => {
    logger.info('Background job started', {
      jobId,
      jobType,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  },

  logJobCompleted: (jobId: string, jobType: string, duration: number, success: boolean): void => {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success ? 'Background job completed' : 'Background job failed';

    if (level === LogLevel.INFO) {
      logger.info(message, {
        jobId,
        jobType,
        duration,
        success,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error(message, {
        jobId,
        jobType,
        duration,
        success,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Health check logger
export const healthLogger = {
  logHealthCheck: (service: string, status: 'healthy' | 'unhealthy', details?: any): void => {
    const level = status === 'healthy' ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Health check: ${service} is ${status}`;

    if (level === LogLevel.INFO) {
      logger.info(message, {
        service,
        status,
        details,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error(message, {
        service,
        status,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Structured logging helpers
export const createLogContext = (req: Request): Record<string, any> => {
  return {
    requestId: (req as any).requestId,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    tenantId: (req as any).tenant?.id,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };
};

export const logWithContext = (
  level: LogLevel,
  message: string,
  context: Record<string, any>,
  additionalData?: any
): void => {
  const logData = {
    ...context,
    ...(additionalData && { data: sanitizeData(additionalData) }),
  };

  switch (level) {
    case LogLevel.ERROR:
      logger.error(message, logData);
      break;
    case LogLevel.WARN:
      logger.warn(message, logData);
      break;
    case LogLevel.INFO:
      logger.info(message, logData);
      break;
    case LogLevel.DEBUG:
      logger.debug(message, logData);
      break;
  }
};