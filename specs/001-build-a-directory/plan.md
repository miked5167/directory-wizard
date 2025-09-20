# Implementation Plan: Directory Creation Wizard

**Branch**: `001-build-a-directory` | **Date**: 2025-09-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-build-a-directory/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Detect Project Type from context: web=frontend+backend
   → Set Structure Decision: Option 2 (Web application)
3. Fill the Constitution Check section ✓
4. Evaluate Constitution Check section ✓
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md ✓
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✓
7. Re-evaluate Constitution Check section ✓
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach ✓
9. STOP - Ready for /tasks command ✓
```

## Summary
Build a web-based Directory Creation Wizard that enables platform administrators to create multi-tenant directory sites through a guided interface. The system accepts tenant configuration (branding, domain), content uploads (categories JSON, listings CSV), generates complete tenant packages, and provisions fully functional directory websites with integrated external services (Supabase, Typesense, Stripe, Vercel).

## Technical Context
**Language/Version**: TypeScript/Node.js (backend), React/TypeScript (frontend)
**Primary Dependencies**: Next.js, Prisma ORM, Supabase SDK, Typesense client, Stripe SDK, Vercel API
**Storage**: Supabase (PostgreSQL) for tenant/listing data, file storage for media assets
**Testing**: Jest for unit tests, Cypress for E2E testing, Vitest for component testing
**Target Platform**: Web application (responsive design)
**Project Type**: web - determines source structure (frontend + backend)
**Performance Goals**: <2s wizard step transitions, <5s tenant provisioning, file uploads up to 10MB
**Constraints**: Multi-tenant isolation, secure file handling, external service failure resilience
**Scale/Scope**: Support 100+ concurrent tenants, handle 1000+ listings per tenant, 50MB total tenant package size

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since the constitution is still in template form, applying general software engineering principles:
- ✅ Feature follows single responsibility (tenant creation and management)
- ✅ Modular design with clear separation between wizard UI, file processing, and provisioning
- ✅ Test-first approach planned with contract tests and integration scenarios
- ✅ Error handling and validation specified in requirements
- ⚠️ External service dependencies create complexity - justified by multi-tenant provisioning requirements

## Project Structure

### Documentation (this feature)
```
specs/001-build-a-directory/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (frontend + backend)
backend/
├── src/
│   ├── models/          # Tenant, Category, Listing entities
│   ├── services/        # File processing, provisioning, external APIs
│   ├── api/             # REST endpoints for wizard operations
│   └── lib/             # Utilities, validation, configuration
└── tests/
    ├── contract/        # API contract tests
    ├── integration/     # End-to-end provisioning tests
    └── unit/            # Service and utility tests

frontend/
├── src/
│   ├── components/      # Wizard steps, forms, file uploads
│   ├── pages/           # Wizard flow pages, tenant management
│   ├── services/        # API clients, state management
│   └── lib/             # Utilities, validation helpers
└── tests/
    ├── e2e/             # Cypress tests for complete flows
    ├── integration/     # Component integration tests
    └── unit/            # Component unit tests
```

**Structure Decision**: Option 2 (Web application) - frontend React app + backend API for multi-tenant wizard

## Phase 0: Outline & Research

**Research Tasks Completed**:

1. **Multi-tenant architecture patterns**:
   - Decision: Database-per-tenant with shared application layer
   - Rationale: Provides data isolation while maintaining single codebase
   - Alternatives considered: Shared database with tenant_id, separate applications per tenant

2. **File upload and processing**:
   - Decision: Streaming uploads with validation pipeline
   - Rationale: Handles large files efficiently with early error detection
   - Alternatives considered: Buffer entire file in memory, client-side validation only

3. **External service integration patterns**:
   - Decision: Saga pattern with compensating transactions
   - Rationale: Ensures consistency across multiple service calls with rollback capability
   - Alternatives considered: Two-phase commit, eventual consistency

4. **Wizard state management**:
   - Decision: Server-side session storage with client-side form state
   - Rationale: Enables progress saving and recovery across browser sessions
   - Alternatives considered: Client-only state, database persistence per step

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

**Completed Artifacts**:

1. **Data Model** (`data-model.md`):
   - Tenant entity with configuration, branding, and status fields
   - Category entity with hierarchical structure and metadata
   - Listing entity with flexible schema and search attributes
   - AdminSession entity for wizard state persistence
   - ProvisioningJob entity for background process tracking

2. **API Contracts** (`/contracts/`):
   - POST /api/tenants - Create new tenant wizard session
   - POST /api/tenants/{id}/upload - Handle file uploads (categories/listings)
   - GET /api/tenants/{id}/preview - Generate preview data
   - POST /api/tenants/{id}/publish - Provision and publish tenant
   - PUT /api/tenants/{id}/update - Update existing tenant

3. **Contract Tests**:
   - Schema validation for all request/response bodies
   - Error response format verification
   - File upload boundary testing

4. **Integration Test Scenarios** (`quickstart.md`):
   - Complete tenant creation flow from start to publish
   - File upload validation and error handling
   - Preview generation and accuracy verification
   - External service failure recovery

5. **Agent Context** (`CLAUDE.md`):
   - Updated with Next.js, Prisma, Supabase integration patterns
   - Multi-tenant architecture guidelines
   - File processing and validation approaches

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API contract → contract test task [P]
- Each data entity → model creation task [P]
- Each user story → integration test task
- File processing → validation and transformation tasks
- External service integration → provisioning tasks with error handling

**Ordering Strategy**:
- TDD order: Contract tests → Entity models → Service layer → API endpoints → Frontend components
- Dependency order: Data models → Services → API → UI components
- Mark [P] for parallel execution within same layer

**Estimated Output**: 35-40 numbered, ordered tasks covering:
- 5 contract test tasks
- 6 data model tasks
- 8 service layer tasks
- 7 API endpoint tasks
- 10 frontend component tasks
- 5 integration test tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitution violations requiring justification*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*