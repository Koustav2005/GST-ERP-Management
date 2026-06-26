-- Create store_requests table
CREATE TABLE IF NOT EXISTS store_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_manager_id INTEGER NOT NULL REFERENCES users(id),
    project_manager_name VARCHAR(255) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    requested_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP,
    responded_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create store_request_items table to store items requested
CREATE TABLE IF NOT EXISTS store_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES store_requests(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    hsn VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_requests_project_id ON store_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_project_manager_id ON store_requests(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_company_id ON store_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests(status);
CREATE INDEX IF NOT EXISTS idx_store_requests_request_date ON store_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_store_request_items_request_id ON store_request_items(request_id);






