-- Master Material List table
CREATE TABLE IF NOT EXISTS master_materials (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(50),
    gst_rate DECIMAL(10, 2) DEFAULT 0,
    material_rate DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for business_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_materials_business_name ON master_materials(business_name);
