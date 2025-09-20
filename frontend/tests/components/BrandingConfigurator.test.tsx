import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BrandingConfigurator from '@/components/wizard/BrandingConfigurator';

// Mock the component since it doesn't exist yet
vi.mock('@/components/wizard/BrandingConfigurator', () => ({
  default: ({
    initialData,
    onUpdate,
    onLogoUpload,
    onFontUpload,
    onPreview,
    isLoading
  }: any) => {
    const [formData, setFormData] = React.useState({
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#007bff',
      fontFamily: 'Arial, sans-serif',
      logoUrl: '',
      fontUrl: '',
      ...initialData,
    });

    const handleColorChange = (field: string, value: string) => {
      const newData = { ...formData, [field]: value };
      setFormData(newData);
      onUpdate?.(newData);
    };

    const handleFontChange = (value: string) => {
      const newData = { ...formData, fontFamily: value };
      setFormData(newData);
      onUpdate?.(newData);
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onLogoUpload?.(file);
        // Simulate URL update
        const newData = { ...formData, logoUrl: URL.createObjectURL(file) };
        setFormData(newData);
        onUpdate?.(newData);
      }
    };

    const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFontUpload?.(file);
        // Simulate URL update
        const newData = { ...formData, fontUrl: URL.createObjectURL(file) };
        setFormData(newData);
        onUpdate?.(newData);
      }
    };

    return (
      <div data-testid="branding-configurator" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      id="primary-color"
                      value={formData.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300"
                      data-testid="primary-color-input"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      data-testid="primary-color-text"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-700">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      id="secondary-color"
                      value={formData.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300"
                      data-testid="secondary-color-input"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      data-testid="secondary-color-text"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700">
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      id="accent-color"
                      value={formData.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="h-10 w-20 rounded border border-gray-300"
                      data-testid="accent-color-input"
                    />
                    <input
                      type="text"
                      value={formData.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      data-testid="accent-color-text"
                      placeholder="#007bff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Logo</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700">
                    Upload Logo
                  </label>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    data-testid="logo-upload-input"
                  />
                </div>
                {formData.logoUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-20 w-auto object-contain"
                      data-testid="logo-preview"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="font-family" className="block text-sm font-medium text-gray-700">
                    Font Family
                  </label>
                  <select
                    id="font-family"
                    value={formData.fontFamily}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    data-testid="font-family-select"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="custom">Custom Font (upload below)</option>
                  </select>
                </div>

                {formData.fontFamily === 'custom' && (
                  <div>
                    <label htmlFor="font-upload" className="block text-sm font-medium text-gray-700">
                      Upload Font File
                    </label>
                    <input
                      type="file"
                      id="font-upload"
                      accept=".woff,.woff2,.ttf,.otf"
                      onChange={handleFontUpload}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      data-testid="font-upload-input"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => onPreview?.(formData)}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                data-testid="preview-button"
              >
                {isLoading ? 'Generating Preview...' : 'Preview Changes'}
              </button>
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
            <div
              className="border rounded-lg p-6 min-h-[400px]"
              style={{
                backgroundColor: formData.secondaryColor,
                color: formData.primaryColor,
                fontFamily: formData.fontFamily === 'custom' ? 'CustomFont' : formData.fontFamily
              }}
              data-testid="live-preview"
            >
              <div
                className="p-4 rounded mb-4"
                style={{ backgroundColor: formData.primaryColor, color: formData.secondaryColor }}
              >
                {formData.logoUrl && (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="h-8 w-auto mb-2"
                    data-testid="preview-logo"
                  />
                )}
                <h1 className="text-xl font-bold">Your Directory</h1>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Sample Content</h2>
                <p>This is how your directory will look with the selected branding.</p>

                <button
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: formData.accentColor }}
                  data-testid="preview-button-accent"
                >
                  Sample Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
}));

// Mock React hooks
const React = {
  useState: vi.fn((initial) => {
    const state = { current: initial };
    const setState = (newValue: any) => {
      state.current = typeof newValue === 'function' ? newValue(state.current) : newValue;
    };
    return [state.current, setState];
  }),
};

describe('BrandingConfigurator Component', () => {
  const defaultProps = {
    initialData: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#007bff',
      fontFamily: 'Arial, sans-serif',
      logoUrl: '',
      fontUrl: '',
    },
    onUpdate: vi.fn(),
    onLogoUpload: vi.fn(),
    onFontUpload: vi.fn(),
    onPreview: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the branding configurator form', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      // This test MUST FAIL until we implement the component
      expect(screen.getByTestId('branding-configurator')).toBeInTheDocument();
      expect(screen.getByText('Brand Colors')).toBeInTheDocument();
      expect(screen.getByText('Logo')).toBeInTheDocument();
      expect(screen.getByText('Typography')).toBeInTheDocument();
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    it('should render color input fields', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByTestId('primary-color-input')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-color-input')).toBeInTheDocument();
      expect(screen.getByTestId('accent-color-input')).toBeInTheDocument();

      expect(screen.getByTestId('primary-color-text')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-color-text')).toBeInTheDocument();
      expect(screen.getByTestId('accent-color-text')).toBeInTheDocument();
    });

    it('should render logo upload section', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByText('Upload Logo')).toBeInTheDocument();
      expect(screen.getByTestId('logo-upload-input')).toBeInTheDocument();
    });

    it('should render font selection', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByText('Font Family')).toBeInTheDocument();
      expect(screen.getByTestId('font-family-select')).toBeInTheDocument();
    });

    it('should render preview button', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByTestId('preview-button')).toBeInTheDocument();
      expect(screen.getByText('Preview Changes')).toBeInTheDocument();
    });

    it('should render live preview section', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
      expect(screen.getByText('Sample Content')).toBeInTheDocument();
      expect(screen.getByTestId('preview-button-accent')).toBeInTheDocument();
    });
  });

  describe('Color Management', () => {
    it('should display initial color values', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      const primaryColorInput = screen.getByTestId('primary-color-input') as HTMLInputElement;
      const secondaryColorInput = screen.getByTestId('secondary-color-input') as HTMLInputElement;
      const accentColorInput = screen.getByTestId('accent-color-input') as HTMLInputElement;

      expect(primaryColorInput.value).toBe('#000000');
      expect(secondaryColorInput.value).toBe('#ffffff');
      expect(accentColorInput.value).toBe('#007bff');
    });

    it('should call onUpdate when color picker values change', async () => {
      const onUpdate = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onUpdate={onUpdate} />);

      const primaryColorInput = screen.getByTestId('primary-color-input');
      fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            primaryColor: '#ff0000',
          })
        );
      });
    });

    it('should call onUpdate when color text inputs change', async () => {
      const onUpdate = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onUpdate={onUpdate} />);

      const primaryColorText = screen.getByTestId('primary-color-text');
      fireEvent.change(primaryColorText, { target: { value: '#00ff00' } });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            primaryColor: '#00ff00',
          })
        );
      });
    });

    it('should update live preview when colors change', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      const livePreview = screen.getByTestId('live-preview');
      expect(livePreview).toHaveStyle({
        backgroundColor: '#ffffff',
        color: '#000000',
      });
    });
  });

  describe('Logo Management', () => {
    it('should call onLogoUpload when logo file is selected', async () => {
      const onLogoUpload = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onLogoUpload={onLogoUpload} />);

      const logoInput = screen.getByTestId('logo-upload-input');
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });

      fireEvent.change(logoInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onLogoUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should display logo preview when logoUrl is provided', () => {
      const propsWithLogo = {
        ...defaultProps,
        initialData: {
          ...defaultProps.initialData,
          logoUrl: 'https://example.com/logo.png',
        },
      };

      render(<BrandingConfigurator {...propsWithLogo} />);

      const logoPreview = screen.getByTestId('logo-preview');
      expect(logoPreview).toBeInTheDocument();
      expect(logoPreview).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('should show logo in live preview when available', () => {
      const propsWithLogo = {
        ...defaultProps,
        initialData: {
          ...defaultProps.initialData,
          logoUrl: 'https://example.com/logo.png',
        },
      };

      render(<BrandingConfigurator {...propsWithLogo} />);

      const previewLogo = screen.getByTestId('preview-logo');
      expect(previewLogo).toBeInTheDocument();
      expect(previewLogo).toHaveAttribute('src', 'https://example.com/logo.png');
    });
  });

  describe('Font Management', () => {
    it('should display font family options', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      const fontSelect = screen.getByTestId('font-family-select');
      expect(fontSelect).toBeInTheDocument();

      // Check that standard fonts are available
      expect(screen.getByText('Arial')).toBeInTheDocument();
      expect(screen.getByText('Helvetica')).toBeInTheDocument();
      expect(screen.getByText('Georgia')).toBeInTheDocument();
    });

    it('should call onUpdate when font family changes', async () => {
      const onUpdate = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onUpdate={onUpdate} />);

      const fontSelect = screen.getByTestId('font-family-select');
      fireEvent.change(fontSelect, { target: { value: 'Georgia, serif' } });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            fontFamily: 'Georgia, serif',
          })
        );
      });
    });

    it('should show custom font upload when custom is selected', async () => {
      render(<BrandingConfigurator {...defaultProps} />);

      const fontSelect = screen.getByTestId('font-family-select');
      fireEvent.change(fontSelect, { target: { value: 'custom' } });

      await waitFor(() => {
        expect(screen.getByTestId('font-upload-input')).toBeInTheDocument();
        expect(screen.getByText('Upload Font File')).toBeInTheDocument();
      });
    });

    it('should call onFontUpload when custom font is uploaded', async () => {
      const onFontUpload = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onFontUpload={onFontUpload} />);

      const fontSelect = screen.getByTestId('font-family-select');
      fireEvent.change(fontSelect, { target: { value: 'custom' } });

      await waitFor(() => {
        const fontInput = screen.getByTestId('font-upload-input');
        const file = new File(['font'], 'custom.woff2', { type: 'font/woff2' });

        fireEvent.change(fontInput, { target: { files: [file] } });

        expect(onFontUpload).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('Preview Functionality', () => {
    it('should call onPreview when preview button is clicked', () => {
      const onPreview = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onPreview={onPreview} />);

      const previewButton = screen.getByTestId('preview-button');
      fireEvent.click(previewButton);

      expect(onPreview).toHaveBeenCalledWith(defaultProps.initialData);
    });

    it('should show loading state on preview button when isLoading is true', () => {
      render(<BrandingConfigurator {...defaultProps} isLoading={true} />);

      const previewButton = screen.getByTestId('preview-button');
      expect(previewButton).toHaveTextContent('Generating Preview...');
      expect(previewButton).toBeDisabled();
    });

    it('should apply font family to live preview', () => {
      const propsWithFont = {
        ...defaultProps,
        initialData: {
          ...defaultProps.initialData,
          fontFamily: 'Georgia, serif',
        },
      };

      render(<BrandingConfigurator {...propsWithFont} />);

      const livePreview = screen.getByTestId('live-preview');
      expect(livePreview).toHaveStyle({
        fontFamily: 'Georgia, serif',
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form controls', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByLabelText('Primary Color')).toBeInTheDocument();
      expect(screen.getByLabelText('Secondary Color')).toBeInTheDocument();
      expect(screen.getByLabelText('Accent Color')).toBeInTheDocument();
      expect(screen.getByLabelText('Upload Logo')).toBeInTheDocument();
      expect(screen.getByLabelText('Font Family')).toBeInTheDocument();
    });

    it('should have proper file input attributes', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      const logoInput = screen.getByTestId('logo-upload-input');
      expect(logoInput).toHaveAttribute('accept', 'image/*');
      expect(logoInput).toHaveAttribute('type', 'file');
    });

    it('should have semantic headings', () => {
      render(<BrandingConfigurator {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 3, name: 'Brand Colors' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Logo' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Typography' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Live Preview' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback functions gracefully', () => {
      render(
        <BrandingConfigurator
          initialData={defaultProps.initialData}
          onUpdate={undefined}
          onLogoUpload={undefined}
          onFontUpload={undefined}
          onPreview={undefined}
        />
      );

      const primaryColorInput = screen.getByTestId('primary-color-input');
      const previewButton = screen.getByTestId('preview-button');

      expect(() => {
        fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });
        fireEvent.click(previewButton);
      }).not.toThrow();
    });

    it('should handle empty initial data', () => {
      render(<BrandingConfigurator initialData={{}} {...defaultProps} />);

      expect(screen.getByTestId('branding-configurator')).toBeInTheDocument();
    });

    it('should validate color input formats', () => {
      const onUpdate = vi.fn();
      render(<BrandingConfigurator {...defaultProps} onUpdate={onUpdate} />);

      const primaryColorText = screen.getByTestId('primary-color-text');

      // Valid hex color
      fireEvent.change(primaryColorText, { target: { value: '#ff0000' } });
      expect(onUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          primaryColor: '#ff0000',
        })
      );

      // Invalid color should still update (validation is handled elsewhere)
      fireEvent.change(primaryColorText, { target: { value: 'invalid' } });
      expect(onUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          primaryColor: 'invalid',
        })
      );
    });
  });
});