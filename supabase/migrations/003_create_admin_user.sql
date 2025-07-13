-- Create default admin user for BookingGPT
-- This ensures you always have access to the application

-- First, insert the user into auth.users with a known UUID
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'info@bookinggpt.ca',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "BookingGPT Admin"}',
    false,
    'authenticated'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = NOW();

-- Create identity record for email auth
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid,
    format('{"sub": "%s", "email": "%s"}', '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid, 'info@bookinggpt.ca')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (provider, user_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = NOW();

-- Ensure the user is confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    phone_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE id = '3a956462-621c-47bb-a2f6-69351eff76b0'::uuid;