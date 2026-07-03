const pool = require('./config/database');

async function fixChallanStoreIncharge() {
  try {
    console.log('🔧 Fixing challan store_incharge assignments...');

    // Get all challans that have NULL or missing store_incharge_id
    const challanResult = await pool.query(`
      SELECT c.id, c.company_id, c.store_incharge_id 
      FROM external_jobwork_challans c
      WHERE c.store_incharge_id IS NULL
    `);

    console.log(`Found ${challanResult.rows.length} challans with missing store_incharge_id`);

    for (const challan of challanResult.rows) {
      console.log(`\n📌 Processing challan ID: ${challan.id}`);

      // Get a store incharge for this company
      const siResult = await pool.query(`
        SELECT id FROM users 
        WHERE company_id = $1 AND role = 'store_incharge'
        LIMIT 1
      `, [challan.company_id]);

      if (siResult.rows.length > 0) {
        const siId = siResult.rows[0].id;
        console.log(`   Assigning store_incharge_id: ${siId}`);

        await pool.query(`
          UPDATE external_jobwork_challans 
          SET store_incharge_id = $1
          WHERE id = $2
        `, [siId, challan.id]);

        console.log(`   ✅ Updated`);
      } else {
        console.log(`   ❌ No store incharge found for company ${challan.company_id}`);
      }
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixChallanStoreIncharge();
