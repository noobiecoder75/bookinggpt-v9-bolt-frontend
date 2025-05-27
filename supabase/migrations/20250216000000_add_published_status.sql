/*
  # Add Published Status to Quote Status Enum

  1. Changes
    - Add 'Published' to the quote_status enum
    - This allows quotes to be marked as published for public access

  2. Security
    - No changes to RLS policies needed (already disabled)
*/

-- Add 'Published' to the quote_status enum
ALTER TYPE quote_status ADD VALUE 'Published';

-- Add comment for documentation
COMMENT ON TYPE quote_status IS 'Quote status: Draft, Sent, Expired, Converted, Published'; 