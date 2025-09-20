import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FileUploadForm, { FileUploadFormProps } from '../FileUploadForm';

// Mock File constructor and FileList for testing
const createMockFile = (name: string, size: number, type: string, content = 'mock content'): File => {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    ...files,
  } as FileList;

  return fileList;
};

describe('FileUploadForm', () => {
  const defaultProps: FileUploadFormProps = {
    onFileUpload: jest.fn(),
    onValidationError: jest.fn(),
    accept: '.csv,.json',
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the file upload form', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByTestId('file-upload-form')).toBeInTheDocument();
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
      expect(screen.getByText('Upload files')).toBeInTheDocument();
      expect(screen.getByText('or drag and drop')).toBeInTheDocument();
    });

    it('should render with title when provided', () => {
      render(<FileUploadForm {...defaultProps} title="Upload Your Files" />);

      expect(screen.getByText('Upload Your Files')).toBeInTheDocument();
    });

    it('should display accepted file formats', () => {
      render(<FileUploadForm {...defaultProps} accept=".csv,.json,.txt" />);

      expect(screen.getByText('Accepted formats: .csv,.json,.txt')).toBeInTheDocument();
    });

    it('should display maximum file size', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      render(<FileUploadForm {...defaultProps} maxSize={maxSize} />);

      expect(screen.getByText('Maximum size: 5MB')).toBeInTheDocument();
    });

    it('should show multiple files info when multiple is true', () => {
      render(<FileUploadForm {...defaultProps} multiple={true} />);

      expect(screen.getByText('You can select multiple files')).toBeInTheDocument();
    });

    it('should show format-specific instructions', () => {
      render(<FileUploadForm {...defaultProps} accept=".csv,.json" />);

      expect(screen.getByText(/CSV files should include headers/)).toBeInTheDocument();
      expect(screen.getByText(/JSON files should contain an array/)).toBeInTheDocument();
    });

    it('should render help section', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByText('Need help preparing your files?')).toBeInTheDocument();
    });
  });

  describe('File Input Interaction', () => {
    it('should trigger file input when upload area is clicked', async () => {
      const user = userEvent.setup();
      render(<FileUploadForm {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(screen.getByText('Upload files'));

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle file selection via input', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const file = createMockFile('test.csv', 1024, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} multiple={true} />);

      const files = [
        createMockFile('file1.csv', 1024, 'text/csv'),
        createMockFile('file2.json', 2048, 'application/json'),
      ];
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, files);

      expect(mockOnFileUpload).toHaveBeenCalledWith(files);
    });

    it('should return single file when multiple is false', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} multiple={false} />);

      const files = [
        createMockFile('file1.csv', 1024, 'text/csv'),
        createMockFile('file2.json', 2048, 'application/json'),
      ];
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, files);

      // Should only return the first file when multiple is false
      expect(mockOnFileUpload).toHaveBeenCalledWith(files[0]);
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', () => {
      render(<FileUploadForm {...defaultProps} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragOver(dropZone);

      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');
      expect(screen.getByText('Drop files here to upload')).toBeInTheDocument();
    });

    it('should handle drag leave events', () => {
      render(<FileUploadForm {...defaultProps} />);

      const dropZone = screen.getByTestId('drop-zone');

      // First drag over
      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');

      // Then drag leave
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('border-blue-400', 'bg-blue-50');
      expect(screen.queryByText('Drop files here to upload')).not.toBeInTheDocument();
    });

    it('should handle file drop', () => {
      const mockOnFileUpload = jest.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = createMockFile('dropped.csv', 1024, 'text/csv');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: createMockFileList([file]),
        },
      });

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });

    it('should handle multiple file drop when multiple is enabled', () => {
      const mockOnFileUpload = jest.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} multiple={true} />);

      const dropZone = screen.getByTestId('drop-zone');
      const files = [
        createMockFile('file1.csv', 1024, 'text/csv'),
        createMockFile('file2.json', 2048, 'application/json'),
      ];

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: createMockFileList(files),
        },
      });

      expect(mockOnFileUpload).toHaveBeenCalledWith(files);
    });

    it('should clear drag state after drop', () => {
      render(<FileUploadForm {...defaultProps} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = createMockFile('test.csv', 1024, 'text/csv');

      // Start drag
      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50');

      // Drop file
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: createMockFileList([file]),
        },
      });

      // Drag state should be cleared
      expect(dropZone).not.toHaveClass('border-blue-400', 'bg-blue-50');
      expect(screen.queryByText('Drop files here to upload')).not.toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    describe('File Size Validation', () => {
      it('should accept files within size limit', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          maxSize={5 * 1024 * 1024} // 5MB
        />);

        const file = createMockFile('test.csv', 3 * 1024 * 1024, 'text/csv'); // 3MB
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).toHaveBeenCalledWith(file);
        expect(mockOnValidationError).not.toHaveBeenCalled();
      });

      it('should reject files exceeding size limit', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          maxSize={5 * 1024 * 1024} // 5MB
        />);

        const file = createMockFile('large.csv', 10 * 1024 * 1024, 'text/csv'); // 10MB
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).not.toHaveBeenCalled();
        expect(mockOnValidationError).toHaveBeenCalledWith('File size exceeds maximum limit');
      });
    });

    describe('File Type Validation', () => {
      it('should accept files with correct MIME type', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          accept=".csv,text/csv"
        />);

        const file = createMockFile('test.csv', 1024, 'text/csv');
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).toHaveBeenCalledWith(file);
        expect(mockOnValidationError).not.toHaveBeenCalled();
      });

      it('should accept files with correct extension', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          accept=".csv,.json"
        />);

        const file = createMockFile('test.csv', 1024, ''); // No MIME type, but correct extension
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).toHaveBeenCalledWith(file);
        expect(mockOnValidationError).not.toHaveBeenCalled();
      });

      it('should reject files with incorrect type and extension', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          accept=".csv,.json"
        />);

        const file = createMockFile('test.txt', 1024, 'text/plain');
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).not.toHaveBeenCalled();
        expect(mockOnValidationError).toHaveBeenCalledWith('Invalid file type');
      });

      it('should handle case-insensitive extension matching', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          accept=".csv"
        />);

        const file = createMockFile('test.CSV', 1024, '');
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, file);

        expect(mockOnFileUpload).toHaveBeenCalledWith(file);
        expect(mockOnValidationError).not.toHaveBeenCalled();
      });
    });

    describe('Multiple File Validation', () => {
      it('should process only valid files from multiple selection', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          multiple={true}
          accept=".csv"
        />);

        const files = [
          createMockFile('valid1.csv', 1024, 'text/csv'),
          createMockFile('invalid.txt', 1024, 'text/plain'), // Invalid type
          createMockFile('valid2.csv', 1024, 'text/csv'),
        ];
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, files);

        expect(mockOnFileUpload).toHaveBeenCalledWith([files[0], files[2]]);
        expect(mockOnValidationError).toHaveBeenCalledWith('Invalid file type');
      });

      it('should not call onFileUpload if no files are valid', async () => {
        const user = userEvent.setup();
        const mockOnFileUpload = jest.fn();
        const mockOnValidationError = jest.fn();

        render(<FileUploadForm
          {...defaultProps}
          onFileUpload={mockOnFileUpload}
          onValidationError={mockOnValidationError}
          accept=".csv"
        />);

        const files = [
          createMockFile('invalid1.txt', 1024, 'text/plain'),
          createMockFile('invalid2.doc', 1024, 'application/msword'),
        ];
        const fileInput = screen.getByTestId('file-input');

        await user.upload(fileInput, files);

        expect(mockOnFileUpload).not.toHaveBeenCalled();
        expect(mockOnValidationError).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Utility Functions', () => {
    it('should format file sizes correctly', () => {
      render(<FileUploadForm {...defaultProps} maxSize={1024 * 1024} />);

      expect(screen.getByText('Maximum size: 1MB')).toBeInTheDocument();
    });

    it('should handle files without extension', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();
      const mockOnValidationError = jest.fn();

      render(<FileUploadForm
        {...defaultProps}
        onFileUpload={mockOnFileUpload}
        onValidationError={mockOnValidationError}
        accept="text/csv"
      />);

      const file = createMockFile('noextension', 1024, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list', () => {
      const mockOnFileUpload = jest.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: createMockFileList([]),
        },
      });

      expect(mockOnFileUpload).not.toHaveBeenCalled();
    });

    it('should handle null file list', () => {
      const mockOnFileUpload = jest.fn();
      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: null,
        },
      });

      expect(mockOnFileUpload).not.toHaveBeenCalled();
    });

    it('should handle files with zero size', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();
      const mockOnValidationError = jest.fn();

      render(<FileUploadForm
        {...defaultProps}
        onFileUpload={mockOnFileUpload}
        onValidationError={mockOnValidationError}
        minSize={1}
      />);

      const file = createMockFile('empty.csv', 0, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });

    it('should handle very long file names', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const longFileName = 'a'.repeat(200) + '.csv';
      const file = createMockFile(longFileName, 1024, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });

    it('should handle special characters in file names', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm {...defaultProps} onFileUpload={mockOnFileUpload} />);

      const specialFileName = 'test-file_123 (copy).csv';
      const file = createMockFile(specialFileName, 1024, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      render(<FileUploadForm {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('id', 'file-upload');
      expect(fileInput).toHaveAttribute('name', 'file-upload');

      const label = screen.getByLabelText('Upload files');
      expect(label).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FileUploadForm {...defaultProps} />);

      const uploadLabel = screen.getByText('Upload files');

      // Should be focusable
      await user.tab();
      expect(uploadLabel).toHaveFocus();

      // Should respond to Enter key
      const fileInput = screen.getByTestId('file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.keyboard('{Enter}');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should have screen reader friendly content', () => {
      render(<FileUploadForm {...defaultProps} />);

      expect(screen.getByText('Upload files')).toBeInTheDocument();
      expect(screen.getByText('or drag and drop')).toBeInTheDocument();
      expect(screen.getByRole('button', { hidden: true })).toHaveClass('sr-only');
    });
  });

  describe('Help Section', () => {
    it('should expand help section when clicked', async () => {
      const user = userEvent.setup();
      render(<FileUploadForm {...defaultProps} />);

      const helpToggle = screen.getByText('Need help preparing your files?');
      await user.click(helpToggle);

      expect(screen.getByText(/CSV Format:/)).toBeInTheDocument();
      expect(screen.getByText(/JSON Format:/)).toBeInTheDocument();
      expect(screen.getByText(/Encoding:/)).toBeInTheDocument();
      expect(screen.getByText(/Size Limit:/)).toBeInTheDocument();
    });
  });

  describe('Configuration Options', () => {
    it('should work without validation callbacks', async () => {
      const user = userEvent.setup();
      render(<FileUploadForm accept=".csv" maxSize={1024 * 1024} />);

      const file = createMockFile('test.csv', 1024, 'text/csv');
      const fileInput = screen.getByTestId('file-input');

      // Should not throw error
      expect(() => user.upload(fileInput, file)).not.toThrow();
    });

    it('should work with no accept restriction', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm onFileUpload={mockOnFileUpload} accept="" />);

      const file = createMockFile('any-file.xyz', 1024, 'application/octet-stream');
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });

    it('should work with no size restriction', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();

      render(<FileUploadForm onFileUpload={mockOnFileUpload} maxSize={0} />);

      const file = createMockFile('large.csv', 100 * 1024 * 1024, 'text/csv'); // 100MB
      const fileInput = screen.getByTestId('file-input');

      await user.upload(fileInput, file);

      expect(mockOnFileUpload).toHaveBeenCalledWith(file);
    });
  });

  describe('Integration', () => {
    it('should work with realistic file upload scenario', async () => {
      const user = userEvent.setup();
      const mockOnFileUpload = jest.fn();
      const mockOnValidationError = jest.fn();

      render(<FileUploadForm
        {...defaultProps}
        onFileUpload={mockOnFileUpload}
        onValidationError={mockOnValidationError}
        title="Upload Your Business Data"
        accept=".csv,.json"
        maxSize={5 * 1024 * 1024}
        multiple={true}
      />);

      // Upload multiple valid files
      const files = [
        createMockFile('businesses.csv', 2 * 1024 * 1024, 'text/csv'), // 2MB CSV
        createMockFile('locations.json', 1 * 1024 * 1024, 'application/json'), // 1MB JSON
      ];

      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, files);

      expect(mockOnFileUpload).toHaveBeenCalledWith(files);
      expect(mockOnValidationError).not.toHaveBeenCalled();

      // Test drag and drop with invalid file
      const dropZone = screen.getByTestId('drop-zone');
      const invalidFile = createMockFile('document.pdf', 1024, 'application/pdf');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: createMockFileList([invalidFile]),
        },
      });

      expect(mockOnValidationError).toHaveBeenCalledWith('Invalid file type');
    });
  });
});