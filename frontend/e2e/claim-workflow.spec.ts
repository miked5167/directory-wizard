import { test, expect, Page } from '@playwright/test';

// Test data for claims
const testData = {
  user: {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@business.com',
    password: 'TestPassword123!',
    businessName: 'Smith Auto Repair',
    businessRole: 'owner',
  },
  listing: {
    id: 'listing_123',
    title: 'Metro Auto Repair',
    description: 'Professional auto repair services with certified mechanics.',
    category: 'Automotive',
    location: 'Industrial Park, West Side',
  },
  claimData: {
    emailVerification: {
      email: 'contact@metroautorepair.com',
      contactPerson: 'John Smith',
      relationship: 'owner',
      additionalInfo: 'I am the owner of Metro Auto Repair and need to update our business information.',
    },
    phoneVerification: {
      phoneNumber: '+1 (555) 123-0102',
      contactPerson: 'John Smith',
      relationship: 'owner',
    },
    documentUpload: {
      businessName: 'Metro Auto Repair LLC',
      contactPerson: 'John Smith',
      relationship: 'owner',
      additionalInfo: 'I have business registration and tax documents available for verification.',
    },
  },
};

// Helper functions
async function registerAndLoginUser(page: Page) {
  // Navigate to registration
  await page.goto('/auth/register');
  await expect(page.getByText('Create Account')).toBeVisible();

  // Fill registration form
  await page.getByTestId('first-name-input').fill(testData.user.firstName);
  await page.getByTestId('last-name-input').fill(testData.user.lastName);
  await page.getByTestId('email-input').fill(testData.user.email);
  await page.getByTestId('password-input').fill(testData.user.password);
  await page.getByTestId('confirm-password-input').fill(testData.user.password);

  // Optional business fields
  if (await page.getByTestId('business-name-input').isVisible()) {
    await page.getByTestId('business-name-input').fill(testData.user.businessName);
    await page.getByTestId('business-role-select').selectOption(testData.user.businessRole);
  }

  // Submit registration
  await page.getByTestId('register-button').click();

  // Handle email verification (mock)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/verify-email')) {
    // Mock email verification by navigating to login
    await page.goto('/auth/login');
  }

  // Login if not already logged in
  if (!currentUrl.includes('/dashboard')) {
    await page.goto('/auth/login');
    await page.getByTestId('email-input').fill(testData.user.email);
    await page.getByTestId('password-input').fill(testData.user.password);
    await page.getByTestId('login-button').click();
  }

  // Wait for successful login
  await expect(page.getByText(`Welcome back, ${testData.user.firstName}`)).toBeVisible();
}

async function navigateToClaimForm(page: Page, listingId: string = testData.listing.id) {
  await page.goto(`/listings/${listingId}/claim`);
  await expect(page.getByTestId('listing-claim-page')).toBeVisible();
}

async function fillClaimForm(page: Page, method: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'DOCUMENT_UPLOAD') {
  // Select verification method
  await page.getByTestId(`method-${method.toLowerCase()}`).click();

  const claimData = testData.claimData[method.toLowerCase() as keyof typeof testData.claimData];

  // Fill method-specific fields
  switch (method) {
    case 'EMAIL_VERIFICATION':
      await page.getByTestId('email-input').fill(claimData.email);
      break;
    case 'PHONE_VERIFICATION':
      await page.getByTestId('phone-input').fill(claimData.phoneNumber);
      break;
    case 'DOCUMENT_UPLOAD':
      await page.getByTestId('business-name-input').fill(claimData.businessName);
      break;
  }

  // Fill common fields
  await page.getByTestId('contact-person-input').fill(claimData.contactPerson);
  await page.getByTestId('relationship-select').selectOption(claimData.relationship);

  if (claimData.additionalInfo) {
    await page.getByTestId('additional-info-textarea').fill(claimData.additionalInfo);
  }
}

async function submitClaim(page: Page) {
  await page.getByTestId('submit-button').click();

  // Wait for success page
  await expect(page.getByTestId('claim-success-page')).toBeVisible();
  await expect(page.getByText('Claim Submitted Successfully!')).toBeVisible();

  // Extract claim ID for later reference
  const claimIdElement = await page.locator('[data-testid="claim-success-page"] p:has-text("Claim ID:")');
  const claimIdText = await claimIdElement.textContent();
  const claimId = claimIdText?.match(/claim_\d+/)?.[0];

  return claimId;
}

async function uploadVerificationDocument(page: Page) {
  // Create test document content
  const documentContent = `
Business Registration Document
Metro Auto Repair LLC
Registration Number: BR123456789
Owner: John Smith
Date of Registration: January 15, 2020
Address: 123 Industrial Park, West Side
  `.trim();

  // Upload document
  const fileInput = page.getByTestId('document-upload-input');
  await fileInput.setInputFiles({
    name: 'business_registration.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(documentContent),
  });

  // Wait for upload confirmation
  await expect(page.getByText('Document uploaded successfully')).toBeVisible();
}

test.describe('Claim Workflow Complete E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should complete the entire claim workflow with email verification', async ({ page }) => {
    let claimId: string | undefined;

    await test.step('User Registration and Login', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Navigate to Listing and Start Claim', async () => {
      await navigateToClaimForm(page);

      // Verify listing information is displayed
      await expect(page.getByTestId('listing-title')).toContainText(testData.listing.title);
    });

    await test.step('Fill and Submit Claim Form (Email Verification)', async () => {
      await fillClaimForm(page, 'EMAIL_VERIFICATION');
      claimId = await submitClaim(page);

      expect(claimId).toBeTruthy();
    });

    await test.step('Navigate to Claims Dashboard', async () => {
      await page.getByTestId('view-claim-button').click();
      await expect(page.getByTestId('user-claims-dashboard')).toBeVisible();

      // Verify claim appears in dashboard
      if (claimId) {
        await expect(page.getByText(claimId)).toBeVisible();
      }
    });

    await test.step('View Claim Details and Status', async () => {
      // Click on the claim to view details
      await page.getByTestId('view-claim-details-button').first().click();
      await expect(page.getByTestId('claim-status')).toBeVisible();

      // Verify claim details
      await expect(page.getByTestId('status-badge')).toContainText('PENDING_VERIFICATION');
      await expect(page.getByTestId('listing-title')).toContainText(testData.listing.title);
      if (claimId) {
        await expect(page.getByTestId('claim-id')).toContainText(claimId);
      }
    });

    await test.step('Upload Additional Evidence', async () => {
      // Upload verification document
      if (await page.getByTestId('upload-evidence-button').isVisible()) {
        await page.getByTestId('upload-evidence-button').click();
        await uploadVerificationDocument(page);

        // Verify document appears in verifications list
        await expect(page.getByTestId('verifications-list')).toBeVisible();
      }
    });
  });

  test('should handle phone verification claim method', async ({ page }) => {
    await test.step('User Registration and Login', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Submit Phone Verification Claim', async () => {
      await navigateToClaimForm(page);
      await fillClaimForm(page, 'PHONE_VERIFICATION');

      // Verify phone-specific UI elements
      await expect(page.getByText('We\'ll call or text this number for verification')).toBeVisible();

      const claimId = await submitClaim(page);
      expect(claimId).toBeTruthy();
    });
  });

  test('should handle document upload claim method', async ({ page }) => {
    await test.step('User Registration and Login', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Submit Document Upload Claim', async () => {
      await navigateToClaimForm(page);
      await fillClaimForm(page, 'DOCUMENT_UPLOAD');

      // Verify document upload specific UI elements
      await expect(page.getByText('Enter the exact name as it appears on official documents')).toBeVisible();

      const claimId = await submitClaim(page);
      expect(claimId).toBeTruthy();
    });
  });

  test('should handle claim validation errors', async ({ page }) => {
    await test.step('User Registration and Login', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Test Required Field Validations', async () => {
      await navigateToClaimForm(page);

      // Try to submit without filling required fields
      await page.getByTestId('submit-button').click();

      // Verify validation errors appear
      await expect(page.getByTestId('contact-person-error')).toBeVisible();
      await expect(page.getByTestId('relationship-error')).toBeVisible();
    });

    await test.step('Test Email Format Validation', async () => {
      await page.getByTestId('method-email_verification').click();
      await page.getByTestId('email-input').fill('invalid-email');
      await page.getByTestId('submit-button').click();

      // Verify email format error
      await expect(page.getByTestId('email-error')).toContainText('valid email address');
    });

    await test.step('Test Phone Format Validation', async () => {
      await page.getByTestId('method-phone_verification').click();
      await page.getByTestId('phone-input').fill('invalid-phone');
      await page.getByTestId('submit-button').click();

      // Verify phone format error
      await expect(page.getByTestId('phone-error')).toContainText('valid phone number');
    });
  });

  test('should handle unauthenticated claim submission', async ({ page }) => {
    await test.step('Navigate to Claim Form Without Login', async () => {
      await navigateToClaimForm(page);

      // Verify authentication warning is shown
      await expect(page.getByText('Account Required')).toBeVisible();
      await expect(page.getByText('You need to be signed in to submit a business claim')).toBeVisible();
    });

    await test.step('Login via Claim Page', async () => {
      // Click login link from claim page
      await page.getByText('Sign in here').click();

      // Verify redirect to login with return URL
      expect(page.url()).toContain('/auth/login');
      expect(page.url()).toContain('redirect=');
    });
  });

  test('should handle claims dashboard functionality', async ({ page }) => {
    let claimId: string | undefined;

    await test.step('Setup: Create Claims', async () => {
      await registerAndLoginUser(page);

      // Create multiple claims for testing
      await navigateToClaimForm(page);
      await fillClaimForm(page, 'EMAIL_VERIFICATION');
      claimId = await submitClaim(page);
    });

    await test.step('Navigate to Claims Dashboard', async () => {
      await page.goto('/dashboard/claims');
      await expect(page.getByTestId('user-claims-dashboard')).toBeVisible();
    });

    await test.step('Test Dashboard Tabs', async () => {
      // Test overview tab
      await page.getByTestId('tab-overview').click();
      await expect(page.getByTestId('stats-cards')).toBeVisible();
      await expect(page.getByTestId('recent-claims')).toBeVisible();

      // Test claims tab
      await page.getByTestId('tab-claims').click();
      await expect(page.getByTestId('all-claims')).toBeVisible();
      await expect(page.getByTestId('status-filter')).toBeVisible();

      // Test profile tab
      await page.getByTestId('tab-profile').click();
      await expect(page.getByTestId('profile-info')).toBeVisible();
    });

    await test.step('Test Status Filtering', async () => {
      await page.getByTestId('tab-claims').click();

      // Test different status filters
      await page.getByTestId('status-filter').selectOption('pending');
      await page.getByTestId('status-filter').selectOption('approved');
      await page.getByTestId('status-filter').selectOption('all');
    });

    await test.step('Test New Claim Button', async () => {
      await page.getByTestId('new-claim-button').click();

      // Verify navigation to listings page
      expect(page.url()).toContain('/listings');
    });
  });

  test('should simulate complete claim lifecycle', async ({ page }) => {
    let claimId: string | undefined;

    await test.step('Submit Initial Claim', async () => {
      await registerAndLoginUser(page);
      await navigateToClaimForm(page);
      await fillClaimForm(page, 'EMAIL_VERIFICATION');
      claimId = await submitClaim(page);
    });

    await test.step('View Pending Status', async () => {
      await page.getByTestId('view-claim-button').click();
      await page.getByTestId('view-claim-details-button').first().click();

      await expect(page.getByTestId('status-badge')).toContainText('PENDING_VERIFICATION');
      await expect(page.getByTestId('status-message')).toContainText('Your claim is being reviewed');
    });

    await test.step('Simulate Status Changes', async () => {
      // Mock different claim statuses by manipulating localStorage
      await page.evaluate((claimId) => {
        const claims = JSON.parse(localStorage.getItem('user_claims') || '[]');
        if (claims.length > 0) {
          // Update status to APPROVED
          claims[0].status = 'APPROVED';
          claims[0].reviewedAt = new Date().toISOString();
          claims[0].reviewerNotes = 'Claim approved. Business ownership verified successfully.';
          localStorage.setItem('user_claims', JSON.stringify(claims));
        }
      }, claimId);

      // Refresh page to see updated status
      await page.reload();
      await expect(page.getByTestId('status-badge')).toContainText('APPROVED');
      await expect(page.getByTestId('reviewer-notes')).toContainText('Claim approved');
    });

    await test.step('Test Approved Claim Actions', async () => {
      // Verify update listing button is available for approved claims
      await expect(page.getByTestId('update-listing-button')).toBeVisible();

      // Test contact support button
      await expect(page.getByTestId('contact-support-button')).toBeVisible();

      // Test view listing link
      await expect(page.getByTestId('view-listing-link')).toBeVisible();
    });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await test.step('Setup User', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Mock Network Failure', async () => {
      // Mock network failure for claim submission
      await page.route('**/api/claims', route => {
        route.abort('failed');
      });

      await navigateToClaimForm(page);
      await fillClaimForm(page, 'EMAIL_VERIFICATION');

      // Attempt to submit claim
      await page.getByTestId('submit-button').click();

      // Verify error handling
      await expect(page.getByTestId('error-message')).toBeVisible();
    });
  });

  test('should support mobile claim workflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step('Mobile Registration and Login', async () => {
      await registerAndLoginUser(page);
    });

    await test.step('Mobile Claim Form', async () => {
      await navigateToClaimForm(page);

      // Verify mobile-friendly layout
      await expect(page.getByTestId('claim-form')).toBeVisible();

      // Test mobile form interaction
      await page.getByTestId('method-email_verification').scrollIntoViewIfNeeded();
      await page.getByTestId('method-email_verification').click();

      await page.getByTestId('email-input').scrollIntoViewIfNeeded();
      await page.getByTestId('email-input').fill(testData.claimData.emailVerification.email);

      await fillClaimForm(page, 'EMAIL_VERIFICATION');
      const claimId = await submitClaim(page);
      expect(claimId).toBeTruthy();
    });

    await test.step('Mobile Dashboard', async () => {
      await page.getByTestId('view-claim-button').click();

      // Verify mobile dashboard layout
      await expect(page.getByTestId('user-claims-dashboard')).toBeVisible();
      await expect(page.getByTestId('dashboard-tabs')).toBeVisible();
    });
  });

  test('should handle concurrent claim sessions', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await test.step('Concurrent Claim Submissions', async () => {
      // User 1: Submit email verification claim
      await registerAndLoginUser(page1);
      await navigateToClaimForm(page1);
      await fillClaimForm(page1, 'EMAIL_VERIFICATION');

      // User 2: Submit phone verification claim (different user data)
      await page2.goto('/auth/register');
      await page2.getByTestId('first-name-input').fill('Jane');
      await page2.getByTestId('last-name-input').fill('Doe');
      await page2.getByTestId('email-input').fill('jane.doe@business.com');
      await page2.getByTestId('password-input').fill('TestPassword123!');
      await page2.getByTestId('confirm-password-input').fill('TestPassword123!');
      await page2.getByTestId('register-button').click();

      // Login user 2
      await page2.goto('/auth/login');
      await page2.getByTestId('email-input').fill('jane.doe@business.com');
      await page2.getByTestId('password-input').fill('TestPassword123!');
      await page2.getByTestId('login-button').click();

      await navigateToClaimForm(page2);
      await fillClaimForm(page2, 'PHONE_VERIFICATION');

      // Submit both claims simultaneously
      const [claimId1, claimId2] = await Promise.all([
        submitClaim(page1),
        submitClaim(page2),
      ]);

      // Verify both claims were submitted successfully
      expect(claimId1).toBeTruthy();
      expect(claimId2).toBeTruthy();
      expect(claimId1).not.toBe(claimId2);
    });

    await context1.close();
    await context2.close();
  });
});

test.describe('Claim Performance Tests', () => {
  test('should meet claim workflow performance benchmarks', async ({ page }) => {
    await test.step('Claim Form Load Performance', async () => {
      const startTime = Date.now();
      await navigateToClaimForm(page);
      await expect(page.getByTestId('claim-form')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Claim form should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('Claim Submission Performance', async () => {
      await registerAndLoginUser(page);
      await navigateToClaimForm(page);
      await fillClaimForm(page, 'EMAIL_VERIFICATION');

      const startTime = Date.now();
      await submitClaim(page);
      const submissionTime = Date.now() - startTime;

      // Claim submission should complete within 5 seconds
      expect(submissionTime).toBeLessThan(5000);
    });

    await test.step('Dashboard Load Performance', async () => {
      const startTime = Date.now();
      await page.goto('/dashboard/claims');
      await expect(page.getByTestId('user-claims-dashboard')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });
  });
});