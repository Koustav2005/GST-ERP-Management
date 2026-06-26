const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const companyId = 2; // Shuhita
  const res = await pool.query("SELECT * FROM master_materials WHERE company_id = $1;", [companyId]);
  console.log('Materials for Shuhita:', JSON.stringify(res.rows));
  await pool.end();
}
check();
