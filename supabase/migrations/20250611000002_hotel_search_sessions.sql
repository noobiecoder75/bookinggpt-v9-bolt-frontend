-- Create hotel search sessions table for persistent search results
CREATE TABLE hotel_search_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  search_criteria JSONB NOT NULL,
  search_results JSONB,
  session_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create index for faster lookups
CREATE INDEX idx_hotel_search_sessions_quote_id ON hotel_search_sessions(quote_id);
CREATE INDEX idx_hotel_search_sessions_session_key ON hotel_search_sessions(session_key);
CREATE INDEX idx_hotel_search_sessions_expires_at ON hotel_search_sessions(expires_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotel_search_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_hotel_search_sessions_updated_at
  BEFORE UPDATE ON hotel_search_sessions
  FOR EACH ROW
  EXECUTE PROCEDURE update_hotel_search_sessions_updated_at();

-- Create function to clean up expired search sessions
CREATE OR REPLACE FUNCTION cleanup_expired_hotel_search_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hotel_search_sessions 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Add RLS (Row Level Security) policies
ALTER TABLE hotel_search_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access search sessions for quotes they have access to
CREATE POLICY "Users can access their own hotel search sessions" ON hotel_search_sessions
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes 
      WHERE auth.uid() = user_id OR auth.uid() IN (
        SELECT agent_id FROM quote_agents WHERE quote_id = quotes.id
      )
    )
  );

-- Grant permissions
GRANT ALL ON hotel_search_sessions TO authenticated;
GRANT USAGE ON SEQUENCE hotel_search_sessions_id_seq TO authenticated;