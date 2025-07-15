-- Fix customer_id data type mismatches
-- Problem: customers.id is BIGSERIAL but some foreign keys use INTEGER
-- Solution: Convert customer_id foreign keys to BIGINT to match customers.id

BEGIN;

-- 1. Fix email_communications.customer_id (INTEGER -> BIGINT)
-- Drop the existing foreign key constraint first
ALTER TABLE email_communications DROP CONSTRAINT IF EXISTS email_communications_customer_id_fkey;

-- Change the column type
ALTER TABLE email_communications ALTER COLUMN customer_id TYPE BIGINT;

-- Recreate the foreign key constraint
ALTER TABLE email_communications 
ADD CONSTRAINT email_communications_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 2. Fix email_threads.customer_id (INTEGER -> BIGINT)
-- Drop the existing foreign key constraint first
ALTER TABLE email_threads DROP CONSTRAINT IF EXISTS email_threads_customer_id_fkey;

-- Change the column type
ALTER TABLE email_threads ALTER COLUMN customer_id TYPE BIGINT;

-- Recreate the foreign key constraint
ALTER TABLE email_threads 
ADD CONSTRAINT email_threads_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 3. Fix gmail_messages.customer_id (INTEGER -> BIGINT) if it exists
-- Drop the existing foreign key constraint first (if it exists)
ALTER TABLE gmail_messages DROP CONSTRAINT IF EXISTS gmail_messages_customer_id_fkey;

-- Change the column type
ALTER TABLE gmail_messages ALTER COLUMN customer_id TYPE BIGINT;

-- Recreate the foreign key constraint
ALTER TABLE gmail_messages 
ADD CONSTRAINT gmail_messages_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 4. Fix gmail_threads.customer_id (INTEGER -> BIGINT) if it exists
-- Drop the existing foreign key constraint first (if it exists)
ALTER TABLE gmail_threads DROP CONSTRAINT IF EXISTS gmail_threads_customer_id_fkey;

-- Change the column type
ALTER TABLE gmail_threads ALTER COLUMN customer_id TYPE BIGINT;

-- Recreate the foreign key constraint
ALTER TABLE gmail_threads 
ADD CONSTRAINT gmail_threads_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Add comments to document the fix
COMMENT ON COLUMN email_communications.customer_id IS 'Foreign key to customers.id (BIGINT) - fixed from INTEGER';
COMMENT ON COLUMN email_threads.customer_id IS 'Foreign key to customers.id (BIGINT) - fixed from INTEGER';
COMMENT ON COLUMN gmail_messages.customer_id IS 'Foreign key to customers.id (BIGINT) - fixed from INTEGER';
COMMENT ON COLUMN gmail_threads.customer_id IS 'Foreign key to customers.id (BIGINT) - fixed from INTEGER';

COMMIT;
