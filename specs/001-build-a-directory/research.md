# Research: Directory Creation Wizard

## Multi-tenant Architecture Patterns

**Decision**: Database-per-tenant with shared application layer

**Rationale**:
- Provides complete data isolation between tenants
- Simplifies compliance and data sovereignty requirements
- Allows per-tenant schema customization if needed
- Scales horizontally by distributing tenant databases

**Alternatives considered**:
- Shared database with tenant_id: Simpler but creates data isolation risks
- Separate applications per tenant: Complete isolation but operational complexity

**Implementation approach**:
- Single Next.js application with dynamic database connections
- Tenant resolution via subdomain or path-based routing
- Connection pooling per tenant database

## File Upload and Processing

**Decision**: Streaming uploads with validation pipeline

**Rationale**:
- Handles large CSV/JSON files efficiently without memory limits
- Enables real-time validation feedback during upload
- Supports progress tracking and cancellation
- Early error detection reduces processing time

**Alternatives considered**:
- Buffer entire file in memory: Simple but limited by server memory
- Client-side validation only: Fast but insecure and incomplete

**Implementation approach**:
- Use multer with stream processing for Node.js backend
- CSV parsing with streaming validation using fast-csv
- JSON schema validation using ajv with streaming parser
- Progress tracking via WebSocket connections

## External Service Integration Patterns

**Decision**: Saga pattern with compensating transactions

**Rationale**:
- Ensures data consistency across Supabase, Typesense, Stripe, and Vercel
- Provides rollback capability when any service fails
- Enables retry logic with exponential backoff
- Maintains audit trail of provisioning steps

**Alternatives considered**:
- Two-phase commit: Complex to implement across HTTP services
- Eventual consistency: Acceptable for some operations but not tenant provisioning

**Implementation approach**:
- Orchestrator service manages provisioning workflow
- Each external service wrapped with compensating action
- State machine tracks provisioning progress
- Failed provisions automatically rolled back

## Wizard State Management

**Decision**: Server-side session storage with client-side form state

**Rationale**:
- Enables users to save progress and return later
- Handles browser refresh and navigation away gracefully
- Supports large file uploads that exceed client memory
- Maintains security by validating all data server-side

**Alternatives considered**:
- Client-only state: Fast but lost on refresh, insecure
- Database persistence per step: Durable but adds complexity

**Implementation approach**:
- Redis sessions store wizard progress and uploaded file references
- React Hook Form manages client-side form validation
- Periodic auto-save to server reduces data loss
- Resume capability by restoring from session on return

## Preview Generation Strategy

**Decision**: Lightweight in-memory tenant simulation

**Rationale**:
- Fast preview generation without full provisioning overhead
- Uses actual directory kernel rendering engine for accuracy
- Sandboxed environment prevents data corruption
- Supports real-time preview updates as user makes changes

**Alternatives considered**:
- Full provisioning for preview: Accurate but slow and resource-intensive
- Static mockups: Fast but potentially misleading

**Implementation approach**:
- Temporary tenant configuration in isolated container
- Mock data injection based on uploaded categories/listings
- Static asset generation for branding preview
- Cleanup process removes preview artifacts

## Domain Management and Validation

**Decision**: Integration with domain registrar APIs for availability checking

**Rationale**:
- Real-time domain validation prevents conflicts
- Supports both subdomain and custom domain workflows
- Integrates with DNS management for automatic setup
- Handles domain transfer and ownership verification

**Alternatives considered**:
- Manual domain management: Error-prone and slow
- Basic string validation only: Allows invalid/taken domains

**Implementation approach**:
- Domain availability checking via registrar APIs
- DNS record automation for subdomain setup
- Custom domain validation with TXT record verification
- Integration with Vercel domains API for deployment

## Error Handling and Recovery

**Decision**: Comprehensive error categorization with user-friendly recovery options

**Rationale**:
- Different error types require different recovery strategies
- Users need clear guidance on how to resolve issues
- System should recover automatically where possible
- Failed operations should not leave system in inconsistent state

**Error categories**:
- Validation errors: Immediate feedback with correction guidance
- Upload errors: Retry capability with different file format suggestions
- External service errors: Automatic retry with fallback options
- System errors: Graceful degradation with support contact information

**Implementation approach**:
- Structured error codes with internationalization support
- Error boundary components in React for graceful UI degradation
- Retry mechanisms with exponential backoff and circuit breakers
- Comprehensive logging for debugging and monitoring