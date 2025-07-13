/*
  # Auto-create users table entries

  This migration creates a trigger that automatically creates a corresponding
  entry in the users table whenever a new user is created in auth.users.
  
  1. Changes
    - Create function to handle new user creation
    - Create trigger on auth.users table
    - Ensure all existing auth.users have corresponding users entries
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with basic info from auth.users
  INSERT INTO users (id, email, first_name, last_name, role_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    (SELECT id FROM roles WHERE name = 'agent' LIMIT 1), -- Default to agent role
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create users table entries
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure all existing auth.users have corresponding users entries
INSERT INTO users (id, email, first_name, last_name, role_id, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  (SELECT id FROM roles WHERE name = 'agent' LIMIT 1),
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING; 