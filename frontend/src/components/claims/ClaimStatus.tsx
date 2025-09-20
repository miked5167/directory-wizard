'use client';

import React from 'react';

export interface ClaimVerification {
  id: string;
  verificationType: string;
  evidenceUrl: string;
  verified: boolean;
  verifiedAt?: string;
  submittedAt: string;
}

export interface ClaimData {
  id: string;
  listingId: string;
  userId: string;
  claimMethod: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFIED' | 'EXPIRED';
  submittedAt: string;
  reviewedAt?: string;
  expiresAt: string;
  reviewerNotes?: string;
  listing: {
    id: string;
    title: string;
    description?: string;
    tenant: {
      id: string;
      name: string;
      domain: string;
    };
    category?: {
      id: string;
      name: string;
    };
  };
  verifications: ClaimVerification[];
}

export interface ClaimStatusProps {
  claim: ClaimData;
  onUploadEvidence?: () => void;
  onContactSupport?: () => void;
  onUpdateListing?: () => void;
  showActions?: boolean;
}

const ClaimStatus: React.FC<ClaimStatusProps> = ({
  claim,
  onUploadEvidence,
  onContactSupport,
  onUpdateListing,
  showActions = true,
}) => {
  const getStatusColor = (status: ClaimData['status']): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ClaimData['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'APPROVED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'VERIFIED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'REJECTED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'EXPIRED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = (status: ClaimData['status']): string => {
    switch (status) {
      case 'PENDING':
        return 'Your claim is being reviewed. We\'ll notify you once we have an update.';
      case 'APPROVED':
        return 'Your claim has been approved! You can now manage this listing.';
      case 'VERIFIED':
        return 'Your claim has been fully verified. You have complete access to manage this listing.';
      case 'REJECTED':
        return 'Your claim was not approved. Please see the reviewer notes below for more information.';
      case 'EXPIRED':
        return 'This claim has expired. You can submit a new claim if you still wish to manage this listing.';
      default:
        return 'Status unknown.';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
      return 'Less than 1 hour remaining';
    }
  };

  const canUploadEvidence = claim.status === 'PENDING' && new Date(claim.expiresAt) > new Date();
  const canUpdateListing = claim.status === 'VERIFIED' || claim.status === 'APPROVED';

  return (
    <div data-testid="claim-status" className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Claim Status
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Track the progress of your business listing claim
              </p>
            </div>
            <div className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor(claim.status)}`}>
              {getStatusIcon(claim.status)}
              <span className="ml-2" data-testid="status-badge">
                {claim.status}
              </span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`px-6 py-4 ${
          claim.status === 'REJECTED' ? 'bg-red-50' :
          claim.status === 'EXPIRED' ? 'bg-gray-50' :
          claim.status === 'VERIFIED' ? 'bg-green-50' :
          'bg-blue-50'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(claim.status)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" data-testid="status-message">
                {getStatusMessage(claim.status)}
              </p>
              {claim.status === 'PENDING' && (
                <p className="text-xs mt-1 opacity-75">
                  {getTimeRemaining(claim.expiresAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Claim Details */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Claim Details</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Listing Information */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Business Listing</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium text-gray-900" data-testid="listing-title">
                    {claim.listing.title}
                  </h5>
                  {claim.listing.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {claim.listing.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {claim.listing.category && (
                      <span>Category: {claim.listing.category.name}</span>
                    )}
                    <span>Directory: {claim.listing.tenant.name}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Claim Information</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Claim ID:</dt>
                    <dd className="font-mono text-gray-900" data-testid="claim-id">{claim.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Method:</dt>
                    <dd className="text-gray-900">{claim.claimMethod.replace('_', ' ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Submitted:</dt>
                    <dd className="text-gray-900">{formatDate(claim.submittedAt)}</dd>
                  </div>
                  {claim.reviewedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Reviewed:</dt>
                      <dd className="text-gray-900">{formatDate(claim.reviewedAt)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expires:</dt>
                    <dd className="text-gray-900">{formatDate(claim.expiresAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Verification Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Verification Evidence ({claim.verifications.length})
              </h4>
              {claim.verifications.length > 0 ? (
                <div className="space-y-3" data-testid="verifications-list">
                  {claim.verifications.map((verification) => (
                    <div key={verification.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {verification.verificationType.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Submitted {formatDate(verification.submittedAt)}
                          </p>
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          verification.verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {verification.verified ? 'Verified' : 'Pending'}
                        </div>
                      </div>
                      {verification.verifiedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Verified {formatDate(verification.verifiedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">No verification evidence uploaded yet</p>
                  {canUploadEvidence && (
                    <p className="text-xs text-gray-400 mt-1">
                      Upload documents to speed up the verification process
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviewer Notes */}
        {claim.reviewerNotes && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Reviewer Notes</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-800" data-testid="reviewer-notes">
                {claim.reviewerNotes}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex flex-wrap gap-3">
              {canUploadEvidence && onUploadEvidence && (
                <button
                  onClick={onUploadEvidence}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  data-testid="upload-evidence-button"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Evidence
                </button>
              )}

              {canUpdateListing && onUpdateListing && (
                <button
                  onClick={onUpdateListing}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  data-testid="update-listing-button"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Listing
                </button>
              )}

              {onContactSupport && (
                <button
                  onClick={onContactSupport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  data-testid="contact-support-button"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Contact Support
                </button>
              )}

              <a
                href={`/listings/${claim.listing.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                data-testid="view-listing-link"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Listing
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimStatus;