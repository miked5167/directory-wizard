'use client';

import React, { useState } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface ClaimSummary {
  id: string;
  listingId: string;
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
  verificationCount: number;
}

export interface ClaimStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  verified: number;
  expired: number;
}

export interface UserDashboardProps {
  user: UserProfile;
  claims: ClaimSummary[];
  stats: ClaimStats;
  onViewClaim?: (claimId: string) => void;
  onSubmitNewClaim?: () => void;
  onUpdateProfile?: () => void;
  isLoading?: boolean;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  claims,
  stats,
  onViewClaim,
  onSubmitNewClaim,
  onUpdateProfile,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'claims' | 'profile'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusColor = (status: ClaimSummary['status']): string => {
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredClaims = statusFilter === 'all'
    ? claims
    : claims.filter(claim => claim.status.toLowerCase() === statusFilter);

  const getStatPercentage = (count: number): number => {
    return stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
  };

  return (
    <div data-testid="user-dashboard" className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your business listing claims and profile
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {!user.emailVerified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-800">
                    Email not verified
                  </p>
                </div>
              )}
              <div className="text-right text-sm text-gray-500">
                <p>Member since</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8" data-testid="dashboard-tabs">
            {(['overview', 'claims', 'profile'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cards">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Claims</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.verified}
                      <span className="text-sm text-gray-500 ml-2">
                        ({getStatPercentage(stats.verified)}%)
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pending}
                      <span className="text-sm text-gray-500 ml-2">
                        ({getStatPercentage(stats.pending)}%)
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.rejected}
                      <span className="text-sm text-gray-500 ml-2">
                        ({getStatPercentage(stats.rejected)}%)
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Claims */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Recent Claims</h2>
                {onSubmitNewClaim && (
                  <button
                    onClick={onSubmitNewClaim}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    data-testid="new-claim-button"
                  >
                    Submit New Claim
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {claims.length > 0 ? (
                <div className="space-y-4" data-testid="recent-claims">
                  {claims.slice(0, 5).map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{claim.listing.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {claim.listing.tenant.name} • Submitted {formatDate(claim.submittedAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                        {onViewClaim && (
                          <button
                            onClick={() => onViewClaim(claim.id)}
                            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Yet</h3>
                  <p className="text-gray-600 mb-4">You haven't submitted any business listing claims.</p>
                  {onSubmitNewClaim && (
                    <button
                      onClick={onSubmitNewClaim}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Submit Your First Claim
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">All Claims</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  data-testid="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
                {onSubmitNewClaim && (
                  <button
                    onClick={onSubmitNewClaim}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Submit New Claim
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredClaims.length > 0 ? (
              <div className="space-y-4" data-testid="all-claims">
                {filteredClaims.map((claim) => (
                  <div key={claim.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{claim.listing.title}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Directory: {claim.listing.tenant.name}</p>
                          {claim.listing.category && <p>Category: {claim.listing.category.name}</p>}
                          <p>Method: {claim.claimMethod.replace('_', ' ')}</p>
                          <p>Submitted: {formatDate(claim.submittedAt)}</p>
                          {claim.reviewedAt && <p>Reviewed: {formatDate(claim.reviewedAt)}</p>}
                          {claim.verificationCount > 0 && (
                            <p>Evidence: {claim.verificationCount} document(s) uploaded</p>
                          )}
                        </div>
                        {claim.reviewerNotes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <strong>Notes:</strong> {claim.reviewerNotes}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {onViewClaim && (
                          <button
                            onClick={() => onViewClaim(claim.id)}
                            className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {statusFilter === 'all' ? 'No claims found.' : `No ${statusFilter} claims found.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
              {onUpdateProfile && (
                <button
                  onClick={onUpdateProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  data-testid="update-profile-button"
                >
                  Update Profile
                </button>
              )}
            </div>
          </div>

          <div className="p-6" data-testid="profile-info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Personal Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">First Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{user.firstName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Last Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{user.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email Address</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {user.email}
                      {user.emailVerified ? (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unverified
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Member Since</dt>
                    <dd className="text-sm font-medium text-gray-900">{formatDate(user.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email Verification</p>
                      <p className="text-xs text-gray-500">Verify your email to submit claims</p>
                    </div>
                    <div>
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <button className="text-blue-600 hover:text-blue-500 text-xs font-medium">
                          Verify Now
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Claim Submissions</p>
                      <p className="text-xs text-gray-500">Submit business listing claims</p>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-700">Loading...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;