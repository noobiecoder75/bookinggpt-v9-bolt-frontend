import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSubscriptionStatus } from './useSubscriptionStatus';
import { supabase } from '../lib/supabase';

// Mock the supabase module
vi.mock('../lib/supabase');

describe('useSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useSubscriptionStatus());

    expect(result.current.loading).toBe(true);
    expect(result.current.subscriptionStatus).toBe(null);
  });

  it('should return subscription status when user has active subscription', async () => {
    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { 
        session: { 
          access_token: 'mock-token',
          user: { id: 'user-id' }
        } 
      },
      error: null,
    });

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: 'basic',
          status: 'active',
          trial_end: null,
        }
      }),
    });

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toEqual({
      tier: 'basic',
      status: 'active',
      trial_end: null,
      isTrialing: false,
      daysRemaining: undefined,
    });
  });

  it('should handle trial subscription with days remaining', async () => {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days from now

    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { 
        session: { 
          access_token: 'mock-token',
          user: { id: 'user-id' }
        } 
      },
      error: null,
    });

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: 'professional',
          status: 'trialing',
          trial_end: trialEndDate.toISOString(),
        }
      }),
    });

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toEqual({
      tier: 'professional',
      status: 'trialing',
      trial_end: trialEndDate.toISOString(),
      isTrialing: true,
      daysRemaining: 7,
    });
  });

  it('should handle no subscription', async () => {
    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { 
        session: { 
          access_token: 'mock-token',
          user: { id: 'user-id' }
        } 
      },
      error: null,
    });

    // Mock fetch response - 404 for no subscription
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toBe(null);
  });

  it('should handle authentication error', async () => {
    // Mock session error
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: { message: 'Auth error' },
    });

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toBe(null);
  });
});