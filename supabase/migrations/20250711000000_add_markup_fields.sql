-- Add markup fields to quote_items table
-- This migration adds the missing markup and markup_type columns that are needed for pricing calculations

-- Add markup columns to quote_items table
ALTER TABLE quote_items 
ADD COLUMN markup DECIMAL(10,2) DEFAULT 0,
ADD COLUMN markup_type VARCHAR(10) DEFAULT 'percentage';

-- Create enum for markup_type
CREATE TYPE markup_type_enum AS ENUM ('percentage', 'fixed');

-- Update the markup_type column to use the enum
ALTER TABLE quote_items 
ALTER COLUMN markup_type TYPE markup_type_enum USING markup_type::markup_type_enum;

-- Create index for better performance on markup queries
CREATE INDEX idx_quote_items_markup ON quote_items(markup, markup_type);

-- Add comment for documentation
COMMENT ON COLUMN quote_items.markup IS 'Markup amount - percentage value or fixed amount based on markup_type';
COMMENT ON COLUMN quote_items.markup_type IS 'Type of markup: percentage or fixed amount';