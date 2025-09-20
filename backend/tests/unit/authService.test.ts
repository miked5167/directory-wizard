import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService, UserCreateData, LoginCredentials } from '../../src/services/AuthService';
import { prisma } from '../../src/models';

// Mock dependencies
jest.mock('../../src/models', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');

// Mock timers for consistent testing
jest.useFakeTimers();

describe('AuthService', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockPassword = 'Password123!';
  const mockHashedPassword = '$2a$12$hashedpassword';
  const mockJwtSecret = 'test-secret';
  const mockToken = 'jwt.token.here';
  const mockVerificationToken = 'verification-token-hex';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    passwordHash: mockHashedPassword,
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: false,
    emailVerificationToken: mockVerificationToken,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = mockJwtSecret;

    // Setup default mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue(mockToken);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue(mockVerificationToken),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('register', () => {
    const userData: UserCreateData = {
      email: mockEmail,
      password: mockPassword,
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should successfully register a new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register(userData);

      expect(result).toEqual({
        token: mockToken,
        expiresAt: expect.any(String),
        user: {
          id: mockUserId,
          email: mockEmail,
          firstName: 'John',
          lastName: 'Doe',
          emailVerified: false,
        },
      });

      // Verify user creation
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: mockEmail.toLowerCase(),
          passwordHash: mockHashedPassword,
          firstName: 'John',
          lastName: 'Doe',
          emailVerificationToken: mockVerificationToken,
          emailVerified: false,
        },
      });
    });

    it('should hash password with correct salt rounds', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 12);
    });

    it('should generate email verification token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register(userData);

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerificationToken: mockVerificationToken,
          }),
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const userDataWithMixedCase = {
        ...userData,
        email: 'Test@EXAMPLE.COM',
      };

      await AuthService.register(userDataWithMixedCase);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should generate JWT token with correct payload', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register(userData);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUserId },
        mockJwtSecret,
        { expiresIn: '7d' }
      );
    });

    it('should calculate correct token expiration', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const fixedDate = new Date('2024-01-01T00:00:00Z');
      jest.setSystemTime(fixedDate);

      const result = await AuthService.register(userData);

      const expectedExpiration = new Date(fixedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt).toBe(expectedExpiration.toISOString());
    });

    it('should throw error if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(AuthService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuthService.register(userData)).rejects.toThrow('Database error');
    });

    it('should handle bcrypt hashing errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(AuthService.register(userData)).rejects.toThrow('Hashing failed');
    });

    it('should handle crypto random bytes errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (crypto.randomBytes as jest.Mock).mockImplementation(() => {
        throw new Error('Crypto error');
      });

      await expect(AuthService.register(userData)).rejects.toThrow('Crypto error');
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: mockEmail,
      password: mockPassword,
    };

    it('should successfully login with valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.login(credentials);

      expect(result).toEqual({
        token: mockToken,
        expiresAt: expect.any(String),
        user: {
          id: mockUserId,
          email: mockEmail,
          firstName: 'John',
          lastName: 'Doe',
          emailVerified: false,
        },
      });
    });

    it('should normalize email to lowercase during login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const credentialsWithMixedCase = {
        ...credentials,
        email: 'Test@EXAMPLE.COM',
      };

      await AuthService.login(credentialsWithMixedCase);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should use constant-time comparison for security', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // User doesn't exist
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewmhGw0WR0VrYPLu';

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');

      // Should still perform bcrypt comparison with dummy hash
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, dummyHash);
    });

    it('should include consistent timing delay', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const startTime = Date.now();
      await AuthService.login(credentials);

      // Fast-forward the 50ms delay
      jest.advanceTimersByTime(50);

      // Verify setTimeout was called with correct delay
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 50);
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should handle bcrypt comparison errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(AuthService.login(credentials)).rejects.toThrow('Bcrypt error');
    });

    it('should handle database errors during user lookup', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuthService.login(credentials)).rejects.toThrow('Database error');
    });

    it('should work with verified user', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(verifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.login(credentials);

      expect(result.user.emailVerified).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: null,
      });

      const result = await AuthService.verifyEmail(mockVerificationToken);

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        },
      });
    });

    it('should handle already verified email', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(verifiedUser);

      const result = await AuthService.verifyEmail(mockVerificationToken);

      expect(result).toEqual({
        success: true,
        message: 'Email already verified',
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });

    it('should handle database errors during token lookup', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuthService.verifyEmail(mockVerificationToken)).rejects.toThrow('Database error');
    });

    it('should handle database errors during user update', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(AuthService.verifyEmail(mockVerificationToken)).rejects.toThrow('Update failed');
    });
  });

  describe('getUserById', () => {
    it('should return user data for valid ID', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.getUserById(mockUserId);

      expect(result).toEqual({
        id: mockUserId,
        email: mockEmail,
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: false,
      });
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(AuthService.getUserById(mockUserId)).rejects.toThrow('Database error');
    });

    it('should exclude sensitive data from response', async () => {
      const userWithSensitiveData = {
        ...mockUser,
        passwordHash: 'sensitive-hash',
        emailVerificationToken: 'sensitive-token',
        passwordResetToken: 'reset-token',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithSensitiveData);

      const result = await AuthService.getUserById(mockUserId);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).not.toHaveProperty('passwordResetToken');
    });
  });

  describe('verifyToken', () => {
    it('should return user ID for valid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });

      const result = await AuthService.verifyToken(mockToken);

      expect(result).toBe(mockUserId);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await AuthService.verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await AuthService.verifyToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const result = await AuthService.verifyToken('malformed.token');

      expect(result).toBeNull();
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      delete process.env.JWT_SECRET;
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Secret not provided');
      });

      const result = await AuthService.verifyToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('Token Generation and Expiration', () => {
    it('should generate token with correct expiration', async () => {
      const fixedDate = new Date('2024-01-01T00:00:00Z');
      jest.setSystemTime(fixedDate);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      const expectedExpiration = new Date(fixedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt).toBe(expectedExpiration.toISOString());
    });

    it('should use environment JWT_SECRET when available', async () => {
      process.env.JWT_SECRET = 'production-secret';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUserId },
        'production-secret',
        { expiresIn: '7d' }
      );
    });

    it('should fallback to default secret when JWT_SECRET not set', async () => {
      delete process.env.JWT_SECRET;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUserId },
        'dev-secret-key',
        { expiresIn: '7d' }
      );
    });
  });

  describe('Security Considerations', () => {
    it('should use high salt rounds for password hashing', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 12);
    });

    it('should generate cryptographically secure verification tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('should clear verification token after successful verification', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.verifyEmail(mockVerificationToken);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        },
      });
    });

    it('should implement timing attack protection in login', async () => {
      // Test that login always takes roughly the same time
      const iterations = [
        { user: mockUser, passwordMatch: true },
        { user: null, passwordMatch: false },
        { user: mockUser, passwordMatch: false },
      ];

      for (const iteration of iterations) {
        jest.clearAllMocks();
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(iteration.user);
        (bcrypt.compare as jest.Mock).mockResolvedValue(iteration.passwordMatch);

        const startTime = Date.now();

        try {
          await AuthService.login({ email: mockEmail, password: mockPassword });
        } catch (error) {
          // Expected for invalid credentials
        }

        // Verify that setTimeout was called for timing normalization
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 50);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty strings in registration', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: '',
            firstName: '',
            lastName: '',
          }),
        })
      );
    });

    it('should handle special characters in names', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        firstName: "Jean-Luc",
        lastName: "O'Connor",
      });

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: "Jean-Luc",
        lastName: "O'Connor",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "Jean-Luc",
            lastName: "O'Connor",
          }),
        })
      );
    });

    it('should handle Unicode characters in names', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        firstName: "José",
        lastName: "Müller",
      });

      await AuthService.register({
        email: mockEmail,
        password: mockPassword,
        firstName: "José",
        lastName: "Müller",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "José",
            lastName: "Müller",
          }),
        })
      );
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register({
        email: mockEmail,
        password: longPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 12);
    });

    it('should handle JWT token edge cases', async () => {
      const edgeCases = [
        '',
        'malformed',
        'too.short',
        'header.payload.signature.extra',
        null,
        undefined,
      ];

      for (const token of edgeCases) {
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const result = await AuthService.verifyToken(token as any);
        expect(result).toBeNull();
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory during repeated operations', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many login operations
      for (let i = 0; i < 100; i++) {
        await AuthService.login({ email: mockEmail, password: mockPassword });
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    it('should handle concurrent registration attempts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(() =>
        Promise.resolve({ ...mockUser, id: `user-${Date.now()}` })
      );

      const registrations = Array.from({ length: 5 }, (_, i) =>
        AuthService.register({
          email: `user${i}@example.com`,
          password: mockPassword,
          firstName: 'User',
          lastName: `${i}`,
        })
      );

      const results = await Promise.all(registrations);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
      });
    });
  });
});