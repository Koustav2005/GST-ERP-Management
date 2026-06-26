-- Create revisions table to track project revisions
CREATE TABLE IF NOT EXISTS revisions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    sketch_url TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, revision_number)
);

-- Create revision_bom_items table to store BOM items for each revision
CREATE TABLE IF NOT EXISTS revision_bom_items (
    id SERIAL PRIMARY KEY,
    revision_id INTEGER NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    serial_number INTEGER NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_cost DECIMAL(10, 2),
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(revision_id, serial_number)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_revisions_project_id ON revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_revisions_revision_number ON revisions(project_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_revision_bom_revision_id ON revision_bom_items(revision_id);
CREATE INDEX IF NOT EXISTS idx_revision_bom_serial ON revision_bom_items(revision_id, serial_number);









