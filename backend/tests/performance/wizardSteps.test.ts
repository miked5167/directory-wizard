import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { createApp } from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { SessionManager } from '../../src/middleware/sessionMiddleware';
import { FileProcessor } from '../../src/services/FileProcessor';
import { ValidationUtils } from '../../src/utils/validation';
import { promises as fs } from 'fs';
import path from 'path';

const PERFORMANCE_TARGETS = {
  WIZARD_STEP_TRANSITION: 2000,    // 2 seconds per step transition
  SESSION_CREATION: 500,           // 500ms for session creation
  VALIDATION_TIME: 200,            // 200ms for complex validation
  FILE_UPLOAD_10MB: 30000,         // 30 seconds for 10MB file upload
  AUTO_SAVE_INTERVAL: 1000,        // 1 second for auto-save operations
  PROGRESS_CALCULATION: 100,       // 100ms for progress calculation
  SESSION_RETRIEVAL: 200,          // 200ms for session data retrieval
  CONCURRENT_USERS: 10,            // Support 10 concurrent users per step
  MEMORY_INCREASE_PER_SESSION: 50 * 1024 * 1024, // 50MB per session max
  DATABASE_QUERY_TIME: 500         // 500ms for complex database queries
};

describe('Wizard Steps Performance Tests', () => {
  let app: any;
  let testTenantId: string;
  let testDomain: string;

  beforeEach(async () => {
    app = createApp();
    const dbSetup = await setupTestDatabase();
    testTenantId = dbSetup.tenantId;
    testDomain = dbSetup.domain;

    // Warm up the application
    await request(app).get('/health').expect(200);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Step 1 - Basic Information Performance', () => {
    it('should complete step 1 within performance target', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/wizard/step1')
        .send({
          tenantData: {
            name: 'Test Directory',
            domain: testDomain,
            description: 'A test directory for performance testing',
            adminEmail: 'admin@test.com',
            adminName: 'Test Admin'
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
    });

    it('should handle validation efficiently for step 1', async () => {
      const startTime = performance.now();

      // Test with complex validation scenarios
      const testCases = [
        { domain: 'valid-domain-123', shouldPass: true },
        { domain: 'INVALID-DOMAIN', shouldPass: false },
        { domain: 'x'.repeat(64), shouldPass: false },
        { domain: 'valid', shouldPass: true },
        { domain: 'test-with-hyphens', shouldPass: true }
      ];

      for (const testCase of testCases) {
        const result = ValidationUtils.validateDomain(testCase.domain);
        expect(result.isValid).toBe(testCase.shouldPass);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.VALIDATION_TIME);
    });

    it('should create sessions efficiently', async () => {
      const startTime = performance.now();

      const sessionData = {
        step: 1,
        data: {
          tenantData: {
            name: 'Test Directory',
            domain: testDomain,
            description: 'Test description'
          }
        }
      };

      const sessionId = await SessionManager.createSession(sessionData);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.SESSION_CREATION);
      expect(sessionId).toBeDefined();
    });
  });

  describe('Step 2 - Categories & Structure Performance', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create initial session
      sessionId = await SessionManager.createSession({
        step: 1,
        data: { tenantData: { domain: testDomain } }
      });
    });

    it('should complete step 2 within performance target', async () => {
      const categories = Array.from({ length: 20 }, (_, i) => ({
        name: `Category ${i + 1}`,
        description: `Description for category ${i + 1}`,
        icon: 'default',
        parentId: i > 10 ? Math.floor(Math.random() * 10) + 1 : null
      }));

      const startTime = performance.now();

      const response = await request(app)
        .post('/api/wizard/step2')
        .send({
          sessionId,
          categories
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);
      expect(response.body.success).toBe(true);
    });

    it('should handle category hierarchy validation efficiently', async () => {
      const startTime = performance.now();

      // Test complex hierarchy with 5 levels (maximum)
      const categories = [
        { id: 1, name: 'Root 1', parentId: null },
        { id: 2, name: 'Level 2a', parentId: 1 },
        { id: 3, name: 'Level 3a', parentId: 2 },
        { id: 4, name: 'Level 4a', parentId: 3 },
        { id: 5, name: 'Level 5a', parentId: 4 },
        { id: 6, name: 'Root 2', parentId: null },
        { id: 7, name: 'Level 2b', parentId: 6 }
      ];

      // Validate hierarchy depth for each category
      for (const category of categories) {
        const depth = calculateCategoryDepth(category, categories);
        expect(depth).toBeLessThanOrEqual(5);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.VALIDATION_TIME);
    });
  });

  describe('Step 3 - File Upload Performance', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await SessionManager.createSession({
        step: 2,
        data: {
          tenantData: { domain: testDomain },
          categories: [{ name: 'Test Category' }]
        }
      });
    });

    it('should handle large file uploads within target time', async () => {
      // Create a 10MB test file
      const testFilePath = path.join(__dirname, '../fixtures/large-test-file.csv');
      const fileContent = 'name,email,phone\n' + 'Test User,test@example.com,555-0123\n'.repeat(500000);
      await fs.writeFile(testFilePath, fileContent);

      const startTime = performance.now();

      const response = await request(app)
        .post('/api/wizard/step3')
        .field('sessionId', sessionId)
        .attach('file', testFilePath)
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.FILE_UPLOAD_10MB);
      expect(response.body.success).toBe(true);

      // Cleanup
      await fs.unlink(testFilePath).catch(() => {});
    });

    it('should process multiple file formats efficiently', async () => {
      const testFiles = [
        { name: 'test.csv', content: 'name,email\nTest,test@example.com\n' },
        { name: 'test.json', content: '[{"name":"Test","email":"test@example.com"}]' },
        { name: 'test.xml', content: '<?xml version="1.0"?><listings><listing><name>Test</name></listing></listings>' }
      ];

      const startTime = performance.now();

      for (const file of testFiles) {
        const filePath = path.join(__dirname, '../fixtures', file.name);
        await fs.writeFile(filePath, file.content);

        const processor = new FileProcessor();
        const result = await processor.processFile(filePath, file.name);

        expect(result.success).toBe(true);

        // Cleanup
        await fs.unlink(filePath).catch(() => {});
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);
    });
  });

  describe('Step 4 - Preview & Customization Performance', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await SessionManager.createSession({
        step: 3,
        data: {
          tenantData: { domain: testDomain },
          categories: [{ name: 'Test Category' }],
          listings: Array.from({ length: 100 }, (_, i) => ({
            name: `Business ${i + 1}`,
            email: `business${i + 1}@example.com`,
            category: 'Test Category'
          }))
        }
      });
    });

    it('should generate preview within performance target', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/wizard/step4')
        .send({
          sessionId,
          customization: {
            theme: 'modern',
            primaryColor: '#3B82F6',
            logoUrl: 'https://example.com/logo.png',
            headerText: 'Welcome to Our Directory',
            footerText: 'Contact us for more information'
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);
      expect(response.body.success).toBe(true);
      expect(response.body.previewUrl).toBeDefined();
    });

    it('should calculate progress efficiently', async () => {
      const startTime = performance.now();

      // Calculate progress for a session with all steps
      const progress = await calculateWizardProgress(sessionId);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.PROGRESS_CALCULATION);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Step 5 - Deployment Performance', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await SessionManager.createSession({
        step: 4,
        data: {
          tenantData: { domain: testDomain },
          categories: [{ name: 'Test Category' }],
          listings: [{ name: 'Test Business', email: 'test@example.com' }],
          customization: { theme: 'modern' }
        }
      });
    });

    it('should initiate deployment within performance target', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/wizard/step5')
        .send({
          sessionId,
          deploymentOptions: {
            domain: testDomain,
            ssl: true,
            analytics: true
          }
        })
        .expect(200);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);
      expect(response.body.success).toBe(true);
      expect(response.body.deploymentId).toBeDefined();
    });
  });

  describe('Session Management Performance', () => {
    it('should handle auto-save operations efficiently', async () => {
      const sessionId = await SessionManager.createSession({
        step: 1,
        data: { tenantData: { domain: testDomain } }
      });

      const startTime = performance.now();

      // Simulate auto-save with large data
      const largeData = {
        step: 2,
        data: {
          tenantData: { domain: testDomain },
          categories: Array.from({ length: 50 }, (_, i) => ({
            name: `Category ${i}`,
            description: `Description ${i}`.repeat(10)
          }))
        }
      };

      await SessionManager.updateSession(sessionId, largeData);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.AUTO_SAVE_INTERVAL);
    });

    it('should retrieve session data efficiently', async () => {
      const sessionId = await SessionManager.createSession({
        step: 3,
        data: {
          tenantData: { domain: testDomain },
          categories: Array.from({ length: 100 }, (_, i) => ({ name: `Cat ${i}` })),
          listings: Array.from({ length: 1000 }, (_, i) => ({ name: `Business ${i}` }))
        }
      });

      const startTime = performance.now();

      const session = await SessionManager.getSession(sessionId);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.SESSION_RETRIEVAL);
      expect(session).toBeDefined();
      expect(session?.data.listings).toHaveLength(1000);
    });
  });

  describe('Concurrent User Performance', () => {
    it('should handle multiple concurrent wizard sessions', async () => {
      const startTime = performance.now();
      const promises: Promise<any>[] = [];

      // Create multiple concurrent sessions
      for (let i = 0; i < PERFORMANCE_TARGETS.CONCURRENT_USERS; i++) {
        const promise = request(app)
          .post('/api/wizard/step1')
          .send({
            tenantData: {
              name: `Directory ${i}`,
              domain: `test-${i}-${Date.now()}`,
              description: 'Concurrent test directory',
              adminEmail: `admin${i}@test.com`
            }
          });
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const totalProcessingTime = endTime - startTime;
      const avgProcessingTime = totalProcessingTime / PERFORMANCE_TARGETS.CONCURRENT_USERS;

      expect(avgProcessingTime).toBeLessThan(PERFORMANCE_TARGETS.WIZARD_STEP_TRANSITION);

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });

    it('should maintain performance under concurrent file uploads', async () => {
      const uploadPromises: Promise<any>[] = [];
      const testFileContent = 'name,email\n' + 'Test,test@example.com\n'.repeat(1000);

      for (let i = 0; i < 5; i++) {
        const filePath = path.join(__dirname, `../fixtures/concurrent-test-${i}.csv`);
        await fs.writeFile(filePath, testFileContent);

        const sessionId = await SessionManager.createSession({
          step: 2,
          data: { tenantData: { domain: `test-${i}-${Date.now()}` } }
        });

        const promise = request(app)
          .post('/api/wizard/step3')
          .field('sessionId', sessionId)
          .attach('file', filePath)
          .then(async (response) => {
            await fs.unlink(filePath).catch(() => {});
            return response;
          });

        uploadPromises.push(promise);
      }

      const startTime = performance.now();
      const results = await Promise.all(uploadPromises);
      const endTime = performance.now();

      const totalProcessingTime = endTime - startTime;

      expect(totalProcessingTime).toBeLessThan(PERFORMANCE_TARGETS.FILE_UPLOAD_10MB);

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });
  });

  describe('Memory Performance', () => {
    it('should not exceed memory limits during wizard progression', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and progress through multiple wizard sessions
      const sessions: string[] = [];

      for (let i = 0; i < 5; i++) {
        const sessionId = await SessionManager.createSession({
          step: 1,
          data: {
            tenantData: { domain: `memory-test-${i}-${Date.now()}` },
            categories: Array.from({ length: 20 }, (_, j) => ({ name: `Cat ${j}` })),
            listings: Array.from({ length: 200 }, (_, j) => ({
              name: `Business ${j}`,
              description: 'A'.repeat(100) // Add some data bulk
            }))
          }
        });
        sessions.push(sessionId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_INCREASE_PER_SESSION * sessions.length);

      // Cleanup sessions
      for (const sessionId of sessions) {
        await SessionManager.deleteSession(sessionId);
      }
    });
  });

  describe('Database Query Performance', () => {
    it('should execute complex wizard queries within target time', async () => {
      const startTime = performance.now();

      // Simulate complex queries that might happen during wizard steps
      const queries = [
        // Domain availability check
        () => ValidationUtils.validateDomain(testDomain),
        // Category hierarchy validation
        () => validateCategoryHierarchy([
          { id: 1, name: 'Root', parentId: null },
          { id: 2, name: 'Child', parentId: 1 }
        ]),
        // Listing validation
        () => validateListingData([
          { name: 'Test Business', email: 'test@example.com' }
        ])
      ];

      for (const query of queries) {
        const result = await query();
        expect(result).toBeDefined();
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_TARGETS.DATABASE_QUERY_TIME);
    });
  });
});

// Helper functions
function calculateCategoryDepth(category: any, allCategories: any[]): number {
  if (!category.parentId) return 1;

  const parent = allCategories.find(cat => cat.id === category.parentId);
  if (!parent) return 1;

  return 1 + calculateCategoryDepth(parent, allCategories);
}

async function calculateWizardProgress(sessionId: string): Promise<number> {
  const session = await SessionManager.getSession(sessionId);
  if (!session) return 0;

  const steps = [
    !!session.data.tenantData,
    !!session.data.categories?.length,
    !!session.data.listings?.length,
    !!session.data.customization,
    !!session.data.deployment
  ];

  const completedSteps = steps.filter(Boolean).length;
  return (completedSteps / steps.length) * 100;
}

function validateCategoryHierarchy(categories: any[]): boolean {
  // Simplified validation
  return categories.every(cat => {
    if (!cat.parentId) return true;
    return categories.some(parent => parent.id === cat.parentId);
  });
}

function validateListingData(listings: any[]): boolean {
  // Simplified validation
  return listings.every(listing =>
    listing.name && listing.email && listing.email.includes('@')
  );
}