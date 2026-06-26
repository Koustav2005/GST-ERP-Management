const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gst_management',
  password: 'admin123',
  port: 5433,
});

async function dropAndAdd() {
  try {
    console.log('Dropping old constraint...');
    await pool.query("ALTER TABLE enquiries DROP CONSTRAINT IF EXISTS enquiries_enquiry_number_key;");
    
    console.log('Adding new composite unique constraint...');
    await pool.query("ALTER TABLE enquiries ADD CONSTRAINT enquiries_company_enquiry_number_unique UNIQUE (company_id, enquiry_number);");
    
    console.log('Updating record 9 to EN0001...');
    await pool.query("UPDATE enquiries SET enquiry_number = 'EN0001' WHERE id = 9;");
    
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

dropAndAdd();
