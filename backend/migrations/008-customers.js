// External Job Work v2 - customer master (additive, idempotent).
// Run from backend/:  node migrations/008-customers.js   (or npm run migrate:ejw-v2)
//
// master_customers: the owners of material we do external job work on. Management / Accounts maintain
// it; Store picks from it. enquiries.customer_id links an enquiry (scenario S3) to its customer.
// Names are unique per company case-insensitively; a GSTIN is unique per company when given.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS master_customers (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        gstin VARCHAR(15),
        billing_address TEXT,
        works_address TEXT,
        state VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(30),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (gstin IS NULL OR char_length(gstin) = 15)
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_master_customers_company_name_ci ON master_customers (company_id, LOWER(name));`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_master_customers_company_gstin ON master_customers (company_id, gstin) WHERE gstin IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_master_customers_company_active ON master_customers (company_id, is_active);`);

    // S3: the enquiry knows its customer (optional at upload, required for External Job Work at PO upload).
    await client.query(`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES master_customers(id) ON DELETE SET NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries (customer_id) WHERE customer_id IS NOT NULL;`);

    await client.query('COMMIT');
    console.log('External Job Work v2 (customers) migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
