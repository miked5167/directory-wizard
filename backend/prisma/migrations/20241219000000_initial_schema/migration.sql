-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "published_at" DATETIME
);

-- CreateTable
CREATE TABLE "tenant_branding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT NOT NULL,
    "accent_color" TEXT NOT NULL,
    "font_family" TEXT NOT NULL,
    "font_url" TEXT,
    "theme_json" TEXT NOT NULL,
    CONSTRAINT "tenant_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "search_text" TEXT NOT NULL,
    "coordinates" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "listing_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    CONSTRAINT "listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "listing_claims" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claim_method" TEXT NOT NULL,
    "verification_data" TEXT NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    "reviewer_notes" TEXT,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "listing_claims_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "listing_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "listing_claim_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claim_id" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "evidence_url" TEXT NOT NULL,
    "evidence_data" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_claim_verifications_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "listing_claims" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "admin_user_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "admin_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "validation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "validation_errors" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uploaded_files_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "admin_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "provisioning_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT NOT NULL,
    "steps_total" INTEGER NOT NULL,
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "external_refs" TEXT,
    "compensation_data" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provisioning_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_tenant_id_key" ON "tenant_branding"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_slug_key" ON "categories"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "listings_tenant_id_slug_key" ON "listings"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_password_reset_token_key" ON "users"("password_reset_token");