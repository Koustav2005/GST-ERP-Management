-- Create requirements table
CREATE TABLE IF NOT EXISTS requirements (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    sent_to INTEGER NOT NULL REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create requirement_items table for individual requirements
CREATE TABLE IF NOT EXISTS requirement_items (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    serial_number INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    estimated_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requirement_id, serial_number)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_requirements_created_by ON requirements(created_by);
CREATE INDEX IF NOT EXISTS idx_requirements_sent_to ON requirements(sent_to);
CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirement_items_requirement_id ON requirement_items(requirement_id);









