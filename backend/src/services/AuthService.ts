import { prisma } from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface UserCreateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  token: string;
  expiresAt: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
}

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  private static JWT_EXPIRES_IN = '7d' as const;

  static async register(userData: UserCreateData): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        emailVerificationToken,
        emailVerified: false,
      },
    });

    // Generate JWT
    const token = this.generateToken(user.id);
    const expiresAt = this.getTokenExpiration();

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    };
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Constant timing approach: always perform the same operations

    // Always query for user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always perform bcrypt comparison with a consistent hash
    // Generate a consistent dummy hash for non-existent users
    const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewmhGw0WR0VrYPLu'; // Pre-computed dummy hash
    const hashToCompare = user ? user.passwordHash : dummyHash;

    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    // Add a small consistent delay to normalize timing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Final validation
    const isValidLogin = user && isValidPassword;

    if (!isValidLogin) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = this.generateToken(user.id);
    const expiresAt = this.getTokenExpiration();

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    };
  }

  static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified',
      };
    }

    // Update user to mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null, // Clear the token
      },
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    };
  }

  static async verifyToken(token: string): Promise<string | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }

  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  private static getTokenExpiration(): string {
    const now = new Date();
    const expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return expirationDate.toISOString();
  }
}
