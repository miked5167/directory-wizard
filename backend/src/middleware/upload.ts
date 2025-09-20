import multer from 'multer';

// File upload configuration for different upload types
export const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'logo') {
      // Accept only image files for logo
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid logo format: only image files allowed'));
      }
    } else if (file.fieldname === 'font_file') {
      // Accept font files
      if (file.mimetype.includes('font') || file.originalname.match(/\.(woff|woff2|ttf|otf)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Font file must be .woff, .woff2, .ttf, or .otf'));
      }
    } else if (file.fieldname === 'file') {
      // Accept JSON and CSV files for upload endpoint
      if (
        file.originalname.match(/\.(json|csv)$/i) ||
        file.mimetype.includes('json') ||
        file.mimetype.includes('csv') ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/octet-stream'
      ) {
        cb(null, true);
      } else {
        cb(new Error('File must be JSON or CSV format'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  },
});

// Specific upload configurations for different endpoints
export const brandingUpload = uploadConfig.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'font_file', maxCount: 1 },
]);

export const fileUpload = uploadConfig.single('file');
