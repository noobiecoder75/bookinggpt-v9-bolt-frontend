/*
  # Add Trip Dates to Quotes Table

  1. Changes
    - Add trip_start_date (DATE) to quotes table
    - Add trip_end_date (DATE) to quotes table
    - Add constraint to ensure end date is after start date
    - Add indexes for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add trip date columns to quotes table
ALTER TABLE quotes 
ADD COLUMN trip_start_date DATE,
ADD COLUMN trip_end_date DATE;

-- Add constraint to ensure valid date range
ALTER TABLE quotes 
ADD CONSTRAINT valid_trip_dates 
CHECK (trip_end_date >= trip_start_date);

-- Add indexes for better query performance
CREATE INDEX quotes_trip_start_date_idx ON quotes(trip_start_date);
CREATE INDEX quotes_trip_end_date_idx ON quotes(trip_end_date);

-- Add comment for documentation
COMMENT ON COLUMN quotes.trip_start_date IS 'Start date of the trip';
COMMENT ON COLUMN quotes.trip_end_date IS 'End date of the trip'; 