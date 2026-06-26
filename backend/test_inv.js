const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function testInventory() {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory
      WHERE company_id = 1
      ORDER BY item_name ASC, last_updated_at DESC
    `);
    console.log("Success: query executed. Rows returned:", result.rows.length);
  } catch (error) {
    console.error("DB Error:", error.message);
  } finally {
    pool.end();
  }
}
testInventory();
