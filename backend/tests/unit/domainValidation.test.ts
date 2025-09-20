import { describe, it, expect } from '@jest/globals';
import { ValidationUtils } from '../../src/utils/validation';

describe('Domain Validation', () => {
  describe('validateDomain', () => {
    describe('Valid domains', () => {
      it('should accept valid lowercase domain', () => {
        const result = ValidationUtils.validateDomain('mysite');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept domain with numbers', () => {
        const result = ValidationUtils.validateDomain('site123');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept domain with hyphens in middle', () => {
        const result = ValidationUtils.validateDomain('my-site');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept domain with multiple hyphens', () => {
        const result = ValidationUtils.validateDomain('my-awesome-site');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept 3-character domain (minimum)', () => {
        const result = ValidationUtils.validateDomain('abc');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept 63-character domain (maximum)', () => {
        const maxLengthDomain = 'a'.repeat(63);
        const result = ValidationUtils.validateDomain(maxLengthDomain);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept mixed alphanumeric with hyphens', () => {
        const result = ValidationUtils.validateDomain('site-123-test');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept numbers only', () => {
        const result = ValidationUtils.validateDomain('123');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept all lowercase letters', () => {
        const result = ValidationUtils.validateDomain('abcdefghijklmnopqrstuvwxyz');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Invalid domains - missing/empty', () => {
      it('should reject undefined domain', () => {
        const result = ValidationUtils.validateDomain(undefined);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Missing required field: domain');
      });

      it('should reject empty string domain', () => {
        const result = ValidationUtils.validateDomain('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Missing required field: domain');
      });
    });

    describe('Invalid domains - character restrictions', () => {
      it('should reject domain with uppercase letters', () => {
        const result = ValidationUtils.validateDomain('MyDomain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with spaces', () => {
        const result = ValidationUtils.validateDomain('my domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with special characters', () => {
        const result = ValidationUtils.validateDomain('my@domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with underscores', () => {
        const result = ValidationUtils.validateDomain('my_domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with dots', () => {
        const result = ValidationUtils.validateDomain('my.domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with slashes', () => {
        const result = ValidationUtils.validateDomain('my/domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with Unicode characters', () => {
        const result = ValidationUtils.validateDomain('mýdömain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should reject domain with emoji', () => {
        const result = ValidationUtils.validateDomain('my😀domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });
    });

    describe('Invalid domains - length restrictions', () => {
      it('should reject domain shorter than 3 characters', () => {
        const result = ValidationUtils.validateDomain('ab');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: must be between 3 and 63 characters');
      });

      it('should reject single character domain', () => {
        const result = ValidationUtils.validateDomain('a');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: must be between 3 and 63 characters');
      });

      it('should reject domain longer than 63 characters', () => {
        const tooLongDomain = 'a'.repeat(64);
        const result = ValidationUtils.validateDomain(tooLongDomain);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: must be between 3 and 63 characters');
      });

      it('should reject very long domain', () => {
        const veryLongDomain = 'a'.repeat(100);
        const result = ValidationUtils.validateDomain(veryLongDomain);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: must be between 3 and 63 characters');
      });
    });

    describe('Invalid domains - hyphen restrictions', () => {
      it('should reject domain starting with hyphen', () => {
        const result = ValidationUtils.validateDomain('-mydomain');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: cannot start or end with hyphen');
      });

      it('should reject domain ending with hyphen', () => {
        const result = ValidationUtils.validateDomain('mydomain-');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: cannot start or end with hyphen');
      });

      it('should reject domain both starting and ending with hyphen', () => {
        const result = ValidationUtils.validateDomain('-mydomain-');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: cannot start or end with hyphen');
      });

      it('should reject domain with only hyphens', () => {
        const result = ValidationUtils.validateDomain('---');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain: cannot start or end with hyphen');
      });
    });

    describe('Edge cases', () => {
      it('should handle domain with whitespace padding', () => {
        // Note: The current implementation doesn't trim, so this should fail
        const result = ValidationUtils.validateDomain(' mydomain ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should handle null as undefined', () => {
        const result = ValidationUtils.validateDomain(null as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Missing required field: domain');
      });

      it('should handle number as string', () => {
        const result = ValidationUtils.validateDomain('123456');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should handle mixed case properly', () => {
        const result = ValidationUtils.validateDomain('MyDOMAIN123');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });
    });

    describe('Real-world domain examples', () => {
      it('should accept common domain patterns', () => {
        const validDomains = [
          'mybusiness',
          'pizza-palace',
          'hotel123',
          'shop-n-go',
          'service-pro',
          'auto-repair-shop',
          'best-deals-2024',
          'cafe-central',
          'book-store',
          'tech-solutions'
        ];

        validDomains.forEach(domain => {
          const result = ValidationUtils.validateDomain(domain);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid real-world attempts', () => {
        const invalidDomains = [
          'My Business',           // spaces
          'café-central',          // accented characters
          'shop&go',              // special characters
          'best_deals',           // underscores
          'site.com',             // dots
          'http://example',       // protocol
          'www.example',          // www prefix with dot
          'business@email',       // @ symbol
          'shop#1',               // hash symbol
          'store(main)',          // parentheses
          'deal$',                // dollar sign
          'shop%off',             // percent sign
          'my+business',          // plus sign
          'site=new',             // equals sign
          'shop[1]',              // brackets
          'business{main}',       // braces
          'site|main',            // pipe
          'shop\\main',           // backslash
          'site:8080',            // colon
          'shop;main',            // semicolon
          'site"quoted"',         // quotes
          "shop'main",            // apostrophe
          'site<tag>',            // angle brackets
          'shop,main',            // comma
          'site?param',           // question mark
          'shop/main'             // forward slash
        ];

        invalidDomains.forEach(domain => {
          const result = ValidationUtils.validateDomain(domain);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });
    });

    describe('Security considerations', () => {
      it('should reject potential XSS attempts', () => {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert(1)',
          '<img src=x onerror=alert(1)>',
          '"><script>alert(1)</script>',
          "'><script>alert(1)</script>"
        ];

        xssAttempts.forEach(domain => {
          const result = ValidationUtils.validateDomain(domain);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
        });
      });

      it('should reject SQL injection attempts', () => {
        const sqlAttempts = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          '" OR "1"="1',
          'UNION SELECT * FROM users',
          '1; DELETE FROM tenants'
        ];

        sqlAttempts.forEach(domain => {
          const result = ValidationUtils.validateDomain(domain);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
        });
      });

      it('should reject path traversal attempts', () => {
        const pathTraversalAttempts = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32',
          './../../config',
          '%2e%2e%2f%2e%2e%2f',
          '....//....//....//etc'
        ];

        pathTraversalAttempts.forEach(domain => {
          const result = ValidationUtils.validateDomain(domain);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
        });
      });
    });

    describe('Performance and stress testing', () => {
      it('should handle very long invalid strings efficiently', () => {
        const veryLongString = 'invalid'.repeat(1000);
        const startTime = Date.now();

        const result = ValidationUtils.validateDomain(veryLongString);

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(result.isValid).toBe(false);
        expect(processingTime).toBeLessThan(100); // Should be very fast
      });

      it('should handle repeated validation calls efficiently', () => {
        const domains = [
          'valid-domain',
          'invalid domain',
          'another-valid',
          'INVALID-CASE',
          'good-123'
        ];

        const startTime = Date.now();

        for (let i = 0; i < 1000; i++) {
          domains.forEach(domain => {
            ValidationUtils.validateDomain(domain);
          });
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // 5000 validations should complete quickly
        expect(processingTime).toBeLessThan(1000);
      });

      it('should handle maximum length domain efficiently', () => {
        const maxLengthDomain = 'a'.repeat(63);
        const startTime = Date.now();

        for (let i = 0; i < 100; i++) {
          ValidationUtils.validateDomain(maxLengthDomain);
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(processingTime).toBeLessThan(100);
      });
    });

    describe('Integration with other validation patterns', () => {
      it('should work consistently with UUID validation pattern', () => {
        // Test that domain validation doesn't interfere with UUID patterns
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = ValidationUtils.validateDomain(uuid);

        expect(result.isValid).toBe(true); // Valid as domain (lowercase letters, numbers, hyphens)
        expect(result.error).toBeUndefined();
      });

      it('should be case sensitive unlike email validation', () => {
        const mixedCaseDomain = 'MyDomain';
        const domainResult = ValidationUtils.validateDomain(mixedCaseDomain);

        expect(domainResult.isValid).toBe(false);
        expect(domainResult.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });

      it('should have different rules than name validation', () => {
        const domainWithSpaces = 'my domain';
        const domainResult = ValidationUtils.validateDomain(domainWithSpaces);

        expect(domainResult.isValid).toBe(false);
        expect(domainResult.error).toBe('Invalid domain format: only lowercase letters, numbers, and hyphens allowed');
      });
    });
  });

  describe('Domain regex pattern', () => {
    it('should match the expected pattern', () => {
      const regex = ValidationUtils.DOMAIN_REGEX;

      // Valid patterns
      expect(regex.test('abc')).toBe(true);
      expect(regex.test('123')).toBe(true);
      expect(regex.test('a-b-c')).toBe(true);
      expect(regex.test('test123')).toBe(true);

      // Invalid patterns
      expect(regex.test('ABC')).toBe(false);
      expect(regex.test('a b')).toBe(false);
      expect(regex.test('a@b')).toBe(false);
      expect(regex.test('a.b')).toBe(false);
      expect(regex.test('a_b')).toBe(false);
    });

    it('should be anchored to prevent partial matches', () => {
      const regex = ValidationUtils.DOMAIN_REGEX;

      // These should fail because the regex should match the entire string
      expect(regex.test('valid-but-has-CAPS')).toBe(false);
      expect(regex.test('valid but spaces')).toBe(false);
      expect(regex.test('validbuthas@symbol')).toBe(false);
    });
  });
});