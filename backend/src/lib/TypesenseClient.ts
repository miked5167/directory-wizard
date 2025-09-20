import Typesense from 'typesense';
import { SearchParams, SearchResponse, CollectionCreateSchema, CollectionResponse } from 'typesense/lib/Typesense/Collection';
import { DocumentSchema } from 'typesense/lib/Typesense/Document';

export interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  healthcheckIntervalSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  sendApiKeyAsQueryParam?: boolean;
}

export interface ListingDocument {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  hours?: string;
  tags?: string[];
  rating?: number;
  review_count?: number;
  price_range?: string;
  images?: string[];
  verified?: boolean;
  featured?: boolean;
  created_at: number;
  updated_at: number;
}

export interface CategoryDocument {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  level: number;
  listing_count: number;
  icon?: string;
  color?: string;
  sort_order: number;
  created_at: number;
}

export interface SearchFilters {
  tenant_id: string;
  category?: string;
  subcategory?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  verified?: boolean;
  featured?: boolean;
  rating_min?: number;
  price_range?: string;
  has_phone?: boolean;
  has_email?: boolean;
  has_website?: boolean;
  tags?: string[];
  created_after?: string;
  created_before?: string;
}

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  sort_by?: string[];
  facet_by?: string[];
  max_facet_values?: number;
  filter_by?: string;
  per_page?: number;
  page?: number;
  highlight_full_fields?: string[];
  highlight_affix_num_tokens?: number;
  snippet_threshold?: number;
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  pinned_hits?: string[];
  hidden_hits?: string[];
  enable_overrides?: boolean;
  pre_segmented_query?: boolean;
  search_cutoff_ms?: number;
}

export interface SearchResult<T = ListingDocument> {
  found: number;
  out_of: number;
  page: number;
  search_time_ms: number;
  search_cutoff: boolean;
  hits: Array<{
    document: T;
    highlights?: Array<{
      field: string;
      snippet: string;
      value: string;
    }>;
    text_match: number;
  }>;
  facet_counts?: Array<{
    field_name: string;
    counts: Array<{
      count: number;
      highlighted: string;
      value: string;
    }>;
  }>;
}

export interface CollectionStats {
  name: string;
  num_documents: number;
  num_memory_shards: number;
  created_at: number;
}

export class TypesenseClient {
  private client: Typesense.Client;
  private config: TypesenseConfig;

  constructor(config: TypesenseConfig) {
    this.config = config;
    this.client = new Typesense.Client({
      nodes: config.nodes,
      apiKey: config.apiKey,
      connectionTimeoutSeconds: config.connectionTimeoutSeconds || 5,
      healthcheckIntervalSeconds: config.healthcheckIntervalSeconds || 60,
      numRetries: config.numRetries || 3,
      retryIntervalSeconds: config.retryIntervalSeconds || 1,
      sendApiKeyAsQueryParam: config.sendApiKeyAsQueryParam || false,
    });
  }

  // Collection management
  async createListingsCollection(tenantId: string): Promise<CollectionResponse> {
    const schema: CollectionCreateSchema = {
      name: `listings_${tenantId}`,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'tenant_id', type: 'string', facet: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'category', type: 'string', facet: true },
        { name: 'subcategory', type: 'string', facet: true, optional: true },
        { name: 'location', type: 'string', facet: true, optional: true },
        { name: 'address', type: 'string', optional: true },
        { name: 'city', type: 'string', facet: true, optional: true },
        { name: 'state', type: 'string', facet: true, optional: true },
        { name: 'country', type: 'string', facet: true, optional: true },
        { name: 'postal_code', type: 'string', optional: true },
        { name: 'latitude', type: 'float', optional: true },
        { name: 'longitude', type: 'float', optional: true },
        { name: 'phone', type: 'string', optional: true },
        { name: 'email', type: 'string', optional: true },
        { name: 'website', type: 'string', optional: true },
        { name: 'hours', type: 'string', optional: true },
        { name: 'tags', type: 'string[]', facet: true, optional: true },
        { name: 'rating', type: 'float', facet: true, optional: true },
        { name: 'review_count', type: 'int32', facet: true, optional: true },
        { name: 'price_range', type: 'string', facet: true, optional: true },
        { name: 'images', type: 'string[]', optional: true },
        { name: 'verified', type: 'bool', facet: true, optional: true },
        { name: 'featured', type: 'bool', facet: true, optional: true },
        { name: 'created_at', type: 'int64' },
        { name: 'updated_at', type: 'int64' },
      ],
      default_sorting_field: 'created_at',
    };

    return await this.client.collections().create(schema);
  }

  async createCategoriesCollection(tenantId: string): Promise<CollectionResponse> {
    const schema: CollectionCreateSchema = {
      name: `categories_${tenantId}`,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'tenant_id', type: 'string', facet: true },
        { name: 'name', type: 'string' },
        { name: 'slug', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'parent_id', type: 'string', facet: true, optional: true },
        { name: 'level', type: 'int32', facet: true },
        { name: 'listing_count', type: 'int32', facet: true },
        { name: 'icon', type: 'string', optional: true },
        { name: 'color', type: 'string', optional: true },
        { name: 'sort_order', type: 'int32' },
        { name: 'created_at', type: 'int64' },
      ],
      default_sorting_field: 'sort_order',
    };

    return await this.client.collections().create(schema);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.collections(name).delete();
  }

  async getCollection(name: string): Promise<CollectionResponse> {
    return await this.client.collections(name).retrieve();
  }

  async listCollections(): Promise<CollectionResponse[]> {
    const response = await this.client.collections().retrieve();
    return response;
  }

  async getCollectionStats(name: string): Promise<CollectionStats> {
    const collection = await this.getCollection(name);
    return {
      name: collection.name,
      num_documents: collection.num_documents,
      num_memory_shards: collection.num_memory_shards || 0,
      created_at: collection.created_at,
    };
  }

  // Document management
  async indexListing(tenantId: string, listing: Omit<ListingDocument, 'tenant_id'>): Promise<ListingDocument> {
    const collectionName = `listings_${tenantId}`;
    const document: ListingDocument = {
      ...listing,
      tenant_id: tenantId,
    };

    const result = await this.client.collections(collectionName).documents().create(document);
    return result as ListingDocument;
  }

  async indexListingsBatch(tenantId: string, listings: Omit<ListingDocument, 'tenant_id'>[]): Promise<{
    success: number;
    failed: number;
    errors: any[];
  }> {
    const collectionName = `listings_${tenantId}`;
    const documents: ListingDocument[] = listings.map(listing => ({
      ...listing,
      tenant_id: tenantId,
    }));

    try {
      const results = await this.client.collections(collectionName).documents().import(documents, {
        action: 'create',
      });

      // Count successes and failures
      let success = 0;
      let failed = 0;
      const errors: any[] = [];

      results.forEach((result: any) => {
        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(result);
        }
      });

      return { success, failed, errors };
    } catch (error) {
      return {
        success: 0,
        failed: listings.length,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }

  async updateListing(tenantId: string, listingId: string, updates: Partial<ListingDocument>): Promise<ListingDocument> {
    const collectionName = `listings_${tenantId}`;
    const document = {
      ...updates,
      tenant_id: tenantId,
      updated_at: Date.now(),
    };

    const result = await this.client.collections(collectionName).documents(listingId).update(document);
    return result as ListingDocument;
  }

  async deleteListing(tenantId: string, listingId: string): Promise<void> {
    const collectionName = `listings_${tenantId}`;
    await this.client.collections(collectionName).documents(listingId).delete();
  }

  async getListing(tenantId: string, listingId: string): Promise<ListingDocument | null> {
    const collectionName = `listings_${tenantId}`;

    try {
      const result = await this.client.collections(collectionName).documents(listingId).retrieve();
      return result as ListingDocument;
    } catch (error: any) {
      if (error.httpStatus === 404) {
        return null;
      }
      throw error;
    }
  }

  // Category management
  async indexCategory(tenantId: string, category: Omit<CategoryDocument, 'tenant_id'>): Promise<CategoryDocument> {
    const collectionName = `categories_${tenantId}`;
    const document: CategoryDocument = {
      ...category,
      tenant_id: tenantId,
    };

    const result = await this.client.collections(collectionName).documents().create(document);
    return result as CategoryDocument;
  }

  async updateCategory(tenantId: string, categoryId: string, updates: Partial<CategoryDocument>): Promise<CategoryDocument> {
    const collectionName = `categories_${tenantId}`;
    const document = {
      ...updates,
      tenant_id: tenantId,
    };

    const result = await this.client.collections(collectionName).documents(categoryId).update(document);
    return result as CategoryDocument;
  }

  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const collectionName = `categories_${tenantId}`;
    await this.client.collections(collectionName).documents(categoryId).delete();
  }

  // Search methods
  async searchListings(tenantId: string, options: SearchOptions = {}): Promise<SearchResult<ListingDocument>> {
    const collectionName = `listings_${tenantId}`;

    const searchParams: SearchParams = {
      q: options.query || '*',
      query_by: 'name,description,category,location,address,tags',
      filter_by: this.buildFilterString({ ...options.filters, tenant_id: tenantId }),
      sort_by: options.sort_by || ['_text_match:desc', 'featured:desc', 'rating:desc'],
      facet_by: options.facet_by || ['category', 'city', 'state', 'verified', 'rating', 'price_range'],
      max_facet_values: options.max_facet_values || 10,
      per_page: Math.min(options.per_page || 20, 250),
      page: options.page || 1,
      highlight_full_fields: options.highlight_full_fields || ['name', 'description'],
      highlight_affix_num_tokens: options.highlight_affix_num_tokens || 4,
      snippet_threshold: options.snippet_threshold || 30,
      drop_tokens_threshold: options.drop_tokens_threshold || 1,
      typo_tokens_threshold: options.typo_tokens_threshold || 1,
      search_cutoff_ms: options.search_cutoff_ms || 3000,
    };

    if (options.pinned_hits) {
      searchParams.pinned_hits = options.pinned_hits;
    }

    if (options.hidden_hits) {
      searchParams.hidden_hits = options.hidden_hits;
    }

    const result = await this.client.collections(collectionName).documents().search(searchParams);
    return result as SearchResult<ListingDocument>;
  }

  async searchCategories(tenantId: string, query?: string, filters?: Partial<CategoryDocument>): Promise<SearchResult<CategoryDocument>> {
    const collectionName = `categories_${tenantId}`;

    const searchParams: SearchParams = {
      q: query || '*',
      query_by: 'name,description',
      filter_by: this.buildFilterString({ ...filters, tenant_id: tenantId }),
      sort_by: ['sort_order:asc', '_text_match:desc'],
      per_page: 250,
    };

    const result = await this.client.collections(collectionName).documents().search(searchParams);
    return result as SearchResult<CategoryDocument>;
  }

  async searchSuggestions(tenantId: string, query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const collectionName = `listings_${tenantId}`;

    try {
      const result = await this.client.collections(collectionName).documents().search({
        q: query,
        query_by: 'name,category,tags',
        filter_by: `tenant_id:=${tenantId}`,
        per_page: limit * 2, // Get more results to filter unique suggestions
        highlight_full_fields: ['name'],
        snippet_threshold: 0,
      });

      // Extract unique suggestions from search results
      const suggestions = new Set<string>();

      result.hits?.forEach((hit: any) => {
        const name = hit.document.name;
        if (name && name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(name);
        }

        // Add category suggestions
        const category = hit.document.category;
        if (category && category.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(category);
        }

        // Add tag suggestions
        if (hit.document.tags) {
          hit.document.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(tag);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Search suggestions failed:', error);
      return [];
    }
  }

  // Analytics and insights
  async getPopularSearches(tenantId: string, limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    // This would typically be implemented with search analytics
    // For now, return mock data
    return [
      { query: 'restaurants', count: 150 },
      { query: 'coffee shops', count: 120 },
      { query: 'hotels', count: 100 },
      { query: 'services', count: 80 },
      { query: 'shopping', count: 60 },
    ].slice(0, limit);
  }

  async getSearchAnalytics(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<{
    total_searches: number;
    unique_queries: number;
    avg_results_per_search: number;
    top_queries: Array<{ query: string; count: number }>;
    zero_results_queries: Array<{ query: string; count: number }>;
  }> {
    // This would typically integrate with Typesense Analytics API
    // For now, return mock data
    return {
      total_searches: 1250,
      unique_queries: 340,
      avg_results_per_search: 8.5,
      top_queries: await this.getPopularSearches(tenantId, 5),
      zero_results_queries: [
        { query: 'unicorn services', count: 5 },
        { query: 'time travel agency', count: 3 },
      ],
    };
  }

  // Utility methods
  private buildFilterString(filters: Record<string, any>): string {
    const filterParts: string[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          const valueStr = value.map(v => `"${v}"`).join(',');
          filterParts.push(`${key}:[${valueStr}]`);
        }
      } else if (typeof value === 'boolean') {
        filterParts.push(`${key}:=${value}`);
      } else if (typeof value === 'number') {
        filterParts.push(`${key}:=${value}`);
      } else if (typeof value === 'string') {
        filterParts.push(`${key}:="${value}"`);
      }
    });

    return filterParts.join(' && ');
  }

  async reindexTenant(tenantId: string, listings: Omit<ListingDocument, 'tenant_id'>[]): Promise<{
    listings_indexed: number;
    errors: any[];
  }> {
    const collectionName = `listings_${tenantId}`;

    try {
      // Check if collection exists, create if not
      try {
        await this.getCollection(collectionName);
      } catch (error: any) {
        if (error.httpStatus === 404) {
          await this.createListingsCollection(tenantId);
        } else {
          throw error;
        }
      }

      // Clear existing documents
      try {
        await this.client.collections(collectionName).documents().delete({ filter_by: `tenant_id:=${tenantId}` });
      } catch (error) {
        // Ignore errors if no documents exist
        console.warn('Failed to clear existing documents:', error);
      }

      // Index new documents
      const result = await this.indexListingsBatch(tenantId, listings);

      return {
        listings_indexed: result.success,
        errors: result.errors,
      };
    } catch (error) {
      return {
        listings_indexed: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
      };
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string; latency_ms?: number }> {
    const startTime = Date.now();

    try {
      await this.client.health.retrieve();
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        latency_ms: latency,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get underlying Typesense client for advanced usage
  getTypesenseClient(): Typesense.Client {
    return this.client;
  }
}

// Default configuration
const defaultConfig: TypesenseConfig = {
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || '',
  connectionTimeoutSeconds: 5,
  healthcheckIntervalSeconds: 60,
  numRetries: 3,
  retryIntervalSeconds: 1,
};

// Default client instance
export const typesenseClient = new TypesenseClient(defaultConfig);

// Factory function for custom configurations
export const createTypesenseClient = (config: Partial<TypesenseConfig>): TypesenseClient => {
  return new TypesenseClient({ ...defaultConfig, ...config });
};

export type {
  SearchParams,
  SearchResponse,
  CollectionCreateSchema,
  CollectionResponse,
  DocumentSchema,
};