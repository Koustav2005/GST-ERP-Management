const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gst_management',
  password: 'admin123',
  port: 5433,
});

async function check() {
  try {
    const res = await pool.query("SELECT id, name FROM companies WHERE name ILIKE '%Shuhita%';");
    console.log('Companies:', JSON.stringify(res.rows));
    
    if (res.rows.length > 0) {
        const companyId = res.rows[0].id;
        const enq = await pool.query("SELECT id, enquiry_number, company_id FROM enquiries WHERE company_id = $1;", [companyId]);
        console.log('Enquiries:', JSON.stringify(enq.rows));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
