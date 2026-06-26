const pool = require('./config/database');

async function fixAccountantVisibility() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Job Work Accountant Visibility Issue...\n');
    
    // 1. Check current database state
    console.log('📊 STEP 1: Checking Current State\n');
    
    const allJobWorks = await client.query(`
      SELECT id, job_id, store_incharge_id, accountant_id, status, challan_file_path
      FROM job_work_requests
      ORDER BY id DESC
    `);
    
    console.log(`Total Job Works: ${allJobWorks.rows.length}`);
    console.log('\nJob Works Details:');
    allJobWorks.rows.forEach(row => {
      console.log(
        `  ${row.job_id}: accountant_id=${row.accountant_id}, status='${row.status}', challan=${row.challan_file_path ? 'YES' : 'NO'}`
      );
    });
    
    // 2. Identify problematic job works (those visible to accountant but shouldn't be)
    console.log('\n\n⚠️  STEP 2: Identifying Problem Job Works\n');
    
    const problematicJobs = allJobWorks.rows.filter(row => 
      // Show if: accountant_id IS NULL OR status != 'challan_uploaded' OR no challan file
      !row.accountant_id || row.status !== 'challan_uploaded' || !row.challan_file_path
    );
    
    console.log(`Problem Job Works (should NOT be visible to accountant): ${problematicJobs.length}`);
    problematicJobs.forEach(row => {
      const reason = [];
      if (!row.accountant_id) reason.push('no accountant_id');
      if (row.status !== 'challan_uploaded') reason.push(`status='${row.status}'`);
      if (!row.challan_file_path) reason.push('no challan file');
      console.log(`  ${row.job_id}: ${reason.join(', ')}`);
    });
    
    // 3. Check what each accountant should see
    console.log('\n\n✅ STEP 3: Checking What Each Accountant Should See\n');
    
    const accountants = await client.query(`
      SELECT DISTINCT accountant_id 
      FROM job_work_requests 
      WHERE accountant_id IS NOT NULL
    `);
    
    for (const accountant of accountants.rows) {
      const visibleJobs = await client.query(`
        SELECT job_id, status, challan_file_path
        FROM job_work_requests
        WHERE accountant_id = $1
          AND status = 'challan_uploaded'
          AND challan_file_path IS NOT NULL
      `, [accountant.accountant_id]);
      
      const userResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [accountant.accountant_id]
      );
      
      const accountantName = userResult.rows[0]?.name || `User #${accountant.accountant_id}`;
      console.log(`Accountant: ${accountantName} (ID: ${accountant.accountant_id})`);
      console.log(`  Should see: ${visibleJobs.rows.length} job work(s)`);
      visibleJobs.rows.forEach(row => {
        console.log(`    - ${row.job_id}`);
      });
    }
    
    // 4. Check table schema
    console.log('\n\n🗂️  STEP 4: Checking Table Schema\n');
    
    const tableInfo = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'job_work_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('job_work_requests table columns:');
    tableInfo.rows.forEach(col => {
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name} (${col.data_type})${defaultValue}`);
    });
    
    // 5. Check if store_incharge_id column exists
    console.log('\n\n🔍 STEP 5: Checking for store_incharge_id Column\n');
    
    const storeInchargeCol = tableInfo.rows.find(col => col.column_name === 'store_incharge_id');
    if (storeInchargeCol) {
      console.log('✅ store_incharge_id column EXISTS');
    } else {
      console.log('❌ store_incharge_id column MISSING - This could be the issue!');
    }
    
    // 6. Test the actual query that accountants use
    console.log('\n\n🧪 STEP 6: Testing Accountant Query\n');
    
    if (accountants.rows.length > 0) {
      const testAccountantId = accountants.rows[0].accountant_id;
      const testResult = await client.query(`
        SELECT jwr.id, jwr.job_id, jwr.accountant_id, jwr.status, jwr.challan_file_path
        FROM job_work_requests jwr
        WHERE jwr.accountant_id = $1
          AND jwr.accountant_id IS NOT NULL
          AND jwr.status = 'challan_uploaded'
          AND jwr.challan_file_path IS NOT NULL
      `, [testAccountantId]);
      
      const userResult = await client.query(
        'SELECT name FROM users WHERE id = $1',
        [testAccountantId]
      );
      
      const accountantName = userResult.rows[0]?.name || `User #${testAccountantId}`;
      console.log(`Testing query for ${accountantName} (ID: ${testAccountantId}):`);
      console.log(`  Results: ${testResult.rows.length} job work(s)`);
      testResult.rows.forEach(row => {
        console.log(`    - ${row.job_id}`);
      });
    }
    
    console.log('\n✅ Diagnostic complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAccountantVisibility();
