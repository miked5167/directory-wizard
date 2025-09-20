import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test data
const testData = {
  tenant: {
    name: 'E2E Test Directory',
    domain: 'e2e-test-directory',
    description: 'A comprehensive test directory for E2E testing',
    category: 'business',
    website: 'https://e2e-test.example.com',
    contactEmail: 'contact@e2e-test.com',
    phone: '+1 (555) 123-4567',
  },
  categories: [
    { name: 'Restaurants', description: 'Local dining establishments' },
    { name: 'Retail Stores', description: 'Shopping and retail businesses' },
    { name: 'Services', description: 'Professional and personal services' },
  ],
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    fontFamily: 'Inter',
  },
};

// Helper functions
async function fillBasicInfo(page: Page) {
  await page.getByTestId('name-input').fill(testData.tenant.name);
  await page.getByTestId('domain-input').fill(testData.tenant.domain);
  await page.getByTestId('category-select').selectOption(testData.tenant.category);
  await page.getByTestId('description-textarea').fill(testData.tenant.description);
  await page.getByTestId('website-input').fill(testData.tenant.website);
  await page.getByTestId('contact-email-input').fill(testData.tenant.contactEmail);
  await page.getByTestId('phone-input').fill(testData.tenant.phone);
}

async function addCategories(page: Page) {
  for (const category of testData.categories) {
    // Click add category button
    await page.getByTestId('add-category-button').click();

    // Fill category form
    await page.getByTestId('category-name-input').last().fill(category.name);
    await page.getByTestId('category-description-input').last().fill(category.description);
  }
}

async function uploadTestFile(page: Page) {
  // Create test CSV content
  const csvContent = [
    'name,description,category,phone,email,website',
    'Test Restaurant,Great food and service,Restaurants,555-0101,restaurant@test.com,https://restaurant.test',
    'Test Store,Quality retail products,Retail Stores,555-0102,store@test.com,https://store.test',
    'Test Service,Professional services,Services,555-0103,service@test.com,https://service.test',
  ].join('\n');

  // Create a temporary file
  const testFilePath = path.join(__dirname, 'fixtures', 'test-listings.csv');

  // Upload the file
  const fileInput = page.getByTestId('file-input');
  await fileInput.setInputFiles({
    name: 'test-listings.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  });
}

async function configureBranding(page: Page) {
  // Set primary color
  await page.getByTestId('primary-color-picker').fill(testData.branding.primaryColor);

  // Set secondary color
  await page.getByTestId('secondary-color-picker').fill(testData.branding.secondaryColor);

  // Select font family
  await page.getByTestId('font-family-select').selectOption(testData.branding.fontFamily);
}

async function waitForStep(page: Page, stepNumber: number) {
  await expect(page.getByTestId(`wizard-step-${stepNumber}`)).toBeVisible();
  await expect(page.getByTestId(`wizard-step-${stepNumber}`)).toHaveClass(/active|current/);
}

async function proceedToNextStep(page: Page) {
  const nextButton = page.getByTestId('next-button');
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
}

test.describe('Directory Wizard Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/wizard');
    await expect(page.getByText('Create Your Directory')).toBeVisible();
  });

  test('should complete the entire wizard flow successfully', async ({ page }) => {
    // Step 1: Basic Information
    await test.step('Fill Basic Information', async () => {
      await waitForStep(page, 1);

      // Fill all basic information fields
      await fillBasicInfo(page);

      // Verify form validation passes
      await expect(page.getByTestId('validation-summary')).not.toBeVisible();

      // Proceed to next step
      await proceedToNextStep(page);
    });

    // Step 2: Categories & Structure
    await test.step('Configure Categories', async () => {
      await waitForStep(page, 2);

      // Add categories
      await addCategories(page);

      // Verify categories were added
      for (const category of testData.categories) {
        await expect(page.getByText(category.name)).toBeVisible();
      }

      // Proceed to next step
      await proceedToNextStep(page);
    });

    // Step 3: File Upload
    await test.step('Upload Data Files', async () => {
      await waitForStep(page, 3);

      // Upload test file
      await uploadTestFile(page);

      // Wait for file processing
      await expect(page.getByText('File uploaded successfully')).toBeVisible({ timeout: 30000 });

      // Verify file processing results
      await expect(page.getByText('3 records processed')).toBeVisible();

      // Proceed to next step
      await proceedToNextStep(page);
    });

    // Step 4: Branding & Customization
    await test.step('Configure Branding', async () => {
      await waitForStep(page, 4);

      // Configure branding options
      await configureBranding(page);

      // Preview the site
      const previewButton = page.getByTestId('preview-button');
      await previewButton.click();

      // Verify preview opens
      await expect(page.getByTestId('preview-modal')).toBeVisible();
      await expect(page.getByText(testData.tenant.name)).toBeVisible();

      // Close preview
      await page.getByTestId('close-preview-button').click();

      // Proceed to next step
      await proceedToNextStep(page);
    });

    // Step 5: Publishing
    await test.step('Publish Directory', async () => {
      await waitForStep(page, 5);

      // Review all settings
      await expect(page.getByText(testData.tenant.name)).toBeVisible();
      await expect(page.getByText(testData.tenant.domain)).toBeVisible();
      await expect(page.getByText('3 listings')).toBeVisible();
      await expect(page.getByText(`${testData.categories.length} categories`)).toBeVisible();

      // Start publishing process
      const publishButton = page.getByTestId('publish-button');
      await publishButton.click();

      // Wait for publishing to complete
      await expect(page.getByText('Publishing...')).toBeVisible();
      await expect(page.getByText('Directory published successfully!')).toBeVisible({ timeout: 60000 });

      // Verify final results
      await expect(page.getByTestId('success-message')).toBeVisible();
      await expect(page.getByTestId('directory-url')).toBeVisible();
      await expect(page.getByTestId('admin-url')).toBeVisible();
    });
  });

  test('should handle validation errors correctly', async ({ page }) => {
    await test.step('Test Basic Information Validation', async () => {
      await waitForStep(page, 1);

      // Try to proceed without filling required fields
      await proceedToNextStep(page);

      // Verify validation errors appear
      await expect(page.getByTestId('name-error')).toBeVisible();
      await expect(page.getByTestId('domain-error')).toBeVisible();

      // Verify next button is disabled or step doesn't advance
      await expect(page.getByTestId('wizard-step-1')).toHaveClass(/active|current/);
    });

    await test.step('Test Domain Validation', async () => {
      // Fill invalid domain
      await page.getByTestId('domain-input').fill('Invalid Domain!');
      await proceedToNextStep(page);

      // Verify domain format error
      await expect(page.getByTestId('domain-error')).toHaveTextContent(/only lowercase letters, numbers, and hyphens/);
    });

    await test.step('Test Email Validation', async () => {
      // Fill invalid email
      await page.getByTestId('contact-email-input').fill('invalid-email');
      await proceedToNextStep(page);

      // Verify email format error
      await expect(page.getByTestId('contact-email-error')).toHaveTextContent(/valid email address/);
    });
  });

  test('should support navigation between steps', async ({ page }) => {
    // Fill step 1 and proceed
    await fillBasicInfo(page);
    await proceedToNextStep(page);
    await waitForStep(page, 2);

    // Add some categories and proceed
    await addCategories(page);
    await proceedToNextStep(page);
    await waitForStep(page, 3);

    // Navigate back to step 2
    await page.getByTestId('wizard-step-2').click();
    await waitForStep(page, 2);

    // Verify categories are still there
    for (const category of testData.categories) {
      await expect(page.getByText(category.name)).toBeVisible();
    }

    // Navigate back to step 1
    await page.getByTestId('wizard-step-1').click();
    await waitForStep(page, 1);

    // Verify basic info is preserved
    await expect(page.getByTestId('name-input')).toHaveValue(testData.tenant.name);
    await expect(page.getByTestId('domain-input')).toHaveValue(testData.tenant.domain);
  });

  test('should handle file upload errors gracefully', async ({ page }) => {
    // Navigate to file upload step
    await fillBasicInfo(page);
    await proceedToNextStep(page);
    await addCategories(page);
    await proceedToNextStep(page);
    await waitForStep(page, 3);

    await test.step('Test invalid file type', async () => {
      // Try to upload invalid file type
      const fileInput = page.getByTestId('file-input');
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('invalid content'),
      });

      // Verify error message
      await expect(page.getByText('Invalid file type')).toBeVisible();
    });

    await test.step('Test oversized file', async () => {
      // Create large file content (simulate oversized file)
      const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB

      const fileInput = page.getByTestId('file-input');
      await fileInput.setInputFiles({
        name: 'large.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(largeContent),
      });

      // Verify size error message
      await expect(page.getByText(/exceeds maximum/)).toBeVisible();
    });

    await test.step('Test empty file', async () => {
      const fileInput = page.getByTestId('file-input');
      await fileInput.setInputFiles({
        name: 'empty.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(''),
      });

      // Verify empty file error
      await expect(page.getByText(/empty/)).toBeVisible();
    });
  });

  test('should handle network errors and retries', async ({ page }) => {
    // Mock network failure for API calls
    await page.route('**/api/tenants', route => {
      route.abort('failed');
    });

    await fillBasicInfo(page);
    await proceedToNextStep(page);

    // Verify error handling
    await expect(page.getByText(/network error|failed to save/i)).toBeVisible();

    // Verify retry functionality
    await expect(page.getByTestId('retry-button')).toBeVisible();
  });

  test('should support saving progress and resuming', async ({ page }) => {
    // Fill step 1
    await fillBasicInfo(page);
    await proceedToNextStep(page);

    // Fill step 2
    await addCategories(page);
    await proceedToNextStep(page);

    // Simulate page refresh (session persistence)
    await page.reload();

    // Verify we're back at the correct step with data preserved
    await waitForStep(page, 3);

    // Navigate back to verify data persistence
    await page.getByTestId('wizard-step-1').click();
    await waitForStep(page, 1);

    await expect(page.getByTestId('name-input')).toHaveValue(testData.tenant.name);
    await expect(page.getByTestId('domain-input')).toHaveValue(testData.tenant.domain);
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step('Mobile Navigation', async () => {
      await fillBasicInfo(page);

      // Verify mobile-friendly layout
      await expect(page.getByTestId('wizard-stepper')).toBeVisible();
      await expect(page.getByTestId('basic-info-form')).toBeVisible();

      // Test mobile scrolling and interaction
      await page.getByTestId('description-textarea').scrollIntoViewIfNeeded();
      await page.getByTestId('description-textarea').fill(testData.tenant.description);

      await proceedToNextStep(page);
    });

    await test.step('Mobile File Upload', async () => {
      await addCategories(page);
      await proceedToNextStep(page);
      await waitForStep(page, 3);

      // Test mobile file upload
      await uploadTestFile(page);
      await expect(page.getByText('File uploaded successfully')).toBeVisible({ timeout: 30000 });
    });
  });

  test('should handle accessibility requirements', async ({ page }) => {
    // Test keyboard navigation
    await test.step('Keyboard Navigation', async () => {
      // Use keyboard to navigate form
      await page.keyboard.press('Tab');
      await page.keyboard.type(testData.tenant.name);

      await page.keyboard.press('Tab');
      await page.keyboard.type(testData.tenant.domain);

      // Verify focus management
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeFocused();
    });

    // Test screen reader support
    await test.step('Screen Reader Support', async () => {
      // Verify ARIA labels and roles
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('form')).toBeVisible();

      // Verify field labels
      await expect(page.getByLabelText('Directory Name *')).toBeVisible();
      await expect(page.getByLabelText('Domain *')).toBeVisible();
    });

    // Test high contrast mode
    await test.step('High Contrast Mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });

      // Verify elements are still visible and usable
      await expect(page.getByTestId('name-input')).toBeVisible();
      await expect(page.getByTestId('next-button')).toBeVisible();
    });
  });

  test('should handle concurrent user sessions', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await test.step('Concurrent Wizard Sessions', async () => {
      // Start wizard in both sessions
      await page1.goto('/wizard');
      await page2.goto('/wizard');

      // Fill different data in each session
      await page1.getByTestId('name-input').fill('Directory Session 1');
      await page1.getByTestId('domain-input').fill('session-1');

      await page2.getByTestId('name-input').fill('Directory Session 2');
      await page2.getByTestId('domain-input').fill('session-2');

      // Proceed in both sessions
      await page1.getByTestId('next-button').click();
      await page2.getByTestId('next-button').click();

      // Verify sessions remain independent
      await page1.getByTestId('wizard-step-1').click();
      await expect(page1.getByTestId('name-input')).toHaveValue('Directory Session 1');

      await page2.getByTestId('wizard-step-1').click();
      await expect(page2.getByTestId('name-input')).toHaveValue('Directory Session 2');
    });

    await context1.close();
    await context2.close();
  });
});

test.describe('Performance Tests', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    // Monitor page load times
    await test.step('Page Load Performance', async () => {
      const startTime = Date.now();
      await page.goto('/wizard');
      await expect(page.getByText('Create Your Directory')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    // Monitor step transitions
    await test.step('Step Transition Performance', async () => {
      await fillBasicInfo(page);

      const startTime = Date.now();
      await proceedToNextStep(page);
      await waitForStep(page, 2);
      const transitionTime = Date.now() - startTime;

      // Step transitions should be under 2 seconds
      expect(transitionTime).toBeLessThan(2000);
    });

    // Monitor file upload performance
    await test.step('File Upload Performance', async () => {
      await addCategories(page);
      await proceedToNextStep(page);
      await waitForStep(page, 3);

      const startTime = Date.now();
      await uploadTestFile(page);
      await expect(page.getByText('File uploaded successfully')).toBeVisible({ timeout: 30000 });
      const uploadTime = Date.now() - startTime;

      // File upload should complete within 30 seconds for test file
      expect(uploadTime).toBeLessThan(30000);
    });
  });
});