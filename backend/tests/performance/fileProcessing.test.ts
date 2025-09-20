import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FileProcessor, ProcessingResult } from '../../src/utils/fileProcessor';
import { performance } from 'perf_hooks';

describe('File Processing Performance Tests', () => {
  // Performance requirements from the project specification
  const PERFORMANCE_TARGETS = {
    MAX_PROCESSING_TIME_10MB: 30000, // 30 seconds for 10MB files
    MAX_PROCESSING_TIME_1MB: 3000,   // 3 seconds for 1MB files
    MAX_PROCESSING_TIME_100KB: 500,  // 0.5 seconds for 100KB files
    MAX_MEMORY_INCREASE: 100 * 1024 * 1024, // 100MB max memory increase
  };

  // Helper function to generate test data
  const generateCategoriesJson = (count: number): string => {
    const categories = Array.from({ length: count }, (_, i) => ({
      name: `Category ${i}`,
      slug: `category-${i}`,
      description: `Description for category ${i}`.repeat(10), // Make it larger
      icon: `icon-${i}`,
      metadata: {
        tags: [`tag${i}`, `tag${i + 1}`, `tag${i + 2}`],
        priority: i % 5,
        featured: i % 10 === 0,
        additionalData: 'x'.repeat(100), // Add bulk
      },
    }));
    return JSON.stringify(categories, null, 2);
  };

  const generateListingsCsv = (count: number): string => {
    const headers = 'title,category,description,address,phone,email,website,hours,tags';
    const rows = Array.from({ length: count }, (_, i) => {
      const title = `Business ${i}`;
      const category = `category-${i % 10}`;
      const description = `This is a detailed description for business ${i}. `.repeat(20);
      const address = `${i} Main Street, City ${i % 100}, State ${i % 50}`;
      const phone = `+1-555-${String(i).padStart(4, '0')}`;
      const email = `business${i}@example.com`;
      const website = `https://business${i}.example.com`;
      const hours = 'Mon-Fri 9AM-5PM, Sat 10AM-3PM';
      const tags = `tag${i},tag${i + 1},tag${i + 2}`;

      return [title, category, description, address, phone, email, website, hours, tags].join(',');
    });

    return [headers, ...rows].join('\n');
  };

  const measurePerformance = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number; memoryDelta: number }> => {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const result = await operation();

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryDelta = endMemory - startMemory;

    console.log(`${operationName}: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);

    return { result, duration, memoryDelta };
  };

  const estimateFileSize = (content: string): number => {
    return Buffer.byteLength(content, 'utf8');
  };

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Categories JSON Processing Performance', () => {
    it('should process small categories file (100KB) within 0.5 seconds', async () => {
      // Generate approximately 100KB of categories data
      const categoriesJson = generateCategoriesJson(100);
      const fileSize = estimateFileSize(categoriesJson);

      expect(fileSize).toBeGreaterThan(50 * 1024); // At least 50KB
      expect(fileSize).toBeLessThan(200 * 1024);   // Less than 200KB

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        `Categories processing (${(fileSize / 1024).toFixed(1)}KB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(100);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_100KB);
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    it('should process medium categories file (1MB) within 3 seconds', async () => {
      // Generate approximately 1MB of categories data
      const categoriesJson = generateCategoriesJson(1000);
      const fileSize = estimateFileSize(categoriesJson);

      expect(fileSize).toBeGreaterThan(500 * 1024);  // At least 500KB
      expect(fileSize).toBeLessThan(2 * 1024 * 1024); // Less than 2MB

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        `Categories processing (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_1MB);
      expect(memoryDelta).toBeLessThan(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
    });

    it('should process large categories file (~10MB) within 30 seconds', async () => {
      // Generate approximately 10MB of categories data
      const categoriesJson = generateCategoriesJson(10000);
      const fileSize = estimateFileSize(categoriesJson);

      expect(fileSize).toBeGreaterThan(5 * 1024 * 1024);  // At least 5MB
      expect(fileSize).toBeLessThan(15 * 1024 * 1024);    // Less than 15MB

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        `Categories processing (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(10000);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_10MB);
      expect(memoryDelta).toBeLessThan(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
    });

    it('should handle very large categories file (20MB+) gracefully', async () => {
      // Generate very large file to test upper limits
      const categoriesJson = generateCategoriesJson(20000);
      const fileSize = estimateFileSize(categoriesJson);

      expect(fileSize).toBeGreaterThan(10 * 1024 * 1024); // At least 10MB

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        `Large categories processing (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(20000);
      // Allow more time for very large files, but should still be reasonable
      expect(duration).toBeLessThan(60000); // 1 minute max
      expect(memoryDelta).toBeLessThan(200 * 1024 * 1024); // 200MB max
    });
  });

  describe('Listings CSV Processing Performance', () => {
    it('should process small listings file (100KB) within 0.5 seconds', async () => {
      const listingsCsv = generateListingsCsv(100);
      const fileSize = estimateFileSize(listingsCsv);

      expect(fileSize).toBeGreaterThan(50 * 1024);
      expect(fileSize).toBeLessThan(200 * 1024);

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(listingsCsv)),
        `Listings processing (${(fileSize / 1024).toFixed(1)}KB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(100);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_100KB);
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024);
    });

    it('should process medium listings file (1MB) within 3 seconds', async () => {
      const listingsCsv = generateListingsCsv(1000);
      const fileSize = estimateFileSize(listingsCsv);

      expect(fileSize).toBeGreaterThan(500 * 1024);
      expect(fileSize).toBeLessThan(2 * 1024 * 1024);

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(listingsCsv)),
        `Listings processing (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_1MB);
      expect(memoryDelta).toBeLessThan(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
    });

    it('should process large listings file (~10MB) within 30 seconds', async () => {
      const listingsCsv = generateListingsCsv(10000);
      const fileSize = estimateFileSize(listingsCsv);

      expect(fileSize).toBeGreaterThan(5 * 1024 * 1024);
      expect(fileSize).toBeLessThan(15 * 1024 * 1024);

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(listingsCsv)),
        `Listings processing (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(10000);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_10MB);
      expect(memoryDelta).toBeLessThan(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
    });

    it('should handle CSV with many columns efficiently', async () => {
      // Generate CSV with many columns
      const manyColumns = [
        'title', 'category', 'description', 'address', 'phone', 'email', 'website',
        'hours', 'tags', 'price_range', 'parking', 'wifi', 'outdoor_seating',
        'payment_methods', 'delivery', 'takeout', 'reservations', 'accessibility',
        'alcohol', 'live_music', 'pet_friendly', 'family_friendly', 'groups',
        'date_opened', 'owner', 'manager', 'employee_count', 'annual_revenue',
        'social_media', 'awards', 'certifications', 'specialties', 'service_area'
      ];

      const headers = manyColumns.join(',');
      const rows = Array.from({ length: 1000 }, (_, i) =>
        manyColumns.map((_, colIndex) => `value_${i}_${colIndex}`).join(',')
      );

      const csvWithManyColumns = [headers, ...rows].join('\n');
      const fileSize = estimateFileSize(csvWithManyColumns);

      const { result, duration, memoryDelta } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(csvWithManyColumns)),
        `Wide CSV processing (${manyColumns.length} columns, ${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_1MB);
    });
  });

  describe('Error Handling Performance', () => {
    it('should quickly identify and report JSON parsing errors', async () => {
      const invalidJson = '{invalid json content}'.repeat(10000);
      const fileSize = estimateFileSize(invalidJson);

      const { result, duration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(invalidJson)),
        `Invalid JSON processing (${(fileSize / 1024).toFixed(1)}KB)`
      );

      expect(result.validationStatus).toBe('INVALID');
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].field).toBe('file');
      // Error detection should be very fast
      expect(duration).toBeLessThan(100); // 100ms
    });

    it('should efficiently validate large files with many errors', async () => {
      // Generate categories with missing required fields
      const categoriesWithErrors = Array.from({ length: 5000 }, (_, i) => ({
        // Intentionally missing 'name' field for some entries
        ...(i % 2 === 0 ? {} : { name: `Category ${i}` }),
        // Intentionally missing 'slug' field for some entries
        ...(i % 3 === 0 ? {} : { slug: `category-${i}` }),
        description: `Description ${i}`,
      }));

      const invalidCategoriesJson = JSON.stringify(categoriesWithErrors);
      const fileSize = estimateFileSize(invalidCategoriesJson);

      const { result, duration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(invalidCategoriesJson)),
        `Large invalid categories (${(fileSize / 1024 / 1024).toFixed(1)}MB with errors)`
      );

      expect(result.validationStatus).toBe('INVALID');
      expect(result.validationErrors.length).toBeGreaterThan(0);
      // Should still process errors quickly
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle extremely large CSV lines efficiently', async () => {
      // Create CSV with very long descriptions
      const longDescription = 'A'.repeat(10000); // 10KB description
      const headers = 'title,category,description';
      const rows = Array.from({ length: 100 }, (_, i) =>
        `Title ${i},Category ${i},"${longDescription}"`
      );

      const csvWithLongLines = [headers, ...rows].join('\n');
      const fileSize = estimateFileSize(csvWithLongLines);

      const { result, duration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(csvWithLongLines)),
        `CSV with long lines (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(100);
      expect(duration).toBeLessThan(1000); // Should still be fast
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should not leak memory during repeated processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process the same file multiple times
      const categoriesJson = generateCategoriesJson(1000);

      for (let i = 0; i < 10; i++) {
        const result = FileProcessor.processCategories(categoriesJson);
        expect(result.validationStatus).toBe('VALID');

        // Force garbage collection between iterations if available
        if (global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal after repeated processing
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
    });

    it('should handle concurrent file processing efficiently', async () => {
      const categoriesJson = generateCategoriesJson(500);
      const listingsCsv = generateListingsCsv(500);

      const startTime = performance.now();

      // Process multiple files concurrently
      const promises = [
        Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        Promise.resolve(FileProcessor.processListings(listingsCsv)),
        Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        Promise.resolve(FileProcessor.processListings(listingsCsv)),
        Promise.resolve(FileProcessor.processCategories(categoriesJson)),
      ];

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.validationStatus).toBe('VALID');
      });

      // Concurrent processing should not be significantly slower than sequential
      expect(duration).toBeLessThan(3000); // 3 seconds for all concurrent operations
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle typical business directory import (mixed sizes)', async () => {
      // Simulate real-world scenario: medium categories + large listings
      const categoriesJson = generateCategoriesJson(50); // ~50 categories
      const listingsCsv = generateListingsCsv(5000);      // ~5000 businesses

      const categoriesSize = estimateFileSize(categoriesJson);
      const listingsSize = estimateFileSize(listingsCsv);

      console.log(`Real-world test: Categories ${(categoriesSize/1024).toFixed(1)}KB, Listings ${(listingsSize/1024/1024).toFixed(1)}MB`);

      // Process categories
      const { result: categoriesResult, duration: categoriesDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
        'Real-world categories'
      );

      // Process listings
      const { result: listingsResult, duration: listingsDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(listingsCsv)),
        'Real-world listings'
      );

      expect(categoriesResult.validationStatus).toBe('VALID');
      expect(listingsResult.validationStatus).toBe('VALID');
      expect(categoriesResult.recordsCount).toBe(50);
      expect(listingsResult.recordsCount).toBe(5000);

      // Total processing should be reasonable
      const totalDuration = categoriesDuration + listingsDuration;
      expect(totalDuration).toBeLessThan(10000); // 10 seconds total
    });

    it('should handle edge case: empty files quickly', async () => {
      const { duration: emptyJsonDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories('[]')),
        'Empty JSON'
      );

      const { duration: emptyCSVDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings('title,category,description')),
        'Empty CSV (headers only)'
      );

      // Empty files should process very quickly
      expect(emptyJsonDuration).toBeLessThan(10); // 10ms
      expect(emptyCSVDuration).toBeLessThan(10);  // 10ms
    });

    it('should handle edge case: single record files quickly', async () => {
      const singleCategory = JSON.stringify([{
        name: 'Single Category',
        slug: 'single-category',
        description: 'A single category for testing'
      }]);

      const singleListing = [
        'title,category,description',
        'Single Business,restaurants,A single business for testing'
      ].join('\n');

      const { duration: singleJsonDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(singleCategory)),
        'Single category JSON'
      );

      const { duration: singleCSVDuration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processListings(singleListing)),
        'Single listing CSV'
      );

      // Single record files should process very quickly
      expect(singleJsonDuration).toBeLessThan(10); // 10ms
      expect(singleCSVDuration).toBeLessThan(10);   // 10ms
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain linear performance scaling with file size', async () => {
      const sizes = [100, 500, 1000, 2000];
      const durations: number[] = [];

      for (const size of sizes) {
        const categoriesJson = generateCategoriesJson(size);
        const { duration } = await measurePerformance(
          () => Promise.resolve(FileProcessor.processCategories(categoriesJson)),
          `Scaling test (${size} categories)`
        );
        durations.push(duration);
      }

      // Check that performance scales reasonably (not exponentially)
      for (let i = 1; i < durations.length; i++) {
        const prevDuration = durations[i - 1];
        const currDuration = durations[i];
        const sizeRatio = sizes[i] / sizes[i - 1];
        const timeRatio = currDuration / prevDuration;

        // Time ratio should not be significantly higher than size ratio
        // Allow some overhead, but not exponential growth
        expect(timeRatio).toBeLessThan(sizeRatio * 2);
      }
    });

    it('should handle unicode and special characters without performance degradation', async () => {
      // Generate data with unicode characters
      const unicodeCategories = Array.from({ length: 1000 }, (_, i) => ({
        name: `Catégorie ${i} 中文 العربية ñoño`,
        slug: `category-${i}`,
        description: `Descripción with émojis 🚀🎉 and spëcial chars: @#$%^&*()`,
      }));

      const unicodeCategoriesJson = JSON.stringify(unicodeCategories);
      const fileSize = estimateFileSize(unicodeCategoriesJson);

      const { result, duration } = await measurePerformance(
        () => Promise.resolve(FileProcessor.processCategories(unicodeCategoriesJson)),
        `Unicode categories (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      // Should not be significantly slower than ASCII-only content
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_PROCESSING_TIME_1MB);
    });
  });
});