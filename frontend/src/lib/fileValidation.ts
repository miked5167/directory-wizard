export interface FileValidationRule {
  name: string;
  validate: (file: File) => boolean | Promise<boolean>;
  message: string;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  minSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[];
  maxFiles?: number;
  requireHeaders?: string[]; // for CSV files
  customRules?: FileValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
    lastModified: Date;
  };
}

export interface CSVValidationResult extends ValidationResult {
  csvInfo?: {
    headers: string[];
    rowCount: number;
    hasHeaderRow: boolean;
    delimiter: string;
    encoding: string;
    sampleRows: string[][];
  };
}

export interface JSONValidationResult extends ValidationResult {
  jsonInfo?: {
    structure: 'object' | 'array' | 'primitive';
    itemCount?: number;
    keys?: string[];
    sampleData?: any;
    isValidListingArray?: boolean;
  };
}

// Default validation options
export const DEFAULT_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  minSize: 1, // 1 byte
  allowedTypes: [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/json',
    'text/json',
  ],
  allowedExtensions: ['.csv', '.txt', '.json'],
  maxFiles: 10,
};

// Common MIME type mappings
const MIME_TYPE_EXTENSIONS: Record<string, string[]> = {
  'text/csv': ['.csv'],
  'application/csv': ['.csv'],
  'text/plain': ['.txt', '.csv'],
  'application/json': ['.json'],
  'text/json': ['.json'],
};

// File size formatting utility
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
};

// Detect CSV delimiter
export const detectCSVDelimiter = (csvText: string): string => {
  const sample = csvText.substring(0, 1000); // First 1000 characters
  const delimiters = [',', ';', '\t', '|'];

  let maxCount = 0;
  let detectedDelimiter = ',';

  for (const delimiter of delimiters) {
    const count = (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  }

  return detectedDelimiter;
};

// Parse CSV content
export const parseCSVContent = async (file: File): Promise<{
  headers: string[];
  rows: string[][];
  delimiter: string;
  hasHeaderRow: boolean;
}> => {
  const text = await file.text();
  const delimiter = detectCSVDelimiter(text);

  const lines = text.split(/\r\n|\n|\r/);
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse rows using a simple CSV parser (handles quoted fields)
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  };

  const rows = nonEmptyLines.map(line => parseCSVLine(line, delimiter));

  // Detect if first row is headers
  const firstRow = rows[0];
  const secondRow = rows[1];

  let hasHeaderRow = false;
  if (firstRow && secondRow) {
    // Simple heuristic: if first row has more non-numeric values than second row, it's likely headers
    const firstRowNonNumeric = firstRow.filter(cell => isNaN(Number(cell))).length;
    const secondRowNonNumeric = secondRow.filter(cell => isNaN(Number(cell))).length;
    hasHeaderRow = firstRowNonNumeric > secondRowNonNumeric;
  } else {
    // If only one row, assume it's not headers
    hasHeaderRow = false;
  }

  const headers = hasHeaderRow ? rows[0] : rows[0].map((_, index) => `Column ${index + 1}`);
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;

  return {
    headers,
    rows: dataRows,
    delimiter,
    hasHeaderRow,
  };
};

// Validate JSON structure for listings
export const validateListingJSONStructure = (data: any): {
  isValid: boolean;
  errors: string[];
  itemCount?: number;
  sampleItem?: any;
} => {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('JSON must contain an array of listings');
    return { isValid: false, errors };
  }

  if (data.length === 0) {
    errors.push('JSON array cannot be empty');
    return { isValid: false, errors };
  }

  const sampleItem = data[0];
  if (typeof sampleItem !== 'object' || sampleItem === null) {
    errors.push('Each listing must be an object');
    return { isValid: false, errors };
  }

  // Check for required fields in listing objects
  const requiredFields = ['name', 'title'];
  const recommendedFields = ['description', 'category', 'location', 'phone', 'email', 'website'];

  const hasRequiredField = requiredFields.some(field =>
    sampleItem.hasOwnProperty(field) &&
    typeof sampleItem[field] === 'string' &&
    sampleItem[field].trim().length > 0
  );

  if (!hasRequiredField) {
    errors.push(`Each listing should have at least one of: ${requiredFields.join(', ')}`);
  }

  // Check data types
  for (const item of data.slice(0, 5)) { // Check first 5 items
    if (typeof item !== 'object' || item === null) {
      errors.push('All items in the array must be objects');
      break;
    }

    // Validate field types
    for (const [key, value] of Object.entries(item)) {
      if (value !== null && value !== undefined && typeof value !== 'string' && typeof value !== 'number') {
        errors.push(`Field '${key}' should be a string or number, found ${typeof value}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    itemCount: data.length,
    sampleItem,
  };
};

// Main file validation function
export const validateFile = async (
  file: File,
  options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Merge with default options
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  // Basic file info
  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: getFileExtension(file.name),
    lastModified: new Date(file.lastModified),
  };

  // Size validation
  if (opts.maxSize && file.size > opts.maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(opts.maxSize)})`);
  }

  if (opts.minSize && file.size < opts.minSize) {
    errors.push(`File size (${formatFileSize(file.size)}) is below minimum required size (${formatFileSize(opts.minSize)})`);
  }

  // Empty file check
  if (file.size === 0) {
    errors.push('File is empty');
  }

  // MIME type validation
  if (opts.allowedTypes && opts.allowedTypes.length > 0) {
    const isAllowedType = opts.allowedTypes.includes(file.type);
    const isAllowedByExtension = opts.allowedTypes.some(type => {
      const extensions = MIME_TYPE_EXTENSIONS[type] || [];
      return extensions.includes(fileInfo.extension);
    });

    if (!isAllowedType && !isAllowedByExtension) {
      errors.push(`File type '${file.type}' is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`);
    }
  }

  // Extension validation
  if (opts.allowedExtensions && opts.allowedExtensions.length > 0) {
    if (!opts.allowedExtensions.includes(fileInfo.extension)) {
      errors.push(`File extension '${fileInfo.extension}' is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`);
    }
  }

  // Custom rules validation
  if (opts.customRules) {
    for (const rule of opts.customRules) {
      try {
        const isValid = await rule.validate(file);
        if (!isValid) {
          errors.push(rule.message);
        }
      } catch (err) {
        errors.push(`Custom validation rule '${rule.name}' failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }

  // File name validation
  if (file.name.length > 255) {
    warnings.push('File name is very long and may cause issues');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    warnings.push('File name contains special characters that may cause issues');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo,
  };
};

// CSV-specific validation
export const validateCSVFile = async (
  file: File,
  options: FileValidationOptions & {
    requireHeaders?: string[];
    maxRows?: number;
    minRows?: number;
  } = {}
): Promise<CSVValidationResult> => {
  const baseResult = await validateFile(file, options);

  if (!baseResult.isValid) {
    return baseResult as CSVValidationResult;
  }

  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  try {
    const csvData = await parseCSVContent(file);
    const rowCount = csvData.rows.length;

    // Row count validation
    if (options.maxRows && rowCount > options.maxRows) {
      errors.push(`CSV has too many rows (${rowCount}). Maximum allowed: ${options.maxRows}`);
    }

    if (options.minRows && rowCount < options.minRows) {
      errors.push(`CSV has too few rows (${rowCount}). Minimum required: ${options.minRows}`);
    }

    // Header validation
    if (options.requireHeaders && options.requireHeaders.length > 0) {
      const missingHeaders = options.requireHeaders.filter(
        header => !csvData.headers.some(h => h.toLowerCase().trim() === header.toLowerCase().trim())
      );

      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
    }

    // Consistency checks
    const firstRowLength = csvData.rows[0]?.length || 0;
    const inconsistentRows = csvData.rows.filter(row => row.length !== firstRowLength);

    if (inconsistentRows.length > 0) {
      warnings.push(`${inconsistentRows.length} rows have inconsistent column counts`);
    }

    // Empty row detection
    const emptyRows = csvData.rows.filter(row => row.every(cell => !cell || cell.trim() === ''));
    if (emptyRows.length > 0) {
      warnings.push(`Found ${emptyRows.length} empty rows`);
    }

    const csvInfo = {
      headers: csvData.headers,
      rowCount,
      hasHeaderRow: csvData.hasHeaderRow,
      delimiter: csvData.delimiter,
      encoding: 'UTF-8', // Assume UTF-8 for now
      sampleRows: csvData.rows.slice(0, 3), // First 3 rows
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: baseResult.fileInfo,
      csvInfo,
    };

  } catch (err) {
    errors.push(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);

    return {
      isValid: false,
      errors,
      warnings,
      fileInfo: baseResult.fileInfo,
    };
  }
};

// JSON-specific validation
export const validateJSONFile = async (
  file: File,
  options: FileValidationOptions & {
    validateAsListings?: boolean;
    maxItems?: number;
    minItems?: number;
  } = {}
): Promise<JSONValidationResult> => {
  const baseResult = await validateFile(file, options);

  if (!baseResult.isValid) {
    return baseResult as JSONValidationResult;
  }

  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let structure: 'object' | 'array' | 'primitive';
    let itemCount: number | undefined;
    let keys: string[] | undefined;

    if (Array.isArray(data)) {
      structure = 'array';
      itemCount = data.length;
    } else if (typeof data === 'object' && data !== null) {
      structure = 'object';
      keys = Object.keys(data);
    } else {
      structure = 'primitive';
    }

    // Item count validation for arrays
    if (structure === 'array') {
      if (options.maxItems && itemCount! > options.maxItems) {
        errors.push(`JSON array has too many items (${itemCount}). Maximum allowed: ${options.maxItems}`);
      }

      if (options.minItems && itemCount! < options.minItems) {
        errors.push(`JSON array has too few items (${itemCount}). Minimum required: ${options.minItems}`);
      }
    }

    // Validate as listings if requested
    let isValidListingArray = false;
    if (options.validateAsListings && structure === 'array') {
      const validationResult = validateListingJSONStructure(data);
      isValidListingArray = validationResult.isValid;
      errors.push(...validationResult.errors);
    }

    const jsonInfo = {
      structure,
      itemCount,
      keys,
      sampleData: structure === 'array' ? data[0] : structure === 'object' ? data : data,
      isValidListingArray,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: baseResult.fileInfo,
      jsonInfo,
    };

  } catch (err) {
    errors.push(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Invalid JSON format'}`);

    return {
      isValid: false,
      errors,
      warnings,
      fileInfo: baseResult.fileInfo,
    };
  }
};

// Validate multiple files
export const validateFiles = async (
  files: FileList | File[],
  options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS
): Promise<{
  isValid: boolean;
  results: ValidationResult[];
  overallErrors: string[];
}> => {
  const fileArray = Array.from(files);
  const overallErrors: string[] = [];

  // Check file count
  if (options.maxFiles && fileArray.length > options.maxFiles) {
    overallErrors.push(`Too many files selected (${fileArray.length}). Maximum allowed: ${options.maxFiles}`);
  }

  if (fileArray.length === 0) {
    overallErrors.push('No files selected');
  }

  // Validate each file
  const results = await Promise.all(
    fileArray.map(file => validateFile(file, options))
  );

  // Check for duplicate file names
  const fileNames = fileArray.map(f => f.name);
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    overallErrors.push(`Duplicate file names: ${[...new Set(duplicates)].join(', ')}`);
  }

  const isValid = overallErrors.length === 0 && results.every(r => r.isValid);

  return {
    isValid,
    results,
    overallErrors,
  };
};

// Predefined validation rules
export const VALIDATION_RULES = {
  // CSV Rules
  csvWithBusinessHeaders: {
    name: 'Business CSV Headers',
    validate: async (file: File) => {
      try {
        const csvData = await parseCSVContent(file);
        const requiredHeaders = ['name', 'address', 'phone'];
        return requiredHeaders.some(header =>
          csvData.headers.some(h => h.toLowerCase().includes(header))
        );
      } catch {
        return false;
      }
    },
    message: 'CSV must contain business-related headers (name, address, phone, etc.)',
  },

  // JSON Rules
  jsonBusinessArray: {
    name: 'Business JSON Array',
    validate: async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const validation = validateListingJSONStructure(data);
        return validation.isValid;
      } catch {
        return false;
      }
    },
    message: 'JSON must be a valid array of business listings',
  },

  // File name rules
  noSpacesInFileName: {
    name: 'No Spaces in File Name',
    validate: (file: File) => !file.name.includes(' '),
    message: 'File name should not contain spaces',
  },

  // Size rules
  reasonableFileSize: {
    name: 'Reasonable File Size',
    validate: (file: File) => file.size >= 100 && file.size <= 5 * 1024 * 1024, // 100 bytes to 5MB
    message: 'File size should be between 100 bytes and 5MB',
  },
} as const;

export type ValidationRuleName = keyof typeof VALIDATION_RULES;