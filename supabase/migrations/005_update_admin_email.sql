-- Update admin user email from admin@bookinggpt.ca to info@bookinggpt.ca
-- This aligns the database with the application authentication context

-- Update auth.users table
UPDATE auth.users 
SET email = 'info@bookinggpt.ca',
    updated_at = NOW()
WHERE id = '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid;

-- Update auth.identities table
UPDATE auth.identities 
SET identity_data = format('{"sub": "%s", "email": "%s"}', '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid, 'info@bookinggpt.ca')::jsonb,
    updated_at = NOW()
WHERE user_id = '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid;

-- Update users table if it exists
UPDATE users 
SET email = 'info@bookinggpt.ca',
    updated_at = NOW()
WHERE id = '3a956462-621c-47bb-a2f6-69351eff76b0';

-- Comment: This migration ensures the admin user email is consistent across all tables
-- and matches the email used in the application's useAuth.ts file