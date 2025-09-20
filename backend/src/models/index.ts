// Re-export Prisma client for convenience
export { PrismaClient } from '@prisma/client';

// Initialize Prisma client
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Basic model interfaces that match the Prisma schema
export interface TenantCreateData {
  name: string;
  domain: string;
}

export interface AdminSessionCreateData {
  tenantId?: string;
  adminUserId: string;
  step: 'BASIC_INFO' | 'BRANDING' | 'CATEGORIES' | 'LISTINGS' | 'PREVIEW' | 'PUBLISH';
  data?: any;
  expiresAt: Date;
}

export interface CategoryCreateData {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string;
}

export interface ListingCreateData {
  tenantId: string;
  categoryId: string;
  title: string;
  slug: string;
  description?: string;
  featured?: boolean;
  data?: any;
  searchText: string;
  coordinates?: string;
}

export interface TenantBrandingCreateData {
  tenantId: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontUrl?: string;
  themeJson: any;
}

// Simple model classes with basic CRUD operations
export class TenantModel {
  static async create(data: TenantCreateData) {
    return await prisma.tenant.create({
      data: {
        name: data.name,
        domain: data.domain,
        status: 'DRAFT',
      },
    });
  }

  static async findById(id: string) {
    return await prisma.tenant.findUnique({
      where: { id },
      include: {
        branding: true,
        categories: true,
        listings: true,
      },
    });
  }

  static async findByDomain(domain: string) {
    return await prisma.tenant.findUnique({
      where: { domain },
      include: {
        branding: true,
        categories: true,
        listings: true,
      },
    });
  }

  static async update(id: string, data: Partial<TenantCreateData>) {
    return await prisma.tenant.update({
      where: { id },
      data,
    });
  }

  static async updateStatus(
    id: string,
    status: 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'UPDATING' | 'FAILED'
  ) {
    const updateData: any = { status };

    // Set publishedAt when status is PUBLISHED
    if (status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    return await prisma.tenant.update({
      where: { id },
      data: updateData,
    });
  }
}

export class AdminSessionModel {
  static async create(data: AdminSessionCreateData) {
    return await prisma.adminSession.create({
      data,
    });
  }

  static async findById(id: string) {
    return await prisma.adminSession.findUnique({
      where: { id },
      include: {
        tenant: true,
      },
    });
  }

  static async findByTenant(tenantId: string) {
    return await prisma.adminSession.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async update(id: string, data: Partial<AdminSessionCreateData>) {
    return await prisma.adminSession.update({
      where: { id },
      data,
    });
  }
}

export class CategoryModel {
  static async create(data: CategoryCreateData) {
    return await prisma.category.create({
      data,
    });
  }

  static async findByTenant(tenantId: string) {
    return await prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

export class ListingModel {
  static async create(data: ListingCreateData) {
    return await prisma.listing.create({
      data: {
        ...data,
        status: 'DRAFT',
      },
    });
  }

  static async findByTenant(tenantId: string) {
    return await prisma.listing.findMany({
      where: { tenantId },
      include: {
        category: true,
      },
    });
  }

  static async findById(id: string) {
    return await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        tenant: true,
      },
    });
  }

  static async update(id: string, data: Partial<ListingCreateData>) {
    return await prisma.listing.update({
      where: { id },
      data,
      include: {
        category: true,
        tenant: true,
      },
    });
  }
}

export class TenantBrandingModel {
  static async create(data: TenantBrandingCreateData) {
    return await prisma.tenantBranding.create({
      data,
    });
  }

  static async findByTenant(tenantId: string) {
    return await prisma.tenantBranding.findUnique({
      where: { tenantId },
    });
  }

  static async update(tenantId: string, data: Partial<TenantBrandingCreateData>) {
    return await prisma.tenantBranding.upsert({
      where: { tenantId },
      create: {
        tenantId,
        primaryColor: data.primaryColor || '#000000',
        secondaryColor: data.secondaryColor || '#ffffff',
        accentColor: data.accentColor || '#ff0000',
        fontFamily: data.fontFamily || 'Arial',
        themeJson: data.themeJson || {},
        ...data,
      },
      update: data,
    });
  }
}
