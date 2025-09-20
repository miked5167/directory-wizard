# Directory Wizard API Documentation

## Overview

The Directory Wizard API enables creation and management of multi-tenant directory websites through a guided wizard interface. This RESTful API supports the complete lifecycle from tenant creation to publication with integrated external service provisioning.

## Base URL

```
https://api.directorywizard.com/api
```

## Authentication

The API uses JWT (JSON Web Token) authentication for protected endpoints.

### Authentication Header
```
Authorization: Bearer <jwt-token>
```

### Rate Limiting
- Login attempts: 5 attempts per 15-minute window per email
- File uploads: 10 uploads per hour per tenant
- API requests: 1000 requests per hour per authenticated user

## API Endpoints

### Health Check

#### GET /health
Check API service status.

**Response:**
```json
{
  "status": "OK",
  "message": "Directory Wizard API is running",
  "version": "1.0.0",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Smith",
  "businessName": "ABC Company",
  "businessRole": "Owner",
  "agreeToTerms": true,
  "subscribeToNewsletter": false
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "businessName": "ABC Company",
    "businessRole": "Owner",
    "emailVerified": false,
    "subscribeToNewsletter": false,
    "created_at": "2025-01-20T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: 8+ characters, uppercase, lowercase, number, special character
- `firstName`/`lastName`: 1-50 characters, letters only
- `businessName`: Optional, max 100 characters
- `businessRole`: Optional, max 50 characters
- `agreeToTerms`: Must be true

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "usr_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "emailVerified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### GET /auth/profile
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "usr_123456789",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "businessName": "ABC Company",
  "businessRole": "Owner",
  "emailVerified": true,
  "subscribeToNewsletter": false,
  "created_at": "2025-01-20T10:30:00.000Z",
  "updated_at": "2025-01-20T10:30:00.000Z"
}
```

---

## Tenant Management

### POST /tenants
Create a new tenant (directory site).

**Request Body:**
```json
{
  "name": "San Francisco Business Directory",
  "domain": "sf-business-directory"
}
```

**Response (201):**
```json
{
  "id": "tnt_123456789",
  "name": "San Francisco Business Directory",
  "domain": "sf-business-directory",
  "status": "DRAFT",
  "session_id": "ses_987654321",
  "next_step": "BRANDING",
  "created_at": "2025-01-20T10:30:00.000Z"
}
```

**Validation Rules:**
- `name`: 3-100 characters, letters, numbers, spaces, hyphens
- `domain`: 3-50 characters, lowercase letters, numbers, hyphens only, unique

### GET /tenants/:id
Retrieve tenant details by ID.

**Response (200):**
```json
{
  "id": "tnt_123456789",
  "name": "San Francisco Business Directory",
  "domain": "sf-business-directory",
  "status": "PUBLISHED",
  "branding": {
    "logo_url": "https://storage.example.com/logos/logo.png",
    "primary_color": "#3B82F6",
    "secondary_color": "#1F2937",
    "accent_color": "#F59E0B",
    "font_family": "Inter",
    "font_url": "https://fonts.google.com/inter"
  },
  "categories": [
    {
      "id": "cat_123",
      "name": "Restaurants",
      "slug": "restaurants",
      "listings_count": 25
    }
  ],
  "listings": [
    {
      "id": "lst_456",
      "title": "Best Pizza Place",
      "category": "Restaurants",
      "featured": true
    }
  ],
  "created_at": "2025-01-20T10:30:00.000Z",
  "updated_at": "2025-01-20T11:15:00.000Z",
  "published_at": "2025-01-20T12:00:00.000Z"
}
```

### PUT /tenants/:id
Update tenant basic information.

**Request Body:**
```json
{
  "name": "Updated Directory Name",
  "domain": "updated-domain"
}
```

**Response (200):**
```json
{
  "id": "tnt_123456789",
  "name": "Updated Directory Name",
  "domain": "updated-domain",
  "status": "DRAFT",
  "updated_at": "2025-01-20T11:30:00.000Z"
}
```

### PUT /tenants/:id/branding
Update tenant branding and theme.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `primary_color`: #RRGGBB hex color (required)
- `secondary_color`: #RRGGBB hex color (required)
- `accent_color`: #RRGGBB hex color (required)
- `font_family`: Font name (required)
- `logo`: Image file (optional, max 5MB, PNG/JPG/SVG)
- `font_file`: Font file (optional, max 2MB, TTF/OTF/WOFF/WOFF2)
- `session_id`: Wizard session ID (optional)

**Response (200):**
```json
{
  "tenant_id": "tnt_123456789",
  "branding": {
    "logo_url": "https://storage.example.com/logos/logo.png",
    "primary_color": "#3B82F6",
    "secondary_color": "#1F2937",
    "accent_color": "#F59E0B",
    "font_family": "Inter",
    "font_url": "https://storage.example.com/fonts/custom.woff2"
  },
  "next_step": "CATEGORIES"
}
```

### POST /tenants/:id/upload
Upload categories or listings data file.

**Content-Type:** `multipart/form-data`

**Query Parameters:**
- `type`: "categories" | "listings" (required)

**Form Fields:**
- `file`: CSV/JSON file (required, max 10MB)

**Categories File Format (JSON):**
```json
[
  {
    "name": "Restaurants",
    "description": "Local dining establishments",
    "icon": "restaurant",
    "sort_order": 1
  }
]
```

**Listings File Format (CSV):**
```csv
title,description,category,phone,email,website
"Best Pizza Place","Authentic Italian pizza","Restaurants","555-0123","info@pizza.com","https://pizza.com"
```

**Response (200):**
```json
{
  "file_id": "fil_123456789",
  "type": "categories",
  "filename": "categories.json",
  "records_count": 5,
  "validation_status": "VALID",
  "next_step": "LISTINGS"
}
```

**Response (422) - Validation Errors:**
```json
{
  "error": "File validation failed",
  "validation_errors": [
    {
      "row": 2,
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

### GET /tenants/:id/preview
Generate tenant preview with statistics and structure.

**Query Parameters:**
- `format`: "json" | "html" | "template" | "metadata" (default: "json")
- `include_content`: "true" | "false" (default: "false")
- `include_drafts`: "true" | "false" (default: "false")
- `max_listings`: Number (optional, limits listings in response)

**Response (200) - JSON Format:**
```json
{
  "tenant_id": "tnt_123456789",
  "name": "San Francisco Business Directory",
  "domain": "sf-business-directory",
  "status": "DRAFT",
  "preview_url": "https://sf-business-directory.example.com/preview",
  "admin_url": "https://admin.example.com/tenant/tnt_123456789",
  "statistics": {
    "categories_count": 8,
    "listings_count": 150,
    "media_files_count": 45,
    "total_pages": 163
  },
  "branding": {
    "logo_url": "https://storage.example.com/logos/logo.png",
    "primary_color": "#3B82F6",
    "secondary_color": "#1F2937",
    "accent_color": "#F59E0B",
    "font_family": "Inter",
    "font_url": "https://storage.example.com/fonts/custom.woff2"
  },
  "site_structure": {
    "pages": [
      {
        "type": "home",
        "title": "Home",
        "path": "/",
        "content": {}
      },
      {
        "type": "category",
        "title": "Restaurants",
        "path": "/category/restaurants",
        "content": {
          "description": "Local dining establishments",
          "listingsCount": 25
        }
      }
    ],
    "navigation": [
      {
        "label": "Home",
        "path": "/",
        "children": []
      },
      {
        "label": "Categories",
        "path": "/categories",
        "children": [
          {
            "label": "Restaurants",
            "path": "/category/restaurants"
          }
        ]
      }
    ]
  },
  "categories": [
    {
      "name": "Restaurants",
      "slug": "restaurants",
      "description": "Local dining establishments",
      "listings_count": 25
    }
  ],
  "listings": [
    {
      "title": "Best Pizza Place",
      "slug": "best-pizza-place",
      "description": "Authentic Italian pizza",
      "category": "Restaurants"
    }
  ],
  "readiness": {
    "issues": [],
    "warnings": [
      "Consider adding more categories for better organization"
    ]
  }
}
```

### POST /tenants/:id/publish
Start tenant publishing process.

**Response (202):**
```json
{
  "message": "Publishing started",
  "job_id": "job_123456789",
  "tenant_id": "tnt_123456789",
  "status": "QUEUED",
  "estimated_duration": "2-5 minutes"
}
```

### GET /tenants/:id/jobs/:jobId
Get publishing job status.

**Response (200):**
```json
{
  "job_id": "job_123456789",
  "tenant_id": "tnt_123456789",
  "status": "IN_PROGRESS",
  "progress": 65,
  "steps": [
    {
      "name": "Database Setup",
      "status": "COMPLETED",
      "duration": 1200
    },
    {
      "name": "Content Migration",
      "status": "IN_PROGRESS",
      "progress": 80
    },
    {
      "name": "DNS Configuration",
      "status": "PENDING"
    }
  ],
  "created_at": "2025-01-20T12:00:00.000Z",
  "updated_at": "2025-01-20T12:02:30.000Z",
  "estimated_completion": "2025-01-20T12:05:00.000Z"
}
```

**Job Status Values:**
- `QUEUED`: Job is waiting to start
- `IN_PROGRESS`: Job is currently running
- `COMPLETED`: Job finished successfully
- `FAILED`: Job failed (check error details)
- `CANCELLED`: Job was cancelled

---

## Wizard Session Management

### GET /wizard/:sessionId
Get wizard session details.

**Response (200):**
```json
{
  "id": "ses_987654321",
  "tenant_id": "tnt_123456789",
  "current_step": "BRANDING",
  "data": {
    "basic_info": {
      "name": "San Francisco Business Directory",
      "domain": "sf-business-directory"
    },
    "branding": {
      "primary_color": "#3B82F6"
    }
  },
  "created_at": "2025-01-20T10:30:00.000Z",
  "updated_at": "2025-01-20T11:15:00.000Z",
  "expires_at": "2025-01-21T10:30:00.000Z"
}
```

### PUT /wizard/:sessionId/step
Update wizard step and session data.

**Request Body:**
```json
{
  "step": "BRANDING",
  "data": {
    "primary_color": "#3B82F6",
    "secondary_color": "#1F2937",
    "font_family": "Inter"
  }
}
```

**Valid Steps:**
- `BASIC_INFO`: Tenant name and domain
- `BRANDING`: Colors, fonts, logo
- `CATEGORIES`: Category structure
- `LISTINGS`: Business listings
- `PREVIEW`: Preview and review
- `PUBLISH`: Final publication

**Response (200):**
```json
{
  "id": "ses_987654321",
  "current_step": "BRANDING",
  "data": {
    "basic_info": {
      "name": "San Francisco Business Directory",
      "domain": "sf-business-directory"
    },
    "branding": {
      "primary_color": "#3B82F6",
      "secondary_color": "#1F2937",
      "font_family": "Inter"
    }
  },
  "updated_at": "2025-01-20T11:30:00.000Z"
}
```

### POST /wizard/:sessionId/categories
Process categories data in wizard context.

**Request Body:**
```json
{
  "categories": [
    {
      "name": "Restaurants",
      "description": "Local dining establishments",
      "icon": "restaurant",
      "sort_order": 1
    },
    {
      "name": "Services",
      "description": "Professional services",
      "icon": "service",
      "sort_order": 2
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "created_count": 2,
  "categories": [
    {
      "id": "cat_123",
      "name": "Restaurants",
      "slug": "restaurants",
      "description": "Local dining establishments",
      "sort_order": 1
    },
    {
      "id": "cat_124",
      "name": "Services",
      "slug": "services",
      "description": "Professional services",
      "sort_order": 2
    }
  ]
}
```

### POST /wizard/:sessionId/listings
Process listings data in wizard context.

**Request Body:**
```json
{
  "listings": [
    {
      "title": "Best Pizza Place",
      "description": "Authentic Italian pizza",
      "category": "Restaurants",
      "phone": "555-0123",
      "email": "info@pizza.com",
      "website": "https://pizza.com"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "created_count": 1,
  "listings": [
    {
      "id": "lst_456",
      "title": "Best Pizza Place",
      "slug": "best-pizza-place",
      "description": "Authentic Italian pizza",
      "category": "Restaurants",
      "featured": true
    }
  ]
}
```

### POST /wizard/:sessionId/complete
Complete wizard and finalize tenant creation.

**Response (200):**
```json
{
  "success": true,
  "tenant_id": "tnt_123456789",
  "message": "Wizard completed successfully"
}
```

---

## Claims Management

### POST /claims/:id/verify
Submit verification evidence for a business claim (requires authentication).

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `verification_type`: "EMAIL_DOMAIN" | "PHONE_NUMBER" | "BUSINESS_DOCUMENT" | "UTILITY_BILL"
- `evidence_data`: JSON string with verification details
- `evidence_file`: PDF/JPG/PNG file (optional, max 5MB)

**Evidence Data Examples:**

Email Domain Verification:
```json
{
  "domain": "example.com",
  "email": "owner@example.com"
}
```

Phone Number Verification:
```json
{
  "phone": "+1-555-123-4567",
  "verification_code": "123456"
}
```

Business Document:
```json
{
  "document_type": "business_license",
  "document_number": "BL123456789",
  "issued_date": "2024-01-15"
}
```

**Response (200):**
```json
{
  "claim_id": "clm_123456789",
  "verification_id": "ver_987654321",
  "status": "SUBMITTED",
  "evidence_url": "https://storage.example.com/evidence/document.pdf",
  "estimated_review_time": "2-3 business days",
  "next_steps": [
    "Wait for admin review",
    "Check email for updates"
  ]
}
```

---

## Users Management

### GET /users/claims
Get current user's claims (requires authentication).

**Query Parameters:**
- `status`: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "claims": [
    {
      "id": "clm_123456789",
      "listing_id": "lst_456",
      "listing_title": "Best Pizza Place",
      "business_name": "Pizza Palace LLC",
      "status": "PENDING",
      "verification_method": "EMAIL_DOMAIN",
      "submitted_at": "2025-01-20T10:30:00.000Z",
      "expires_at": "2025-02-03T10:30:00.000Z",
      "last_updated": "2025-01-20T11:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

## Listings Management

### GET /listings/:id/claim
Get claim form data for a specific listing.

**Response (200):**
```json
{
  "listing_id": "lst_456",
  "listing_title": "Best Pizza Place",
  "business_name": "Pizza Palace LLC",
  "current_info": {
    "phone": "555-0123",
    "email": "info@pizza.com",
    "website": "https://pizza.com",
    "address": "123 Main St, San Francisco, CA"
  },
  "verification_methods": [
    {
      "type": "EMAIL_DOMAIN",
      "label": "Email Domain Verification",
      "description": "Verify ownership using business email domain",
      "requirements": ["Business email from domain pizza.com"]
    },
    {
      "type": "PHONE_NUMBER",
      "label": "Phone Number Verification",
      "description": "Verify using business phone number",
      "requirements": ["Access to business phone 555-0123"]
    }
  ],
  "claim_window_days": 14,
  "terms_url": "https://example.com/terms/claims"
}
```

### POST /listings/:id/claim
Submit a new business claim.

**Request Body:**
```json
{
  "verification_method": "EMAIL_DOMAIN",
  "contact_email": "owner@pizza.com",
  "contact_person": "John Smith",
  "relationship": "owner",
  "additional_info": "I am the owner of this business and need to update the listing information."
}
```

**Response (200):**
```json
{
  "claim_id": "clm_123456789",
  "listing_id": "lst_456",
  "status": "PENDING",
  "verification_method": "EMAIL_DOMAIN",
  "contact_email": "owner@pizza.com",
  "expires_at": "2025-02-03T10:30:00.000Z",
  "next_steps": [
    "Check your email for verification instructions",
    "Complete verification within 14 days"
  ],
  "estimated_review_time": "2-3 business days"
}
```

---

## Error Responses

### Error Format
All errors follow a consistent format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "field": "field_name",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `202` - Accepted (async operation started)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `413` - Payload Too Large (file size exceeded)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Codes

- `VALIDATION_ERROR` - Field validation failed
- `INVALID_FILE_FORMAT` - Unsupported file format
- `FILE_TOO_LARGE` - File exceeds size limit
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INSUFFICIENT_PERMISSIONS` - Access denied
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `EXTERNAL_SERVICE_ERROR` - Third-party service failure

### Example Error Responses

**Validation Error (400):**
```json
{
  "error": "Invalid email format",
  "field": "email",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

**Rate Limit Error (429):**
```json
{
  "error": "Too many login attempts",
  "message": "Please wait 15 minutes before trying again",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 900,
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

**File Upload Error (413):**
```json
{
  "error": "File too large: maximum file size is 10MB",
  "code": "FILE_TOO_LARGE",
  "max_size": 10485760,
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Performance Targets

- **Wizard step transitions**: < 2 seconds
- **File processing**: < 30 seconds for 10MB files
- **Preview generation**: < 10 seconds
- **Publishing workflow**: < 5 minutes end-to-end
- **API response time**: < 500ms for standard requests

---

## File Upload Specifications

### Supported File Types

**Logo Files:**
- Formats: PNG, JPG, SVG
- Max size: 5MB
- Recommended: 512x512px, PNG with transparency

**Font Files:**
- Formats: TTF, OTF, WOFF, WOFF2
- Max size: 2MB

**Evidence Files:**
- Formats: PDF, JPG, PNG
- Max size: 5MB

**Data Files:**
- Formats: CSV, JSON
- Max size: 10MB
- Max records: 10,000 per file

### CSV Format Requirements

**Categories File:**
```csv
name,description,icon,sort_order
"Restaurants","Local dining establishments","restaurant",1
"Services","Professional services","service",2
```

**Listings File:**
```csv
title,description,category,phone,email,website,address
"Best Pizza Place","Authentic Italian pizza","Restaurants","555-0123","info@pizza.com","https://pizza.com","123 Main St"
```

---

## Webhook Events

The API can send webhook notifications for important events:

### Webhook Endpoints Configuration
Configure webhook URLs in your tenant settings to receive event notifications.

### Event Types

- `tenant.published` - Tenant successfully published
- `tenant.publish_failed` - Tenant publishing failed
- `claim.submitted` - New claim submitted
- `claim.verified` - Claim verification completed
- `user.registered` - New user registered

### Webhook Payload Example

```json
{
  "event": "tenant.published",
  "data": {
    "tenant_id": "tnt_123456789",
    "domain": "sf-business-directory",
    "published_url": "https://sf-business-directory.example.com",
    "published_at": "2025-01-20T12:00:00.000Z"
  },
  "timestamp": "2025-01-20T12:00:00.000Z",
  "webhook_id": "wh_987654321"
}
```

---

## SDK and Integration Examples

### JavaScript/Node.js Example

```javascript
const DirectoryWizardAPI = require('@directorywizard/api-client');

const client = new DirectoryWizardAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.directorywizard.com/api'
});

// Create a new tenant
const tenant = await client.tenants.create({
  name: 'My Directory',
  domain: 'my-directory'
});

// Upload categories
const categoriesFile = fs.readFileSync('categories.json');
await client.tenants.upload(tenant.id, categoriesFile, 'categories');

// Start publishing
const job = await client.tenants.publish(tenant.id);
console.log(`Publishing started: ${job.job_id}`);
```

### Python Example

```python
import requests
import json

class DirectoryWizardAPI:
    def __init__(self, api_key, base_url="https://api.directorywizard.com/api"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def create_tenant(self, name, domain):
        response = self.session.post(f'{self.base_url}/tenants',
            json={'name': name, 'domain': domain})
        return response.json()

    def get_tenant(self, tenant_id):
        response = self.session.get(f'{self.base_url}/tenants/{tenant_id}')
        return response.json()

# Usage
api = DirectoryWizardAPI('your-api-key')
tenant = api.create_tenant('My Directory', 'my-directory')
print(f"Created tenant: {tenant['id']}")
```

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Complete wizard workflow support
- Tenant management and publishing
- Claims and verification system
- File upload and processing
- Authentication and authorization
- Webhook notifications

---

This documentation covers all API endpoints with comprehensive examples, validation rules, error handling, and integration guidance for the Directory Wizard application.