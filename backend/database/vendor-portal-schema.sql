-- Vendor Portal Schema
-- This schema supports vendor bidding system where accounts post material demands
-- and vendors can bid on them

-- Create vendor_demands table
CREATE TABLE IF NOT EXISTS vendor_demands (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id), -- Accountant user
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded')),
    bid_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create demand_items table
CREATE TABLE IF NOT EXISTS demand_items (
    id SERIAL PRIMARY KEY,
    demand_id INTEGER NOT NULL REFERENCES vendor_demands(id) ON DELETE CASCADE,
    serial_number INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    hsn VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(demand_id, serial_number)
);

-- Create vendor_bids table
CREATE TABLE IF NOT EXISTS vendor_bids (
    id SERIAL PRIMARY KEY,
    demand_id INTEGER NOT NULL REFERENCES vendor_demands(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES users(id), -- Vendor user
    total_amount DECIMAL(10, 2) NOT NULL,
    supply_until_date DATE NOT NULL, -- Last date until which vendor will deliver items at this price if an order comes
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(demand_id, vendor_id) -- One bid per vendor per demand
);

-- Create bid_items table to store individual item prices in a bid
CREATE TABLE IF NOT EXISTS bid_items (
    id SERIAL PRIMARY KEY,
    bid_id INTEGER NOT NULL REFERENCES vendor_bids(id) ON DELETE CASCADE,
    demand_item_id INTEGER NOT NULL REFERENCES demand_items(id) ON DELETE CASCADE,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_demands_company_id ON vendor_demands(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_demands_created_by ON vendor_demands(created_by);
CREATE INDEX IF NOT EXISTS idx_vendor_demands_status ON vendor_demands(status);
CREATE INDEX IF NOT EXISTS idx_demand_items_demand_id ON demand_items(demand_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_demand_id ON vendor_bids(demand_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bids_vendor_id ON vendor_bids(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bid_items_bid_id ON bid_items(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_items_demand_item_id ON bid_items(demand_item_id);

