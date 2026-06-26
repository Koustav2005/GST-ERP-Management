-- Order Receipts Schema
-- This schema stores information about received orders with bills and GST details

-- Order Receipts table (stores bill images and receipt information)
CREATE TABLE IF NOT EXISTS order_receipts (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES major_orders(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bill_image_url TEXT NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10, 2),
    total_gst_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by INTEGER REFERENCES users(id), -- Store Incharge who submitted
    approved_by INTEGER REFERENCES users(id), -- Accountant who approved
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Receipt Items table (stores individual items received with GST)
CREATE TABLE IF NOT EXISTS order_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES order_receipts(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES major_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(50),
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL, -- GST rate in percentage
    gst_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_receipts_order_id ON order_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_receipts_company_id ON order_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_order_receipts_status ON order_receipts(status);
CREATE INDEX IF NOT EXISTS idx_order_receipt_items_receipt_id ON order_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_order_receipt_items_order_id ON order_receipt_items(order_id);








