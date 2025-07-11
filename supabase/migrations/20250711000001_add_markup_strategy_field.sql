-- Add markup_strategy field to quotes table
-- This field determines whether to use global or individual markup

-- Create enum for markup strategy
CREATE TYPE markup_strategy_enum AS ENUM ('global', 'individual', 'mixed');

-- Add markup_strategy column to quotes table
ALTER TABLE quotes 
ADD COLUMN markup_strategy markup_strategy_enum DEFAULT 'global';

-- Create index for better performance on markup strategy queries
CREATE INDEX idx_quotes_markup_strategy ON quotes(markup_strategy);

-- Add comment for documentation
COMMENT ON COLUMN quotes.markup_strategy IS 'Markup strategy: global (use quote.markup for all items), individual (use item.markup for each item), or mixed (use item.markup if available, otherwise quote.markup)';

-- Update existing quotes to use appropriate strategy
-- If any quote has items with individual markups, set to individual
UPDATE quotes 
SET markup_strategy = 'individual'
WHERE id IN (
    SELECT DISTINCT quote_id 
    FROM quote_items 
    WHERE markup > 0
);

-- All other quotes will remain as 'global' (default)