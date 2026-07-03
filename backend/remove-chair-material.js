const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function removeChairMaterial() {
  try {
    console.log('🗑️  Starting removal of Chair material from database...');

    // Find all Chair materials
    const findResult = await pool.query(`
      SELECT id, material_name, received_quantity, status
      FROM external_jobwork_inventory
      WHERE LOWER(TRIM(material_name)) = LOWER(TRIM('chair'))
    `);

    console.log(`📊 Found ${findResult.rows.length} Chair material record(s):`);
    findResult.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, Name: ${row.material_name}, Qty: ${row.received_quantity}, Status: ${row.status}`);
    });

    if (findResult.rows.length === 0) {
      console.log('✅ No Chair materials found. Nothing to delete.');
      await pool.end();
      return;
    }

    // Delete Chair materials
    const deleteResult = await pool.query(`
      DELETE FROM external_jobwork_inventory
      WHERE LOWER(TRIM(material_name)) = LOWER(TRIM('chair'))
    `);

    console.log(`\n✅ Deleted ${deleteResult.rowCount} Chair material record(s)`);

    // Verify deletion
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM external_jobwork_inventory
      WHERE LOWER(TRIM(material_name)) = LOWER(TRIM('chair'))
    `);

    console.log(`✅ Verification: ${verifyResult.rows[0].count} Chair records remain in database`);

    if (verifyResult.rows[0].count === 0) {
      console.log('\n🎉 Chair material successfully removed from database!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error removing Chair material:', error.message);
    process.exit(1);
  }
}

removeChairMaterial();
