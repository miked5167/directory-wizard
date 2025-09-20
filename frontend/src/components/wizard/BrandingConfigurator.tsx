'use client';

import React, { useState, useEffect } from 'react';

export interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  fontUrl?: string;
}

export interface BrandingConfiguratorProps {
  initialData?: Partial<BrandingData>;
  onUpdate?: (data: BrandingData) => void;
  onLogoUpload?: (file: File) => void;
  onFontUpload?: (file: File) => void;
  onPreview?: (data: BrandingData) => void;
  isLoading?: boolean;
}

const BrandingConfigurator: React.FC<BrandingConfiguratorProps> = ({
  initialData = {},
  onUpdate,
  onLogoUpload,
  onFontUpload,
  onPreview,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<BrandingData>({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#007bff',
    fontFamily: 'Arial, sans-serif',
    logoUrl: '',
    fontUrl: '',
    ...initialData,
  });

  const handleColorChange = (field: keyof BrandingData, value: string) => {
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
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      const newData = { ...formData, logoUrl: previewUrl };
      setFormData(newData);
      onUpdate?.(newData);
    }
  };

  const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFontUpload?.(file);
      // Create a preview URL for the font
      const previewUrl = URL.createObjectURL(file);
      const newData = { ...formData, fontUrl: previewUrl };
      setFormData(newData);
      onUpdate?.(newData);
    }
  };

  // Update form data when initialData changes
  useEffect(() => {
    setFormData({
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#007bff',
      fontFamily: 'Arial, sans-serif',
      logoUrl: '',
      fontUrl: '',
      ...initialData,
    });
  }, [initialData]);

  return (
    <div data-testid="branding-configurator" className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Brand Customization
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Customize the look and feel of your directory with your brand colors, logo, and typography.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="primary-color"
                    value={formData.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    data-testid="primary-color-input"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="primary-color-text"
                    placeholder="#000000"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="secondary-color"
                    value={formData.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    data-testid="secondary-color-input"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="secondary-color-text"
                    placeholder="#ffffff"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="accent-color"
                    value={formData.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    data-testid="accent-color-input"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="accent-color-text"
                    placeholder="#007bff"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Logo</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Logo
                </label>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  data-testid="logo-upload-input"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB. Recommended size: 200x80px
                </p>
              </div>
              {formData.logoUrl && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="h-20 w-auto object-contain border border-gray-200 rounded"
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
                <label htmlFor="font-family" className="block text-sm font-medium text-gray-700 mb-2">
                  Font Family
                </label>
                <select
                  id="font-family"
                  value={formData.fontFamily}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  data-testid="font-family-select"
                  disabled={isLoading}
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
                  <label htmlFor="font-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Font File
                  </label>
                  <input
                    type="file"
                    id="font-upload"
                    accept=".woff,.woff2,.ttf,.otf"
                    onChange={handleFontUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    data-testid="font-upload-input"
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    WOFF, WOFF2, TTF, or OTF files
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => onPreview?.(formData)}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            {/* Header Section */}
            <div
              className="p-4 rounded mb-4"
              style={{
                backgroundColor: formData.primaryColor,
                color: formData.secondaryColor
              }}
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
              <nav className="mt-2 flex space-x-4 text-sm">
                <a href="#" className="hover:opacity-75">Home</a>
                <a href="#" className="hover:opacity-75">Categories</a>
                <a href="#" className="hover:opacity-75">Search</a>
                <a href="#" className="hover:opacity-75">About</a>
              </nav>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Sample Content</h2>
              <p className="text-sm opacity-75">
                This is how your directory will look with the selected branding.
                Your content will be displayed with these colors and typography.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="border border-opacity-20 rounded p-3" style={{ borderColor: formData.primaryColor }}>
                  <h3 className="font-medium text-sm">Sample Category</h3>
                  <p className="text-xs opacity-75 mt-1">15 listings</p>
                </div>
                <div className="border border-opacity-20 rounded p-3" style={{ borderColor: formData.primaryColor }}>
                  <h3 className="font-medium text-sm">Another Category</h3>
                  <p className="text-xs opacity-75 mt-1">8 listings</p>
                </div>
              </div>

              <button
                className="px-4 py-2 rounded text-white text-sm font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: formData.accentColor }}
                data-testid="preview-button-accent"
              >
                Sample Button
              </button>

              <div className="mt-4 p-3 rounded" style={{ backgroundColor: formData.accentColor + '10' }}>
                <p className="text-sm">
                  <span className="font-medium" style={{ color: formData.accentColor }}>
                    Featured Listing:
                  </span>{' '}
                  This is how highlighted content will appear in your directory.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingConfigurator;