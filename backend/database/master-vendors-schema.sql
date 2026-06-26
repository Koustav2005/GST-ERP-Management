-- Master Vendor List table
CREATE TABLE IF NOT EXISTS master_vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    address TEXT,
    vendor_type VARCHAR(100),
    gst_number VARCHAR(100),
    pan_number VARCHAR(100),
    opening_balance NUMERIC(15, 2) DEFAULT 0,
    credit_period VARCHAR(100),
    currency VARCHAR(50) DEFAULT 'INR',
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    branch_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    upi_id VARCHAR(255),
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster name lookups
CREATE INDEX IF NOT EXISTS idx_master_vendors_name ON master_vendors(name);

