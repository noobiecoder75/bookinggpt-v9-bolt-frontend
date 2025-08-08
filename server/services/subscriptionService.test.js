import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

// Mock Stripe
vi.mock('../lib/stripe.js', () => ({
  default: {
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

// Import after mocking
const subscriptionService = await import('./subscriptionService.js').then(m => m.default);

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrialSubscription', () => {
    it('should create a trial subscription for a user', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const tier = 'basic';
      const trialDays = 14;

      // Mock the database insert
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'sub-123',
          user_id: userId,
          tier,
          status: 'trialing',
          trial_end: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
        },
        error: null,
      });

      const result = await subscriptionService.createTrialSubscription(userId, email, tier, trialDays);

      expect(result).toEqual({
        success: true,
        subscription: expect.objectContaining({
          user_id: userId,
          tier,
          status: 'trialing',
        }),
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^trial_/),
          user_id: userId,
          tier,
          status: 'trialing',
          trial_end: expect.any(String),
        })
      );
    });

    it('should handle database errors', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const tier = 'basic';

      // Mock database error
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        subscriptionService.createTrialSubscription(userId, email, tier)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getSubscription', () => {
    it('should retrieve a subscription by user ID', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        user_id: userId,
        tier: 'basic',
        status: 'active',
        created_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValue({
        data: mockSubscription,
        error: null,
      });

      const result = await subscriptionService.getSubscription(userId);

      expect(result).toEqual(mockSubscription);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should return null when no subscription exists', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      });

      const result = await subscriptionService.getSubscription(userId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const userId = 'user-123';

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      });

      await expect(
        subscriptionService.getSubscription(userId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status', async () => {
      const userId = 'user-123';
      const subscriptionData = {
        status: 'active',
        current_period_end: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...subscriptionData, user_id: userId },
        error: null,
      });

      const result = await subscriptionService.updateSubscriptionStatus(userId, subscriptionData);

      expect(result).toEqual(expect.objectContaining({
        user_id: userId,
        ...subscriptionData,
      }));

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining(subscriptionData)
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
    });
  });

  describe('getPriceIdForTier', () => {
    it('should return correct price ID for basic tier', () => {
      const priceId = subscriptionService.getPriceIdForTier('basic');
      expect(priceId).toBe('price_basic');
    });

    it('should return correct price ID for professional tier', () => {
      const priceId = subscriptionService.getPriceIdForTier('professional');
      expect(priceId).toBe('price_professional');
    });

    it('should return correct price ID for enterprise tier', () => {
      const priceId = subscriptionService.getPriceIdForTier('enterprise');
      expect(priceId).toBe('price_enterprise');
    });

    it('should throw error for invalid tier', () => {
      expect(() => {
        subscriptionService.getPriceIdForTier('invalid');
      }).toThrow('Invalid tier: invalid');
    });
  });
});