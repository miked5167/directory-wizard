import request from 'supertest';
import app from '../../src/index';

describe('POST /api/auth/register - Contract Tests', () => {
  describe('Request Schema Validation', () => {
    it('should accept valid user registration request', async () => {
      const validPayload = {
        email: 'john@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(validPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', validPayload.email);
      expect(response.body.user).toHaveProperty('firstName', validPayload.firstName);
      expect(response.body.user).toHaveProperty('lastName', validPayload.lastName);
      expect(response.body.user).toHaveProperty('emailVerified', false);

      // Validate UUID format
      expect(response.body.user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should reject request missing required email field', async () => {
      const invalidPayload = {
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject request missing required password field', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should reject request missing required name fields', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/first_name|last_name/);
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const invalidPayload = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
      expect(response.body.error).toContain('format');
    });

    it('should reject email that is too long', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const invalidPayload = {
        email: longEmail,
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });
  });

  describe('Password Validation', () => {
    it('should reject password that is too short', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        password: 'short',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
      expect(response.body.error).toContain('8');
    });

    it('should reject weak password without special characters', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        password: 'weakpassword',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
      expect(response.body.error).toMatch(/complexity|special|number|uppercase/);
    });
  });

  describe('Name Validation', () => {
    it('should reject names that are too long', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        password: 'SecurePass123!',
        first_name: 'A'.repeat(51),
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('first_name');
    });

    it('should reject empty names', async () => {
      const invalidPayload = {
        email: 'john@example.com',
        password: 'SecurePass123!',
        first_name: '',
        last_name: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('first_name');
    });
  });

  describe('Business Logic Validation', () => {
    it('should reject duplicate email registration', async () => {
      const payload = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
      };

      // First registration should succeed
      await request(app).post('/api/auth/register').send(payload).expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...payload,
          first_name: 'Jane', // Different name, same email
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
      expect(response.body.error).toContain('exists');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return user registration response with correct schema', async () => {
      const payload = {
        email: 'schema-test@example.com',
        password: 'SecurePass123!',
        first_name: 'Schema',
        last_name: 'Test',
      };

      const response = await request(app).post('/api/auth/register').send(payload).expect(201);

      // Validate response schema matches OpenAPI spec
      expect(response.body).toEqual(
        expect.objectContaining({
          user_id: expect.any(String),
          email: expect.any(String),
          verification_sent: expect.any(Boolean),
          message: expect.any(String),
        })
      );

      // Should not return sensitive information
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
    });
  });

  describe('Security Considerations', () => {
    it('should not reveal whether email exists in error response timing', async () => {
      const payload = {
        email: 'timing-test@example.com',
        password: 'SecurePass123!',
        first_name: 'Timing',
        last_name: 'Test',
      };

      // Time first registration
      const start1 = Date.now();
      await request(app).post('/api/auth/register').send(payload);
      const time1 = Date.now() - start1;

      // Time duplicate registration attempt
      const start2 = Date.now();
      await request(app).post('/api/auth/register').send(payload);
      const time2 = Date.now() - start2;

      // Response times should be similar (within reasonable variance)
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(100); // Allow 100ms variance
    });
  });
});
