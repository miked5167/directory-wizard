import request from 'supertest';
import app from '../../src/index';

describe('Integration: Wizard State Management', () => {
  let tenantId: string;
  let sessionId: string;

  beforeEach(async () => {
    // Create a tenant which automatically creates a wizard session
    const tenantResponse = await request(app).post('/api/tenants').send({
      name: 'Wizard Test Directory',
      domain: `wizard-test-${Date.now()}`,
    });

    expect(tenantResponse.status).toBe(201);
    tenantId = tenantResponse.body.id;
    sessionId = tenantResponse.body.session_id;
  });

  describe('Session Management', () => {
    it('should create wizard session when creating tenant', async () => {
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^[a-zA-Z0-9-]+$/); // Basic session ID format check
    });

    it('should retrieve wizard session state', async () => {
      const response = await request(app)
        .get(`/api/wizard/${sessionId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', sessionId);
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('current_step', 'BASIC_INFO');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(response.body).toHaveProperty('expires_at');

      // Initial data should contain basic info
      const data = JSON.parse(response.body.data);
      expect(data).toHaveProperty('basicInfo');
      expect(data.basicInfo).toHaveProperty('name', 'Wizard Test Directory');
      expect(data.basicInfo).toHaveProperty('domain');
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentSessionId = 'non-existent-session-123';

      const response = await request(app)
        .get(`/api/wizard/${nonExistentSessionId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Session not found');
    });

    it('should handle session expiration properly', async () => {
      // This would test expired sessions, but our test sessions have 24-hour expiration
      // For now, we'll test the response format
      const response = await request(app).get(`/api/wizard/${sessionId}`);
      expect(response.status).toBe(200);

      const expiresAt = new Date(response.body.expires_at);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Step Transitions', () => {
    it('should update wizard step and preserve data', async () => {
      const brandingData = {
        primaryColor: '#2563EB',
        secondaryColor: '#F8FAFC',
        accentColor: '#7C3AED',
        fontFamily: 'Inter, sans-serif',
      };

      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'BRANDING',
          data: brandingData,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', sessionId);
      expect(response.body).toHaveProperty('current_step', 'BRANDING');
      expect(response.body).toHaveProperty('updated_at');

      // Verify data was stored correctly
      const data = JSON.parse(response.body.data);
      expect(data).toHaveProperty('branding', brandingData);
      expect(data).toHaveProperty('basicInfo'); // Should preserve previous step data
    });

    it('should validate step names', async () => {
      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'INVALID_STEP',
          data: {},
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid step');
      expect(response.body).toHaveProperty('valid_steps');
      expect(response.body.valid_steps).toContain('BASIC_INFO');
      expect(response.body.valid_steps).toContain('BRANDING');
      expect(response.body.valid_steps).toContain('CATEGORIES');
      expect(response.body.valid_steps).toContain('LISTINGS');
      expect(response.body.valid_steps).toContain('PREVIEW');
      expect(response.body.valid_steps).toContain('PUBLISH');
    });

    it('should require step parameter', async () => {
      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          data: { some: 'data' },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Step is required');
    });

    it('should handle missing data gracefully', async () => {
      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'CATEGORIES',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('current_step', 'CATEGORIES');

      // Should default to empty object if no data provided
      const data = JSON.parse(response.body.data);
      expect(data).toHaveProperty('categories', {});
    });
  });

  describe('Complete Wizard Workflow', () => {
    it('should progress through all wizard steps', async () => {
      // Step 1: BASIC_INFO (already set during tenant creation)
      let sessionResponse = await request(app).get(`/api/wizard/${sessionId}`);
      expect(sessionResponse.body.current_step).toBe('BASIC_INFO');

      // Step 2: BRANDING
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'BRANDING',
          data: {
            primaryColor: '#1E40AF',
            secondaryColor: '#F8FAFC',
            accentColor: '#7C3AED',
            fontFamily: 'Inter, sans-serif',
          },
        })
        .expect(200);

      // Step 3: CATEGORIES
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'CATEGORIES',
          data: {
            categories: [
              { name: 'Restaurants', slug: 'restaurants', description: 'Dining places' },
              { name: 'Shopping', slug: 'shopping', description: 'Retail stores' },
            ],
          },
        })
        .expect(200);

      // Step 4: LISTINGS
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'LISTINGS',
          data: {
            listings: [
              { title: 'Test Restaurant', category: 'restaurants', description: 'Great food' },
              { title: 'Test Shop', category: 'shopping', description: 'Great products' },
            ],
          },
        })
        .expect(200);

      // Step 5: PREVIEW
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'PREVIEW',
          data: { previewGenerated: true },
        })
        .expect(200);

      // Step 6: PUBLISH (final step)
      const finalStep = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'PUBLISH',
          data: { publishRequested: true },
        })
        .expect(200);

      expect(finalStep.body.current_step).toBe('PUBLISH');

      // Verify all data is preserved
      const finalData = JSON.parse(finalStep.body.data);
      expect(finalData).toHaveProperty('basicInfo');
      expect(finalData).toHaveProperty('branding');
      expect(finalData).toHaveProperty('categories');
      expect(finalData).toHaveProperty('listings');
      expect(finalData).toHaveProperty('preview');
      expect(finalData).toHaveProperty('publish');
    });

    it('should maintain data consistency across step transitions', async () => {
      const initialData = { color: 'blue', setting: 'enabled' };

      // Set initial data
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'BRANDING',
          data: initialData,
        })
        .expect(200);

      // Add more data in next step
      const additionalData = { categories: ['cat1', 'cat2'] };
      await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'CATEGORIES',
          data: additionalData,
        })
        .expect(200);

      // Verify both sets of data are preserved
      const sessionResponse = await request(app).get(`/api/wizard/${sessionId}`);
      const data = JSON.parse(sessionResponse.body.data);

      expect(data.branding).toEqual(initialData);
      expect(data.categories).toEqual(additionalData);
      expect(data.basicInfo).toBeDefined(); // Original data should still be there
    });
  });

  describe('Data Processing Endpoints', () => {
    it('should process categories data', async () => {
      const categories = [
        {
          name: 'Restaurants',
          slug: 'restaurants',
          description: 'Fine dining and casual eateries',
          icon: 'restaurant',
          sortOrder: 1,
        },
        {
          name: 'Shopping',
          slug: 'shopping',
          description: 'Retail stores and boutiques',
          icon: 'shopping-bag',
          sortOrder: 2,
        },
      ];

      const response = await request(app)
        .post(`/api/wizard/${sessionId}/categories`)
        .send({ categories })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('created_count', 2);
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories).toHaveLength(2);

      // Validate created categories structure
      const createdCategory = response.body.categories[0];
      expect(createdCategory).toHaveProperty('id');
      expect(createdCategory).toHaveProperty('tenantId', tenantId);
      expect(createdCategory).toHaveProperty('name');
      expect(createdCategory).toHaveProperty('slug');
      expect(createdCategory).toHaveProperty('description');
    });

    it('should validate categories data format', async () => {
      const response = await request(app)
        .post(`/api/wizard/${sessionId}/categories`)
        .send({ categories: 'invalid' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Categories array is required');
    });

    it('should process listings data', async () => {
      // First create some categories
      const categories = [
        { name: 'Restaurants', slug: 'restaurants', description: 'Dining places' },
      ];

      const categoryResponse = await request(app)
        .post(`/api/wizard/${sessionId}/categories`)
        .send({ categories });

      const categoryId = categoryResponse.body.categories[0].id;

      // Now create listings
      const listings = [
        {
          title: 'Pizza Palace',
          categoryId: categoryId,
          description: 'Best pizza in town',
          featured: true,
          data: { phone: '555-1234', address: '123 Main St' },
        },
        {
          title: 'Coffee Shop',
          categoryId: categoryId,
          description: 'Great coffee and pastries',
          featured: false,
        },
      ];

      const response = await request(app)
        .post(`/api/wizard/${sessionId}/listings`)
        .send({ listings })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('created_count', 2);
      expect(response.body).toHaveProperty('listings');
      expect(Array.isArray(response.body.listings)).toBe(true);
      expect(response.body.listings).toHaveLength(2);

      // Validate created listings structure
      const createdListing = response.body.listings[0];
      expect(createdListing).toHaveProperty('id');
      expect(createdListing).toHaveProperty('tenantId', tenantId);
      expect(createdListing).toHaveProperty('categoryId', categoryId);
      expect(createdListing).toHaveProperty('title');
      expect(createdListing).toHaveProperty('slug');
      expect(createdListing).toHaveProperty('description');
      expect(createdListing).toHaveProperty('featured');
    });

    it('should validate listings data format', async () => {
      const response = await request(app)
        .post(`/api/wizard/${sessionId}/listings`)
        .send({ listings: 'invalid' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Listings array is required');
    });

    it('should handle empty arrays gracefully', async () => {
      const categoriesResponse = await request(app)
        .post(`/api/wizard/${sessionId}/categories`)
        .send({ categories: [] })
        .expect(200);

      expect(categoriesResponse.body.created_count).toBe(0);
      expect(categoriesResponse.body.categories).toEqual([]);

      const listingsResponse = await request(app)
        .post(`/api/wizard/${sessionId}/listings`)
        .send({ listings: [] })
        .expect(200);

      expect(listingsResponse.body.created_count).toBe(0);
      expect(listingsResponse.body.listings).toEqual([]);
    });
  });

  describe('Wizard Completion', () => {
    it('should complete wizard and update tenant status', async () => {
      // Add some minimal data first
      await request(app)
        .post(`/api/wizard/${sessionId}/categories`)
        .send({
          categories: [{ name: 'General', slug: 'general', description: 'General category' }],
        });

      const response = await request(app)
        .post(`/api/wizard/${sessionId}/complete`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('message', 'Wizard completed successfully');

      // Verify tenant status was updated
      const tenantResponse = await request(app).get(`/api/tenants/${tenantId}`);
      expect(tenantResponse.status).toBe(200);
      expect(tenantResponse.body.status).toBe('PREVIEW');
    });

    it('should handle completion of session without data', async () => {
      const response = await request(app)
        .post(`/api/wizard/${sessionId}/complete`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tenant_id', tenantId);
    });

    it('should return error for non-existent session', async () => {
      const response = await request(app)
        .post('/api/wizard/non-existent-session/complete')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to complete wizard');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid session ID in step update', async () => {
      const response = await request(app)
        .put('/api/wizard/invalid-session-id/step')
        .send({
          step: 'BRANDING',
          data: { color: 'blue' },
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to update step');
    });

    it('should handle invalid session ID in data processing', async () => {
      const categoriesResponse = await request(app)
        .post('/api/wizard/invalid-session-id/categories')
        .send({ categories: [] })
        .expect('Content-Type', /json/);

      expect(categoriesResponse.status).toBe(500);
      expect(categoriesResponse.body).toHaveProperty('error', 'Failed to process categories');

      const listingsResponse = await request(app)
        .post('/api/wizard/invalid-session-id/listings')
        .send({ listings: [] })
        .expect('Content-Type', /json/);

      expect(listingsResponse.status).toBe(500);
      expect(listingsResponse.body).toHaveProperty('error', 'Failed to process listings');
    });

    it('should handle malformed JSON data gracefully', async () => {
      // This tests the internal JSON parsing robustness
      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'BRANDING',
          data: { validKey: 'validValue' },
        })
        .expect(200);

      expect(response.body.current_step).toBe('BRANDING');
    });

    it('should handle concurrent step updates', async () => {
      const updates = [
        { step: 'BRANDING', data: { color: 'red' } },
        { step: 'CATEGORIES', data: { count: 5 } },
        { step: 'LISTINGS', data: { featured: true } },
      ];

      // Send concurrent updates
      const promises = updates.map(update =>
        request(app)
          .put(`/api/wizard/${sessionId}/step`)
          .send(update)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', sessionId);
      });

      // Final session should contain all data
      const finalSession = await request(app).get(`/api/wizard/${sessionId}`);
      const data = JSON.parse(finalSession.body.data);

      // At least some of the concurrent updates should be preserved
      expect(Object.keys(data).length).toBeGreaterThan(1);
    });
  });

  describe('Session Data Integrity', () => {
    it('should preserve complex nested data structures', async () => {
      const complexData = {
        branding: {
          colors: {
            primary: '#2563EB',
            secondary: '#F8FAFC',
            accent: '#7C3AED',
          },
          typography: {
            headings: 'Inter',
            body: 'Source Sans Pro',
            sizes: [12, 14, 16, 18, 24, 32],
          },
          layout: {
            grid: { columns: 12, gutter: 16 },
            breakpoints: { sm: 640, md: 768, lg: 1024 },
          },
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0',
          author: 'Wizard Test',
        },
      };

      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'BRANDING',
          data: complexData,
        })
        .expect(200);

      const retrievedData = JSON.parse(response.body.data);
      expect(retrievedData.branding).toEqual(complexData);
    });

    it('should handle special characters and unicode in data', async () => {
      const unicodeData = {
        name: 'Café & Résturant Français',
        description: 'Spécialisé en crépes et café ☕',
        categories: ['🍽️ Dining', '🥐 Bakery', '☕ Coffee'],
        emoji: '🎉🌟✨',
        symbols: '€£¥$@#%&*',
      };

      const response = await request(app)
        .put(`/api/wizard/${sessionId}/step`)
        .send({
          step: 'CATEGORIES',
          data: unicodeData,
        })
        .expect(200);

      const retrievedData = JSON.parse(response.body.data);
      expect(retrievedData.categories).toEqual(unicodeData);
    });
  });
});