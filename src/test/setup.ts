import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    search: '',
    href: 'http://localhost:3000',
  },
  writable: true,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});