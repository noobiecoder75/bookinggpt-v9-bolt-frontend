-- Add user roles and invite system support
-- This migration adds role support and invite functionality to the existing system

-- Create role enum if not exists
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'regular');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add role column to auth.users metadata (using user_metadata)
-- This is handled in the application layer, not database structure

-- Create invites table for invite tracking
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'admin',
  invite_token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites(invited_by);

-- Enable RLS on invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invites
CREATE POLICY "Users can view invites they created"
  ON invites FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Users can create invites"
  ON invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Users can update invites they created"
  ON invites FOR UPDATE TO authenticated
  USING (invited_by = auth.uid());

-- Update subscriptions table to remove unique constraint on user_id for trial support
-- This allows multiple trial records per user if needed
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

-- Create updated_at trigger for invites table
CREATE TRIGGER update_invites_updated_at 
  BEFORE UPDATE ON invites
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to create invite
CREATE OR REPLACE FUNCTION create_invite(
  p_email TEXT,
  p_role user_role DEFAULT 'admin'
)
RETURNS TABLE (
  invite_id UUID,
  invite_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_invite_id UUID;
  v_invite_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate unique token
  v_invite_token := generate_invite_token();
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Insert invite record
  INSERT INTO invites (email, role, invite_token, invited_by, expires_at)
  VALUES (p_email, p_role, v_invite_token, auth.uid(), v_expires_at)
  RETURNING id INTO v_invite_id;
  
  RETURN QUERY SELECT v_invite_id, v_invite_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use invite token
CREATE OR REPLACE FUNCTION use_invite_token(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  role user_role,
  message TEXT
) AS $$
DECLARE
  v_invite invites;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite 
  FROM invites 
  WHERE invite_token = p_token 
    AND used_at IS NULL 
    AND expires_at > NOW();
  
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'regular'::user_role, 'Invalid or expired invite token';
    RETURN;
  END IF;
  
  -- Mark invite as used
  UPDATE invites 
  SET used_at = NOW(), used_by = p_user_id
  WHERE id = v_invite.id;
  
  RETURN QUERY SELECT TRUE, v_invite.role, 'Invite token used successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_invite(TEXT, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invite_token(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_token() TO authenticated;