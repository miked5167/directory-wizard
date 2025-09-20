import { Router, Request, Response, NextFunction } from 'express';
import {
  TenantService,
  WizardService,
  FileService,
  ProvisioningService,
  PreviewService,
} from '../services';
import { TenantBrandingModel } from '../models';
import { brandingUpload, fileUpload } from '../middleware/upload';
import { ValidationUtils } from '../utils/validation';
import { FileProcessor } from '../utils/fileProcessor';
import { ValidationError, NotFoundError } from '../middleware/errorMiddleware';

const router = Router();

// POST /api/tenants - Create a new tenant
router.post('/', async (req, res, next): Promise<void> => {
  try {
    const { name, domain } = req.body;

    // Validate name
    const nameValidation = ValidationUtils.validateTenantName(name);
    if (!nameValidation.isValid) {
      throw new ValidationError(nameValidation.error || 'Invalid name', 'name');
    }

    // Validate domain
    const domainValidation = ValidationUtils.validateDomain(domain);
    if (!domainValidation.isValid) {
      throw new ValidationError(domainValidation.error || 'Invalid domain', 'domain');
    }

    const result = await TenantService.createTenant({ name, domain });

    res.status(201).json({
      id: result.tenant.id,
      name: result.tenant.name,
      domain: result.tenant.domain,
      status: result.tenant.status,
      session_id: result.sessionId,
      next_step: 'BRANDING',
      created_at: result.tenant.createdAt,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// GET /api/tenants/:id - Get tenant by ID
router.get('/:id', async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tenant = await TenantService.getTenant(id!);

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
      branding: tenant.branding,
      categories: tenant.categories,
      listings: tenant.listings,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
      published_at: tenant.publishedAt,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// PUT /api/tenants/:id - Update tenant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (domain) updateData.domain = domain;

    const tenant = await TenantService.updateTenant(id, updateData);

    return res.json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
      updated_at: tenant.updatedAt,
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return res.status(500).json({
      error: 'Failed to update tenant',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/tenants/:id/upload - File upload endpoint
router.post('/:id/upload', fileUpload, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    // Validate tenant ID
    const tenantIdValidation = ValidationUtils.validateTenantId(id);
    if (!tenantIdValidation.isValid) {
      return res.status(400).json({
        error: tenantIdValidation.error,
      });
    }

    // Validate type parameter
    const typeValidation = ValidationUtils.validateUploadType(type as string);
    if (!typeValidation.isValid) {
      return res.status(400).json({
        error: typeValidation.error,
      });
    }

    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'File is required',
      });
    }

    // Check if tenant exists
    const tenant = await TenantService.getTenant(id!);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found: invalid tenant ID',
      });
    }

    // Validate file type based on upload type
    const file = req.file;
    const fileTypeValidation = FileProcessor.validateFileType(file, type as string);
    if (!fileTypeValidation.isValid) {
      return res.status(400).json({
        error: fileTypeValidation.error,
      });
    }

    // Process the file content
    const fileContent = file.buffer.toString('utf8');
    let processingResult;

    if (type === 'categories') {
      processingResult = FileProcessor.processCategories(fileContent);
    } else {
      processingResult = FileProcessor.processListings(fileContent);
    }

    if (processingResult.validationStatus === 'INVALID') {
      return res.status(422).json({
        error: 'File validation failed',
        validation_errors: processingResult.validationErrors,
      });
    }

    // Save file (mock implementation)
    const result = await FileService.uploadFile(id!, file, type as string);

    // Actually process and save the data to the database
    if (type === 'categories') {
      // Parse and save categories directly to the tenant
      const categories = JSON.parse(fileContent);
      const { CategoryModel } = await import('../models');

      for (const categoryData of categories) {
        await CategoryModel.create({
          tenantId: id!,
          name: categoryData.name,
          slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
          description: categoryData.description || '',
          icon: categoryData.icon || '',
          sortOrder: categoryData.sort_order || 0,
        });
      }
    } else if (type === 'listings') {
      // Parse and save listings (simplified CSV parsing)
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
      const { ListingModel, CategoryModel } = await import('../models');

      // Get first category for listings (simplified approach)
      const categories = await CategoryModel.findByTenant(id!);
      const firstCategoryId = categories[0]?.id;

      if (firstCategoryId) {
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]?.split(',').map(v => v.trim().replace(/"/g, '')) || [];
          const title = values[headers.indexOf('title')];
          const description = values[headers.indexOf('description')];

          if (title && description) {
            await ListingModel.create({
              tenantId: id!,
              categoryId: firstCategoryId,
              title,
              slug: title.toLowerCase().replace(/\s+/g, '-'),
              description,
              featured: true, // Set as featured for preview
              data: {},
              searchText: `${title} ${description}`,
            });
          }
        }
      }
    }

    // Determine next step
    const nextStep = type === 'categories' ? 'LISTINGS' : 'PREVIEW';

    return res.json({
      file_id: result.id,
      type: type,
      filename: file.originalname,
      records_count: processingResult.recordsCount,
      validation_status: processingResult.validationStatus,
      next_step: nextStep,
    });
  } catch (error) {
    console.error('Error uploading file:', error);

    // Handle multer errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large: maximum file size is 10MB',
        });
      }
    }

    return res.status(500).json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/tenants/:id/branding - Update tenant branding
router.put('/:id/branding', brandingUpload, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate tenant ID
    const tenantIdValidation = ValidationUtils.validateTenantId(id);
    if (!tenantIdValidation.isValid) {
      return res.status(400).json({
        error: tenantIdValidation.error,
      });
    }

    // Validate required color fields
    const { primary_color, secondary_color, accent_color, font_family, session_id } = req.body;

    // Validate colors
    const primaryColorValidation = ValidationUtils.validateHexColor(primary_color, 'primary_color');
    if (!primaryColorValidation.isValid) {
      return res.status(400).json({
        error: primaryColorValidation.error,
      });
    }

    const secondaryColorValidation = ValidationUtils.validateHexColor(
      secondary_color,
      'secondary_color'
    );
    if (!secondaryColorValidation.isValid) {
      return res.status(400).json({
        error: secondaryColorValidation.error,
      });
    }

    const accentColorValidation = ValidationUtils.validateHexColor(accent_color, 'accent_color');
    if (!accentColorValidation.isValid) {
      return res.status(400).json({
        error: accentColorValidation.error,
      });
    }

    // Validate font family
    const fontFamilyValidation = ValidationUtils.validateFontFamily(font_family);
    if (!fontFamilyValidation.isValid) {
      return res.status(400).json({
        error: fontFamilyValidation.error,
      });
    }

    // Check if tenant exists
    const tenant = await TenantService.getTenant(id!);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found: invalid tenant ID',
      });
    }

    // Process file uploads
    let logoUrl = null;
    let fontUrl = null;

    if (files?.logo?.[0]) {
      const logoFile = files.logo[0];
      const logoResult = await FileService.uploadFile(id!, logoFile, 'logo');
      logoUrl = logoResult.url;
    }

    if (files?.font_file?.[0]) {
      const fontFile = files.font_file[0];
      const fontResult = await FileService.uploadFile(id!, fontFile, 'font');
      fontUrl = fontResult.url;
    }

    // Create branding data
    const brandingData: any = {
      primaryColor: primary_color,
      secondaryColor: secondary_color,
      accentColor: accent_color,
      fontFamily: font_family,
      themeJson: {
        colors: {
          primary: primary_color,
          secondary: secondary_color,
          accent: accent_color,
        },
        fonts: {
          family: font_family,
          url: fontUrl,
        },
      },
    };

    // Only include URLs if they exist
    if (logoUrl) {
      brandingData.logoUrl = logoUrl;
    }
    if (fontUrl) {
      brandingData.fontUrl = fontUrl;
    }

    // If session_id is provided, use wizard service
    if (session_id) {
      await WizardService.updateBranding(session_id, brandingData);
    } else {
      // Direct branding update
      await TenantBrandingModel.update(id!, brandingData);
    }

    return res.json({
      tenant_id: id,
      branding: {
        logo_url: logoUrl || '',
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        font_url: fontUrl || '',
      },
      next_step: 'CATEGORIES',
    });
  } catch (error) {
    console.error('Error updating branding:', error);

    // Handle multer errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large: maximum size is 10MB',
        });
      }
    }

    // Handle file validation errors from multer fileFilter
    if (error instanceof Error) {
      if (error.message.includes('logo') || error.message.includes('Logo')) {
        return res.status(400).json({
          error: error.message,
        });
      }
      if (error.message.includes('format') || error.message.includes('Font')) {
        return res.status(400).json({
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      error: 'Failed to update branding',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/tenants/:id/preview - Get tenant preview with statistics
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { format, include_content, include_drafts, max_listings } = req.query;

    // Validate tenant ID
    const tenantIdValidation = ValidationUtils.validateTenantId(id);
    if (!tenantIdValidation.isValid) {
      return res.status(400).json({
        error: tenantIdValidation.error,
      });
    }

    // Check if tenant exists first
    const tenant = await TenantService.getTenant(id!);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    // Validate preview readiness
    const readinessCheck = await PreviewService.validatePreviewReadiness(id!);

    // Configure preview options
    const config: any = {
      includeContent: include_content === 'true',
      includeDrafts: include_drafts === 'true',
    };

    if (max_listings) {
      config.maxListings = parseInt(max_listings as string);
    }

    // Handle different response formats
    if (format === 'html') {
      const htmlPreview = await PreviewService.generateHTMLPreview(id!);
      return res.set('Content-Type', 'text/html').send(htmlPreview);
    }

    if (format === 'template') {
      const template = await PreviewService.generateSiteTemplate(id!);
      return res.json(template);
    }

    if (format === 'metadata') {
      const metadata = await PreviewService.generateSiteMetadata(id!);
      return res.json(metadata);
    }

    // Default: comprehensive preview data
    const previewData = await PreviewService.generatePreview(id!, config);

    // Transform response to match API contract (snake_case)
    return res.json({
      tenant_id: previewData.tenantId,
      name: previewData.name,
      domain: previewData.domain,
      status: previewData.status,
      preview_url: `https://${previewData.domain}.example.com/preview`,
      admin_url: previewData.adminUrl,
      statistics: {
        categories_count: previewData.statistics.categoriesCount,
        listings_count: previewData.statistics.listingsCount,
        media_files_count: previewData.statistics.mediaFilesCount,
        total_pages: previewData.statistics.totalPages,
      },
      branding: {
        logo_url: previewData.branding.logoUrl,
        primaryColor: previewData.branding.primaryColor,
        secondaryColor: previewData.branding.secondaryColor,
        accentColor: previewData.branding.accentColor,
        fontFamily: previewData.branding.fontFamily,
        font_url: previewData.branding.fontUrl,
        primary_color: previewData.branding.primaryColor,
        secondary_color: previewData.branding.secondaryColor,
        accent_color: previewData.branding.accentColor,
        font_family: previewData.branding.fontFamily,
      },
      site_structure: {
        pages: previewData.siteStructure.pages,
        navigation: previewData.siteStructure.navigation,
      },
      categories: previewData.siteStructure.pages
        .filter(p => p.type === 'category')
        .map(p => ({
          name: p.title,
          slug: p.path.replace('/category/', ''),
          description: (p.content as any)?.description || '',
          listings_count: (p.content as any)?.listingsCount || 0,
        })),
      listings: previewData.siteStructure.pages
        .filter(p => p.type === 'listing')
        .map(p => ({
          title: p.title,
          slug: p.path.replace('/listing/', ''),
          description: (p.content as any)?.description || '',
          category: (p.content as any)?.category || '',
        })),
      readiness: {
        issues: readinessCheck.issues,
        warnings: readinessCheck.warnings,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant preview:', error);
    return res.status(500).json({
      error: 'Failed to fetch tenant preview',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/tenants/:id/publish - Publish tenant (start provisioning job)
router.post('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate tenant ID
    const tenantIdValidation = ValidationUtils.validateTenantId(id);
    if (!tenantIdValidation.isValid) {
      return res.status(400).json({
        error: tenantIdValidation.error,
      });
    }

    // Check if tenant exists
    const tenant = await TenantService.getTenant(id!);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found: invalid tenant ID',
      });
    }

    // Check if tenant is ready for publishing
    if (tenant.status === 'UPDATING') {
      return res.status(409).json({
        error: 'Tenant is already being published',
      });
    }

    // Update tenant status to UPDATING
    await TenantService.updateTenantStatus(id!, 'UPDATING');

    // Start provisioning job
    const jobId = await ProvisioningService.createProvisioningJob({
      tenantId: id!,
      type: tenant.status === 'PUBLISHED' ? 'REPUBLISH' : 'CREATE',
    });

    return res.status(202).json({
      message: 'Publishing started',
      job_id: jobId,
      tenant_id: id,
      status: 'QUEUED',
      estimated_duration: '2-5 minutes',
    });
  } catch (error) {
    console.error('Error publishing tenant:', error);
    return res.status(500).json({
      error: 'Failed to start publishing',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/tenants/:id/jobs/:jobId - Get publishing job status
router.get('/:id/jobs/:jobId', async (req, res) => {
  try {
    const { id, jobId } = req.params;

    // Validate tenant ID
    const tenantIdValidation = ValidationUtils.validateTenantId(id);
    if (!tenantIdValidation.isValid) {
      return res.status(400).json({
        error: tenantIdValidation.error,
      });
    }

    // Check if tenant exists
    const tenant = await TenantService.getTenant(id!);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    // Get job status from ProvisioningService
    const jobStatus = await ProvisioningService.getJobStatus(jobId!);
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    // Verify the job belongs to this tenant
    if (jobStatus.tenant_id !== id) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    return res.json(jobStatus);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return res.status(500).json({
      error: 'Failed to fetch job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
