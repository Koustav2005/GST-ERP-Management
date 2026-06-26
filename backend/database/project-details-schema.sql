-- Add columns to projects table for sketches and planning
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sketch_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create bill_of_materials table
CREATE TABLE IF NOT EXISTS bill_of_materials (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_cost DECIMAL(10, 2),
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_status_history table to track status changes
CREATE TABLE IF NOT EXISTS project_status_history (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bom_project_id ON bill_of_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_status_history_project_id ON project_status_history(project_id);
