-- Create allocation_tasks table
CREATE TABLE IF NOT EXISTS allocation_tasks (
    id SERIAL PRIMARY KEY,
    store_request_id INTEGER NOT NULL REFERENCES store_requests(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES users(id),
    worker_name VARCHAR(255) NOT NULL,
    allocation_qr_code TEXT NOT NULL,
    qr_number VARCHAR(50) UNIQUE NOT NULL,
    allocated_items JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    confirmed_by INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id)
);

-- Create allocation_inventory_mapping table to track which inventory items are allocated
CREATE TABLE IF NOT EXISTS allocation_inventory_mapping (
    id SERIAL PRIMARY KEY,
    allocation_task_id INTEGER NOT NULL REFERENCES allocation_tasks(id) ON DELETE CASCADE,
    barcode_id INTEGER NOT NULL REFERENCES barcodes(id) ON DELETE CASCADE,
    allocated_quantity DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_allocation_tasks_worker_id ON allocation_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_allocation_tasks_store_request_id ON allocation_tasks(store_request_id);
CREATE INDEX IF NOT EXISTS idx_allocation_tasks_status ON allocation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_allocation_tasks_qr_number ON allocation_tasks(qr_number);
CREATE INDEX IF NOT EXISTS idx_allocation_inventory_mapping_task_id ON allocation_inventory_mapping(allocation_task_id);
CREATE INDEX IF NOT EXISTS idx_allocation_inventory_mapping_barcode_id ON allocation_inventory_mapping(barcode_id);






