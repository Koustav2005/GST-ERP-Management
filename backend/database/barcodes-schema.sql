-- Barcodes Schema
-- This schema stores barcodes for items

-- Barcodes table (stores barcode data for items)
CREATE TABLE IF NOT EXISTS barcodes (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES major_orders(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(50),
    purchased_date DATE NOT NULL,
    mfg_date DATE NOT NULL,
    exp_date DATE NOT NULL,
    qr_number VARCHAR(255) UNIQUE NOT NULL, -- Unique QR number
    barcode_data TEXT NOT NULL, -- JSON string with all barcode information
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, exp_date) -- Allow multiple QR codes per order with different expiry dates
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_barcodes_order_id ON barcodes(order_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_company_id ON barcodes(company_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_item_name ON barcodes(item_name);

