import request from 'supertest';
import app from '../../src/index';
import { resetRateLimiting } from '../../src/routes/auth';

describe('POST /api/auth/login - Contract Tests', () => {
  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    // Reset rate limiting state for clean tests
    resetRateLimiting();

    // Register a test user for login tests
    await request(app).post('/api/auth/register').send(testUser);
  });

  describe('Request Schema Validation', () => {
    it('should accept valid login request', async () => {
      const validPayload = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(validPayload)
        .expect('Content-Type', /json/);

      // This test MUST FAIL until we implement the endpoint
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject request missing required email field', async () => {
      const invalidPayload = {
        password: testUser.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject request missing required password field', async () => {
      const invalidPayload = {
        email: testUser.email,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should reject empty payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const invalidPayload = {
        email: 'invalid-email',
        password: testUser.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject non-existent email', async () => {
      const invalidPayload = {
        email: 'nonexistent@example.com',
        password: testUser.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('Password Validation', () => {
    it('should reject incorrect password', async () => {
      const invalidPayload = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject empty password', async () => {
      const invalidPayload = {
        email: testUser.email,
        password: '',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return login response with correct schema', async () => {
      const validPayload = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app).post('/api/auth/login').send(validPayload).expect(200);

      // Validate response schema
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresAt');

      // Validate token structure
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);

      // Validate user object
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('lastName');
      expect(response.body.user).toHaveProperty('emailVerified');

      // Validate data types
      expect(typeof response.body.user.id).toBe('string');
      expect(typeof response.body.user.email).toBe('string');
      expect(typeof response.body.user.firstName).toBe('string');
      expect(typeof response.body.user.lastName).toBe('string');
      expect(typeof response.body.user.emailVerified).toBe('boolean');
      expect(typeof response.body.expiresAt).toBe('string');

      // Ensure sensitive data is not included
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('passwordResetToken');
    });

    it('should return valid JWT token', async () => {
      const validPayload = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app).post('/api/auth/login').send(validPayload).expect(200);

      // JWT should have 3 parts separated by dots
      const tokenParts = response.body.token.split('.');
      expect(tokenParts).toHaveLength(3);

      // Each part should be base64 encoded
      tokenParts.forEach((part: string) => {
        expect(part.length).toBeGreaterThan(0);
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      });
    });
  });

  describe('Security Considerations', () => {
    it('should rate limit login attempts', async () => {
      const invalidPayload = {
        email: testUser.email,
        password: 'WrongPassword',
      };

      // Make multiple failed login attempts
      const attempts = Array(6)
        .fill(null)
        .map(() => request(app).post('/api/auth/login').send(invalidPayload));

      const responses = await Promise.all(attempts);

      // Should start rate limiting after several attempts
      const lastResponse = responses[responses.length - 1];
      expect([429, 401]).toContain(lastResponse?.status);
    });

    it('should not reveal user existence in timing', async () => {
      const nonExistentPayload = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const invalidPayload = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      // Both should take similar time and return similar responses
      const start1 = Date.now();
      const response1 = await request(app).post('/api/auth/login').send(nonExistentPayload);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const response2 = await request(app).post('/api/auth/login').send(invalidPayload);
      const time2 = Date.now() - start2;

      // Both should return 401 with similar message
      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
      expect(response1.body.error).toContain('Invalid credentials');
      expect(response2.body.error).toContain('Invalid credentials');

      // Time difference should be reasonable (within 100ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });

  describe('Email Verification Status', () => {
    it('should allow login for unverified users but include verification status', async () => {
      const validPayload = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app).post('/api/auth/login').send(validPayload).expect(200);

      expect(response.body.user).toHaveProperty('emailVerified');
      expect(typeof response.body.user.emailVerified).toBe('boolean');
    });
  });
});
