/**
 * Debug script to check external job work inventory status
 * Run with: node backend/debug-inventory.js
 */

const pool = require('./config/database');

async function debugInventory() {
  try {
    console.log('\n🔍 DEBUGGING EXTERNAL JOB WORK INVENTORY\n');

    // Check for "cupboard" material - case insensitive
    console.log('1️⃣ Searching for "cupboard" material (case-insensitive):\n');
    const cupboardResult = await pool.query(`
      SELECT 
        id,
        material_name,
        received_quantity,
        quantity,
        status,
        company_id,
        job_work_id,
        created_at,
        updated_at
      FROM external_jobwork_inventory
      WHERE LOWER(TRIM(material_name)) = LOWER(TRIM('cupboard'))
      ORDER BY updated_at DESC
    `);

    console.log(`Found ${cupboardResult.rows.length} cupboard records:\n`);
    cupboardResult.rows.forEach((row, idx) => {
      console.log(`Record ${idx + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Material: ${row.material_name}`);
      console.log(`  Received Qty: ${row.received_quantity}`);
      console.log(`  Total Qty: ${row.quantity}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Company: ${row.company_id}`);
      console.log(`  Job Work: ${row.job_work_id}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Updated: ${row.updated_at}`);
      console.log('');
    });

    // Check for POEN00108876006
    console.log('\n2️⃣ Searching for POEN00108876006 job works:\n');
    const poenResult = await pool.query(`
      SELECT id, poen_number, project_name
      FROM job_work_requests
      WHERE LOWER(poen_number) = LOWER('POEN00108876006')
    `);

    console.log(`Found ${poenResult.rows.length} POEN records:\n`);
    poenResult.rows.forEach(row => {
      console.log(`Job Work ID: ${row.id}`);
      console.log(`POEN: ${row.poen_number}`);
      console.log(`Project: ${row.project_name}`);
      console.log('');
    });

    if (poenResult.rows.length > 0) {
      const jobWorkId = poenResult.rows[0].id;
      
      console.log(`\n3️⃣ Checking all inventory for job work ${jobWorkId}:\n`);
      const allInventory = await pool.query(`
        SELECT 
          id,
          material_name,
          received_quantity,
          status
        FROM external_jobwork_inventory
        WHERE job_work_id = $1
        ORDER BY material_name
      `, [jobWorkId]);

      console.log(`Total items: ${allInventory.rows.length}\n`);
      allInventory.rows.forEach(row => {
        const showStatus = row.status === 'issued' ? '❌ ISSUED' : '✅ ' + row.status;
        console.log(`  ${row.material_name}: ${row.received_quantity} qty - ${showStatus}`);
      });
    }

    // Check filtering logic
    console.log('\n4️⃣ What should be VISIBLE (filter check):\n');
    const visibleResult = await pool.query(`
      SELECT 
        id,
        material_name,
        received_quantity,
        status
      FROM external_jobwork_inventory
      WHERE (status IN ('received', 'in_stock') OR received_quantity > 0)
      ORDER BY material_name
    `);

    console.log(`Visible items: ${visibleResult.rows.length}\n`);
    visibleResult.rows.forEach(row => {
      console.log(`  ${row.material_name}: ${row.received_quantity} qty`);
    });

    // Check collections
    console.log('\n5️⃣ Recent collections:\n');
    const collectionsResult = await pool.query(`
      SELECT 
        c.id,
        c.request_id,
        r.project_id,
        p.name as project_name,
        c.collection_timestamp,
        c.status
      FROM external_material_collections c
      LEFT JOIN external_jobwork_outstock_requests r ON c.request_id = r.id
      LEFT JOIN projects p ON r.project_id = p.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    console.log(`Recent collections: ${collectionsResult.rows.length}\n`);
    collectionsResult.rows.forEach(row => {
      console.log(`  Collection ${row.id}:`);
      console.log(`    Request: ${row.request_id}`);
      console.log(`    Project: ${row.project_name}`);
      console.log(`    Time: ${row.collection_timestamp}`);
      console.log('');
    });

    console.log('\n✅ Debug complete\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugInventory();
