# Claude Code Context: Directory Creation Wizard

## Project Overview
Multi-tenant Directory Creation Wizard - A web application that enables platform administrators to create and manage directory websites through a guided interface.

## Architecture
- **Frontend**: Next.js with TypeScript, React Hook Form, Tailwind CSS
- **Backend**: Node.js with Express/Fastify, Prisma ORM
- **Database**: PostgreSQL via Supabase
- **File Storage**: Supabase Storage for media assets
- **External Services**: Typesense (search), Stripe (payments), Vercel (deployment)

## Key Technical Patterns

### Multi-tenant Data Isolation
- Database-per-tenant pattern with shared application layer
- Dynamic database connections based on tenant resolution
- Tenant-scoped data access with connection pooling

### File Processing Pipeline
- Streaming upload processing with multer
- Real-time validation using ajv for JSON, fast-csv for CSV
- Progress tracking via WebSocket connections
- Temporary file storage with automatic cleanup

### External Service Integration
- Saga pattern for provisioning workflow with compensating transactions
- Circuit breaker pattern for service resilience
- Retry logic with exponential backoff
- Comprehensive error categorization and recovery

### State Management
- Server-side session storage in Redis
- Client-side form state with React Hook Form
- Progress persistence with auto-save capability
- Resume functionality across browser sessions

## Data Model Key Entities
- **Tenant**: Core directory site with domain, branding, and content
- **Category**: Hierarchical organization with max 5 levels nesting
- **Listing**: Flexible schema entries with full-text search
- **AdminSession**: Wizard progress tracking with expiration
- **ProvisioningJob**: Background process orchestration

## API Design Patterns
- RESTful endpoints with OpenAPI specification
- Multipart form uploads for file handling
- Async job processing with status polling
- Comprehensive error responses with recovery guidance

## Security Considerations
- File upload validation and virus scanning
- Tenant data isolation enforcement
- Domain ownership verification
- Rate limiting on file uploads and API calls

## Performance Targets
- Wizard step transitions: <2 seconds
- File processing: <30 seconds for 10MB files
- Preview generation: <10 seconds
- Publishing workflow: <5 minutes end-to-end

## Testing Strategy
- Contract tests for all API endpoints
- Integration tests for complete wizard flows
- Component tests for React forms and uploads
- E2E tests using Cypress for critical paths

## Recent Changes
1. Created comprehensive data model with state transitions
2. Designed API contracts for wizard workflow
3. Implemented saga pattern for external service provisioning
4. Added session management for wizard state persistence

## Development Guidelines
- TDD approach with tests before implementation
- Streaming file processing for large uploads
- Graceful error handling with user-friendly messages
- Comprehensive logging for debugging and monitoring