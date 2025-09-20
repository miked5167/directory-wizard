// File processing utilities for uploads
export interface ValidationError {
  line: number;
  field: string;
  message: string;
}

export interface ProcessingResult {
  recordsCount: number;
  validationStatus: 'VALID' | 'INVALID';
  validationErrors: ValidationError[];
}

export class FileProcessor {
  static processCategories(fileContent: string): ProcessingResult {
    const result: ProcessingResult = {
      recordsCount: 0,
      validationStatus: 'VALID',
      validationErrors: [],
    };

    try {
      // Parse and validate JSON
      const categories = JSON.parse(fileContent);

      if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
      }

      // Validate each category has required fields
      categories.forEach((category, index) => {
        if (!category.name) {
          result.validationErrors.push({
            line: index + 1,
            field: 'name',
            message: 'Name is required for category',
          });
        }
        if (!category.slug) {
          result.validationErrors.push({
            line: index + 1,
            field: 'slug',
            message: 'Slug is required for category',
          });
        }
      });

      result.recordsCount = categories.length;

      if (result.validationErrors.length > 0) {
        result.validationStatus = 'INVALID';
      }

      return result;
    } catch (parseError) {
      result.validationStatus = 'INVALID';
      result.validationErrors.push({
        line: 1,
        field: 'file',
        message: parseError instanceof Error ? parseError.message : 'Invalid JSON format',
      });
      return result;
    }
  }

  static processListings(fileContent: string): ProcessingResult {
    const result: ProcessingResult = {
      recordsCount: 0,
      validationStatus: 'VALID',
      validationErrors: [],
    };

    try {
      // Parse CSV and validate
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      const requiredHeaders = ['title', 'category', 'description'];

      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        result.validationErrors.push({
          line: 1,
          field: 'headers',
          message: `Missing required headers: ${missingHeaders.join(', ')}`,
        });
      }

      // Validate data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]?.split(',').map(v => v.trim()) || [];
        requiredHeaders.forEach((header, headerIndex) => {
          if (!values[headerIndex] || values[headerIndex] === '') {
            result.validationErrors.push({
              line: i + 1,
              field: header,
              message: `${header} is required`,
            });
          }
        });
      }

      result.recordsCount = lines.length - 1; // Exclude header row

      if (result.validationErrors.length > 0) {
        result.validationStatus = 'INVALID';
      }

      return result;
    } catch (parseError) {
      result.validationStatus = 'INVALID';
      result.validationErrors.push({
        line: 1,
        field: 'file',
        message: parseError instanceof Error ? parseError.message : 'Invalid CSV format',
      });
      return result;
    }
  }

  static validateFileType(
    file: Express.Multer.File,
    expectedType: string
  ): { isValid: boolean; error?: string } {
    if (expectedType === 'categories') {
      if (!file.originalname.endsWith('.json')) {
        return {
          isValid: false,
          error: 'Invalid file type: categories upload requires JSON file',
        };
      }
    } else if (expectedType === 'listings') {
      if (!file.originalname.endsWith('.csv')) {
        return {
          isValid: false,
          error: 'Invalid file type: listings upload requires CSV file',
        };
      }
    }

    return { isValid: true };
  }
}
