import { createClient, SupabaseClient as BaseSupabaseClient, User } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    realtime?: {
      params?: {
        eventsPerSecond?: number;
      };
    };
    global?: {
      fetch?: typeof fetch;
    };
  };
}

export interface TenantDatabaseConfig {
  tenantId: string;
  connectionString: string;
  schema?: string;
}

export interface FileUploadOptions {
  bucket: string;
  path: string;
  file: File | Buffer;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
    metadata?: Record<string, any>;
  };
}

export interface FileUploadResult {
  path: string;
  fullPath: string;
  publicUrl: string;
  error?: string;
}

export interface StorageBucket {
  id: string;
  name: string;
  owner?: string;
  public: boolean;
  file_size_limit?: number;
  allowed_mime_types?: string[];
  created_at: string;
  updated_at: string;
}

export class SupabaseClient {
  private client: BaseSupabaseClient<Database>;
  private serviceClient?: BaseSupabaseClient<Database>;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;

    // Create regular client
    this.client = createClient<Database>(
      config.url,
      config.anonKey,
      config.options
    );

    // Create service role client if service key is provided
    if (config.serviceRoleKey) {
      this.serviceClient = createClient<Database>(
        config.url,
        config.serviceRoleKey,
        {
          ...config.options,
          auth: {
            ...config.options?.auth,
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
  }

  // Authentication methods
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw new Error(`Supabase signup failed: ${error.message}`);
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Supabase signin failed: ${error.message}`);
    }

    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(`Supabase signout failed: ${error.message}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }

    return user;
  }

  async refreshSession() {
    const { data, error } = await this.client.auth.refreshSession();

    if (error) {
      throw new Error(`Failed to refresh session: ${error.message}`);
    }

    return data;
  }

  // Database methods with tenant isolation
  async query<T = any>(
    table: string,
    tenantId?: string,
    options: {
      select?: string;
      filter?: Record<string, any>;
      order?: { column: string; ascending?: boolean }[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    const client = this.getClient();
    let query = client.from(table).select(options.select || '*');

    // Apply tenant isolation
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Apply filters
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options.order) {
      options.order.forEach(({ column, ascending = true }) => {
        query = query.order(column, { ascending });
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data as T[];
  }

  async insert<T = any>(
    table: string,
    data: Record<string, any> | Record<string, any>[],
    tenantId?: string
  ): Promise<T[]> {
    const client = this.getClient();

    // Add tenant_id to data if provided
    let insertData = data;
    if (tenantId) {
      if (Array.isArray(data)) {
        insertData = data.map(item => ({ ...item, tenant_id: tenantId }));
      } else {
        insertData = { ...data, tenant_id: tenantId };
      }
    }

    const { data: result, error } = await client
      .from(table)
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return result as T[];
  }

  async update<T = any>(
    table: string,
    id: string,
    data: Record<string, any>,
    tenantId?: string
  ): Promise<T[]> {
    const client = this.getClient();
    let query = client.from(table).update(data).eq('id', id);

    // Apply tenant isolation
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: result, error } = await query.select();

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    return result as T[];
  }

  async delete(
    table: string,
    id: string,
    tenantId?: string
  ): Promise<void> {
    const client = this.getClient();
    let query = client.from(table).delete().eq('id', id);

    // Apply tenant isolation
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Database delete failed: ${error.message}`);
    }
  }

  // File storage methods
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(options.bucket)
      .upload(options.path, options.file, options.options);

    if (error) {
      return {
        path: options.path,
        fullPath: '',
        publicUrl: '',
        error: error.message,
      };
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      fullPath: data.fullPath,
      publicUrl: urlData.publicUrl,
    };
  }

  async downloadFile(bucket: string, path: string): Promise<Blob> {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`File download failed: ${error.message}`);
    }

    return data;
  }

  async deleteFile(bucket: string, paths: string | string[]): Promise<void> {
    const client = this.getClient();

    const pathArray = Array.isArray(paths) ? paths : [paths];
    const { error } = await client.storage
      .from(bucket)
      .remove(pathArray);

    if (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async listFiles(bucket: string, path?: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  }) {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(bucket)
      .list(path, {
        limit: options?.limit,
        offset: options?.offset,
        sortBy: options?.sortBy,
      });

    if (error) {
      throw new Error(`File listing failed: ${error.message}`);
    }

    return data;
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const client = this.getClient();

    const { data } = client.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Signed URL creation failed: ${error.message}`);
    }

    return data.signedUrl;
  }

  // Storage bucket management
  async createBucket(
    id: string,
    options?: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  ): Promise<StorageBucket> {
    const client = this.getServiceClient();

    const { data, error } = await client.storage.createBucket(id, {
      public: options?.public || false,
      fileSizeLimit: options?.fileSizeLimit,
      allowedMimeTypes: options?.allowedMimeTypes,
    });

    if (error) {
      throw new Error(`Bucket creation failed: ${error.message}`);
    }

    return data as StorageBucket;
  }

  async getBucket(id: string): Promise<StorageBucket> {
    const client = this.getServiceClient();

    const { data, error } = await client.storage.getBucket(id);

    if (error) {
      throw new Error(`Get bucket failed: ${error.message}`);
    }

    return data as StorageBucket;
  }

  async listBuckets(): Promise<StorageBucket[]> {
    const client = this.getServiceClient();

    const { data, error } = await client.storage.listBuckets();

    if (error) {
      throw new Error(`List buckets failed: ${error.message}`);
    }

    return data as StorageBucket[];
  }

  async deleteBucket(id: string): Promise<void> {
    const client = this.getServiceClient();

    const { error } = await client.storage.deleteBucket(id);

    if (error) {
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }
  }

  // Tenant database management
  async createTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    const client = this.getServiceClient();

    // This is a conceptual method - actual implementation would depend on
    // your multi-tenant strategy (separate databases vs shared with RLS)

    // For shared database with RLS:
    const { error } = await client
      .from('tenant_configurations')
      .insert({
        tenant_id: config.tenantId,
        connection_string: config.connectionString,
        schema: config.schema || 'public',
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Tenant database creation failed: ${error.message}`);
    }
  }

  async getTenantDatabase(tenantId: string): Promise<TenantDatabaseConfig | null> {
    const client = this.getServiceClient();

    const { data, error } = await client
      .from('tenant_configurations')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Get tenant database failed: ${error.message}`);
    }

    return {
      tenantId: data.tenant_id,
      connectionString: data.connection_string,
      schema: data.schema,
    };
  }

  // Real-time subscriptions
  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    tenantId?: string
  ) {
    const client = this.getClient();

    let channel = client
      .channel(`public:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
      }, callback);

    return channel.subscribe();
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const { data, error } = await this.client
        .from('health_check')
        .select('count')
        .limit(1);

      if (error) {
        return { status: 'error', message: error.message };
      }

      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // Helper methods
  private getClient(): BaseSupabaseClient<Database> {
    return this.client;
  }

  private getServiceClient(): BaseSupabaseClient<Database> {
    if (!this.serviceClient) {
      throw new Error('Service role client not configured. Provide serviceRoleKey in config.');
    }
    return this.serviceClient;
  }

  // Get underlying Supabase client for advanced usage
  getSupabaseClient(): BaseSupabaseClient<Database> {
    return this.client;
  }

  getServiceSupabaseClient(): BaseSupabaseClient<Database> {
    return this.getServiceClient();
  }
}

// Default configuration
const defaultConfig: SupabaseConfig = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
};

// Default client instance
export const supabaseClient = new SupabaseClient(defaultConfig);

// Factory function for custom configurations
export const createSupabaseClient = (config: Partial<SupabaseConfig>): SupabaseClient => {
  return new SupabaseClient({ ...defaultConfig, ...config });
};

// Type exports
export type { Database, User };
export { createClient };