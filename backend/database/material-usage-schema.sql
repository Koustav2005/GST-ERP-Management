-- Material Usage Reports Table
CREATE TABLE IF NOT EXISTS material_usage_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    project_name VARCHAR(255),
    sent_by INTEGER NOT NULL,
    sent_by_name VARCHAR(255),
    accountant_id INTEGER NOT NULL,
    accountant_name VARCHAR(255),
    materials JSONB NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accountant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_material_usage_accountant ON material_usage_reports(accountant_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_sent_by ON material_usage_reports(sent_by);
CREATE INDEX IF NOT EXISTS idx_material_usage_project ON material_usage_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_status ON material_usage_reports(status);
CREATE INDEX IF NOT EXISTS idx_material_usage_created_at ON material_usage_reports(created_at DESC);




