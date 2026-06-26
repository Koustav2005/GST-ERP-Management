const pool = require('./config/database');

const createEnquiriesTable = async () => {
    try {
        console.log('Creating enquiries table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        enquiry_number VARCHAR(20) UNIQUE NOT NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        pdf_filename VARCHAR(255) NOT NULL,
        pdf_path VARCHAR(500) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✅ Enquiries table created successfully');

        // Create indexes for better performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_enquiries_company_id ON enquiries(company_id);
      CREATE INDEX IF NOT EXISTS idx_enquiries_enquiry_number ON enquiries(enquiry_number);
      CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
    `);

        console.log('✅ Indexes created successfully');

        await pool.end();
        console.log('✅ Database migration completed');
    } catch (error) {
        console.error('❌ Error creating enquiries table:', error);
        await pool.end();
        process.exit(1);
    }
};

createEnquiriesTable();
