-- Materials Detail table to store accepted bid items
CREATE TABLE IF NOT EXISTS materials_detail (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    demand_id INTEGER REFERENCES vendor_demands(id) ON DELETE SET NULL,
    demand_item_id INTEGER REFERENCES demand_items(id) ON DELETE SET NULL,
    bid_id INTEGER REFERENCES vendor_bids(id) ON DELETE SET NULL,
    vendor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    hsn VARCHAR(50),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    supply_until_date DATE NOT NULL,
    vendor_name VARCHAR(255),
    vendor_gstin VARCHAR(15),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id), -- Accountant who accepted the bid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_detail_company_id ON materials_detail(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_detail_demand_id ON materials_detail(demand_id);
CREATE INDEX IF NOT EXISTS idx_materials_detail_demand_item_id ON materials_detail(demand_item_id);
CREATE INDEX IF NOT EXISTS idx_materials_detail_bid_id ON materials_detail(bid_id);
CREATE INDEX IF NOT EXISTS idx_materials_detail_vendor_id ON materials_detail(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_detail_status ON materials_detail(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_detail_unique_demand_item
ON materials_detail(demand_item_id)
WHERE demand_item_id IS NOT NULL;

