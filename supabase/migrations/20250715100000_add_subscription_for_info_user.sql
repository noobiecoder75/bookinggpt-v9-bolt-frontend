-- Add subscription for info@bookinggpt.ca user
INSERT INTO subscriptions (
  user_id, 
  stripe_customer_id, 
  stripe_subscription_id,
  tier, 
  status, 
  current_period_start, 
  current_period_end,
  created_at,
  updated_at
) VALUES (
  '3a956462-621c-47bb-a2f6-69351eff76b0',
  'cus_SgPTtnZV1wG5hk',
  'sub_temp_placeholder',
  'basic',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  tier = EXCLUDED.tier,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();