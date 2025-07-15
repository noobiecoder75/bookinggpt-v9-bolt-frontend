-- Fix quote_id data type mismatches
-- Problem: quotes.id is BIGSERIAL but some foreign keys use VARCHAR or UUID
-- Solution: Convert all quote_id foreign keys to BIGINT to match quotes.id

-- First, let's check if we have any data that needs to be preserved
-- We'll convert valid numeric strings to BIGINT and set invalid ones to NULL

-- 1. Fix email_communications.quote_id (VARCHAR(255) -> BIGINT)
-- Drop the existing foreign key constraint first
ALTER TABLE email_communications DROP CONSTRAINT IF EXISTS email_communications_quote_id_fkey;

-- Add a temporary column
ALTER TABLE email_communications ADD COLUMN quote_id_new BIGINT;

-- Convert existing data: only valid numeric strings, others become NULL
UPDATE email_communications 
SET quote_id_new = CASE 
  WHEN quote_id ~ '^[0-9]+$' THEN quote_id::BIGINT
  ELSE NULL
END
WHERE quote_id IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE email_communications DROP COLUMN quote_id;
ALTER TABLE email_communications RENAME COLUMN quote_id_new TO quote_id;

-- Add the foreign key constraint
ALTER TABLE email_communications 
ADD CONSTRAINT email_communications_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- 2. Fix email_threads.quote_id (VARCHAR(255) -> BIGINT)
-- Drop the existing foreign key constraint first
ALTER TABLE email_threads DROP CONSTRAINT IF EXISTS email_threads_quote_id_fkey;

-- Add a temporary column
ALTER TABLE email_threads ADD COLUMN quote_id_new BIGINT;

-- Convert existing data: only valid numeric strings, others become NULL
UPDATE email_threads 
SET quote_id_new = CASE 
  WHEN quote_id ~ '^[0-9]+$' THEN quote_id::BIGINT
  ELSE NULL
END
WHERE quote_id IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE email_threads DROP COLUMN quote_id;
ALTER TABLE email_threads RENAME COLUMN quote_id_new TO quote_id;

-- Add the foreign key constraint
ALTER TABLE email_threads 
ADD CONSTRAINT email_threads_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- 3. Fix hotel_search_sessions.quote_id (UUID -> BIGINT)
-- Drop the existing foreign key constraint first
ALTER TABLE hotel_search_sessions DROP CONSTRAINT IF EXISTS hotel_search_sessions_quote_id_fkey;

-- Add a temporary column
ALTER TABLE hotel_search_sessions ADD COLUMN quote_id_new BIGINT;

-- For UUID to BIGINT conversion, we'll set all existing values to NULL
-- since UUIDs cannot be meaningfully converted to BIGINT
UPDATE hotel_search_sessions SET quote_id_new = NULL;

-- Drop the old column and rename the new one
ALTER TABLE hotel_search_sessions DROP COLUMN quote_id;
ALTER TABLE hotel_search_sessions RENAME COLUMN quote_id_new TO quote_id;

-- Add the foreign key constraint
ALTER TABLE hotel_search_sessions 
ADD CONSTRAINT hotel_search_sessions_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;

-- Update indexes to match the new column types
-- Drop old indexes
DROP INDEX IF EXISTS idx_email_communications_quote_id;
DROP INDEX IF EXISTS idx_hotel_search_sessions_quote_id;

-- Recreate indexes with correct types
CREATE INDEX idx_email_communications_quote_id ON email_communications(quote_id);
CREATE INDEX idx_hotel_search_sessions_quote_id ON hotel_search_sessions(quote_id);

-- Add comments to document the fix
COMMENT ON COLUMN email_communications.quote_id IS 'Foreign key to quotes.id (BIGINT) - fixed from VARCHAR(255)';
COMMENT ON COLUMN email_threads.quote_id IS 'Foreign key to quotes.id (BIGINT) - fixed from VARCHAR(255)';
COMMENT ON COLUMN hotel_search_sessions.quote_id IS 'Foreign key to quotes.id (BIGINT) - fixed from UUID'; 