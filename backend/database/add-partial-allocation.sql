-- Add allocated_quantity to store_request_items table
ALTER TABLE store_request_items 
ADD COLUMN IF NOT EXISTS allocated_quantity DECIMAL(10, 2) DEFAULT 0;

-- Update store_requests status to include 'partially_allocated'
ALTER TABLE store_requests 
DROP CONSTRAINT IF EXISTS store_requests_status_check;

ALTER TABLE store_requests 
ADD CONSTRAINT store_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'partially_allocated'));






