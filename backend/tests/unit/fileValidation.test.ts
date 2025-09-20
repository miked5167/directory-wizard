import { describe, it, expect, beforeEach } from '@jest/globals';
import { FileProcessor, ValidationError, ProcessingResult } from '../../src/utils/fileProcessor';

describe('FileProcessor', () => {
  describe('processCategories', () => {
    it('should successfully process valid categories JSON', () => {
      const validCategoriesJson = JSON.stringify([
        { name: 'Restaurants', slug: 'restaurants', description: 'Food and dining' },
        { name: 'Hotels', slug: 'hotels', description: 'Accommodation' },
        { name: 'Shopping', slug: 'shopping', description: 'Retail stores' }
      ]);

      const result = FileProcessor.processCategories(validCategoriesJson);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(3);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle empty categories array', () => {
      const emptyCategoriesJson = JSON.stringify([]);

      const result = FileProcessor.processCategories(emptyCategoriesJson);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should fail with invalid JSON format', () => {
      const invalidJson = '{ invalid json }';

      const result = FileProcessor.processCategories(invalidJson);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].field).toBe('file');
      expect(result.validationErrors[0].message).toContain('Unexpected token');
    });

    it('should fail when JSON is not an array', () => {
      const nonArrayJson = JSON.stringify({ name: 'test' });

      const result = FileProcessor.processCategories(nonArrayJson);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].message).toBe('Categories must be an array');
    });

    it('should validate required fields - missing name', () => {
      const categoriesWithMissingName = JSON.stringify([
        { slug: 'restaurants', description: 'Food and dining' },
        { name: 'Hotels', slug: 'hotels', description: 'Accommodation' }
      ]);

      const result = FileProcessor.processCategories(categoriesWithMissingName);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].line).toBe(1);
      expect(result.validationErrors[0].field).toBe('name');
      expect(result.validationErrors[0].message).toBe('Name is required for category');
    });

    it('should validate required fields - missing slug', () => {
      const categoriesWithMissingSlug = JSON.stringify([
        { name: 'Restaurants', description: 'Food and dining' },
        { name: 'Hotels', slug: 'hotels', description: 'Accommodation' }
      ]);

      const result = FileProcessor.processCategories(categoriesWithMissingSlug);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].line).toBe(1);
      expect(result.validationErrors[0].field).toBe('slug');
      expect(result.validationErrors[0].message).toBe('Slug is required for category');
    });

    it('should validate multiple missing fields across multiple categories', () => {
      const categoriesWithMultipleErrors = JSON.stringify([
        { description: 'Food and dining' }, // Missing name and slug
        { name: 'Hotels', description: 'Accommodation' }, // Missing slug
        { name: 'Shopping', slug: 'shopping', description: 'Retail stores' } // Valid
      ]);

      const result = FileProcessor.processCategories(categoriesWithMultipleErrors);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(3);
      expect(result.validationErrors).toHaveLength(3);

      // Check first category errors
      expect(result.validationErrors.filter(e => e.line === 1)).toHaveLength(2);
      expect(result.validationErrors.find(e => e.line === 1 && e.field === 'name')).toBeTruthy();
      expect(result.validationErrors.find(e => e.line === 1 && e.field === 'slug')).toBeTruthy();

      // Check second category error
      expect(result.validationErrors.filter(e => e.line === 2)).toHaveLength(1);
      expect(result.validationErrors.find(e => e.line === 2 && e.field === 'slug')).toBeTruthy();
    });

    it('should handle empty string values as missing fields', () => {
      const categoriesWithEmptyValues = JSON.stringify([
        { name: '', slug: 'restaurants', description: 'Food and dining' },
        { name: 'Hotels', slug: '', description: 'Accommodation' }
      ]);

      const result = FileProcessor.processCategories(categoriesWithEmptyValues);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(2);
      expect(result.validationErrors[0].line).toBe(1);
      expect(result.validationErrors[0].field).toBe('name');
      expect(result.validationErrors[1].line).toBe(2);
      expect(result.validationErrors[1].field).toBe('slug');
    });
  });

  describe('processListings', () => {
    it('should successfully process valid listings CSV', () => {
      const validCsv = [
        'title,category,description,address,phone',
        'Pizza Palace,restaurants,Best pizza in town,123 Main St,555-0123',
        'Grand Hotel,hotels,Luxury accommodation,456 Oak Ave,555-0456',
        'Fashion Store,shopping,Latest fashion trends,789 Pine St,555-0789'
      ].join('\n');

      const result = FileProcessor.processListings(validCsv);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(3);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle CSV with only required headers', () => {
      const minimalCsv = [
        'title,category,description',
        'Pizza Palace,restaurants,Best pizza in town',
        'Grand Hotel,hotels,Luxury accommodation'
      ].join('\n');

      const result = FileProcessor.processListings(minimalCsv);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should fail with empty CSV file', () => {
      const emptyCsv = '';

      const result = FileProcessor.processListings(emptyCsv);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(0);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].field).toBe('file');
      expect(result.validationErrors[0].message).toBe('CSV file is empty');
    });

    it('should fail with missing required headers', () => {
      const csvMissingHeaders = [
        'title,address,phone', // Missing category and description
        'Pizza Palace,123 Main St,555-0123'
      ].join('\n');

      const result = FileProcessor.processListings(csvMissingHeaders);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].line).toBe(1);
      expect(result.validationErrors[0].field).toBe('headers');
      expect(result.validationErrors[0].message).toBe('Missing required headers: category, description');
    });

    it('should validate required fields in data rows', () => {
      const csvWithMissingData = [
        'title,category,description',
        'Pizza Palace,restaurants,', // Missing description
        ',hotels,Luxury accommodation', // Missing title
        'Fashion Store,,Latest trends' // Missing category
      ].join('\n');

      const result = FileProcessor.processListings(csvWithMissingData);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(3);
      expect(result.validationErrors).toHaveLength(3);

      // Check individual errors
      expect(result.validationErrors[0].line).toBe(2);
      expect(result.validationErrors[0].field).toBe('description');
      expect(result.validationErrors[1].line).toBe(3);
      expect(result.validationErrors[1].field).toBe('title');
      expect(result.validationErrors[2].line).toBe(4);
      expect(result.validationErrors[2].field).toBe('category');
    });

    it('should handle CSV with only header row', () => {
      const headerOnlyCsv = 'title,category,description';

      const result = FileProcessor.processListings(headerOnlyCsv);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle CSV with extra columns', () => {
      const csvWithExtraColumns = [
        'title,category,description,address,phone,website,rating',
        'Pizza Palace,restaurants,Best pizza,123 Main St,555-0123,www.pizza.com,4.5',
        'Grand Hotel,hotels,Luxury stay,456 Oak Ave,555-0456,www.hotel.com,5.0'
      ].join('\n');

      const result = FileProcessor.processListings(csvWithExtraColumns);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle CSV with whitespace in values', () => {
      const csvWithWhitespace = [
        ' title , category , description ',
        ' Pizza Palace , restaurants , Best pizza in town ',
        ' Grand Hotel , hotels , Luxury accommodation '
      ].join('\n');

      const result = FileProcessor.processListings(csvWithWhitespace);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle CSV with empty lines', () => {
      const csvWithEmptyLines = [
        'title,category,description',
        'Pizza Palace,restaurants,Best pizza',
        '',
        '   ',
        'Grand Hotel,hotels,Luxury stay',
        ''
      ].join('\n');

      const result = FileProcessor.processListings(csvWithEmptyLines);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should validate multiple missing fields in same row', () => {
      const csvWithMultipleMissingFields = [
        'title,category,description',
        ',,', // All required fields missing
        'Hotel,,' // Two fields missing
      ].join('\n');

      const result = FileProcessor.processListings(csvWithMultipleMissingFields);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(5); // 3 + 2 missing fields

      // Check line 2 errors (all fields missing)
      const line2Errors = result.validationErrors.filter(e => e.line === 2);
      expect(line2Errors).toHaveLength(3);
      expect(line2Errors.map(e => e.field).sort()).toEqual(['category', 'description', 'title']);

      // Check line 3 errors (category and description missing)
      const line3Errors = result.validationErrors.filter(e => e.line === 3);
      expect(line3Errors).toHaveLength(2);
      expect(line3Errors.map(e => e.field).sort()).toEqual(['category', 'description']);
    });
  });

  describe('validateFileType', () => {
    const createMockFile = (originalname: string): Express.Multer.File => ({
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      size: 1000,
      destination: '/tmp',
      filename: 'test',
      path: '/tmp/test',
      buffer: Buffer.from('test'),
      stream: {} as any,
    });

    it('should validate JSON file for categories', () => {
      const jsonFile = createMockFile('categories.json');

      const result = FileProcessor.validateFileType(jsonFile, 'categories');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate CSV file for listings', () => {
      const csvFile = createMockFile('listings.csv');

      const result = FileProcessor.validateFileType(csvFile, 'listings');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-JSON file for categories', () => {
      const csvFile = createMockFile('categories.csv');

      const result = FileProcessor.validateFileType(csvFile, 'categories');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid file type: categories upload requires JSON file');
    });

    it('should reject non-CSV file for listings', () => {
      const jsonFile = createMockFile('listings.json');

      const result = FileProcessor.validateFileType(jsonFile, 'listings');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid file type: listings upload requires CSV file');
    });

    it('should handle files with multiple extensions correctly', () => {
      const doubleExtensionFile = createMockFile('backup.categories.json');

      const result = FileProcessor.validateFileType(doubleExtensionFile, 'categories');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle files without extensions', () => {
      const noExtensionFile = createMockFile('categories');

      const result = FileProcessor.validateFileType(noExtensionFile, 'categories');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid file type: categories upload requires JSON file');
    });

    it('should handle case-sensitive extensions', () => {
      const upperCaseFile = createMockFile('categories.JSON');

      const result = FileProcessor.validateFileType(upperCaseFile, 'categories');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid file type: categories upload requires JSON file');
    });

    it('should handle unknown file types gracefully', () => {
      const unknownFile = createMockFile('test.txt');

      const categoriesResult = FileProcessor.validateFileType(unknownFile, 'categories');
      expect(categoriesResult.isValid).toBe(false);

      const listingsResult = FileProcessor.validateFileType(unknownFile, 'listings');
      expect(listingsResult.isValid).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large category arrays', () => {
      const largeCategories = Array.from({ length: 1000 }, (_, i) => ({
        name: `Category ${i}`,
        slug: `category-${i}`,
        description: `Description for category ${i}`
      }));

      const largeCategoriesJson = JSON.stringify(largeCategories);
      const result = FileProcessor.processCategories(largeCategoriesJson);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle very large CSV files', () => {
      const headers = 'title,category,description';
      const rows = Array.from({ length: 1000 }, (_, i) =>
        `Title ${i},category-${i % 10},Description for listing ${i}`
      );
      const largeCsv = [headers, ...rows].join('\n');

      const result = FileProcessor.processListings(largeCsv);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(1000);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle special characters in JSON', () => {
      const categoriesWithSpecialChars = JSON.stringify([
        { name: 'Café & Restaurant', slug: 'cafe-restaurant', description: 'Food & dining with açaí' },
        { name: 'Müller\'s Store', slug: 'mullers-store', description: 'German-style shopping' }
      ]);

      const result = FileProcessor.processCategories(categoriesWithSpecialChars);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle special characters in CSV', () => {
      const csvWithSpecialChars = [
        'title,category,description',
        'Café "Le Bon",restaurants,"French café with ""special"" coffee"',
        'Müller\'s Store,shopping,German-style store with ümlauts'
      ].join('\n');

      const result = FileProcessor.processListings(csvWithSpecialChars);

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(2);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle null and undefined values in categories', () => {
      const categoriesWithNullValues = JSON.stringify([
        { name: null, slug: 'test', description: 'Test category' },
        { name: 'Valid', slug: undefined, description: 'Another test' }
      ]);

      const result = FileProcessor.processCategories(categoriesWithNullValues);

      expect(result.validationStatus).toBe('INVALID');
      expect(result.validationErrors).toHaveLength(2);
      expect(result.validationErrors[0].field).toBe('name');
      expect(result.validationErrors[1].field).toBe('slug');
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should process files efficiently without memory leaks', () => {
      const startMemory = process.memoryUsage().heapUsed;

      // Process multiple files to test memory usage
      for (let i = 0; i < 100; i++) {
        const categories = Array.from({ length: 100 }, (_, j) => ({
          name: `Category ${j}`,
          slug: `category-${j}`,
          description: `Description ${j}`
        }));

        FileProcessor.processCategories(JSON.stringify(categories));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should process files within reasonable time limits', () => {
      const largeCategories = Array.from({ length: 10000 }, (_, i) => ({
        name: `Category ${i}`,
        slug: `category-${i}`,
        description: `Description for category ${i}`
      }));

      const startTime = Date.now();
      const result = FileProcessor.processCategories(JSON.stringify(largeCategories));
      const processingTime = Date.now() - startTime;

      expect(result.validationStatus).toBe('VALID');
      expect(result.recordsCount).toBe(10000);
      // Processing should complete within 1 second for 10k records
      expect(processingTime).toBeLessThan(1000);
    });
  });
});