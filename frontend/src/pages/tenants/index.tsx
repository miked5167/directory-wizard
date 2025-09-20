'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  description?: string;
  category?: string;
  location?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'FAILED' | 'SUSPENDED';
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    fontFamily: string;
  };
  stats: {
    totalListings: number;
    totalCategories: number;
    totalViews: number;
    totalClaims: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  lastPublishedAt?: string;
  publishedUrl?: string;
  adminUrl?: string;
}

export interface TenantDashboardProps {
  initialTenants?: Tenant[];
  onCreateTenant?: () => void;
  onEditTenant?: (tenantId: string) => void;
  onDeleteTenant?: (tenantId: string) => void;
  onPublishTenant?: (tenantId: string) => void;
  onUnpublishTenant?: (tenantId: string) => void;
}

const TenantManagementDashboard: React.FC<TenantDashboardProps> = ({
  initialTenants = [],
  onCreateTenant,
  onEditTenant,
  onDeleteTenant,
  onPublishTenant,
  onUnpublishTenant,
}) => {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'status'>('updated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());

  // Load tenants on component mount
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from the API
      // For now, use mock data
      const mockTenants: Tenant[] = [
        {
          id: 'tenant_1',
          name: 'Local Business Directory',
          domain: 'local-biz.example.com',
          description: 'A comprehensive directory of local businesses in downtown',
          category: 'Business',
          location: 'New York, NY',
          status: 'PUBLISHED',
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#64748B',
            fontFamily: 'Inter',
          },
          stats: {
            totalListings: 245,
            totalCategories: 12,
            totalViews: 15420,
            totalClaims: 23,
          },
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z',
          publishedAt: '2024-01-18T16:45:00Z',
          lastPublishedAt: '2024-01-20T14:30:00Z',
          publishedUrl: 'https://local-biz.example.com',
          adminUrl: 'https://local-biz.example.com/admin',
        },
        {
          id: 'tenant_2',
          name: 'Restaurant Guide',
          domain: 'food-guide.example.com',
          description: 'Best restaurants and cafes in the city',
          category: 'Food & Dining',
          location: 'San Francisco, CA',
          status: 'DRAFT',
          branding: {
            primaryColor: '#EF4444',
            secondaryColor: '#F97316',
            fontFamily: 'Poppins',
          },
          stats: {
            totalListings: 89,
            totalCategories: 8,
            totalViews: 0,
            totalClaims: 0,
          },
          createdAt: '2024-01-20T09:15:00Z',
          updatedAt: '2024-01-21T11:20:00Z',
        },
        {
          id: 'tenant_3',
          name: 'Service Providers Hub',
          domain: 'services-hub.example.com',
          description: 'Professional services directory',
          category: 'Services',
          location: 'Chicago, IL',
          status: 'FAILED',
          branding: {
            primaryColor: '#10B981',
            secondaryColor: '#059669',
            fontFamily: 'Roboto',
          },
          stats: {
            totalListings: 156,
            totalCategories: 15,
            totalViews: 0,
            totalClaims: 0,
          },
          createdAt: '2024-01-19T14:22:00Z',
          updatedAt: '2024-01-21T16:10:00Z',
        },
      ];

      setTenants(mockTenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants
    .filter(tenant => {
      if (filter !== 'all' && tenant.status.toLowerCase() !== filter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tenant.name.toLowerCase().includes(query) ||
          tenant.domain.toLowerCase().includes(query) ||
          tenant.description?.toLowerCase().includes(query) ||
          tenant.category?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const handleCreateNew = () => {
    if (onCreateTenant) {
      onCreateTenant();
    } else {
      router.push('/wizard');
    }
  };

  const handleEdit = (tenantId: string) => {
    if (onEditTenant) {
      onEditTenant(tenantId);
    } else {
      router.push(`/wizard?tenant=${tenantId}`);
    }
  };

  const handlePublish = async (tenantId: string) => {
    if (onPublishTenant) {
      onPublishTenant(tenantId);
    } else {
      // Mock publish action
      setTenants(prev => prev.map(t =>
        t.id === tenantId
          ? { ...t, status: 'PUBLISHED' as const, publishedAt: new Date().toISOString() }
          : t
      ));
    }
  };

  const handleUnpublish = async (tenantId: string) => {
    if (onUnpublishTenant) {
      onUnpublishTenant(tenantId);
    } else {
      // Mock unpublish action
      setTenants(prev => prev.map(t =>
        t.id === tenantId
          ? { ...t, status: 'DRAFT' as const }
          : t
      ));
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      if (onDeleteTenant) {
        onDeleteTenant(tenantId);
      } else {
        setTenants(prev => prev.filter(t => t.id !== tenantId));
      }
    }
  };

  const toggleTenantSelection = (tenantId: string) => {
    const newSelection = new Set(selectedTenants);
    if (newSelection.has(tenantId)) {
      newSelection.delete(tenantId);
    } else {
      newSelection.add(tenantId);
    }
    setSelectedTenants(newSelection);
  };

  const getStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'SUSPENDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div data-testid="tenant-management-dashboard" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Directory Management
                </h1>
                <p className="mt-1 text-gray-600">
                  Manage your directory websites and monitor their performance
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                data-testid="create-tenant-button"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Directory
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Directories</dt>
                  <dd className="text-lg font-medium text-gray-900">{tenants.length}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Published</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.filter(t => t.status === 'PUBLISHED').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.filter(t => t.status === 'DRAFT').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.reduce((sum, t) => sum + t.stats.totalViews, 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="filter" className="sr-only">Filter by status</label>
                <select
                  id="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  data-testid="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label htmlFor="sort" className="sr-only">Sort by</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  data-testid="sort-select"
                >
                  <option value="updated">Last Updated</option>
                  <option value="created">Created Date</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            <div className="max-w-lg w-full">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Search directories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  data-testid="search-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">Loading directories...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filter !== 'all' ? 'No directories found' : 'No directories yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first directory'
                }
              </p>
              {!searchQuery && filter === 'all' && (
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Directory
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" data-testid="tenants-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Select</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Directory
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50" data-testid={`tenant-row-${tenant.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTenants.has(tenant.id)}
                          onChange={() => toggleTenantSelection(tenant.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          data-testid={`select-${tenant.id}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                              style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                            >
                              {tenant.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">{tenant.domain}</div>
                            {tenant.description && (
                              <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                                {tenant.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                          {tenant.status}
                        </span>
                        {tenant.status === 'PUBLISHED' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Published {formatDate(tenant.publishedAt!)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>{tenant.stats.totalListings} listings</div>
                          <div>{tenant.stats.totalCategories} categories</div>
                          <div>{tenant.stats.totalViews.toLocaleString()} views</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tenant.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {tenant.status === 'PUBLISHED' && tenant.publishedUrl && (
                            <a
                              href={tenant.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                              data-testid={`view-${tenant.id}`}
                            >
                              View
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(tenant.id)}
                            className="text-blue-600 hover:text-blue-900"
                            data-testid={`edit-${tenant.id}`}
                          >
                            Edit
                          </button>
                          {tenant.status === 'DRAFT' || tenant.status === 'FAILED' ? (
                            <button
                              onClick={() => handlePublish(tenant.id)}
                              className="text-green-600 hover:text-green-900"
                              data-testid={`publish-${tenant.id}`}
                            >
                              Publish
                            </button>
                          ) : tenant.status === 'PUBLISHED' ? (
                            <button
                              onClick={() => handleUnpublish(tenant.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              data-testid={`unpublish-${tenant.id}`}
                            >
                              Unpublish
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDelete(tenant.id)}
                            className="text-red-600 hover:text-red-900"
                            data-testid={`delete-${tenant.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedTenants.size > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {selectedTenants.size} directory{selectedTenants.size === 1 ? '' : 'ies'} selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    selectedTenants.forEach(id => {
                      const tenant = tenants.find(t => t.id === id);
                      if (tenant && (tenant.status === 'DRAFT' || tenant.status === 'FAILED')) {
                        handlePublish(id);
                      }
                    });
                    setSelectedTenants(new Set());
                  }}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  data-testid="bulk-publish-button"
                >
                  Publish Selected
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedTenants.size} selected directories? This action cannot be undone.`)) {
                      selectedTenants.forEach(id => handleDelete(id));
                      setSelectedTenants(new Set());
                    }
                  }}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  data-testid="bulk-delete-button"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantManagementDashboard;