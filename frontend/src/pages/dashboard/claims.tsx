'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import UserDashboard from '../../components/claims/UserDashboard';

export interface UserSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  businessRole?: string;
  createdAt: string;
  loggedInAt?: string;
}

export interface ClaimRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  claimData: {
    claimMethod: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'DOCUMENT_UPLOAD';
    email?: string;
    phoneNumber?: string;
    businessName?: string;
    contactPerson?: string;
    relationship?: string;
    additionalInfo?: string;
  };
  status: 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reviewerNotes?: string;
  userId: string;
}

export interface ClaimsDashboardProps {
  onUpdateProfile?: (profileData: any) => Promise<{ success: boolean; message?: string }>;
  onDeleteClaim?: (claimId: string) => Promise<{ success: boolean; message?: string }>;
  onResubmitClaim?: (claimId: string, newData: any) => Promise<{ success: boolean; message?: string }>;
}

const UserClaimsDashboard: React.FC<ClaimsDashboardProps> = ({
  onUpdateProfile,
  onDeleteClaim,
  onResubmitClaim,
}) => {
  const router = useRouter();
  const { highlight } = router.query;

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication and load data
  useEffect(() => {
    checkAuthentication();
    loadUserClaims();
  }, []);

  const checkAuthentication = () => {
    const sessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    if (!sessionData) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      setUserSession(session);
    } catch (err) {
      console.error('Failed to parse user session:', err);
      router.push('/auth/login');
    }
  };

  const loadUserClaims = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from the API
      // For now, load from localStorage
      const claimsData = localStorage.getItem('user_claims');
      if (claimsData) {
        const parsedClaims = JSON.parse(claimsData);

        // Add some mock variety to claim statuses for demo
        const claimsWithVariedStatus = parsedClaims.map((claim: ClaimRecord, index: number) => {
          const statuses = ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
          const randomStatus = statuses[index % statuses.length];

          const now = new Date();
          const submittedDate = new Date(claim.submittedAt);

          // Add realistic review dates based on status
          let updatedClaim = { ...claim, status: randomStatus };

          if (randomStatus === 'UNDER_REVIEW' || randomStatus === 'APPROVED' || randomStatus === 'REJECTED') {
            updatedClaim.reviewedAt = new Date(submittedDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
          }

          if (randomStatus === 'APPROVED') {
            updatedClaim.approvedAt = new Date(submittedDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
            updatedClaim.reviewerNotes = 'Claim approved. Business ownership verified successfully.';
          } else if (randomStatus === 'REJECTED') {
            updatedClaim.rejectedAt = new Date(submittedDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
            updatedClaim.reviewerNotes = 'Additional documentation required to verify business ownership. Please provide business registration or tax documents.';
          } else if (randomStatus === 'UNDER_REVIEW') {
            updatedClaim.reviewerNotes = 'Claim is currently being reviewed by our verification team.';
          }

          return updatedClaim;
        });

        setClaims(claimsWithVariedStatus);
      } else {
        setClaims([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (profileData: any) => {
    if (onUpdateProfile) {
      return await onUpdateProfile(profileData);
    } else {
      // Mock profile update
      const updatedSession = {
        ...userSession,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };

      // Update session storage
      const storageKey = localStorage.getItem('user_session') ? 'user_session' : 'user_session';
      const storageMethod = localStorage.getItem('user_session') ? localStorage : sessionStorage;
      storageMethod.setItem(storageKey, JSON.stringify(updatedSession));

      setUserSession(updatedSession);
      return { success: true, message: 'Profile updated successfully' };
    }
  };

  const handleClaimDelete = async (claimId: string) => {
    if (onDeleteClaim) {
      const result = await onDeleteClaim(claimId);
      if (result.success) {
        setClaims(prev => prev.filter(claim => claim.id !== claimId));
      }
      return result;
    } else {
      // Mock claim deletion
      setClaims(prev => prev.filter(claim => claim.id !== claimId));

      // Update localStorage
      const updatedClaims = claims.filter(claim => claim.id !== claimId);
      localStorage.setItem('user_claims', JSON.stringify(updatedClaims));

      return { success: true, message: 'Claim deleted successfully' };
    }
  };

  const handleClaimResubmit = async (claimId: string, newData: any) => {
    if (onResubmitClaim) {
      const result = await onResubmitClaim(claimId, newData);
      if (result.success) {
        loadUserClaims(); // Reload claims
      }
      return result;
    } else {
      // Mock claim resubmission
      setClaims(prev => prev.map(claim =>
        claim.id === claimId
          ? {
              ...claim,
              claimData: { ...claim.claimData, ...newData },
              status: 'PENDING_VERIFICATION' as const,
              submittedAt: new Date().toISOString(),
              reviewedAt: undefined,
              approvedAt: undefined,
              rejectedAt: undefined,
              reviewerNotes: undefined,
            }
          : claim
      ));

      return { success: true, message: 'Claim resubmitted successfully' };
    }
  };

  const handleNewClaimClick = () => {
    router.push('/listings'); // Redirect to listings page to find a business to claim
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access your dashboard.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="user-claims-dashboard" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {userSession.firstName}!
                </h1>
                <p className="mt-1 text-gray-600">
                  Manage your business listings and claims
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleNewClaimClick}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  data-testid="new-claim-button"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Claim
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('user_session');
                    sessionStorage.removeItem('user_session');
                    router.push('/auth/login');
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid="logout-button"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserDashboard
          user={{
            id: userSession.userId,
            firstName: userSession.firstName,
            lastName: userSession.lastName,
            email: userSession.email,
            businessName: userSession.businessName,
            businessRole: userSession.businessRole,
            joinedAt: userSession.createdAt,
          }}
          claims={claims}
          highlightClaimId={highlight as string}
          onUpdateProfile={handleProfileUpdate}
          onDeleteClaim={handleClaimDelete}
          onResubmitClaim={handleClaimResubmit}
        />
      </div>

      {/* No Claims State */}
      {claims.length === 0 && !isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="text-center py-12" data-testid="no-claims-state">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Business Claims Yet
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Start claiming and managing your business listings to improve your online presence and connect with customers.
            </p>
            <button
              onClick={handleNewClaimClick}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Your Business
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Need Help?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">FAQ</h4>
                <p className="text-sm text-gray-600">
                  Find answers to common questions about claiming and managing business listings.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 1.26a2 2 0 001.11 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Contact Support</h4>
                <p className="text-sm text-gray-600">
                  Get personalized help from our support team via email or live chat.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">User Guide</h4>
                <p className="text-sm text-gray-600">
                  Step-by-step instructions for claiming and optimizing your business listing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserClaimsDashboard;