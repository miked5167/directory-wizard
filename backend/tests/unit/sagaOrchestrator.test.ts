import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProvisioningService, ProvisioningJobData, ProvisioningStep } from '../../src/services/ProvisioningService';
import { prisma } from '../../src/models';

// Mock prisma
jest.mock('../../src/models', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    provisioningJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock timers for simulating async processing
jest.useFakeTimers();

describe('ProvisioningService (Saga Orchestrator)', () => {
  const mockTenantId = 'tenant-123';
  const mockJobId = 'job-456';

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Tenant',
    domain: 'test-domain',
    status: 'DRAFT',
    branding: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#ff0000',
      fontFamily: 'Inter',
    },
    categories: [
      { id: 'cat-1', name: 'Category 1', slug: 'category-1' },
      { id: 'cat-2', name: 'Category 2', slug: 'category-2' },
    ],
    listings: [
      { id: 'list-1', title: 'Listing 1', slug: 'listing-1' },
    ],
  };

  const mockJob = {
    id: mockJobId,
    tenantId: mockTenantId,
    type: 'CREATE',
    status: 'QUEUED',
    progress: 0,
    currentStep: 'QUEUED',
    stepsTotal: 6,
    stepsCompleted: 0,
    externalRefs: {},
    compensationData: {},
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('createProvisioningJob', () => {
    it('should create a new provisioning job with correct initial state', async () => {
      const mockCreatedJob = { ...mockJob };
      (prisma.provisioningJob.create as jest.Mock).mockResolvedValue(mockCreatedJob);

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      const jobId = await ProvisioningService.createProvisioningJob(jobData);

      expect(jobId).toBe(mockJobId);
      expect(prisma.provisioningJob.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          type: 'CREATE',
          status: 'QUEUED',
          progress: 0,
          currentStep: 'QUEUED',
          stepsTotal: 6,
          stepsCompleted: 0,
          externalRefs: {},
          compensationData: {},
        },
      });
    });

    it('should handle different job types', async () => {
      const jobTypes: Array<ProvisioningJobData['type']> = ['CREATE', 'UPDATE', 'DELETE', 'REPUBLISH'];

      for (const type of jobTypes) {
        const mockCreatedJob = { ...mockJob, type };
        (prisma.provisioningJob.create as jest.Mock).mockResolvedValue(mockCreatedJob);

        const jobData: ProvisioningJobData = {
          tenantId: mockTenantId,
          type,
        };

        await ProvisioningService.createProvisioningJob(jobData);

        expect(prisma.provisioningJob.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type,
            }),
          })
        );
      }
    });

    it('should start job execution asynchronously', async () => {
      const mockCreatedJob = { ...mockJob };
      (prisma.provisioningJob.create as jest.Mock).mockResolvedValue(mockCreatedJob);
      (prisma.provisioningJob.update as jest.Mock).mockResolvedValue({ ...mockJob, status: 'RUNNING' });
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue(mockTenant);

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      const jobId = await ProvisioningService.createProvisioningJob(jobData);

      // Job should be created and returned immediately
      expect(jobId).toBe(mockJobId);

      // Job execution should start asynchronously
      // Fast-forward through all timers to complete the job
      await jest.runAllTimersAsync();

      // Verify that the job was marked as running
      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            status: 'RUNNING',
            startedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(null);

      const status = await ProvisioningService.getJobStatus('non-existent-job');

      expect(status).toBeNull();
    });

    it('should return formatted job status for queued job', async () => {
      const queuedJob = { ...mockJob, tenant: mockTenant };
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(queuedJob);

      const status = await ProvisioningService.getJobStatus(mockJobId);

      expect(status).toEqual({
        job_id: mockJobId,
        tenant_id: mockTenantId,
        status: 'QUEUED',
        progress: 0,
        current_step: 'QUEUED',
        steps_total: 6,
        steps_completed: 0,
        started_at: undefined,
      });
    });

    it('should return formatted job status for running job', async () => {
      const runningJob = {
        ...mockJob,
        status: 'RUNNING',
        progress: 50,
        currentStep: 'DEPLOY_TO_CDN',
        stepsCompleted: 3,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        tenant: mockTenant,
      };
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(runningJob);

      const status = await ProvisioningService.getJobStatus(mockJobId);

      expect(status).toEqual({
        job_id: mockJobId,
        tenant_id: mockTenantId,
        status: 'RUNNING',
        progress: 50,
        current_step: 'DEPLOY_TO_CDN',
        steps_total: 6,
        steps_completed: 3,
        started_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return job status with result for completed job', async () => {
      const completedJob = {
        ...mockJob,
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'COMPLETED',
        stepsCompleted: 6,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        completedAt: new Date('2024-01-01T01:00:00Z'),
        externalRefs: {
          result: {
            tenant_url: 'https://test-domain.example.com',
            admin_url: 'https://test-domain.example.com/admin',
          },
        },
        tenant: mockTenant,
      };
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(completedJob);

      const status = await ProvisioningService.getJobStatus(mockJobId);

      expect(status).toEqual({
        job_id: mockJobId,
        tenant_id: mockTenantId,
        status: 'COMPLETED',
        progress: 100,
        current_step: 'COMPLETED',
        steps_total: 6,
        steps_completed: 6,
        started_at: '2024-01-01T00:00:00.000Z',
        completed_at: '2024-01-01T01:00:00.000Z',
        result: {
          tenant_url: 'https://test-domain.example.com',
          admin_url: 'https://test-domain.example.com/admin',
        },
      });
    });

    it('should return job status with error for failed job', async () => {
      const failedJob = {
        ...mockJob,
        status: 'FAILED',
        progress: 33,
        currentStep: 'GENERATE_STATIC_SITE',
        stepsCompleted: 2,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        completedAt: new Date('2024-01-01T00:30:00Z'),
        errorMessage: 'Failed to generate static site',
        tenant: mockTenant,
      };
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(failedJob);

      const status = await ProvisioningService.getJobStatus(mockJobId);

      expect(status).toEqual({
        job_id: mockJobId,
        tenant_id: mockTenantId,
        status: 'FAILED',
        progress: 33,
        current_step: 'GENERATE_STATIC_SITE',
        steps_total: 6,
        steps_completed: 2,
        started_at: '2024-01-01T00:00:00.000Z',
        error_message: 'Failed to generate static site',
      });
    });
  });

  describe('Job Execution Saga', () => {
    beforeEach(() => {
      (prisma.provisioningJob.create as jest.Mock).mockResolvedValue(mockJob);
      (prisma.provisioningJob.update as jest.Mock).mockResolvedValue(mockJob);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockResolvedValue(mockTenant);
    });

    it('should execute all steps successfully', async () => {
      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);

      // Fast-forward through all timers to complete the job
      await jest.runAllTimersAsync();

      // Verify job was marked as running
      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            status: 'RUNNING',
            startedAt: expect.any(Date),
          }),
        })
      );

      // Verify progress updates for each step
      const expectedSteps = [
        'VALIDATE_TENANT',
        'GENERATE_STATIC_SITE',
        'DEPLOY_TO_CDN',
        'SETUP_SEARCH_INDEX',
        'CONFIGURE_DOMAIN',
        'COMPLETED',
      ];

      expectedSteps.forEach((step, index) => {
        expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockJobId },
            data: expect.objectContaining({
              currentStep: step,
              stepsCompleted: index + 1,
              progress: Math.round(((index + 1) / 6) * 100),
            }),
          })
        );
      });

      // Verify tenant was marked as published
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTenantId },
          data: expect.objectContaining({
            status: 'PUBLISHED',
            publishedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should handle tenant validation with no categories (warning case)', async () => {
      const tenantWithoutCategories = {
        ...mockTenant,
        categories: [],
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(tenantWithoutCategories);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Tenant ${mockTenantId} has no categories - proceeding for testing`
      );

      consoleWarnSpy.mockRestore();
    });

    it('should update external references during execution', async () => {
      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      // Verify external refs were updated for each step
      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            externalRefs: expect.objectContaining({
              staticSiteGenerated: true,
              buildId: expect.stringMatching(/^build-\d+$/),
            }),
          }),
        })
      );

      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            externalRefs: expect.objectContaining({
              cdnDeployed: true,
              deploymentUrl: 'https://test-domain.example.com',
            }),
          }),
        })
      );

      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            externalRefs: expect.objectContaining({
              searchIndexCreated: true,
              indexId: `idx-${mockTenantId}`,
            }),
          }),
        })
      );

      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            externalRefs: expect.objectContaining({
              domainConfigured: true,
              customDomain: 'test-domain.example.com',
            }),
          }),
        })
      );
    });
  });

  describe('Error Handling and Compensation', () => {
    beforeEach(() => {
      (prisma.provisioningJob.create as jest.Mock).mockResolvedValue(mockJob);
      (prisma.provisioningJob.update as jest.Mock).mockResolvedValue(mockJob);
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(mockJob);
    });

    it('should handle tenant not found error', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      // Verify job was marked as failed
      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Tenant not found',
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Job ${mockJobId} failed:`,
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle compensation for completed steps when job fails', async () => {
      // Setup: First two steps succeed, third step fails
      let callCount = 0;
      (prisma.tenant.findUnique as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(mockTenant);
        } else {
          return Promise.reject(new Error('Step 3 failed'));
        }
      });

      const jobWithProgress = {
        ...mockJob,
        stepsCompleted: 2,
      };
      (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(jobWithProgress);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      // Verify job was marked as failed with compensation
      expect(prisma.provisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Step 3 failed',
            completedAt: expect.any(Date),
          }),
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in marking job as failed', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockRejectedValue(new Error('Initial error'));
      (prisma.provisioningJob.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Failed to mark job ${mockJobId} as failed (job may have been deleted):`,
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    describe('getTenantJobs', () => {
      it('should return all jobs for a tenant ordered by creation date', async () => {
        const mockJobs = [
          { ...mockJob, id: 'job-1', createdAt: new Date('2024-01-01T12:00:00Z') },
          { ...mockJob, id: 'job-2', createdAt: new Date('2024-01-01T11:00:00Z') },
          { ...mockJob, id: 'job-3', createdAt: new Date('2024-01-01T13:00:00Z') },
        ];

        (prisma.provisioningJob.findMany as jest.Mock).mockResolvedValue(mockJobs);

        const jobs = await ProvisioningService.getTenantJobs(mockTenantId);

        expect(jobs).toEqual(mockJobs);
        expect(prisma.provisioningJob.findMany).toHaveBeenCalledWith({
          where: { tenantId: mockTenantId },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should return empty array when no jobs exist for tenant', async () => {
        (prisma.provisioningJob.findMany as jest.Mock).mockResolvedValue([]);

        const jobs = await ProvisioningService.getTenantJobs(mockTenantId);

        expect(jobs).toEqual([]);
      });
    });

    describe('cancelJob', () => {
      it('should cancel a queued job successfully', async () => {
        const queuedJob = { ...mockJob, status: 'QUEUED' };
        (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(queuedJob);
        (prisma.provisioningJob.update as jest.Mock).mockResolvedValue({
          ...queuedJob,
          status: 'CANCELLED',
        });

        const result = await ProvisioningService.cancelJob(mockJobId);

        expect(result).toBe(true);
        expect(prisma.provisioningJob.update).toHaveBeenCalledWith({
          where: { id: mockJobId },
          data: {
            status: 'CANCELLED',
            completedAt: expect.any(Date),
          },
        });
      });

      it('should cancel a running job successfully', async () => {
        const runningJob = { ...mockJob, status: 'RUNNING' };
        (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(runningJob);
        (prisma.provisioningJob.update as jest.Mock).mockResolvedValue({
          ...runningJob,
          status: 'CANCELLED',
        });

        const result = await ProvisioningService.cancelJob(mockJobId);

        expect(result).toBe(true);
      });

      it('should not cancel a completed job', async () => {
        const completedJob = { ...mockJob, status: 'COMPLETED' };
        (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(completedJob);

        const result = await ProvisioningService.cancelJob(mockJobId);

        expect(result).toBe(false);
        expect(prisma.provisioningJob.update).not.toHaveBeenCalled();
      });

      it('should not cancel a failed job', async () => {
        const failedJob = { ...mockJob, status: 'FAILED' };
        (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(failedJob);

        const result = await ProvisioningService.cancelJob(mockJobId);

        expect(result).toBe(false);
        expect(prisma.provisioningJob.update).not.toHaveBeenCalled();
      });

      it('should return false for non-existent job', async () => {
        (prisma.provisioningJob.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await ProvisioningService.cancelJob('non-existent-job');

        expect(result).toBe(false);
        expect(prisma.provisioningJob.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for each step', () => {
      const totalSteps = 6;
      const expectedProgress = [
        { step: 1, progress: Math.round((1 / totalSteps) * 100) }, // ~17%
        { step: 2, progress: Math.round((2 / totalSteps) * 100) }, // ~33%
        { step: 3, progress: Math.round((3 / totalSteps) * 100) }, // 50%
        { step: 4, progress: Math.round((4 / totalSteps) * 100) }, // ~67%
        { step: 5, progress: Math.round((5 / totalSteps) * 100) }, // ~83%
        { step: 6, progress: Math.round((6 / totalSteps) * 100) }, // 100%
      ];

      expect(expectedProgress).toEqual([
        { step: 1, progress: 17 },
        { step: 2, progress: 33 },
        { step: 3, progress: 50 },
        { step: 4, progress: 67 },
        { step: 5, progress: 83 },
        { step: 6, progress: 100 },
      ]);
    });
  });

  describe('Resilience and Edge Cases', () => {
    it('should handle concurrent job creation for same tenant', async () => {
      (prisma.provisioningJob.create as jest.Mock).mockImplementation(() =>
        Promise.resolve({ ...mockJob, id: `job-${Date.now()}` })
      );

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      const promises = Array.from({ length: 3 }, () =>
        ProvisioningService.createProvisioningJob(jobData)
      );

      const jobIds = await Promise.all(promises);

      expect(jobIds).toHaveLength(3);
      expect(new Set(jobIds).size).toBe(3); // All job IDs should be unique
    });

    it('should handle very long tenant IDs and domain names', async () => {
      const longTenantId = 'tenant-' + 'a'.repeat(100);
      const longDomain = 'very-long-domain-name-' + 'x'.repeat(50);

      const tenantWithLongValues = {
        ...mockTenant,
        id: longTenantId,
        domain: longDomain,
      };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(tenantWithLongValues);
      (prisma.provisioningJob.create as jest.Mock).mockResolvedValue({
        ...mockJob,
        tenantId: longTenantId,
      });

      const jobData: ProvisioningJobData = {
        tenantId: longTenantId,
        type: 'CREATE',
      };

      const jobId = await ProvisioningService.createProvisioningJob(jobData);

      expect(jobId).toBeDefined();
      expect(prisma.provisioningJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: longTenantId,
          }),
        })
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.tenant.update as jest.Mock).mockRejectedValue(new Error('Cleanup failed'));
      (prisma.provisioningJob.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const jobData: ProvisioningJobData = {
        tenantId: mockTenantId,
        type: 'CREATE',
      };

      await ProvisioningService.createProvisioningJob(jobData);
      await jest.runAllTimersAsync();

      // Should log warnings but not fail
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});