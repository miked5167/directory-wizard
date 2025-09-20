import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface VercelConfig {
  token: string;
  teamId?: string;
  baseUrl?: string;
}

export interface ProjectConfig {
  name: string;
  gitRepository?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repo: string;
  };
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  devCommand?: string;
  framework?: string;
  nodeVersion?: string;
  environmentVariables?: EnvironmentVariable[];
  domains?: string[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type?: 'system' | 'secret' | 'encrypted' | 'plain';
}

export interface DeploymentConfig {
  name?: string;
  gitSource?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repoId: string;
    ref?: string;
  };
  projectSettings?: {
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    devCommand?: string;
    framework?: string;
    nodeVersion?: string;
  };
  environmentVariables?: EnvironmentVariable[];
  regions?: string[];
  functions?: Record<string, {
    runtime?: string;
    memory?: number;
    maxDuration?: number;
  }>;
  meta?: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  accountId: string;
  framework: string | null;
  devCommand: string | null;
  buildCommand: string | null;
  outputDirectory: string | null;
  installCommand: string | null;
  nodeVersion: string;
  createdAt: number;
  updatedAt: number;
  link?: {
    type: string;
    repo: string;
    repoId: number;
    org?: string;
  } | null;
  latestDeployments?: Deployment[];
  targets?: Record<string, string>;
  analytics?: {
    id: string;
    canceledAt: number | null;
    disabledAt: number;
    enabledAt: number;
    paidAt?: number;
    sampleRatePercent?: number;
    spendLimitInDollars?: number;
  };
}

export interface Deployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  source?: 'cli' | 'git' | 'import' | 'clone/repo';
  state?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  type: 'LAMBDAS';
  creator?: {
    uid: string;
    email?: string;
    username?: string;
    githubLogin?: string;
    gitlabLogin?: string;
  };
  meta?: Record<string, string>;
  target?: 'production' | 'staging';
  aliasError?: {
    code: string;
    message: string;
  } | null;
  aliasAssigned?: (number | boolean) | null;
  isRollbackCandidate?: boolean | null;
  buildingAt?: number;
  ready?: number;
  checksState?: 'registered' | 'running' | 'completed';
  checksConclusion?: 'succeeded' | 'failed' | 'skipped' | 'cancelled';
  readySubstate?: 'STAGED' | 'PROMOTED';
  functions?: Record<string, {
    functionName: string;
    codeSize: number;
    layers: string[];
    runtime: string;
    handler: string;
    environment: Record<string, string>;
    regions: string[];
  }>;
  plan: 'pro' | 'enterprise' | 'hobby';
  public: boolean;
  ownerId: string;
  inspectorUrl: string | null;
  projectId: string;
  createdAt: number;
  createdIn: string;
  env: string[];
  build?: {
    env: string[];
  };
  routes?: Array<{
    src: string;
    dest?: string;
    headers?: Record<string, string>;
    methods?: string[];
    status?: number;
  }> | null;
  readyAt?: number;
  buildingAt?: number;
}

export interface Domain {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: (307 | 301 | 302 | 308) | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

export interface DnsRecord {
  id: string;
  slug: string;
  name: string;
  type: string;
  value: string;
  creator: string;
  created: number;
  updated: number;
  createdAt: number;
  updatedAt: number;
}

export interface TeamInfo {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
  avatar?: string | null;
  membership: {
    confirmed: boolean;
    accessRequestedAt?: number;
    role: 'OWNER' | 'MEMBER' | 'VIEWER';
    teamId: string;
    uid: string;
    createdAt: number;
    created: number;
  };
}

export interface DeploymentFile {
  name: string;
  uid: string;
  children?: DeploymentFile[];
}

export interface DeploymentBuild {
  id: string;
  use: string;
  createdIn: string;
  deployedTo: string[];
  readyState: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY';
  readyStateAt: number;
  scheduledAt: number | null;
  path: string;
}

export interface Analytics {
  devices: Record<string, number>;
  os: Record<string, number>;
  browsers: Record<string, number>;
  locations: Record<string, number>;
  referrers: Record<string, number>;
  pathnames: Record<string, number>;
  period: {
    start: number;
    end: number;
  };
}

export interface VercelAPIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class VercelClient {
  private client: AxiosInstance;
  private config: VercelConfig;

  constructor(config: VercelConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.vercel.com',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      params: config.teamId ? { teamId: config.teamId } : {},
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data?.error) {
          const vercelError = error.response.data as VercelAPIError;
          throw new Error(`Vercel API Error: ${vercelError.error.message} (${vercelError.error.code})`);
        }
        throw new Error(`Vercel API Error: ${error.message}`);
      }
    );
  }

  // Project Management
  async createProject(config: ProjectConfig): Promise<Project> {
    const { data } = await this.client.post('/v9/projects', {
      name: config.name,
      gitRepository: config.gitRepository,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      installCommand: config.installCommand,
      devCommand: config.devCommand,
      framework: config.framework,
      nodeVersion: config.nodeVersion,
      environmentVariables: config.environmentVariables,
    });

    // Add domains if specified
    if (config.domains && config.domains.length > 0) {
      for (const domain of config.domains) {
        await this.addDomain(data.id, domain);
      }
    }

    return data;
  }

  async getProject(projectId: string): Promise<Project> {
    const { data } = await this.client.get(`/v9/projects/${projectId}`);
    return data;
  }

  async listProjects(options: {
    limit?: number;
    since?: number;
    until?: number;
    search?: string;
  } = {}): Promise<{ projects: Project[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.since) params.append('since', options.since.toString());
    if (options.until) params.append('until', options.until.toString());
    if (options.search) params.append('search', options.search);

    const { data } = await this.client.get(`/v9/projects?${params.toString()}`);
    return data;
  }

  async updateProject(projectId: string, updates: Partial<ProjectConfig>): Promise<Project> {
    const { data } = await this.client.patch(`/v9/projects/${projectId}`, updates);
    return data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.delete(`/v9/projects/${projectId}`);
  }

  // Deployment Management
  async createDeployment(projectId: string, config: DeploymentConfig): Promise<Deployment> {
    const { data } = await this.client.post(`/v13/deployments`, {
      name: config.name,
      project: projectId,
      gitSource: config.gitSource,
      projectSettings: config.projectSettings,
      env: config.environmentVariables?.reduce((acc, env) => {
        acc[env.key] = env.value;
        return acc;
      }, {} as Record<string, string>),
      regions: config.regions,
      functions: config.functions,
      meta: config.meta,
    });

    return data;
  }

  async getDeployment(deploymentId: string): Promise<Deployment> {
    const { data } = await this.client.get(`/v13/deployments/${deploymentId}`);
    return data;
  }

  async listDeployments(projectId?: string, options: {
    limit?: number;
    since?: number;
    until?: number;
    state?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  } = {}): Promise<{ deployments: Deployment[] }> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.since) params.append('since', options.since.toString());
    if (options.until) params.append('until', options.until.toString());
    if (options.state) params.append('state', options.state);

    const { data } = await this.client.get(`/v6/deployments?${params.toString()}`);
    return data;
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    await this.client.patch(`/v12/deployments/${deploymentId}/cancel`);
  }

  async deleteDeployment(deploymentId: string): Promise<void> {
    await this.client.delete(`/v13/deployments/${deploymentId}`);
  }

  async getDeploymentFiles(deploymentId: string): Promise<DeploymentFile[]> {
    const { data } = await this.client.get(`/v6/deployments/${deploymentId}/files`);
    return data;
  }

  async getDeploymentBuilds(deploymentId: string): Promise<DeploymentBuild[]> {
    const { data } = await this.client.get(`/v1/deployments/${deploymentId}/builds`);
    return data;
  }

  // Domain Management
  async addDomain(projectId: string, domain: string, gitBranch?: string): Promise<Domain> {
    const { data } = await this.client.post(`/v9/projects/${projectId}/domains`, {
      name: domain,
      gitBranch,
    });
    return data;
  }

  async getDomain(projectId: string, domain: string): Promise<Domain> {
    const { data } = await this.client.get(`/v9/projects/${projectId}/domains/${domain}`);
    return data;
  }

  async listDomains(projectId: string): Promise<Domain[]> {
    const { data } = await this.client.get(`/v9/projects/${projectId}/domains`);
    return data.domains || [];
  }

  async updateDomain(projectId: string, domain: string, updates: {
    gitBranch?: string | null;
    redirect?: string | null;
    redirectStatusCode?: 307 | 301 | 302 | 308 | null;
  }): Promise<Domain> {
    const { data } = await this.client.patch(`/v9/projects/${projectId}/domains/${domain}`, updates);
    return data;
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    await this.client.delete(`/v9/projects/${projectId}/domains/${domain}`);
  }

  async verifyDomain(projectId: string, domain: string): Promise<{ verified: boolean }> {
    const { data } = await this.client.post(`/v9/projects/${projectId}/domains/${domain}/verify`);
    return data;
  }

  // DNS Management
  async getDnsRecords(domain: string): Promise<DnsRecord[]> {
    const { data } = await this.client.get(`/v4/domains/${domain}/records`);
    return data.records || [];
  }

  async createDnsRecord(domain: string, record: {
    name: string;
    type: string;
    value: string;
    ttl?: number;
  }): Promise<DnsRecord> {
    const { data } = await this.client.post(`/v2/domains/${domain}/records`, record);
    return data;
  }

  async deleteDnsRecord(domain: string, recordId: string): Promise<void> {
    await this.client.delete(`/v2/domains/${domain}/records/${recordId}`);
  }

  // Environment Variables
  async getEnvironmentVariables(projectId: string, target?: 'production' | 'preview' | 'development'): Promise<EnvironmentVariable[]> {
    const params = target ? `?target=${target}` : '';
    const { data } = await this.client.get(`/v9/projects/${projectId}/env${params}`);
    return data.envs || [];
  }

  async createEnvironmentVariable(projectId: string, envVar: EnvironmentVariable): Promise<EnvironmentVariable> {
    const { data } = await this.client.post(`/v10/projects/${projectId}/env`, envVar);
    return data;
  }

  async updateEnvironmentVariable(projectId: string, envVarId: string, updates: Partial<EnvironmentVariable>): Promise<EnvironmentVariable> {
    const { data } = await this.client.patch(`/v9/projects/${projectId}/env/${envVarId}`, updates);
    return data;
  }

  async deleteEnvironmentVariable(projectId: string, envVarId: string): Promise<void> {
    await this.client.delete(`/v9/projects/${projectId}/env/${envVarId}`);
  }

  // Team Management
  async getCurrentTeam(): Promise<TeamInfo | null> {
    try {
      const { data } = await this.client.get('/v2/team');
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('team not found')) {
        return null; // User account, not a team
      }
      throw error;
    }
  }

  async getTeamMembers(): Promise<Array<{
    uid: string;
    role: 'OWNER' | 'MEMBER' | 'VIEWER';
    email: string;
    username: string;
    avatar?: string;
  }>> {
    const { data } = await this.client.get('/v2/teams/members');
    return data.members || [];
  }

  // Analytics
  async getAnalytics(projectId: string, options: {
    from: number; // Unix timestamp
    to: number; // Unix timestamp
    timezone?: string;
  }): Promise<Analytics> {
    const params = new URLSearchParams({
      projectId,
      from: options.from.toString(),
      to: options.to.toString(),
    });

    if (options.timezone) {
      params.append('timezone', options.timezone);
    }

    const { data } = await this.client.get(`/v1/analytics?${params.toString()}`);
    return data;
  }

  // Webhooks
  async createWebhook(projectId: string, webhook: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{ id: string; url: string; events: string[]; }> {
    const { data } = await this.client.post(`/v1/webhooks`, {
      projectIds: [projectId],
      ...webhook,
    });
    return data;
  }

  async listWebhooks(projectId?: string): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    projectIds: string[];
    createdAt: number;
  }>> {
    const params = projectId ? `?projectId=${projectId}` : '';
    const { data } = await this.client.get(`/v1/webhooks${params}`);
    return data.webhooks || [];
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.client.delete(`/v1/webhooks/${webhookId}`);
  }

  // Utility Methods
  async deployFromGit(projectId: string, options: {
    ref?: string; // branch, tag, or commit sha
    target?: 'production' | 'staging';
    meta?: Record<string, string>;
  } = {}): Promise<Deployment> {
    const project = await this.getProject(projectId);

    if (!project.link) {
      throw new Error('Project is not connected to a Git repository');
    }

    return await this.createDeployment(projectId, {
      gitSource: {
        type: project.link.type as 'github' | 'gitlab' | 'bitbucket',
        repoId: project.link.repoId.toString(),
        ref: options.ref,
      },
      meta: options.meta,
    });
  }

  async waitForDeployment(deploymentId: string, options: {
    timeout?: number; // in milliseconds, default 5 minutes
    pollInterval?: number; // in milliseconds, default 5 seconds
  } = {}): Promise<Deployment> {
    const timeout = options.timeout || 5 * 60 * 1000; // 5 minutes
    const pollInterval = options.pollInterval || 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const deployment = await this.getDeployment(deploymentId);

      if (deployment.readyState === 'READY') {
        return deployment;
      }

      if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${deployment.readyState}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Deployment timeout after ${timeout}ms`);
  }

  async getProjectByName(name: string): Promise<Project | null> {
    const { projects } = await this.listProjects({ search: name });
    return projects.find(p => p.name === name) || null;
  }

  async promoteDeployment(deploymentId: string): Promise<void> {
    await this.client.patch(`/v13/deployments/${deploymentId}/promote`);
  }

  async rollbackDeployment(projectId: string, targetDeploymentId: string): Promise<Deployment> {
    return await this.createDeployment(projectId, {
      name: 'Rollback deployment',
      meta: {
        rollback: 'true',
        sourceDeployment: targetDeploymentId,
      },
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.client.get('/v2/user');
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get raw axios client for advanced usage
  getAxiosClient(): AxiosInstance {
    return this.client;
  }
}

// Default configuration
const defaultConfig: VercelConfig = {
  token: process.env.VERCEL_TOKEN || '',
  teamId: process.env.VERCEL_TEAM_ID,
  baseUrl: process.env.VERCEL_API_URL || 'https://api.vercel.com',
};

// Default client instance
export const vercelClient = new VercelClient(defaultConfig);

// Factory function for custom configurations
export const createVercelClient = (config: Partial<VercelConfig>): VercelClient => {
  return new VercelClient({ ...defaultConfig, ...config });
};

// Type exports for external usage
export type {
  Project,
  Deployment,
  Domain,
  DnsRecord,
  TeamInfo,
  Analytics,
  DeploymentFile,
  DeploymentBuild,
};