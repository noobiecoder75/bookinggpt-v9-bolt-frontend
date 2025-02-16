/*
  # Quotes Schema for B2B Travel Application

  1. New Tables
    - `quotes` - Main quotes table
    - `quote_items` - Line items for quotes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE quote_status AS ENUM ('Draft', 'Sent', 'Expired', 'Converted');
CREATE TYPE item_type AS ENUM ('Flight', 'Hotel', 'Tour', 'Insurance', 'Transfer');

-- Create quotes table
CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  quote_reference VARCHAR UNIQUE NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES users(id),
  status quote_status DEFAULT 'Draft',
  total_price DECIMAL(10,2) DEFAULT 0,
  markup DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quote_items table
CREATE TABLE quote_items (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT REFERENCES quotes(id) ON DELETE CASCADE,
  item_type item_type NOT NULL,
  item_name VARCHAR NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view quotes they created"
  ON quotes FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can manage their quotes"
  ON quotes FOR ALL TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can view quote items for their quotes"
  ON quote_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage quote items for their quotes"
  ON quote_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.agent_id = auth.uid()
    )
  );

-- Create function to generate quote reference
CREATE OR REPLACE FUNCTION generate_quote_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_reference := 'Q-' || to_char(now(), 'YYYY') || '-' || 
                        LPAD(CAST(nextval('quotes_id_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quote reference
CREATE TRIGGER set_quote_reference
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_quote_reference();