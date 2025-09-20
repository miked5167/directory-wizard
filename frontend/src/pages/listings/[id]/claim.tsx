'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import ClaimForm, { ClaimFormData, Listing } from '../../../components/claims/ClaimForm';

export interface ClaimPageProps {
  listingId: string;
  initialListing?: Listing;
  onSubmitClaim?: (listingId: string, claimData: ClaimFormData) => Promise<{ success: boolean; claimId?: string; message?: string }>;
}

const ListingClaimPage: React.FC<ClaimPageProps> = ({
  listingId,
  initialListing,
  onSubmitClaim,
}) => {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(initialListing || null);
  const [isLoading, setIsLoading] = useState(!initialListing);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);

  // Check if user is authenticated
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    // Check for user session
    const sessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    if (sessionData) {
      try {
        setUserSession(JSON.parse(sessionData));
      } catch (err) {
        console.error('Failed to parse user session:', err);
      }
    }

    // Load listing if not provided
    if (!initialListing && listingId) {
      loadListing(listingId);
    }
  }, [listingId, initialListing]);

  const loadListing = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from the API
      // For now, use mock data based on listing ID
      const mockListing: Listing = {
        id,
        title: generateListingTitle(id),
        description: generateListingDescription(id),
        category: generateListingCategory(id),
        location: generateListingLocation(id),
      };

      setListing(mockListing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setIsLoading(false);
    }
  };

  const generateListingTitle = (id: string): string => {
    const businesses = [
      'Downtown Coffee Shop',
      'City Center Dental Clinic',
      'Metro Auto Repair',
      'Garden View Restaurant',
      'Tech Solutions LLC',
      'Sunshine Daycare Center',
      'Elite Fitness Gym',
      'Golden Nail Salon',
      'Corner Pharmacy',
      'The Book Nook',
    ];
    return businesses[parseInt(id.slice(-1)) % businesses.length] || 'Business Listing';
  };

  const generateListingDescription = (id: string): string => {
    const descriptions = [
      'A cozy neighborhood coffee shop serving artisanal coffee and fresh pastries.',
      'Full-service dental clinic providing comprehensive oral health care.',
      'Professional auto repair services with certified mechanics.',
      'Fine dining restaurant featuring seasonal ingredients and creative cuisine.',
      'Technology consulting and software development services.',
      'Licensed childcare facility with experienced and caring staff.',
      'Modern fitness center with state-of-the-art equipment and personal training.',
      'Professional nail care and beauty services in a relaxing environment.',
      'Full-service pharmacy with prescription filling and health consultations.',
      'Independent bookstore with a carefully curated selection of books.',
    ];
    return descriptions[parseInt(id.slice(-1)) % descriptions.length] || 'Professional business services';
  };

  const generateListingCategory = (id: string): string => {
    const categories = [
      'Food & Dining',
      'Healthcare',
      'Automotive',
      'Food & Dining',
      'Technology',
      'Childcare',
      'Fitness & Health',
      'Beauty & Wellness',
      'Healthcare',
      'Retail & Shopping',
    ];
    return categories[parseInt(id.slice(-1)) % categories.length] || 'Business Services';
  };

  const generateListingLocation = (id: string): string => {
    const locations = [
      'Downtown District, Metro City',
      'Medical Plaza, Central Avenue',
      'Industrial Park, West Side',
      'Historic District, Main Street',
      'Business Center, Tech Hub',
      'Family Neighborhood, Oak Street',
      'Shopping Center, North Plaza',
      'Wellness District, Spa Row',
      'Community Center, Park Avenue',
      'Arts District, Culture Corner',
    ];
    return locations[parseInt(id.slice(-1)) % locations.length] || 'Metro City';
  };

  const handleClaimSubmit = async (claimData: ClaimFormData) => {
    if (!userSession) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmitClaim) {
        const result = await onSubmitClaim(listingId, claimData);
        if (result.success) {
          setClaimId(result.claimId || `claim_${Date.now()}`);
          setSubmitSuccess(true);
        } else {
          setError(result.message || 'Failed to submit claim');
        }
      } else {
        // Mock claim submission
        const mockClaimId = `claim_${Date.now()}`;
        setClaimId(mockClaimId);
        setSubmitSuccess(true);

        // Store claim in localStorage for demo purposes
        const existingClaims = JSON.parse(localStorage.getItem('user_claims') || '[]');
        const newClaim = {
          id: mockClaimId,
          listingId,
          listingTitle: listing?.title,
          claimData,
          status: 'PENDING_VERIFICATION',
          submittedAt: new Date().toISOString(),
          userId: userSession.userId,
        };
        existingClaims.push(newClaim);
        localStorage.setItem('user_claims', JSON.stringify(existingClaims));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleViewClaim = () => {
    if (claimId) {
      router.push(`/dashboard/claims?highlight=${claimId}`);
    }
  };

  const handleBackToListing = () => {
    router.push(`/listings/${listingId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Listing Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'The listing you are trying to claim could not be found.'}
          </p>
          <button
            onClick={() => router.push('/listings')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Browse Listings
          </button>
        </div>
      </div>
    );
  }

  if (submitSuccess && claimId) {
    return (
      <div data-testid="claim-success-page" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Claim Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your claim for <strong>{listing?.title}</strong> has been submitted and is now under review.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-blue-800">
                <p><strong>Claim ID:</strong> {claimId}</p>
                <p className="mt-1">
                  You will receive an email confirmation shortly with next steps for verification.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleViewClaim}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                data-testid="view-claim-button"
              >
                View Claim Status
              </button>
              <button
                onClick={handleBackToListing}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                data-testid="back-to-listing-button"
              >
                Back to Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div data-testid="listing-claim-page" className="min-h-screen bg-gray-50 py-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            data-testid="back-button"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Claim Business Listing
            </h1>
            <p className="text-gray-600">
              Submit a claim to become the verified owner of this business listing
            </p>
          </div>
        </div>
      </div>

      {/* Authentication Check */}
      {!userSession && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Account Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You need to be signed in to submit a business claim.{' '}
                    <button
                      onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`)}
                      className="font-medium underline hover:text-yellow-600"
                    >
                      Sign in here
                    </button>{' '}
                    or{' '}
                    <button
                      onClick={() => router.push(`/auth/register?redirect=${encodeURIComponent(router.asPath)}`)}
                      className="font-medium underline hover:text-yellow-600"
                    >
                      create an account
                    </button>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
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

      {/* Claim Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ClaimForm
          listing={listing}
          onSubmit={handleClaimSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />

        {/* Additional Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What Happens Next?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-semibold text-blue-600">1</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Verification</h4>
              <p className="text-sm text-gray-600">
                We'll verify your claim using the method you selected (email, phone, or documents).
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-semibold text-blue-600">2</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Review</h4>
              <p className="text-sm text-gray-600">
                Our team will review your claim and supporting evidence within 2-3 business days.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-semibold text-blue-600">3</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Approval</h4>
              <p className="text-sm text-gray-600">
                Once approved, you'll gain access to manage and update your business listing.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 text-sm">
                How long does the verification process take?
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Most claims are processed within 2-3 business days. Complex cases may take up to 5 business days.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">
                What if I don't have access to the business email or phone?
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                You can use the document upload method to provide business registration, tax documents, or other official proof of ownership.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">
                Can I claim multiple business locations?
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Yes, you can submit separate claims for each business location. Each location requires its own verification process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  return {
    props: {
      listingId: id,
    },
  };
};

export default ListingClaimPage;