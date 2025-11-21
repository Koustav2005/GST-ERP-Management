-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    gst_number VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add company_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Insert sample companies (optional - for testing)
-- INSERT INTO companies (name, email, gst_number) VALUES 
-- ('SVCE Industries', 'svce@company.com', '29ABCDE1234F1Z5'),
-- ('Tech Solutions Ltd', 'tech@company.com', '27XYZAB5678G2Y4')
-- ON CONFLICT (email) DO NOTHING;
