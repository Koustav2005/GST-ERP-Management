const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const users = await pool.query("SELECT id, name FROM users WHERE id = 2;");
  const vendors = await pool.query("SELECT id, name FROM master_vendors WHERE id = 2;");
  console.log('User ID 2:', JSON.stringify(users.rows));
  console.log('Master Vendor ID 2:', JSON.stringify(vendors.rows));
  await pool.end();
}
check();
