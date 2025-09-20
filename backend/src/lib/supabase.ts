import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY is required');
}

// Client-side Supabase client (for user-authenticated operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-side Supabase client (for admin operations, bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Utility functions for tenant-specific operations
export class SupabaseClient {
  /**
   * Creates a new tenant database in Supabase
   */
  static async createTenantDatabase(tenantId: string, domain: string): Promise<void> {
    try {
      // In a real implementation, this would create a separate database or schema for the tenant
      // For now, we'll use the main database with tenant isolation

      const { error } = await supabaseAdmin.from('tenant_configs').insert({
        tenant_id: tenantId,
        domain,
        created_at: new Date().toISOString(),
        status: 'active',
      });

      if (error) {
        throw new Error(`Failed to create tenant database: ${error.message}`);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Tenant database created for: ${domain}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error creating tenant database:', error);
      throw error;
    }
  }

  /**
   * Migrates tenant data to Supabase
   */
  static async migrateTenantData(
    tenantId: string,
    data: {
      categories: any[];
      listings: any[];
      branding: any;
    }
  ): Promise<void> {
    try {
      // Create tenant-specific tables or insert data with tenant_id
      const { error: categoriesError } = await supabaseAdmin.from('categories').insert(
        data.categories.map(category => ({
          ...category,
          tenant_id: tenantId,
        }))
      );

      if (categoriesError) {
        throw new Error(`Failed to migrate categories: ${categoriesError.message}`);
      }

      const { error: listingsError } = await supabaseAdmin.from('listings').insert(
        data.listings.map(listing => ({
          ...listing,
          tenant_id: tenantId,
        }))
      );

      if (listingsError) {
        throw new Error(`Failed to migrate listings: ${listingsError.message}`);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Tenant data migrated for: ${tenantId}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error migrating tenant data:', error);
      throw error;
    }
  }

  /**
   * Sets up tenant-specific authentication and permissions
   */
  static async setupTenantAuth(tenantId: string, domain: string): Promise<void> {
    try {
      // Configure tenant-specific auth settings
      // This would typically involve setting up RLS policies, custom domains, etc.

      const { error } = await supabaseAdmin.from('tenant_auth_configs').insert({
        tenant_id: tenantId,
        domain,
        auth_enabled: true,
        signup_enabled: true,
        email_confirmations: true,
      });

      if (error) {
        throw new Error(`Failed to setup tenant auth: ${error.message}`);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Tenant auth configured for: ${domain}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error setting up tenant auth:', error);
      throw error;
    }
  }

  /**
   * Removes tenant data and configuration
   */
  static async deleteTenant(tenantId: string): Promise<void> {
    try {
      // Remove tenant data (cascade delete should handle related records)
      const { error: configError } = await supabaseAdmin
        .from('tenant_configs')
        .delete()
        .eq('tenant_id', tenantId);

      if (configError) {
        throw new Error(`Failed to delete tenant config: ${configError.message}`);
      }

      const { error: authError } = await supabaseAdmin
        .from('tenant_auth_configs')
        .delete()
        .eq('tenant_id', tenantId);

      if (authError) {
        throw new Error(`Failed to delete tenant auth: ${authError.message}`);
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Tenant deleted: ${tenantId}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error deleting tenant:', error);
      throw error;
    }
  }
}

export default supabase;
