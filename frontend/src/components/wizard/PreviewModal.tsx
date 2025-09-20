'use client';

import React, { useEffect } from 'react';

export interface PreviewData {
  tenantId: string;
  name: string;
  domain: string;
  status: string;
  previewUrl: string;
  adminUrl: string;
  statistics: {
    categoriesCount: number;
    listingsCount: number;
    mediaFilesCount: number;
    totalPages: number;
  };
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontUrl?: string;
  };
  siteStructure: {
    pages: Array<{
      path: string;
      title: string;
      type: 'home' | 'category' | 'listing' | 'search' | 'about';
    }>;
    navigation: Array<{
      label: string;
      path: string;
      children?: Array<{ label: string; path: string }>;
    }>;
  };
}

export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: PreviewData;
  isLoading?: boolean;
  onPublish?: () => void;
  onRegeneratePreview?: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  previewData,
  isLoading = false,
  onPublish,
  onRegeneratePreview,
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="preview-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900" data-testid="modal-title">
              Directory Preview
            </h2>
            {previewData && (
              <p className="text-sm text-gray-500 mt-1">
                {previewData.name} • {previewData.domain}.example.com
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            data-testid="close-button"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-96" data-testid="loading-state">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Generating preview...</p>
              </div>
            </div>
          ) : previewData ? (
            <div className="h-full flex">
              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Statistics Bar */}
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="statistics">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.statistics.categoriesCount}
                      </div>
                      <div className="text-sm text-gray-500">Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.statistics.listingsCount}
                      </div>
                      <div className="text-sm text-gray-500">Listings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {previewData.statistics.mediaFilesCount}
                      </div>
                      <div className="text-sm text-gray-500">Media Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {previewData.statistics.totalPages}
                      </div>
                      <div className="text-sm text-gray-500">Total Pages</div>
                    </div>
                  </div>
                </div>

                {/* Site Preview */}
                <div className="p-6">
                  <div
                    className="border rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: previewData.branding.secondaryColor,
                      fontFamily: previewData.branding.fontFamily,
                    }}
                    data-testid="site-preview"
                  >
                    {/* Header */}
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: previewData.branding.primaryColor,
                        color: previewData.branding.secondaryColor,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {previewData.branding.logoUrl && (
                            <img
                              src={previewData.branding.logoUrl}
                              alt="Logo"
                              className="h-8 w-auto"
                              data-testid="preview-logo"
                            />
                          )}
                          <h1 className="text-xl font-bold">{previewData.name}</h1>
                        </div>
                        <nav className="hidden md:flex space-x-4 text-sm">
                          {previewData.siteStructure.navigation.map((item, index) => (
                            <a
                              key={index}
                              href="#"
                              className="hover:opacity-75 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              {item.label}
                            </a>
                          ))}
                        </nav>
                      </div>
                    </div>

                    {/* Hero Section */}
                    <div
                      className="p-6 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${previewData.branding.accentColor}, ${previewData.branding.primaryColor})`,
                        color: previewData.branding.secondaryColor,
                      }}
                    >
                      <h2 className="text-2xl font-bold mb-2">
                        Welcome to {previewData.name}
                      </h2>
                      <p className="opacity-90">
                        Discover amazing listings in our directory
                      </p>
                    </div>

                    {/* Content Grid */}
                    <div className="p-6" style={{ color: previewData.branding.primaryColor }}>
                      <h3 className="text-lg font-semibold mb-4">Featured Categories</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: Math.min(6, previewData.statistics.categoriesCount) }).map((_, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                            style={{ borderColor: previewData.branding.primaryColor + '20' }}
                          >
                            <h4 className="font-medium">Sample Category {index + 1}</h4>
                            <p className="text-sm opacity-75 mt-1">
                              {Math.floor(Math.random() * 20) + 1} listings
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 text-center">
                        <button
                          className="px-6 py-2 rounded text-white font-medium transition-colors hover:opacity-90"
                          style={{ backgroundColor: previewData.branding.accentColor }}
                          onClick={(e) => e.preventDefault()}
                        >
                          Browse All Categories
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-80 border-l border-gray-200 bg-gray-50 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Site Structure</h3>

                <div className="space-y-4" data-testid="site-structure">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pages</h4>
                    <ul className="space-y-1 text-sm">
                      {previewData.siteStructure.pages.slice(0, 10).map((page, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                          <span className="text-gray-600">{page.title}</span>
                          <span className="text-xs text-gray-400">({page.type})</span>
                        </li>
                      ))}
                      {previewData.siteStructure.pages.length > 10 && (
                        <li className="text-xs text-gray-400">
                          +{previewData.siteStructure.pages.length - 10} more pages
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Branding</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: previewData.branding.primaryColor }}
                        ></div>
                        <span className="text-sm text-gray-600">Primary</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: previewData.branding.accentColor }}
                        ></div>
                        <span className="text-sm text-gray-600">Accent</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Font: {previewData.branding.fontFamily.split(',')[0]}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      previewData.status === 'PREVIEW'
                        ? 'bg-yellow-100 text-yellow-800'
                        : previewData.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {previewData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96" data-testid="no-data-state">
              <div className="text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Available</h3>
                <p className="text-gray-500">Generate a preview to see how your directory will look.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              {previewData && (
                <>
                  <a
                    href={previewData.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    data-testid="view-full-preview"
                  >
                    View Full Preview →
                  </a>
                  <button
                    onClick={onRegeneratePreview}
                    className="text-gray-600 hover:text-gray-500 text-sm font-medium"
                    data-testid="regenerate-preview"
                  >
                    Regenerate Preview
                  </button>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              {previewData && (
                <button
                  onClick={onPublish}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  data-testid="publish-button"
                >
                  Publish Site
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;