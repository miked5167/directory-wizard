# Quickstart: Directory Creation Wizard

## Overview
This quickstart guide provides step-by-step validation scenarios for the Directory Creation Wizard. Each scenario represents a complete user story that should be validated through automated testing.

## Test Environment Setup

### Prerequisites
- Backend API running on localhost:3000
- Frontend application running on localhost:3001
- Test database with clean state
- Mock external services (Supabase, Typesense, Stripe, Vercel)

### Test Data
- Sample categories.json file with 10 categories
- Sample listings.csv file with 50 listings
- Test logo image (PNG, 512x512px)
- Valid color palette and font selection

## Scenario 1: Complete Tenant Creation Flow

### Objective
Validate end-to-end tenant creation from initial setup to published site.

### Steps
1. **Start New Tenant Creation**
   ```bash
   POST /api/tenants
   {
     "name": "Downtown Restaurants",
     "domain": "downtown-eats"
   }
   ```
   - Expected: 201 status, tenant ID returned, status = DRAFT

2. **Configure Branding**
   ```bash
   PUT /api/tenants/{tenantId}/branding
   # Multipart form with:
   # - logo: restaurant-logo.png
   # - primary_color: #E53E3E
   # - secondary_color: #C53030
   # - accent_color: #FBD38D
   # - font_family: "Inter"
   ```
   - Expected: 200 status, logo uploaded, colors applied

3. **Upload Categories**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=categories
   # File: categories.json with restaurant categories
   ```
   - Expected: 200 status, validation_status = VALID, 10 categories parsed

4. **Upload Listings**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=listings
   # File: listings.csv with restaurant data
   ```
   - Expected: 200 status, validation_status = VALID, 50 listings parsed

5. **Generate Preview**
   ```bash
   GET /api/tenants/{tenantId}/preview
   ```
   - Expected: 200 status, preview_url returned, expires_at set

6. **Validate Preview Content**
   - Visit preview URL
   - Verify branding applied correctly
   - Confirm all categories visible in navigation
   - Check sample listings display properly

7. **Publish Tenant**
   ```bash
   POST /api/tenants/{tenantId}/publish
   ```
   - Expected: 202 status, job_id returned, status = QUEUED

8. **Monitor Publishing Progress**
   ```bash
   GET /api/tenants/{tenantId}/jobs/{jobId}
   ```
   - Expected: Progress updates, status changes to RUNNING then COMPLETED

9. **Verify Published Site**
   - Check tenant status = PUBLISHED
   - Verify live site accessible at domain
   - Confirm all external services provisioned

### Success Criteria
- Complete flow completes in <5 minutes
- Preview matches final published site
- All uploaded data correctly displayed
- External service integrations functional

## Scenario 2: File Validation and Error Handling

### Objective
Validate file upload validation and error recovery mechanisms.

### Steps
1. **Test Invalid Categories JSON**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=categories
   # File: invalid-categories.json (malformed JSON)
   ```
   - Expected: 422 status, validation_errors with specific line numbers

2. **Test Missing Required Fields**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=categories
   # File: categories-missing-fields.json
   ```
   - Expected: 422 status, field-specific validation errors

3. **Test Invalid Listings CSV**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=listings
   # File: invalid-listings.csv (wrong headers)
   ```
   - Expected: 422 status, header validation errors

4. **Test Large File Upload**
   ```bash
   POST /api/tenants/{tenantId}/upload?type=listings
   # File: large-listings.csv (>10MB)
   ```
   - Expected: 413 status, file size limit exceeded

5. **Test Recovery After Invalid Upload**
   - Upload invalid file
   - Verify error message displayed
   - Upload corrected file
   - Confirm successful processing

### Success Criteria
- All validation errors provide actionable feedback
- Users can recover from errors without restarting
- File size limits properly enforced
- Invalid data doesn't corrupt tenant state

## Scenario 3: Preview Generation and Accuracy

### Objective
Validate preview generation accuracy and performance.

### Steps
1. **Create Tenant with Minimal Data**
   - Basic info and branding only
   - No categories or listings uploaded

2. **Generate Initial Preview**
   ```bash
   GET /api/tenants/{tenantId}/preview
   ```
   - Expected: Preview shows branding, empty state for content

3. **Add Categories and Regenerate Preview**
   - Upload categories.json
   - Generate new preview
   - Expected: Categories visible in navigation

4. **Add Listings and Final Preview**
   - Upload listings.csv
   - Generate final preview
   - Expected: Full site with all content

5. **Validate Preview Accuracy**
   - Compare preview to published site
   - Verify branding consistency
   - Check content organization
   - Confirm search functionality

### Success Criteria
- Preview generation completes in <10 seconds
- Preview accuracy >99% match with published site
- Preview updates reflect all configuration changes
- Performance acceptable with large datasets

## Scenario 4: External Service Integration

### Objective
Validate external service provisioning and error handling.

### Steps
1. **Test Supabase Integration**
   - Publish tenant
   - Verify database creation
   - Check tenant data migration
   - Confirm user authentication setup

2. **Test Typesense Integration**
   - Verify search index creation
   - Check listing data indexing
   - Validate search functionality

3. **Test Stripe Integration**
   - Verify subscription setup
   - Check payment form integration
   - Validate webhook configuration

4. **Test Vercel Integration**
   - Check domain configuration
   - Verify SSL certificate provisioning
   - Confirm CDN distribution

5. **Test Service Failure Recovery**
   - Simulate Supabase failure during provisioning
   - Verify saga rollback behavior
   - Confirm tenant status reflects failure
   - Test retry mechanism

### Success Criteria
- All services provision successfully
- Service failures trigger proper rollback
- Error states provide clear recovery path
- Retry mechanisms handle transient failures

## Scenario 5: Wizard State Management

### Objective
Validate wizard state persistence and recovery.

### Steps
1. **Start Tenant Creation Session**
   - Complete basic info step
   - Note session ID

2. **Simulate Browser Refresh**
   - Close browser/clear session
   - Navigate back to wizard with tenant ID
   - Expected: Resume at branding step

3. **Test Progress Persistence**
   - Complete branding step
   - Upload categories
   - Refresh browser mid-upload
   - Expected: Categories preserved, ready for listings

4. **Test Session Expiration**
   - Wait for session timeout (or manipulate timestamp)
   - Attempt to continue wizard
   - Expected: Graceful degradation with recovery options

5. **Test Multiple Sessions**
   - Start multiple tenant creation sessions
   - Verify session isolation
   - Confirm no data cross-contamination

### Success Criteria
- Sessions persist across browser refreshes
- Progress automatically saved at each step
- Session expiration handled gracefully
- Multiple concurrent sessions supported

## Scenario 6: Listing Claims Workflow

### Objective
Validate end-user listing claim and verification process.

### Steps
1. **User Registration and Email Verification**
   ```bash
   POST /api/auth/register
   {
     "email": "business@example.com",
     "password": "SecurePass123!",
     "first_name": "Jane",
     "last_name": "Smith"
   }
   ```
   - Expected: 201 status, verification email sent

2. **Email Verification**
   ```bash
   POST /api/auth/verify-email
   {
     "token": "verification_token_from_email"
   }
   ```
   - Expected: 200 status, account verified

3. **User Login**
   ```bash
   POST /api/auth/login
   {
     "email": "business@example.com",
     "password": "SecurePass123!"
   }
   ```
   - Expected: 200 status, JWT token returned

4. **Submit Listing Claim**
   ```bash
   POST /api/listings/{listingId}/claim
   {
     "claim_method": "EMAIL_VERIFICATION",
     "verification_data": {
       "email": "contact@businessname.com",
       "business_name": "Business Name LLC"
     }
   }
   ```
   - Expected: 201 status, claim ID returned, expires_at set

5. **Submit Verification Evidence**
   ```bash
   POST /api/claims/{claimId}/verify
   # Multipart form with:
   # - verification_type: BUSINESS_DOCUMENT
   # - evidence_file: business_license.pdf
   # - evidence_data: {"document_type": "business_license"}
   ```
   - Expected: 200 status, verification submitted

6. **Check Claim Status**
   ```bash
   GET /api/claims/{claimId}
   ```
   - Expected: Claim details with current status

7. **Admin Review Process** (manual step)
   - Review submitted evidence
   - Approve or reject claim
   - Add reviewer notes

8. **Update Claimed Listing**
   ```bash
   PUT /api/listings/{listingId}/update
   {
     "title": "Updated Business Name",
     "description": "Updated business description",
     "data": {
       "phone": "555-1234",
       "website": "https://business.com"
     }
   }
   ```
   - Expected: 200 status, listing updated (after claim approved)

### Success Criteria
- Complete claim workflow from registration to listing update
- Email verification process works correctly
- Claim expires properly if not completed within 7 days
- Only approved claim holders can update listings
- Multiple users cannot claim same listing simultaneously

## Performance Benchmarks

### Target Metrics
- Wizard step transitions: <2 seconds
- File upload processing: <30 seconds for 10MB files
- Preview generation: <10 seconds
- Publishing completion: <5 minutes
- Concurrent tenant creations: Support 100 simultaneous

### Load Testing Scenarios
- 50 concurrent users creating tenants
- Large file uploads (50MB CSV)
- Complex category hierarchies (1000+ categories)
- High-volume listings (10,000+ entries)

## Security Validation

### File Upload Security
- Test malicious file uploads
- Verify file type validation
- Check file size limits
- Confirm virus scanning integration

### Domain Security
- Test domain hijacking attempts
- Verify subdomain isolation
- Check DNS poisoning protection
- Validate SSL certificate management

### Data Protection
- Verify tenant data isolation
- Check access control enforcement
- Validate encryption at rest
- Confirm audit logging

## Monitoring and Observability

### Key Metrics to Track
- Wizard completion rates
- Step abandonment points
- Error frequency by type
- Performance metrics per step
- External service success rates

### Alerting Thresholds
- Error rate >5%
- Response time >5 seconds
- Publishing failure rate >1%
- External service downtime

## Rollback and Recovery

### Rollback Scenarios
- Failed publishing with partial external service setup
- Corrupted tenant data during provisioning
- Domain conflicts discovered after publication
- External service quota limits reached

### Recovery Procedures
- Manual rollback commands
- Data restoration from backups
- Service reconfiguration steps
- User notification processes