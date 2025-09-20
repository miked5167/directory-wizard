# Data Model: Directory Creation Wizard

## Core Entities

### Tenant
Represents a complete directory site with all configuration and content.

**Fields**:
- `id`: UUID - Unique identifier
- `name`: String - Display name for the directory site
- `domain`: String - Primary domain (subdomain.platform.com or custom.com)
- `status`: Enum - DRAFT, PREVIEW, PUBLISHED, UPDATING, FAILED
- `created_at`: DateTime - When tenant was created
- `updated_at`: DateTime - Last modification timestamp
- `published_at`: DateTime - When tenant went live (nullable)

**Relationships**:
- Has one `TenantBranding`
- Has many `Category` records
- Has many `Listing` records
- Has many `AdminSession` records
- Has many `ProvisioningJob` records

**Validation Rules**:
- Domain must be unique across all tenants
- Name must be 3-100 characters
- Domain must follow DNS naming conventions
- Status transitions must follow valid state machine

### TenantBranding
Stores visual and brand configuration for a tenant.

**Fields**:
- `id`: UUID - Unique identifier
- `tenant_id`: UUID - Foreign key to Tenant
- `logo_url`: String - CDN URL for uploaded logo (nullable)
- `primary_color`: String - Hex color code (#RRGGBB)
- `secondary_color`: String - Hex color code (#RRGGBB)
- `accent_color`: String - Hex color code (#RRGGBB)
- `font_family`: String - Selected font family name
- `font_url`: String - CDN URL for custom font files (nullable)
- `theme_json`: JSONB - Complete theme configuration object

**Relationships**:
- Belongs to one `Tenant`

**Validation Rules**:
- All color values must be valid hex codes
- Font family must be from approved list or have valid font_url
- Logo file must be valid image format (PNG, JPG, SVG)

### Category
Hierarchical organization structure for directory listings.

**Fields**:
- `id`: UUID - Unique identifier
- `tenant_id`: UUID - Foreign key to Tenant
- `parent_id`: UUID - Parent category (nullable for root categories)
- `name`: String - Category display name
- `slug`: String - URL-friendly identifier
- `description`: Text - Category description (nullable)
- `icon`: String - Icon identifier or URL (nullable)
- `sort_order`: Integer - Display ordering within parent
- `is_active`: Boolean - Whether category accepts new listings
- `metadata`: JSONB - Additional category-specific fields

**Relationships**:
- Belongs to one `Tenant`
- Has one parent `Category` (self-referential, nullable)
- Has many child `Category` records (self-referential)
- Has many `Listing` records

**Validation Rules**:
- Name must be unique within tenant and parent category
- Slug must be URL-safe and unique within tenant
- Maximum nesting depth of 5 levels
- Cannot delete category with active listings

### Listing
Individual directory entries with flexible schema support.

**Fields**:
- `id`: UUID - Unique identifier
- `tenant_id`: UUID - Foreign key to Tenant
- `category_id`: UUID - Foreign key to Category
- `title`: String - Listing display title
- `slug`: String - URL-friendly identifier
- `description`: Text - Listing description
- `status`: Enum - DRAFT, PUBLISHED, ARCHIVED
- `featured`: Boolean - Whether listing is featured
- `data`: JSONB - Flexible schema for listing-specific fields
- `search_text`: Text - Full-text search content (computed)
- `coordinates`: Point - Geographic location (nullable)
- `created_at`: DateTime - When listing was created
- `updated_at`: DateTime - Last modification timestamp

**Relationships**:
- Belongs to one `Tenant`
- Belongs to one `Category`
- Has many `ListingMedia` records
- Has many `ListingClaim` records

**Validation Rules**:
- Title must be 5-200 characters
- Slug must be unique within tenant
- Data must conform to category schema if defined
- Coordinates must be valid lat/lng if provided

### ListingMedia
Media assets (images, documents) associated with listings.

**Fields**:
- `id`: UUID - Unique identifier
- `listing_id`: UUID - Foreign key to Listing
- `type`: Enum - IMAGE, DOCUMENT, VIDEO
- `url`: String - CDN URL for the media file
- `filename`: String - Original filename
- `alt_text`: String - Accessibility text (nullable)
- `sort_order`: Integer - Display ordering
- `file_size`: Integer - Size in bytes
- `mime_type`: String - File MIME type

**Relationships**:
- Belongs to one `Listing`

**Validation Rules**:
- File size must not exceed limits (10MB images, 50MB documents)
- MIME type must match allowed types for media type
- Alt text required for images

## User Authentication Entities

### User
End users who can claim and manage listings within tenant directories.

**Fields**:
- `id`: UUID - Unique identifier
- `email`: String - User email address (unique across platform)
- `password_hash`: String - Hashed password
- `first_name`: String - User's first name
- `last_name`: String - User's last name
- `email_verified`: Boolean - Whether email has been verified
- `email_verification_token`: String - Token for email verification (nullable)
- `password_reset_token`: String - Token for password reset (nullable)
- `password_reset_expires`: DateTime - Password reset token expiration (nullable)
- `created_at`: DateTime - Account creation timestamp
- `updated_at`: DateTime - Last profile update

**Relationships**:
- Has many `ListingClaim` records across all tenants

**Validation Rules**:
- Email must be valid format and unique
- Password must meet security requirements (min 8 chars, complexity)
- Names must be 1-50 characters each
- Verification tokens expire after 24 hours
- Password reset tokens expire after 1 hour

### ListingClaim
Represents a user's claim on a specific listing within a tenant directory.

**Fields**:
- `id`: UUID - Unique identifier
- `listing_id`: UUID - Foreign key to Listing
- `user_id`: UUID - Foreign key to User
- `status`: Enum - PENDING, APPROVED, REJECTED, VERIFIED
- `claim_method`: Enum - EMAIL_VERIFICATION, PHONE_VERIFICATION, DOCUMENT_UPLOAD
- `verification_data`: JSONB - Method-specific verification information
- `submitted_at`: DateTime - When claim was submitted
- `reviewed_at`: DateTime - When claim was reviewed (nullable)
- `reviewer_notes`: Text - Admin notes about claim decision (nullable)
- `expires_at`: DateTime - When claim expires if not completed

**Relationships**:
- Belongs to one `Listing`
- Belongs to one `User`

**Validation Rules**:
- Only one APPROVED or VERIFIED claim per listing
- Verification data must match claim method requirements
- Claims expire after 7 days if not completed
- Status transitions must follow valid state machine

### ListingClaimVerification
Stores verification evidence submitted by users claiming listings.

**Fields**:
- `id`: UUID - Unique identifier
- `claim_id`: UUID - Foreign key to ListingClaim
- `verification_type`: Enum - EMAIL_DOMAIN, PHONE_NUMBER, BUSINESS_DOCUMENT, UTILITY_BILL
- `evidence_url`: String - CDN URL for uploaded evidence file
- `evidence_data`: JSONB - Structured verification data
- `verified`: Boolean - Whether evidence was verified
- `verified_at`: DateTime - When verification was completed (nullable)
- `created_at`: DateTime - When evidence was submitted

**Relationships**:
- Belongs to one `ListingClaim`

**Validation Rules**:
- Evidence files must be valid formats (PDF, JPG, PNG)
- Maximum file size 10MB per evidence file
- Email domain must match listing contact information
- Phone number must be verifiable via SMS/call

## Wizard State Entities

### AdminSession
Tracks wizard progress and temporary data during tenant creation.

**Fields**:
- `id`: UUID - Unique identifier
- `tenant_id`: UUID - Foreign key to Tenant (nullable until created)
- `admin_user_id`: UUID - Foreign key to admin user
- `step`: Enum - BASIC_INFO, BRANDING, CATEGORIES, LISTINGS, PREVIEW, PUBLISH
- `data`: JSONB - Current form data and file references
- `created_at`: DateTime - Session start time
- `updated_at`: DateTime - Last activity timestamp
- `expires_at`: DateTime - Session expiration time

**Relationships**:
- May belong to one `Tenant`
- Has many `UploadedFile` records

**Validation Rules**:
- Sessions expire after 24 hours of inactivity
- Data must contain valid structure for current step
- Cannot proceed to next step without completing current step

### UploadedFile
Temporary storage for files during wizard process.

**Fields**:
- `id`: UUID - Unique identifier
- `session_id`: UUID - Foreign key to AdminSession
- `type`: Enum - LOGO, CATEGORIES_JSON, LISTINGS_CSV, MEDIA
- `filename`: String - Original filename
- `storage_path`: String - Temporary storage location
- `file_size`: Integer - Size in bytes
- `mime_type`: String - File MIME type
- `validation_status`: Enum - PENDING, VALID, INVALID
- `validation_errors`: JSONB - Validation error details (nullable)
- `created_at`: DateTime - Upload timestamp

**Relationships**:
- Belongs to one `AdminSession`

**Validation Rules**:
- Files automatically deleted after session expires
- Validation required before processing
- Maximum file size enforced by type

## Background Process Entities

### ProvisioningJob
Tracks background provisioning operations for tenant deployment.

**Fields**:
- `id`: UUID - Unique identifier
- `tenant_id`: UUID - Foreign key to Tenant
- `type`: Enum - CREATE, UPDATE, DELETE, REPUBLISH
- `status`: Enum - QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
- `progress`: Integer - Percentage complete (0-100)
- `current_step`: String - Current operation description
- `steps_total`: Integer - Total number of steps
- `steps_completed`: Integer - Completed steps count
- `error_message`: Text - Error details if failed (nullable)
- `external_refs`: JSONB - External service IDs and references
- `compensation_data`: JSONB - Rollback information for saga pattern
- `started_at`: DateTime - When processing began (nullable)
- `completed_at`: DateTime - When processing finished (nullable)
- `created_at`: DateTime - Job creation timestamp

**Relationships**:
- Belongs to one `Tenant`

**Validation Rules**:
- Progress must be 0-100
- Steps completed cannot exceed steps total
- External refs required for rollback operations

## State Transitions

### Tenant Status Flow
```
DRAFT → PREVIEW → PUBLISHED
   ↓       ↓         ↓
FAILED ← UPDATING → PUBLISHED
   ↓
DRAFT (reset)
```

### Listing Status Flow
```
DRAFT → PUBLISHED → ARCHIVED
  ↑         ↓
  ← ← ← ← ←
```

### Provisioning Job Flow
```
QUEUED → RUNNING → COMPLETED
    ↓       ↓
CANCELLED ← FAILED
```

### Listing Claim Flow
```
PENDING → APPROVED → VERIFIED
   ↓         ↓
REJECTED   EXPIRED
```

## Indexes and Performance

**Required Indexes**:
- Tenant: (domain), (status, updated_at)
- Category: (tenant_id, parent_id), (tenant_id, slug)
- Listing: (tenant_id, status), (tenant_id, category_id), (search_text) GIN
- ProvisioningJob: (tenant_id, status), (created_at)
- User: (email), (email_verification_token), (password_reset_token)
- ListingClaim: (listing_id, status), (user_id, status), (expires_at)
- ListingClaimVerification: (claim_id), (created_at)

**Search Optimization**:
- Full-text search on listing.search_text using GIN index
- Geographic queries on listing.coordinates using GIST index
- Category hierarchy queries optimized with materialized path pattern