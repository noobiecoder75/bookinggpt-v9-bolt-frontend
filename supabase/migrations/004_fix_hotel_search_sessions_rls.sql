-- Fix hotel_search_sessions RLS policy to use correct quote table structure
-- The original policy referenced 'user_id' which doesn't exist in quotes table
-- Quotes table uses 'agent_id' instead

-- First, create admin user in users table if it doesn't exist
INSERT INTO users (id, first_name, last_name, email, role_id, created_at, updated_at)
VALUES (
  '3a956462-621c-47bb-a2f6-69351eff76b0',
  'Admin',
  'User', 
  'info@bookinggpt.ca',
  1,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update quote #5074 to be owned by the admin user
UPDATE quotes 
SET agent_id = '3a956462-621c-47bb-a2f6-69351eff76b0'
WHERE id = 5074;

-- Update any other quotes that don't have an agent_id to be owned by admin
UPDATE quotes 
SET agent_id = '3a956462-621c-47bb-a2f6-69351eff76b0'
WHERE agent_id IS NULL;

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can access their own hotel search sessions" ON hotel_search_sessions;

-- Create the corrected policy using agent_id instead of user_id
-- Note: auth.uid() returns UUID, agent_id is text, so we need proper casting
CREATE POLICY "Users can access their own hotel search sessions" ON hotel_search_sessions
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes 
      WHERE auth.uid()::text = agent_id OR auth.uid() IN (
        SELECT agent_id::uuid FROM quote_agents WHERE quote_id = quotes.id
      )
    )
  );

-- Comment: This migration fixes the hotel_search_sessions RLS policy and ensures
-- all quotes are owned by the admin user for proper access control