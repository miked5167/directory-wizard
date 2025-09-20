import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Extend Vitest's expect with jest-dom matchers
expect.extend({});

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  basePath: '',
  locale: 'en',
  locales: ['en'],
  defaultLocale: 'en',
  isReady: true,
  isFallback: false,
  isPreview: false,
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Global test setup
global.console.warn = vi.fn();
global.console.error = vi.fn();
