// Validation utilities for tenant routes
export class ValidationUtils {
  // UUID validation
  static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Domain validation
  static readonly DOMAIN_REGEX = /^[a-z0-9-]+$/;

  // Color validation (hex format)
  static readonly HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

  static validateTenantId(id: string | undefined): { isValid: boolean; error?: string } {
    if (!id) {
      return { isValid: false, error: 'Tenant ID is required' };
    }

    if (!this.UUID_REGEX.test(id)) {
      return { isValid: false, error: 'invalid tenant ID format: must be valid UUID' };
    }

    return { isValid: true };
  }

  static validateTenantName(name: string | undefined): { isValid: boolean; error?: string } {
    if (!name) {
      return { isValid: false, error: 'Missing required field: name' };
    }

    if (name.length < 3) {
      return { isValid: false, error: 'Invalid name: must be at least 3 characters' };
    }

    if (name.length > 100) {
      return { isValid: false, error: 'Invalid name: must be less than 100 characters' };
    }

    return { isValid: true };
  }

  static validateDomain(domain: string | undefined): { isValid: boolean; error?: string } {
    if (!domain) {
      return { isValid: false, error: 'Missing required field: domain' };
    }

    if (!this.DOMAIN_REGEX.test(domain)) {
      return {
        isValid: false,
        error: 'Invalid domain format: only lowercase letters, numbers, and hyphens allowed',
      };
    }

    if (domain.length < 3 || domain.length > 63) {
      return { isValid: false, error: 'Invalid domain: must be between 3 and 63 characters' };
    }

    if (domain.startsWith('-') || domain.endsWith('-')) {
      return { isValid: false, error: 'Invalid domain: cannot start or end with hyphen' };
    }

    return { isValid: true };
  }

  static validateHexColor(
    color: string | undefined,
    fieldName: string
  ): { isValid: boolean; error?: string } {
    if (!color) {
      return { isValid: false, error: `Missing required field: ${fieldName}` };
    }

    if (!this.HEX_COLOR_REGEX.test(color)) {
      return {
        isValid: false,
        error: `Invalid ${fieldName} format: must be hex color (e.g., #3B82F6)`,
      };
    }

    return { isValid: true };
  }

  static validateFontFamily(fontFamily: string | undefined): { isValid: boolean; error?: string } {
    if (!fontFamily) {
      return { isValid: false, error: 'Missing required field: font_family' };
    }

    const validFonts = ['Inter', 'Roboto', 'Arial', 'Helvetica', 'Georgia', 'Times', 'custom'];
    if (!validFonts.includes(fontFamily)) {
      return {
        isValid: false,
        error: `Invalid font_family: must be one of ${validFonts.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  static validateUploadType(type: string | undefined): { isValid: boolean; error?: string } {
    if (!type) {
      return { isValid: false, error: 'Upload type is required' };
    }

    const validTypes = ['categories', 'listings'];
    if (!validTypes.includes(type)) {
      return {
        isValid: false,
        error: `Invalid type parameter: must be one of ${validTypes.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  // Email validation
  static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static validateEmail(email: string | undefined): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: 'Missing required field: email' };
    }

    if (!this.EMAIL_REGEX.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  static validatePassword(password: string | undefined): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Missing required field: password' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Password must be less than 128 characters' };
    }

    // Check for at least one uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return {
        isValid: false,
        error:
          'Password must contain at least one uppercase letter, lowercase letter, number, and special character',
      };
    }

    return { isValid: true };
  }

  static validateName(
    name: string | undefined,
    fieldName: string
  ): { isValid: boolean; error?: string } {
    if (!name) {
      return { isValid: false, error: `Missing required field: ${fieldName}` };
    }

    if (name.trim().length < 1) {
      return { isValid: false, error: `${fieldName} cannot be empty` };
    }

    if (name.length > 50) {
      return { isValid: false, error: `${fieldName} must be less than 50 characters` };
    }

    return { isValid: true };
  }

  static validateEmailVerificationToken(token: string | undefined): {
    isValid: boolean;
    error?: string;
  } {
    if (!token) {
      return { isValid: false, error: 'Missing required field: token' };
    }

    if (token.length !== 64) {
      return { isValid: false, error: 'Invalid token format' };
    }

    if (!/^[a-f0-9]+$/i.test(token)) {
      return { isValid: false, error: 'Invalid token format' };
    }

    return { isValid: true };
  }
}
