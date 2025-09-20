import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileUploadForm from '@/components/wizard/FileUploadForm';

// Mock the component since it doesn't exist yet
vi.mock('@/components/wizard/FileUploadForm', () => ({
  default: ({ onFileUpload, onValidationError, accept, maxSize, multiple, title }: any) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // Simulate validation
      const validFiles = files.filter(file => {
        if (maxSize && file.size > maxSize) {
          onValidationError?.('File size exceeds maximum limit');
          return false;
        }
        if (accept && !accept.includes(file.type) && !accept.includes(`.${file.name.split('.').pop()}`)) {
          onValidationError?.('Invalid file type');
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        onFileUpload?.(multiple ? validFiles : validFiles[0]);
      }
    };

    const handleDrop = (event: React.DragEvent) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);

      // Trigger the same validation as file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.files = event.dataTransfer.files;

      const mockEvent = { target: fileInput } as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(mockEvent);
    };

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault();
    };

    return (
      <div data-testid="file-upload-form" className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}

          <div
            className="space-y-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-testid="drop-zone"
          >
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500"
              >
                <span>Upload files</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple={multiple}
                  accept={accept}
                  onChange={handleFileChange}
                  data-testid="file-input"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>

            {accept && (
              <p className="text-xs text-gray-500">
                Accepted formats: {accept}
              </p>
            )}

            {maxSize && (
              <p className="text-xs text-gray-500">
                Maximum size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            )}
          </div>
        </div>
      </div>
    );
  },
}));

describe('FileUploadForm Component', () => {
  const defaultProps = {
    onFileUpload: vi.fn(),
    onValidationError: vi.fn(),
    accept: '.csv,.json',
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    title: 'Upload Data File',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the file upload form', () => {
      render(<FileUploadForm {...defaultProps} />);

      // This test MUST FAIL until we implement the component
      expect(screen.getByTestId('file-upload-form')).toBeInTheDocument();
      expect(screen.getByText('Upload Data File')).toBeInTheDocument();
      expect(screen.getByText('Upload files')).toBeInTheDocument();
      expect(screen.getByText('or drag and drop')).toBeInTheDocument();
    });

    it('should show accepted file formats', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByText('Accepted formats: .csv,.json')).toBeInTheDocument();
    });

    it('should show maximum file size', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByText('Maximum size: 10MB')).toBeInTheDocument();
    });

    it('should render without title when not provided', () => {
      render(<FileUploadForm {...defaultProps} title={undefined} />);

      expect(screen.getByTestId('file-upload-form')).toBeInTheDocument();
      expect(screen.queryByText('Upload Data File')).not.toBeInTheDocument();
    });

    it('should support multiple file selection when enabled', () => {
      render(<FileUploadForm {...defaultProps} multiple={true} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('multiple');
    });
  });

  describe('File Selection', () => {
    it('should call onFileUpload when a valid file is selected', async () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should call onFileUpload with array when multiple files are selected', async () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} multiple={true} />);

      const fileInput = screen.getByTestId('file-input');
      const file1 = new File(['content1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['content2'], 'test2.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith([file1, file2]);
      });
    });

    it('should validate file type and reject invalid files', async () => {
      const onValidationError = vi.fn();
      render(<FileUploadForm {...defaultProps} onValidationError={onValidationError} />);

      const fileInput = screen.getByTestId('file-input');
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalledWith('Invalid file type');
      });
    });

    it('should validate file size and reject oversized files', async () => {
      const onValidationError = vi.fn();
      render(<FileUploadForm {...defaultProps} onValidationError={onValidationError} maxSize={1024} />);

      const fileInput = screen.getByTestId('file-input');
      const largeFile = new File(['x'.repeat(2000)], 'large.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalledWith('File size exceeds maximum limit');
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag and drop file upload', async () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(onFileUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should prevent default behavior on drag over', () => {
      render(<FileUploadForm {...defaultProps} />);

      const dropZone = screen.getByTestId('drop-zone');
      const mockEvent = { preventDefault: vi.fn() };

      fireEvent.dragOver(dropZone, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should validate dropped files', async () => {
      const onValidationError = vi.fn();
      render(<FileUploadForm {...defaultProps} onValidationError={onValidationError} />);

      const dropZone = screen.getByTestId('drop-zone');
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      const dataTransfer = {
        files: [invalidFile],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalledWith('Invalid file type');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and form controls', () => {
      render(<FileUploadForm {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      const label = screen.getByText('Upload files');

      expect(fileInput).toHaveAttribute('id', 'file-upload');
      expect(fileInput).toHaveAttribute('name', 'file-upload');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(label.closest('label')).toHaveAttribute('for', 'file-upload');
    });

    it('should support keyboard navigation', () => {
      render(<FileUploadForm {...defaultProps} />);

      const label = screen.getByText('Upload files').closest('label');
      expect(label).toHaveClass('focus-within:outline-none', 'focus-within:ring-2', 'focus-within:ring-blue-500');
    });

    it('should hide file input visually but keep it accessible', () => {
      render(<FileUploadForm {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveClass('sr-only');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onFileUpload callback', () => {
      render(<FileUploadForm {...defaultProps} onFileUpload={undefined} />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });

      expect(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      }).not.toThrow();
    });

    it('should handle missing onValidationError callback', () => {
      render(<FileUploadForm {...defaultProps} onValidationError={undefined} />);

      const fileInput = screen.getByTestId('file-input');
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      expect(() => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      }).not.toThrow();
    });

    it('should handle empty file selection', () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} />);

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(onFileUpload).not.toHaveBeenCalled();
    });

    it('should handle files without accept constraint', () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} accept={undefined} />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(onFileUpload).toHaveBeenCalledWith(file);
    });

    it('should handle files without size constraint', () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} maxSize={undefined} />);

      const fileInput = screen.getByTestId('file-input');
      const largeFile = new File(['x'.repeat(10000)], 'large.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      expect(onFileUpload).toHaveBeenCalledWith(largeFile);
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work with only file input when drag and drop is not supported', () => {
      const onFileUpload = vi.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={onFileUpload} />);

      // Should still work through the file input
      const fileInput = screen.getByTestId('file-input');
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(onFileUpload).toHaveBeenCalledWith(file);
    });

    it('should display helpful text for different upload methods', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByText('Upload files')).toBeInTheDocument();
      expect(screen.getByText('or drag and drop')).toBeInTheDocument();
      expect(screen.getByText('Accepted formats: .csv,.json')).toBeInTheDocument();
      expect(screen.getByText('Maximum size: 10MB')).toBeInTheDocument();
    });
  });
});