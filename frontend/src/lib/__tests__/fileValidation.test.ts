import {
  validateFile,
  validateCSVFile,
  validateJSONFile,
  validateFiles,
  formatFileSize,
  getFileExtension,
  detectCSVDelimiter,
  parseCSVContent,
  validateListingJSONStructure,
  DEFAULT_VALIDATION_OPTIONS,
  VALIDATION_RULES,
  ValidationResult,
  CSVValidationResult,
  JSONValidationResult,
} from '../fileValidation';

// Mock File API for testing
class MockFile implements File {
  public readonly lastModified: number;
  public readonly name: string;
  public readonly webkitRelativePath: string = '';
  public readonly size: number;
  public readonly type: string;
  public readonly stream: () => ReadableStream<Uint8Array>;
  public readonly arrayBuffer: () => Promise<ArrayBuffer>;
  public readonly slice: (start?: number, end?: number, contentType?: string) => Blob;

  constructor(
    private content: string,
    name: string,
    options: { type?: string; lastModified?: number } = {}
  ) {
    this.name = name;
    this.size = new Blob([content]).size;
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
    this.stream = () => new ReadableStream();
    this.arrayBuffer = async () => new ArrayBuffer(0);
    this.slice = () => new Blob();
  }

  async text(): Promise<string> {
    return this.content;
  }
}

describe('File Validation Library', () => {
  describe('Utility Functions', () => {
    describe('formatFileSize', () => {
      it('should format file sizes correctly', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      });

      it('should handle edge cases', () => {
        expect(formatFileSize(1)).toBe('1 Bytes');
        expect(formatFileSize(999)).toBe('999 Bytes');
        expect(formatFileSize(1025)).toBe('1 KB');
      });
    });

    describe('getFileExtension', () => {
      it('should extract file extensions correctly', () => {
        expect(getFileExtension('test.csv')).toBe('.csv');
        expect(getFileExtension('data.json')).toBe('.json');
        expect(getFileExtension('file.txt')).toBe('.txt');
        expect(getFileExtension('archive.tar.gz')).toBe('.gz');
        expect(getFileExtension('README')).toBe('');
        expect(getFileExtension('file.name.with.dots.csv')).toBe('.csv');
      });

      it('should handle edge cases', () => {
        expect(getFileExtension('')).toBe('');
        expect(getFileExtension('.')).toBe('');
        expect(getFileExtension('..')).toBe('');
        expect(getFileExtension('.hidden')).toBe('.hidden');
      });

      it('should return lowercase extensions', () => {
        expect(getFileExtension('test.CSV')).toBe('.csv');
        expect(getFileExtension('data.JSON')).toBe('.json');
        expect(getFileExtension('file.TXT')).toBe('.txt');
      });
    });

    describe('detectCSVDelimiter', () => {
      it('should detect common CSV delimiters', () => {
        expect(detectCSVDelimiter('name,email,phone')).toBe(',');
        expect(detectCSVDelimiter('name;email;phone')).toBe(';');
        expect(detectCSVDelimiter('name\temail\tphone')).toBe('\t');
        expect(detectCSVDelimiter('name|email|phone')).toBe('|');
      });

      it('should handle mixed delimiters by count', () => {
        expect(detectCSVDelimiter('name,email;phone,address')).toBe(',');
        expect(detectCSVDelimiter('name;email;phone;address,extra')).toBe(';');
      });

      it('should default to comma for unclear cases', () => {
        expect(detectCSVDelimiter('no delimiters here')).toBe(',');
        expect(detectCSVDelimiter('')).toBe(',');
      });
    });
  });

  describe('CSV Parsing', () => {
    describe('parseCSVContent', () => {
      it('should parse simple CSV correctly', async () => {
        const csvContent = 'name,email,phone\nJohn Doe,john@example.com,555-1234\nJane Smith,jane@example.com,555-5678';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await parseCSVContent(file);

        expect(result.headers).toEqual(['name', 'email', 'phone']);
        expect(result.rows).toEqual([
          ['John Doe', 'john@example.com', '555-1234'],
          ['Jane Smith', 'jane@example.com', '555-5678']
        ]);
        expect(result.delimiter).toBe(',');
        expect(result.hasHeaderRow).toBe(true);
      });

      it('should handle quoted fields with commas', async () => {
        const csvContent = 'name,address,phone\n"Smith, John","123 Main St, Suite 1",555-1234\n"Doe, Jane","456 Oak Ave",555-5678';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await parseCSVContent(file);

        expect(result.rows[0]).toEqual(['Smith, John', '123 Main St, Suite 1', '555-1234']);
        expect(result.rows[1]).toEqual(['Doe, Jane', '456 Oak Ave', '555-5678']);
      });

      it('should handle escaped quotes', async () => {
        const csvContent = 'name,quote\n"John ""The Great"" Doe","He said ""Hello"""\n"Jane Smith","Simple quote"';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await parseCSVContent(file);

        expect(result.rows[0]).toEqual(['John "The Great" Doe', 'He said "Hello"']);
        expect(result.rows[1]).toEqual(['Jane Smith', 'Simple quote']);
      });

      it('should detect header rows correctly', async () => {
        // Case with clear headers
        const csvWithHeaders = 'Name,Email,Phone\nJohn Doe,john@example.com,555-1234';
        const fileWithHeaders = new MockFile(csvWithHeaders, 'test.csv', { type: 'text/csv' });

        const resultWithHeaders = await parseCSVContent(fileWithHeaders);
        expect(resultWithHeaders.hasHeaderRow).toBe(true);

        // Case without clear headers (all numeric-like data)
        const csvWithoutHeaders = '1,2,3\n4,5,6\n7,8,9';
        const fileWithoutHeaders = new MockFile(csvWithoutHeaders, 'test.csv', { type: 'text/csv' });

        const resultWithoutHeaders = await parseCSVContent(fileWithoutHeaders);
        expect(resultWithoutHeaders.hasHeaderRow).toBe(false);
        expect(resultWithoutHeaders.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      });

      it('should handle different line endings', async () => {
        const csvContent = 'name,email\r\nJohn,john@example.com\rJane,jane@example.com\nBob,bob@example.com';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await parseCSVContent(file);

        expect(result.rows).toHaveLength(3);
        expect(result.rows[0]).toEqual(['John', 'john@example.com']);
        expect(result.rows[1]).toEqual(['Jane', 'jane@example.com']);
        expect(result.rows[2]).toEqual(['Bob', 'bob@example.com']);
      });

      it('should handle empty CSV file', async () => {
        const file = new MockFile('', 'empty.csv', { type: 'text/csv' });

        await expect(parseCSVContent(file)).rejects.toThrow('CSV file is empty');
      });

      it('should handle single row CSV', async () => {
        const csvContent = 'John Doe,john@example.com,555-1234';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await parseCSVContent(file);

        expect(result.hasHeaderRow).toBe(false);
        expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
        expect(result.rows).toEqual([['John Doe', 'john@example.com', '555-1234']]);
      });
    });
  });

  describe('JSON Validation', () => {
    describe('validateListingJSONStructure', () => {
      it('should validate correct listing array', () => {
        const validListings = [
          { name: 'Business 1', description: 'A great business', category: 'retail' },
          { title: 'Business 2', location: 'Downtown', phone: '555-1234' },
        ];

        const result = validateListingJSONStructure(validListings);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.itemCount).toBe(2);
        expect(result.sampleItem).toEqual(validListings[0]);
      });

      it('should reject non-array data', () => {
        const invalidData = { name: 'Single business' };

        const result = validateListingJSONStructure(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('JSON must contain an array of listings');
      });

      it('should reject empty array', () => {
        const result = validateListingJSONStructure([]);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('JSON array cannot be empty');
      });

      it('should reject array with non-object items', () => {
        const invalidListings = ['string item', 123, null];

        const result = validateListingJSONStructure(invalidListings);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Each listing must be an object');
      });

      it('should require at least one required field', () => {
        const listingsWithoutRequiredFields = [
          { description: 'No name or title', category: 'retail' },
          { category: 'service', location: 'Downtown' },
        ];

        const result = validateListingJSONStructure(listingsWithoutRequiredFields);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Each listing should have at least one of: name, title');
      });

      it('should validate field types', () => {
        const listingsWithInvalidTypes = [
          { name: 'Valid Business', description: { invalid: 'object' } },
          { title: 'Another Business', category: ['array', 'not', 'string'] },
        ];

        const result = validateListingJSONStructure(listingsWithInvalidTypes);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('should be a string or number'))).toBe(true);
      });

      it('should handle minimal valid listings', () => {
        const minimalListings = [
          { name: 'Business Name' },
          { title: 'Another Business' },
        ];

        const result = validateListingJSONStructure(minimalListings);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('Basic File Validation', () => {
    describe('validateFile', () => {
      it('should validate a correct file', async () => {
        const file = new MockFile('test content', 'test.csv', { type: 'text/csv' });

        const result = await validateFile(file);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.fileInfo).toEqual({
          name: 'test.csv',
          size: file.size,
          type: 'text/csv',
          extension: '.csv',
          lastModified: expect.any(Date),
        });
      });

      it('should reject files that are too large', async () => {
        const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
        const file = new MockFile(largeContent, 'large.csv', { type: 'text/csv' });

        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
      });

      it('should reject files that are too small', async () => {
        const file = new MockFile('', 'empty.csv', { type: 'text/csv' });

        const result = await validateFile(file, { minSize: 10 });

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('below minimum required size'))).toBe(true);
      });

      it('should reject empty files', async () => {
        const file = new MockFile('', 'empty.csv', { type: 'text/csv' });

        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('File is empty');
      });

      it('should validate MIME types', async () => {
        const file = new MockFile('content', 'test.exe', { type: 'application/exe' });

        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
      });

      it('should validate file extensions', async () => {
        const file = new MockFile('content', 'test.exe', { type: 'text/csv' });

        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('extension'))).toBe(true);
      });

      it('should apply custom validation rules', async () => {
        const customRule = {
          name: 'Test Rule',
          validate: jest.fn().mockResolvedValue(false),
          message: 'Custom validation failed',
        };

        const file = new MockFile('content', 'test.csv', { type: 'text/csv' });

        const result = await validateFile(file, { customRules: [customRule] });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Custom validation failed');
        expect(customRule.validate).toHaveBeenCalledWith(file);
      });

      it('should handle custom rule errors gracefully', async () => {
        const failingRule = {
          name: 'Failing Rule',
          validate: jest.fn().mockRejectedValue(new Error('Rule execution failed')),
          message: 'Should not see this',
        };

        const file = new MockFile('content', 'test.csv', { type: 'text/csv' });

        const result = await validateFile(file, { customRules: [failingRule] });

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('failed: Rule execution failed'))).toBe(true);
      });

      it('should warn about problematic file names', async () => {
        const fileWithSpecialChars = new MockFile('content', 'file with spaces & special chars!.csv', { type: 'text/csv' });

        const result = await validateFile(fileWithSpecialChars);

        expect(result.warnings.some(warning => warning.includes('special characters'))).toBe(true);
      });

      it('should warn about very long file names', async () => {
        const longFileName = 'a'.repeat(256) + '.csv';
        const file = new MockFile('content', longFileName, { type: 'text/csv' });

        const result = await validateFile(file);

        expect(result.warnings.some(warning => warning.includes('very long'))).toBe(true);
      });
    });
  });

  describe('CSV File Validation', () => {
    describe('validateCSVFile', () => {
      it('should validate a correct CSV file', async () => {
        const csvContent = 'name,email,phone\nJohn Doe,john@example.com,555-1234';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file);

        expect(result.isValid).toBe(true);
        expect(result.csvInfo).toBeDefined();
        expect(result.csvInfo!.headers).toEqual(['name', 'email', 'phone']);
        expect(result.csvInfo!.rowCount).toBe(1);
        expect(result.csvInfo!.hasHeaderRow).toBe(true);
        expect(result.csvInfo!.delimiter).toBe(',');
      });

      it('should validate required headers', async () => {
        const csvContent = 'title,description,category\nBusiness,Description,Retail';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file, { requireHeaders: ['name', 'email'] });

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Missing required headers'))).toBe(true);
      });

      it('should validate row count limits', async () => {
        const csvContent = 'name\nBusiness 1\nBusiness 2\nBusiness 3';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        // Test max rows
        const resultMaxRows = await validateCSVFile(file, { maxRows: 2 });
        expect(resultMaxRows.isValid).toBe(false);
        expect(resultMaxRows.errors.some(error => error.includes('too many rows'))).toBe(true);

        // Test min rows
        const resultMinRows = await validateCSVFile(file, { minRows: 5 });
        expect(resultMinRows.isValid).toBe(false);
        expect(resultMinRows.errors.some(error => error.includes('too few rows'))).toBe(true);
      });

      it('should detect inconsistent column counts', async () => {
        const csvContent = 'name,email,phone\nJohn Doe,john@example.com,555-1234\nJane Smith,jane@example.com\nBob Wilson,bob@example.com,555-9999,extra';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file);

        expect(result.warnings.some(warning => warning.includes('inconsistent column counts'))).toBe(true);
      });

      it('should detect empty rows', async () => {
        const csvContent = 'name,email\nJohn Doe,john@example.com\n,,\n   ,   \nJane Smith,jane@example.com';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file);

        expect(result.warnings.some(warning => warning.includes('empty rows'))).toBe(true);
      });

      it('should handle CSV parsing errors', async () => {
        const file = new MockFile('', 'empty.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Failed to parse CSV'))).toBe(true);
      });

      it('should provide sample rows', async () => {
        const csvContent = 'name,email\nJohn,john@example.com\nJane,jane@example.com\nBob,bob@example.com\nAlice,alice@example.com';
        const file = new MockFile(csvContent, 'test.csv', { type: 'text/csv' });

        const result = await validateCSVFile(file);

        expect(result.csvInfo!.sampleRows).toHaveLength(3); // First 3 rows
        expect(result.csvInfo!.sampleRows[0]).toEqual(['John', 'john@example.com']);
      });
    });
  });

  describe('JSON File Validation', () => {
    describe('validateJSONFile', () => {
      it('should validate a correct JSON file', async () => {
        const jsonContent = JSON.stringify([
          { name: 'Business 1', email: 'biz1@example.com' },
          { name: 'Business 2', email: 'biz2@example.com' },
        ]);
        const file = new MockFile(jsonContent, 'test.json', { type: 'application/json' });

        const result = await validateJSONFile(file);

        expect(result.isValid).toBe(true);
        expect(result.jsonInfo).toBeDefined();
        expect(result.jsonInfo!.structure).toBe('array');
        expect(result.jsonInfo!.itemCount).toBe(2);
      });

      it('should validate as listings when requested', async () => {
        const validListings = [
          { name: 'Business 1', description: 'Great business' },
          { title: 'Business 2', category: 'retail' },
        ];
        const file = new MockFile(JSON.stringify(validListings), 'listings.json', { type: 'application/json' });

        const result = await validateJSONFile(file, { validateAsListings: true });

        expect(result.isValid).toBe(true);
        expect(result.jsonInfo!.isValidListingArray).toBe(true);
      });

      it('should reject invalid listings format', async () => {
        const invalidListings = [
          { description: 'No name or title' },
          { category: 'retail' },
        ];
        const file = new MockFile(JSON.stringify(invalidListings), 'listings.json', { type: 'application/json' });

        const result = await validateJSONFile(file, { validateAsListings: true });

        expect(result.isValid).toBe(false);
        expect(result.jsonInfo!.isValidListingArray).toBe(false);
      });

      it('should validate item count limits', async () => {
        const jsonArray = Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}` }));
        const file = new MockFile(JSON.stringify(jsonArray), 'large.json', { type: 'application/json' });

        // Test max items
        const resultMaxItems = await validateJSONFile(file, { maxItems: 50 });
        expect(resultMaxItems.isValid).toBe(false);
        expect(resultMaxItems.errors.some(error => error.includes('too many items'))).toBe(true);

        // Test min items
        const resultMinItems = await validateJSONFile(file, { minItems: 200 });
        expect(resultMinItems.isValid).toBe(false);
        expect(resultMinItems.errors.some(error => error.includes('too few items'))).toBe(true);
      });

      it('should handle different JSON structures', async () => {
        // Test object structure
        const objectFile = new MockFile(JSON.stringify({ key: 'value' }), 'object.json', { type: 'application/json' });
        const objectResult = await validateJSONFile(objectFile);
        expect(objectResult.jsonInfo!.structure).toBe('object');
        expect(objectResult.jsonInfo!.keys).toEqual(['key']);

        // Test primitive structure
        const primitiveFile = new MockFile(JSON.stringify('string value'), 'primitive.json', { type: 'application/json' });
        const primitiveResult = await validateJSONFile(primitiveFile);
        expect(primitiveResult.jsonInfo!.structure).toBe('primitive');
      });

      it('should handle JSON parsing errors', async () => {
        const file = new MockFile('invalid json content {', 'invalid.json', { type: 'application/json' });

        const result = await validateJSONFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Failed to parse JSON'))).toBe(true);
      });

      it('should provide sample data', async () => {
        const jsonContent = JSON.stringify([
          { name: 'First Item', value: 1 },
          { name: 'Second Item', value: 2 },
        ]);
        const file = new MockFile(jsonContent, 'test.json', { type: 'application/json' });

        const result = await validateJSONFile(file);

        expect(result.jsonInfo!.sampleData).toEqual({ name: 'First Item', value: 1 });
      });
    });
  });

  describe('Multiple File Validation', () => {
    describe('validateFiles', () => {
      it('should validate multiple valid files', async () => {
        const files = [
          new MockFile('name,email\nJohn,john@example.com', 'file1.csv', { type: 'text/csv' }),
          new MockFile(JSON.stringify([{ name: 'Business' }]), 'file2.json', { type: 'application/json' }),
        ];

        const result = await validateFiles(files);

        expect(result.isValid).toBe(true);
        expect(result.results).toHaveLength(2);
        expect(result.overallErrors).toEqual([]);
      });

      it('should reject too many files', async () => {
        const files = Array.from({ length: 15 }, (_, i) =>
          new MockFile('content', `file${i}.csv`, { type: 'text/csv' })
        );

        const result = await validateFiles(files);

        expect(result.isValid).toBe(false);
        expect(result.overallErrors.some(error => error.includes('Too many files'))).toBe(true);
      });

      it('should detect duplicate file names', async () => {
        const files = [
          new MockFile('content1', 'duplicate.csv', { type: 'text/csv' }),
          new MockFile('content2', 'duplicate.csv', { type: 'text/csv' }),
          new MockFile('content3', 'unique.csv', { type: 'text/csv' }),
        ];

        const result = await validateFiles(files);

        expect(result.isValid).toBe(false);
        expect(result.overallErrors.some(error => error.includes('Duplicate file names'))).toBe(true);
      });

      it('should handle empty file list', async () => {
        const result = await validateFiles([]);

        expect(result.isValid).toBe(false);
        expect(result.overallErrors).toContain('No files selected');
      });

      it('should aggregate individual file validation results', async () => {
        const files = [
          new MockFile('valid content', 'valid.csv', { type: 'text/csv' }),
          new MockFile('', 'empty.csv', { type: 'text/csv' }), // Empty file should fail
        ];

        const result = await validateFiles(files);

        expect(result.isValid).toBe(false);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].isValid).toBe(true);
        expect(result.results[1].isValid).toBe(false);
      });
    });
  });

  describe('Predefined Validation Rules', () => {
    describe('VALIDATION_RULES', () => {
      it('should validate CSV with business headers', async () => {
        const csvWithBusinessHeaders = new MockFile(
          'name,address,phone\nBusiness,123 Main St,555-1234',
          'business.csv',
          { type: 'text/csv' }
        );

        const csvWithoutBusinessHeaders = new MockFile(
          'col1,col2,col3\nvalue1,value2,value3',
          'generic.csv',
          { type: 'text/csv' }
        );

        const validResult = await VALIDATION_RULES.csvWithBusinessHeaders.validate(csvWithBusinessHeaders);
        const invalidResult = await VALIDATION_RULES.csvWithBusinessHeaders.validate(csvWithoutBusinessHeaders);

        expect(validResult).toBe(true);
        expect(invalidResult).toBe(false);
      });

      it('should validate JSON business array', async () => {
        const validBusinessJSON = new MockFile(
          JSON.stringify([{ name: 'Business', address: '123 Main St' }]),
          'business.json',
          { type: 'application/json' }
        );

        const invalidJSON = new MockFile(
          JSON.stringify({ not: 'an array' }),
          'invalid.json',
          { type: 'application/json' }
        );

        const validResult = await VALIDATION_RULES.jsonBusinessArray.validate(validBusinessJSON);
        const invalidResult = await VALIDATION_RULES.jsonBusinessArray.validate(invalidJSON);

        expect(validResult).toBe(true);
        expect(invalidResult).toBe(false);
      });

      it('should validate file name rules', () => {
        const fileWithSpaces = new MockFile('content', 'file with spaces.csv', { type: 'text/csv' });
        const fileWithoutSpaces = new MockFile('content', 'file-without-spaces.csv', { type: 'text/csv' });

        const resultWithSpaces = VALIDATION_RULES.noSpacesInFileName.validate(fileWithSpaces);
        const resultWithoutSpaces = VALIDATION_RULES.noSpacesInFileName.validate(fileWithoutSpaces);

        expect(resultWithSpaces).toBe(false);
        expect(resultWithoutSpaces).toBe(true);
      });

      it('should validate reasonable file size', () => {
        const tinyFile = new MockFile('', 'tiny.csv', { type: 'text/csv' }); // 0 bytes
        const normalFile = new MockFile('a'.repeat(1000), 'normal.csv', { type: 'text/csv' }); // ~1KB
        const hugeFile = new MockFile('a'.repeat(6 * 1024 * 1024), 'huge.csv', { type: 'text/csv' }); // 6MB

        expect(VALIDATION_RULES.reasonableFileSize.validate(tinyFile)).toBe(false);
        expect(VALIDATION_RULES.reasonableFileSize.validate(normalFile)).toBe(true);
        expect(VALIDATION_RULES.reasonableFileSize.validate(hugeFile)).toBe(false);
      });
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle files with Unicode content', async () => {
      const unicodeCSV = 'name,description\n"Café Restaurant","Spéciälty føød"\n"东方酒店","中式餐厅"';
      const file = new MockFile(unicodeCSV, 'unicode.csv', { type: 'text/csv' });

      const result = await validateCSVFile(file);

      expect(result.isValid).toBe(true);
      expect(result.csvInfo!.rows[0]).toEqual(['Café Restaurant', 'Spéciälty føød']);
      expect(result.csvInfo!.rows[1]).toEqual(['东方酒店', '中式餐厅']);
    });

    it('should handle very large valid files efficiently', async () => {
      const largeCSVContent = 'name,email\n' + Array.from(
        { length: 10000 },
        (_, i) => `Business ${i},business${i}@example.com`
      ).join('\n');

      const file = new MockFile(largeCSVContent, 'large.csv', { type: 'text/csv' });

      const startTime = Date.now();
      const result = await validateCSVFile(file);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(result.csvInfo!.rowCount).toBe(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle malformed CSV gracefully', async () => {
      const malformedCSV = 'name,email\n"Unclosed quote,email@example.com\nNormal,normal@example.com';
      const file = new MockFile(malformedCSV, 'malformed.csv', { type: 'text/csv' });

      const result = await validateCSVFile(file);

      // Should still parse but may have warnings
      expect(result.isValid).toBe(true);
      expect(result.csvInfo!.rowCount).toBeGreaterThan(0);
    });

    it('should validate files with mixed content types', async () => {
      // CSV file with JSON extension
      const csvWithJsonExt = new MockFile(
        'name,email\nJohn,john@example.com',
        'data.json',
        { type: 'text/csv' }
      );

      const result = await validateFile(csvWithJsonExt);

      // Should validate by content type, not extension mismatch
      expect(result.isValid).toBe(true);
    });

    it('should handle concurrent file validation', async () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        new MockFile(`name,email\nBusiness ${i},biz${i}@example.com`, `file${i}.csv`, { type: 'text/csv' })
      );

      const startTime = Date.now();
      const promises = files.map(file => validateCSVFile(file));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results.every(result => result.isValid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete concurrently
    });
  });
});