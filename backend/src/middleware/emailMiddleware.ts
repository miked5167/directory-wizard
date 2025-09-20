import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/EmailService';
import { logger, applicationLogger } from './loggingMiddleware';
import { ValidationError } from './errorMiddleware';
import Queue from 'bull';
import Redis from 'ioredis';

// Email queue configuration
export interface EmailQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  attempts: number;
  backoff: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete: number;
  removeOnFail: number;
}

// Email job data interface
export interface EmailJobData {
  type: 'verification' | 'welcome' | 'claim_notification' | 'password_reset' | 'notification';
  to: string;
  data: any;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  delay?: number;
  attempts?: number;
}

// Email tracking interface
export interface EmailTracking {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed' | 'bounced' | 'delivered';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  attempts: number;
  metadata?: Record<string, any>;
}

// Default email queue configuration
const defaultQueueConfig: EmailQueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.EMAIL_REDIS_DB || '1'),
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};

// Email queue instance
let emailQueue: Queue.Queue | null = null;

// Email tracking storage (in production, use a database)
const emailTracking = new Map<string, EmailTracking>();

// Initialize email queue
export const initializeEmailQueue = (config: Partial<EmailQueueConfig> = {}): Queue.Queue => {
  if (emailQueue) {
    return emailQueue;
  }

  const mergedConfig = {
    ...defaultQueueConfig,
    ...config,
    redis: { ...defaultQueueConfig.redis, ...config.redis },
  };

  // Create Redis connection for Bull
  const redisConfig = {
    port: mergedConfig.redis.port,
    host: mergedConfig.redis.host,
    password: mergedConfig.redis.password,
    db: mergedConfig.redis.db,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
  };

  emailQueue = new Queue('email processing', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: mergedConfig.attempts,
      backoff: mergedConfig.backoff,
      removeOnComplete: mergedConfig.removeOnComplete,
      removeOnFail: mergedConfig.removeOnFail,
    },
  });

  // Process email jobs
  emailQueue.process('send_email', processEmailJob);

  // Queue event handlers
  emailQueue.on('completed', (job, result) => {
    logger.info('Email job completed', {
      jobId: job.id,
      type: job.data.type,
      recipient: job.data.to,
      result,
    });

    updateEmailTracking(job.id?.toString() || '', 'sent');
  });

  emailQueue.on('failed', (job, err) => {
    logger.error('Email job failed', {
      jobId: job.id,
      type: job.data.type,
      recipient: job.data.to,
      error: err.message,
      attempts: job.attemptsMade,
    });

    updateEmailTracking(job.id?.toString() || '', 'failed', err.message);
  });

  emailQueue.on('stalled', (job) => {
    logger.warn('Email job stalled', {
      jobId: job.id,
      type: job.data.type,
      recipient: job.data.to,
    });
  });

  logger.info('Email queue initialized');
  return emailQueue;
};

// Process email job
const processEmailJob = async (job: Queue.Job<EmailJobData>): Promise<boolean> => {
  const { type, to, data } = job.data;

  try {
    let success = false;

    switch (type) {
      case 'verification':
        success = await EmailService.sendEmailVerification(data);
        break;
      case 'welcome':
        success = await EmailService.sendWelcomeEmail(data);
        break;
      case 'claim_notification':
        success = await EmailService.sendClaimNotification(data.claimData, data.status);
        break;
      case 'notification':
        success = await EmailService.sendNotification(to, data.subject, data.content);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    if (!success) {
      throw new Error('Email service returned false');
    }

    applicationLogger.logJobCompleted(
      job.id?.toString() || 'unknown',
      `email_${type}`,
      Date.now() - job.timestamp,
      true
    );

    return success;
  } catch (error) {
    applicationLogger.logJobCompleted(
      job.id?.toString() || 'unknown',
      `email_${type}`,
      Date.now() - job.timestamp,
      false
    );

    throw error;
  }
};

// Update email tracking
const updateEmailTracking = (jobId: string, status: EmailTracking['status'], error?: string) => {
  const tracking = emailTracking.get(jobId);
  if (tracking) {
    tracking.status = status;
    tracking.attempts += 1;

    if (status === 'sent') {
      tracking.sentAt = new Date();
    } else if (status === 'failed') {
      tracking.failedAt = new Date();
      tracking.error = error;
    }

    emailTracking.set(jobId, tracking);
  }
};

// Email rate limiting middleware
export const emailRateLimit = (maxEmailsPerHour: number = 100) => {
  const emailCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    const userCount = emailCounts.get(identifier);

    if (!userCount || now > userCount.resetTime) {
      emailCounts.set(identifier, { count: 1, resetTime: now + hourInMs });
      return next();
    }

    if (userCount.count >= maxEmailsPerHour) {
      logger.warn('Email rate limit exceeded', {
        ip: identifier,
        count: userCount.count,
        limit: maxEmailsPerHour,
      });

      return res.status(429).json({
        error: 'EMAIL_RATE_LIMIT_EXCEEDED',
        message: 'Too many email requests. Please try again later.',
        retryAfter: Math.ceil((userCount.resetTime - now) / 1000),
      });
    }

    userCount.count += 1;
    emailCounts.set(identifier, userCount);
    next();
  };
};

// Email validation middleware
export const validateEmailRequest = (req: Request, res: Response, next: NextFunction) => {
  const { email, type } = req.body;

  if (!email || typeof email !== 'string') {
    return next(new ValidationError('Valid email address is required', 'email'));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new ValidationError('Invalid email format', 'email'));
  }

  if (!type || typeof type !== 'string') {
    return next(new ValidationError('Email type is required', 'type'));
  }

  const validTypes = ['verification', 'welcome', 'claim_notification', 'password_reset', 'notification'];
  if (!validTypes.includes(type)) {
    return next(new ValidationError(`Invalid email type. Must be one of: ${validTypes.join(', ')}`, 'type'));
  }

  next();
};

// Email service health check middleware
export const emailHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthResult = await EmailService.testEmailConfiguration();

    if (!healthResult.success) {
      logger.error('Email service health check failed', { error: healthResult.message });
      return res.status(503).json({
        error: 'EMAIL_SERVICE_UNAVAILABLE',
        message: 'Email service is currently unavailable',
        details: healthResult.message,
      });
    }

    next();
  } catch (error) {
    logger.error('Email health check error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(503).json({
      error: 'EMAIL_SERVICE_ERROR',
      message: 'Unable to verify email service status',
    });
  }
};

// Queue email job
export const queueEmail = async (jobData: EmailJobData): Promise<Queue.Job<EmailJobData>> => {
  if (!emailQueue) {
    emailQueue = initializeEmailQueue();
  }

  const priority = getPriorityValue(jobData.priority || 'normal');
  const jobOptions: Queue.JobOptions = {
    priority,
    delay: jobData.delay || 0,
    attempts: jobData.attempts || defaultQueueConfig.attempts,
  };

  const job = await emailQueue.add('send_email', jobData, jobOptions);

  // Create tracking entry
  const tracking: EmailTracking = {
    id: job.id?.toString() || '',
    type: jobData.type,
    recipient: jobData.to,
    subject: getEmailSubject(jobData),
    status: 'queued',
    attempts: 0,
    metadata: {
      priority: jobData.priority,
      delay: jobData.delay,
    },
  };

  emailTracking.set(tracking.id, tracking);

  logger.info('Email job queued', {
    jobId: job.id,
    type: jobData.type,
    recipient: jobData.to,
    priority: jobData.priority,
  });

  return job;
};

// Get priority value for Bull queue
const getPriorityValue = (priority: string): number => {
  const priorityMap = {
    low: 1,
    normal: 5,
    high: 10,
    critical: 20,
  };
  return priorityMap[priority as keyof typeof priorityMap] || 5;
};

// Get email subject for tracking
const getEmailSubject = (jobData: EmailJobData): string => {
  const subjectMap = {
    verification: 'Email Verification',
    welcome: 'Welcome to Directory AI',
    claim_notification: 'Listing Claim Update',
    password_reset: 'Password Reset',
    notification: jobData.data?.subject || 'Notification',
  };
  return subjectMap[jobData.type as keyof typeof subjectMap] || 'Email';
};

// Express middleware to queue emails
export const queueEmailMiddleware = (type: EmailJobData['type'], priority: EmailJobData['priority'] = 'normal') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const emailData = req.body;

      await queueEmail({
        type,
        to: emailData.email || emailData.to,
        data: emailData,
        priority,
      });

      // Add success flag to response
      (res as any).emailQueued = true;
      next();
    } catch (error) {
      logger.error('Failed to queue email', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });

      // Don't fail the request, just log the error
      (res as any).emailQueued = false;
      next();
    }
  };
};

// Bulk email operations
export const queueBulkEmails = async (emails: EmailJobData[]): Promise<Queue.Job<EmailJobData>[]> => {
  if (!emailQueue) {
    emailQueue = initializeEmailQueue();
  }

  const jobs = await Promise.all(
    emails.map(emailData => queueEmail(emailData))
  );

  logger.info('Bulk emails queued', {
    count: emails.length,
    types: [...new Set(emails.map(e => e.type))],
  });

  return jobs;
};

// Get email queue statistics
export const getQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> => {
  if (!emailQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaiting(),
    emailQueue.getActive(),
    emailQueue.getCompleted(),
    emailQueue.getFailed(),
    emailQueue.getDelayed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
  };
};

// Get email tracking information
export const getEmailTracking = (jobId: string): EmailTracking | null => {
  return emailTracking.get(jobId) || null;
};

// Get all email tracking for a recipient
export const getRecipientEmailHistory = (recipient: string): EmailTracking[] => {
  return Array.from(emailTracking.values()).filter(
    tracking => tracking.recipient === recipient
  );
};

// Clean up old tracking data
export const cleanupEmailTracking = (olderThanDays: number = 30): void => {
  const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));

  for (const [key, tracking] of emailTracking.entries()) {
    const trackingDate = tracking.sentAt || tracking.failedAt;
    if (trackingDate && trackingDate < cutoffDate) {
      emailTracking.delete(key);
    }
  }

  logger.info('Email tracking cleanup completed', {
    cutoffDate: cutoffDate.toISOString(),
    remainingEntries: emailTracking.size,
  });
};

// Email service monitoring
export const monitorEmailService = (): {
  healthy: boolean;
  queueStats: any;
  trackingStats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
} => {
  const trackingArray = Array.from(emailTracking.values());

  return {
    healthy: emailQueue?.client?.status === 'ready',
    queueStats: emailQueue ? {
      name: emailQueue.name,
      isPaused: emailQueue.isPaused(),
    } : null,
    trackingStats: {
      total: trackingArray.length,
      sent: trackingArray.filter(t => t.status === 'sent').length,
      failed: trackingArray.filter(t => t.status === 'failed').length,
      pending: trackingArray.filter(t => t.status === 'queued').length,
    },
  };
};

// Graceful shutdown
export const shutdownEmailQueue = async (): Promise<void> => {
  if (emailQueue) {
    logger.info('Shutting down email queue...');
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue shutdown complete');
  }
};

// Export queue instance getter
export const getEmailQueue = (): Queue.Queue | null => emailQueue;

// Express route helpers
export const emailRoutes = {
  // POST /api/emails/queue - Queue an email
  queueEmail: async (req: Request, res: Response) => {
    try {
      const job = await queueEmail(req.body);
      res.status(202).json({
        message: 'Email queued successfully',
        jobId: job.id,
        status: 'queued',
      });
    } catch (error) {
      res.status(500).json({
        error: 'QUEUE_ERROR',
        message: 'Failed to queue email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  // GET /api/emails/stats - Get queue statistics
  getStats: async (req: Request, res: Response) => {
    try {
      const stats = await getQueueStats();
      const monitoring = monitorEmailService();

      res.json({
        queue: stats,
        service: monitoring,
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'STATS_ERROR',
        message: 'Failed to get email statistics',
      });
    }
  },

  // GET /api/emails/tracking/:jobId - Get tracking info
  getTracking: (req: Request, res: Response) => {
    const { jobId } = req.params;
    const tracking = getEmailTracking(jobId);

    if (!tracking) {
      return res.status(404).json({
        error: 'TRACKING_NOT_FOUND',
        message: 'Email tracking information not found',
      });
    }

    res.json(tracking);
  },
};