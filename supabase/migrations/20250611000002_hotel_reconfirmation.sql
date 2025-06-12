/*
  # Hotel Reconfirmation Enhancement

  1. Updates
    - Add hotel_reconfirmation_number field to booking_confirmations
    - Add reconfirmation_received_at timestamp
    - Add indexes for better performance

  2. Functions
    - Add function to check for pending reconfirmations
    - Add function to update reconfirmation status
*/

-- Add hotel reconfirmation number field
ALTER TABLE booking_confirmations 
ADD COLUMN IF NOT EXISTS hotel_reconfirmation_number VARCHAR(255);

-- Add timestamp for when reconfirmation was received
ALTER TABLE booking_confirmations 
ADD COLUMN IF NOT EXISTS reconfirmation_received_at TIMESTAMPTZ;

-- Add index for hotel reconfirmation numbers
CREATE INDEX IF NOT EXISTS booking_confirmations_hotel_reconfirmation_idx 
ON booking_confirmations(hotel_reconfirmation_number);

-- Add index for reconfirmation received timestamp
CREATE INDEX IF NOT EXISTS booking_confirmations_reconfirmation_received_idx 
ON booking_confirmations(reconfirmation_received_at);

-- Function to get pending reconfirmations
CREATE OR REPLACE FUNCTION get_pending_reconfirmations()
RETURNS TABLE (
  id UUID,
  booking_id BIGINT,
  provider_booking_id VARCHAR(255),
  confirmation_number VARCHAR(255),
  created_at TIMESTAMPTZ,
  booking_reference VARCHAR(255)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.id,
    bc.booking_id,
    bc.provider_booking_id,
    bc.confirmation_number,
    bc.created_at,
    b.booking_reference
  FROM booking_confirmations bc
  JOIN bookings b ON bc.booking_id = b.id
  WHERE bc.provider = 'hotelbeds'
    AND bc.status = 'confirmed'
    AND bc.hotel_reconfirmation_number IS NULL
    AND bc.created_at > NOW() - INTERVAL '30 days'
  ORDER BY bc.created_at DESC;
END;
$$;

-- Function to update reconfirmation details
CREATE OR REPLACE FUNCTION update_hotel_reconfirmation(
  confirmation_id UUID,
  hotel_confirmation_number VARCHAR(255),
  reconfirmation_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_details JSONB;
BEGIN
  -- Get current booking details
  SELECT booking_details INTO updated_details
  FROM booking_confirmations
  WHERE id = confirmation_id;
  
  -- Add reconfirmation information
  updated_details = COALESCE(updated_details, '{}'::jsonb) || 
    jsonb_build_object(
      'hotel_reconfirmation_number', hotel_confirmation_number,
      'hotel_reconfirmation_received_at', NOW(),
      'reconfirmation_details', COALESCE(reconfirmation_details, '{}'::jsonb)
    );
  
  -- Update the record
  UPDATE booking_confirmations
  SET 
    hotel_reconfirmation_number = hotel_confirmation_number,
    reconfirmation_received_at = NOW(),
    booking_details = updated_details,
    updated_at = NOW()
  WHERE id = confirmation_id;
  
  RETURN FOUND;
END;
$$;

-- Create a view for complete booking confirmation details
CREATE OR REPLACE VIEW booking_confirmations_complete AS
SELECT 
  bc.*,
  b.booking_reference,
  b.status as booking_status,
  b.travel_start_date,
  b.travel_end_date,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.email as customer_email,
  CASE 
    WHEN bc.hotel_reconfirmation_number IS NOT NULL THEN 'reconfirmed'
    WHEN bc.status = 'confirmed' AND bc.provider = 'hotelbeds' THEN 'pending_reconfirmation'
    ELSE bc.status
  END as reconfirmation_status
FROM booking_confirmations bc
JOIN bookings b ON bc.booking_id = b.id
JOIN customers c ON b.customer_id = c.id;

-- Grant permissions
GRANT SELECT ON booking_confirmations_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reconfirmations() TO authenticated;
GRANT EXECUTE ON FUNCTION update_hotel_reconfirmation(UUID, VARCHAR, JSONB) TO authenticated; 