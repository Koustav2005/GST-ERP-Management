-- Add worker allocation fields to store_requests table
ALTER TABLE store_requests 
ADD COLUMN IF NOT EXISTS allocated_to_worker_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS allocated_to_worker_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_requests_allocated_to_worker ON store_requests(allocated_to_worker_id);






