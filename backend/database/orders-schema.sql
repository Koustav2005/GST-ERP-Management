-- Orders Schema
-- This schema supports major orders (to contracted vendors) and minor orders (open bidding)

-- Major Orders table (orders to contracted vendors from materials_detail)
CREATE TABLE IF NOT EXISTS major_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    materials_detail_id INTEGER REFERENCES materials_detail(id) ON DELETE SET NULL,
    vendor_id INTEGER NOT NULL REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(50),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE,
    created_by INTEGER REFERENCES users(id), -- Accountant who created the order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Minor Orders table (open orders for all vendors to bid)
CREATE TABLE IF NOT EXISTS minor_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(50),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    deadline_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'awarded', 'cancelled')),
    selected_vendor_id INTEGER REFERENCES users(id),
    selected_bid_id INTEGER, -- Reference to minor_order_bids
    created_by INTEGER REFERENCES users(id), -- Accountant who created the order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Minor Order Bids table (vendor bids for minor orders)
CREATE TABLE IF NOT EXISTS minor_order_bids (
    id SERIAL PRIMARY KEY,
    minor_order_id INTEGER NOT NULL REFERENCES minor_orders(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES users(id),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(minor_order_id, vendor_id) -- One bid per vendor per minor order
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_major_orders_company_id ON major_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_major_orders_vendor_id ON major_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_major_orders_status ON major_orders(status);
CREATE INDEX IF NOT EXISTS idx_minor_orders_company_id ON minor_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_minor_orders_status ON minor_orders(status);
CREATE INDEX IF NOT EXISTS idx_minor_order_bids_minor_order_id ON minor_order_bids(minor_order_id);
CREATE INDEX IF NOT EXISTS idx_minor_order_bids_vendor_id ON minor_order_bids(vendor_id);








