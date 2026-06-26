-- Inventory Schema
-- This schema stores inventory items for Store Incharge

-- Inventory table (stores items with quantity, HSN, etc.)
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(50),
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, item_name, hsn) -- Prevent duplicate entries for same item
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_hsn ON inventory(hsn);







