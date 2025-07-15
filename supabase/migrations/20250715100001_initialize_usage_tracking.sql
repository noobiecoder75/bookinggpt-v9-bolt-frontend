-- Initialize usage tracking for info@bookinggpt.ca user
-- Get the subscription ID first, then create usage tracking records

WITH user_subscription AS (
  SELECT id FROM subscriptions 
  WHERE user_id = '3a956462-621c-47bb-a2f6-69351eff76b0'
)
INSERT INTO subscription_usage (
  subscription_id,
  user_id,
  usage_type,
  usage_count,
  usage_limit,
  reset_date
) 
SELECT 
  s.id,
  '3a956462-621c-47bb-a2f6-69351eff76b0',
  usage_type,
  0,
  usage_limit,
  NOW() + INTERVAL '1 month'
FROM user_subscription s
CROSS JOIN (
  VALUES 
    ('quotes', 100),
    ('bookings', 25),
    ('api_calls', 1000)
) AS limits(usage_type, usage_limit)
ON CONFLICT (subscription_id, usage_type) DO UPDATE SET
  usage_count = EXCLUDED.usage_count,
  usage_limit = EXCLUDED.usage_limit,
  reset_date = EXCLUDED.reset_date;