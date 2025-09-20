import { prisma } from '../models';

export interface PreviewData {
  tenantId: string;
  name: string;
  domain: string;
  status: string;
  previewUrl: string;
  adminUrl: string;
  statistics: {
    categoriesCount: number;
    listingsCount: number;
    mediaFilesCount: number;
    totalPages: number;
  };
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontUrl?: string;
  };
  siteStructure: {
    pages: Array<{
      path: string;
      title: string;
      type: 'home' | 'category' | 'listing' | 'search' | 'about';
      content?: any;
    }>;
    navigation: Array<{
      label: string;
      path: string;
      children?: Array<{ label: string; path: string }>;
    }>;
  };
}

export interface PreviewConfiguration {
  includeContent: boolean;
  includeDrafts: boolean;
  maxListings?: number;
  theme?: 'light' | 'dark' | 'auto';
}

export interface SiteTemplate {
  name: string;
  version: string;
  layout: 'grid' | 'list' | 'masonry';
  components: {
    header: any;
    footer: any;
    sidebar?: any;
    content: any;
  };
  styles: {
    css: string;
    variables: Record<string, string>;
  };
}

export class PreviewService {
  // Generate complete preview data for a tenant
  static async generatePreview(
    tenantId: string,
    config: PreviewConfiguration = { includeContent: true, includeDrafts: false }
  ): Promise<PreviewData> {
    // Get tenant with all relations
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branding: true,
        categories: {
          include: {
            listings: {
              where: config.includeDrafts ? {} : { featured: true },
              take: config.maxListings || 50,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Calculate statistics
    const categories = (tenant as any).categories || [];
    const statistics = {
      categoriesCount: categories.length,
      listingsCount: categories.reduce(
        (total: number, cat: any) => total + (cat.listings?.length || 0),
        0
      ),
      mediaFilesCount: 0, // TODO: Implement media files counting
      totalPages:
        1 +
        categories.length +
        categories.reduce((total: number, cat: any) => total + (cat.listings?.length || 0), 0),
    };

    // Generate site structure
    const siteStructure = this.generateSiteStructure(tenant, config);

    // Format branding data
    const tenantBranding = (tenant as any).branding;
    const branding = {
      logoUrl: tenantBranding?.logoUrl,
      primaryColor: tenantBranding?.primaryColor || '#000000',
      secondaryColor: tenantBranding?.secondaryColor || '#ffffff',
      accentColor: tenantBranding?.accentColor || '#007bff',
      fontFamily: tenantBranding?.fontFamily || 'Arial, sans-serif',
      fontUrl: tenantBranding?.fontUrl,
    };

    return {
      tenantId: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
      previewUrl: `https://${tenant.domain}.preview.example.com`,
      adminUrl: `https://${tenant.domain}.preview.example.com/admin`,
      statistics,
      branding,
      siteStructure,
    };
  }

  // Generate static site template
  static async generateSiteTemplate(tenantId: string): Promise<SiteTemplate> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branding: true,
        categories: {
          include: {
            listings: { take: 10 }, // Sample listings for template
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const branding = (tenant as any).branding;
    const categories = (tenant as any).categories || [];
    const primaryColor = branding?.primaryColor || '#000000';
    const secondaryColor = branding?.secondaryColor || '#ffffff';
    const accentColor = branding?.accentColor || '#007bff';
    const fontFamily = branding?.fontFamily || 'Arial, sans-serif';

    return {
      name: `${tenant.name} Directory`,
      version: '1.0.0',
      layout: 'grid',
      components: {
        header: {
          logo: branding?.logoUrl,
          title: tenant.name,
          navigation: categories.map((cat: any) => ({
            label: cat.name,
            path: `/category/${cat.slug}`,
          })),
        },
        footer: {
          copyright: `© ${new Date().getFullYear()} ${tenant.name}`,
          links: [
            { label: 'Home', path: '/' },
            { label: 'About', path: '/about' },
            { label: 'Contact', path: '/contact' },
          ],
        },
        content: {
          hero: {
            title: `Welcome to ${tenant.name}`,
            subtitle: `Discover the best listings in our directory`,
            backgroundImage: branding?.logoUrl,
          },
          categories: categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            listingCount: cat.listings?.length || 0,
          })),
          featuredListings: categories
            .flatMap((cat: any) => (cat.listings || []).filter((listing: any) => listing.featured))
            .slice(0, 6)
            .map((listing: any) => ({
              id: listing.id,
              title: listing.title,
              slug: listing.slug,
              description: listing.description,
              categoryName: categories.find((cat: any) => cat.id === listing.categoryId)?.name,
            })),
        },
      },
      styles: {
        css: this.generateCSS(primaryColor, secondaryColor, accentColor, fontFamily),
        variables: {
          '--primary-color': primaryColor,
          '--secondary-color': secondaryColor,
          '--accent-color': accentColor,
          '--font-family': fontFamily,
          '--font-url': branding?.fontUrl || '',
        },
      },
    };
  }

  // Generate HTML preview for a tenant
  static async generateHTMLPreview(tenantId: string): Promise<string> {
    const template = await this.generateSiteTemplate(tenantId);
    const previewData = await this.generatePreview(tenantId);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        ${template.styles.css}
    </style>
    ${template.styles.variables['--font-url'] ? `<link href="${template.styles.variables['--font-url']}" rel="stylesheet">` : ''}
</head>
<body>
    <header class="site-header">
        ${template.components.header.logo ? `<img src="${template.components.header.logo}" alt="${template.components.header.title}" class="logo">` : ''}
        <h1>${template.components.header.title}</h1>
        <nav class="main-nav">
            ${template.components.header.navigation
              .map((item: any) => `<a href="${item.path}">${item.label}</a>`)
              .join('')}
        </nav>
    </header>

    <main class="site-content">
        <section class="hero">
            <h2>${template.components.content.hero.title}</h2>
            <p>${template.components.content.hero.subtitle}</p>
        </section>

        <section class="categories">
            <h3>Categories</h3>
            <div class="category-grid">
                ${template.components.content.categories
                  .map(
                    (category: any) => `
                    <div class="category-card">
                        ${category.icon ? `<i class="${category.icon}"></i>` : ''}
                        <h4>${category.name}</h4>
                        <p>${category.description}</p>
                        <span class="listing-count">${category.listingCount} listings</span>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </section>

        <section class="featured-listings">
            <h3>Featured Listings</h3>
            <div class="listings-grid">
                ${template.components.content.featuredListings
                  .map(
                    (listing: any) => `
                    <div class="listing-card">
                        <h4>${listing.title}</h4>
                        <p>${listing.description}</p>
                        <span class="category">${listing.categoryName}</span>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </section>
    </main>

    <footer class="site-footer">
        <p>${template.components.footer.copyright}</p>
        <nav class="footer-nav">
            ${template.components.footer.links
              .map((link: any) => `<a href="${link.path}">${link.label}</a>`)
              .join('')}
        </nav>
    </footer>
</body>
</html>
`;
  }

  // Generate site metadata for SEO and sharing
  static async generateSiteMetadata(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branding: true,
        categories: { take: 5 },
        listings: { take: 10, where: { featured: true } },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const categories = (tenant as any).categories || [];
    const branding = (tenant as any).branding;
    const categoryNames = categories.map((cat: any) => cat.name).join(', ');
    const description = `${tenant.name} - Directory featuring ${categoryNames}. Find the best listings in our curated collection.`;

    return {
      title: `${tenant.name} - Directory`,
      description,
      keywords: [tenant.name, 'directory', 'listings', ...categories.map((cat: any) => cat.name)],
      openGraph: {
        title: tenant.name,
        description,
        image: branding?.logoUrl,
        url: `https://${tenant.domain}.example.com`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: tenant.name,
        description,
        image: branding?.logoUrl,
      },
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: tenant.name,
        description,
        url: `https://${tenant.domain}.example.com`,
        publisher: {
          '@type': 'Organization',
          name: tenant.name,
          logo: branding?.logoUrl,
        },
      },
    };
  }

  // Check if tenant is ready for preview
  static async validatePreviewReadiness(tenantId: string): Promise<{
    isReady: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branding: true,
        categories: {
          include: {
            listings: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const categories = (tenant as any).categories || [];
    const branding = (tenant as any).branding;
    const issues: string[] = [];
    const warnings: string[] = [];

    // Required checks
    if (!tenant.name) {
      issues.push('Tenant name is required');
    }

    if (!tenant.domain) {
      issues.push('Tenant domain is required');
    }

    if (categories.length === 0) {
      issues.push('At least one category is required');
    }

    // Warning checks
    if (!branding) {
      warnings.push('No branding configured - using default styles');
    }

    if (categories.some((cat: any) => (cat.listings?.length || 0) === 0)) {
      warnings.push('Some categories have no listings');
    }

    const totalListings = categories.reduce(
      (total: number, cat: any) => total + (cat.listings?.length || 0),
      0
    );
    if (totalListings < 3) {
      warnings.push('Consider adding more listings for a better preview');
    }

    return {
      isReady: issues.length === 0,
      issues,
      warnings,
    };
  }

  // Generate site structure for navigation
  private static generateSiteStructure(tenant: any, config: PreviewConfiguration) {
    const pages = [
      {
        path: '/',
        title: 'Home',
        type: 'home' as const,
        content: config.includeContent
          ? {
              categories: tenant.categories.length,
              featuredListings: tenant.categories.flatMap((cat: any) =>
                cat.listings.filter((listing: any) => listing.featured)
              ).length,
            }
          : undefined,
      },
      // Category pages
      ...tenant.categories.map((category: any) => ({
        path: `/category/${category.slug}`,
        title: category.name,
        type: 'category' as const,
        content: config.includeContent
          ? {
              description: category.description,
              listingsCount: category.listings.length,
              listings: category.listings.map((listing: any) => ({
                id: listing.id,
                title: listing.title,
                slug: listing.slug,
              })),
            }
          : undefined,
      })),
      // Listing pages
      ...tenant.categories.flatMap((category: any) =>
        category.listings.map((listing: any) => ({
          path: `/listing/${listing.slug}`,
          title: listing.title,
          type: 'listing' as const,
          content: config.includeContent
            ? {
                description: listing.description,
                category: category.name,
                featured: listing.featured,
                data: listing.data,
              }
            : undefined,
        }))
      ),
      // Utility pages
      {
        path: '/search',
        title: 'Search',
        type: 'search' as const,
      },
      {
        path: '/about',
        title: 'About',
        type: 'about' as const,
      },
    ];

    const navigation = [
      { label: 'Home', path: '/' },
      {
        label: 'Categories',
        path: '/categories',
        children: tenant.categories.map((cat: any) => ({
          label: cat.name,
          path: `/category/${cat.slug}`,
        })),
      },
      { label: 'Search', path: '/search' },
      { label: 'About', path: '/about' },
    ];

    return { pages, navigation };
  }

  // Generate CSS for the site theme
  private static generateCSS(
    primaryColor: string,
    secondaryColor: string,
    accentColor: string,
    fontFamily: string
  ): string {
    return `
      :root {
        --primary-color: ${primaryColor};
        --secondary-color: ${secondaryColor};
        --accent-color: ${accentColor};
        --font-family: ${fontFamily};
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--font-family);
        line-height: 1.6;
        color: var(--primary-color);
        background-color: var(--secondary-color);
      }

      .site-header {
        background: var(--primary-color);
        color: var(--secondary-color);
        padding: 1rem 2rem;
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .logo {
        height: 40px;
        width: auto;
      }

      .main-nav {
        display: flex;
        gap: 1rem;
        margin-left: auto;
      }

      .main-nav a {
        color: var(--secondary-color);
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: background-color 0.3s;
      }

      .main-nav a:hover {
        background-color: var(--accent-color);
      }

      .site-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .hero {
        text-align: center;
        padding: 4rem 0;
        background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
        color: var(--secondary-color);
        border-radius: 8px;
        margin-bottom: 3rem;
      }

      .hero h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      .category-grid, .listings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
      }

      .category-card, .listing-card {
        background: var(--secondary-color);
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.3s, box-shadow 0.3s;
      }

      .category-card:hover, .listing-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }

      .category-card i {
        font-size: 2rem;
        color: var(--accent-color);
        margin-bottom: 1rem;
      }

      .listing-count, .category {
        color: var(--accent-color);
        font-size: 0.9rem;
        font-weight: bold;
      }

      .site-footer {
        background: var(--primary-color);
        color: var(--secondary-color);
        padding: 2rem;
        margin-top: 4rem;
        text-align: center;
      }

      .footer-nav {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
      }

      .footer-nav a {
        color: var(--secondary-color);
        text-decoration: none;
      }

      .footer-nav a:hover {
        color: var(--accent-color);
      }

      @media (max-width: 768px) {
        .site-header {
          flex-direction: column;
          gap: 1rem;
        }

        .main-nav {
          margin-left: 0;
        }

        .hero h2 {
          font-size: 2rem;
        }

        .category-grid, .listings-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}
