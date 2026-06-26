const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query(`
    SELECT r.id FROM requirements r 
    JOIN users u ON r.sent_to = u.id 
    WHERE u.company_id = 2;
  `);
  console.log('Requirements for Shuhita:', JSON.stringify(res.rows));
  await pool.end();
}
check();
