import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock File and FileReader for file upload tests
global.File = class MockFile {
  constructor(fileBits, fileName, options = {}) {
    this.name = fileName;
    this.size = fileBits.reduce((acc, bit) => acc + (bit.length || bit.byteLength || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
    this.webkitRelativePath = '';
    this._fileBits = fileBits;
  }

  async text() {
    return this._fileBits.join('');
  }

  async arrayBuffer() {
    const text = await this.text();
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer;
  }

  stream() {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(this._fileBits.join(''));
        controller.close();
      }
    });
  }

  slice(start = 0, end = this.size, contentType = '') {
    const text = this._fileBits.join('');
    const slicedText = text.slice(start, end);
    return new MockFile([slicedText], this.name, { type: contentType });
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0; // EMPTY
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onloadstart = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsText(file) {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      try {
        this.result = file._fileBits ? file._fileBits.join('') : '';
        this.readyState = 2; // DONE
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      } catch (error) {
        this.error = error;
        this.readyState = 2; // DONE
        if (this.onerror) this.onerror({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }
    }, 0);
  }

  readAsDataURL(file) {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      try {
        const text = file._fileBits ? file._fileBits.join('') : '';
        this.result = `data:${file.type || 'text/plain'};base64,${btoa(text)}`;
        this.readyState = 2; // DONE
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      } catch (error) {
        this.error = error;
        this.readyState = 2; // DONE
        if (this.onerror) this.onerror({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }
    }, 0);
  }

  abort() {
    this.readyState = 2; // DONE
    if (this.onabort) this.onabort({ target: this });
    if (this.onloadend) this.onloadend({ target: this });
  }
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-object-url');
global.URL.revokeObjectURL = jest.fn();

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control') ||
       args[0].includes('Warning: validateDOMNesting'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});